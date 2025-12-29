# Rapid Type Challenge 🕹️

A fun, retro-style multiplayer typing race game where players compete to type texts as fast and accurately as possible. Inspired by arcade aesthetics with neon pixel-style design and live progress updates.

---

## Frontend Repo

GitHub: [https://github.com/ratnesh2507/typing-app-frontend](https://github.com/ratnesh250/typing-app-frontend)

## 🚀 Features

- Multiplayer rooms with real-time typing races
- Random 30-word texts per race
- Live WPM and Accuracy tracking
- Anti-cheat detection (paste detection, max WPM, too-fast finishes)
- Retro arcade UI with pixel-style animations and colors
- Clerk authentication for user management
- How-To-Play modal with instructions
- Responsive for desktop and mobile
- Fully deployed on Vercel (frontend) and Render (backend)

---

## 🎮 How To Play

- Join a room or create one
- Wait for others to join
- Race begins when all players are ready
- Type the text as fast and accurately as possible
- Avoid cheating: pasting text, jumping ahead, exceeding WPM
- View your WPM & accuracy live
- Race results are shown at the end

---

## 🔑 Common Setup

1. Clone the repositories:

```bash
git clone https://github.com/ratnesh2507/typing-app-frontend.git
git clone https://github.com/ratnesh2507/typing-app-backend.git
```

2. Install dependencies for both frontend and backend:

```bash
# Frontend
cd typing-app-frontend
npm install

# Backend
cd typing-app-backend
npm install
```

3. Create a `.env` file in both frontend and backend:

**Frontend `.env`:**

```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_dev_publishable_key
VITE_BACKEND_URL=http://localhost:5000
```

**Backend `.env`:**

```env
PORT=5000
```

4. Run both apps locally:

```bash
# Backend
npm run dev

# Frontend
cd typing-app-frontend
npm run dev
```

---

## Frontend 🌐

**Tech Stack:**

- React 18 + TypeScript
- TailwindCSS
- React Router
- Clerk for authentication
- React Hot Toast for notifications
- Socket.IO client

**Features Specific to Frontend:**

- Dashboard with active rooms and user stats
- Lobby to join or create rooms
- Race page with live typing stats
- Results page with final scores
- How-To-Play modal with retro styling
- Pixel cursor animations

**Run Locally:**

```bash
cd frontend
npm run dev
```

**Build for Deployment:**

```bash
npm run build
```

**Vercel Deployment Notes:**

- `vercel.json` should point to `dist` folder
- Ensure environment variables are set in Vercel dashboard
- Routes fallback to `index.html` for React Router support

---

## Backend ⚡

**Tech Stack:**

- Node.js + Express
- Socket.IO server for real-time communication
- Utilities for WPM and accuracy calculation

**Features Specific to Backend:**

- Create and join rooms
- Random text assignment per room
- Real-time race progress updates
- Anti-cheat detection
- Emit race results to all connected users
- Handles disconnects and empty rooms

**Run Locally:**

```bash
cd backend
npm run dev
```

**Deployment Notes (Render):**

- Root directory: backend
- Build Command: none required (Node.js app)
- Start Command: `node index.js` or `npm start` if script added
- Environment variables: set `PORT`

---

## 🔧 Folder Structure

```
 frontend/
  ├─ src/
  │  ├─ components/
  │  ├─ hooks/
  │  ├─ pages/
  │  ├─ utils/
  ├─ App.tsx
  ├─ main.tsx
  ├─ socket.ts
  ├─ index.css
  ├─ package.json
  ├─ vercel.json
  └─ README.md

 backend/
  ├─ socket/
  │  └─ roomHandlers.js
  ├─ utils/
  │  ├─ wpm.js
  │  ├─ accuracy.js
  │  └─ texts.js
  ├─ index.js
  ├─ package.json
  └─ README.md
```

---

## 🧑‍💻 Author

**BVK Ratnesh**
GitHub: [https://github.com/ratnesh2507](https://github.com/ratnesh2507)
