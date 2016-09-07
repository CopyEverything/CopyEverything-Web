var db = require('./db');
var couchURL = 'http://' + db.user + ':' + db.pass +'@localhost:5984';
var couch = require('nano')(couchURL);

couch.auth(db.user, db.pass, function (err, body, headers) {
    if (err){
	console.log("Got error", err);
	return;
    }
    couch.config.url = 'http://localhost:5984';
    couch.config.cookie = headers['set-cookie'];
    
    couch.db.create("copyeverything",
		        function(err, body){
			    if(err){
				    console.log("Error creating db", err);
				}else{
				        console.log("Created db");
				        
				        couch.request({
					    path: 'copyeverything/_security',
					    method: 'PUT',
					    body: {admins: { names: [], roles: [] }, members: { names: ["admins"], roles: [] } }
					        }, function(err, body){
						    if(err){
							    console.log("Failed to add security", err);
							}else{
							        console.log("Added security measures");
							    }
						        });
				        
				    }
			        });
});
