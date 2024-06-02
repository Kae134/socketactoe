import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import './app.module.css';

const socket = io('http://localhost:3001');

const App: React.FC = () => {
  const [room, setRoom] = useState<string>('');
  const [joined, setJoined] = useState<boolean>(false);
  const [game, setGame] = useState<{
    board: (string | null)[];
    currentPlayer: string;
  } | null>(null);
  const [message, setMessage] = useState<string>('');
  const [scores, setScores] = useState<{ winsX: number; winsO: number }>({
    winsX: 0,
    winsO: 0,
  });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    socket.on('joined', ({ game, scores }) => {
      console.log('joined', game, scores);
      setJoined(true);
      setGame(game);
      setScores(scores);
    });

    socket.on('start', ({ game, scores }) => {
      console.log('start', game, scores);
      setGame(game);
      setScores(scores);
      setMessage('Game started!');
    });

    socket.on('move_made', ({ game }) => {
      console.log('move_made', game);
      setGame(game);
    });

    socket.on('game_over', ({ winner, scores }) => {
      console.log('game_over', winner, scores);
      setScores(scores);
      setMessage(winner === 'Draw' ? "It's a draw!" : `Player ${winner} wins!`);
    });

    socket.on('game_reset', ({ game, scores }) => {
      console.log('game_reset', game, scores);
      setGame(game);
      setScores(scores);
      setMessage('Game reset!');
    });

    socket.on('player_disconnected', () => {
      console.log('player_disconnected');
      setMessage('Opponent disconnected. Game over.');
    });

    return () => {
      socket.off('joined');
      socket.off('start');
      socket.off('move_made');
      socket.off('game_over');
      socket.off('game_reset');
      socket.off('player_disconnected');
    };
  }, []);

  const joinRoom = () => {
    const roomName = inputRef.current?.value;
    if (roomName) {
      setRoom(roomName);
      socket.emit('create_or_join', roomName);
    }
  };

  const makeMove = (index: number) => {
    if (game && game.board[index] === null) {
      socket.emit('make_move', { room, index });
    }
  };

  const resetGame = () => {
    socket.emit('reset_game', room);
  };

  return (
    <div className="app">
      {!joined ? (
        <div>
          <input
            type="text"
            ref={inputRef}
            placeholder="Enter room name"
            autoFocus
          />
          <button onClick={joinRoom}>Join Room</button>
        </div>
      ) : (
        <div className="jeu">
          <h1>Tic-Tac-Toe</h1>
          <h2>Room: {room}</h2>
          <h3>
            <span>
              X = {scores.winsX} / O = {scores.winsO}
            </span>
          </h3>
          <div className="board">
            {game?.board.map((cell, index) => (
              <div key={index} className="cell" onClick={() => makeMove(index)}>
                {cell}
              </div>
            ))}
          </div>
          <button onClick={resetGame}>Reset Game</button>
          <p>{message}</p>
        </div>
      )}
    </div>
  );
};

export default App;
