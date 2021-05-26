const User = require('../model/user');
const Chat = require('../model/chat').Chat;

exports.getUser = (username, cb) => {
    User.findOne({username: username})
        .populate({path: "invitesReceived", model: Chat})
        .lean()
        .exec()
        .then(user => cb(user))
        .catch(err => cb(null,err));
}
