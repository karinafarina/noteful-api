const knex = require('knex')
const app = require('../src/app');
const { makeFoldersArray, makeMaliciousFolder } = require('./folders.fixtures')

describe('Folder Endpoints', function() {
  let db;

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
  )

  afterEach('cleanup', () => 
    db.raw('TRUNCATE noteful_notes, noteful_folders RESTART IDENTITY CASCADE')
  )

  describe('GET /api/folders', () => {
    context(`Given no folders`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get('/api/folders')
          .expect(200, [])
      })
    })

    context('Given there are folders', () => {
      const testFolder = makeFoldersArray()

      beforeEach('insert folders', () => {
        return db
          .into('noteful_folders')
          .insert(testFolder)
      })

      it('responds with 200 and all of the folders', () => {
        return supertest(app)
          .get('/api/folders')
          .expect (200, testFolder)
      })
    })

    context(`Given an XSS attack folder name`, () => {
      const { maliciousFolder, expectedFolder } = makeMaliciousFolder()

      beforeEach('insert malicious folder name', () => {
        return db
          .into('noteful_folders')
          .insert(maliciousFolder)
      })

      it('removes XSS attack folder name', () => {
        return supertest(app)
          .get(`/api/folders`)
          .expect(200)
          .expect(res => {
            expect(res.body[0].title).to.eql(expectedFolder.title)
          })
      })
    })
  })
  
  describe('GET /api/folders/:folder_id', () => {
    context(`Given no folder`, () => {
      it(`responds with 404`, () => {
        const folder_id = 123456
        return supertest(app)
          .get(`/api/folders/${folder_id}`)
          .expect(404, { error: { message: `Folder Not Found` } })
      })
    })

    context('Given there are folders in the database', () => {
      const testFolders = makeFoldersArray()

      beforeEach('insert folders', () => {
        return db
          .into('noteful_folders')
          .insert(testFolders)
      })

      it('responds with 200 and the specified folder', () => {
        const folder_id = 2
        const expectedFolder = testFolders[folder_id - 1]
        return supertest(app)
          .get(`/api/folders/${folder_id}`)
          .expect(200, expectedFolder)
      })
    })
    context('Given an XSS attack folder', () => {
      const testFolder = makeFoldersArray()
      const { maliciousFolder, expectedFolder } = makeMaliciousFolder()

      beforeEach('insert malicious folder', () => {
        return db
          .into('noteful_folders')
          .insert([ maliciousFolder ])
      })

      it('removes XSS attack content', () => {
        console.log('maliciousfolder ', maliciousFolder.id)
        return supertest(app)
          .get(`/api/folders/${maliciousFolder.id}`)
          .expect(200)
          .expect(res => {
            expect(res.body.title).to.eql(expectedFolder.title)
            expect(res.body.content).to.eql(expectedFolder.content)
          })
      })
    })
  })

  describe('POST /api/folders', () => {
    const testFolder = makeFoldersArray()

    it('creates a folder, responding with 201 and the new folder', () => {
    const newFolder = {
      title: 'Test New Folder'
    }
    return supertest(app)
      .post('/api/folders')
      .send(newFolder)
      .expect(201)
      .expect(res => {
        expect(res.body.title).to.eql(newFolder.title)
        expect(res.body).to.have.property('id')
        expect(res.headers.location).to.eql(`/api/folders/${res.body.id}`)
      })
      .then(res =>
        supertest(app)
          .get(`/api/folders/${res.body.id}`)
          .expect(res.body)
        )
    })

    const requiredFields = ['title']

    requiredFields.forEach(field => {
      const newFolder = {
        title: 'Test New Folder'
      }

      it(`responds with 400 and an error message whenthe '${field}' is missing`, () => {
        delete newFolder[field]

        return supertest(app)
          .post('/api/folders')
          .send(newFolder)
          .expect(400, {
            error: { message: `Missing '${field}' in request body` }
          })
      })
    })

    it('removes XSS attack content from response', () => {
      const { maliciousFolder, expectedFolder } = makeMaliciousFolder()
      return supertest(app)
        .post(`/api/folders`)
        .send(maliciousFolder)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(expectedFolder.title);
        });
    });
  })

  describe.only(`DELETE /api/folders/:folder_id`, () => {
    context(`Given no folder`, () => {
      it(`responds with 404`, () => {
        const folder_id = 123456;
        return supertest(app)
          .delete(`/api/folders/${folder_id}`)
          .expect(404, { error: { message: `Folder Not Found` } })
      })
    })

    context('Given there are folders in the database', () => {
      const testFolder = makeFoldersArray();

      beforeEach('insert folder', () => {
        return db
          .into('noteful_folders')
          .insert(testFolder);
      })

      it.only('responds with 204 and removes the folder', () => {
        const idToRemove = 2
        const expectedFolder = testFolder.filter(folder => folder.id !== idToRemove)
        return supertest(app)
          .delete(`/api/folders/${idToRemove}`)
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/folders`)
              .expect(expectedFolder)
          )
      })
    })
  })
})