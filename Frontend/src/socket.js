import { io } from 'socket.io-client';

// Connect to the backend server
const socket = io('http://localhost:3000', {
    transports: ['websocket'], // Ensure WebSocket transport
});

export default socket;
