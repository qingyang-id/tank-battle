/**
 * @description
 * @author yq
 * @date 2019-08-01 16:46
 */
const tools = require('./tools.js');

class Tank {
  constructor(data) {
    this.id = data.id || Math.floor(Math.random() * 100000) + "";   //id
    this.n = data.n || (game_env == 1 ? "nameless" : null);    //名字
    this.x = data.x != undefined ? data.x : Math.random() * game_width * 2 - game_width; //x
    this.y = data.y != undefined ? data.y : Math.random() * game_width * 2 - game_width; //y
    this.r = data.r || 0;   //移动方向 0表示不移动
    this.c_r = this.r + 1;  //过渡r
    this.v_v = tools.deg2vector(this.r);    //移动方向的向量
    this.m_t = new Date().getTime();  //移动时间
    this.mt_pst = { x: 0, y: 0 };    //途经点模式的目标坐标
    this.mt_t = 0;           //途径点模式的到达目标时间

    // this.p = data.p != undefined ? data.p : 0;   //炮口方向
    this.p = this.r;   //炮口方向
    this.c_p = this.p + 1;  //model的炮口方向过渡
    this.v_p = tools.deg2vector(this.p);    //坦克的炮塔方向的向量 主要用于向量和
    this.v = data.v || dft_speed;   //速度       0-63;
    this.v_t = data.v_t || 0;       //加速效果的结束时间
    this.h = data.h || dfd_h;
    this.a = data.a || true;

    this.gun = data.gun || 0;   //枪的种类
    this.wp = null,   //武器weapon
      this.f = data.f || false;    //开火状态
    this.f_t = data.f_t || 0;  //设置开火时间


    this.s_v = 0;   //移动速度加点
    this.s_h = 0;   //生命值加点
    this.s_k = 0;   //伤害值加点
    this.s_p = 0;   //射击速度加点
    this.s_j = 0;   //射击距离加点

    this.lv = 0;    //等级
    this.score = 0; //分数
    this.kill = 0;  //杀敌
    this.gold = 0;  //金币

    this.skin = 0;

    this.fj_tk = "";
    this.fj_wt = "";
    this.fj_jp = "";

    this.setR(this.r);

    Tank.remove(this.id);
    tanks[this.id] = this;
    if (this.id == my_id) {
      my_tank = this;
      this.n = pageData.userName;
    }
  }

  setR(r) {    //设置自己的方向
    this.r = r;
    if (r == 0) {
      this.v_v.x = this.v_v.y = 0;
    } else
      tools.deg2vector(this.r, this.v_v);
  };

  addGUN(gunstr) { //拾取枪的时候，计算下一把是啥枪
    var gid = this.gun;
    var gunobj = GUNS[gid];
    if (gunobj.code == gunstr) {
      return gunobj.next;
    } else {
      var k = gunobj[gunstr];
      if (gunobj[k]) {
        return k;
      }
    }
    return this.gun;
  };
  setGUN(guncode) {    //设置自己的gun
    if (this.gun != guncode) {
      this.wp = null;
      this.gun = guncode;
      if (this.paota) {
        this.paota.destroy({ children: true });
        this.paota = null;
      }
    }
  };
  setF(f) {
    if (f) {
      //this.f_t = 0;
      if (this.wp) {
        var fsf = this.wp.fires[0];
        var fsn;
        var time = new Date().getTime();
        if (fsf) {
          if (time > fsf.f_t) {
            fsf.f_t = time + fsf.st;
            for (var fi = 1; fi < this.wp.fires.length; fi++) {
              fsn = this.wp.fires[fi];
              fsn.f_t = time + fsn.st;
            }
          }
        }
      }
    }
    this.f = f;
  };
  setGold(gold) {
    this.gold = gold;
    if (game_env == 0 && my_id == this.id) {
      gui_ud_gold();
    }
  };
  static move_once_time = 2000;   //一次移动信息对应的时间
  // move_once_time = Tank.move_once_time;   //一次移动信息对应的时间
  getMoveStr(r) {
    if (r !== undefined) {
      if (r == 0) {
        if (game_env == 1) {
          this.r = r;
        }
        this.v_v.x = this.v_v.y = 0;
      } else {
        this.r = r;
        tools.deg2vector(this.r, this.v_v);
      }
    }
    this.mt_t = new Date().getTime() + Tank.move_once_time;
    return this.id +
      String.fromCharCode(Math.round(this.x) + 32768) +
      String.fromCharCode(Math.round(this.y) + 32768) +
      String.fromCharCode((this.r << 6) + this.v);
  };
  getZipStr() {
    var str = this.id +
      String.fromCharCode(Math.round(this.x) + 32768) +
      String.fromCharCode(Math.round(this.y) + 32768) +
      String.fromCharCode((this.r << 6) + this.v) +
      String.fromCharCode(Math.floor(this.p)) +
      String.fromCharCode(Math.floor(this.h)) +
      String.fromCharCode((this.gun << 1) + (this.f ? 1 : 0));  //用gun id 左移一位判断开火状态
    return str;
  };
  remove() {
    if (this.model) {
      this.model.destroy({ children: true });
    }
    delete tanks[this.id];
    if (game_env == 1) {
      ids.free(this.id);
    }
  };
  add_fj() {   //算出附近的信息
    var tk, fj_ds = Tank.fj_ds;
    var wt, jp;
    for (var ti in tanks) {
      tk = tanks[ti];
      if (Math.abs(tk.x - this.x) < fj_ds && Math.abs(tk.y - this.y) < fj_ds && ti != this.id) {
        tk.fj_tk += this.id;
        this.fj_tk += ti;
      }
    }
    fj_ds = Tank.fj_dswj;
    for (var wi in wutis) {
      wt = wutis[wi];
      if (Math.abs(tk.x - wt.x) < fj_ds && Math.abs(tk.y - wt.y) < fj_ds) {
        wt.fj_tk += this.id;
        tk.fj_wt += wi;
      }
    }
    for (var ji in jiangpins) {
      jp = jiangpins[ji];
      if (Math.abs(tk.x - jp.x) < fj_ds && Math.abs(tk.y - jp.y) < fj_ds) {
        jp.fj_tk += this.id;
        tk.fj_jp += ji;
      }
    }
  };
  static add(data) {
    return new Tank(data);
  };
  static getMoveStr(tkid, r) {
    var tk = tanks[tkid];
    if (tk) {
      return tk.getMoveStr(r);
    }
    return null;
  };
  static loadMoveStr(str) {
    var id = str[0];
    var x = str.charCodeAt(1) - 32768;    //x
    var y = str.charCodeAt(2) - 32768;    //y
    var r = str.charCodeAt(3);    //r
    var v = r & 63;    //v
    r = r >> 6;


    var tk = tanks[id];
    if (tk) {
      tk.v = v;
      if (r == 0) {
        tk.v_v.x = tk.v_v.y = 0;
        tk.mt_pst.x = x;
        tk.mt_pst.y = y;
      } else {
        tk.r = r;
        tools.deg2vector(tk.r, tk.v_v);
        tk.mt_pst.x = x + tk.v_v.x * Tank.move_once_time * tk.v * 0.01;
        tk.mt_pst.y = y + tk.v_v.y * Tank.move_once_time * tk.v * 0.01;
      }
      tk.mt_t = new Date().getTime() + Tank.move_once_time;
      return tk;
    }
    return false;
  };
  static getZipStr(id) {
    var tk = tanks[id];
    if (tk) {
      return tk.getZipStr();
    }
    return "";
  };
  static loadZipStr(str) {
    var data = {
      id: str[0],
      x: str.charCodeAt(1) - 32768,
      y: str.charCodeAt(2) - 32768,
      r: str.charCodeAt(3),
      p: str.charCodeAt(4),
      h: str.charCodeAt(5),
      f: !!(str.charCodeAt(6) & 1),
      gun: str.charCodeAt(6) >> 1
    };
    data.v = data.r & 63;
    data.r = data.r >> 6;
    if (game_env == 0) {
      setTimeout(function () {
        if (tanks[data.id])
          socket.emit("n", data.id);
      }, 1000);
    }
    //if (game_env == 2) {
    //    main.send("n" + data.id);
    //}
    var tk = Tank.add(data);
    if (game_env == 2) {
      tk.add_fj();
    }
  };
  static loadZipStrS(strs) {
    for (var i = 0; i < strs.length; i += 8) {
      Tank.loadZipStr(strs.substr(i, 7));
    }
  };
  static remove(tkid) {
    var tk = tanks[tkid];
    if (tk) {
      tk.remove();
    }
  };
  static clear() {
    for (var ti in tanks) {
      tanks[ti].remove();
    }
  };
  static setGUN(tkid, guncode) {
    var tk = tanks[tkid];
    if (tk) {
      tk.setGUN(guncode);
    }
  };
  static imove = (function () {
    var sending_r = 0;
    var issending_r = false;
    return function (r) {  //移动方向
      r = Math.round(r);
      if (sending_r != r) {
        sending_r = r;
        if (!issending_r) {
          issending_r = true;
          setTimeout(function () {
            socket.emit("r", String.fromCharCode(sending_r));
            issending_r = false;
          }, 60);
        }
      }
    };
  })();
  static ipao = (function () {
    var sending_p = 0;
    var issending_p = false;
    return function (p) {   //炮口方向
      p = Math.round(p);
      if (sending_p != p) {
        sending_p = p;
        if (!issending_p) {
          issending_p = true;
          setTimeout(function () {
            socket.emit("p", String.fromCharCode(sending_p));
            issending_p = false;
          }, 130);
        }
      }
    };
  })();
  static setFireState(tkid, f) {
    var tk = tanks[tkid];
    if (tk) {
      tk.setF(f);
    }
  };
  static ibg(id) {
    id -= 0;
    var gstr = String.fromCharCode(id);
    socket.emit("d", gstr);
  };
  static ifire = (function () {
    var sending_f = false;
    return function (isfire) {
      if (isfire != sending_f) {
        sending_f = isfire;
        if (sending_f) {
          socket.emit("f", "");
        } else {
          socket.emit("e", "");
        }
        //socket.emit("f", sending_f ? String.fromCharCode(1) : String.fromCharCode(0));
      }
    };
  })();
  static tickFire(time) {
    var tk, i, fires, fri, fx, fy, fc;
    for (var ti in tanks) {
      tk = tanks[ti];
      if (tk.h <= 0 || !tk.f) {
        continue;
      }
      if (!tk.wp) {
        tk.wp = tools.clone(GUNS[tk.gun]);
        for (var fi = 0; fi < tk.wp.fires.length; fi++) {
          fri = tk.wp.fires[fi];
          fri.f_t = time + fri.st;
        }

        //tk.wp.count = -1;    //开火计量
      }

      for (var fi in tk.wp.fires) {
        fc = tk.wp.fires[fi];
        if (time >= fc.f_t) {
          fc.f_t = time - ((time - fc.f_t) % fc.tt) + fc.tt;

          if (fc.fr != tk.r) {
            fc.fr = tk.p;
            fc.fx = fc.tx * tk.v_v.x - fc.ty * tk.v_v.y;
            fc.fy = fc.tx * tk.v_v.y + fc.ty * tk.v_v.x;
          }

          fx = fc.fx + tk.x;
          fy = fc.fy + tk.y;

          if (game_env == 0) {
            Zidan.add({
              fid: tk.id,
              x: fx,
              y: fy,
              r: tk.r + fc.tr,
              k: fc.k || 1,
              t: fc.ct || 1000, //持续时间
              v: fc.v || 40,
              s_t: time,
              img: fc.img || "zd0"
            });
          }

          if (game_env == 2) {
            Zidan.add({
              fid: tk.id,
              x: fx,
              y: fy,
              r: tk.r + fc.tr,
              k: fc.k || 1,
              t: fc.ct || 1000, //持续时间
              v: fc.v || 40,
              s_t: time,
              fj_tk: tk.fj_tk,
              fj_wt: tk.fj_wt,
            });
          }


        }


      }
    }
  };
  static tickMove(now_time) {
    var stime, tk, fx, fy;
    var width = game_width + 100;
    var height = game_height + 100;
    for (var ti in tanks) {
      tk = tanks[ti];
      if (!tk.a) {
        tk.remove();
        continue;
      }
      if (tk.mt_t > tk.m_t) {
        stime = tk.mt_t - tk.m_t;
        fx = tk.mt_pst.x - tk.v_v.x * stime * tk.v * 0.01;
        fy = tk.mt_pst.y - tk.v_v.y * stime * tk.v * 0.01;
        tk.x += (fx - tk.x) / 5;
        tk.y += (fy - tk.y) / 5;
      } else {
        stime = now_time - tk.m_t;
        tk.x += tk.v_v.x * stime * tk.v * 0.01;
        tk.y += tk.v_v.y * stime * tk.v * 0.01;
        if (game_env == 0 && tk.mt_t != 0 && tk.mt_t - tk.m_t < -3000 && tk.h > 0) {
          tk.remove();
        }
      }
      tk.m_t = now_time;

      if (game_env == 0) {
        if (ti == my_id && my_tank != tk) {
          my_tank = tk;
          tk.n = pageData.userName;
        }

      }
      if (game_env == 2) {
        if (tk.x > width || tk.x < -width || tk.y > height || tk.y < -height) {
          main.send("k" + tk.id + tk.id);
          tk.a = false;
        }
      }
    }

  };
  static tickMainMove(now_time) {
    var stime, tk;
    for (var ti in tanks) {
      tk = tanks[ti];
      if (!tk.a) {
        tk.remove();
        continue;
      }
      stime = now_time - tk.m_t;
      if (tk.r != 0) {
        tk.x += tk.v_v.x * stime * tk.v * 0.01;
        tk.y += tk.v_v.y * stime * tk.v * 0.01;
      }
      tk.m_t = now_time;
    }
  };
  static tickAI(time) {
    //return;
    //var myfeiji = tanks[my_id];
    //if (myfeiji && myfeiji.a) {

    //    var n_pst = tools.deg2vector(myfeiji.r);
    //    n_pst.x = n_pst.x * 30 + myfeiji.x;
    //    n_pst.y = n_pst.y * 30 + myfeiji.y;

    //    if (Math.abs(n_pst.x) > game_width || Math.abs(n_pst.y) > game_height) {
    //        var n_x = Math.random() * game_width - game_width / 2;
    //        var n_y = Math.random() * game_height - game_height / 2;
    //        var n_r = tools.vector2deg(n_x - myfeiji.x, n_y - myfeiji.y);
    //        Tank.imove(n_r)
    //    }
    //}
  };
  static a_tick(now_time) {
    var stime, tk, fx, fy;
    //var width = game_width + 100;
    //var height = game_height + 100;
    var juli = Infinity, zuijin = null, njuli;
    for (var ti in tanks) {
      tk = tanks[ti];
      if (!tk.a) {
        tk.remove();
        continue;
      }
      if (tk.mt_t > tk.m_t) {
        stime = tk.mt_t - tk.m_t;
        fx = tk.mt_pst.x - tk.v_v.x * stime * tk.v * 0.01;
        fy = tk.mt_pst.y - tk.v_v.y * stime * tk.v * 0.01;
        tk.x += (fx - tk.x) / 5;
        tk.y += (fy - tk.y) / 5;
      } else {
        stime = now_time - tk.m_t;
        tk.x += tk.v_v.x * stime * tk.v * 0.01;
        tk.y += tk.v_v.y * stime * tk.v * 0.01;
        if (game_env == 0 && tk.mt_t != 0 && tk.mt_t - tk.m_t < -3000 && tk.h > 0) {
          tk.remove();
        }
      }
      tk.m_t = now_time;

      if (ti == my_id && my_tank != tk) {
        my_tank = tk;
      }

      if (ti != my_id) {
        njuli = Math.abs(tk.x - my_tank.x) + Math.abs(tk.y - my_tank.y);
        if (njuli < juli) {
          zuijin = tk;
          juli = njuli;
        }
      }
    }
    ai_m_tank = zuijin;
    ai_min_tk = juli;
  };
  static fj_ds = 1200;
  static fj_dswj = 800;
  static tick_fj() {
    var tk, tk2, tkeys, fj_ds = Tank.fj_ds;
    tkeys = Object.keys(tanks);
    var t_1 = tkeys.length - 1;
    for (var ti in tanks) {
      tk = tanks[ti];
      tk.fj_tk = "";
      tk.fj_wt = "";
      tk.fj_jp = "";
    }
    for (var i = 0; i < t_1; i++) {
      tk = tanks[tkeys[i]];
      for (var j = i + 1; j < tkeys.length; j++) {
        tk2 = tanks[tkeys[j]];
        if (Math.abs(tk.x - tk2.x) < fj_ds && Math.abs(tk.y - tk2.y) < fj_ds) {
          tk.fj_tk += tkeys[j];
          tk2.fj_tk += tkeys[i];
        }
      }
    }
    fj_ds = Tank.fj_dswj;
    var wt;
    for (var wi in wutis) {
      wt = wutis[wi];
      wt.fj_tk = "";
      for (var ti in tanks) {
        tk = tanks[ti];
        if (Math.abs(tk.x - wt.x) < fj_ds && Math.abs(tk.y - wt.y) < fj_ds) {
          wt.fj_tk += ti;
          tk.fj_wt += wi;
        }
      }
    }
    var jp;
    for (var ji in jiangpins) {
      jp = jiangpins[ji];
      jp.fj_tk = "";
      for (var ti in tanks) {
        tk = tanks[ti];
        if (Math.abs(tk.x - jp.x) < fj_ds && Math.abs(tk.y - jp.y) < fj_ds) {
          jp.fj_tk += ti;
          tk.fj_jp += ji;
        }
      }
    }
  };
  static tick_fj_t() {

  };
}

module.exports = Tank;
