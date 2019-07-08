const Note = require('../models/note.model.js');
const Common = require('../controllers/common.controller.js');
const dbConfig = require('../../config/database.config.js');
const mongoose = require('mongoose');

// Create and Save a new Note
exports.create = (req, res) => {
    // Validate request
    if(!req.body.user_id) {
        return Common.response(res,'Please pass UserId.','1');
    }

    if(!req.body.content) {
		return Common.response(res,'Note content can not be empty.','1');
    }

    // Create a Note
    const note = new Note({
        userDetails: req.body.user_id,
        title: req.body.title || "", 
        content: req.body.content,
		status: req.body.status || 1, 
    });

    // Save Note in the database
    note.save()
    .then(data => {
        Note.find({"_id" : data._id}).select(["-status","-createdAt","-updatedAt","-__v"])
        .populate('userDetails',['_id','name','email','phone_number'])
        .exec(function (err, noteDetails) {
            return Common.response(res,'Note saved successfully.', '0', JSON.parse(JSON.stringify(noteDetails)));
        })
    }).catch(err => {
		return Common.response(res,err.message || 'Something is wrong, please try again later.', '1');
    });
};

// Retrieve and return all notes from the database.
exports.findAll = (req, res) => {
    var user_id = req.body.user_id || req.get('user_id') || req.query.user_id;
    var page = req.body.page || req.get('page') || req.query.page || 1;
    var search = req.body.search || req.get('search') || req.query.search || "";
    var condition = {};
    if(search){
        var subConditions = [
            {"title" : new RegExp(search, 'i')},
            {"content" : new RegExp(search, 'i')}
        ];
        if(mongoose.Types.ObjectId.isValid(search)){
            subConditions.push({"_id" : mongoose.Types.ObjectId(search)});
            subConditions.push({"userDetails" : mongoose.Types.ObjectId(search)});
        }
        condition = { $or : subConditions}
    }
    //Total records count
    Note.countDocuments(condition, function( err, count){
        return count;
    })
    .then(totalCount => {
        if(totalCount > 0){
            //Fetch records
            Note.find(
                condition,
                ["-status","-createdAt","-updatedAt","-__v"],
                {
                    skip:((page-1)*dbConfig.recordsPerPage),
                    limit:dbConfig.recordsPerPage,
                    sort:{
                        createdAt: -1
                    }
                }
            )
            .populate('userDetails',['_id','name','email','phone_number'])
            .then(notes => {        
                var response = JSON.parse(JSON.stringify(notes));
                if(response.length == 0)
                    return Common.response(res,'No record found!', '1');
                else{
                    return Common.response(res,'', '0', response,{"totalPageCount" : Math.ceil(totalCount / dbConfig.recordsPerPage)});
                }
            }).catch(err => {
                return Common.response(res,err.message || "Some error occurred while retrieving notes.", '1');
            });
        }else{
            return Common.response(res,'No record found!', '1');
        }
    }).catch(err => {
        return Common.response(res,err.message || "Some error occurred while retrieving notes.", '1');
    });
};

// Find a single note with a noteId
exports.findOne = (req, res) => {
    Note.findById(req.params.noteId)
    .then(note => {
        if(!note) {
			return Common.response(res,"Note not found with id " + req.params.noteId, '1');
        }
        //res.send(note);
		return Common.response(res,'', '0', note);
    }).catch(err => {
        if(err.kind === 'ObjectId') {
			Common.response(res,"Note not found with id " + req.params.noteId, '1'); 
        }
		return Common.response(res,"Error retrieving note with id " + req.params.noteId, '1'); 
    });
};

// Update a note identified by the noteId in the request
exports.update = (req, res) => {
    // Validate Request
    if(!req.body.content) {
		return Common.response(res,"Note content can not be empty", '1'); 
    }

    // Find note and update it with the request body
    Note.findByIdAndUpdate(req.params.noteId, {
        title: req.body.title || "Untitled Note",
        content: req.body.content
    }, {new: true})
    .then(note => {
        if(!note) {
			return Common.response(res,"Note not found with id " + req.params.noteId, '1'); 
        }
        return Common.response(res,'Note saved successfully.', '0', note);
    }).catch(err => {
        if(err.kind === 'ObjectId') {
			return Common.response(res,"Note not found with id " + req.params.noteId, '1'); 
        }
		return Common.response(res,"Error updating note with id " + req.params.noteId, '1'); 
    });
};

// Delete a note with the specified noteId in the request
exports.delete = (req, res) => {
    Note.findByIdAndRemove(req.params.noteId)
    .then(note => {
        if(!note) {
			return Common.response(res,"Note not found with id " + req.params.noteId, '1'); 
        }
		return Common.response(res,"Note deleted successfully!"); 
    }).catch(err => {
        if(err.kind === 'ObjectId' || err.name === 'NotFound') {
			return Common.response(res,"Note not found with id " + req.params.noteId, '1'); 
        }
		return Common.response(res,"Could not delete note with id " + req.params.noteId, '1'); 
    });
};