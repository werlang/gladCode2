const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const mysql = require('mysql');
const crypto = require('crypto');
const request = require('request');
const expsession = require('express-session');
const MySQLStore = require('express-mysql-session')(expsession);
const cors = require('cors');
const bodyParser = require('body-parser')


//var exec = require('child_process');

//mysql
var mysql_options = {
	host     : 'localhost',
	port     : 3306,
	user     : 'gladcode',
	password : 's0r3tmhr',
	database : 'gladcode_'
};
var connection = mysql.createConnection(mysql_options);
var sessionStore = new MySQLStore({}, connection);
connection.connect(function(err){
	if(err) return console.log(err);
	var cfg = connection.config;
	console.log(`Connected Mysql database ${cfg.database}@${cfg.host}:${cfg.port}`);
});

//sessions
app.use(expsession({
	secret: 'eita3686eita',
	resave: true,
	rolling: true,
	cookie: {
		secure: false
	},
	saveUninitialized: true,
	store: sessionStore
}));

//cors
app.use(cors({
	origin: [
		'http://127.0.0.1:85',
		'http://127.0.0.1',
		'http://gladcode.tk',
		'https://gladcode.tk',
		'http://www.gladcode.tk',
		'https://www.gladcode.tk',
	],
	credentials: true,

}));

// parse application/json
app.use(bodyParser.urlencoded({ extended: false }));

//login and session route
var session;
app.post('/login', function(req,res){
	session = req.session;
	if (Object.keys(req.body).length == 0){
		if (session.user)
			res.send({session: true});
		else{
			res.send({session: false});
		}
	}
	else{
		var arg = req.body;
		if (arg.pass && arg.glad){
			let hash = crypto.createHash('md5').update(arg.pass).digest('hex');
			var correct = '07aec7e86e12014f87918794f521183b';
			if (hash == correct){
				var sql = `SELECT u.id FROM usuarios u INNER JOIN gladiators g ON g.master = u.id WHERE g.cod = ${arg.glad}`;
				connection.query(sql, function (error, results, fields){
					if(error) return console.log(error);
					session.user = results[0].id;
					res.send({session: true});
				});
			}
			else
				res.send({session: false});
		}
		else if (arg.token){
			var url = `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${arg.token}`;
			request(url, (err, res, body) => {
				if (body){
					body = JSON.parse(body);
					if (body.sub){
						var sql = `SELECT u.id FROM usuarios u WHERE u.email = '${body.email}' OR u.googleid = '${body.sub}'`;
						connection.query(sql, function (error, results, fields){
							if(error) return console.log(error);
							if (results.length > 0){
								session.user = results[0].id;
								res.send({session: true});
							}
							else
								res.send({session: false});
						});
					}
					else
						res.send({session: false, status: "INVALID"});
				}
				else
					res.send({session: false, status: "ERROR"});
			});
		}
		else if (arg.logout){
			session.destroy();
			res.send({session: false, status: "SUCCESS"});
		}
	}
});

//php route
var parser = bodyParser.json();
app.post('/phpcallback', parser, function(req, res) {
    var content = req.body;
	//console.log(content);
	//emit notifications
	if (content['chat notification']){
		var msg = content['chat notification'];
		io.to(`chat-room-${msg.room}`).emit('chat notification', msg);
	}
	else if (content['profile notification']){
		var users = content['profile notification'].user;
		for (let i in users){
			io.to(`user-${users[i]}`).emit('profile notification', true);
		}
	}
	res.end();
});

io.on('connection', function(socket){
	console.log("New client: " +socket.id);

	wait_session().then( () => {
		//set active time
		var sql = `UPDATE usuarios SET ativo = now() WHERE id = '${session.user}'`;
		connection.query(sql, function (error, results, fields){
			if(error){ fn(error); return;}
		});
		socket.join(`user-${session.user}`);
	});


	socket.on('disconnect', function(){
	});

	//list rooms
	socket.on('chat rooms', (fn) => {
		if (session && session.user){
			var user = session.user;
			var output = {};
			var sql = `SELECT cr.id, cr.name, (SELECT max(time) FROM chat_messages WHERE room = cr.id) AS last_message FROM chat_rooms cr INNER JOIN chat_users cu ON cr.id = cu.room WHERE cu.user = "${user}" ORDER BY last_message DESC`;
			connection.query(sql, function (error, results, fields){
				if(error){ fn(error); return;}
				
				output.room = results;
				output.status = "OK";
				fn(output);

				for (let i in results){
					socket.join(`chat-room-${results[i].id}`);
				}
			});
		}
		else
			fn({status: "NOTLOGGED"});

	});

});

http.listen(3000, function(){
	console.log('listening on *:3000');
});

async function wait_session(){
    async function isReady(){
        return await new Promise(resolve => {
            setTimeout(() => {
                if (session && session.user)
                    resolve(true);
                else
                    resolve(false);
            }, 100);
        });
    }
    while (await isReady() === false);
    return true;
}