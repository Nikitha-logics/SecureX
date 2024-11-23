import React, { useState, useEffect, useRef } from 'react';
import './App.css'; // Importing the CSS file
import socket from './socket'; // Ensure this is the correct path to your socket connection

const App = () => {
    const [roomID, setRoomID] = useState('');
    const [userName, setUserName] = useState('');
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [isInRoom, setIsInRoom] = useState(false);
    const [joinMessage, setJoinMessage] = useState('');

    const messagesEndRef = useRef(null);

    useEffect(() => {
        socket.on('room-created', (roomID) => {
            console.log(`Room created: ${roomID}`);
        });

        socket.on('room-joined', (roomID) => {
            console.log(`Joined room: ${roomID}`);
            setIsInRoom(true);
        });

        socket.on('user-joined', (userName) => {
            setJoinMessage(`${userName} has joined the room`);
            setMessages((prev) => [...prev, { sender: 'System', message: `${userName} has joined the room` }]);

            // Clear the join message after 5 seconds
            const timer = setTimeout(() => setJoinMessage(''), 5000);
            return () => clearTimeout(timer);
        });

        socket.on('receive-message', ({ sender, message, time }) => {
            setMessages((prev) => [...prev, { sender, message, time }]);
        });

        return () => {
            socket.off('room-created');
            socket.off('room-joined');
            socket.off('user-joined');
            socket.off('receive-message');
        };
    }, []);

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

        const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const formattedMessage = { sender: userName, message, time: currentTime };

        // Emit the message to the server
        socket.emit('send-message', { roomID, ...formattedMessage });

        // Clear the input field
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
                <div className="messages-container" style={{ display: 'flex', flexDirection: 'column', height: '80vh', overflowY: 'auto' }}>
                    {joinMessage && (
                        <div
                            className="join-notification"
                            style={{
                                backgroundColor: '#007bff',
                                color: '#fff',
                                padding: '10px',
                                textAlign: 'center',
                                marginBottom: '10px',
                                borderRadius: '5px',
                                fontWeight: 'bold',
                            }}
                        >
                            {joinMessage}
                        </div>
                    )}
                    <div
                        className="messages-list"
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            flex: 1,
                            padding: '10px',
                        }}
                    >
                        {messages.map((msg, index) => (
                            <div
                                key={index}
                                className={`message ${
                                    msg.sender === userName
                                        ? 'sent'
                                        : msg.sender === 'System'
                                        ? 'system'
                                        : 'received'
                                }`}
                                style={{
                                    position: 'relative',
                                    padding: '10px',
                                    margin: '5px 0',
                                    borderRadius: '10px',
                                    backgroundColor:
                                        msg.sender === userName
                                            ? '#d1e7dd' // Green for the sender
                                            : msg.sender === 'System'
                                            ? '#fff3cd' // Yellow for system messages
                                            : '#f8d7da', // Red for other users
                                    color:
                                        msg.sender === userName
                                            ? '#0f5132' // Dark green text
                                            : msg.sender === 'System'
                                            ? '#856404' // Dark yellow text
                                            : '#842029', // Dark red text
                                    textAlign: 'left',
                                    maxWidth: '50%',
                                    wordWrap: 'break-word',
                                    overflowWrap: 'break-word',
                                    alignSelf:
                                        msg.sender === userName
                                            ? 'flex-end'
                                            : msg.sender === 'System'
                                            ? 'center'
                                            : 'flex-start',
                                }}
                            >
                                <div style={{ fontWeight: 'bold', textAlign: msg.sender === 'System' ? 'center' : 'left' }}>
                                    {msg.sender === userName
                                        ? 'You'
                                        : msg.sender === 'System'
                                        ? 'System'
                                        : msg.sender}:
                                </div>
                                <div>{msg.message}</div>
                                <div
                                    style={{
                                        fontSize: '0.7rem',
                                        color: '#6c757d',
                                        textAlign: 'right',
                                        marginTop: '5px',
                                    }}
                                >
                                    {msg.time}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                    <div className="message-input-container" style={{ display: 'flex', alignItems: 'center' }}>
                        <input
                            type="text"
                            placeholder="Type a message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    sendMessage();
                                }
                            }}
                            className="message-input"
                            style={{
                                width: 'calc(100% - 60px)',
                                padding: '10px',
                                borderRadius: '20px',
                                border: '1px solid #ccc',
                                marginRight: '10px',
                            }}
                        />
                        <button
                            onClick={sendMessage}
                            className="send-button"
                            style={{
                                backgroundColor: '#007bff',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '20px',
                                padding: '10px 20px',
                                cursor: 'pointer',
                            }}
                        >
                            Send
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;