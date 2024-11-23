const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto'); // For generating secure keys

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

// Store group keys (replace this with a database in production)
const groupKeys = {};

// WebSocket logic
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Store the username in the socket object
    socket.on('user-joined', (userName) => {
        socket.userName = userName; // Save the user's name
    });

    // Event to handle room creation
    socket.on('create-room', ({ roomID, userName }) => {
        if (!groupKeys[roomID]) {
            // Generate a secure group key
            const groupKey = crypto.randomBytes(32).toString('hex');
            groupKeys[roomID] = groupKey; // Store the key
            console.log(`Room created: ${roomID} with key: ${groupKey}`);
        }

        socket.join(roomID);
        socket.userName = userName; // Save the user's name
        console.log(`Room created: ${roomID} by ${userName}`);
        socket.emit('room-created', { roomID, groupKey: groupKeys[roomID] }); // Notify the creator with the group key
    });

    // Event to handle room joining
    socket.on('join-room', ({ roomID, userName }) => {
        const rooms = io.sockets.adapter.rooms;
        if (rooms.has(roomID)) {
            socket.join(roomID);
            socket.userName = userName; // Save the user's name
            console.log(`User ${userName} joined room: ${roomID}`);
            socket.emit('room-joined', { roomID, groupKey: groupKeys[roomID] }); // Send the group key to the user
            
            // Notify other users in the room that a new user has joined
            socket.to(roomID).emit('user-joined', userName); 
        } else {
            socket.emit('error', 'Room does not exist.');
        }
    });

    // Event to handle message sending
    socket.on('send-message', ({ roomID, encryptedMessage }) => {
        console.log(`Encrypted message in room ${roomID} from ${socket.userName}`);
        io.to(roomID).emit('receive-message', { sender: socket.userName, encryptedMessage }); // Broadcast encrypted message to the room
    });

    // Event to handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
