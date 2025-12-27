import crypto from "crypto";

const rooms = {};
const socketToRoom = {};

/*
Room structure:
rooms[roomId] = {
  roomId,
  text,
  users: {
    socketId: {
      username,
      progress,
      finished
    }
  },
  status: "waiting" | "running" | "finished",
  startTime
}
*/

export function registerRoomHandlers(io, socket) {
  // Create Room
  socket.on("create-room", ({ username }) => {
    const roomId = crypto.randomUUID();

    rooms[roomId] = {
      roomId,
      text: getSampleText(),
      users: {},
      status: "waiting",
      startTime: null,
    };

    joinRoom(roomId, username);
    socket.emit("room-created", { roomId });
  });

  // Join Room
  socket.on("join-room", ({ roomId, username }) => {
    if (!rooms[roomId]) {
      socket.emit("error", "Room not found");
      return;
    }
    joinRoom(roomId, username);
  });

  // Start Race
  socket.on("start-race", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || room.status !== "waiting") return;

    room.status = "running";
    room.startTime = Date.now();

    io.to(roomId).emit("race-started", {
      text: room.text,
      startTime: room.startTime,
    });
  });

  // Typing Progress
  socket.on("typing-progress", ({ roomId, progress }) => {
    const room = rooms[roomId];
    if (!room || !room.users[socket.id]) return;

    room.users[socket.id].progress = progress;

    io.to(roomId).emit("progress-update", {
      socketId: socket.id,
      progress,
    });
  });

  // Finish Race
  socket.on("finish-race", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || !room.users[socket.id]) return;

    if (room.users[socket.id].finished) return;

    room.users[socket.id].finished = true;

    const allFinished = Object.values(room.users).every((u) => u.finished);

    if (allFinished) {
      room.status = "finished";
      io.to(roomId).emit("race-ended");
    }
  });

  // Handle Disconnect
  socket.on("disconnect", () => {
    const roomId = socketToRoom[socket.id];
    if (!roomId) return;

    const room = rooms[roomId];
    if (!room) return;

    console.log(`User ${socket.id} disconnected from room ${roomId}`);

    // Remove user from room
    delete room.users[socket.id];
    delete socketToRoom[socket.id];

    // Notify remaining users
    io.to(roomId).emit("user-joined", {
      users: room.users,
    });

    // If room empty → delete it
    if (Object.keys(room.users).length === 0) {
      delete rooms[roomId];
      console.log(`Room ${roomId} deleted`);
      return;
    }

    // If race running, check if remaining users all finished
    if (room.status === "running") {
      const allFinished = Object.values(room.users).every((u) => u.finished);

      if (allFinished) {
        room.status = "finished";
        io.to(roomId).emit("race-ended");
      }
    }
  });

  // Helper
  function joinRoom(roomId, username) {
    socket.join(roomId);
    socketToRoom[socket.id] = roomId;

    rooms[roomId].users[socket.id] = {
      username,
      progress: 0,
      finished: false,
    };

    io.to(roomId).emit("user-joined", {
      users: rooms[roomId].users,
    });
  }
}

// Sample Text Generator
function getSampleText() {
  return "The quick brown fox jumps over the lazy dog.";
}
