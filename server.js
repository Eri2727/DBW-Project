const express = require('express');
const bodyParser = require('body-parser');
const mongoConfigs = require('./model/mongoConfigs');
const url = require('url');
const ejs = require('ejs');
const crypto = require('crypto');

const urlencodedParser = bodyParser.urlencoded({extended:false});
const app = express();

var db;

app.use(urlencodedParser);
app.use(express.static("./public"));
app.set('view engine', 'ejs');

mongoConfigs.connect(function(err){
    if(!err){
        db = mongoConfigs.getDB();
        app.listen(process.env.PORT || 3000,function(){
            console.log("Express web server listening on port 3000");
        });
    }
});

const getHashedPassword = function(password) {
    const sha256 = crypto.createHash('sha256');
    const hash = sha256.update(password).digest('base64');
    return hash;
}

app.get("/", function (req, res){
    res.render('login');
});

app.get("/register", function(req, res){
   res.render('register');
});

app.post("/register", function(req, res){

    const newUser = {
        username: req.body.username,
        // This is the SHA256 hash for value of `password`
        password: getHashedPassword(req.body.password)
    }

    const usersCollection = db.collection('users');

    console.log(usersCollection.find({username : newUser.username})); // promise <pending>

    // usersCollection.insertOne(newUser);

});

