const knex = require('knex')
const app = require('../src/app')
const { makeNotesArray, makeMaliciousNote } = require('./notes.fixtures')
const { makeFoldersArray } = require('./folders.fixtures')


describe('Notes Endpoints', function() {
  let db

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DATABASE_URL,
    })
    app.set('db', db)
  })

  after('disconnect from db', () => db.destroy())

  before('clean the table', () => 
    db.raw('TRUNCATE noteful_notes, noteful_folders RESTART IDENTITY CASCADE')
  );

  afterEach('cleanup', () => 
  db.raw('TRUNCATE noteful_notes, noteful_folders RESTART IDENTITY CASCADE')
  );

  describe(`GET /api/notes`, () => {
    context(`Given no notes`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get('/api/notes')
          .expect(200, [])
      })
    })
    context(`Given there are notes in the database`, () => {
      const testNotes = makeNotesArray()
      const testFolders = makeFoldersArray()

      beforeEach('insert folders', () => {
        return db
          .into('noteful_folders')
          .insert(testFolders)
          .then(() => {
            return db
              .into('noteful_notes')
              .insert(testNotes)
          })
      })

      it('responds with 200 and all of the notes', () => {
        return supertest(app)
          .get('/api/notes')
          .expect(200, testNotes)
      })
    })
    context(`Given an XSS attack note`, () => {
      const testFolders = makeFoldersArray();
      const { maliciousNote, expectedNote } = makeMaliciousNote();
              
      beforeEach('insert malicious note', () => {
        return db
          .into('noteful_folders')
          .insert(testFolders)
          .then(() => {
            return db
              .into('noteful_notes')
              .insert([ maliciousNote ])
          })
      })
      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/notes`)
          .expect(200)
          .expect(res => {
            expect(res.body[0].title).to.eql(expectedNote.title)
            expect(res.body[0].content).to.eql(expectedNote.content)
          })
      })
    })
  })
  describe(`GET /api/notes/:noteId`, () => {
    
    context(`Given no note`, () => {
      it(`responds with 404`, () => {
        const noteId = 123456;
        return supertest(app)
          .get(`/api/notes/${noteId}`)
          .expect(404, { error: { message: `Note does not exist` } })
      })
    })
    context('Given there are notes in the database', () => {
      const testFolder = makeFoldersArray();
      const testNote = makeNotesArray();

      beforeEach('insert note', () => {
        return db
          .into('noteful_folders')
          .insert(testFolder)
          .then(() => {
            return db
              .into('noteful_notes')
              .insert(testNote)
          })
      })
      it('responds with 200 and the specified note', () => {
        const noteId = 2;
        const expectedNote = testNote[noteId - 1];
        return supertest(app)
          .get(`/api/notes/${noteId}`)
          .expect(res => {
            expect(res.body.title).to.eql(expectedNote.title);
            expect(res.body).to.have.property('id')
          })
      })
    })
  })

  describe(`POST /api/notes`, () => {
    const testFolder = makeFoldersArray();
    const testNote = makeNotesArray();

    beforeEach('insert related folder', () => {
      return db
        .into('noteful_folders')
        .insert(testFolder)
    })
    it(`creates a note, respnding with 201 and the new note`, function() {
      const newNote = {
        title: 'Test new note',
        folder_id: 1,
        content: 'test content'
      }
      //this.retries(3)
      return supertest(app)
        .post('/api/notes')
        .send(newNote)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(newNote.title)
          expect(res.body.folder_id).to.eql(newNote.folder_id)
          expect(res.body.content).to.eql(newNote.content)
          expect(res.body).to.have.property('id')
          expect(res.headers.location).to.eql(`/api/notes/${res.body.id}`)
          const expected = new Date().toLocaleDateString()
          const actual = new Date(res.body.date_published).toLocaleDateString()
          expect(actual).to.eql(expected)
        })
        .then(res => 
          supertest(app)
            .get(`/api/notes/${res.body.id}`)
            .expect(res.body)
          )
    })

    const requiredFields = ['title', 'folder_id', 'content']

    requiredFields.forEach(field => {
      const newNote = {
        title: 'Test new title',
        folder_id: "Test new folder_id",
        content: 'Test new content'
      }

      it(`responds with 400 and an error message when the '${field}' is missing`, () => {
        delete newNote[field]

        return supertest(app)
        .post('/api/notes')
        .send(newNote)
        .expect(400, {
          error: { message: `Missing '${field}' in request body` }
        })
      })
    })
    it('removes XSS attack content from response', () => {
      const { maliciousNote, expectedNote } = makeMaliciousNote()
      return supertest(app)
        .post(`/api/notes`)
        .send(maliciousNote)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(expectedNote.title)
          expect(res.body.folder_id).to.eql(expectedNote.folder_id)
          expect(res.body.content).to.eql(expectedNote.content)
        })
    })
  })

  describe(`DELETE /api/notes/:noteId`, () => {
    context(`Given not notes`, () => {
      it(`responds with 404`, () => {
        const noteId = 123456
        return supertest(app)
          .delete(`/api/notes/${noteId}`)
          .expect(404, { error: { message: `Note does not exist`} })
      })
    })
    context(`Given there are notes in the database`, () => {
      const testNotes = makeNotesArray()
      const testFolders = makeFoldersArray()

      beforeEach(`insert notes`, () => {
        return db
          .into('noteful_folders')
          .insert(testFolders)
          .then(() => {
            return db
              .into('noteful_notes')
              .insert(testNotes)
          })
      })
      it('responds with 204 and removes the note', () => {
        const idToRemove = 2
        const expectedNote = testNotes.filter(note => note.id !== idToRemove)
        
        return supertest(app)
          .delete(`/api/notes/${idToRemove}`)
          .expect(204)
          .then(res =>  
            supertest(app)
              .get(`/api/notes`)
              .expect(res => {
                expect(expectedNote)
              })
            )
      })
    })
  })

  describe('PATCH /api/notes/:noteId', () => {
    context(`Given not notes`, () => {
      it(`responds with 404`, () => {
        const noteId = 123456
        return supertest(app)
          .delete(`/api/notes/${noteId}`)
          .expect(404, { error: { message: `Note does not exist`} })
      })
    })

    context(`Given there are articles in the database`, () => {
      const testNotes = makeNotesArray()
      const testFolders = makeFoldersArray()

      beforeEach('insert notes', () => {
        return db
          .into('noteful_folders')
          .insert(testFolders)
          .then(() => {
            return db
              .into('noteful_notes')
              .insert(testNotes)
          })
      })

      it(`responds with 204 and updates the note`, () => {
        const idToUpdate = 2
        const updateNote = {
          title: 'updated note title',
          folder_id: 1,
          content: 'updated content'
        }
        const expectedNote = {
          ...testNotes[idToUpdate - 1],
          ...updateNote
        }
        return supertest(app)
          .patch(`/api/notes/${idToUpdate}`)
          .send(updateNote)
          .expect(204)
          .then(res => 
            supertest(app)
              .get(`/api/notes/${idToUpdate}`)
              .expect(expectedNote)
            )
      })
    })

  })

})