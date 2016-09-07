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

var production = false;
var port = production ? 443 : 80;

/*
Lets encrypt configuration:
*/
if(production){
    var LEX = require('letsencrypt-express');
    var lex = LEX.create({
	configDir: require('os').homedir() + '/letsencrypt/etc'
	, approveRegistration: function (hostname, cb) { // leave `null` to disable automatic registration
	    // Note: this is the place to check your database to get the user associated with this domain
	    cb(null, {
		domains: ['copyeverything.tk', 'www.copyeverything.tk',
			  'copyeverythingapp.com', 'www.copyeverythingapp.com']
		, email: 'copyeverythingapp@gmail.com'
		, agreeTos: true
	    });
	}
    });
    // Redirect from http port 80 to https
    http.createServer(function (req, res) {
	res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
	res.end();
    }).listen(80);
    svr = https.createServer(lex.httpsOptions,
			     LEX.createAcmeResponder(lex, app));
}else{
    svr = http.createServer(app);
}

app.use(exp.static('static'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

var io = require('socket.io')(svr, {secure: true});

couch.auth(db.user, db.pass, function(err, body, headers){
    if (err){
	console.log(err);
	return;
    }

    couch.config.url = 'http://localhost:5984';
    couch.config.cookie = headers['set-cookie'];
    doneDbConnect();
});

/*
Useful documentation:

this is how we seperate users and implement authentication:
http://socket.io/docs/rooms-and-namespaces/
*/


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

    io.on('connection', function(socket){
	console.log('a user connected');
	socket.userid = null;
	
	socket.on('disconnect', function(){
	    console.log('user disconnected');
	    socket.userid = null;
	});
	
	socket.on('auth', function(data){
	    if(Object.keys(socket.rooms).length >=2) {//cant be logged in to more than one account
		io.to(socket.id).emit('auth resp', [true, "already logged in"]);
		return;
	    }
	    
	    //auth
	    authenticateUser(data.username, data.password, function(res, userid) {
		if(res[0]) {
		    //authenticated successfully
		    socket.join(userid, function() { //join Room named as the user's unique id
			socket.userid = userid;
		    });
		}
		
		//respond to the client with the result of the authentication
		io.to(socket.id).emit('auth resp', res);
	    });
	});
		
	//receive 'new client copy' message when the user copies something
	socket.on('new client copy', function(msg){
	    if(socket.userid) {
		db.table('copies').insert({userid:socket.userid, timestamp:r.now(), content:msg}).
		    run(dbcon, function(err, result) {
			if (err) throw err;
		    });
		
		//send new copy to all clients in the user's Room (except the sender)
		socket.broadcast.to(socket.userid).emit('new server copy', msg); 
	    }
	});
    });
}

function createJsonResponse(success, message, dbname = undefined, dbpass = undefined) {
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
	    var dbpass = Math.random().toString(36).slice(-20);

	    bcrypt.hash(pass1, 8, function(err, hash) {
		db.insert({_id: email, email: email, hash: hash, dbname: dbname, dbpass: dbpass, creation_date: JSON.stringify(new Date())}, email,
			  function(err, body) {
			      if(err){
				  return process.nextTick(cb.bind(undefined, createJsonResponse(false, "Backend Error")));
			      }else{

				  createDatabase(dbname, dbpass, function(err, body){
				      if(err){
					  return process.nextTick(cb.bind(undefined, createJsonResponse(false, "Backend Error")));
				      }else{
					  return process.nextTick(cb.bind(undefined, createJsonResponse(true, "Registered successfully with email: " + email, dbname, dbpass)));
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

