module.exports = (app) => {
    const notes = require('../controllers/note.controller.js');
    var Common = require('../controllers/common.controller.js');

    // Create a new Note
    app.post('/notes', [
        function(req, res, next){
            Common.validatePayload(req, res, next,{"user_id" : "required","title" : "required","content" : "required"});
        },
        Common.verifyToken
    ], notes.create);

    // Retrieve all Notes
    app.get('/notes', [
        function(req, res, next){
            Common.validatePayload(req, res, next,{"user_id" : "required","page" : "required"});
        },
        Common.verifyToken
    ], notes.findAll);

    // Retrieve a single Note with noteId
    //app.get('/notes/:noteId', Common.verifyToken, notes.findOne);

    // Update a Note with noteId
    //app.put('/notes/:noteId', Common.verifyToken, notes.update);

    // Delete a Note with noteId
    //app.delete('/notes/:noteId', Common.verifyToken, notes.delete);
}