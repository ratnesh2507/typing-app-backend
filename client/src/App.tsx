import { useEffect, useState } from "react";
import { socket } from "./socket";

function App() {
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [users, setUsers] = useState<any>({});
  const [text, setText] = useState("");
  const [progress, setProgress] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    socket.on("connect", () => {
      setConnected(true);
      console.log("Connected:", socket.id);
    });

    socket.on("room-created", ({ roomId }) => {
      setRoomId(roomId);
    });

    socket.on("user-joined", ({ users }) => {
      setUsers(users);
    });

    socket.on("race-started", ({ text }) => {
      setText(text);
      setProgress(0);
    });

    socket.on("progress-update", ({ socketId, progress }) => {
      setUsers((prev: any) => ({
        ...prev,
        [socketId]: {
          ...prev[socketId],
          progress,
        },
      }));
    });

    socket.on("race-ended", () => {
      alert("Race Finished!");
    });

    return () => {
      socket.off();
    };
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Socket.IO Test Client</h2>

      <p>Status: {connected ? "🟢 Connected" : "🔴 Disconnected"}</p>

      <input
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <br />
      <br />

      <button onClick={() => socket.emit("create-room", { username })}>
        Create Room
      </button>

      <br />
      <br />

      <input
        placeholder="Room ID"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
      />

      <button onClick={() => socket.emit("join-room", { roomId, username })}>
        Join Room
      </button>

      <br />
      <br />

      <button onClick={() => socket.emit("start-race", { roomId })}>
        Start Race
      </button>

      <br />
      <br />

      {text && (
        <p>
          <strong>Text:</strong> {text}
        </p>
      )}

      <input
        type="range"
        min={0}
        max={100}
        value={progress}
        onChange={(e) => {
          const value = Number(e.target.value);
          setProgress(value);

          socket.emit("typing-progress", {
            roomId,
            progress: value,
          });

          if (value === 100) {
            socket.emit("finish-race", { roomId });
          }
        }}
      />

      <p>Your Progress: {progress}%</p>

      <hr />

      <h3>Players</h3>
      {Object.entries(users).map(([id, user]: any) => (
        <div key={id}>
          {user.username}: {user.progress}%
        </div>
      ))}
    </div>
  );
}

export default App;
