var socket = io.connect('127.0.0.1:22222')
			
socket.on('connect', function(data) {
	var tempName = "User+"+socket.id.substring(0,8);
	socket.emit('init_user', tempName );
});

// Event-handler that updates client list
socket.on('update_client_list', function(clientArray) {
	$('#clients').empty();
	for (var c in clientArray) {
		$('#clients').append(clientArray[c] + "<br>");
	}
});

// Event-handler that updates channel list
socket.on('update_channel_list', function(channelArray) {
	$('#channels').empty();
	for (var c in channelArray) {
		$('#channels').append(channelArray[c] + "<br>");
	}
});


socket.on('message_to_client', function(data) {
	var color;
	if (data.flag == "Private") {
		color = "'800080'";
	} else {
		color = "'FFA500'";
	}
	$('#chatlog').append("<b><font color="+color+">" + "&lt;" + data.flag + "&gt;</font> " +
	data.user +  ': ' + "</b>" + data.message + "<br>");
});

// Event-handler for administrative/control messages from server
socket.on('message_from_server', function(msg) {
	$('#chatlog').append("<b><font color='006400'>" + "&lt;Server&gt;: " + "</font></b><i>"
	+ msg + "</i><br>");
});

// Event-handler for channel messages
socket.on('message_to_channel', function(data) {
	$('#chatlog').append("<b>" + "&lt;" + data.channelName + "&gt; " + 
	data.user + ": " + "</b>" + data.message + "<br>");
});

// Send a message or command to the server
function sendMessage() {
	// get message and clear text input
	var msg = $('#message_input').val().trim();
	$('#message_input').val("");
	// check for commands
	if (msg.substring(0,1) == "/") {
		msg = msg.substring(1)
		// split cmd string into arguments, accounting for whitespace
		// [0] -> cmd
		// [1] -> arg1, a username or channel name
		// [2] -> arg2, the optional message
		var args = msg.replace(/\s+/g," ").split(" ", 3);
		// everything after the first two args is the optional msg
		if (args.length > 2) {
			args[2] = msg.substring(msg.indexOf(args[2]));	
		}
		processCommand(args);
	} else {
		socket.emit('message_to_server', msg);
	}
}

// Processes commands denoted by a starting forward-slash
function processCommand(args) {
	if (args[0] == "name") {
			socket.emit('set_name', args[1].trim() );
	} else if (args[0] == "m") {
		// set to message a peer
		socket.emit('set_msg_dest', {destType: args[0], dest: args[1]} );
		// optionally send message to peer
		if (args.length > 2) {
			socket.emit('message_to_server', args[2]);
		}
	} else if (args[0] == "c") {
		// set to message a channel
		socket.emit('set_msg_dest', {destType: args[0], dest: args[1]} );
		// optionally send message to channel
		if (args.length > 2) {
			socket.emit('message_to_server', args[2]);
		}
	} else if (args[0] == "join") {
		socket.emit('join_channel', args[1]);
	} else if (args[0] == "leave") {
		socket.emit('leave_channel', args[1]);
	} else if (args[0] == "newchannel") {
		// create a new channel
		socket.emit('create_channel', args[1]);
		socket.emit('join_channel', args[1]);
	} else if (args[0] == "closechannel") {
		socket.emit('close_channel', args[1]);
	} else if (args[0] == "help") {
		socket.emit('server_messages', "help");
	} else {
		socket.emit('server_messages', "bad_cmd");
	}
}

// allow the user to press enter to submit messages
$(function(){
	$('#message_input').keyup(function(e) {
		if(e.which == 13 && $('#message_input').val().trim() != "") {
			$('#send_button').focus().click();
			$('#message_input').focus();
		} 
	});
});