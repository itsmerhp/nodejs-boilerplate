module.exports = (app) => {
    const users = require('../controllers/user.controller.js');
    var Common = require('../controllers/common.controller.js');
    const path = require('path');
    const Resize = require('../../Resize.js');
    const upload = require('../../uploadMiddleware');

    // User signup
    app.post('/users/sign-up',[upload.single('profile_pic'), function(req, res, next){Common.validateFormat(req, res, next);}, function(req, res, next){
    	Common.validatePayload(req, res, next,{"name" : "required", "email" : ["required","email"], "password" : "required","phone_number" : "phone","birth_date" : "date","gender" : "integer","device_type" : "integer"});
    }], users.signUp);
    
    //To catch larger file error   
    app.use(function (err, req, res, next) {
        return Common.response(res,err.message || 'Something is wrong, please try again later.','1'); 
    })

    // User login
    app.post('/users/login',[upload.none(), function(req, res, next){
    	Common.validatePayload(req, res, next,{"email" : ["required","email"], "password" : "required"});
    }], users.login);

    // change password
    app.post('/users/change-password',[
        upload.none(), 
    	function(req, res, next){
    		Common.validatePayload(req, res, next,{"user_id" : "required", "old_password" : "required", "new_password" : "required"});
    	},
    	Common.verifyToken
	], users.changePassword);

    // forgot password password
    app.post('/users/forgot-password',[
        upload.none(), 
    	function(req, res, next){
    		Common.validatePayload(req, res, next,{"email" : ["required","email"]});
    	}
	], users.forgotPassword);

    // reset password form
    app.get('/users/reset-password', users.resetPasswordForm);  

    // reset password
    app.post('/users/reset-password',[
        upload.none(), 
        function(req, res, next){
            Common.validatePayload(req, res, next,{"token" : "required", "password" : "required"});
        }
    ], users.resetPassword);   

    // Logout
    app.post('/users/logout',[
        upload.none(), 
        function(req, res, next){
            Common.validatePayload(req, res, next,{"user_id" : "required"});
        },
        Common.verifyToken
    ], users.logout); 

    // get user profile
    app.get('/users/profile',[
        upload.none(), function(req, res, next){
            Common.validatePayload(req, res, next,{"user_id" : "required"});
        },
        Common.verifyToken
    ], users.getProfile);

    // Edit Profile
    app.post('/users/edit-profile',[
        upload.single('profile_pic'), 
        function(req, res, next){Common.validateFormat(req, res, next);}, function(req, res, next){
            Common.validatePayload(req, res, next,{"user_id" : "required","name" : "required", "email" : ["required","email"],"phone_number" : "phone","birth_date" : "date","gender" : "integer"});
        },
        Common.verifyToken
    ], users.editProfile);

    // Update user location
    app.post('/users/update-location',[
        upload.none(), 
        function(req, res, next){Common.validateFormat(req, res, next);}, function(req, res, next){
            Common.validatePayload(req, res, next,{"user_id" : "required","lat" : "required","long" : "required"});
        },
        Common.verifyToken
    ], users.updateLocation);

    /*// Fetch user list
    app.get('/users', [
        function(req, res, next){
            Common.validatePayload(req, res, next,{"user_id" : "required","page" : "required"});
        },
        Common.verifyToken
    ], users.userList);*/

    // Fetch user list
    app.get('/users', users.userList);
}