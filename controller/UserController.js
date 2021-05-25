const Chat = require('../model/chat').Chat;

exports.getUserImages = (chatId, cb) =>
    Chat.findById(chatId)
    .populate('users')
    .exec()
    .then(chat => cb(chat))
    .catch(err => cb(null, err));
