var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var express = require('express');

var usersTable = {};
var users = [];
var connectCounter = 0;

usersTable.users = users;

function randomInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

app.use(express.static(__dirname + '/static/js'));
app.use(express.static(__dirname + '/static/samples/futurP'));

app.get('/', function(req, res) {

  var user = {
      "id": "x",
      "x": 0,
      "y": 0,
      "z": 0,
      "dt": 0,
      "angle": 0,
      "desirableFuture": {
        "path": "x"
      },
      "probableFuture": {
        "x": 0,
        "y": 0,
        "z": 0,
        "path": "x"
      }};

  console.log("");
  console.log("before");
  console.log(usersTable.users);
  console.log("before");
  console.log("");

  user.id = usersTable.users.length;
  user.probableFuture.x = 0;
  user.probableFuture.y = -8;
  user.probableFuture.z = randomInt(-30, 30);
  user.probableFuture.path = user.id + '_P.mp3';

  usersTable.users.push(user);
  console.log("");
  console.log("after");
  console.log(usersTable.users);
  console.log("after");
  console.log("");
  res.sendfile('position_client.html');
  delete user;
  
});


io.on('connection', function(socket){
  connectCounter++;
  console.log("connection: " + connectCounter);
  socket.on('getUsersTable', function(msg){
    io.emit("usersTable", usersTable);
  });

  socket.on('sendUsersTable', function(table, index){
    usersTable.users[index] = table.users[index];
    io.emit("usersTable", usersTable);
  });

  socket.on('disconnect', function(socket){
    connectCounter--;
    
    console.log("disconnect: " + socket);

  });

});



http.listen(3000, function() {
  console.log('listening on *:3000' + __dirname);
});