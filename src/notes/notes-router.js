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
  .post(jsonParser, (req, res, next) => {
    const { title, folder_id, content } = req.body
    const newNote = { title, folder_id, content }
    //const knexInstance = req.app.get('db')

    for (const [key, value] of Object.entries(newNote))
      if (value == null)
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body` }
        })
      //ASK JEREMY ABOUT THIS
    newNote.folder_id = folder_id

    NotesService.insertNote(
      req.app.get('db'),
      newNote
    )
      .then(note => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${note.id}`))
          .json(serializeNote(note))
      })
      .catch(next)
  })

  notesRouter
    .route('/:note_id')
    .all((req, res, next) => {
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
    .delete((req, res, next) => {
      NotesService.deleteNote(
        req.app.get('db'),
        req.params.note_id
      )
      .then(numRowsAffected => {
        res.status(204).end()
      })
      .catch(next)
    })
    .patch(jsonParser, (req, res, next) => {
      const { title, folder_id, content } = req.body
      const noteToUpdate = { title, folder_id, content }
      console.log('folder id: ', folder_id)

      const numberOfValues = Object.values(noteToUpdate).filter(Boolean).length
      if (numberOfValues === 0)
        return res.status(400).json({
          error: {
            message: `Request body must contain either 'title', 'folder_id', or 'content'`
          }
        })
      console.log('Request body is: ', req.params.note_id)
        NotesService.updateNote(
          req.app.get('db'),
          req.params.note_id,
          noteToUpdate
        )
        .then(numRowsAffected => {
          res.status(204).end()
        })
        .catch(next)
    })
    

module.exports = notesRouter

