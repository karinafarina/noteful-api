const knex = require('knex')
const app = require('../src/app')
const { makeNotesArray, makeMaliciousNote } = require('./notes.fixtures')
const { makeFoldersArray } = require('./folders.fixtures')


describe('Notes Endpoints', function() {
  let db

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
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
  describe(`GET /api/notes/:note_id`, () => {
    
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

  describe.only(`POST /api/notes`, () => {
    const testFolder = makeFoldersArray();
    const testNote = makeNotesArray();

    beforeEach('insert related folder', () => {
      return db
        .into('noteful_folders')
        .insert(testFolder)
    })
    it(`creates a note, respnding with 201 and the new note`, function() {
      const newNote = {
        title: 'Test new nte',
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
        })
        .then(res => 
          supertest(app)
            .get(`/api/notes/${res.body.id}`)
            .expect(res.body)
          )
    })
    
  })
})