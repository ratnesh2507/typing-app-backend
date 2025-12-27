import { useEffect, useState } from "react";
import { socket } from "./socket";

type User = {
  username: string;
  progress: number;
  finished: boolean;
  wpm?: number;
  accuracy?: number;
  disqualified?: boolean;
};

type UsersMap = Record<string, User>;

export default function App() {
  const [username, setUsername] = useState<string>("");
  const [roomId, setRoomId] = useState<string>("");
  const [users, setUsers] = useState<UsersMap>({});
  const [text, setText] = useState<string>("");
  const [typedText, setTypedText] = useState<string>("");
  const [connected, setConnected] = useState<boolean>(false);
  const [raceFinished, setRaceFinished] = useState<boolean>(false);

  useEffect(() => {
    socket.on("connect", () => {
      setConnected(true);
      console.log("Connected:", socket.id);
    });

    socket.on("room-created", ({ roomId }: { roomId: string }) => {
      setRoomId(roomId);
    });

    socket.on("user-joined", ({ users }: { users: UsersMap }) => {
      setUsers(users);
    });

    socket.on("race-started", ({ text }: { text: string }) => {
      setText(text);
      setTypedText("");
      setRaceFinished(false);
    });

    socket.on(
      "progress-update",
      ({ socketId, progress }: { socketId: string; progress: number }) => {
        setUsers((prev) => ({
          ...prev,
          [socketId]: {
            ...prev[socketId],
            progress,
          },
        }));
      }
    );

    socket.on(
      "user-finished",
      ({
        socketId,
        stats,
      }: {
        socketId: string;
        stats: { wpm: number; accuracy: number };
      }) => {
        setUsers((prev) => ({
          ...prev,
          [socketId]: {
            ...prev[socketId],
            ...stats,
            finished: true,
          },
        }));
      }
    );

    socket.on(
      "user-disqualified",
      ({ socketId, reason }: { socketId: string; reason: string }) => {
        alert(
          `${users[socketId]?.username || socketId} disqualified: ${reason}`
        );
        setUsers((prev) => ({
          ...prev,
          [socketId]: {
            ...prev[socketId],
            disqualified: true,
            finished: true,
          },
        }));
      }
    );

    socket.on("race-ended", ({ results }: { results: UsersMap }) => {
      setUsers(results);
      setRaceFinished(true);
      alert("Race Finished!");
    });

    return () => {
      socket.off();
    };
  }, [users]);

  const isDisabled = (socketId?: string) =>
    raceFinished || (socketId && users[socketId]?.disqualified);

  return (
    <div style={{ padding: 20, maxWidth: 720 }}>
      <h2>Typing Speed Battle — Test Client (TS + Anti-Cheat)</h2>

      <p>Status: {connected ? "🟢 Connected" : "🔴 Disconnected"}</p>

      <input
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        disabled={raceFinished}
      />

      <br />
      <br />

      <button
        onClick={() => socket.emit("create-room", { username })}
        disabled={raceFinished}
      >
        Create Room
      </button>

      <br />
      <br />

      <input
        placeholder="Room ID"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        disabled={raceFinished}
      />

      <button
        onClick={() => socket.emit("join-room", { roomId, username })}
        disabled={raceFinished}
      >
        Join Room
      </button>

      <br />
      <br />

      <button
        onClick={() => socket.emit("start-race", { roomId })}
        disabled={raceFinished}
      >
        Start Race
      </button>

      <br />
      <br />

      {text && (
        <>
          <p>
            <strong>Text to type:</strong>
          </p>
          <p style={{ background: "#eee", padding: 10 }}>{text}</p>

          <textarea
            rows={4}
            style={{ width: "100%" }}
            value={typedText}
            disabled={raceFinished}
            onChange={(e) => {
              const value = e.target.value;
              setTypedText(value);

              socket.emit("typing-progress", {
                roomId,
                typedText: value,
              });
            }}
          />
        </>
      )}

      <hr />

      <h3>Players</h3>
      {Object.entries(users).map(([id, user]) => (
        <div key={id} style={{ marginBottom: 8 }}>
          <strong>{user.username}</strong> — {user.progress ?? 0}%
          {user.finished && !user.disqualified && (
            <>
              {" "}
              | 🏁 WPM: {user.wpm} | 🎯 Accuracy: {user.accuracy}%
            </>
          )}
          {user.disqualified && (
            <span style={{ color: "red" }}> | ❌ Disqualified</span>
          )}
        </div>
      ))}
    </div>
  );
}
