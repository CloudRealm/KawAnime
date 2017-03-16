/**
 * Created by Kylart on 04/03/2017.
 *
 * In this file, all the functions needed by the local page
 * are present. This is for cleaner code.
 *
 */

const self = this

// This will later be set with the config file
const downloadRep = 'Downloads'
const ascending = true

const fs = require('fs')
const path = require('path')
const os = require('os')
const shell = require('electron').shell
const {dialog} = require('electron').remote

const mal = require('malapi').Anime

const animeLocalStoragePath = path.join(os.userInfo().homedir, '.KawAnime', 'anime.json')
exports.DIR = path.join(os.userInfo().homedir, downloadRep)

exports.createJSON = () => {
  fs.access(animeLocalStoragePath, fs.constants.R_OK | fs.constants.W_OK, (err) => {
    if (err)
    {
      fs.appendFileSync(animeLocalStoragePath, '{}')
      console.log('Local anime JSON file was created.')
      return true
    }
    else
    {
      console.log('Local anime JSON file already exists.')
      return false
    }
  })
}

const wasCreated = self.createJSON()

exports.saveAnime = (anime) => {
  const name = anime.title.split(' ').join('').toLocaleLowerCase()

  const parsedJSON = require(animeLocalStoragePath)

  parsedJSON[name] = JSON.stringify({
    picture: anime.picture.toString(),
    synopsis: anime.synopsis.toString(),
    numberOfEpisode: anime.numberOfEpisodes.toString(),
    status: anime.status.toString(),
    year: anime.year.toString(),
    genres: anime.genres.toString(),
    classification: anime.classification.toString(),
    mark: anime.mark.toString()
  })

  fs.writeFileSync(animeLocalStoragePath, JSON.stringify(parsedJSON), 'utf-8', (err) => {
    if (err) throw err
  })
}

exports.filterFiles = (files, filters) => {
  let filteredFiles = []

  for (let filter in filters)
  {
    files.forEach((file) => {
      if (path.extname(file) === filters[filter])
        filteredFiles.push(file)
    })
  }

  return filteredFiles
}

// This function works only if the file is named this way:
// [FANSUB] <NAME> <-> <EP_NUMBER> <EXTENSION_NAME>
exports.searchAnime = (filename, object) => {
  let epNumber = 0
  const initFilename = filename

  filename = filename.split(' ')
  for (let i = 0; i < 3; ++i) i === 1 ? epNumber = filename.pop()
      : filename.pop()

  filename = filename.slice(1).join(' ')

  let result = {
    title: filename,
    episode: epNumber,
    filename: initFilename
  }

  mal.fromName(filename).then((anime) => {
    result.picture = anime.image
    result.synopsis = anime.synopsis.slice(0, 170) + '...'
    result.numberOfEpisodes = anime.episodes.replace('Unknown', 'NC')
    result.status = anime.status
    result.year = anime.aired.split(' ')[2]
    result.genres = anime.genres.join(', ')
    result.classification = anime.classification
    result.mark = anime.statistics.score.value

    object.files.push(result)

    if (ascending)
      object.files.sort((a, b) => a.title === b.title ?
          -b.episode.toString().localeCompare(a.episode) :
          a.title.toString().localeCompare(b.title))
    else
      object.files.sort((a, b) => a.title === b.title ?
          b.episode.toString().localeCompare(a.episode) :
          a.title.toString().localeCompare(b.title))

    self.saveAnime(result)
  })
}

// This function works only if the file is named this way:
// [FANSUB] <NAME> <-> <EP_NUMBER> <EXTENSION_NAME>
exports.searchInJSON = (filename, object) => {
  const jsonFile = require(animeLocalStoragePath)

  let epNumber = 0
  const initFilename = filename

  filename = filename.split(' ')
  for (let i = 0; i < 3; ++i) i === 1 ? epNumber = filename.pop()
      : filename.pop()

  filename = filename.slice(1).join(' ')

  const jsonFileName = filename.split(' ').join('').toLowerCase()

  if (jsonFile[jsonFileName])
  {
    const local = JSON.parse(jsonFile[jsonFileName])

    object.files.push({
      title: filename,
      episode: epNumber,
      filename: initFilename,
      picture: local.picture,
      synopsis: local.synopsis,
      numberOfEpisodes: local.numberOfEpisode,
      status: local.status,
      year: local.year,
      genres: local.genres,
      classification: local.classification,
      mark: local.mark
    })

    return true
  }

  return false
}

exports.findFiles = (object, dir) => {
  const allFiles = fs.readdirSync(dir)

  const filteredFiles = self.filterFiles(allFiles, ['.mkv', '.mp4'])

  // First we look for a local-stored information.
  filteredFiles.forEach((file) => {
    // If we don't have it, we look for it online.
    if (!self.searchInJSON(file, object))
      self.searchAnime(file, object)
  })
}

exports.playFile = (name) => {
  shell.openItem(path.join(self.DIR, name))
}

exports.delFile = (object, name) => {
  const namePath = path.join(self.DIR, name)

  fs.unlink(namePath, () => {
    console.log(`${name} was deleted.`)

    // Looking for that file in object.files
    for (let i = 0; i < object.files.length; ++i)
      if (object.files[i].filename === name) object.files.splice(i, 1)
  })
}

exports.changePathDialog = (object) => {
  dialog.showOpenDialog({properties: ['openDirectory']}, (dirPath) => {
    if (dirPath !== undefined)
    {
      object.files = []
      object.currentDir = dirPath[0]
      self.findFiles(object, dirPath[0])
    }
  })
}