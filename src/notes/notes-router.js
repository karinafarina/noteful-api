const path = require('path');
const express = require('express');
const xss = require('xss');
const NotesService = require('./notes-service')

const notesRouter = express.Router();
const jsonParser = express.json();

const serializeNote = note => ({
  id: note.id,
  title: xss(note.title),
  folder_id: note.folder_id,
  content: xss(note.content),
  date_published: note.date_published
});

notesRouter
  .route('/')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db')

    NotesService.getAllNotes(knexInstance)
      .then(notes => {
        res.json(notes.map(serializeNote))
      })
      .catch(next)
  })

  notesRouter
    .route('/:note_id')
    .all((req, res, next) => {
      console.log('res.note', res)
      NotesService.getById(
        req.app.get('db'),
        req.params.note_id,
      )
        .then(note => {
          if(!note) {
            return res.status(404).json({
              error: { message: `Note does not exist` }
            })
          }
          res.note = note
          next()
        })
        .catch(next)
    })
    .get((req, res, next) => {
      res.json(serializeNote(res.note))
    })
    .post(jsonParser, (req, res, next) => {
      const { title, content } = req.body
      const newNote = { title, content }
      console.log('NEWNOTE',newNote)
      //const knexInstance = req.app.get('db')

      for(const [key, value] of Object.entries(newNote))
        if (value == null)
          return res.status(400).json({
            error: { message: `Missing '${key}' in request body`}
          })
          //newNote.folder_id = folder_id
          NotesService.insertNote(
            req.app.get('db'),
            newNote
            )
            .then(note => {
              // logger.info({
              //   message: `Note with id ${note.id} created.`,
              //   request: `${req.originalUrl}`,
              //   method: `${req.methon}`,
              //   ip: `${req.if}`
              // })
              res
                .status(201)
                .location(path.posix.join(req.originalUrl, `/${note.id}`))
                .json(serializeNote(note))
            })
            .catch(next)
    })

module.exports = notesRouter

