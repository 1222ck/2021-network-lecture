var express = require("express"),
  http = require("http");
app = express();
bodyParser = require("body-parser");

var server = http.createServer(app);
server.listen(80);

app.use(express.static(__dirname + "/web"));
app.use(bodyParser.json());

app.get("/", function (req, res) {
  console.log("[Server] GET : /");
  res.send("Hi, Client, I am a server");
});

app.post("/", (req, res) => {
  console.log("[Server] POST : " + JSON.stringify(req.body));
  res.send(`post value is : ` + req.body.Client + ``);
});
console.log("server on");

var io = require("socket.io")(server);
var roomName;
io.on("connection", function (socket) {
  console.log("connect");
  var instanceId = socket.id;
  socket.on("joinRoom", function (data) {
    console.log(data);
    socket.join(data.roomName);
    roomName = data.roomName;
  });
  socket.on("reqMsg", function (data) {
    console.log(data);
    io.sockets
      .in(roomName)
      .emit("recMsg", { comment: Id + " : " + data.comment + "\n" });
  });
});
