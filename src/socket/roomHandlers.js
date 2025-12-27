import crypto from "crypto";
import { calculateWPM } from "../utils/wpm.js";
import { calculateAccuracy } from "../utils/accuracy.js";

const rooms = {};
const socketToRoom = {};

export function registerRoomHandlers(io, socket) {
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

  socket.on("join-room", ({ roomId, username }) => {
    if (!rooms[roomId]) {
      socket.emit("error", "Room not found");
      return;
    }
    joinRoom(roomId, username);
  });

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

  /**
   * Typing update
   * payload = {
   *   roomId,
   *   typedText
   * }
   */
  socket.on("typing-progress", ({ roomId, typedText }) => {
    const room = rooms[roomId];
    if (!room || !room.users[socket.id]) return;

    const originalText = room.text;

    let correctChars = 0;
    for (let i = 0; i < typedText.length; i++) {
      if (typedText[i] === originalText[i]) {
        correctChars++;
      }
    }

    const progress = Math.min(
      Math.round((typedText.length / originalText.length) * 100),
      100
    );

    room.users[socket.id].charsTyped = typedText.length;
    room.users[socket.id].correctChars = correctChars;
    room.users[socket.id].progress = progress;

    io.to(roomId).emit("progress-update", {
      socketId: socket.id,
      progress,
    });

    // Auto-finish when text completed
    if (typedText.length >= originalText.length) {
      finishRace(roomId);
    }
  });

  socket.on("disconnect", () => {
    const roomId = socketToRoom[socket.id];
    if (!roomId) return;

    const room = rooms[roomId];
    if (!room) return;

    delete room.users[socket.id];
    delete socketToRoom[socket.id];

    io.to(roomId).emit("user-joined", {
      users: room.users,
    });

    if (Object.keys(room.users).length === 0) {
      delete rooms[roomId];
      return;
    }
  });

  function finishRace(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    const user = room.users[socket.id];
    if (!user || user.finished) return;

    user.finished = true;
    user.finishTime = Date.now();

    user.wpm = calculateWPM(user.charsTyped, room.startTime, user.finishTime);

    user.accuracy = calculateAccuracy(user.correctChars, user.charsTyped);

    io.to(roomId).emit("user-finished", {
      socketId: socket.id,
      stats: {
        wpm: user.wpm,
        accuracy: user.accuracy,
      },
    });

    const allFinished = Object.values(room.users).every((u) => u.finished);

    if (allFinished) {
      room.status = "finished";
      io.to(roomId).emit("race-ended", {
        results: room.users,
      });
    }
  }

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
    };

    io.to(roomId).emit("user-joined", {
      users: rooms[roomId].users,
    });
  }
}

function getSampleText() {
  return "The quick brown fox jumps over the lazy dog.";
}
