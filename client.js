var socket = io.connect('127.0.0.1:22222')

// On connection, set a temporary name			
socket.on('connect', function(data) {
	var tempName = "User+"+socket.id.substring(0,8);
	socket.emit('init_user', tempName );
});

// Update client list
socket.on('update_client_list', function(clientArray) {
	$('#clients').empty();
	for (var c in clientArray) {
		$('#clients').append(clientArray[c] + "<br>");
	}
});

// Update channel list
socket.on('update_channel_list', function(channelArray) {
	$('#channels').empty();
	for (var c in channelArray) {
		$('#channels').append(channelArray[c] + "<br>");
	}
});

// Event-handler for messages from another user or global chat
socket.on('message_to_client', function(data) {
	var color;
	if (data.flag == "Private") {
		color = "'800080'";
	} else {
		color = "'FFA500'";
	}
	$('#chatlog').append("<b><font color="+color+">" + "&lt;" + data.flag + "&gt;</font> " +
	data.user +  ': ' + "</b>" + data.message + "<br>");
	scrollBottom();
});

// Event-handler for administrative/control messages from server
socket.on('message_from_server', function(msg) {
	$('#chatlog').append("<b><font color='006400'>" + "&lt;Server&gt;: " + "</font></b><i>"
	+ msg + "</i><br>");
	scrollBottom();
});

// Event-handler for channel messages
socket.on('message_to_channel', function(data) {
	$('#chatlog').append("<b>" + "&lt;" + data.channelName + "&gt; " + 
	data.user + ": " + "</b>" + data.message + "<br>");
	scrollBottom();
});

// When the chat log is longer than the screen, auto scroll to the bottom on new messages
function scrollBottom() {
	var chat = document.getElementById('chatlog');
	chat.scrollTop = chat.scrollHeight;
}

// Send a message or command to the server
function sendMessage() {
	// get message and clear text input, if no message, return
	var msg = $('#message_input').val().trim();
	if (msg == "") {
		return;
	}
	$('#message_input').val("");
	// check for commands
	if (msg.substring(0,1) == "/") {
		msg = msg.substring(1);
		// split cmd string into arguments, accounting for whitespace
		// [0] -> cmd
		// [1] -> arg1, a username or channel name
		// [2] -> arg2, the optional message
		var args = msg.replace(/\s+/g," ").split(" ", 3);
		// everything after the first two args is the optional msg
		if (args.length > 2) {
			args[2] = msg.substring(msg.indexOf(args[2]));	
		}
		// process the command
		processCommand(args);
	} else {
		// send the message to the server
		socket.emit('message_to_server', msg);
	}
}

// Processes commands denoted by a starting forward-slash
function processCommand(args) {
	// change name
	if (args[0] == "name") {
			socket.emit('set_name', args[1].trim() );
	} else if (args[0] == "m" || args[0] == "c") { // message a user or channel
		// set to message a peer/channel
		socket.emit('set_msg_dest', {destType: args[0], dest: args[1]} );
		// optionally send message to peer/channel
		if (args.length > 2) {
			socket.emit('message_to_server', args[2]);
		}
	} else if (args[0] == "g") { // message global chat
		// set to message global
		socket.emit('set_msg_dest', {destType: args[0], dest: undefined} );
		// optionally send message to channel
		if (args.length > 1) {
			socket.emit('message_to_server', args.splice(1).join(" "));
		}
	} else if (args[0] == "join") { // join a channel
		socket.emit('join_channel', args[1]);
	} else if (args[0] == "leave") { // leave a channel
		socket.emit('leave_channel', args[1]);
	} else if (args[0] == "newchannel") { // make a new channel
		// create a new channel
		socket.emit('create_channel', args[1]);
		socket.emit('join_channel', args[1]);
	} else if (args[0] == "closechannel") { // close a channel that you own
		socket.emit('close_channel', args[1]);
	} else if (args[0] == "help") { // see help about commands
		socket.emit('server_messages', "help");
	} else { // a non-existent command was entered
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