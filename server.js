var http = require('http')
var fs = require('fs');

var PORT = 22222

// serve the HTML page used for the chat client
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
}).listen(PORT);


var io = require('socket.io').listen(app);

var clients = new Array(); 			// associative array that holds the clients
var groupChannels = new Array(); 	// associative array that holds group channel names
 
io.sockets.on('connection', function(socket) {
	
    socket.on('message_to_server', function(msg) {
		user_name = socket.clientName;
		console.log('gets here')
		console.log(user_name)
		console.log(socket.destType == "m")
		console.log(clients.indexOf(socket.dest) > -1)
		console.log(msg)
		console.log(clients[socket.dest])
		if (socket.destType == "m" && clients[socket.dest] != null) {
			console.log('sending private message');
			io.to(clients[socket.dest].sockID).emit("message_to_client", { message: msg, user: user_name, flag:"private" });
		} else if (socket.destType == "g") {
			io.sockets.emit("message_to_client", { message: msg, user: user_name, flag:"group" });
		} else {
			io.sockets.emit("message_to_client", { message: msg, user: user_name, flag:"all" });
		}
	});
	
	// TODO recombine with below
	socket.on('init_user', function(username) {
		// store the clients name to the socket
		socket.clientName = username;
		// store to global list of users
		var client = new Object();
		client.name = username;
		client.sockID = socket.id;
		clients[username] = client;
		// notify other users of new user
		socket.broadcast.emit("message_from_server", ""+username + " has joined the chat!");
	});
	
	// Change a client's username and update in global list of clients
	socket.on('set_name', function(username) {
		var oldName = socket.clientName;
		// store new client name to socket
		socket.clientName = username;
		// update client in global list of clients
		var client = new Object();
		client.name = username;
		client.sockID = socket.id;
		clients[username] = client;
		// remove old client alias
		delete clients.oldName;
		socket.broadcast.emit("message_from_server", ""+oldName + " has changed name to " + username);
	});
	
	// Set user to peer or group context and to specific user/group
	socket.on('set_msg_dest', function(data) {
		console.log('setting message dest');
		console.log(data.destType);
		console.log(data.dest);
		socket.destType = data.destType
		socket.dest = data.dest
	});
	
	// socket.on('message_to_user', function() {});
	
	// channels have an owner and a list of connected users
	// to send to a channel, broadcast to list of users 
	
	// Create a new channel with given name given channel name
	// Set the user who creates the channel as the owner, 
	// users can only own one channel at a time
	// socket.on('create_channel', function(channelName) {});
	
	// Broadcast message to channel
	// socket.on('message_to_channel', function(channelName, msg) {});
	
	// If the owner of the channel decides to close the channel,
	// remove all users and remove channel from list of channels
	// socket.on('close_channel', function() {});
	
	// When a user disconnects, remove the client from list of clients
	// If the client owned a channel close it since clients do not persist
	socket.on('disconnect', function(data) {
		// TODO alert other users that this user has disconnected
		delete clients[socket.clientName]
		// TODO close client's channel if they have one
	})
	
});