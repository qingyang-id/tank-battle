/**
 * @description web socket server
 * @author yq
 * @date 2019-07-30 20:43
 */
const WebSocket = require('ws');
const Logger = require('log4js').getLogger('web-socket');

class WsServer {
  constructor({ port }) {
    this.port = port;
    this.connectCount = 0;
    this.channelSet = {};
    this.roomSet = {};
    this.roomUserSet = {};
    this.wss = new WebSocket.Server({
      noServer: true,
    });
  }

  broadcast(event, content) {
    try {
      const { channel, timestamp, data } = JSON.parse(content);
      // console.log(`broadcast message to channel ${channel}`, content);
      if (!data) {
        Logger.error('msg not empty');
      }
      // 往对应房间广播消息
      // Broadcast to all.
      this.wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ event, channel, timestamp, data }));
        }
      });
    } catch (e) {
      console.error('broadcast message error:', content, e);
    }
  }

  start() {
    // 当websocket连接时
    this.wss.on('connection', (ws) => {
      console.log('\n\n\n', ws);
      ws.on('message', (message) => {
        console.log('received: %s', message, typeof message);
      });
      ws.send('something');
    });

    Logger.info(`worker pid:  ${process.pid} listen port：${this.port}`);
  }
}

module.exports = WsServer;
