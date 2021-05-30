//EXPRESS--------------------------
const express = require('express');
const app = express();
//---------------------------------

const bodyParser = require('body-parser');

//SERVER------------------------------------------------------------
const http = require('http');
const server = http.createServer(app);
//------------------------------------------------------------------

//MODELS----------------------------------------------
const mongoConfigs = require('./model/mongooseConfigs');
const User = require('./model/user');
const upload = require('./model/multerConfigs');
const Chat = require('./model/chat').Chat;
const messageSchema = require('./model/chat').Message;
//----------------------------------------------------

//CONTROLLERS-----------------------------------------
const UserController = require('./controller/UserController');
const ChatController = require('./controller/ChatController');
//----------------------------------------------------

//AUTHENTICATION-----------------------------------------
const passport = require('passport');
const session = require('express-session');
const passportOneSessionPerUser = require('passport-one-session-per-user');
//-------------------------------------------------------

//OTHERS---------------------
const url = require('url');
const ejs = require('ejs');
const flash = require('connect-flash'); //Used for the flash messages
//---------------------------

//FILES------------------------------------------
const uniqueFilename = require('unique-filename')
const fs = require('fs');
const path = require('path');
//-----------------------------------------------

//APP.USE's--------------------------------------
app.use(bodyParser.urlencoded({extended:false}));
app.use(express.static("./public"));
app.set('view engine', 'ejs');

const sessionMiddleware = session({
    secret: "supernova",
    resave: false,
    saveUninitialized: false,
    cookie:{
        maxAge: 1296000000, //15 days
        sameSite: 'strict'
    }
})

app.use(sessionMiddleware);
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
//------------------------------------------------

//connects to the database with mongoose
mongoConfigs.connect();

//pull mongoose from mongo_configs
const mongoose = mongoConfigs.mongoose;
mongoose.set('useCreateIndex', true)

//passport uses the Strategy from PassportLocalMongoose that hashes the password
passport.use(User.createStrategy());

//only permit one session per user
//if the user is logged in elsewhere, then the older session is logged out
passport.use(new passportOneSessionPerUser())
app.use(passport.authenticate('passport-one-session-per-user'))

//serializes is User info into a "key"
passport.serializeUser(User.serializeUser());

//deserializes "key" into a user object
passport.deserializeUser(User.deserializeUser());

app.get('/', (req, res) => {
    if(req.isAuthenticated()){

        ChatController.getChatAndInvites(req.user.username, (chats, invites, err) => {
            if(err) {
                console.log(err);

                res.render("index", {user: req.user, chats: [], invites: []});
            } else {
                let nameInvites = invites.map(invite => invite.name);

                let changedChats = chats.map(function(chat){
                    let timeStamp = "";
                    let lastChanged = new Date(chat.lastChanged);

                    if ((new Date().getFullYear() - lastChanged.getFullYear()) > 0) {
                        timeStamp = lastChanged.getDate() + "/" + lastChanged.getMonth() + 1 + "/" + lastChanged.getFullYear();

                    } else if ((new Date().getDate() - lastChanged.getDate()) > 0) {
                        timeStamp = (new Date().getDate() - lastChanged.getDate()) + " days ago";
                    } else {
                        timeStamp = lastChanged.toLocaleTimeString("pt", {
                            hour: '2-digit',
                            minute: '2-digit'
                        })
                    }

                    return {
                        id: chat.id,
                        name: chat.name, //name of the group
                        date: chat.date, //date in which group was created
                        lastChanged: timeStamp,  //date of last message
                        usernames: chat.usernames, //usernames of people belonging to the chat
                        messages: chat.messages
                    }
                });

                res.render("index", {user: req.user, chats: changedChats, invites: nameInvites});
            }
        })

    } else {
        res.render("authentication", {error: req.flash('error'), register: ""});
    }

});

app.get('/logout', function(req, res){

    const socketId = req.session.socketId;
    if(socketId && io.of("/").sockets.get(socketId)) {
        io.of("/").sockets.get(socketId).disconnect(true);
    }

    req.logout();
    res.cookie("connect.sid", "", { expires: new Date() });
    res.redirect('/');
});

app.post("/register", upload.single('image'), capitalizeUsername, function (req, res){

    const imageName = uniqueFilename("./uploads")

    const image = {
        name: imageName,
        originalName: req.file.filename,
        img: {
            data: fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename)),
            contentType: 'image/png'
        }
    }

    User.register({username: req.body.username, image: image, invitesReceived: []}, req.body.password, function(err, user){

        if(err){
            //Use this on the register page
            const msg = "Username already in use";
            res.render("authentication", {error: msg, register: "log-in"});
        } else {
            passport.authenticate("local", {failureRedirect: "/", failureFlash: true})(req, res, function() {

                res.redirect("/");
            });
        }
    });
});

//middleware to turn the username into a capitalized username, meaning that the username is case insensitive
function capitalizeUsername(req, res, next) {
    req.body.username = req.body.username.charAt(0).toUpperCase() + req.body.username.slice(1).toLowerCase();
    next();
}

app.post("/login", capitalizeUsername, passport.authenticate("local", {failureRedirect: "/", failureFlash: true}), (req,res) => {
    setTimeout(() => {
        res.redirect("/");
    }, 1000);

});

const io = require('socket.io')(server);

// convert a connect middleware to a Socket.IO middleware
const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);

io.use(wrap(sessionMiddleware));
io.use(wrap(passport.initialize()));
io.use(wrap(passport.session()));

io.use((socket, next) => {
    if (socket.request.user) {
        next();
    } else {
        next(new Error('unauthorized'))
    }
});

io.on('connect',function(socket){

    //This socket joins a room with the username
    //Basically each user is going to have a room
    socket.join(socket.request.user.username);

    //Saves the socketid in the session sid
    const session = socket.request.session;
    console.log(`saving sid ${socket.id} in session ${session.id}`);
    session.socketId = socket.id;
    session.save();

    //Joins all the usernames in the db into one array and sends it to the autocomplete list in the create chat pop up
    socket.on('request usernames',function(){
        const usernames = [];

        User.find({}, function(err, users){

            users.forEach(function(user){
                usernames.push(user.username);
            });

            const data = {
                usernames: usernames,
                currUser: socket.request.user.username
            }

            io.emit("response usernames", data);
        });

    });

    socket.on('newChat', (usernames, chatName) => {

        let me = socket.request.user.username;

        const date = new Date(); // "day/month/year hour:min:seconds"

        const newChat = new Chat({
            name: chatName || date.toLocaleString("pt"), //the date is the name in the beginning
            date: date, //date in which group was created
            lastChanged: date,
            usernames: [me], //usernames of people belonging to the group
            messages: []
        });

        newChat.save();

        usernames.forEach(username => {
            User.findOne({username: username}, (err, user) => {
                if(err)
                    console.log(err);
                else {
                    user.invitesReceived.push(newChat._id);
                    user.save();
                }
            });

            io.to(username).emit('newInvite', newChat.name);
        });

        socket.emit('appendChat', newChat);

    });

    socket.on("getChat", (chatId) => {

        ChatController.getUserImages(chatId, (chat, err) => {

            if(err) {
                console.log(err);
            } else if (!chat.users.some(user => user.username === socket.request.user.username)){
                let me = socket.request.user.username;

                socket.emit('getChat', me, null, null);
            }
            else {
                //turns [user, user] into {{user1.username : user1.image}, ...} that way we can get the image through the username
                let userImage = {};
                userImage = Object.assign({}, ...chat.users.map((user) => ({[user.username]: {
                        data: user.image.img.data.toString('base64'),
                        contentType: user.image.img.contentType
                    }})));

                let me = socket.request.user.username;

                socket.emit('getChat', me, chat, userImage);

            }
        });

    });

    socket.on("newMessage", (chatId, messageBody, replyId) => {

        Chat.findById(chatId, (err, chat) => {
            if(err) {
                console.log(err);
            } else if(!chat.usernames.some(user => user === socket.request.user.username)){
                let me = socket.request.user.username;

                //If the user that is trying to send a msg doesnt belong to the chat, its gonna show "Dont be a smart ass
                socket.emit('getChat', me, null, null);
            } else {
                const me = socket.request.user.username;

                const message = new messageSchema({
                    sender: me,
                    body: messageBody,
                    date: new Date(),
                    repliedMessage: replyId, //we can find the message with this id by using chat.messages.id(replyId)
                    reactions: []
                });

                chat.lastChanged = message.date;

                chat.messages.push(message);

                //save the message in the database
                chat.save();

                //send the message to everyone
                chat.usernames.forEach(username => {
                    io.to(username).emit('newMessage', message, chatId);
                })
            }
        });
    });

    socket.on("acceptChat", (inviteIndex) => {

        let me = socket.request.user.username;

        UserController.getUser(me, (user , err) => {
            if(err){
                console.log(err);
            } else {

                const chatAccepted = user.invitesReceived[inviteIndex];

                //add username to the chat
                Chat.updateOne(chatAccepted, {$push : {usernames: user.username}})
                    .then((docs => {
                        User.updateOne(user, {$pull : {invitesReceived: chatAccepted._id}})
                            .then((doc) => {
                                socket.emit('appendChat', chatAccepted);
                            })
                            .catch(err => console.log(err));
                    }))
                    .catch(err => console.log(err));

            }
        });
    });

    socket.on('refuseChat', inviteIndex => {
        let me = socket.request.user.username;

        UserController.removeInvite(me,inviteIndex, (err) => {
            if(err)
                console.log(err);
        });

    });

    socket.on("changeChatName", (currentChat, newTitle) => {
        Chat.findByIdAndUpdate(currentChat, {name: newTitle})
            .then()
            .catch(err => console.log(err));
    });

    socket.on("leaveChat", (currentChat, cb) => {
        Chat.findByIdAndUpdate(currentChat, {$pull : {usernames: socket.request.user.username}})
            .then(cb())
            .catch(err => console.log(err));
    })

    //add username to reaction if he isn't there yet || cb(usernames, washethere?)
    socket.on("addReaction",(currentChat, messageId, emoji, cb) => {
        Chat.findById(currentChat)
            .then(chat => {
                let message = chat.messages.id(messageId);
                let indexOfReaction = -1;

                message.reactions.find(function(reaction, index){
                    if(reaction.emoji == emoji){
                        indexOfReaction = index;
                    }
                }); //if indexOfReaction is -1 then the reaction is not in the message yet

                if (indexOfReaction === -1) {
                    if(message.reactions.length < 12){
                        let newEmoji = {
                            emoji: emoji,
                            usernames: [socket.request.user.username]
                        }

                        message.reactions.push(newEmoji);

                        chat.save();
                        cb(newEmoji.usernames, true);

                    } else {
                        cb(null, false, true);
                    }

                } else {    //if this reaction exists in the message, check if this user already reacted with this
                    let emoji = message.reactions[indexOfReaction];
                    let usernameIndex = emoji.usernames.toObject().indexOf(socket.request.user.username);

                    if (usernameIndex === -1) {  //if the user hasn't reacted with this yet
                        emoji.usernames.push(socket.request.user.username);
                        chat.save();

                        cb(emoji.usernames.toObject(), true, false);
                    } else {    //the user has already reacted with this emoji so false is sent, so his reaction is removed

                        emoji.usernames.splice(usernameIndex, 1);

                        if (emoji.usernames.length === 0)
                            message.reactions.splice(indexOfReaction, 1);

                        chat.save();

                        cb(emoji.usernames.toObject(), false, false);
                    }

                }

            })
            .catch(err => console.log(err));

    });
});

server.listen(process.env.PORT || 3000,function(){
    console.log("Express web server listening on port 3000");
});