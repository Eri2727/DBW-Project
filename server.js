//modules
const express = require('express');
const bodyParser = require('body-parser');
const mongoConfigs = require('./model/mongoConfigs');
const url = require('url');
const ejs = require('ejs');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy  = require('passport-local').Strategy;
const cookieParser = require('cookie-parser');
const uniqueFilename = require('unique-filename')
const fs = require('fs');
const path = require('path');
const User = require('./model/user')
const Chats = require('./model/chat')

const upload = require('./model/multerConfigs')

//----------------------------------------------------

const app = express();

app.use(bodyParser.urlencoded({extended:false}));
app.use(express.static("./public"));
app.set('view engine', 'ejs');

app.use(session({
    secret: "supernova",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoConfigs.connect();

//pull mongoose from mongo_configs
const mongoose = mongoConfigs.mongoose;
mongoose.set('useCreateIndex', true)

passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get('/', (req, res) => {
    if(req.isAuthenticated()){
        res.render("index", {
            chats: Chats.find({users: User._id})
        });
    } else {
        res.render("login");
    }

});

app.get("/login", function (req, res){
    if(req.isAuthenticated()){
        res.render("index");
    } else {
        res.render("login");
    }
});

app.get("/register", function (req, res){
    if(req.isAuthenticated()){
        res.render("index");
    } else {
        res.render('register');
    }
});

app.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
});

app.get('/chat/new', function (req, res) {

    if(req.isAuthenticated()){
        User.find({username: {$ne: req.user.username}}, function (err, data) {
            res.render("chat/new", {
                user: req.user,
                users: data
            });
        });
    } else {
        res.redirect('/login');
    }
});

app.post('/chat', function (req, res) {
    //todo: create chat once the form has been submitted
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

    User.register({username: req.body.username, image: image}, req.body.password, function(err, user){
        if(err){
            console.log(err.toString());// This way only A user with the given username is already registered appears
            res.redirect("/register");
        } else {
            passport.authenticate('local',{
                successRedirect: "/",
                failureRedirect: "/register"
            })(req, res);
        }
    });

});

app.post("/login", passport.authenticate('local', {
    successRedirect: "/",
    failureRedirect: "/login"
}));

app.listen(process.env.PORT || 3000,function(){
    console.log("Express web server listening on port 3000");
});