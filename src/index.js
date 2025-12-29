import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { registerRoomHandlers } from "./socket/roomHandlers.js";
import { config } from "dotenv";

config();
const app = express();
app.use(cors());

// Health check
app.get("/", (req, res) => {
  res.send("Typing Race backend is running 🚀");
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// Socket.IO connection
io.on("connection", (socket) => {
  // We no longer log every connection
  // RoomHandlers will log meaningful events like room creation, join, race start, finish, disconnect
  registerRoomHandlers(io, socket);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
