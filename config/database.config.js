const nodemailer = require("nodemailer");
// create express app
module.exports = {
    url: 'mongodb://localhost:27017/easy-notes',
    recordsPerPage : 2,
    transporter : nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 25,
        secure: false, // true for 465, false for other ports
        auth: {
          user: 'tatva185@gmail.com', // generated ethereal user
          pass: 'Tatva@1234' // generated ethereal password
        }
  	}),
  	adminName : 'Rahul',
  	adminEmail : 'tatva185@gmail.com',
    defaultLat : 23.022505,
    defaultLong : 72.571365
}