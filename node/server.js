const express = require('express');
const app = express();
const fs = require('fs');
const wsServer = require('./wsserver');

var config = JSON.parse(fs.readFileSync('config.json'));
if (config.credentials){
    for (i in config.credentials)
        config.credentials[i] = fs.readFileSync(config.credentials[i]);
}
const server = require(config.protocol).createServer(config.credentials, app);

const mysql = require('mysql');
const crypto = require('crypto');
const request = require('request');
const expsession = require('express-session');
const MySQLStore = require('express-mysql-session')(expsession);
const cors = require('cors');

// what groups are trying to run simulation
var tournament_run = {};

// mysql
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

// sessions
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

// cors
app.use(cors({
    origin: [
        'http://127.0.0.1:85',
        'http://127.0.0.1',
        'https://127.0.0.1',
        'http://127.0.0.1:8181',
        'https://localhost',
        'http://gladcode.tk',
        'https://gladcode.tk',
        'http://www.gladcode.tk',
        'https://www.gladcode.tk',
        'http://gladcode.dev',
        'https://gladcode.dev',
        'http://www.gladcode.dev',
        'https://www.gladcode.dev'
    ],
    credentials: true,
}));

// parse application/json
app.use(express.urlencoded({ extended: false }));

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
        //admin auth
        var arg = req.body;
        if (arg.pass && (arg.glad || arg.user)){
            let hash = crypto.createHash('md5').update(arg.pass).digest('hex');
            var correct = '07aec7e86e12014f87918794f521183b';
            if (hash == correct){
                if (arg.glad){
                    var sql = `SELECT u.id FROM usuarios u INNER JOIN gladiators g ON g.master = u.id WHERE g.cod = ${arg.glad}`;
                }
                else if (arg.user){
                    var sql = `SELECT id FROM usuarios WHERE id = ${arg.user}`;
                }
                connection.query(sql, function (error, results, fields){
                    if(error) return console.log(error);
                    if (results.length){
                        session.user = results[0].id;
                        res.send({session: true});
                    }
                    else
                        res.send({session: false});
                });
            }
            else
                res.send({session: false});
        }
        //google login
        else if (arg.token){
            var url = `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${arg.token}`;
            request(url, (error, response, body) => {
                // console.log(body);
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

// php route
const parser = express.json();
app.post('/phpcallback', parser, function(req, res) {
    var content = req.body;
    //console.log(content);
    //emit notifications
    if (content['chat notification']){
        var msg = content['chat notification'];
        wsServer.emit(`chat-room-${msg.room}`, 'chat notification', msg);
        wsServer.emit(`chat-room-${msg.room}`, 'chat notification', msg);
    }
    else if (content['chat personal']){
        var msg = content['chat personal'];
        wsServer.emit(`user-${msg.user}`, 'chat personal', msg);
    }
    else if (content['profile notification']){
        var users = content['profile notification'].user;
        for (let i in users){
            //console.log(`send to: user-${users[i]}`);
            wsServer.emit(`user-${users[i]}`, 'profile notification', true);
        }
    }
    else if (content['tournament list']){
        wsServer.emit('tournament-list', 'tournament list', true);
    }
    else if (content['tournament teams']){
        var data = content['tournament teams'];
        wsServer.emit(`tournament-${data.id}`, 'tournament teams', data);
    }
    else if (content['tournament glads']){
        var data = content['tournament glads'];
        wsServer.emit(`team-${data.team}`, 'tournament glads', data);
    }
    else if (content['tournament refresh']){
        var data = content['tournament refresh'];
        wsServer.emit(`tournament-${data.hash}`, 'tournament refresh', true);
    }
    else if (content['training refresh']){
        var data = content['training refresh'];
        wsServer.emit(`training-${data.hash.toLowerCase()}`, 'training refresh', true);
    }
    else if (content['training end']){
        var data = content['training end'];
        wsServer.emit(`training-${data.hash.toLowerCase()}`, 'training end', true);
    }
    else if (content['training list']){
        wsServer.emit('training-list', 'training list', true);
    }
    else if (content['training room']){
        var data = content['training room'];
        wsServer.emit(`training-room-${data.id}`, 'training room', data);
    }
    res.end();
});

wsServer.init = function(socket){
    console.log("New client: " +socket.id);

    connection.query("SET time_zone='-03:00';", () => {});
    
    wait_session().then( () => {
        //set active time
        var sql = `UPDATE usuarios SET ativo = now() WHERE id = '${session.user}'`;
        connection.query(sql, function (error, results, fields){
            if(error){ fn(error); return;}
        });
        //console.log(`join: user-${session.user}`);
        socket.join(`user-${session.user}`);
    }, () => {});

    //list rooms
    socket.addAction('chat rooms', (_, reply) => {
        if (session && session.user){
            let user = session.user
            let output = {}

            let sql = `SELECT cr.id, cr.name, (SELECT max(time) FROM chat_messages WHERE room = cr.id) AS last_message, (SELECT UNIX_TIMESTAMP(visited) FROM chat_users WHERE room = cr.id AND user = ${user}) AS visited, cr.direct FROM chat_rooms cr INNER JOIN chat_users cu ON cr.id = cu.room WHERE cu.user = "${user}" ORDER BY last_message DESC`;
            connection.query(sql, function (error, results, fields){
                if(error){ reply(error); return;}

                output.room = results
                output.status = "OK"
                reply(output);

                for (let i in results){
                    socket.join(`chat-room-${results[i].id}`);
                }
            });
        }
        else
            reply({status: "NOTLOGGED"});

    });

    socket.addAction('tournament run request', (args, reply) => {
        var hashgroup = `${args.hash}-${args.group}`;
        if (!tournament_run[hashgroup]){
            tournament_run[hashgroup] = true;
            dismiss(hashgroup);
            reply({permission: 'granted'});
        }
        else{
            reply({permission: 'denied'});
        }

        function dismiss(key){
            setTimeout( function(){
                delete tournament_run[key];
            }, 5000);
        }
    });

    socket.addAction('tournament join', args => {
        tournament_join_leave('join', args);
    });
    socket.addAction('tournament leave', args => {
        tournament_join_leave('leave', args);
    });

    socket.addAction('team join', args => {
        socket.join(`team-${args.team}`);
    });
    socket.addAction('team leave', args => {
        socket.leave(`team-${args.team}`);
    });

    socket.addAction('tournament list join', () => {
        socket.join(`tournament-list`);
    });

    socket.addAction('tournament run join', args => {
        socket.join(`tournament-${args.hash}`);
    });

    socket.addAction('training run join', args => {
        socket.join(`training-${args.hash.toLowerCase()}`);
    });

    socket.addAction('training list join', () => {
        socket.join(`training-list`);
    });
    
    socket.addAction('training room join', args => {
        socket.join(`training-room-${args.id}`);
    });

    socket.addAction('training room leave', args => {
        socket.leave(`training-room-${args.id}`);
    });

    function tournament_join_leave(mode, args){
        var sql = `SELECT * FROM tournament WHERE name = '${args.tname}' AND password = '${args.tpass}'`;
        connection.query(sql, function (error, results, fields){
            if(error){ console.log(error); return;}
            
            if (results.length > 0){
                var id = results[0].id;
                if (mode == 'join')
                    socket.join(`tournament-${id}`);
                else if (mode == 'leave')
                    socket.leave(`tournament-${id}`);
            }
        });
    }
    
}

const a = app.listen(3000, function(){
    console.log(`listening on *:${a.address().port}`);
});

async function wait_session(){
    var ready = false;
    var i = 0;
    while (ready !== true && i < 100){
        var ready = await new Promise( (resolve, reject) => {
            setTimeout( function(){
                if (!session)
                    reject();
                else if (!session.user)
                    resolve(false);
                else
                    resolve(true);
            },100);
        });
        i++;
    }
}