import { nanoid } from "nanoid";

// In-memory game rooms (backed by DB for persistence)
const rooms = new Map();

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I or O to avoid confusion
  let code = "";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export function createRoom(hostName) {
  const code = generateRoomCode();
  const room = {
    id: nanoid(),
    code,
    state: "lobby", // lobby | picking | writing | revealing
    host: hostName,
    players: [{ name: hostName, connected: true }],
    currentCocktail: null,
    definitions: [],
    awards: [],
    round: 0,
  };
  rooms.set(code, room);
  return room;
}

export function joinRoom(code, playerName) {
  const room = rooms.get(code.toUpperCase());
  if (!room) return { error: "Room not found" };
  if (room.players.length >= 8) return { error: "Room is full" };
  if (room.players.find((p) => p.name === playerName)) return { error: "Name already taken" };
  room.players.push({ name: playerName, connected: true });
  return { room };
}

export function getRoom(code) {
  return rooms.get(code.toUpperCase());
}

export function startRound(code, cocktail) {
  const room = rooms.get(code.toUpperCase());
  if (!room) return null;
  room.state = "writing";
  room.currentCocktail = cocktail;
  room.definitions = [];
  room.awards = [];
  room.round++;
  return room;
}

export function submitDefinition(code, playerName, definition) {
  const room = rooms.get(code.toUpperCase());
  if (!room || room.state !== "writing") return null;
  // Replace if already submitted
  room.definitions = room.definitions.filter((d) => d.playerName !== playerName);
  room.definitions.push({ playerName, definition });
  return room;
}

export function allSubmitted(code) {
  const room = rooms.get(code.toUpperCase());
  if (!room) return false;
  return room.definitions.length >= room.players.length;
}

export function setAwards(code, awards) {
  const room = rooms.get(code.toUpperCase());
  if (!room) return null;
  room.awards = awards;
  room.state = "revealing";
  return room;
}

export function backToLobby(code) {
  const room = rooms.get(code.toUpperCase());
  if (!room) return null;
  room.state = "picking";
  room.currentCocktail = null;
  room.definitions = [];
  room.awards = [];
  return room;
}

export function removePlayer(code, playerName) {
  const room = rooms.get(code.toUpperCase());
  if (!room) return null;
  room.players = room.players.filter((p) => p.name !== playerName);
  if (room.players.length === 0) {
    rooms.delete(code.toUpperCase());
    return null;
  }
  return room;
}
