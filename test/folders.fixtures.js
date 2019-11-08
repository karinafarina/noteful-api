function makeFoldersArray() {
  return [
    {
      //id: 1,
      title: 'Important',
    },
    {
      //id: 2,
      title: 'Super'
    },
    {
      //id: 3,
      title: 'Spangley'
    }
  ]
}

function makeMaliciousFolder() {
  const maliciousFolder = {
    id: 911,
    title: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`
  };

  const expectedFolder = {
    ...maliciousFolder,
    title: `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`
  };
  return {
    maliciousFolder,
    expectedFolder
  };
}

module.exports = {
  makeFoldersArray,
  makeMaliciousFolder
}