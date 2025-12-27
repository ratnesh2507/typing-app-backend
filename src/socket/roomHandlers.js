import crypto from "crypto";
import { calculateWPM } from "../utils/wpm.js";
import { calculateAccuracy } from "../utils/accuracy.js";

const rooms = {};
const socketToRoom = {};

/* Anti-Cheat Config */
const MAX_WPM = 220;
const MIN_RACE_TIME_MS = 3000;
const MAX_CHAR_JUMP = 10;

/*
Room structure:
rooms[roomId] = {
  roomId,
  text,
  users: {
    socketId: {
      username,
      progress,
      finished,
      charsTyped,
      correctChars,
      wpm,
      accuracy,
      finishTime,
      lastTypedLength,
      lastUpdateTime,
      cheatFlags,
      disqualified
    }
  },
  status: "waiting" | "running" | "finished",
  startTime
}
*/

export function registerRoomHandlers(io, socket) {
  // --- Create Room ---
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

  // --- Join Room ---
  socket.on("join-room", ({ roomId, username }) => {
    if (!rooms[roomId]) {
      socket.emit("error", "Room not found");
      return;
    }
    joinRoom(roomId, username);
  });

  // --- Start Race ---
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

  // --- Typing Progress with Anti-Cheat ---
  socket.on("typing-progress", ({ roomId, typedText }) => {
    const room = rooms[roomId];
    if (!room) return;

    const user = room.users[socket.id];
    if (!user || user.disqualified) return;

    const now = Date.now();
    const originalText = room.text;

    if (user.lastUpdateTime === null) {
      user.lastUpdateTime = now;
    }

    // 🛑 Paste Detection
    const charJump = typedText.length - user.lastTypedLength;
    if (charJump > MAX_CHAR_JUMP) {
      return disqualifyUser(io, roomId, socket.id, "Paste detected");
    }

    // Accuracy
    let correctChars = 0;
    for (let i = 0; i < typedText.length; i++) {
      if (typedText[i] === originalText[i]) correctChars++;
    }

    user.charsTyped = typedText.length;
    user.correctChars = correctChars;
    user.progress = Math.min(
      Math.round((typedText.length / originalText.length) * 100),
      100
    );
    user.lastTypedLength = typedText.length;
    user.lastUpdateTime = now;

    // 🛑 Speed Hack Detection
    const wpm = calculateWPM(user.charsTyped, room.startTime, now);
    if (wpm > MAX_WPM) {
      return disqualifyUser(io, roomId, socket.id, "WPM limit exceeded");
    }

    io.to(roomId).emit("progress-update", {
      socketId: socket.id,
      progress: user.progress,
    });

    // Auto-finish
    if (typedText.length >= originalText.length) {
      if (now - room.startTime < MIN_RACE_TIME_MS) {
        return disqualifyUser(io, roomId, socket.id, "Finished too fast");
      }
      finishRace(roomId, socket.id);
    }
  });

  // --- Disconnect ---
  socket.on("disconnect", () => {
    const roomId = socketToRoom[socket.id];
    if (!roomId) return;

    const room = rooms[roomId];
    if (!room) return;

    delete room.users[socket.id];
    delete socketToRoom[socket.id];

    io.to(roomId).emit("user-joined", { users: room.users });

    if (Object.keys(room.users).length === 0) {
      delete rooms[roomId];
    }
  });

  // --- Helper Functions ---
  function joinRoom(roomId, username) {
    socket.join(roomId);
    socketToRoom[socket.id] = roomId;

    rooms[roomId].users[socket.id] = {
      username,
      progress: 0,
      finished: false,
      charsTyped: 0,
      correctChars: 0,
      wpm: 0,
      accuracy: 0,
      finishTime: null,
      lastTypedLength: 0,
      lastUpdateTime: null,
      cheatFlags: [],
      disqualified: false,
    };

    io.to(roomId).emit("user-joined", {
      users: rooms[roomId].users,
    });
  }

  function finishRace(roomId, socketId) {
    const room = rooms[roomId];
    if (!room) return;

    const user = room.users[socketId];
    if (!user || user.finished) return;

    user.finished = true;
    user.finishTime = Date.now();
    user.wpm = calculateWPM(user.charsTyped, room.startTime, user.finishTime);
    user.accuracy = calculateAccuracy(user.correctChars, user.charsTyped);

    io.to(roomId).emit("user-finished", {
      socketId,
      stats: {
        wpm: user.wpm,
        accuracy: user.accuracy,
      },
    });

    const allFinished = Object.values(room.users).every((u) => u.finished);
    if (allFinished) {
      room.status = "finished";
      io.to(roomId).emit("race-ended", { results: room.users });
    }
  }

  function disqualifyUser(io, roomId, socketId, reason) {
    const room = rooms[roomId];
    if (!room) return;

    const user = room.users[socketId];
    if (!user || user.disqualified) return;

    user.disqualified = true;
    user.finished = true;
    user.cheatFlags.push(reason);

    io.to(roomId).emit("user-disqualified", { socketId, reason });

    // Check if all finished after disqualification
    const allFinished = Object.values(room.users).every((u) => u.finished);
    if (allFinished) {
      room.status = "finished";
      io.to(roomId).emit("race-ended", { results: room.users });
    }
  }
}

function getSampleText() {
  return "The quick brown fox jumps over the lazy dog.";
}
