import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { initDb, seedDb } from "./db.js";
import { createRoom, joinRoom, getRoom, startRound, submitDefinition, allSubmitted, setAwards, backToPicking, endGame, removePlayer } from "./game.js";
import { generateAwards } from "./awards.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, "..", "public")));

const db = seedDb();

// REST: Search cocktails
app.get("/api/cocktails", (req, res) => {
  const { cuisine, city, region, country, vibe, q } = req.query;
  let sql = "SELECT * FROM cocktails WHERE 1=1";
  const params = [];
  if (cuisine) { sql += " AND cuisine LIKE ?"; params.push(`%${cuisine}%`); }
  if (city) { sql += " AND city LIKE ?"; params.push(`%${city}%`); }
  if (region) { sql += " AND region LIKE ?"; params.push(`%${region}%`); }
  if (country) { sql += " AND country LIKE ?"; params.push(`%${country}%`); }
  if (vibe) { sql += " AND vibes LIKE ?"; params.push(`%${vibe}%`); }
  if (q) { sql += " AND name LIKE ?"; params.push(`%${q}%`); }
  sql += " ORDER BY name LIMIT 50";
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map((r) => ({ ...r, vibes: JSON.parse(r.vibes || "[]") })));
});

app.get("/api/cocktails/random", (req, res) => {
  const row = db.prepare("SELECT * FROM cocktails ORDER BY RANDOM() LIMIT 1").get();
  res.json({ ...row, vibes: JSON.parse(row.vibes || "[]") });
});

app.get("/api/filters", (req, res) => {
  const cuisines = db.prepare("SELECT DISTINCT cuisine FROM cocktails ORDER BY cuisine").all().map((r) => r.cuisine);
  const cities = db.prepare("SELECT DISTINCT city FROM cocktails ORDER BY city").all().map((r) => r.city);
  const regions = db.prepare("SELECT DISTINCT region FROM cocktails ORDER BY region").all().map((r) => r.region);
  const countries = db.prepare("SELECT DISTINCT country FROM cocktails ORDER BY country").all().map((r) => r.country);
  res.json({ cuisines, cities, regions, countries });
});

// WebSocket: Game logic
io.on("connection", (socket) => {
  let currentRoom = null;
  let playerName = null;

  socket.on("create-room", (name, cb) => {
    const room = createRoom(name);
    currentRoom = room.code;
    playerName = name;
    socket.join(room.code);
    cb({ code: room.code, room });
  });

  socket.on("join-room", (code, name, cb) => {
    const result = joinRoom(code, name);
    if (result.error) return cb({ error: result.error });
    currentRoom = code.toUpperCase();
    playerName = name;
    socket.join(currentRoom);
    io.to(currentRoom).emit("room-updated", result.room);
    cb({ room: result.room });
  });

  // Host starts the game (moves from lobby to picking)
  socket.on("start-game", () => {
    if (!currentRoom) return;
    const room = getRoom(currentRoom);
    if (!room || playerName !== room.host) return;
    room.state = "picking";
    io.to(currentRoom).emit("room-updated", room);
  });

  socket.on("start-round", (cocktail) => {
    if (!currentRoom) return;
    const room = getRoom(currentRoom);
    if (!room || playerName !== room.host) return;
    const updated = startRound(currentRoom, cocktail);
    if (updated) io.to(currentRoom).emit("round-started", updated);
  });

  socket.on("submit-definition", (definition, cb) => {
    if (!currentRoom || !playerName) return;
    const room = submitDefinition(currentRoom, playerName, definition);
    if (!room) return;
    io.to(currentRoom).emit("definition-submitted", {
      playerName,
      count: room.definitions.length,
      total: room.players.length,
    });
    if (allSubmitted(currentRoom)) {
      io.to(currentRoom).emit("all-submitted");
      generateAwards(room.currentCocktail.name, room.definitions).then((awards) => {
        const updated = setAwards(currentRoom, awards);
        io.to(currentRoom).emit("awards-revealed", updated);
      });
    }
    if (cb) cb({ ok: true });
  });

  socket.on("next-round", () => {
    if (!currentRoom) return;
    const room = getRoom(currentRoom);
    if (!room || playerName !== room.host) return;
    const updated = backToPicking(currentRoom);
    if (updated) io.to(currentRoom).emit("room-updated", updated);
  });

  socket.on("end-game", () => {
    if (!currentRoom) return;
    const room = getRoom(currentRoom);
    if (!room || playerName !== room.host) return;
    const updated = endGame(currentRoom);
    if (updated) io.to(currentRoom).emit("game-ended", updated);
  });

  socket.on("request-email-summary", (email, cb) => {
    if (!currentRoom || !playerName) return;
    const room = getRoom(currentRoom);
    if (!room) return;
    // Store email request - for now just acknowledge (email sending is a future feature)
    const playerAwards = room.awardHistory.filter((a) => a.playerName === playerName);
    // TODO: integrate email service (SendGrid, SES, etc.)
    console.log(`Email requested: ${email} for ${playerName} (${playerAwards.length} awards)`);
    if (cb) cb({ ok: true, message: "Email feature coming soon! Your awards are shown below." });
  });

  socket.on("disconnect", () => {
    if (currentRoom && playerName) {
      const room = removePlayer(currentRoom, playerName);
      if (room) io.to(currentRoom).emit("room-updated", room);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Drinktionary server running on port ${PORT}`));
