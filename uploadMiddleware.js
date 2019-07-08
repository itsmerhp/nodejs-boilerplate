// uploadMiddleware.js

const multer = require('multer');

const upload = multer({
  limits: {
    fileSize: 25 * 1024 * 1024,
  }
});

module.exports = upload