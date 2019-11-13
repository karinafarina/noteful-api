const FoldersService = {
  getAllFolders(knex) {
    return knex.select('*').from('noteful_folders')
  },
  //ASK MENTOR ABOUT THIS
  insertFolder(knex, newFolder) {
    return knex
      .insert(newFolder)
      .into('noteful_folders')
      .returning('*')
      .then(rows => {
        console.log('rows', rows)
        return rows[0]
      });
  },

  getById(knex, folder_id) {

    return knex
      .from('noteful_folders')
      .select('*')
      .where('id', parseInt(folder_id, 10))
      .first()
  },

  deleteFolder(knex, folder_id) {
    console.log('folder_id', folder_id)
    return knex('noteful_folders')
      .where({ folder_id })
      .delete()
  },

  updateFolder(knex, id, newFolderFields) {
    return knex('noteful_folders')
      .where({ id })
      .update(newFolderFields)
  }
}

module.exports = FoldersService