//modules

//EXPRESS--------------------------
const express = require('express');
const app = express();
//---------------------------------

const bodyParser = require('body-parser');

//SERVER------------------------------------------------------------
const http = require('http');
const server =http.createServer(app);
//------------------------------------------------------------------

//MODELS----------------------------------------------
const mongoConfigs = require('./model/mongoConfigs');
const User = require('./model/user');
const upload = require('./model/multerConfigs');
const Chat = require('./model/chat');
//----------------------------------------------------

//AUTHENTICATION
const passport = require('passport');
const session = require('express-session');
//

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
    saveUninitialized: false
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

//serializes is User info into a "key"
passport.serializeUser(User.serializeUser());

//deserializes "key" into a user object
passport.deserializeUser(User.deserializeUser());

app.get('/', (req, res) => {
    if(req.isAuthenticated()){

        //finds all chats that the users array include the req.user.username
        Chat.find({ users : req.user.username }, (err, docs) => {
            if(err) {
                console.log(err);
                res.render("index", {user: req.user, chats: []});
            } else {
                res.render("index", {user: req.user, chats: docs});
            }
        });

    } else {
        res.render("login", {error : ""});
    }

});

app.get("/login", function (req, res){
    if(req.isAuthenticated()){
        res.render("index");
    } else {
        res.render("login", {error: req.flash('error')});
    }
});

app.get("/register", function (req, res){
    if(req.isAuthenticated()){
        res.redirect("/");
    } else {
        res.render('register', {error: ""});
    }
});

app.get('/logout', function(req, res){

    const socketId = req.session.socketId;
    if(socketId && io.of("/").sockets.get(socketId)) {
        io.of("/").sockets.get(socketId).disconnect(true);
    }

    req.logout();
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

    User.register({username: req.body.username, image: image}, req.body.password, function(err, user){

        if(err){
            //Use this on the register page
            const msg = "Username already in use";
            res.render("register", {error: msg});
        } else {
            passport.authenticate("local", {failureRedirect: "/register", failureFlash: true})(req, res, function() {
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

app.post("/login", capitalizeUsername, passport.authenticate("local", {failureRedirect: "/login", failureFlash: true}), (req,res) => {
    res.redirect("/");
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

io.on('connect',function(socket,req, res){

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

    socket.on('newChat', (usernames) => {

        //The array doesn't have the username of the user that creates the chat
        usernames.push(socket.request.user.username);

        const date = new Date(); // "day/month/year hour:min:seconds"

        const newChat = new Chat({
            name: date.toLocaleString("pt"), //the date is the name in the beggining
            date: date, //date in which group was created
            users: usernames, //usernames of people belonging to the group
            messages: []
        });

        newChat.save();

        usernames.forEach(username => {
            io.to(username).emit('appendChat', newChat);
        });

    });

});

server.listen(process.env.PORT || 3000,function(){
    console.log("Express web server listening on port 3000");
});