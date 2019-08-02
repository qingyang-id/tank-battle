const WebSocket = require("ws").Server;

class Conn {
  constructor(port, id, parentFn) {
    this.idList = new Array(500);
    for (let i = 0; i < 500; i++) {
      this.idList[i] = String.fromCharCode(i);
    }
    this.players = {};
    this.waitplayer = {};
    this.t_count = 0; // 临时ID计数
    this.id = id; // 房间ID
    this.mainEvents = {
      2: (data) => {
        this.noticeUser(data[0], data[1]);
      },
      3: (data) => {
        this.noticeSomeUser(data[0], data[1]);
      },
      4: (data) => {
        this.noticeAllUser(data[0]);
      },
      5: (data) => {  // new user id
        var obj = this.waitplayer[data[0]];
        if (obj) {
          delete this.waitplayer[data[0]];
          var id = data[1];
          obj.ws.send(Buffer.from('b' + id));
          obj.id = id;
          obj.iswait = false;
          this.players[id] = obj;
        }
      },
      6: (data) => {
        var fid = data[0];
        if (this.players[fid]) {
          setTimeout(() => {
            if (this.players[fid]) {
              this.players[fid].ws.close();
              delete this.players[fid];
            }
          }, 1500);
        }
      }
    };
    this.parentFn = parentFn;
    this.wss = new WebSocket({ port });
    this.wss.on("connection", ws => this.init.call(this, ws));
  }

  send(data) {
    this.mainMessage(data.shift(), data);
  }

  init(ws) {
    const playerInfo = {
      id: "conn" + this.id + "_" + (this.t_count++),
      iswait: true,   // 是等待中的用户
      name: null,
      active: true,
      ws
    };
    const headers = ws.headers;
    console.log("ws headers ", headers);
    this.t_count > 10000000 ? this.t_count = 0 : 0;
    ws.on("close", (code, reason) => {
      console.log('\nws close ', code, reason);
      //console.log("ws_close", host);
      playerInfo.active = false;
    });
    ws.on("error", (err) => {
      console.log('\nws error ', err);
    });
    ws.on("message", (str) => {
      if (Buffer.isBuffer(str)) str = Buffer.from(str).toString();
      console.log('\nws message ', str);
      if (str === 'join') {
        ws.send(Buffer.from("a"));
      } else {
        call(str);
      }
    });
    const call = (data) => {
      if (playerInfo.iswait) {
        console.log('is wait ......', playerInfo.iswait, data, [1, playerInfo.id, data.substring(0, 20) || ""]);
        data = data.substring(0, 20) || "";
        this.noticeMain([1, playerInfo.id, data]);
      } else {
        console.log('is not wait ......', playerInfo.iswait, [2, playerInfo.id, data]);
        this.noticeMain([2, playerInfo.id, data]);
      }
    };
    this.waitplayer[playerInfo.id] = playerInfo;
  }

  noticeUser(uid, data) {
    if (this.players[uid])
      this.players[uid].ws.send(Buffer.from(data));
  }

  noticeSomeUser(idstr, data) {
    console.log('\n\n\nidstr  ', idstr, '  data', data);
    data = Buffer.from(data);
    var p;
    for (var i = 0; i < idstr.length; i++) {
      p = this.players[idstr[i]];
      if (p)
        p.ws.send(data);
    }
  }

  noticeAllUser(data) {
    data = Buffer.from(data);
    for (var pi in this.players) {
      this.players[pi].ws.send(data);
    }
  }

  mainMessage(msg, data) {
    this.mainEvents[msg](data);
  }

  noticeMain(data) {
    this.parentFn([this.id].concat(data));
  }
}

module.exports = Conn;
