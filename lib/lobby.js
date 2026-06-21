// lib/lobby.ts
export let activeRooms = new Map<string, any>();

export function getAllRooms() {
  return Array.from(activeRooms.values());
}

export function addRoom(room: any) {
  if (!room.roomCode) {
    throw new Error('Room must have roomCode');
  }

  activeRooms.set(room.roomCode, {
    ...room,
    lastUpdated: Date.now(),
  });
}

export function updateRoomPlayers(roomCode: string, players: number) {
  const room = activeRooms.get(roomCode);
  if (room) {
    room.players = players;
    room.lastUpdated = Date.now();
  }
}

export function removeRoom(roomCode: string) {
  activeRooms.delete(roomCode);
}
