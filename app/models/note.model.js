const mongoose = require('mongoose');

const NoteSchema = mongoose.Schema({
	userDetails: { type: mongoose.Schema.ObjectId, ref: 'User'},
    title: String,
    content: String,
	status: { type: Number, min: -1, max: 1 },//1=> Active, 0 => Inactive, -1 => Delete
}, {
    timestamps: true
});

module.exports = mongoose.model('Note', NoteSchema);