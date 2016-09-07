var couchURL = 'http://localhost:5984';
var couch = require('nano')(couchURL);
var db = require('./db');

couch.auth(db.user, db.pass, function (err, body, headers) {
    if (err){
	console.log("Got error", err);
	return;
    }
    couch.config.url = couchURL;
    couch.config.cookie = headers['set-cookie'];

    
    couch.db.create("copyeverything",
		    function(err, body){
			if(err){
			    console.log("Error creating db", err);
			}else{
			    console.log("Created db");
			}
		    });
});


