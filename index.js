var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mongo = require('mongodb').MongoClient;

const START_BALANCE = 15000;


io.sockets.on('connection', function (socket) {
    //console.log("Socket connected.");
    mongo.connect('mongodb://127.0.0.1/test', function (err, db) {
        if (err) throw err;
        var col = db.collection('users');
        col.find().toArray(function (err, res) {
            if (err) throw err;
            socket.emit('output', res);
        });
        db.close();
    });

    socket.on('user joined', function (data) {
        mongo.connect('mongodb://127.0.0.1/test', function (err, db) {
            if (err) throw err;
            var col = db.collection('users');
            col.insertOne({user: data.user, balance: START_BALANCE}, function (err) {
                if (!err) {
                    io.emit('output', [{user: data.user}]);
                    console.log("new user " + data.user + " joined");
                }
                else {
                    console.log("user " + data.user + " joined");
                }
            });
            db.close();
        });
        mongo.connect('mongodb://127.0.0.1/test', function (err, db) {
            if (err) throw err;
            var col = db.collection('users');
            col.findOne({user: data.user}, function (err, result) {
                if (err) throw err;
                socket.emit('update: ' + data.user, {
                    balance: result.balance
                });
            });
            db.close();
        });
    });

    socket.on('balance change', function (data) {
        updateBalance(data.user, data.change, data.if_add);
        console.log(data.user+" "+(data.if_add?"+":"-")+data.change);
    });
    socket.on('transfer', function (data) {
        updateBalance(data.user_minus, data.change, false);
        updateBalance(data.user_plus, data.change, true);
        console.log(data.user_minus+" ---"+data.change+"--> "+data.user_plus);
    });

    function updateBalance(user, change, if_add) {

        if (change!==null) {
            mongo.connect('mongodb://127.0.0.1/test', function (err, db) {
                if (err) throw err;
                var col = db.collection('users');
                if (if_add) {
                    col.updateOne({user: user}, {$inc: {balance: change}});
                }
                else {
                    col.updateOne({user: user}, {$inc: {balance: -change}});
                }
                db.close();
            });
            mongo.connect('mongodb://127.0.0.1/test', function (err, db) {
                if (err) throw err;
                var col = db.collection('users');
                col.findOne({user: user}, function (err, result) {
                    if (err) throw err;
                    io.emit('update: ' + user, {
                        balance: result.balance
                    });
                });
                db.close();
            });

        }
    }


});


app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});


// io.on('connection', function(socket){
// 	socket.on('chat message', function(msg,user){
// 		io.emit('chat message', msg, user);
// 	});
// });

http.listen(3000, function () {
    console.log('listening on *:3000');
});