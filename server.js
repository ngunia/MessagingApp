var http = require('http')
var fs = require('fs');


var app = http.createServer(function (req, rsp) {
	fs.readFile('chat_client.html', 'ascii', function (error, data) {
		if (error) {
			console.log(error.data)
			rsp.writeHead(500)
			rsp.end()
		} else {
			rsp.writeHead(200, {'Content-Type': 'text/html'});
			rsp.write(data);
			rsp.end();
		}
	});
}).listen(22222);


var io = require('socket.io').listen(app);


var clients = new Array();
 
io.sockets.on('connection', function(socket) {
	
    socket.on('message_to_server', function(data) {
		user_name = clients[String(socket.id)].customID;
        io.sockets.emit("message_to_client", { message: data["message"], user: user_name });
    });
	
	socket.on('set_name', function(data) {
		//socket.id = data['name'];
		console.log(data.name);
		var client = new Object();
		client.customID = data.name;
		clients[String(socket.id)] = client;
	});
	
	socket.on('disconnect', function(data) {
		// TODO alert other users that this user has disconnected
		delete clients[String(socket.id)]
	})
	
});