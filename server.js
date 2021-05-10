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
const upload = require('./model/multerConfigs')
//----------------------------------------------------

//AUTHENTICATION
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const session = require('express-session');
const cookieParser = require('cookie-parser'); //Not sure if this one is being used or not
//

//OTHERS---------------------
const url = require('url');
const ejs = require('ejs');
const flash = require('connect-flash');
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

//passport uses the standart strategy
passport.use(User.createStrategy());

//serializes is User info into a "key"
passport.serializeUser(User.serializeUser());

//deserializes "key" into a user object
passport.deserializeUser(User.deserializeUser());

app.get('/', (req, res) => {
    if(req.isAuthenticated()){
        res.render("index", {image: req.user.image});
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
    req.logout();
    res.redirect('/');
});

app.post("/register", upload.single('image'), function (req, res){

    const imageName = uniqueFilename("./uploads")

    const image = {
        name: imageName,
        originalName: req.file.filename,
        img: {
            data: fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename)),
            contentType: 'image/png'
        }
    }

    const capitalizedUsername = req.body.username.charAt(0).toUpperCase() + req.body.username.slice(1).toLowerCase();

    User.register({username: capitalizedUsername, image: image}, req.body.password, function(err, user){

        if(err){
            //Use this on the register page
            const msg = "Username already in use";
            res.render("register", {error: msg});
        } else {
            passport.authenticate("local")(req,res, function(){
                res.redirect("/");
            });
        }
    });
});

app.post("/login",passport.authenticate("local", {failureRedirect: "/login", failureFlash: true}), (req,res) => {
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

io.on('connection',function(socket){
    console.log("connection on");

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

    })
});

server.listen(process.env.PORT || 3000,function(){
    console.log("Express web server listening on port 3000");
});