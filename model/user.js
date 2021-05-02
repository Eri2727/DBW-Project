const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const imageSchema = new mongoose.Schema({
    name: String,
    originalName: String,
    img:
        {
            data: Buffer,
            contentType: String
        }
});

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true
    },
    password: String,
    image: imageSchema
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

module.exports = User;