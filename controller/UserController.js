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

exports.removeInvite = (username, index, cb) => {
    User.findOne({username: username})
        .then(user => {
            user.invitesReceived.splice(index,1);
            user.save();
            cb();
        })
        .catch(err => cb(err));
}

exports.getUsernames = (cb) => {
    User.find({})
        .then(users =>{

            let usernames = users.map(user => user.username);

            cb(usernames);
        })
        .catch(err => cb(null,err));
}
