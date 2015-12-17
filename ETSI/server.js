var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var express = require('express');
var cheerio = require('cheerio');
var request = require('request');


var users = new Object();
var sounds = new Object();

var connectCounter = 0;

var numberOfTags = 10;
var nbMaxSounds = 3;

for (var i = 1; i <= numberOfTags; i++) {
  var user = {
    "id": "x",
    "x": 0,
    "y": 0,
    "z": 0,
    "dt": 0,
    "angle": 0,
    "isConnected": false,
    "isTagConnected": false
  };

  user.id = "tagId" + i;
  users[user.id] = user;

  delete user;
};

console.log(users);

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
};

function removeSound() {
  var id;
  for (var i in sounds) {
    id = sounds[i].id
  };

  delete sounds[id];

  io.emit("emitSounds", sounds);
};

app.use(express.static(__dirname + '/static/js'));
app.use(express.static(__dirname + '/static/img'));
app.use(express.static(__dirname + '/static/fonts'));
app.use(express.static(__dirname + '/static/samples'));


//----
app.get('/scrape', function(req, res){
    // The URL we will scrape from - in our example Anchorman 2.

    url = 'http://10.0.1.149/mdwui/lpsdemo_json.php';

    // The structure of our request call
    // The first parameter is our URL
    // The callback function takes 3 parameters, an error, response status code and the html

    setInterval(function() {
    // do something here
      request(url, function(error, response, html){

        // First we'll check to make sure no errors occurred when making the request

        if(!error){
            // Next, we'll utilize the cheerio library on the returned html which will essentially give us jQuery functionality

            var $ = cheerio.load(html);

          
            console.log("");
            console.log($._root.children[0].data);
            var json = JSON.parse($._root.children[0].data);

            console.log("");
            console.log(json["Anchor00"].location);
            console.log("");

            users["tagId10"].x = parseFloat(json["Anchor00"].location[0]);
            users["tagId10"].z = parseFloat(json["Anchor00"].location[1]);

            console.log("");
            console.log(users["tagId10"]);
            console.log("");

            // Finally, we'll define the variables we're going to capture

            // var title, release, rating;
            // var json = { title : "", release : "", rating : ""};
        }
      });
    }, 100);


    
    // .pipe()
    // .on('error', function(error){
    //   console.log(error);
    // });
})
//----


app.get('/', function(req, res) {
  res.sendfile('etsi_listener.html');
  // res.sendfile('idSelec.html');
});

app.get('/record', function(req, res) {
  res.sendfile('etsi_recorder.html');
  // res.sendfile('idSelec.html');
});

io.on('connection', function(socket) {
  connectCounter++;
  console.log("connection: " + connectCounter);

  socket.emit('newClient', {
    nbUserServer: numberOfTags
  });

  socket.on('getListener', function(index) {
    io.emit("startListener", index);
    console.log("startListener: " + index);
  });

  socket.on('getUsers', function(msg) {
    io.emit("emitUsers", users);
  });

  socket.on('getSounds', function(msg) {
    io.emit("emitSounds", sounds);
  });

  socket.on('sendUsers', function(table, index) {

    if (index == "tagId10") {
      users[index].angle = table[index].angle;
      users[index].dt = table[index].dt;
    }
    else{
      users[index] = table[index];
    };
    
    io.emit("emitUsers", users);
  });

  socket.on('sendNewSound', function(sound, index) {
    sounds[index] = sound;
    console.log(sounds);
    console.log("");
    if (Object.keys(sounds).length > nbMaxSounds) {
      console.log("Remove");

      removeSound();
      console.log(sounds);
    };
    io.emit("emitSounds", sounds);
  });

  socket.on('sendRemoveSound', function(table) {
    sounds = table;
    io.emit("emitSounds", sounds);
  });

  socket.on('disconnect', function(socket) {
    connectCounter--;

    console.log("disconnect: " + socket);

  });

});



http.listen(3000, function() {
  console.log('listening on *:3000' + __dirname);
});