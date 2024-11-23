const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require("cors")


const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

// WebSocket logic
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('create-room', (roomID) => {
        socket.join(roomID);
        console.log(`Room created: ${roomID}`);
        socket.emit('room-created', roomID);
    });

    socket.on('join-room', (roomID) => {
        const rooms = io.sockets.adapter.rooms;
        if (rooms.has(roomID)) {
            socket.join(roomID);
            console.log(`User ${socket.id} joined room: ${roomID}`);
            socket.emit('room-joined', roomID);
            socket.to(roomID).emit('user-joined', `${socket.id} has joined the room.`);
        } else {
            socket.emit('error', 'Room does not exist.');
        }
    });

    socket.on('send-message', ({ roomID, message }) => {
        console.log(`Message in room ${roomID}: ${message}`);
        socket.to(roomID).emit('receive-message', { sender: socket.id, message });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
