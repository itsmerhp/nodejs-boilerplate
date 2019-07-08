const mongoose = require('mongoose');

const accessTokenSchema = mongoose.Schema({
    userDetails: { type: mongoose.Schema.ObjectId, ref: 'User'},
    access_token : String,
    device_type : { type: Number, min: 1, max: 2 },//1=> Android, 2 => iOS
    device_token : String
}, {
    timestamps: true
});

module.exports = mongoose.model('AccessToken', accessTokenSchema);