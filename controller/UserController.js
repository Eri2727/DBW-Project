const User = require('../model/user');
const Chat = require('../model/chat').Chat;


exports.getUserImages = (chatId, cb) =>
    Chat.findById(chatId)
        .then(chat => {
            User.find()
            .where('username').in(chat.users)
            .exec()
            .then(users => cb(users, chat))
            .catch(err => cb(null, null, err));
        })
        .catch(err => cb(null, null, err));

