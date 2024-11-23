const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

// WebSocket logic
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Store the username in the socket object
    socket.on('user-joined', (userName) => {
        socket.userName = userName; // Save the user's name
    });

    // Event to handle room creation
    socket.on('create-room', ({ roomID, userName }) => {
        socket.join(roomID);
        socket.userName = userName; // Save the user's name
        console.log(`Room created: ${roomID} by ${userName}`);
        socket.emit('room-created', roomID); // Notify the creator
    });

    // Event to handle room joining
    socket.on('join-room', ({ roomID, userName }) => {
        const rooms = io.sockets.adapter.rooms;
        if (rooms.has(roomID)) {
            socket.join(roomID);
            socket.userName = userName; // Save the user's name
            console.log(`User ${userName} joined room: ${roomID}`);
            socket.emit('room-joined', roomID); // Notify the joining user
            
            // Notify other users in the room that a new user has joined
            socket.to(roomID).emit('user-joined', userName); 
        } else {
            socket.emit('error', 'Room does not exist.');
        }
    });

    // Event to handle message sending
    socket.on('send-message', ({ roomID, message }) => {
        console.log(`Message in room ${roomID} from ${socket.userName}: ${message}`);
        io.to(roomID).emit('receive-message', { sender: socket.userName, message }); // Broadcast to the room
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