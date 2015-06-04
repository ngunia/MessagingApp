var http = require('http')
var fs = require('fs');

var ADDR = "127.0.0.1";
var PORT = 22222;

// listen on the ADDR and PORT given to serve the HTML, css, and js to the client
var app = http.createServer(function (req, rsp) {
	if (req.url == "/" || req.url == "/index.html") {
		fs.readFile('chat_client.html', 'ascii', function (error, data) {
		if (error) {
			console.log(error.data);
			rsp.writeHead(500);
			rsp.end();
		} else {
			rsp.writeHead(200, {'Content-Type': 'text/html'});
			rsp.write(data);
			rsp.end();
		}
	});
	} else if (req.url == "/client.css") {
		fs.readFile('client.css', 'ascii', function (error, data) {
		if (error) {
			console.log(error.data);
			rsp.writeHead(500);
			rsp.end();
		} else {
			rsp.writeHead(200, {'Content-Type': 'text/css'});
			rsp.write(data);
			rsp.end();
		}
	});
	} else if (req.url == "/client.js") {
		fs.readFile('client.js', 'ascii', function (error, data) {
		if (error) {
			console.log(error.data);
			rsp.writeHead(500);
			rsp.end();
		} else {
			rsp.writeHead(200, {'Content-Type': 'text/css'});
			rsp.write(data);
			rsp.end();
		}
	});
	}
}).listen(PORT, ADDR);

var io = require('socket.io').listen(app);

var clients = new Array(); 			// associative array that holds the clients
var groupChannels = new Array(); 	// associative array that holds group channel names
 
io.sockets.on('connection', function(socket) {
	/*
	* Events that handle messages sent to/through the server and user preferences
	*/
	
	// interpret a message being passed through the server for global/private/channel chat
    socket.on('message_to_server', function(msg) {
		if (socket.dest == "unknown") {
			console.log("Invalid context change, message dies here, then reverts context.")
			socket.dest = socket.lastDest;
		} else if (socket.destType == "m") {
			if (clients[socket.dest] != undefined ) {
				clientToClient(clients[socket.dest].sockID, {message: msg, user: socket.clientName, flag: "Private"});
			} else {
				messageClient("Invalid name, " + socket.dest +" may have disconnected or changed his/her name.");
			}
		} else if (socket.destType == "c" && groupChannels[socket.dest] != undefined) {
			if(socket.room == socket.dest) {
				messageChannel({channelName: socket.dest, user: socket.clientName, message: msg});
			} else {
				messageClient("Sorry, you must join " + socket.dest + " if you wish to speak in this channel.");
			}
		} else if (socket.destType == undefined) {
			globalMessage({ message: msg, user: socket.clientName, flag:"Global"});
		}
	});
	
	// Static messages that the server provides to the client
	socket.on('server_messages', function(msg) {
		var rsp;
		if (msg == "help") {
			rsp = "Use /m &lt;username&gt; &lt;msg&gt; to message a user. "+
					"To create a channel and automatically join, use /newchannel &lt;channel&gt;. " +
					"If you want to close your channel, type /closechannel. "+
					"Type /join &lt;channel&gt; &lt;msg&gt; to join an existing channel, /leave to leave, "+ 
					"/c &lt;msg&gt; to message your joined channel. "+
					"Using /m &lt;user&gt; and /c &lt;channel&gt; changes chat context to that user or group channel, " +
					"so that you do not need to type it if you wish to chat with that user or channel. "+
					"/name &lt;name&gt; can be used to change your name.";
		} else if (msg == "bad_cmd") {
			rsp = "Invalid command.  Type /help for info about all commands.";
		}
		messageClient(rsp);
	});
	
	// initialize a user and add to the client array
	socket.on('init_user', function(username) {
		// store the clients name to the socket
		socket.clientName = username;
		// store to global list of users
		var client = new Object();
		client.name = username;
		client.sockID = socket.id;
		setContext(undefined, undefined);
		clients[username] = client;
		messageClient("Welcome, " + socket.clientName + "!" + 
		" Use command \'/name &lt;your name&gt;' to change your username.");
		// notify other users of new user
		globalBroadcast(username + " has joined the chat!");
		updateClientList();
	});
	
	// Change a client's username and update in global list of clients
	socket.on('set_name', function(username) {
		var oldName = socket.clientName;
		// store new client name to socket
		socket.clientName = username;
		// update client in global list of clients
		// since client name is the key, make a new client then remove the old
		var client = new Object();
		client.name = username;
		client.sockID = socket.id;
		clients[username] = client;
		// if the user owns a channel, transfer ownership to new name
		for (var channel in groupChannels){
			if (groupChannels[channel].owner == oldName) {
				groupChannels[channel].owner = username;
			}
		}
		// remove old client alias
		delete clients[oldName];
		// alert user of successful name change
		messageClient("Your name has been changed to " + username);
		// alert other users of client's name change
		globalBroadcast(oldName + " has changed name to " + username);
		updateClientList();
	});
	
	// Set user to peer or group context and to specific user/group
	socket.on('set_msg_dest', function(data) {
		if (data.destType == "g") {
			setContext(undefined, undefined);
		} else {
			setContext(data.destType, data.dest);
		}
	});
	
	/*
	* Events that deal with group channels
	*/
	
	// Create a new channel with given name given channel name
	// Set the user who creates the channel as the owner 
	socket.on('create_channel', function(channelName) {
		if (socket.channelOwned != undefined) {
			messageClient("You already own a room called " + socket.room + ". If you want to make a new one, close it with: /closechannel " + socket.room);
		}
		else if (groupChannels[channelName] != undefined) {
			messageClient("This channel already exists.");
		} else {
			var channel = new Object();
			channel.owner = socket.clientName;
			groupChannels[channelName] = channel;
			socket.channelOwned = channelName;
			messageClient("Channel " + channelName + " created!");
			updateChannelList();
		}
	});
	
	// Join a user to a channel, user can subscribe to one channel at a time
	socket.on('join_channel', function(channelName) {
		if (channelName == socket.room) {
			messageClient("You are already a member of channel " + channelName + "!");
		} else if (socket.room != undefined && groupChannels[channelName] != undefined) {
			socket.leave(socket.room);
			broadcastToRoom({channelName: socket.room, user: "Server", message: socket.clientName + " has left " + socket.room + "." });
			socket.room = channelName;
			socket.join(channelName);
			broadcastToRoom({channelName: channelName, user: "Server", message: socket.clientName + " has joined " + channelName + "." });
			setContext("c", channelName);
			messageClient("You have switched to channel " + channelName);
		} else if (groupChannels[channelName] == undefined) {
			messageClient("Sorry, that channel doesn't exist, create it with command: /newchannel " + channelName + ".");
		} else {
			socket.room = channelName;
			socket.join(channelName);
			messageClient("You have joined channel: " + channelName);
			// alert other users in channel of new user
			broadcastToRoom({channelName: channelName, user: "Server", message: socket.clientName + " has joined " + channelName + "." });
			// set client's context to messages the channel
			setContext("c", channelName);
		}
	});
	
	// let a user remove self from channel and announce to channel
	socket.on('leave_channel', function() {
		if (socket.room != undefined) {
			leaveChannel();
		} else {
			messageClient("You are not currently joined to a channel.");
		}
	});
	
	// If the owner of the channel decides to close the channel,
	// remove all users and remove channel from list of channels
	 socket.on('close_channel', function(channelName) {
		if (socket.clientName != groupChannels[channelName].owner) {
			messageClient("You don't own channel " + channelName + "!");
		} else {
			closeChannel(channelName);
			messageClient("You have successfully closed channel " + channelName + ".");
		}
	 });
	
	// separate function so it can be run on client disconnect as well
	function closeChannel(channelName) {
		//socket.channelOwned = undefined;
		roomClients = io.nsps['/'].adapter.rooms[channelName];
		for (var client in roomClients) {
			cli = io.sockets.connected[client];
			if (socket.id != cli.d) {
				cli.room = undefined;
				cli.destType = undefined;
				cli.dest = undefined;
				io.to(cli.id).emit("message_from_server", "You have been removed from channel " + channelName + " due to it being closed by the owner.");
			}
		}
		socket.channelOwned = undefined;
		delete groupChannels[channelName];
		updateChannelList();
	}
	
	// separate function so it can be run on client disconnect as well
	// let a user remove self from channel and announce to channel
	function leaveChannel() {
		socket.leave(socket.room);
		broadcastToRoom({channelName: socket.room, user: "Server", message: socket.clientName + " has left " + socket.room + "." });
		messageClient("You have left "+ socket.room + ".");
		socket.room = undefined;
		setContext(undefined, undefined);
	}
	
	// change the chat context so the user does not need to type /g, /m, or /c for every message
	function setContext(dType, dest) {
		// save old dest in case context change is invalid so it can be reverted
		socket.lastDest = socket.dest;
		socket.dest = "unknown";
		if ( dType == "m" && clients[dest] == undefined) {
			messageClient("Sorry, that's an invalid client.");
		} else if ( dType == "c" && groupChannels[dest] == undefined) {
			messageClient("Sorry, that's an invalid channel.");
		} else { // valid context
			socket.destType = dType;
			socket.dest = dest;
		}
	}
	
	// When a user disconnects, remove the client from list of clients
	// If the user owned a channel close it since clients do not persist
	// If the user was joined to a channel, leave it
	socket.on('disconnect', function(data) {
		globalBroadcast(socket.clientName + " has disconnected.");
		// check if client was in a channel and leave if so
		if (socket.room != undefined) {   
			leaveChannel();
		}
		if (socket.channelOwned != undefined) {
			closeChannel(socket.channelOwned);
		}
		delete clients[socket.clientName];
		updateClientList();
	});
	
	/*
	* Wrapper functions for different type of message sends
	*/
	
	// Send a global broadcast to all clients except sender (from server)
	function globalBroadcast(msg) {
		socket.broadcast.emit('message_from_server', msg);
	}
	
	// Send a message to all clients using the chat service from another client
	function globalMessage(data) {
		io.sockets.emit('message_to_client', data);
	}
	
	// Send a message to an individual client from the server
	function messageClient(msg) {
		io.to(socket.id).emit('message_from_server', msg);
	}
	
	// Send a message to all clients in room except sending client
	function broadcastToRoom(data) {
		socket.broadcast.to(data.channelName).emit('message_to_channel', data);
	}
	
	// Sends message to all clients in room including sending client
	function messageChannel(data) {
		io.sockets.in(data.channelName).emit('message_to_channel', data);
	}
	
	// Message an individual client from another client
	function clientToClient(otherClientID, data) {
		io.to(otherClientID).emit('message_to_client', data);
		data.user = socket.clientName;
		io.to(socket.id).emit('message_to_client', data);
	}
	
	// Send list of clients to client for viewing
	function updateClientList() {
		io.sockets.emit('update_client_list', Object.keys(clients));
	}
	
	// Send list of channels to client for viewing
	function updateChannelList() {
		io.sockets.emit('update_channel_list', Object.keys(groupChannels));
	}
	
});