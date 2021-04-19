const mongo = require('mongodb');
var MongoClient = mongo.MongoClient;
var db;

module.exports = {
    connect: function (callback) {
        //Insert the connection string which was shared with you in moodle
        MongoClient.connect('mongodb://localhost:27017/?readPreference=primary&appname=MongoDB%20Compass%20Community&ssl=false',
            { useNewUrlParser: true, useUnifiedTopology: true },function (err, database) {
            console.log('Connected the database on port 27017');
            db = database.db('G21');
            callback(err);
        })},
    getDB:function(){
        return db;
        }
}