import { calculateWPM } from "../utils/wpm.js";
import { calculateAccuracy } from "../utils/accuracy.js";
import { sampleTexts } from "../utils/texts.js";
import { supabase } from "../lib/supabaseClient.js";

const rooms = {};
const socketToRoom = {};

/* Anti-Cheat Config */
const MAX_WPM = 220;
const MIN_RACE_TIME_MS = 3000;
const MAX_CHAR_JUMP = 10;
const MAX_RACE_DURATION_MS = 60_000; // 60 seconds

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
  // ---------------- CREATE ROOM ----------------
  socket.on("create-room", ({ username }) => {
    let roomId;
    do {
      roomId = generateShortRoomId(8); // 8-character room ID
    } while (rooms[roomId]); // ensure uniqueness

    rooms[roomId] = {
      roomId,
      text: getSampleText(),
      users: {},
      status: "waiting",
      startTime: null,
      dbRaceId: null,
      endTimeout: null,
    };

    joinRoom(roomId, username);
    socket.emit("room-created", { roomId });

    console.log(`[ROOM] Room ${roomId} created by ${username}`);
  });

  // ---------------- JOIN ROOM ----------------
  socket.on("join-room", ({ roomId, username }) => {
    if (!rooms[roomId]) {
      socket.emit("error", "Room not found");
      return;
    }

    joinRoom(roomId, username);
    console.log(`[ROOM] ${username} joined room ${roomId}`);
  });

  // ---------------- SYNC RACE STATE (for reloads) ----------------
  socket.on("sync-race-state", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;

    socket.emit("race-state", {
      status: room.status,
      startTime: room.startTime,
      text: room.text,
      users: room.users,
    });

    // If race already finished, immediately send results
    if (room.status === "finished") {
      socket.emit("race-ended", { results: room.users });
    }
  });

  // ---------------- START RACE ----------------
  socket.on("start-race", async ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || room.status !== "waiting") return;

    room.status = "running";
    room.startTime = Date.now();

    // 🗄️ Create race in DB
    const { data, error } = await supabase
      .from("races")
      .insert({
        text: room.text,
        started_at: new Date(room.startTime),
        room_id: roomId,
      })
      .select()
      .single();

    if (!error) {
      room.dbRaceId = data.id;
    }

    // ⏱️ HARD STOP — race timeout
    room.endTimeout = setTimeout(() => {
      endRace(room, io, "timeout");
    }, MAX_RACE_DURATION_MS);

    io.to(roomId).emit("race-started", {
      text: room.text,
      startTime: room.startTime,
    });

    console.log(`[RACE] Race started in room ${roomId}`);
  });

  // ---------------- TYPING PROGRESS ----------------
  socket.on("typing-progress", ({ roomId, typedText }) => {
    const room = rooms[roomId];
    if (!room) return;

    const user = room.users[socket.id];
    if (!user || user.disqualified) return;

    // 🔐 HARD GUARD — prevents crashes
    if (typeof typedText !== "string") return;

    const now = Date.now();
    const originalText = room.text;

    if (user.lastUpdateTime === null) user.lastUpdateTime = now;

    // Paste detection
    const charJump = typedText.length - user.lastTypedLength;
    if (charJump > MAX_CHAR_JUMP)
      return disqualifyUser(io, roomId, socket.id, "Paste detected");

    // Count correct chars
    let correctChars = 0;
    for (let i = 0; i < typedText.length && i < originalText.length; i++) {
      if (typedText[i] === originalText[i]) correctChars++;
      else break; // optional: stop at first mistake
    }

    user.charsTyped = typedText.length;
    user.correctChars = correctChars;
    user.progress = Math.min(
      Math.round((typedText.length / originalText.length) * 100),
      100
    );
    user.lastTypedLength = typedText.length;
    user.lastUpdateTime = now;

    // Calculate live stats
    const wpm = calculateWPM(user.charsTyped, room.startTime, now);
    const accuracy = calculateAccuracy(user.correctChars, user.charsTyped);

    // Anti-cheat
    if (wpm > MAX_WPM)
      return disqualifyUser(io, roomId, socket.id, "WPM limit exceeded");

    // Store stats
    user.wpm = wpm;
    user.accuracy = accuracy;

    // Emit EVERYTHING needed by PlayerCard
    io.to(roomId).emit("progress-update", {
      socketId: socket.id,
      progress: user.progress,
      wpm: user.wpm,
      accuracy: user.accuracy,
    });

    // Auto finish
    if (typedText.length >= originalText.length) {
      if (now - room.startTime < MIN_RACE_TIME_MS)
        return disqualifyUser(io, roomId, socket.id, "Finished too fast");

      finishRace(roomId, socket.id);
    }
  });

  // ---------------- DISCONNECT ----------------
  socket.on("disconnect", () => {
    const roomId = socketToRoom[socket.id];
    if (!roomId) return;

    const room = rooms[roomId];
    if (!room) return;

    const username = room.users[socket.id]?.username || "Unknown";

    delete room.users[socket.id];
    delete socketToRoom[socket.id];

    io.to(roomId).emit("user-joined", { users: room.users });

    console.log(`[DISCONNECT] ${username} left room ${roomId}`);

    if (Object.keys(room.users).length === 0) {
      delete rooms[roomId];
      console.log(`[ROOM] Room ${roomId} deleted (empty)`);
    }
  });

  // ---------------- HELPERS ----------------
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

    // ✅ Send full users list to joining socket
    socket.emit("join-confirmed", { users: rooms[roomId].users });
    socket.to(roomId).emit("user-joined", { users: rooms[roomId].users });
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
      stats: { wpm: user.wpm, accuracy: user.accuracy },
    });

    const allFinished = Object.values(room.users).every((u) => u.finished);
    if (allFinished) {
      endRace(room, io, "all_finished");
    }
  }

  async function endRace(room, io, reason = "completed") {
    if (room.status === "finished") return;

    room.status = "finished";

    // ⏱️ Clear timeout
    if (room.endTimeout) {
      clearTimeout(room.endTimeout);
      room.endTimeout = null;
    }

    const finishedAt = new Date();

    // 🧠 Mark unfinished users as DNF
    for (const user of Object.values(room.users)) {
      if (!user.finished) {
        user.finished = true;
        user.disqualified = true;
        user.cheatFlags.push("DNF");
        user.finishTime = null;
        user.wpm = 0;
        user.accuracy = 0;
      }
    }

    // 🗄️ Update race end time FIRST
    if (room.dbRaceId) {
      const { error } = await supabase
        .from("races")
        .update({ finished_at: finishedAt })
        .eq("id", room.dbRaceId);

      if (error) {
        console.error("[DB] Failed to update finished_at", error);
      }
    }

    // 🗄️ Persist participants
    await persistRaceResults(room);

    io.to(room.roomId).emit("race-ended", {
      reason,
      results: room.users,
    });

    console.log(`[RACE] Room ${room.roomId} ended | reason=${reason}`);
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

    console.log(
      `[CHEAT] ${user.username} disqualified in room ${roomId}: ${reason}`
    );

    const allFinished = Object.values(room.users).every((u) => u.finished);
    if (allFinished) {
      endRace(room, io, "all_finished");
    }
  }
}

// --------------------- HELPERS ---------------------
function generateShortRoomId(length = 8) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getSampleText() {
  const randomIndex = Math.floor(Math.random() * sampleTexts.length);
  return sampleTexts[randomIndex];
}

// DB Persistence
async function persistRaceResults(room) {
  if (!room.dbRaceId) return;

  const participants = Object.entries(room.users).map(([socketId, user]) => ({
    race_id: room.dbRaceId,
    user_id: user.username, // TEMP (we’ll map Clerk IDs later)
    wpm: user.wpm,
    accuracy: user.accuracy,
    chars_typed: user.charsTyped,
    correct_chars: user.correctChars,
    finished: user.finished,
    finish_time: user.finishTime ? new Date(user.finishTime) : null,
    disqualified: user.disqualified,
    cheat_flags: user.cheatFlags,
  }));

  const { error } = await supabase
    .from("race_participants")
    .insert(participants);

  if (error) {
    console.error("[DB] Failed to store race results", error);
  } else {
    console.log("[DB] Race results saved");
  }
}
