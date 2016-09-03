var exp = require('express');
var app = exp();
var bodyParser = require('body-parser'); //for post parameters
var https = require('https');
var http = require('http');
var bcrypt = require('bcryptjs');
var validator = require('validator');
var r = require('rethinkdb');
var dbcon = null;
var db = null;


/*
Lets encrypt configuration:
*/

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
var svr = https.createServer(lex.httpsOptions,
			     LEX.createAcmeResponder(lex, app));

var io = require('socket.io')(svr, {secure: true});

/*
Useful documentation:

this is how we seperate users and implement authentication:
http://socket.io/docs/rooms-and-namespaces/


*/

r.connect( {host: 'localhost', port: 28015}, function(err, conn) {
    if (err) throw err;
    dbcon = conn;
    db = r.db('copyeverything');
	
    /*
    //only need this the first time, but eh, less config if we leave it
    r.dbCreate('copyeverything').run(dbcon, function(err, result) {
    if(err) throw err;
    });
    db.tableCreate("copies");
    db.tableCreate("users");*/
	
    doneDbConnect();
});

function registerPostHandler(req, res) {
    //register new user:                                                                                    
    var email = req.body.email;
    var pass = req.body.pass;

    registerUser(email, pass, function(ret) {
        res.send(JSON.stringify(ret));
    });
}

function doneDbConnect() {
	app.use(exp.static('static'));
	app.use(bodyParser.urlencoded({extended: true}));
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
	
	svr.listen(443, function(){
	    console.log('listening on *:443');
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
			authenticateUser(data, function(res, userid) {
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

function authenticateUser(data, callback) {
	db.table('users').filter(r.row('username').eq(data.username)).
		run(dbcon, function(err, cursor) {
			if (err) throw err;
			
			//get hash from db query result
			cursor.toArray(function(err, result) {
				if (err) throw err;
				
				if(!result[0]) //cant find user
					process.nextTick(callback.bind(undefined, [false, "Cannot find user."]));
				else {
					//check hash
					bcrypt.compare(data.password, result[0].passhash, function(err, res) {
						if(res) {
							process.nextTick(callback.bind(undefined, [res, "Authentication successful."], result[0].id));
						} else {
							process.nextTick(callback.bind(undefined, [res, "Wrong password for the user."], result[0].id));
						}
					});
				}
			});
		});
}

function registerUser(email, pass, cb) {
	if(!validator.isEmail(email)) 
		return process.nextTick(cb.bind(undefined, [false, "Email is not properly formatted."]));
	if(pass.length < 8)
		return process.nextTick(cb.bind(undefined, [false, "Password must be at least 8 characters."]));

	db.table('users').filter(r.row('username').eq(email)).count().run(dbcon, function(err, res) {
		if(err) throw err;
		if(parseInt(res) != 0)
			return process.nextTick(cb.bind(undefined, [false, "Email already registered."]));
		
		bcrypt.hash(pass, 8, function(err, hash) {
			db.table('users').insert({username:email,passhash:hash}).run(dbcon, function(err, result) {
				if (err) throw err;
				return process.nextTick(cb.bind(undefined, [true, "Registered successfully with email: "+email]));
			})
		});
	});
}

