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

      context(`Given an XSS attack note`, () => {
        //const testNotes = makeNotesArray();
        const testFolders = makeFoldersArray();
        const { maliciousNote, expectedNote } = makeMaliciousNote();
        console.log('maliciousnogte: ', maliciousNote)
                
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
        it.only('removes XSS attack content', () => {
          return supertest(app)
            .get(`/api/notes`)
            .expect(200)
            .expect(res => {
              console.log('response', res.body[0].title)
              console.log('expected response', expectedNote)
              expect(res.body[0].title).to.eql(expectedNote.title)
              expect(res.body[0].content).to.eql(expectedNote.content)
            })
        })
      })
      
    })
  })


})