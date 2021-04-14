var express = require('express');
var bodyParser = require('body-parser');
var mongoConfigs = require('./model/mongoConfigs');
var url = require('url');
var ejs = require('ejs');

var urlencodedParser = bodyParser.urlencoded({extended:false});
var app = express();

app.use(urlencodedParser);
app.set('view engine', 'ejs');

mongoConfigs.connect(function(err){
    if(!err){
        app.listen(3000,function(){
            console.log("Express web server listening on port 3000");
        });
    }
});