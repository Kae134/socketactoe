const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

let games = {};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('create_or_join', (room) => {
        if (!games[room]) {
            games[room] = {
                board: Array(9).fill(null),
                currentPlayer: 'X',
                players: [],
            };
        }

        if (games[room].players.length < 2) {
            games[room].players.push(socket.id);
            socket.join(room);
            io.to(socket.id).emit('joined', games[room]);
            if (games[room].players.length === 2) {
                io.to(room).emit('start', games[room]);
            }
        } else {
            socket.emit('full', room);
        }
    });

    socket.on('make_move', ({ room, index }) => {
        const game = games[room];
        console.log(socket.id)
        if (game && game.players.includes(socket.id) && game.board[index] === null) {
            if (socket.id === game.players[0] && game.currentPlayer === 'X') {
                game.board[index] = game.currentPlayer;
                game.currentPlayer = game.currentPlayer === 'X' ? 'O' : 'X';
                io.to(room).emit('move_made', game); 
            } 
            else if (socket.id === game.players[1] && game.currentPlayer === 'O') {
                game.board[index] = game.currentPlayer;
                game.currentPlayer = game.currentPlayer === 'X' ? 'O' : 'X';
                io.to(room).emit('move_made', game);
            }
            

            const winner = checkWinner(game.board);
            if (winner) {
                io.to(room).emit('game over', { winner });
                delete games[room];
            } else if (game.board.every(cell => cell !== null)) {
                io.to(room).emit('game over', { winner: 'Draw' });
                delete games[room];
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        for (const room in games) {
            if (games[room].players.includes(socket.id)) {
                io.to(room).emit('player disconnected');
                delete games[room];
            }
        }
    });
});

const checkWinner = (board) => {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    for (const [a, b, c] of lines) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
};

server.listen(3001, () => {
    console.log('Listening on *:3001');
});
