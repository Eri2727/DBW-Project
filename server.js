//modules
const express = require('express');
const bodyParser = require('body-parser');
const mongoConfigs = require('./model/mongoConfigs');
const url = require('url');
const ejs = require('ejs');
const multer = require('multer');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const cookieParser = require('cookie-parser');
const uniqueFilename = require('unique-filename')
const fs = require('fs');
const path = require('path');

//Multer setup for storing uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now())
    }
});

const upload = multer({ storage: storage });

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

const imageSchema = new mongoose.Schema({
    name: String,
    originalName: String,
    img:
        {
            data: Buffer,
            contentType: String
        }
});

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    image: imageSchema
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(User, done) {
    done(null, User);
});

passport.deserializeUser(function(User, done) {
    done(null, User);
});


app.get('/', (req, res) => {
    if(req.isAuthenticated()){
        res.render("index");
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
    console.log(req.body)
    // Image.create(image, (err, item) => {

    //     if (err) {
    //         console.log(err);
    //     }
    // });

    User.register({username: req.body.username, image: image}, req.body.password, function(err, user){
        if(err){
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local", {
                failureFlash: 'Invalid username or password.' }) (req,res, function(){
                res.redirect("/");
            });
        }
    });

});


app.post("/login", function (req, res){

    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err){
        if(err) {
            console.log(err);
        } else {
            passport.authenticate("local", {
                successRedirect: '/',
                failureRedirect: '/register'
            }) (req,res, function(){
                //res.render("index");
            });
        }
    });

});

app.listen(process.env.PORT || 3000,function(){
    console.log("Express web server listening on port 3000");
});