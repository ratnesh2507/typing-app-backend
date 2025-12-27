import crypto from "crypto";

const rooms = {};

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
    if (!room) return;

    room.users[socket.id].progress = progress;

    io.to(roomId).emit("progress-update", {
      socketId: socket.id,
      progress,
    });
  });

  // Finish Race
  socket.on("finish-race", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;

    room.users[socket.id].finished = true;

    const allFinished = Object.values(room.users).every((u) => u.finished);

    if (allFinished) {
      room.status = "finished";
      io.to(roomId).emit("race-ended");
    }
  });

  // Helper
  function joinRoom(roomId, username) {
    socket.join(roomId);

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
