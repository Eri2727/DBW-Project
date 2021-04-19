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

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

mongoConfigs.connect();

//pull mongoose from mongo_configs
const mongoose = mongoConfigs.mongoose;

const imageSchema = new mongoose.Schema({
    name: String,
    originalName: String,
    img:
        {
            data: Buffer,
            contentType: String
        }
});

const Image = new mongoose.model("Image", imageSchema);

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    imageName: String
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//Testing
app.get('/', (req, res) => {
    res.redirect("/index");
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

app.get("/index", function(req, res){
    if(req.isAuthenticated()){
        res.render("index");
    } else {
        res.render("login");
    }
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

    Image.create(image, (err, item) => {
        if (err) {
            console.log(err);
        }
    });

    User.register({username: req.body.username, imageName: imageName}, req.body.password, function(err, user){
        if(err){
            console.log(err);
            res.redirect("/register");
        } else {
            User.updateOne({_id: user._id}, {imageName: imageName});
            passport.authenticate("local")(req,res, function(){
                res.redirect("/index");
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
            passport.authenticate("local")(req,res, function(){
                res.redirect("secrets");
            });
            res.redirect("/login");
        }
    });

});

app.listen(process.env.PORT || 3000,function(){
    console.log("Express web server listening on port 3000");
});