const path = require('path');
const express = require('express');
const xss = require('xss');

const FoldersService = require('./folders-service')

const foldersRouter = express.Router();
const jsonParser = express.json();

const serializeFolder = folder => ({
  id: folder.id,
  title: xss(folder.title)
})

foldersRouter
  .route('/')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db')
    FoldersService.getAllFolders(knexInstance)
      .then(folders => {
        res.json(folders.map(serializeFolder))
      })
      .catch(next)
  })
  .post(jsonParser, (req, res, next) => {
    const { title } = req.body
    const newFolder = { title }

    for(const [key, value] of Object.entries(newFolder))
      if(value == null)
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body`}
        })
    
    FoldersService.insertFolder(
      req.app.get('db'),
      newFolder
    )
      .then(folder => {
        console.log('req.originalUrl', req.originalUrl)
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${folder.id}`))
          .json(serializeFolder(folder))
      })
      .catch(next)
  })

foldersRouter
  .route('/:folder_id')
  .all((req, res, next) => {
    const { folder_id } = req.params
    const knexInstance = req.app.get('db')
    FoldersService.getById(knexInstance, folder_id)
      .then(folder => {
        if(!folder) {
          return res.status(404).json({
            error: { message: `Folder Not Found`}
          })
        }
        res.folder = folder
        next()
      })
      .catch(next)
  })
  .get((req, res, next) => {
    res.json(serializeFolder(res.folder))
  })
  .delete((req, res, next) => {
    const { folder_id } = req.params;
    const knexInstance = req.app.get('db');
    FoldersService.deleteFolder(knexInstance, folder_id)
      .then(numRowsAffected => {
        res.status(204).end
      })
      .catch(next)
  })
  .patch(jsonParser, (req, res, next) => {
    const { title } = req.body
    const folderToUpdate = { title }

    const numberOfValues = Object.values(folderToUpdate).filter(Boolean).length
    if(numberOfValues === 0)
      return res.status(400).json({
        error: {
          message: `Request body must contain either, 'title'`
        }
      })

      FoldersService.updateFolder(
        req.app.get('db'),
        req.params.folder_id,
        folderToUpdate
      )
        .then(numRowsAffected => {
          console.log('numrows affected', numRowsAffected)
          res.status(204).end()
        })
        .catch(next)
  })
  



  module.exports = foldersRouter
