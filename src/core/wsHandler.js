/**
 * @description web socket 处理器
 * @author yq
 * @date 2019-07-31 16:14
 */
const WebSocket = require('ws');
const Logger = require('log4js').getLogger('web-socket');
const Player = require('./player');
const uuid = require('uuid');
const Rooms = require('./rooms');

class WsHandler {
  constructor({ port }) {
    this.port = port;
    this.players = new Map();
    this.rooms = new Rooms(this);
    this.connectionNum = 0;
    this.wss = new WebSocket.Server({
      noServer: true,
    });
    // 当websocket连接时
    this.wss.on('connection', (ws) => {
      this.onWsConnection.call(this, ws);
    });
    Logger.info(`worker pid:  ${process.pid} listen port：${this.port}`);
  }

  broadcast(event, content) {
    try {
      const { channel, timestamp, data } = JSON.parse(content);
      console.log(`broadcast message to channel ${channel}`, content);
      if (!data) {
        Logger.error('msg not empty');
      }
      // 往对应房间广播消息
      // Broadcast to all.
      this.wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client.rooms.has(channel)) {
          client.send(JSON.stringify({ event, channel, timestamp, data }));
        }
      });
    } catch (e) {
      console.error('broadcast message error:', content, e);
    }
  }

  /**
   * @summary 捕获 socket 事件
   * @param client: Socket 消息接收端
   */
  onWsConnection(client) {
    client.id = uuid();
    client.rooms = new Set();
    const self = this;
    console.log(`New player has connected: ${client.id}`);
    client.handler = self;
    const events = {
      'disconnect': self.onClientDisconnect,
      'new player': self.onNewPlayer,
      'move player': self.onMovePlayer,
      'shot': self.onShot,
      'kill player': self.onKill,
      'kill brick': self.onKillBrick,
      'kill boss': self.onKillBoss,
      'join room': self.onJoinRoom,
      'loading progress': self.onLoadingProgress,
      'start game': self.onStartGame,
    };

    // bild event with client TODO
    // Object.keys(events).forEach((event) => {
    //   client.on(event, function (data) {
    //     events[event](client, data);
    //   });
    // });
  }

  /**
   * @param id [String] 玩家id
   * @param silence [Boolean] 是否是静默的玩家
   * @return playerObj or false
   */
  playerById(id, silence) {
    const self = this;
    const playerObj = self.players.get(id);
    if (playerObj) {
      return playerObj;
    }
    if (!silence) {
      console.log('Player not found: ', id);
    }
    return false;
  }

  /**
   * @param self [Object] SocketHandler 实例
   * @this [Object] Socket 实例;
   */
  onClientDisconnect(client, data) {
    const self = client.handler;
    console.log(`Player has disconnected: ${client.id}`);

    client.to(client.roomId).emit('remove player', { id: client.id });
    self.rooms.deletePlayer(client.roomId, client.id);
  }

  /**
   * @param self: [Object] SocketHandler 实例
   * @param data: [Object] 创建玩家后返回的数据
   * @this [Object] Socket 实例
   */
  onNewPlayer(client, data) {
    const self = client.handler;
    const newPlayer = self.playerById(client.id);
    newPlayer.setAttrs(data);
    client.to(client.roomId).emit('new player', {
      id: newPlayer.id,
      x: newPlayer.x,
      y: newPlayer.y,
      sex: newPlayer.sex,
      name: newPlayer.name,
      camp: newPlayer.camp,
      avatar: newPlayer.avatar,
    });

    const roomPlayers = self.rooms.roomPlayers(client.roomId);
    for (const player of roomPlayers) {
      if (player.x && player.y && player.camp
        && player.id !== client.id) {
        // 只同步已加入且非自己的玩家
        client.emit(
          'new player',
          {
            id: player.id,
            x: player.x,
            y: player.y,
            name: player.name,
            camp: player.camp,
            avatar: player.avatar,
          }
        );
      }
    }
  }

  /**
   * @param self: [Object] SocketHandler 实例
   * @param data: [Object] 移动玩家后返回的数据
   * @this [Object] Socket 实例
   */
  onMovePlayer(client, data) {
    const self = client.handler;
    const movePlayer = self.playerById(client.id);

    if (!movePlayer) {
      return;
    }

    movePlayer.setX(data.x);
    movePlayer.setY(data.y);
    movePlayer.setAngle(data.angle);
    movePlayer.setSpeed(data.speed);

    const moveInfo = {
      id: movePlayer.id,
      angle: movePlayer.getAngle(),
      speed: movePlayer.getSpeed(),
      x: movePlayer.getX(),
      y: movePlayer.getY(),
    };
    self.socket.sockets.to(client.roomId).emit('move player', moveInfo);
  }

  /**
   * @param self: [Object] SocketHandler 实例
   * @this [Object] Socket 实例
   */
  onShot(client) {
    const self = client.handler;
    self.socket.sockets.to(client.roomId).emit(
      'shot',
      {
        id: client.id,
      }
    );
  }

  onKill(client, data) {
    const self = client.handler;
    self.socket.sockets.to(client.roomId).emit(
      'kill player',
      {
        id: data.id,
        health: data.health,
        killerId: data.killerId,
      }
    );
  }

  onKillBrick(client, data) {
    const self = client.handler;
    self.socket.sockets.to(client.roomId).emit(
      'kill brick',
      {
        id: data.id,
        killerId: data.killerId,
      }
    );
  }

  onKillBoss(client, data) {
    const self = client.handler;
    self.socket.sockets.to(client.roomId).emit(
      'kill boss',
      {
        camp: data.camp,
      }
    );
  }

  onJoinRoom(client, data) {
    console.info(client.id);
    const self = client.handler;
    const newPlayer = new Player({
      avatar: data.avatar,
      name: data.name,
      id: client.id,
      roomId: data.id,
      sex: data.sex,
      client: client,
    });
    client.roomId = data.id;

    const room = self.rooms.getRoom(client.roomId);
    if (room) {
      for (let player of room.values()) {
        client.emit(
          'join room',
          {
            id: player.id,
            name: player.name,
            avatar: player.avatar,
            sex: player.sex,
            loadingProgress: player.loadingProgress,
          }
        );
      }
    } else {
      self.rooms.addRoom(client.roomId);
    }
    self.rooms.addPlayer(client.roomId, newPlayer);

    client.to(client.roomId).emit(
      'join room',
      {
        id: newPlayer.id,
        avatar: newPlayer.avatar,
        name: newPlayer.name,
        sex: newPlayer.sex,
        loadingProgress: newPlayer.loadingProgress,
      }
    );

    self.players.set(client.id, newPlayer);
  }

  onLoadingProgress(client, data) {
    const self = client.handler;
    const player = self.playerById(data.id);
    player.setLoadingProgress(data.progress);
    client.to(client.roomId).emit(
      'loading progress',
      {
        id: data.id,
        progress: data.progress,
      }
    );
  }

  onStartGame(client, data) {
    const self = client.handler;
    if (data.mode === 'hell') {
      // 地狱乱斗
      self.startHell(client);
    }
    self.addEquipment(client);
  }

  addEquipment(client) {
    // 隔一段时间生成一个随机的装备
    const self = this;
    const rndTime = Math.random() * 30 * 1000;
    const equipments = ['eqBulletBeam', 'eqBulletSprial'];
    let baseTime = 30 * 1000;
    let id = 0;

    const create = () => {
      console.info('add equipments....');
      self.eqAddTimer = setTimeout(() => {
        const rndEquipment = equipments[Math.floor(Math.random() * equipments.length)];
        self.socket.sockets.to(client.roomId).emit(
          'add equipment',
          {
            key: rndEquipment,
            x: Math.random() * 600,
            y: Math.random() * 450,
            id,
          });
        baseTime = 0;
        id++;
        clearTimeout(self.eqAddTimer);
        create();
      }, baseTime + rndTime);
    };
    create();
  }

  startHell(client) {
    const self = this;
    const start_data = {
      camp: uuid.v4(),
      roomId: 'hell',
    };
    self.socket.sockets.to(client.roomId).emit(
      'start game',
      start_data
    );
  }
}

module.exports = WsHandler;
