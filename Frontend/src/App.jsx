import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import socket from './socket';
import CryptoJS from 'crypto-js'; // Import CryptoJS

const App = () => {
    const [roomID, setRoomID] = useState('');
    const [userName, setUserName] = useState('');
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [isInRoom, setIsInRoom] = useState(false);
    const [joinMessage, setJoinMessage] = useState('');
    const [groupKey, setGroupKey] = useState(null); // Store the group key

    const messagesEndRef = useRef(null);

    useEffect(() => {
        socket.on('room-created', ({ roomID, groupKey }) => {
            console.log(`Room created: ${roomID}`);
            setGroupKey(groupKey);
        });

        socket.on('room-joined', ({ roomID, groupKey }) => {
            console.log(`Joined room: ${roomID}`);
            setIsInRoom(true);
            setGroupKey(groupKey); // Save the group key
        });

        socket.on('user-joined', (userName) => {
            setJoinMessage(`${userName} has joined the room`);
            setMessages((prev) => [...prev, { sender: 'System', message: `${userName} has joined the room` }]);

            const timer = setTimeout(() => setJoinMessage(''), 5000);
            return () => clearTimeout(timer);
        });

        socket.on('receive-message', ({ sender, encryptedMessage }) => {
            // Decrypt the message
            const bytes = CryptoJS.AES.decrypt(encryptedMessage, groupKey);
            const decryptedMessage = bytes.toString(CryptoJS.enc.Utf8);

            setMessages((prev) => [...prev, { sender, message: decryptedMessage }]);
        });

        return () => {
            socket.off('room-created');
            socket.off('room-joined');
            socket.off('user-joined');
            socket.off('receive-message');
        };
    }, [groupKey]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const createRoom = () => {
        if (userName.trim() === '') {
            alert('Please enter your name before creating a room.');
            return;
        }
        socket.emit('create-room', { roomID, userName });
        setIsInRoom(true);
    };

    const joinRoom = () => {
        if (userName.trim() === '' || roomID.trim() === '') {
            alert('Please enter both Room ID and your Name before joining.');
            return;
        }
        socket.emit('join-room', { roomID, userName });
        if (userName.trim() !== '') {
            socket.emit('user-joined', userName);
        }
    };

    const sendMessage = () => {
        if (message.trim() === '') return;

        // Encrypt the message
        const encryptedMessage = CryptoJS.AES.encrypt(message, groupKey).toString();

        // Emit the encrypted message
        socket.emit('send-message', { roomID, encryptedMessage });

        setMessage('');
    };

    return (
        <div className="container">
            {!isInRoom && (
                <>
                    <h1 className="title">Chat App</h1>
                    <input
                        type="text"
                        placeholder="Room ID"
                        value={roomID}
                        onChange={(e) => setRoomID(e.target.value)}
                        className="input"
                    />
                    <input
                        type="text"
                        placeholder="Your Name"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        className="input"
                    />
                    <div className="button-container">
                        <button onClick={createRoom} className="button">Create Room</button>
                        <button onClick={joinRoom} className="button">Join Room</button>
                    </div>
                </>
            )}

            {isInRoom && (
                <div className="messages-container">
                    {joinMessage && <div className="join-notification">{joinMessage}</div>}
                    <div className="messages-list">
                        {messages.map((msg, index) => (
                            <div key={index} className={`message ${msg.sender === userName ? 'sent' : 'received'}`}>
                                <strong>{msg.sender === userName ? 'You' : msg.sender}:</strong> {msg.message}
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                    <div className="message-input-container">
                        <input
                            type="text"
                            placeholder="Type a message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        />
                        <button onClick={sendMessage}>Send</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
