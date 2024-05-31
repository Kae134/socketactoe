import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import "./App.css";

const socket = io("http://localhost:3001");

function App() {
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);
  const [game, setGame] = useState(null);
  const [message, setMessage] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    socket.on("joined", (game) => {
      setJoined(true);
      setGame(game);
    });

    socket.on("start", (game) => {
      setGame(game);
      setMessage("Game started!");
    });

    socket.on("move_made", (game) => {
      setGame(game);
    });

    socket.on("game_over", ({ winner }) => {
      setMessage(winner === "Draw" ? "It's a draw!" : `Player ${winner} wins!`);
    });

    socket.on("game_reset", (game) => {
      setGame(game);
      setMessage("Game reset!");
    });

    socket.on("player_disconnected", () => {
      setMessage("Opponent disconnected. Game over.");
    });

    return () => {
      socket.off("joined");
      socket.off("start");
      socket.off("move_made");
      socket.off("game_over");
      socket.off("game_reset");
      socket.off("player_disconnected");
    };
  }, []);

  const joinRoom = () => {
    const roomName = inputRef.current.value;
    setRoom(roomName);
    socket.emit("create_or_join", roomName);
  };

  const makeMove = (index) => {
    console.log("make move");
    console.log(room);
    if (game && game.board[index] === null) {
      socket.emit("make_move", { room, index });
    }
  };

  const resetGame = () => {
    socket.emit("reset_game", room);
  };

  return (
    <div className="App">
      {!joined ? (
        <div>
          <input type="text" ref={inputRef} placeholder="Enter room name" />
          <button onClick={joinRoom}>Join Room</button>
        </div>
      ) : (
        <div>
          <h1>Tic-Tac-Toe</h1>
          <h2>Room: {room}</h2>
          <div className="board">
            {game.board.map((cell, index) => (
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
}

export default App;
