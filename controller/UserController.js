const User = require('../model/user');
const Chat = require('../model/chat').Chat;

exports.getInvites = (username, cb) => {
    User.findOne({username: username})
        .populate({path: "invitesReceived", model: Chat})
        .lean()
        .exec()
        .then(user => cb(user.invitesReceived))
        .catch(err => cb(null,err));
}
