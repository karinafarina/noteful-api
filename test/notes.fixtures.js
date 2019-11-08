function makeNotesArray() {
  return [
    {
      id: 1,
      title: 'Dogs',
      folder_id: 1,
      content: 'Note 1',
      date_published: '2029-01-22T16:28:32.615Z'
    },
    {
      id: 2,
      title: 'Cats',
      folder_id: 2,
      content: 'Note 2',
      date_published: '2100-05-23T04:28:32.615Z'
    }
  ]
}

function makeMaliciousNote() {
  const maliciousNote = {
    id: 911,
    title: 'Naughty naughty very naughty <script>alert("xss");</script>',
    folder_id: 1,
    content: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`
  }
  const expectedNote = {
    ...maliciousNote,
    title: 'Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;',
    content: `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`
  }
  return {
    maliciousNote,
    expectedNote,
  }
}

module.exports = {
  makeNotesArray,
  makeMaliciousNote
}