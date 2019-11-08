const path = require('path');
const express = require('express');
const xss = require('xss');
const NotesService = require('./notes-service')

const notesRouter = express.Router();
//const jsonParser = express.json();

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
    console.log('knexInstance', req.app.get('db'))
    NotesService.getAllNotes(knexInstance)
      .then(notes => {
        res.json(notes.map(serializeNote))
      })
      .catch(next)
  })

  // notesRouter
  //   .route('/:note_id')
  //   .all((req, res, next) => {

  //     NotesService.getById(
  //       req.app.get('db'),
  //       console.log('111111', req.params)

  //       //req.params.id,
  //     )
  //       .then(note => {
  //         if(!note) {
  //           return res.status(400).json({
  //             error: { message: `Note does not existe` }
  //           })
  //         }
  //         res.note = note
  //         next()
  //       })
  //       .catch(next)
  //   })
  //   .get((req, res, next) => {
  //     res.json(serializeNote(res.note))
  //   })

module.exports = notesRouter

