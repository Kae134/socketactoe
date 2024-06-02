var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var import_express = __toESM(require("express"));
var import_dotenv = __toESM(require("dotenv"));
var import_http = __toESM(require("http"));
var import_socket = require("socket.io");
var import_mongoose = __toESM(require("mongoose"));
import_dotenv.default.config();
const app = (0, import_express.default)();
const server = import_http.default.createServer(app);
const io = new import_socket.Server(server, {
  cors: {
    origin: "http://localhost:4200",
    methods: ["GET", "POST"]
  }
});
const uri = `mongodb+srv://toto:toto@todocluster.edut0b8.mongodb.net/?retryWrites=true&w=majority&appName=toDoCluster`;
import_mongoose.default.connect(uri).then(() => console.log("Connected to MongoDB")).catch((err) => console.error("Failed to connect to MongoDB", err));
const roomSchema = new import_mongoose.Schema({
  room: { type: String, required: true, unique: true },
  winsX: { type: Number, default: 0 },
  winsO: { type: Number, default: 0 }
});
const Room = import_mongoose.default.model("Room", roomSchema);
const games = {};
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
  socket.on("create_or_join", async (room) => {
    if (!games[room]) {
      games[room] = {
        board: Array(9).fill(null),
        currentPlayer: "X",
        players: []
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
      io.to(socket.id).emit("joined", { game: games[room], scores: roomData });
      if (games[room].players.length === 2) {
        io.to(room).emit("start", { game: games[room], scores: roomData });
      }
    } else {
      socket.emit("full", room);
    }
  });
  socket.on(
    "make_move",
    async ({ room, index }) => {
      const game = games[room];
      if (game && game.players.includes(socket.id) && game.board[index] === null) {
        if (socket.id === game.players[0] && game.currentPlayer === "X" || socket.id === game.players[1] && game.currentPlayer === "O") {
          game.board[index] = game.currentPlayer;
          game.currentPlayer = game.currentPlayer === "X" ? "O" : "X";
          io.to(room).emit("move_made", { game });
          const winner = checkWinner(game.board);
          if (winner) {
            if (winner === "X") {
              await Room.findOneAndUpdate({ room }, { $inc: { winsX: 1 } });
            } else {
              await Room.findOneAndUpdate({ room }, { $inc: { winsO: 1 } });
            }
            const updatedRoomData = await Room.findOne({ room });
            io.to(room).emit("game_over", { winner, scores: updatedRoomData });
          } else if (game.board.every((cell) => cell !== null)) {
            io.to(room).emit("game_over", {
              winner: "Draw",
              scores: await Room.findOne({ room })
            });
          }
        }
      }
    }
  );
  socket.on("reset_game", async (room) => {
    if (games[room]) {
      games[room].board = Array(9).fill(null);
      const roomData = await Room.findOne({ room });
      io.to(room).emit("game_reset", { game: games[room], scores: roomData });
    }
  });
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    for (const room in games) {
      if (games[room].players.includes(socket.id)) {
        io.to(room).emit("player_disconnected");
        delete games[room];
      }
    }
  });
});
const checkWinner = (board) => {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
};
server.listen(3001, () => {
  console.log("Listening on *:3001");
});
//# sourceMappingURL=main.js.map
