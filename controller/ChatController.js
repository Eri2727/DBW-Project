const User = require('../model/user');
const Chat = require('../model/chat').Chat;
const UserController = require('./UserController');

exports.getUserImages = (chatId, cb) =>
    Chat.findById(chatId)
        .populate('users')
        .exec()
        .then(chat => cb(chat))
        .catch(err => cb(null, err));

exports.getChatAndInvites = (username, cb) => {
    UserController.getInvites(username, (invites, err) => {
        if(err){
            console.log(err)
            cb(null, null, err);
        } else {
            Chat.find({usernames: username})
                .then(chats => cb(chats, invites))
                .catch(err => cb(null, null, err))
        }
    });
}