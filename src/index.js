import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { registerRoomHandlers } from "./socket/roomHandlers.js";

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  registerRoomHandlers(io, socket);
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
