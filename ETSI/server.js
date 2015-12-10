var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var express = require('express');

var users = new Object();
var sounds = new Object();

var connectCounter = 0;

var numberOfTags = 10;

for (var i = 0; i < numberOfTags; i++) {
  var user = {
      "id": "x",
      "x": 0,
      "y": 0,
      "z": 0,
      "dt": 0,
      "angle": 0,
      "isConnected" : false,
      "isTagConnected": false};

  user.id = "tagId" + i;
  users[user.id] = user;

  delete user;
};

console.log(users);

function randomInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

app.use(express.static(__dirname + '/static/js'));
app.use(express.static(__dirname + '/static/samples/futurP'));

app.get('/', function(req, res) {
  res.sendfile('position_client.html');
});


io.on('connection', function(socket){
  connectCounter++;
  console.log("connection: " + connectCounter);

  socket.on('getUsers', function(msg){
    io.emit("emitUsers", users);
  });

  socket.on('getSounds', function(msg){
    io.emit("emitSounds", sounds);
  });

  socket.on('sendUsers', function(table, index){
    users[index] = table[index];
    io.emit("emitUsers", users);
  });

  socket.on('sendNewSound', function(table, index){
    sounds[index] = table[index];
    io.emit("emitSounds", sounds);
  });

  socket.on('sendRemoveSound', function(table){
    sounds = table;
    io.emit("emitSounds", sounds);
  });

  socket.on('disconnect', function(socket){
    connectCounter--;
    
    console.log("disconnect: " + socket);

  });

});



http.listen(3000, function() {
  console.log('listening on *:3000' + __dirname);
});