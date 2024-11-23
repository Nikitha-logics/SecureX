import React, { useState, useEffect } from 'react';
import socket from './socket';

const App = () => {
    const [roomID, setRoomID] = useState('');
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);

    useEffect(() => {
        socket.on('room-created', (roomID) => {
            console.log(`Room created: ${roomID}`);
        });

        socket.on('room-joined', (roomID) => {
            console.log(`Joined room: ${roomID}`);
        });

        socket.on('receive-message', ({ sender, message }) => {
            setMessages((prev) => [...prev, `${sender}: ${message}`]);
        });

        return () => {
            socket.off('room-created');
            socket.off('room-joined');
            socket.off('receive-message');
        };
    }, []);

    const createRoom = () => {
        socket.emit('create-room', roomID);
    };

    const joinRoom = () => {
        socket.emit('join-room', roomID);
    };

    const sendMessage = () => {
        socket.emit('send-message', { roomID, message });
        setMessages((prev) => [...prev, `You: ${message}`]);
        setMessage('');
    };

    return (
        <div>
            <h1>Chat App</h1>
            <input
                type="text"
                placeholder="Room ID"
                value={roomID}
                onChange={(e) => setRoomID(e.target.value)}
            />
            <button onClick={createRoom}>Create Room</button>
            <button onClick={joinRoom}>Join Room</button>

            <div>
                <h2>Messages</h2>
                <div>
                    {messages.map((msg, index) => (
                        <p key={index}>{msg}</p>
                    ))}
                </div>
                <input
                    type="text"
                    placeholder="Message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                />
                <button onClick={sendMessage}>Send Message</button>
            </div>
        </div>
    );
};

export default App;
