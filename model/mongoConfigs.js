const mongoose = require('mongoose');
require('dotenv').config()

module.exports = {
    connect: function (callback) {
        //Insert the connection string which was shared with you in moodle
        mongoose.connect(process.env.MONGODB_URL, {useNewUrlParser: true, useUnifiedTopology: true});
        },
    mongoose
}