const AccessToken = require('../models/accessToken.model.js');
const User = require('../models/user.model.js');
var dateFormat = require('dateformat');
const fileType = require('file-type');
const dbConfig = require('../../config/database.config.js');

//Validate request payload
exports.validatePayloadOld = (req, res, next, required) => {
	var missingFields = [];
	if(required.length > 0){
		for(var i in required){
			if(!req.body.hasOwnProperty(required[i]) || req.body[required[i]].trim() == ""){
				missingFields.push(required[i]);
			}
		}
	}
	if(missingFields.length > 0){
        return this.response(res,'Please pass value for field(s) : '+missingFields.join(', '),'1');
    }else{
    	next();
    }
};

//Validate request payload upgraded
exports.validatePayload = (req, res, next, validationData) => {
	var requestParams = Object.assign(JSON.parse(JSON.stringify(req.body, null, 2)), JSON.parse(JSON.stringify(req.query, null, 2)));
    var missingFields = [];
    if(!this.isEmpty(validationData)){
    	for(var field in validationData){
    		if(typeof validationData[field]=='object'){
    			for(var i in validationData[field]){
    				missingFields = this.validateIndividual(field, validationData[field][i], requestParams, missingFields);
    			}
    		}else{
    			missingFields = this.validateIndividual(field, validationData[field], requestParams, missingFields);
    		}
    	}
    }
    if(missingFields.length > 0){
        return this.response(res,'Please pass proper value(s) for field(s) : '+missingFields.join(', '),'1');
    }else{
    	next();
    }
};

//part of validation(Sub function)
exports.validateIndividual = (field, type, requestParams, missingFields) => {
    var emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    var phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{1,9})$/;
    var urlRegex = /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/;
    var numericRegex = /^\d+\.?\d*$/;
    var integerRegex = /^\d+$/;
    var dateRegex = /^\d{4}-\d{2}-\d{2}$/;


	//Required validation
	if(type == "required" && (!requestParams.hasOwnProperty(field) || requestParams[field].trim() == "")){
		missingFields.push(field);
	//Email validation
	}else if(type == "email" && (requestParams.hasOwnProperty(field) && requestParams[field].trim() != "" && !emailRegex.test(String(requestParams[field]).toLowerCase()))){
		missingFields.push(field);
	//Phone validation
	}else if(type == "phone" && (requestParams.hasOwnProperty(field) && requestParams[field].trim() != "" && !phoneRegex.test(String(requestParams[field]).toLowerCase()))){
		missingFields.push(field);
	//URL validation
	}else if(type == "url" && (requestParams.hasOwnProperty(field) && requestParams[field].trim() != "" && !urlRegex.test(String(requestParams[field]).toLowerCase()))){
		missingFields.push(field);
	//Numeric validation
	}else if(type == "numeric" && (requestParams.hasOwnProperty(field) && requestParams[field].trim() != "" && !numericRegex.test(String(requestParams[field]).toLowerCase()))){
		missingFields.push(field);
	//Integer validation
	}else if(type == "integer" && (requestParams.hasOwnProperty(field) && requestParams[field].trim() != "" && !integerRegex.test(String(requestParams[field]).toLowerCase()))){
		missingFields.push(field);
	//Date validation
	}else if(type == "date" && (requestParams.hasOwnProperty(field) && requestParams[field].trim() != "" && !dateRegex.test(String(requestParams[field]).toLowerCase()))){
		missingFields.push(field);
	//Custom validation
	}else if(["required","email","phone","url","numeric","integer","date"].indexOf(type) <= -1  && (requestParams.hasOwnProperty(field) && requestParams[field].trim() != "" && !(new RegExp(type)).test(String(requestParams[field]).toLowerCase()))){
		missingFields.push(field);
	}
	return missingFields;
};

// Response formatting
exports.response = (res, message="", statusCode="0", data=[], extraParams={}) => {	
	if(Object.keys(data).length > 0){		
		if(Array.isArray(data) === false){
			data = [data];
		}
		data = this.jsonValuesToString(data);
	}
	if(!this.isEmpty(extraParams)){
		extraParams = this.jsonValuesToString(extraParams);
	}
	var reponse = res.send({
		"error" : statusCode,
		"message" : message,
		"data" : data,
		"additionalData" : extraParams
	});	
};

// Generate token
exports.generateToken = (length = 100, chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_@#-") => {
    var result = '';
    for (var i = length; i > 0; --i) {
    	result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
};

// Format date
exports.returnDate = (date = new Date(), format = "yyyy-mm-dd") => {
	return dateFormat(date, format);
};

//Function to check user is active and auth token is valid or not
exports.verifyToken = (req, res, next) => {
	var user_id = req.body.user_id || req.get('user_id') || req.query.user_id;
	if(user_id){
		User.findOne({'_id':user_id})
        .then(userExist => {
    		if(userExist){  
    			if(userExist.status == 1){          
					var accessToken = req.get('Authorization') || req.get('token') || req.get('auth_token') || req.get('auth') || req.get('access_token') || "";
					//validate access token
			        AccessToken.findOne({'userDetails':user_id,'access_token':accessToken})
			        .then(tokenExist => {
			            if(tokenExist) {
			           		next();
			            }else{
							return this.response(res,'Please enter valid AuthToken.', '-2');
			            }            
			        }).catch(err => {
			            return this.response(res,'Something is wrong, please try again later.', '-2');
			        });  
			    }else{
	                return this.response(res,'You are inactive, please contact administrator for more details.','-1');    
	            }    
	        }else{
	            return this.response(res,"User doesn't exist.",'-1');
	        }     
        }).catch(err => {
            return this.response(res,'Something is wrong, please try again later.', '-1');
        });
	}else{
		return this.response(res,"Please pass UserId.",'1');
	}
};

//To convert all the values of response in string
exports.jsonValuesToString = (jsonData) =>{
    for(var i in jsonData){
        if(typeof jsonData[i]=='object' && jsonData[i] !== null){
            jsonData[i] = this.jsonValuesToString(jsonData[i]);
        }else{
            jsonData[i] = (jsonData[i] !== null) ? jsonData[i].toString() : "";
        }
    }
    return jsonData;
};

//Check if json object is empty or not
exports.isEmpty = (obj) => {
    for(var key in obj) {
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
};


/**
 * Middleware for validating file format
 */
exports.validateFormat = (req, res, next) => {
	if(req.file){
	    // For MemoryStorage, validate the format using `req.file.buffer`
	    // For DiskStorage, validate the format using `fs.readFile(req.file.path)` from Node.js File System Module
	    let mime = fileType(req.file.buffer);
		var accepted_extensions = ['jpg', 'png', 'gif'];
	    // if can't be determined or format not accepted
	    if(!mime || !accepted_extensions.includes(mime.ext))
	        return this.response(res,'Only ' + accepted_extensions.join(", ") + ' files are allowed!', '1');
    }
    next();
};

//Email sending functionality
exports.sendMail = (to, from, subject, body) => {
	return info = dbConfig.transporter.sendMail({
		from: from,
		to: to,
		subject: subject,
		text: body,
		html: body
	});     
};

exports.isset = (_var) => {
    if( typeof _var !== 'undefined' ) {
        return true;
    }
    return false;
};

exports.saveInfo = () => {
    console.log(1);
};

//Callback function save user details
exports.saveUserDetails = (req, res, user, hashedPassword, profilePic) => {
    user.password = hashedPassword;
    user.profile_image = profilePic;
    user.save()   
    .then(data => {
        var token = "";
        //Create access token and save in DB
        AccessToken.findOne(
            {
                'userDetails':data._id,
                'device_type':req.body.device_type || 1,
                'device_token':req.body.device_token || ""
            }
        )
        .then(tokenExist => {
            token = this.generateToken();
            if(tokenExist) {
                tokenExist.access_token = token;
                tokenExist.save();
            }else{
                const accessToken = new AccessToken({
                    userDetails: data._id, 
                    access_token: token,
                    device_type: req.body.device_type || 1,
                    device_token: req.body.device_token || "",
                });
                accessToken.save();
            }
            userDetails = JSON.parse(JSON.stringify(data));
            var response = [{
                "_id" : userDetails._id,
                "name" : userDetails.name,
                "email" : userDetails.email,
                "phone_number" : userDetails.phone_number,
                "profile_image" : userDetails.profile_image ? 'http://' + req.headers.host+ '/profile_pic/' + userDetails.profile_image : '',
                "birth_date" : userDetails.birth_date ? this.returnDate(userDetails.birth_date) : "",
                "gender" : userDetails.gender,
                "long" : userDetails.location.coordinates[0],
                "lat" : userDetails.location.coordinates[1],
                "access_token" : token
            }];
            return this.response(res,'You have been registered successfully.', '0', response);
        }).catch(err => {
            return this.response(res,err.message || 'Something is wrong, please try again later.', '1');
        });                                 
    }).catch(err => {
        return this.response(res,err.message || 'Something is wrong, please try again later.', '1');
    });
};

//Callback function to update user details
exports.updateUserDetails = (req, res, user, profilePic) => {
    user.name = req.body.name;
    user.email = req.body.email;
    user.phone_number = this.isset(req.body.phone_number) ? (req.body.phone_number || "") : user.phone_number;
    user.profile_image = profilePic;
    user.birth_date = this.isset(req.body.birth_date) ? (req.body.birth_date || "") : user.birth_date;
    user.gender = this.isset(req.body.gender) ? (req.body.gender || 1) : user.gender;
    //Update user location info
    user.location.type = "Point";
    user.location.coordinates = [
        this.isset(req.body.long) ? (req.body.long || dbConfig.defaultLong) : (user.location.coordinates[0] || dbConfig.defaultLong),
        this.isset(req.body.lat) ? (req.body.lat || dbConfig.defaultLat) : (user.location.coordinates[1] || dbConfig.defaultLat)
    ];
    user.save()
    .then(data => {
        userDetails = JSON.parse(JSON.stringify(data));
        var response = [{
            "_id" : userDetails._id,
            "name" : userDetails.name,
            "email" : userDetails.email,
            "phone_number" : userDetails.phone_number,
            "profile_image" : userDetails.profile_image ? 'http://' + req.headers.host+ '/profile_pic/' + userDetails.profile_image : '',
            "birth_date" : userDetails.birth_date ? this.returnDate(userDetails.birth_date) : "",
            "gender" : userDetails.gender,
            "long" : userDetails.location.coordinates[0],
            "lat" : userDetails.location.coordinates[1]
        }];
        return this.response(res,'Profile has been updated successfully.', '0', response);
    }).catch(err => {
        return this.response(res,err.message || 'Something is wrong, please try again later.', '1');
    });
};