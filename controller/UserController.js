const User = require('../model/user');
const Chat = require('../model/chat').Chat;


exports.getUserImages = (chatId, cb) => Chat.findById(chatId, (err, chat) => {

    if(err){
        console.log(err);
    } else {

        User.find()
            .where('username').in(chat.users)
            .exec()
            .then(users => cb(users, chat))
            .catch(err => cb(null, null, err));

    }
});