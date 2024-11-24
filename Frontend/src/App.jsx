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
            setGroupKey(groupKey);
        });

        socket.on('room-joined', ({ roomID, groupKey }) => {
            setIsInRoom(true);
            setGroupKey(groupKey); // Save the group key
        });

        socket.on('user-joined', (userName) => {
            setJoinMessage(`${userName} has joined the room`);
            setMessages((prev) => [...prev, { sender: 'System', message: `${userName} has joined the room` }]);

            const timer = setTimeout(() => setJoinMessage(''), 5000);
            return () => clearTimeout(timer);
        });

        socket.on('receive-message', async ({ sender, encryptedMessage }) => {
            try {
                // Decrypt the message
                const bytes = CryptoJS.AES.decrypt(encryptedMessage, groupKey);
                const decryptedMessage = bytes.toString(CryptoJS.enc.Utf8);
        
                // Skip adding the message if it was sent by the current user
                if (sender === userName) return;
        
                // Process URLs in the decrypted message
                const processedMessage = await processMessageWithURLs(decryptedMessage);
        
                setMessages((prev) => [
                    ...prev,
                    { sender, message: processedMessage.formattedMessage, urlChecks: processedMessage.urlChecks },
                ]);
            } catch (error) {
                console.error('Error decrypting or processing message:', error);
            }
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

    const sendMessage = async () => {
        if (message.trim() === '') return;

        // Process message to detect and analyze URLs
        const processedMessage = await processMessageWithURLs(message);

        // Encrypt the message
        const encryptedMessage = CryptoJS.AES.encrypt(processedMessage.formattedMessage, groupKey).toString();

        // Emit the encrypted message
        socket.emit('send-message', { roomID, encryptedMessage });

        setMessage('');
        setMessages((prev) => [...prev, { sender: 'You', message: processedMessage.formattedMessage }]);
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
                            <div key={index} className={`message ${msg.sender === 'You' ? 'sent' : 'received'}`}>
                                {msg.sender !== 'You' && <strong>{msg.sender}:</strong>}
                                <span dangerouslySetInnerHTML={{ __html: msg.message }} />
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

// Helper Functions for URL Detection and Processing
async function processMessageWithURLs(messageText) {
    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([^\s]+\.[a-z]{2,})(\/[^\s]*)?/gi;
    const urls = messageText.match(urlRegex) || [];
    const urlChecks = [];

    for (const url of urls) {
        try {
            const response = await fetch('http://10.1.93.25:5000/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
            });
            const result = await response.json();
            const isSafe = result.safety_status === 'SAFE';
            urlChecks.push({ url, isSafe, prediction: result.prediction });
        } catch (error) {
            console.error(`Error checking URL ${url}:`, error);
            urlChecks.push({ url, isSafe: false });
        }
    }

    let formattedMessage = messageText;
    urlChecks.forEach((check) => {
        const safetyEmoji = check.isSafe ? '🔒' : '⚠️';
        const safetyText = check.isSafe ? '<b>SAFE</b>' : '<b>UNSAFE</b>';
        const safetyClass = check.isSafe ? 'safe' : 'unsafe';

        formattedMessage = formattedMessage.replace(
            check.url,
            `<span class="${safetyClass}">${safetyEmoji} ${safetyText} <a href="${check.url}" target="_blank">${check.url}</a></span>`
        );
    });

    return { formattedMessage, urlChecks };
}
