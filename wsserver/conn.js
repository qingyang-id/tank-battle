var Buffer = require('buffer').Buffer;

class Conn {
  constructor(conn, id, parentFn) {
    this.idList = new Array(500);
    for (let i = 0; i < 500; i++) {
      this.idList[i] = String.fromCharCode(i);
    }
    this.players = {};
    this.waitplayer = {};
    this.t_count = 0; // 临时ID计数
    this.id = id;
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
          obj.conn.send(Buffer.from('b' + id));
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
              this.players[fid].conn.close();
              delete this.players[fid];
            }
          }, 1500);
        }
      },
      setID: (data) => {
        this.id = data[0];
      }
    };
    this.parentFn = parentFn;
    this.conn = conn;
    this.thisobj = {
      id: "conn" + this.id + "_" + (this.t_count++),
      iswait: true,   //是等待中的用户
      conn,
      name: null,
      active: true,
    };
    this.init(conn);
  }

  send(data) {
    this.conn.send(Buffer.from(JSON.stringify(data)));
  }

  getAId() {
    return this.idList.shift();
  }

  freeAId(id) {
    this.idList.push(id);
  }

  init(conn) {
    const headers = conn.headers;
    console.log("conn headers ", headers);
    this.t_count > 10000000 ? this.t_count = 0 : 0;
    conn.on("close", (code, reason) => {
      console.log('\nconn close ', code, reason);
      //console.log("conn_close", host);
      this.thisobj.active = false;
    });
    conn.on("error", (err) => {
      console.log('\nconn error ', err);
    });
    conn.on("message", (str) => {
      console.log('conn message ', str, typeof str);
      if (Buffer.isBuffer(str)) str = Buffer.from(str).toString();
      console.log('\nconn message ', str);
      if (str == "2") {
        conn.send("3");
      } else if (str === 'join') {
        conn.send(Buffer.from("a"));
      } else {
        call(str);
      }
    });

    const call = (data) => {
      if (this.thisobj.iswait) {
        console.log('is wait ......', this.thisobj.iswait, data, [1, this.thisobj.id, data.substring(0, 20) || ""]);
        data = data.substring(0, 20) || "";
        this.noticeMain([1, this.thisobj.id, data]);
      } else {
        console.log('is wait ......', this.thisobj.iswait, [2, this.thisobj.id, data]);
        this.noticeMain([2, this.thisobj.id, data]);
      }
    };

    this.waitplayer[this.thisobj.id] = this.thisobj;

    setInterval(() => {
      this.update();
    }, 1500);
  }

  update() {
    var ucount = 0, acount = 0;
    for (var pi in this.players) {
      if (this.players[pi].active) {
        ucount++;
      } else {
        acount++;
        this.noticeMain([3, pi]);
        delete this.players[pi];
      }
    }
    this.noticeMain([4, ucount]);
    console.log("update", ucount, acount);
  }

  userMessage(id, data) {
    this.noticeMain([2, id, data]);
  }

  noticeUser(uid, data) {
    if (this.players[uid])
      this.players[uid].conn.send(Buffer.from(data));
  }

  noticeSomeUser(idstr, data) {
    data = Buffer.from(data);
    var p;
    for (var i = 0; i < idstr.length; i++) {
      p = this.players[idstr[i]];
      if (p)
        p.conn.send(data);
    }
  }

  noticeAllUser(data) {
    data = Buffer.from(data);
    for (var pi in this.players) {
      this.players[pi].conn.send(data);
    }
  }

  mainMessage(msg, data) {
    this.mainEvents[msg](data);
  }

  noticeMain(data) {
    console.log('\n\n\nnotice main data ', data, [this.id].concat(data), typeof data, typeof [this.id].concat(data), Array.isArray([this.id].concat(data)));
    this.parentFn([this.id].concat(data));
  }
}

module.exports = Conn;
