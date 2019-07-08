const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    name: String,
    email: String,
    phone_number: Number,
    password: String,
    profile_image: String,
    birth_date: Date,
    password_reset_token : String,
    gender: { type: Number, min: 1, max: 3 },//1=> male, 2 => female, 3 => others
    //lat : String,
    //long : String,
    location: {
        type: { type: String },
        coordinates: [Number],
    },
	status: { type: Number, min: -1, max: 1 }//1=> Active, 0 => Inactive, -1 => Delete	
}, {
    timestamps: true
});
userSchema.index( { "location" : "2dsphere" } );
module.exports = mongoose.model('User', userSchema);