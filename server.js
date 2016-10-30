
var exp = require('express');
var app = exp();
var bodyParser = require('body-parser'); //for post parameters
var https = require('https');
var http = require('http');
var bcrypt = require('bcryptjs');
var validator = require('validator');
var uuid = require('uuid');
var db = require('./db');
var couchURL = 'http://' + db.user + ':' + db.pass +'@localhost:5984';
var couch = require('nano')(couchURL);
var svr = null;

var production = true;
var port = production ? 443 : 80;

/*
Lets encrypt configuration:
*/
if(production){
    var lex = require('letsencrypt-express').create({
	server: 'https://acme-v01.api.letsencrypt.org/directory',
	challenges: { 'http-01': require('le-challenge-fs').create({ webrootPath: '/tmp/acme-challenges' }) },
	store: require('le-store-certbot').create({ webrootPath: '/tmp/acme-challenges' }),
	email: 'copyeverythingapp@gmail.com',
	agreeTos: true,
	approveDomains: ['copyeverythingapp.com', 'www.copyeverythingapp.com'],
    });

    http.createServer(lex.middleware(require('redirect-https')())).listen(80);

    svr = https.createServer(lex.httpsOptions, lex.middleware(app));

}else{
    svr = http.createServer(app);
}

app.use(exp.static('static'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

couch.auth(db.user, db.pass, function(err, body, headers){
    if (err){
	console.log(err);
	return;
    }

    couch.config.url = 'http://localhost:5984';
    couch.config.cookie = headers['set-cookie'];
    doneDbConnect();
});

function createDatabase(name, password, callback){
    // Create Database
    couch.db.create(name, function(err, body) {
	if(err){
	    return callback(err, body);
	}else{
	    // Create User linked to DB
	    couch.request({
		path: '_users/org.couchdb.user:' + name,
		method: 'PUT',
		body: {name: name, password: password, roles: ['normal'], type: 'user'}
	    }, function(err, body){
		if(err){
		    return callback(err, body); 
		}else{
		     couch.request({
			 path: name + '/_security',
			 method: 'PUT',
			 body: {admins: { names: [], roles: [] }, members: { names: [name], roles: [] } }
		     }, function(err, body){
			 return callback(err, body);
		     });
		}
	    });
	    
	}
    });
}

function registerPostHandler(req, res) {
    //register new user:
    var obj = req.body;
    var email = obj.email ? obj.email : '';
    var pass1 = obj.pass1 ? obj.pass1 : '';
    var pass2 = obj.pass2 ? obj.pass2 : '';

    registerUser(email, pass1, pass2, function(ret) {
        res.send(JSON.stringify(ret));
    });
}

function loginPostHandler(req, res) {
    var obj = req.body;
    var email = obj.email ? obj.email : '';
    var pass = obj.pass ? obj.pass : '';

    authenticateUser(email, pass, function(ret, userid){
	res.send(JSON.stringify(ret));
    });
}

function doneDbConnect() {
    app.get('/*', function(req, res, next) { // redirect www to non-www (SO 7013098)
  	if (req.headers.host.match(/^www/) !== null ) {
    	    res.redirect('https://' + req.headers.host.replace(/^www\./, '') + req.url);
  	} else {
    	    next();
  	}
    });
    app.get('/dummyclient', function(req, res){
	//test client:
	res.sendFile(__dirname + '/dummyclient.html');
    });
    app.get('/', function(req, res){
	//index:
	res.sendFile(__dirname + '/index.html');
    });

    app.post('/register', registerPostHandler);
    app.post('/login',    loginPostHandler);
    
    svr.listen(port, function(){
	console.log('listening on *:' + port);
    });
}

function createJsonResponse(success, message, dbname, dbpass) {
    return {
	success: success,
	message: message,
	dbname: dbname,
	dbpass: dbpass,
    }
}

function authenticateUser(email, password, cb) {
    var db = couch.use("copyeverything");

    if(!email || !password){
	return process.nextTick(cb.bind(undefined, createJsonResponse(false, "Provide an email and password.")));
    }
    
    db.get(email, function(err, body) {
	if (err){
	    return process.nextTick(cb.bind(undefined, createJsonResponse(false, "Cannot find user.")));
	}
	
	//check hash
	bcrypt.compare(password, body.hash, function(err, res) {
	    if(res) {
		process.nextTick(cb.bind(undefined, createJsonResponse(true, "Authentication successful.", body.dbname, body.dbpass)));
	    } else {
		process.nextTick(cb.bind(undefined, createJsonResponse(false, "Login Failed")));
	    }
	});
    });
}

function registerUser(email, pass1, pass2, cb) {
    if(!validator.isEmail(email))
	return process.nextTick(cb.bind(undefined, createJsonResponse(false, "Email is not properly formatted.")));
    if(pass1 != pass2)
	return process.nextTick(cb.bind(undefined, createJsonResponse(false, "Passwords do not match.")));
    if(pass1.length < 8)
	return process.nextTick(cb.bind(undefined, createJsonResponse(false, "Password must be at least 8 characters.")));

    var db = couch.use("copyeverything");
    
    db.head(email, function(err, _, headers) {
	if (err && err.statusCode == 404){
	    var dbname = "user_" + uuid.v1();
	    var registercode = uuid.v1();
	    var dbpass = Math.random().toString(36).slice(-20);

	    bcrypt.hash(pass1, 8, function(err, hash) {
		db.insert({_id: email, email: email, hash: hash, dbname: dbname, dbpass: dbpass,
			   registercode: registercode, verified: false, creationdate: JSON.stringify(new Date()) }, email,
			  function(err, body) {
			      if(err){
				  return process.nextTick(cb.bind(undefined, createJsonResponse(false, "Backend Error")));
			      }else{

				  createDatabase(dbname, dbpass, function(err, body){
				      if(err){
					  return process.nextTick(cb.bind(undefined, createJsonResponse(false, "Backend Error")));
				      }else{
					  db.insert({_id: email, email: email, hash: hash, dbname: dbname, dbpass: dbpass,
						     registercode: registercode, verified: false, creationdate: JSON.stringify(new Date()) }, email,
						    function(err, body) {
							if(err){
							    return process.nextTick(cb.bind(undefined, createJsonResponse(false, "Backend Error")));
							}else{
							    return process.nextTick(cb.bind(undefined, createJsonResponse(true, "Registered successfully with email: " + email, dbname, dbpass)));}
						    });
				      }})
				      }
				  });
			      }
			  });
	    });
	}else{
	    return process.nextTick(cb.bind(undefined, createJsonResponse(false, "Email already registered")));
	}
    });
}

