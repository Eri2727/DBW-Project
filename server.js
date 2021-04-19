const express = require('express');
const bodyParser = require('body-parser');
const mongoConfigs = require('./model/mongoConfigs');
const url = require('url');
const ejs = require('ejs');
const crypto = require('crypto');
const multer = require('multer');
const upload = multer({dest: 'uploads/'});
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const cookieParser = require('cookie-parser');
const urlencodedParser = bodyParser.urlencoded({extended:false});
const app = express();
const title = 'Messenger';
const funct = require('./function.js');

var db;

app.use(urlencodedParser);
app.use(express.static("./public"));
app.set('view engine', 'ejs');
app.use(cookieParser());
app.use(express.session({ secret: 'supernova' }));
app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Session-persisted message middleware
app.use(function(req, res, next){
    var err = req.session.error,
        msg = req.session.notice,
        success = req.session.success;

    delete req.session.error;
    delete req.session.success;
    delete req.session.notice;

    if (err) res.locals.error = err;
    if (msg) res.locals.notice = msg;
    if (success) res.locals.success = success;

    next();
});

mongoConfigs.connect(function(err){
    if(!err){
        db = mongoConfigs.getDB();
    }
});

app.get("/", function (req, res){
    res.render('index');
});

app.get("/login", function (req, res){
    res.render('login');
});

app.post("/login", passport.authenticate('local-signin', {
    successRedirect: '/',
    failureRedirect: '/login',
}));

app.get("/register", function(req, res){
   res.render('register');
});

app.post("/register", upload.single('image'), passport.authenticate('local-signup', {
    successRedirect: '/',
    failureRedirect: '/register',
}));//upload.single('image'),


/*app.post("/register", upload.single('image'), function(req, res){ //'local-signup'

    const newUser = {
        username: req.body.username,
        // This is the SHA256 hash for value of `password`
        password: getHashedPassword(req.body.password),

        image: req.file,
    }

    const usersCollection = db.collection('users');

    usersCollection.findOne({username: newUser.username})
        .then(function (result) {
            if (result != null) {
                console.log('EXISTE CABRON');
                deferred
            }
        });

    usersCollection.insertOne(newUser);
    //todo: check if the user is already registered

    res.render('index', {
        title: title
    });

});*/

// Passport session setup.
passport.serializeUser(function(user, done) {
    console.log("serializing " + user.username);
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    console.log("deserializing " + obj);
    done(null, obj);
});

passport.use('local-signup', new LocalStrategy(
        {passReqToCallback : true},
        function (req, username, password, done) {
            funct.localRegistration(username, password, done)
                .then(function (user) {
                    if (user) {
                        console.log("REGISTERED: " + user.username);
                        req.session.success = 'You are successfully registered and logged in ' + user.username + '!';
                        done(null, user);
                    }
                    if (!user) {
                        console.log("COULD NOT REGISTER");
                        req.session.error = 'That username is already in use, please try a different one.'; //inform user could not log them in
                        done(null, user);
                    }
                })
                .fail(function (err){
                    console.log(err + '????');
                });
        }
    )
);

app.listen(process.env.PORT || 3000,function(){
    console.log("Express web server listening on port 3000");
});