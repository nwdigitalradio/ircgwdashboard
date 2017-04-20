var io = require("socket.io-client");
var socket = io("http://starbuck.hays.org:3000");
socket.emit('chat message','Client Here');
socket.on('message', function(data) {
	console.log(data)
});
