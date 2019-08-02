/**
 * @description 房间管理器
 * @author yq
 * @date 2019-07-31 15:51
 */
class Rooms {
  constructor(socketHandler) {
    this.socketHandler = socketHandler;
    this.rooms = new Map();
  }

  addPlayer(roomId, player) {
    const self = this;
    let room = self.getRoom(roomId);
    if (!room){
      room = self.addRoom(roomId);
    }
    room.set(player.id, player);
    player.client.join(roomId);
    return room;
  }

  deletePlayer(roomId, clientId) {
    const self = this;
    const room = self.getRoom(roomId);
    const player = self.getPlayer(roomId, clientId);
    if (!room){
      return false;
    }
    room.delete(clientId);
    self.socketHandler.players.delete(clientId);
    if (room.size === 0) {
      self.deleteRoom(roomId);
    }
    if (player) {
      player.client.leave(roomId);
    }
    return true;
  }

  getPlayer(roomId, clientId){
    const self = this;
    const room = self.getRoom(roomId);
    if (!room) {
      return undefined;
    }
    return room.get(clientId);
  }

  getRoom(roomId) {
    const self = this;
    return self.rooms.get(roomId);
  }

  deleteRoom(roomId) {
    const self = this;
    self.rooms.delete(roomId);
  }

  addRoom(roomId) {
    const self = this;
    self.rooms.set(roomId, new Map());
    return self.getRoom(roomId);
  }

  roomPlayers(roomId) {
    const self = this;
    const room = self.getRoom(roomId);
    if (!room) {
      return [];
    }
    return room.values();
  }
}

module.exports = Rooms;
