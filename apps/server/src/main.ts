import express from 'express';
import dotenv from 'dotenv';
import http from 'http';
import { Server, Socket } from 'socket.io';
import mongoose, { Document, Schema } from 'mongoose';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:4200',
    methods: ['GET', 'POST'],
  },
});

const uri = `mongodb+srv://toto:toto@todocluster.edut0b8.mongodb.net/?retryWrites=true&w=majority&appName=toDoCluster`;

mongoose
  .connect(uri)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Failed to connect to MongoDB', err));

interface IRoom extends Document {
  room: string;
  winsX: number;
  winsO: number;
}

const roomSchema = new Schema<IRoom>({
  room: { type: String, required: true, unique: true },
  winsX: { type: Number, default: 0 },
  winsO: { type: Number, default: 0 },
});

const Room = mongoose.model<IRoom>('Room', roomSchema);

interface Game {
  board: (string | null)[];
  currentPlayer: string;
  players: string[];
}

const games: { [key: string]: Game } = {};

io.on('connection', (socket: Socket) => {
  console.log('A user connected:', socket.id);

  socket.on('create_or_join', async (room: string) => {
    if (!games[room]) {
      games[room] = {
        board: Array(9).fill(null),
        currentPlayer: 'X',
        players: [],
      };
      await Room.findOneAndUpdate(
        { room },
        { $setOnInsert: { room, winsX: 0, winsO: 0 } },
        { upsert: true, new: true }
      );
    }

    if (games[room].players.length < 2) {
      games[room].players.push(socket.id);
      socket.join(room);

      const roomData = await Room.findOne({ room });
      io.to(socket.id).emit('joined', { game: games[room], scores: roomData });

      if (games[room].players.length === 2) {
        io.to(room).emit('start', { game: games[room], scores: roomData });
      }
    } else {
      socket.emit('full', room);
    }
  });

  socket.on(
    'make_move',
    async ({ room, index }: { room: string; index: number }) => {
      const game = games[room];
      if (
        game &&
        game.players.includes(socket.id) &&
        game.board[index] === null
      ) {
        if (
          (socket.id === game.players[0] && game.currentPlayer === 'X') ||
          (socket.id === game.players[1] && game.currentPlayer === 'O')
        ) {
          game.board[index] = game.currentPlayer;
          game.currentPlayer = game.currentPlayer === 'X' ? 'O' : 'X';
          io.to(room).emit('move_made', { game });

          const winner = checkWinner(game.board);
          if (winner) {
            if (winner === 'X') {
              await Room.findOneAndUpdate({ room }, { $inc: { winsX: 1 } });
            } else {
              await Room.findOneAndUpdate({ room }, { $inc: { winsO: 1 } });
            }
            const updatedRoomData = await Room.findOne({ room });
            io.to(room).emit('game_over', { winner, scores: updatedRoomData });
          } else if (game.board.every((cell) => cell !== null)) {
            io.to(room).emit('game_over', {
              winner: 'Draw',
              scores: await Room.findOne({ room }),
            });
          }
        }
      }
    }
  );

  socket.on('reset_game', async (room: string) => {
    if (games[room]) {
      games[room].board = Array(9).fill(null);
      const roomData = await Room.findOne({ room });
      io.to(room).emit('game_reset', { game: games[room], scores: roomData });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    for (const room in games) {
      if (games[room].players.includes(socket.id)) {
        io.to(room).emit('player_disconnected');
        delete games[room];
      }
    }
  });
});

const checkWinner = (board: (string | null)[]): string | null => {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
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
