# Messaging Application
This application is an event-driven messaging service powered by Node.js, Socket.IO, and AJAX on the front-end.  The service provides a global chat room as well as channeled group chats and private messaging between clients.  It runs in a browser and can be accessed by default at localhost:22222.

### Installation

Open up your preferred terminal, with Node.js installed, install Socket.IO through NPM in the directory where the code is located:
```
npm install socket.io
```

You should now have all the necessary dependencies to run the application.

### Use Instructions
##### Running the Server
If you want to change where the client is accessed, change the ADDR and PORT in server.js.  Do the same at the top of client.js.  Next, start up the server by:
```
node server.js
```

The app will be available at localhost:22222 (or at whatever ADDR and PORT you chose) for use in your web browser.

##### Chat Commands
 - "/name  < name >" 
  - Change your name to the desired name
 - "/m < client_name > < optional_message >
  - Set context to privately message < client_name > with an optional message.
  - After setting your chat context, all messages will go to this user until you change the context again.
 - "/g < optional_message >
  - Set context to global chat with an optional message.
  - After setting your chat context, all messages will go to global chat until you change the context again.
 - "/newchannel < channel_name >"
  - Create a new chat channel with given name
 - "/join < channel_name >"
  - Join an existing channel and switch your chat context to that channel.
  - After setting your chat context, all messages will go to this channel until you change contexts again.
 - "/c < channel_name >"
  - Set context to the channel. 
  - You must be a member of the channel to do this.
 - "/leave "
   - Leaves the currently joined channel
 - "/closechannel < channel_name >"
   - Removes the channel from the channel list and removes all users.
   - You cannot run this command unless you own the channel.
 - "/help"
   - Provides a summary of the above information for the user.


### Tested and Working Browsers
Chrome 43.0.2357.81 m

Firefox 38.0.1 (some spacing issues)

### Future Upgrades

- Remove need for messages to be sent to server to be seen by local client
- More robust help system
    - Provide help on messaging, name changing, groups separately rather than one /help for all commands
- Security for running on open internet
    - Scrubbing inputs to prevent code injection
    - Preventing spammers
- REST API endpoints
    - Allow different clients to connect to server, Android, iOS, etc.
- Leave less up to the user with a more robust client
    - Use physical elements on client side to control message flow,
   to deal with issue of users forgetting a "/" and sending a private message 
   to the wrong person or to a channel, ie Separate windows for group chats/private messages
    - Allow users to join multiple channels
    - More complex events, deal with server event responses more dynamically
- Moderation tools for channel owners
    - Remove users
    - Change channel name
    - Set a password on the channel
    - Set a welcome message

