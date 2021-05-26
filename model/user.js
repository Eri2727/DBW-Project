const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');
const Chat = require('./chat');

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
    image: imageSchema,
    invitesReceived: [{ //reference to chats that the user has an invite to
        type: Schema.Types.ObjectId,
        ref: "Chat"
    }]
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

module.exports = User;