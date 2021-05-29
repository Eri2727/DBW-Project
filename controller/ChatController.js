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
    UserController.getUser(username, (user, err) => {
        if(err){
            console.log(err)
            cb(null, null, err);
        } else {
            Chat.find({usernames: username})
                .sort({lastChanged: "desc"}) //sorts the chats and sorts them by the ascended lastChanged
                .then(chats => cb(chats, user.invitesReceived))
                .catch(err => cb(null, null, err))
        }
    });
}