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
	console.log('got a connection')
    socket.on('message_to_server', function(msg) {
		user_name = socket.clientName;
		console.log(user_name)
		console.log(msg)
		console.log(groupChannels[socket.dest])
		console.log(socket.dest)
		console.log()
		// TODO handle case of invalid channel or user
		if (socket.destType == "m" && clients[socket.dest] != null) {
			console.log('sending private message');
			io.to(clients[socket.dest].sockID).emit("message_to_client", { message: msg, user: user_name});
		} else if (socket.destType == "g" && groupChannels[socket.dest] != null) {
			console.log('sending channel message')
			socket.broadcast.to(socket.room).emit("message_to_channel", { channelName: socket.dest, user: user_name, message: msg});
		} else {
			io.sockets.emit("message_to_client", { message: msg, user: user_name});
		}
	});
	
	
	socket.on('server_messages', function(msg) {
		var rsp;
		if (msg == "help") {
			rsp = "Use /m &lt;username&gt; &lt;msg&gt; to message a user. "+
					"To create a channel and automatically join, use /newchannel &lt;channel&gt;. " +
					"If you want to close your channel, type /closechannel. "+
					"Type /join &lt;channel&gt; &lt;msg&gt; to join an existing channel, /leave &lt;channel&gt; to leave, "+ 
					"/g &lt;msg&gt; to message your joined channel. "+
					"Using /m and /g changes chat context to that user or group channel, " +
					"so you do not need to type it every time. "+
					"/name can be used to change your name.";
		} else if (msg == "bad_cmd") {
			rsp = "Invalid command.  Type /help for info about all commands";
		}
		io.to(socket.id).emit("message_from_server", rsp);
	});
	
	
	// TODO recombine with below
	socket.on('init_user', function(username) {
		console.log('setting up user');
		// store the clients name to the socket
		socket.clientName = username;
		// store to global list of users
		var client = new Object();
		client.name = username;
		client.sockID = socket.id;
		clients[username] = client;
		io.to(socket.id).emit("message_from_server", "Welcome, " + socket.clientName + "!" + 
		" Use command \'/name &lt;your name&gt;' to change your username.");
		// notify other users of new user
		socket.broadcast.emit("message_from_server", username + " has joined the chat!");
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
		io.to(socket.id).emit("message_from_server", "Your name has been changed to " + username);
		socket.broadcast.emit("message_from_server", oldName + " has changed name to " + username);
	});
	
	// Set user to peer or group context and to specific user/group
	socket.on('set_msg_dest', function(data) {
		// TODO ensure user/channel exists
		console.log('setting message dest');
		console.log(data.destType);
		console.log(data.dest);
		setContext(data.destType, data.dest);
	});
	
	
	// channels have an owner and a list of connected users
	// to send to a channel, broadcast to list of users 
	
	// Create a new channel with given name given channel name
	// Set the user who creates the channel as the owner, 
	// users can only own one channel at a time
	socket.on('create_channel', function(channelName) {
		if (groupChannels[channelName] == null) {
			socket.room = channelName;
			var channel = new Object();
			channel.owner = socket.clientName;
			groupChannels[channelName] = channel;
			socket.join(channelName);
			console.log(groupChannels);
			io.to(socket.id).emit("message_from_server", "Channel " + channelName + " created!");
			// set client's context to message the channel
			setContext("g", channelName);
		} else {
			io.to(socket.id).emit("message_from_server", "This channel already exists.");
		}
	});
	
	// Join a user to a channel, user can subscribe to one channel at a time
	socket.on('join_channel', function(channelName) {
		if (groupChannels[channelName] != null) {
			socket.room = channelName
			socket.join(channelName);
			io.to(socket.id).emit("message_from_server", "You have joined channel: " + channelName);
			// alert other users in channel of new user
			socket.broadcast.to(channelName).emit("message_from_server", socket.clientName + " has joined " + channelName + ".");
			// set client's context to messages the channel
			setContext("g", channelName);
		} else {
			io.to(socket.id).emit("message_from_server", "Sorry, that channel doesn't exist, create it with command: /newchannel " + channelName + ".");
		}
	});
	
	// If the owner of the channel decides to close the channel,
	// remove all users and remove channel from list of channels
	// socket.on('close_channel', function() {});
	
	// When a user disconnects, remove the client from list of clients
	// If the client owned a channel close it since clients do not persist
	socket.on('disconnect', function(data) {
		socket.broadcast.emit("message_from_server", socket.clientName + " has disconnected.");
		delete clients[socket.clientName]
		// TODO close client's channel if they have one
	});
	
	function setContext(dType, dest) {
		if ( dType == "m" && clients[dest] == null) {
			io.to(socket.id).emit('message_from_server', "Sorry, that's an invalid client.")
		} else if ( dType == "g" && groupChannels[dest] == null) {
			io.to(socket.id).emit('message_from_server', "Sorry, that's an invalid channel.")
		} else { // valid context
			socket.destType = dType;
			socket.dest = dest;
		}
	}
	
});