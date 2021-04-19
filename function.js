const Q = require('q');
const mongoConfigs = require('./model/mongoConfigs');
const crypto = require('crypto');

const getHashedPassword = function(password) {
    const sha256 = crypto.createHash('sha256');
    const hash = sha256.update(password).digest('base64');
    return hash;
}

mongoConfigs.connect(function(err){
    if(!err){
        db = mongoConfigs.getDB();
    }
});

exports.localRegistration = function (username, password) {
    debugger;
    let collection = db.collection('users');
    let deferred = Q.defer();
    // console.log(image);

    collection.findOne({'username': username})
        .then(function (result) {
            if (result != null) {
                console.log('EXISTE CABRON');
                deferred.resolve(false);
            } else {
                console.log('CREATING USER');

                let newUser = {
                    'username': username,
                    // This is the SHA256 hash for value of `password`
                    'password': getHashedPassword(password),

                    // image: image.file,
                };


                collection.insertOne(newUser)
                    .then(function () {
                        deferred.resolve(newUser);
                    });
            }
        });
    return deferred.promise;
};

/*
exports.localAuth = function (request) {
    let deferred = Q.defer();

    let collection = db.collection('users');

    collection.findOne({'username' : request.username})
        .then(function (result) {
            if (result == null) {
                console.log("USERNAME NOT FOUND:", request.username);
                deferred.resolve(false);
            } else {
                console.log("FOUND USER: " + result.username);

                if (crypto.compare(request.password, result.password)) {
                    deferred.resolve(result);
                } else {
                    console.log("AUTHENTICATION FAILED");
                    deferred.resolve(false);
                }
            }

            db.close();
        });

    return deferred.promise;
}*/
