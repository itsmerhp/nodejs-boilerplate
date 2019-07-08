var http = require('http');
var url = require('url') ;
const User = require('../models/user.model.js');
const AccessToken = require('../models/accessToken.model.js');
const Common = require('../controllers/common.controller.js');
const dbConfig = require('../../config/database.config.js');
const path = require('path');
const Resize = require('../../Resize.js');
const mongoose = require('mongoose');
var fs    = require("fs");
var bcrypt = require('bcrypt');
var BCRYPT_SALT_ROUNDS = 12;

// User signup
exports.signUp = (req, res) => {
    // Create a User
    const user = new User({
        name: req.body.name || "", 
        email: req.body.email,
        password: req.body.password,
        phone_number: req.body.phone_number || "",
        profile_image: req.body.profile_image || "",
        birth_date: req.body.birth_date || "",
        password_reset_token : "",
        gender: req.body.gender || 1,
		status: req.body.status || 1,
        location : {
            type  : "Point",
            coordinates : [
                req.body.long || dbConfig.defaultLong,
                req.body.lat || dbConfig.defaultLat
                
            ]
        }
    });

    //Check if email or mobile number is already exist
    User.findOne().or([{'email':user.email}, {'phone_number':user.phone_number}])
    .then(userExist => {
        if(userExist) {
            return Common.response(res,"User with mobile or email is already exist!",'1');
        }else{
            //Encrypt password
            bcrypt.hash(user.password, BCRYPT_SALT_ROUNDS)
            .then(function(hashedPassword) {                
                //Upload user image
                const imagePath = path.join(__dirname, '/../../uploads/profile_pic');
                const fileUpload = new Resize(imagePath);
                var profilePic = "";
                if (req.file) {
                    fileUpload.save(req.file.buffer)
                    .then(filename => {
                        profilePic = filename;
                        // Save user in the database
                        Common.saveUserDetails(req, res, user, hashedPassword, profilePic);
                    })
                    .catch(err => {
                        return Common.response(res,err.message || 'Something is wrong in image uploading, please try again later.', '1');
                    });    
                }else{
                    // Save user in the database
                    Common.saveUserDetails(req, res, user, hashedPassword, profilePic);
                }
            }).catch(err => {
                return Common.response(res,err.message || 'Something is wrong in image uploading, please try again later.', '1');
            }); 
        }
    }).catch(err => {
        return Common.response(res,err.message || 'Something is wrong, please try again later.', '1');
    });   
};

// User Login
exports.login = (req, res) => {
    //Find user by email
    User.findOne({'email':req.body.email})
    .then(user=>{
        if(user){
            if(user.status == 1){
                //Compare user enecrypted password
                bcrypt.compare(req.body.password, user.password, function (err, result) {
                    if (result == true) {
                        var token = "";
                        //Create access token and save in DB
                        AccessToken.findOne({'userDetails':user._id,'device_type':req.body.device_type || 1,'device_token':req.body.device_token || ""})
                        .then(tokenExist => {
                            token = Common.generateToken();
                            if(tokenExist) {
                                tokenExist.access_token = token;
                                tokenExist.save();
                            }else{
                                const accessToken = new AccessToken({
                                    userDetails: user._id, 
                                    access_token: token,
                                    device_type: req.body.device_type || 1,
                                    device_token: req.body.device_token || "",
                                });
                                accessToken.save();
                            }

                            //Update user location info
                            user.location.type = "Point";
                            user.location.coordinates = [
                                Common.isset(req.body.long) ? (req.body.long || dbConfig.defaultLong) : (user.location.coordinates[0] || dbConfig.defaultLong),
                                Common.isset(req.body.lat) ? (req.body.lat || dbConfig.defaultLat) : (user.location.coordinates[1] || dbConfig.defaultLat)
                            ];                           
                            user.save();
                            userDetails = JSON.parse(JSON.stringify(user));
                            var response = [{
                                "_id" : userDetails._id,
                                "name" : userDetails.name,
                                "email" : userDetails.email,
                                "phone_number" : userDetails.phone_number,
                                "profile_image" : userDetails.profile_image ? 'http://' + req.headers.host+ '/profile_pic/' + userDetails.profile_image : '',
                                "birth_date" : userDetails.birth_date ? Common.returnDate(userDetails.birth_date) : "",
                                "gender" : userDetails.gender,
                                "long" : userDetails.location.coordinates[0],
                                "lat" : userDetails.location.coordinates[1],
                                "access_token" : token
                            }];
                            return Common.response(res,'Login successfully!','0',response); 
                        }).catch(err => {
                            return Common.response(res,err.message || 'Something is wrong, please try again later.', '1');
                        });  
                    } else {
                        return Common.response(res,'Username or Password is wrong!','1');
                    }
                });
            }else{
                return Common.response(res,'You are inactive, please contact administrator for more details.','1');    
            }
        }else{
            return Common.response(res,'Username or Password is wrong!','1');
        }
    }).catch(err => {
        return Common.response(res,err.message || 'Something is wrong, please try again later.', '1');
    });
};

// change password
exports.changePassword = (req, res) => {
    //Find user by id
    User.findOne({'_id':req.body.user_id})
    .then(user=>{
        if(user){
            if(user.status == 1){
                //Compare user old password
                bcrypt.compare(req.body.old_password, user.password, function (err, result) {
                    if (result == true) {
                        //Encrypt password
                        bcrypt.hash(req.body.new_password, BCRYPT_SALT_ROUNDS)
                        .then(function(hashedPassword) {
                            // Save user in the database
                            user.password = hashedPassword;
                            return user.save();
                        })    
                        .then(data => {
                            return Common.response(res,'Password has been changed successfully.', '0');                             
                        }).catch(err => {
                            return Common.response(res,err.message || 'Something is wrong, please try again later.', '1');
                        });                            
                    } else {
                        return Common.response(res,'Please enter correct old password.','1');
                    }
                });
            }else{
                return Common.response(res,'You are inactive, please contact administrator for more details.','1');    
            }
        }else{
            return Common.response(res,'Please enter valid UserId!','1');
        }
    }).catch(err => {
        return Common.response(res,'Something is wrong, please try again later.', '1');
    });
};

// forgot password
exports.forgotPassword = (req, res) => {
    //Find user by id
    User.findOne({'email':req.body.email})
    .then(user=>{
        if(user){
            if(user.status == 1){
                //Set password reset token and send password reset link to user
                user.password_reset_token = Common.generateToken("25","0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ");
                user.save()
                .then(data => {
                    //Send email with reset password token
                    emailBody = 'Hello '+user.name+'<br/>';
                    emailBody += 'Please <a href="http://' + req.headers.host+ '/users/reset-password?token=' + user.password_reset_token + '">click here</a> to reset password';
                    Common.sendMail(req.body.email, dbConfig.adminName+' <'+dbConfig.adminEmail+'>', 'Reset Password!', emailBody);
                    return Common.response(res,'Please check your email, reset password instrunctions sent into it.', '0');                             
                }).catch(err => {
                    return Common.response(res,err.message || 'Something is wrong, please try again later.', '1');
                });  
            }else{
                return Common.response(res,'You are inactive, please contact administrator for more details.','1');    
            }
        }else{
            return Common.response(res,'Please enter correct Email!','1');
        }
    }).catch(err => {
        return Common.response(res,'Something is wrong, please try again later.', '1');
    });
};

// Reset Password Form
exports.resetPasswordForm = (req, res) => {
    //validate token
    if(req.query.token){
        User.findOne({'password_reset_token':req.query.token})
        .then(user=>{
            if(user){
                if(user.status != 1){
                    res.writeHead(200, {  
                        'Content-Type': 'text/html'  
                    });  
                    res.write("<b>You are inactive, please contact administrator for more details.</b>");  
                    return res.end();   
                }else{
                    fs.readFile('./app/views/reset_password.html', function(error, data) {  
                        if (error) {  
                            res.writeHead(404, {  
                                'Content-Type': 'text/html'  
                            });  
                            res.write("<b>Page Not Found!!!</b>");  
                            return res.end();  
                        } else {  
                            res.writeHead(200, {  
                                'Content-Type': 'text/html'  
                            });  
                            res.write(data);  
                            return res.end();  
                        }  
                    }); 
                }
            }else{
                res.writeHead(200, {  
                    'Content-Type': 'text/html'  
                });  
                res.write("<b>Password reset token has been expired, please try again.</b>");  
                return res.end(); 
            }
        }).catch(err => {
            res.writeHead(200, {  
                'Content-Type': 'text/html'  
            });  
            res.write("<b>"+err.message || 'Something is wrong, please try again later.'+"</b>");  
            return res.end(); 
        });
    }else{
        res.writeHead(200, {  
            'Content-Type': 'text/html'  
        });  
        res.write("<b>Please pass valid token to reset your password!</b>");  
        return res.end(); 
    }
};

// Reset Password Action
exports.resetPassword = (req, res) => {
    var password = req.body.password;
    var token = req.body.token;
    //validate request params
    if(token && password){
        User.findOne({'password_reset_token':token})
        .then(user=>{
            if(user){
                if(user.status != 1){
                    return Common.response(res,'You are inactive, please contact administrator for more details.','1');
                }else{
                    //Encrypt password
                    bcrypt.hash(password, BCRYPT_SALT_ROUNDS)
                    .then(function(hashedPassword) {
                        // Save user in the database
                        user.password = hashedPassword;
                        user.password_reset_token = "";
                        user.save();
                        return Common.response(res,'Password has been reset successfully!','0',[]); 
                    });
                }
            }else{
                return Common.response(res,'Password reset token has been expired, please try again.','1');
            }
        }).catch(err => {
            return Common.response(res,'Something is wrong, please try again later.','1');
        });
    }else{
        return Common.response(res,'Please pass valid password and token to reset your password!','1');
    }
};

// Logout
exports.logout = (req, res) => {
    //Get request params
    var user_id = req.body.user_id || req.get('user_id') || req.query.user_id;
    var accessToken = req.get('Authorization') || req.get('token') || req.get('auth_token') || req.get('auth') || req.get('access_token') || "";
    //Find user by id
    User.findOne({'_id':user_id})
    .then(user=>{
        if(user){
            //Remove user access token on logout
            AccessToken.deleteOne({'userDetails':user_id, 'access_token':accessToken})
            .then(accessTokenDetails => {
                return Common.response(res,'You have been logged out successfully.', '0');                             
            }).catch(err => {
                return Common.response(res,err.message || 'Something is wrong, please try again later.', '1');
            }); 
        }else{
            return Common.response(res,'Please enter valid UserId!','1');
        }
    }).catch(err => {
        return Common.response(res,'Something is wrong, please try again later.', '1');
    });
};

// get user profile
exports.getProfile = (req, res) => {
    //Find user by id
    var user_id = req.body.user_id || req.get('user_id') || req.query.user_id;
    User.findOne({'_id':user_id})
    .then(user=>{
        if(user){            
            userDetails = JSON.parse(JSON.stringify(user));
            var response = [{
                "_id" : userDetails._id,
                "name" : userDetails.name,
                "email" : userDetails.email,
                "phone_number" : userDetails.phone_number,
                "profile_image" : userDetails.profile_image ? 'http://' + req.headers.host+ '/profile_pic/' + userDetails.profile_image : '',
                "birth_date" : userDetails.birth_date ? Common.returnDate(userDetails.birth_date) : "",
                "gender" : userDetails.gender,
                "long" : userDetails.location.coordinates[0],
                "lat" : userDetails.location.coordinates[1]
            }];
            return Common.response(res,'','0',response); 
        }else{
            return Common.response(res,'Please enter valid UserId!','1');
        }
    }).catch(err => {
        return Common.response(res,err.message || 'Something is wrong, please try again later.', '1');
    });
};

// User edit profile
exports.editProfile = (req, res) => {
    //Find user
    User.findOne().or([{'_id' : req.body.user_id}])
    .then(user => {
        if(user.status == 1){
            //Check if email or mobile number is already exist
            //User.findOne().or([{'email':req.body.email}, {'phone_number':req.body.phone_number}, {'_id': { $not : req.body.user_id }}])
            User.findOne({$and:[{$or:[{'email':req.body.email}, {'phone_number':req.body.phone_number}]},{'_id': { $ne : req.body.user_id }}]})
            .then(userExist => {
                if(userExist) {
                    return Common.response(res,"User with mobile or email is already exist!",'1');
                }else{
                    //Upload user image
                    const imagePath = path.join(__dirname, '/../../uploads/profile_pic');
                    const fileUpload = new Resize(imagePath);
                    var profilePic;
                    if (req.file) {
                        fileUpload.save(req.file.buffer)
                        .then(filename => {
                            profilePic = filename;
                            Common.updateUserDetails(req, res, user, profilePic);
                        })
                        .catch(err => {
                            return Common.response(res,err.message || 'Something is wrong in image uploading, please try again later.', '1');
                        });    
                    }else{
                        profilePic = user.profile_image
                        Common.updateUserDetails(req, res, user, profilePic);
                    }                    
                }
            }).catch(err => {
                return Common.response(res,err.message || 'Something is wrong, please try again later.', '1');
            });
        }else{
            return Common.response(res,'You are inactive, please contact administrator for more details.','1');    
        }
    }).catch(err => {
        return Common.response(res,err.message || 'Something is wrong, please try again later.', '1');
    });
};

// Update location
exports.updateLocation = (req, res) => {
    //Find user by id
    User.findOne({'_id':req.body.user_id})
    .then(user=>{
        if(user){
            if(user.status == 1){                
                //Update user location info
                user.location.type = "Point";
                user.location.coordinates = [
                    Common.isset(req.body.long) ? (req.body.long || dbConfig.defaultLong) : (user.location.coordinates[0] || dbConfig.defaultLong),
                    Common.isset(req.body.lat) ? (req.body.lat || dbConfig.defaultLat) : (user.location.coordinates[1] || dbConfig.defaultLat)
                ];
                user.save()
                .then(user => {
                    return Common.response(res,'Location has been updated successfully.', '0');                             
                }).catch(err => {
                    return Common.response(res,err.message || 'Something is wrong, please try again later.', '1');
                });   
            }else{
                return Common.response(res,'You are inactive, please contact administrator for more details.','1');    
            }
        }else{
            return Common.response(res,'Please enter valid UserId!','1');
        }
    }).catch(err => {
        return Common.response(res,'Something is wrong, please try again later.', '1');
    });
};

// Retrieve list of all users.
/*exports.userList = (req, res) => {
    let long=req.query.long;
    let lat=req.query.lat;
    var page = req.body.page || req.get('page') || req.query.page || 1;
    var search = req.body.search || req.get('search') || req.query.search || "";
    var condition = {};
    if(search){
        var subConditions = [
            {"name" : new RegExp(search, 'i')},
            {"email" : new RegExp(search, 'i')}
        ];
        if(mongoose.Types.ObjectId.isValid(search)){
            subConditions.push({"_id" : mongoose.Types.ObjectId(search)});
        }
        condition = { $or : subConditions}
    }

    User.aggregate([
        { 
            "$geoNear": {
                "near": {
                    "type": "Point",
                    "coordinates": [ Number(long), Number(lat) ]
                }, 
                "maxDistance": 989924,//pass max distance in meter
                "spherical": true,
                "distanceField": "distance",
                "distanceMultiplier": 0.001,
                "query" : condition
            }
        },
        {$count: "count"}        
        //{ "$skip" : ((page-1)*dbConfig.recordsPerPage) },
       // { "$limit" : dbConfig.recordsPerPage },
       // { "$sort": { "distance": 1 } }
      ],(err,data)=>{
       if(err) throw err;
       // /console.log(data);
       return res.send(data);
     });

    User.aggregate([
        { 
            "$geoNear": {
                "near": {
                    "type": "Point",
                    "coordinates": [ Number(long), Number(lat) ]
                }, 
                "maxDistance": 989924,//pass max distance in meter
                "spherical": true,
                "distanceField": "distance",
                "distanceMultiplier": 0.001,
                "query" : condition
            }
        },        
        { "$skip" : ((page-1)*dbConfig.recordsPerPage) },
        { "$limit" : dbConfig.recordsPerPage },
        { "$sort": { "distance": 1 } }
      ],(err,data)=>{
       if(err) throw err;
       // /console.log(data);
       return res.send(data);
     });
};*/

// Retrieve list of all users.
exports.userList = (req, res) => {
    var user_id = req.body.user_id || req.get('user_id') || req.query.user_id;
    var page = req.body.page || req.get('page') || req.query.page || 1;
    var search = req.body.search || req.get('search') || req.query.search || "";
    var lat = req.body.lat || req.get('lat') || req.query.lat || "";
    var long = req.body.long || req.get('long') || req.query.long || "";

    var condition = {};
    if(search){
        var subConditions = [
            {"name" : new RegExp(search, 'i')},
            {"email" : new RegExp(search, 'i')}
        ];
        if(mongoose.Types.ObjectId.isValid(search)){
            subConditions.push({"_id" : mongoose.Types.ObjectId(search)});
        }
        condition = { $or : subConditions}
    }
    //define distance params
    $distanceParams = { 
        "$geoNear": {
            "near": {
                "type": "Point",
                "coordinates": [ Number(long), Number(lat) ]
            }, 
            "maxDistance": 989924,//pass max distance in meter
            "spherical": true,
            "distanceField": "distance",
            "distanceMultiplier": 0.001,
            "query" : condition
        }
    };
    //Total records count
    User.aggregate([$distanceParams,{$count: "count"}])
    .then(totalCount => {
        totalCount = Common.isEmpty(totalCount) ? 0 : totalCount[0]['count'];
        if(totalCount > 0){
            //Fetch records
            /*User.find(
                condition,
                ["-password","-password_reset_token","-status","-createdAt","-updatedAt","-__v"],
                {
                    skip:((page-1)*dbConfig.recordsPerPage),
                    limit:dbConfig.recordsPerPage,
                    sort:{
                        createdAt: -1
                    }
                }
            )*/
            User.aggregate([
                $distanceParams,
                { "$skip" : ((page-1)*dbConfig.recordsPerPage) },
                { "$limit" : dbConfig.recordsPerPage },
                { "$sort": { "distance": 1 } }
            ])
            .then(users => {        
                var users = JSON.parse(JSON.stringify(users));
                /*for(var i in response){
                    response[i].profile_image = response[i].profile_image ? 'http://' + req.headers.host+ '/profile_pic/' + response[i].profile_image : '',
                    response[i].birth_date = response[i].birth_date ? Common.returnDate(response[i].birth_date) : "";                    
                }*/
                var response = [];
                for(var i in users){
                    response[i] = {
                        "_id" : users[i]._id,
                        "name" : users[i].name,
                        "email" : users[i].email,
                        "phone_number" : users[i].phone_number,
                        "profile_image" : users[i].profile_image ? 'http://' + req.headers.host+ '/profile_pic/' + users[i].profile_image : '',
                        "birth_date" : users[i].birth_date ? Common.returnDate(users[i].birth_date) : "",
                        "gender" : users[i].gender,
                        "distance" : users[i].distance,
                        "long" : users[i].location.coordinates[0],
                        "lat" : users[i].location.coordinates[1]
                    };
                }
                if(response.length == 0)
                    return Common.response(res,'No record found!', '1');
                else{
                    return Common.response(res,'', '0', response,{"totalPageCount" : Math.ceil(totalCount / dbConfig.recordsPerPage)});
                }
            }).catch(err => {
                return Common.response(res,err.message || "Some error occurred while retrieving users.", '1');
            });
        }else{
            return Common.response(res,'No record found!', '1');
        }
    }).catch(err => {
        return Common.response(res,err.message || "Some error occurred while retrieving users.", '1');
    });
};