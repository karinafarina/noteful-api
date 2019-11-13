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
        // logger.info({
        //   message: `Folder with id ${folder_id} deleted.`,
        //   request: `${req.originalUrl}`,
        //   method: `${req.method}`,
        //   ip: `${req.ip}`
        // })

        //need to send back message instead of .end()
        res.status(204).json({
          message: true
        });
      })
      .catch(next)
  })
  



  module.exports = foldersRouter
