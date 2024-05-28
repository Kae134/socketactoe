import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const socket = io('http://localhost:3001');

function App() {
    const [room, setRoom] = useState('');
    const [joined, setJoined] = useState(false);
    const [game, setGame] = useState(null);
    const [message, setMessage] = useState('');

    useEffect(() => {
        socket.on('joined', (game) => {
            setJoined(true);
            setGame(game);
        });

        socket.on('start', (game) => {
            setGame(game);
            setMessage('Game started!');
        });

        socket.on('move made', (game) => {
            setGame(game);
        });

        socket.on('game over', ({ winner }) => {
            setMessage(winner === 'Draw' ? 'It\'s a draw!' : `Player ${winner} wins!`);
        });

        socket.on('player disconnected', () => {
            setMessage('Opponent disconnected. Game over.');
        });

        return () => {
            socket.off('joined');
            socket.off('start');
            socket.off('move made');
            socket.off('game over');
            socket.off('player disconnected');
        };
    }, []);

    const joinRoom = () => {
        socket.emit('create or join', room);
    };

    const makeMove = (index) => {
        if (game && game.board[index] === null) {
            socket.emit('make move', { room, index });
        }
    };

    return (
        <div className="App">
            {!joined ? (
                <div>
                    <input
                        type="text"
                        value={room}
                        onChange={(e) => setRoom(e.target.value)}
                        placeholder="Enter room name"
                    />
                    <button onClick={joinRoom}>Join Room</button>
                </div>
            ) : (
                <div>
                    <h1>Tic-Tac-Toe</h1>
                    <div className="board">
                        {game.board.map((cell, index) => (
                            <div key={index} className="cell" onClick={() => makeMove(index)}>
                                {cell}
                            </div>
                        ))}
                    </div>
                    <p>{message}</p>
                </div>
            )}
        </div>
    );
}

export default App;
