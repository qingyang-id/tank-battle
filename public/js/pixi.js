/*!
 * pixi.js - v5.1.0
 * Compiled Fri, 19 Jul 2019 21:58:39 UTC
 *
 * pixi.js is licensed under the MIT License.
 * http://www.opensource.org/licenses/mit-license
 */
var PIXI = (function (exports) {
  'use strict';

  var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

  function commonjsRequire () {
    throw new Error('Dynamic requires are not currently supported by rollup-plugin-commonjs');
  }

  function unwrapExports (x) {
    return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
  }

  function createCommonjsModule(fn, module) {
    return module = { exports: {} }, fn(module, module.exports), module.exports;
  }

  function getCjsExportFromNamespace (n) {
    return n && n['default'] || n;
  }

  var promise = createCommonjsModule(function (module, exports) {
    (function(global){

      //
      // Check for native Promise and it has correct interface
      //

      var NativePromise = global['Promise'];
      var nativePromiseSupported =
        NativePromise &&
        // Some of these methods are missing from
        // Firefox/Chrome experimental implementations
        'resolve' in NativePromise &&
        'reject' in NativePromise &&
        'all' in NativePromise &&
        'race' in NativePromise &&
        // Older version of the spec had a resolver object
        // as the arg rather than a function
        (function(){
          var resolve;
          new NativePromise(function(r){ resolve = r; });
          return typeof resolve === 'function';
        })();


      //
      // export if necessary
      //

      if ('object' !== 'undefined' && exports)
      {
        // node.js
        exports.Promise = nativePromiseSupported ? NativePromise : Promise;
        exports.Polyfill = Promise;
      }
      else
      {
        // AMD
        if (typeof undefined == 'function' && undefined.amd)
        {
          undefined(function(){
            return nativePromiseSupported ? NativePromise : Promise;
          });
        }
        else
        {
          // in browser add to global
          if (!nativePromiseSupported)
          { global['Promise'] = Promise; }
        }
      }


      //
      // Polyfill
      //

      var PENDING = 'pending';
      var SEALED = 'sealed';
      var FULFILLED = 'fulfilled';
      var REJECTED = 'rejected';
      var NOOP = function(){};

      function isArray(value) {
        return Object.prototype.toString.call(value) === '[object Array]';
      }

      // async calls
      var asyncSetTimer = typeof setImmediate !== 'undefined' ? setImmediate : setTimeout;
      var asyncQueue = [];
      var asyncTimer;

      function asyncFlush(){
        // run promise callbacks
        for (var i = 0; i < asyncQueue.length; i++)
        { asyncQueue[i][0](asyncQueue[i][1]); }

        // reset async asyncQueue
        asyncQueue = [];
        asyncTimer = false;
      }

      function asyncCall(callback, arg){
        asyncQueue.push([callback, arg]);

        if (!asyncTimer)
        {
          asyncTimer = true;
          asyncSetTimer(asyncFlush, 0);
        }
      }


      function invokeResolver(resolver, promise) {
        function resolvePromise(value) {
          resolve(promise, value);
        }

        function rejectPromise(reason) {
          reject(promise, reason);
        }

        try {
          resolver(resolvePromise, rejectPromise);
        } catch(e) {
          rejectPromise(e);
        }
      }

      function invokeCallback(subscriber){
        var owner = subscriber.owner;
        var settled = owner.state_;
        var value = owner.data_;
        var callback = subscriber[settled];
        var promise = subscriber.then;

        if (typeof callback === 'function')
        {
          settled = FULFILLED;
          try {
            value = callback(value);
          } catch(e) {
            reject(promise, e);
          }
        }

        if (!handleThenable(promise, value))
        {
          if (settled === FULFILLED)
          { resolve(promise, value); }

          if (settled === REJECTED)
          { reject(promise, value); }
        }
      }

      function handleThenable(promise, value) {
        var resolved;

        try {
          if (promise === value)
          { throw new TypeError('A promises callback cannot return that same promise.'); }

          if (value && (typeof value === 'function' || typeof value === 'object'))
          {
            var then = value.then;  // then should be retrived only once

            if (typeof then === 'function')
            {
              then.call(value, function(val){
                if (!resolved)
                {
                  resolved = true;

                  if (value !== val)
                  { resolve(promise, val); }
                  else
                  { fulfill(promise, val); }
                }
              }, function(reason){
                if (!resolved)
                {
                  resolved = true;

                  reject(promise, reason);
                }
              });

              return true;
            }
          }
        } catch (e) {
          if (!resolved)
          { reject(promise, e); }

          return true;
        }

        return false;
      }

      function resolve(promise, value){
        if (promise === value || !handleThenable(promise, value))
        { fulfill(promise, value); }
      }

      function fulfill(promise, value){
        if (promise.state_ === PENDING)
        {
          promise.state_ = SEALED;
          promise.data_ = value;

          asyncCall(publishFulfillment, promise);
        }
      }

      function reject(promise, reason){
        if (promise.state_ === PENDING)
        {
          promise.state_ = SEALED;
          promise.data_ = reason;

          asyncCall(publishRejection, promise);
        }
      }

      function publish(promise) {
        var callbacks = promise.then_;
        promise.then_ = undefined;

        for (var i = 0; i < callbacks.length; i++) {
          invokeCallback(callbacks[i]);
        }
      }

      function publishFulfillment(promise){
        promise.state_ = FULFILLED;
        publish(promise);
      }

      function publishRejection(promise){
        promise.state_ = REJECTED;
        publish(promise);
      }

      /**
       * @class
       */
      function Promise(resolver){
        if (typeof resolver !== 'function')
        { throw new TypeError('Promise constructor takes a function argument'); }

        if (this instanceof Promise === false)
        { throw new TypeError('Failed to construct \'Promise\': Please use the \'new\' operator, this object constructor cannot be called as a function.'); }

        this.then_ = [];

        invokeResolver(resolver, this);
      }

      Promise.prototype = {
        constructor: Promise,

        state_: PENDING,
        then_: null,
        data_: undefined,

        then: function(onFulfillment, onRejection){
          var subscriber = {
            owner: this,
            then: new this.constructor(NOOP),
            fulfilled: onFulfillment,
            rejected: onRejection
          };

          if (this.state_ === FULFILLED || this.state_ === REJECTED)
          {
            // already resolved, call callback async
            asyncCall(invokeCallback, subscriber);
          }
          else
          {
            // subscribe
            this.then_.push(subscriber);
          }

          return subscriber.then;
        },

        'catch': function(onRejection) {
          return this.then(null, onRejection);
        }
      };

      Promise.all = function(promises){
        var Class = this;

        if (!isArray(promises))
        { throw new TypeError('You must pass an array to Promise.all().'); }

        return new Class(function(resolve, reject){
          var results = [];
          var remaining = 0;

          function resolver(index){
            remaining++;
            return function(value){
              results[index] = value;
              if (!--remaining)
              { resolve(results); }
            };
          }

          for (var i = 0, promise; i < promises.length; i++)
          {
            promise = promises[i];

            if (promise && typeof promise.then === 'function')
            { promise.then(resolver(i), reject); }
            else
            { results[i] = promise; }
          }

          if (!remaining)
          { resolve(results); }
        });
      };

      Promise.race = function(promises){
        var Class = this;

        if (!isArray(promises))
        { throw new TypeError('You must pass an array to Promise.race().'); }

        return new Class(function(resolve, reject) {
          for (var i = 0, promise; i < promises.length; i++)
          {
            promise = promises[i];

            if (promise && typeof promise.then === 'function')
            { promise.then(resolve, reject); }
            else
            { resolve(promise); }
          }
        });
      };

      Promise.resolve = function(value){
        var Class = this;

        if (value && typeof value === 'object' && value.constructor === Class)
        { return value; }

        return new Class(function(resolve){
          resolve(value);
        });
      };

      Promise.reject = function(reason){
        var Class = this;

        return new Class(function(resolve, reject){
          reject(reason);
        });
      };

    })(typeof window != 'undefined' ? window : typeof commonjsGlobal != 'undefined' ? commonjsGlobal : typeof self != 'undefined' ? self : commonjsGlobal);
  });
  var promise_1 = promise.Promise;
  var promise_2 = promise.Polyfill;

  /*
	object-assign
	(c) Sindre Sorhus
	@license MIT
	*/

  'use strict';
  /* eslint-disable no-unused-vars */
  var getOwnPropertySymbols = Object.getOwnPropertySymbols;
  var hasOwnProperty = Object.prototype.hasOwnProperty;
  var propIsEnumerable = Object.prototype.propertyIsEnumerable;

  function toObject(val) {
    if (val === null || val === undefined) {
      throw new TypeError('Object.assign cannot be called with null or undefined');
    }

    return Object(val);
  }

  function shouldUseNative() {
    try {
      if (!Object.assign) {
        return false;
      }

      // Detect buggy property enumeration order in older V8 versions.

      // https://bugs.chromium.org/p/v8/issues/detail?id=4118
      var test1 = new String('abc');  // eslint-disable-line no-new-wrappers
      test1[5] = 'de';
      if (Object.getOwnPropertyNames(test1)[0] === '5') {
        return false;
      }

      // https://bugs.chromium.org/p/v8/issues/detail?id=3056
      var test2 = {};
      for (var i = 0; i < 10; i++) {
        test2['_' + String.fromCharCode(i)] = i;
      }
      var order2 = Object.getOwnPropertyNames(test2).map(function (n) {
        return test2[n];
      });
      if (order2.join('') !== '0123456789') {
        return false;
      }

      // https://bugs.chromium.org/p/v8/issues/detail?id=3056
      var test3 = {};
      'abcdefghijklmnopqrst'.split('').forEach(function (letter) {
        test3[letter] = letter;
      });
      if (Object.keys(Object.assign({}, test3)).join('') !==
        'abcdefghijklmnopqrst') {
        return false;
      }

      return true;
    } catch (err) {
      // We don't expect any of the above to throw, but better to be safe.
      return false;
    }
  }

  var objectAssign = shouldUseNative() ? Object.assign : function (target, source) {
    var arguments$1 = arguments;

    var from;
    var to = toObject(target);
    var symbols;

    for (var s = 1; s < arguments.length; s++) {
      from = Object(arguments$1[s]);

      for (var key in from) {
        if (hasOwnProperty.call(from, key)) {
          to[key] = from[key];
        }
      }

      if (getOwnPropertySymbols) {
        symbols = getOwnPropertySymbols(from);
        for (var i = 0; i < symbols.length; i++) {
          if (propIsEnumerable.call(from, symbols[i])) {
            to[symbols[i]] = from[symbols[i]];
          }
        }
      }
    }

    return to;
  };

  /*!
	 * @pixi/polyfill - v5.1.0
	 * Compiled Fri, 19 Jul 2019 21:58:39 UTC
	 *
	 * @pixi/polyfill is licensed under the MIT License.
	 * http://www.opensource.org/licenses/mit-license
	 */

  // Support for IE 9 - 11 which does not include Promises
  if (!window.Promise)
  {
    window.Promise = promise_2;
  }

  // References:

  if (!Object.assign)
  {
    Object.assign = objectAssign;
  }

  var commonjsGlobal$1 = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

  // References:
  // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
  // https://gist.github.com/1579671
  // http://updates.html5rocks.com/2012/05/requestAnimationFrame-API-now-with-sub-millisecond-precision
  // https://gist.github.com/timhall/4078614
  // https://github.com/Financial-Times/polyfill-service/tree/master/polyfills/requestAnimationFrame

  // Expected to be used with Browserfiy
  // Browserify automatically detects the use of `global` and passes the
  // correct reference of `global`, `self`, and finally `window`

  var ONE_FRAME_TIME = 16;

  // Date.now
  if (!(Date.now && Date.prototype.getTime))
  {
    Date.now = function now()
    {
      return new Date().getTime();
    };
  }

  // performance.now
  if (!(commonjsGlobal$1.performance && commonjsGlobal$1.performance.now))
  {
    var startTime = Date.now();

    if (!commonjsGlobal$1.performance)
    {
      commonjsGlobal$1.performance = {};
    }

    commonjsGlobal$1.performance.now = function () { return Date.now() - startTime; };
  }

  // requestAnimationFrame
  var lastTime = Date.now();
  var vendors = ['ms', 'moz', 'webkit', 'o'];

  for (var x = 0; x < vendors.length && !commonjsGlobal$1.requestAnimationFrame; ++x)
  {
    var p = vendors[x];

    commonjsGlobal$1.requestAnimationFrame = commonjsGlobal$1[(p + "RequestAnimationFrame")];
    commonjsGlobal$1.cancelAnimationFrame = commonjsGlobal$1[(p + "CancelAnimationFrame")] || commonjsGlobal$1[(p + "CancelRequestAnimationFrame")];
  }

  if (!commonjsGlobal$1.requestAnimationFrame)
  {
    commonjsGlobal$1.requestAnimationFrame = function (callback) {
      if (typeof callback !== 'function')
      {
        throw new TypeError((callback + "is not a function"));
      }

      var currentTime = Date.now();
      var delay = ONE_FRAME_TIME + lastTime - currentTime;

      if (delay < 0)
      {
        delay = 0;
      }

      lastTime = currentTime;

      return setTimeout(function () {
        lastTime = Date.now();
        callback(performance.now());
      }, delay);
    };
  }

  if (!commonjsGlobal$1.cancelAnimationFrame)
  {
    commonjsGlobal$1.cancelAnimationFrame = function (id) { return clearTimeout(id); };
  }

  // References:
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/sign

  if (!Math.sign)
  {
    Math.sign = function mathSign(x)
    {
      x = Number(x);

      if (x === 0 || isNaN(x))
      {
        return x;
      }

      return x > 0 ? 1 : -1;
    };
  }

  // References:
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isInteger

  if (!Number.isInteger)
  {
    Number.isInteger = function numberIsInteger(value)
    {
      return typeof value === 'number' && isFinite(value) && Math.floor(value) === value;
    };
  }

  if (!window.ArrayBuffer)
  {
    window.ArrayBuffer = Array;
  }

  if (!window.Float32Array)
  {
    window.Float32Array = Array;
  }

  if (!window.Uint32Array)
  {
    window.Uint32Array = Array;
  }

  if (!window.Uint16Array)
  {
    window.Uint16Array = Array;
  }

  if (!window.Uint8Array)
  {
    window.Uint8Array = Array;
  }

  if (!window.Int32Array)
  {
    window.Int32Array = Array;
  }

  var isMobile_min = createCommonjsModule(function (module) {
    !function(e){var n=/iPhone/i,t=/iPod/i,r=/iPad/i,a=/\bAndroid(?:.+)Mobile\b/i,p=/Android/i,b=/\bAndroid(?:.+)SD4930UR\b/i,l=/\bAndroid(?:.+)(?:KF[A-Z]{2,4})\b/i,f=/Windows Phone/i,s=/\bWindows(?:.+)ARM\b/i,u=/BlackBerry/i,c=/BB10/i,h=/Opera Mini/i,v=/\b(CriOS|Chrome)(?:.+)Mobile/i,w=/Mobile(?:.+)Firefox\b/i;function m(e,i){return e.test(i)}function i(e){var i=e||("undefined"!=typeof navigator?navigator.userAgent:""),o=i.split("[FBAN");void 0!==o[1]&&(i=o[0]),void 0!==(o=i.split("Twitter"))[1]&&(i=o[0]);var d={apple:{phone:m(n,i)&&!m(f,i),ipod:m(t,i),tablet:!m(n,i)&&m(r,i)&&!m(f,i),device:(m(n,i)||m(t,i)||m(r,i))&&!m(f,i)},amazon:{phone:m(b,i),tablet:!m(b,i)&&m(l,i),device:m(b,i)||m(l,i)},android:{phone:!m(f,i)&&m(b,i)||!m(f,i)&&m(a,i),tablet:!m(f,i)&&!m(b,i)&&!m(a,i)&&(m(l,i)||m(p,i)),device:!m(f,i)&&(m(b,i)||m(l,i)||m(a,i)||m(p,i))||m(/\bokhttp\b/i,i)},windows:{phone:m(f,i),tablet:m(s,i),device:m(f,i)||m(s,i)},other:{blackberry:m(u,i),blackberry10:m(c,i),opera:m(h,i),firefox:m(w,i),chrome:m(v,i),device:m(u,i)||m(c,i)||m(h,i)||m(w,i)||m(v,i)}};return d.any=d.apple.device||d.android.device||d.windows.device||d.other.device,d.phone=d.apple.phone||d.android.phone||d.windows.phone,d.tablet=d.apple.tablet||d.android.tablet||d.windows.tablet,d}"undefined"!='object'&&module.exports&&"undefined"==typeof window?module.exports=i:"undefined"!='object'&&module.exports&&"undefined"!=typeof window?(module.exports=i(),module.exports.isMobile=i):"function"==typeof undefined&&undefined.amd?undefined([],e.isMobile=i()):e.isMobile=i();}(commonjsGlobal);
  });
  var isMobile_min_1 = isMobile_min.isMobile;

  /*!
	 * @pixi/settings - v5.1.0
	 * Compiled Fri, 19 Jul 2019 21:58:39 UTC
	 *
	 * @pixi/settings is licensed under the MIT License.
	 * http://www.opensource.org/licenses/mit-license
	 */

  /**
   * The maximum recommended texture units to use.
   * In theory the bigger the better, and for desktop we'll use as many as we can.
   * But some mobile devices slow down if there is to many branches in the shader.
   * So in practice there seems to be a sweet spot size that varies depending on the device.
   *
   * In v4, all mobile devices were limited to 4 texture units because for this.
   * In v5, we allow all texture units to be used on modern Apple or Android devices.
   *
   * @private
   * @param {number} max
   * @returns {number}
   */
  function maxRecommendedTextures(max)
  {
    var allowMax = true;

    if (isMobile_min.tablet || isMobile_min.phone)
    {
      allowMax = false;

      if (isMobile_min.apple.device)
      {
        var match = (navigator.userAgent).match(/OS (\d+)_(\d+)?/);

        if (match)
        {
          var majorVersion = parseInt(match[1], 10);

          // All texture units can be used on devices that support ios 11 or above
          if (majorVersion >= 11)
          {
            allowMax = true;
          }
        }
      }
      if (isMobile_min.android.device)
      {
        var match$1 = (navigator.userAgent).match(/Android\s([0-9.]*)/);

        if (match$1)
        {
          var majorVersion$1 = parseInt(match$1[1], 10);

          // All texture units can be used on devices that support Android 7 (Nougat) or above
          if (majorVersion$1 >= 7)
          {
            allowMax = true;
          }
        }
      }
    }

    return allowMax ? max : 4;
  }

  /**
   * Uploading the same buffer multiple times in a single frame can cause performance issues.
   * Apparent on iOS so only check for that at the moment
   * This check may become more complex if this issue pops up elsewhere.
   *
   * @private
   * @returns {boolean}
   */
  function canUploadSameBuffer()
  {
    return !isMobile_min.apple.device;
  }

  /**
   * User's customizable globals for overriding the default PIXI settings, such
   * as a renderer's default resolution, framerate, float precision, etc.
   * @example
   * // Use the native window resolution as the default resolution
   * // will support high-density displays when rendering
   * PIXI.settings.RESOLUTION = window.devicePixelRatio.
   *
   * // Disable interpolation when scaling, will make texture be pixelated
   * PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
   * @namespace PIXI.settings
   */
  var settings = {

    /**
     * If set to true WebGL will attempt make textures mimpaped by default.
     * Mipmapping will only succeed if the base texture uploaded has power of two dimensions.
     *
     * @static
     * @name MIPMAP_TEXTURES
     * @memberof PIXI.settings
     * @type {PIXI.MIPMAP_MODES}
     * @default PIXI.MIPMAP_MODES.POW2
     */
    MIPMAP_TEXTURES: 1,

    /**
     * Default anisotropic filtering level of textures.
     * Usually from 0 to 16
     *
     * @static
     * @name ANISOTROPIC_LEVEL
     * @memberof PIXI.settings
     * @type {number}
     * @default 16
     */
    ANISOTROPIC_LEVEL: 0,

    /**
     * Default resolution / device pixel ratio of the renderer.
     *
     * @static
     * @name RESOLUTION
     * @memberof PIXI.settings
     * @type {number}
     * @default 1
     */
    RESOLUTION: 1,

    /**
     * Default filter resolution.
     *
     * @static
     * @name FILTER_RESOLUTION
     * @memberof PIXI.settings
     * @type {number}
     * @default 1
     */
    FILTER_RESOLUTION: 1,

    /**
     * The maximum textures that this device supports.
     *
     * @static
     * @name SPRITE_MAX_TEXTURES
     * @memberof PIXI.settings
     * @type {number}
     * @default 32
     */
    SPRITE_MAX_TEXTURES: maxRecommendedTextures(32),

    // TODO: maybe change to SPRITE.BATCH_SIZE: 2000
    // TODO: maybe add PARTICLE.BATCH_SIZE: 15000

    /**
     * The default sprite batch size.
     *
     * The default aims to balance desktop and mobile devices.
     *
     * @static
     * @name SPRITE_BATCH_SIZE
     * @memberof PIXI.settings
     * @type {number}
     * @default 4096
     */
    SPRITE_BATCH_SIZE: 4096,

    /**
     * The default render options if none are supplied to {@link PIXI.Renderer}
     * or {@link PIXI.CanvasRenderer}.
     *
     * @static
     * @name RENDER_OPTIONS
     * @memberof PIXI.settings
     * @type {object}
     * @property {HTMLCanvasElement} view=null
     * @property {number} resolution=1
     * @property {boolean} antialias=false
     * @property {boolean} forceFXAA=false
     * @property {boolean} autoDensity=false
     * @property {boolean} transparent=false
     * @property {number} backgroundColor=0x000000
     * @property {boolean} clearBeforeRender=true
     * @property {boolean} preserveDrawingBuffer=false
     * @property {number} width=800
     * @property {number} height=600
     * @property {boolean} legacy=false
     */
    RENDER_OPTIONS: {
      view: null,
      antialias: false,
      forceFXAA: false,
      autoDensity: false,
      transparent: false,
      backgroundColor: 0x000000,
      clearBeforeRender: true,
      preserveDrawingBuffer: false,
      width: 800,
      height: 600,
      legacy: false,
    },

    /**
     * Default Garbage Collection mode.
     *
     * @static
     * @name GC_MODE
     * @memberof PIXI.settings
     * @type {PIXI.GC_MODES}
     * @default PIXI.GC_MODES.AUTO
     */
    GC_MODE: 0,

    /**
     * Default Garbage Collection max idle.
     *
     * @static
     * @name GC_MAX_IDLE
     * @memberof PIXI.settings
     * @type {number}
     * @default 3600
     */
    GC_MAX_IDLE: 60 * 60,

    /**
     * Default Garbage Collection maximum check count.
     *
     * @static
     * @name GC_MAX_CHECK_COUNT
     * @memberof PIXI.settings
     * @type {number}
     * @default 600
     */
    GC_MAX_CHECK_COUNT: 60 * 10,

    /**
     * Default wrap modes that are supported by pixi.
     *
     * @static
     * @name WRAP_MODE
     * @memberof PIXI.settings
     * @type {PIXI.WRAP_MODES}
     * @default PIXI.WRAP_MODES.CLAMP
     */
    WRAP_MODE: 33071,

    /**
     * Default scale mode for textures.
     *
     * @static
     * @name SCALE_MODE
     * @memberof PIXI.settings
     * @type {PIXI.SCALE_MODES}
     * @default PIXI.SCALE_MODES.LINEAR
     */
    SCALE_MODE: 1,

    /**
     * Default specify float precision in vertex shader.
     *
     * @static
     * @name PRECISION_VERTEX
     * @memberof PIXI.settings
     * @type {PIXI.PRECISION}
     * @default PIXI.PRECISION.HIGH
     */
    PRECISION_VERTEX: 'highp',

    /**
     * Default specify float precision in fragment shader.
     * iOS is best set at highp due to https://github.com/pixijs/pixi.js/issues/3742
     *
     * @static
     * @name PRECISION_FRAGMENT
     * @memberof PIXI.settings
     * @type {PIXI.PRECISION}
     * @default PIXI.PRECISION.MEDIUM
     */
    PRECISION_FRAGMENT: isMobile_min.apple.device ? 'highp' : 'mediump',

    /**
     * Can we upload the same buffer in a single frame?
     *
     * @static
     * @name CAN_UPLOAD_SAME_BUFFER
     * @memberof PIXI.settings
     * @type {boolean}
     */
    CAN_UPLOAD_SAME_BUFFER: canUploadSameBuffer(),

    /**
     * Enables bitmap creation before image load. This feature is experimental.
     *
     * @static
     * @name CREATE_IMAGE_BITMAP
     * @memberof PIXI.settings
     * @type {boolean}
     * @default false
     */
    CREATE_IMAGE_BITMAP: false,

    /**
     * If true PixiJS will Math.floor() x/y values when rendering, stopping pixel interpolation.
     * Advantages can include sharper image quality (like text) and faster rendering on canvas.
     * The main disadvantage is movement of objects may appear less smooth.
     *
     * @static
     * @constant
     * @memberof PIXI.settings
     * @type {boolean}
     * @default false
     */
    ROUND_PIXELS: false,
  };

  var eventemitter3 = createCommonjsModule(function (module) {
    'use strict';

    var has = Object.prototype.hasOwnProperty
      , prefix = '~';

    /**
     * Constructor to create a storage for our `EE` objects.
     * An `Events` instance is a plain object whose properties are event names.
     *
     * @constructor
     * @private
     */
    function Events() {}

    //
    // We try to not inherit from `Object.prototype`. In some engines creating an
    // instance in this way is faster than calling `Object.create(null)` directly.
    // If `Object.create(null)` is not supported we prefix the event names with a
    // character to make sure that the built-in object properties are not
    // overridden or used as an attack vector.
    //
    if (Object.create) {
      Events.prototype = Object.create(null);

      //
      // This hack is needed because the `__proto__` property is still inherited in
      // some old browsers like Android 4, iPhone 5.1, Opera 11 and Safari 5.
      //
      if (!new Events().__proto__) { prefix = false; }
    }

    /**
     * Representation of a single event listener.
     *
     * @param {Function} fn The listener function.
     * @param {*} context The context to invoke the listener with.
     * @param {Boolean} [once=false] Specify if the listener is a one-time listener.
     * @constructor
     * @private
     */
    function EE(fn, context, once) {
      this.fn = fn;
      this.context = context;
      this.once = once || false;
    }

    /**
     * Add a listener for a given event.
     *
     * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
     * @param {(String|Symbol)} event The event name.
     * @param {Function} fn The listener function.
     * @param {*} context The context to invoke the listener with.
     * @param {Boolean} once Specify if the listener is a one-time listener.
     * @returns {EventEmitter}
     * @private
     */
    function addListener(emitter, event, fn, context, once) {
      if (typeof fn !== 'function') {
        throw new TypeError('The listener must be a function');
      }

      var listener = new EE(fn, context || emitter, once)
        , evt = prefix ? prefix + event : event;

      if (!emitter._events[evt]) { emitter._events[evt] = listener, emitter._eventsCount++; }
      else if (!emitter._events[evt].fn) { emitter._events[evt].push(listener); }
      else { emitter._events[evt] = [emitter._events[evt], listener]; }

      return emitter;
    }

    /**
     * Clear event by name.
     *
     * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
     * @param {(String|Symbol)} evt The Event name.
     * @private
     */
    function clearEvent(emitter, evt) {
      if (--emitter._eventsCount === 0) { emitter._events = new Events(); }
      else { delete emitter._events[evt]; }
    }

    /**
     * Minimal `EventEmitter` interface that is molded against the Node.js
     * `EventEmitter` interface.
     *
     * @constructor
     * @public
     */
    function EventEmitter() {
      this._events = new Events();
      this._eventsCount = 0;
    }

    /**
     * Return an array listing the events for which the emitter has registered
     * listeners.
     *
     * @returns {Array}
     * @public
     */
    EventEmitter.prototype.eventNames = function eventNames() {
      var names = []
        , events
        , name;

      if (this._eventsCount === 0) { return names; }

      for (name in (events = this._events)) {
        if (has.call(events, name)) { names.push(prefix ? name.slice(1) : name); }
      }

      if (Object.getOwnPropertySymbols) {
        return names.concat(Object.getOwnPropertySymbols(events));
      }

      return names;
    };

    /**
     * Return the listeners registered for a given event.
     *
     * @param {(String|Symbol)} event The event name.
     * @returns {Array} The registered listeners.
     * @public
     */
    EventEmitter.prototype.listeners = function listeners(event) {
      var evt = prefix ? prefix + event : event
        , handlers = this._events[evt];

      if (!handlers) { return []; }
      if (handlers.fn) { return [handlers.fn]; }

      for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) {
        ee[i] = handlers[i].fn;
      }

      return ee;
    };

    /**
     * Return the number of listeners listening to a given event.
     *
     * @param {(String|Symbol)} event The event name.
     * @returns {Number} The number of listeners.
     * @public
     */
    EventEmitter.prototype.listenerCount = function listenerCount(event) {
      var evt = prefix ? prefix + event : event
        , listeners = this._events[evt];

      if (!listeners) { return 0; }
      if (listeners.fn) { return 1; }
      return listeners.length;
    };

    /**
     * Calls each of the listeners registered for a given event.
     *
     * @param {(String|Symbol)} event The event name.
     * @returns {Boolean} `true` if the event had listeners, else `false`.
     * @public
     */
    EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
      var arguments$1 = arguments;

      var evt = prefix ? prefix + event : event;

      if (!this._events[evt]) { return false; }

      var listeners = this._events[evt]
        , len = arguments.length
        , args
        , i;

      if (listeners.fn) {
        if (listeners.once) { this.removeListener(event, listeners.fn, undefined, true); }

        switch (len) {
          case 1: return listeners.fn.call(listeners.context), true;
          case 2: return listeners.fn.call(listeners.context, a1), true;
          case 3: return listeners.fn.call(listeners.context, a1, a2), true;
          case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
          case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
          case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
        }

        for (i = 1, args = new Array(len -1); i < len; i++) {
          args[i - 1] = arguments$1[i];
        }

        listeners.fn.apply(listeners.context, args);
      } else {
        var length = listeners.length
          , j;

        for (i = 0; i < length; i++) {
          if (listeners[i].once) { this.removeListener(event, listeners[i].fn, undefined, true); }

          switch (len) {
            case 1: listeners[i].fn.call(listeners[i].context); break;
            case 2: listeners[i].fn.call(listeners[i].context, a1); break;
            case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
            case 4: listeners[i].fn.call(listeners[i].context, a1, a2, a3); break;
            default:
              if (!args) { for (j = 1, args = new Array(len -1); j < len; j++) {
                args[j - 1] = arguments$1[j];
              } }

              listeners[i].fn.apply(listeners[i].context, args);
          }
        }
      }

      return true;
    };

    /**
     * Add a listener for a given event.
     *
     * @param {(String|Symbol)} event The event name.
     * @param {Function} fn The listener function.
     * @param {*} [context=this] The context to invoke the listener with.
     * @returns {EventEmitter} `this`.
     * @public
     */
    EventEmitter.prototype.on = function on(event, fn, context) {
      return addListener(this, event, fn, context, false);
    };

    /**
     * Add a one-time listener for a given event.
     *
     * @param {(String|Symbol)} event The event name.
     * @param {Function} fn The listener function.
     * @param {*} [context=this] The context to invoke the listener with.
     * @returns {EventEmitter} `this`.
     * @public
     */
    EventEmitter.prototype.once = function once(event, fn, context) {
      return addListener(this, event, fn, context, true);
    };

    /**
     * Remove the listeners of a given event.
     *
     * @param {(String|Symbol)} event The event name.
     * @param {Function} fn Only remove the listeners that match this function.
     * @param {*} context Only remove the listeners that have this context.
     * @param {Boolean} once Only remove one-time listeners.
     * @returns {EventEmitter} `this`.
     * @public
     */
    EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
      var evt = prefix ? prefix + event : event;

      if (!this._events[evt]) { return this; }
      if (!fn) {
        clearEvent(this, evt);
        return this;
      }

      var listeners = this._events[evt];

      if (listeners.fn) {
        if (
          listeners.fn === fn &&
          (!once || listeners.once) &&
          (!context || listeners.context === context)
        ) {
          clearEvent(this, evt);
        }
      } else {
        for (var i = 0, events = [], length = listeners.length; i < length; i++) {
          if (
            listeners[i].fn !== fn ||
            (once && !listeners[i].once) ||
            (context && listeners[i].context !== context)
          ) {
            events.push(listeners[i]);
          }
        }

        //
        // Reset the array, or remove it completely if we have no more listeners.
        //
        if (events.length) { this._events[evt] = events.length === 1 ? events[0] : events; }
        else { clearEvent(this, evt); }
      }

      return this;
    };

    /**
     * Remove all listeners, or those of the specified event.
     *
     * @param {(String|Symbol)} [event] The event name.
     * @returns {EventEmitter} `this`.
     * @public
     */
    EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
      var evt;

      if (event) {
        evt = prefix ? prefix + event : event;
        if (this._events[evt]) { clearEvent(this, evt); }
      } else {
        this._events = new Events();
        this._eventsCount = 0;
      }

      return this;
    };

    //
    // Alias methods names because people roll like that.
    //
    EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
    EventEmitter.prototype.addListener = EventEmitter.prototype.on;

    //
    // Expose the prefix.
    //
    EventEmitter.prefixed = prefix;

    //
    // Allow `EventEmitter` to be imported as module namespace.
    //
    EventEmitter.EventEmitter = EventEmitter;

    //
    // Expose the module.
    //
    if ('undefined' !== 'object') {
      module.exports = EventEmitter;
    }
  });

  'use strict';

  var earcut_1 = earcut;
  var default_1 = earcut;

  function earcut(data, holeIndices, dim) {

    dim = dim || 2;

    var hasHoles = holeIndices && holeIndices.length,
      outerLen = hasHoles ? holeIndices[0] * dim : data.length,
      outerNode = linkedList(data, 0, outerLen, dim, true),
      triangles = [];

    if (!outerNode || outerNode.next === outerNode.prev) { return triangles; }

    var minX, minY, maxX, maxY, x, y, invSize;

    if (hasHoles) { outerNode = eliminateHoles(data, holeIndices, outerNode, dim); }

    // if the shape is not too simple, we'll use z-order curve hash later; calculate polygon bbox
    if (data.length > 80 * dim) {
      minX = maxX = data[0];
      minY = maxY = data[1];

      for (var i = dim; i < outerLen; i += dim) {
        x = data[i];
        y = data[i + 1];
        if (x < minX) { minX = x; }
        if (y < minY) { minY = y; }
        if (x > maxX) { maxX = x; }
        if (y > maxY) { maxY = y; }
      }

      // minX, minY and invSize are later used to transform coords into integers for z-order calculation
      invSize = Math.max(maxX - minX, maxY - minY);
      invSize = invSize !== 0 ? 1 / invSize : 0;
    }

    earcutLinked(outerNode, triangles, dim, minX, minY, invSize);

    return triangles;
  }

  // create a circular doubly linked list from polygon points in the specified winding order
  function linkedList(data, start, end, dim, clockwise) {
    var i, last;

    if (clockwise === (signedArea(data, start, end, dim) > 0)) {
      for (i = start; i < end; i += dim) { last = insertNode(i, data[i], data[i + 1], last); }
    } else {
      for (i = end - dim; i >= start; i -= dim) { last = insertNode(i, data[i], data[i + 1], last); }
    }

    if (last && equals(last, last.next)) {
      removeNode(last);
      last = last.next;
    }

    return last;
  }

  // eliminate colinear or duplicate points
  function filterPoints(start, end) {
    if (!start) { return start; }
    if (!end) { end = start; }

    var p = start,
      again;
    do {
      again = false;

      if (!p.steiner && (equals(p, p.next) || area(p.prev, p, p.next) === 0)) {
        removeNode(p);
        p = end = p.prev;
        if (p === p.next) { break; }
        again = true;

      } else {
        p = p.next;
      }
    } while (again || p !== end);

    return end;
  }

  // main ear slicing loop which triangulates a polygon (given as a linked list)
  function earcutLinked(ear, triangles, dim, minX, minY, invSize, pass) {
    if (!ear) { return; }

    // interlink polygon nodes in z-order
    if (!pass && invSize) { indexCurve(ear, minX, minY, invSize); }

    var stop = ear,
      prev, next;

    // iterate through ears, slicing them one by one
    while (ear.prev !== ear.next) {
      prev = ear.prev;
      next = ear.next;

      if (invSize ? isEarHashed(ear, minX, minY, invSize) : isEar(ear)) {
        // cut off the triangle
        triangles.push(prev.i / dim);
        triangles.push(ear.i / dim);
        triangles.push(next.i / dim);

        removeNode(ear);

        // skipping the next vertex leads to less sliver triangles
        ear = next.next;
        stop = next.next;

        continue;
      }

      ear = next;

      // if we looped through the whole remaining polygon and can't find any more ears
      if (ear === stop) {
        // try filtering points and slicing again
        if (!pass) {
          earcutLinked(filterPoints(ear), triangles, dim, minX, minY, invSize, 1);

          // if this didn't work, try curing all small self-intersections locally
        } else if (pass === 1) {
          ear = cureLocalIntersections(ear, triangles, dim);
          earcutLinked(ear, triangles, dim, minX, minY, invSize, 2);

          // as a last resort, try splitting the remaining polygon into two
        } else if (pass === 2) {
          splitEarcut(ear, triangles, dim, minX, minY, invSize);
        }

        break;
      }
    }
  }

  // check whether a polygon node forms a valid ear with adjacent nodes
  function isEar(ear) {
    var a = ear.prev,
      b = ear,
      c = ear.next;

    if (area(a, b, c) >= 0) { return false; } // reflex, can't be an ear

    // now make sure we don't have other points inside the potential ear
    var p = ear.next.next;

    while (p !== ear.prev) {
      if (pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) &&
        area(p.prev, p, p.next) >= 0) { return false; }
      p = p.next;
    }

    return true;
  }

  function isEarHashed(ear, minX, minY, invSize) {
    var a = ear.prev,
      b = ear,
      c = ear.next;

    if (area(a, b, c) >= 0) { return false; } // reflex, can't be an ear

    // triangle bbox; min & max are calculated like this for speed
    var minTX = a.x < b.x ? (a.x < c.x ? a.x : c.x) : (b.x < c.x ? b.x : c.x),
      minTY = a.y < b.y ? (a.y < c.y ? a.y : c.y) : (b.y < c.y ? b.y : c.y),
      maxTX = a.x > b.x ? (a.x > c.x ? a.x : c.x) : (b.x > c.x ? b.x : c.x),
      maxTY = a.y > b.y ? (a.y > c.y ? a.y : c.y) : (b.y > c.y ? b.y : c.y);

    // z-order range for the current triangle bbox;
    var minZ = zOrder(minTX, minTY, minX, minY, invSize),
      maxZ = zOrder(maxTX, maxTY, minX, minY, invSize);

    var p = ear.prevZ,
      n = ear.nextZ;

    // look for points inside the triangle in both directions
    while (p && p.z >= minZ && n && n.z <= maxZ) {
      if (p !== ear.prev && p !== ear.next &&
        pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) &&
        area(p.prev, p, p.next) >= 0) { return false; }
      p = p.prevZ;

      if (n !== ear.prev && n !== ear.next &&
        pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, n.x, n.y) &&
        area(n.prev, n, n.next) >= 0) { return false; }
      n = n.nextZ;
    }

    // look for remaining points in decreasing z-order
    while (p && p.z >= minZ) {
      if (p !== ear.prev && p !== ear.next &&
        pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) &&
        area(p.prev, p, p.next) >= 0) { return false; }
      p = p.prevZ;
    }

    // look for remaining points in increasing z-order
    while (n && n.z <= maxZ) {
      if (n !== ear.prev && n !== ear.next &&
        pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, n.x, n.y) &&
        area(n.prev, n, n.next) >= 0) { return false; }
      n = n.nextZ;
    }

    return true;
  }

  // go through all polygon nodes and cure small local self-intersections
  function cureLocalIntersections(start, triangles, dim) {
    var p = start;
    do {
      var a = p.prev,
        b = p.next.next;

      if (!equals(a, b) && intersects(a, p, p.next, b) && locallyInside(a, b) && locallyInside(b, a)) {

        triangles.push(a.i / dim);
        triangles.push(p.i / dim);
        triangles.push(b.i / dim);

        // remove two nodes involved
        removeNode(p);
        removeNode(p.next);

        p = start = b;
      }
      p = p.next;
    } while (p !== start);

    return p;
  }

  // try splitting polygon into two and triangulate them independently
  function splitEarcut(start, triangles, dim, minX, minY, invSize) {
    // look for a valid diagonal that divides the polygon into two
    var a = start;
    do {
      var b = a.next.next;
      while (b !== a.prev) {
        if (a.i !== b.i && isValidDiagonal(a, b)) {
          // split the polygon in two by the diagonal
          var c = splitPolygon(a, b);

          // filter colinear points around the cuts
          a = filterPoints(a, a.next);
          c = filterPoints(c, c.next);

          // run earcut on each half
          earcutLinked(a, triangles, dim, minX, minY, invSize);
          earcutLinked(c, triangles, dim, minX, minY, invSize);
          return;
        }
        b = b.next;
      }
      a = a.next;
    } while (a !== start);
  }

  // link every hole into the outer loop, producing a single-ring polygon without holes
  function eliminateHoles(data, holeIndices, outerNode, dim) {
    var queue = [],
      i, len, start, end, list;

    for (i = 0, len = holeIndices.length; i < len; i++) {
      start = holeIndices[i] * dim;
      end = i < len - 1 ? holeIndices[i + 1] * dim : data.length;
      list = linkedList(data, start, end, dim, false);
      if (list === list.next) { list.steiner = true; }
      queue.push(getLeftmost(list));
    }

    queue.sort(compareX);

    // process holes from left to right
    for (i = 0; i < queue.length; i++) {
      eliminateHole(queue[i], outerNode);
      outerNode = filterPoints(outerNode, outerNode.next);
    }

    return outerNode;
  }

  function compareX(a, b) {
    return a.x - b.x;
  }

  // find a bridge between vertices that connects hole with an outer ring and and link it
  function eliminateHole(hole, outerNode) {
    outerNode = findHoleBridge(hole, outerNode);
    if (outerNode) {
      var b = splitPolygon(outerNode, hole);
      filterPoints(b, b.next);
    }
  }

  // David Eberly's algorithm for finding a bridge between hole and outer polygon
  function findHoleBridge(hole, outerNode) {
    var p = outerNode,
      hx = hole.x,
      hy = hole.y,
      qx = -Infinity,
      m;

    // find a segment intersected by a ray from the hole's leftmost point to the left;
    // segment's endpoint with lesser x will be potential connection point
    do {
      if (hy <= p.y && hy >= p.next.y && p.next.y !== p.y) {
        var x = p.x + (hy - p.y) * (p.next.x - p.x) / (p.next.y - p.y);
        if (x <= hx && x > qx) {
          qx = x;
          if (x === hx) {
            if (hy === p.y) { return p; }
            if (hy === p.next.y) { return p.next; }
          }
          m = p.x < p.next.x ? p : p.next;
        }
      }
      p = p.next;
    } while (p !== outerNode);

    if (!m) { return null; }

    if (hx === qx) { return m.prev; } // hole touches outer segment; pick lower endpoint

    // look for points inside the triangle of hole point, segment intersection and endpoint;
    // if there are no points found, we have a valid connection;
    // otherwise choose the point of the minimum angle with the ray as connection point

    var stop = m,
      mx = m.x,
      my = m.y,
      tanMin = Infinity,
      tan;

    p = m.next;

    while (p !== stop) {
      if (hx >= p.x && p.x >= mx && hx !== p.x &&
        pointInTriangle(hy < my ? hx : qx, hy, mx, my, hy < my ? qx : hx, hy, p.x, p.y)) {

        tan = Math.abs(hy - p.y) / (hx - p.x); // tangential

        if ((tan < tanMin || (tan === tanMin && p.x > m.x)) && locallyInside(p, hole)) {
          m = p;
          tanMin = tan;
        }
      }

      p = p.next;
    }

    return m;
  }

  // interlink polygon nodes in z-order
  function indexCurve(start, minX, minY, invSize) {
    var p = start;
    do {
      if (p.z === null) { p.z = zOrder(p.x, p.y, minX, minY, invSize); }
      p.prevZ = p.prev;
      p.nextZ = p.next;
      p = p.next;
    } while (p !== start);

    p.prevZ.nextZ = null;
    p.prevZ = null;

    sortLinked(p);
  }

  // Simon Tatham's linked list merge sort algorithm
  // http://www.chiark.greenend.org.uk/~sgtatham/algorithms/listsort.html
  function sortLinked(list) {
    var i, p, q, e, tail, numMerges, pSize, qSize,
      inSize = 1;

    do {
      p = list;
      list = null;
      tail = null;
      numMerges = 0;

      while (p) {
        numMerges++;
        q = p;
        pSize = 0;
        for (i = 0; i < inSize; i++) {
          pSize++;
          q = q.nextZ;
          if (!q) { break; }
        }
        qSize = inSize;

        while (pSize > 0 || (qSize > 0 && q)) {

          if (pSize !== 0 && (qSize === 0 || !q || p.z <= q.z)) {
            e = p;
            p = p.nextZ;
            pSize--;
          } else {
            e = q;
            q = q.nextZ;
            qSize--;
          }

          if (tail) { tail.nextZ = e; }
          else { list = e; }

          e.prevZ = tail;
          tail = e;
        }

        p = q;
      }

      tail.nextZ = null;
      inSize *= 2;

    } while (numMerges > 1);

    return list;
  }

  // z-order of a point given coords and inverse of the longer side of data bbox
  function zOrder(x, y, minX, minY, invSize) {
    // coords are transformed into non-negative 15-bit integer range
    x = 32767 * (x - minX) * invSize;
    y = 32767 * (y - minY) * invSize;

    x = (x | (x << 8)) & 0x00FF00FF;
    x = (x | (x << 4)) & 0x0F0F0F0F;
    x = (x | (x << 2)) & 0x33333333;
    x = (x | (x << 1)) & 0x55555555;

    y = (y | (y << 8)) & 0x00FF00FF;
    y = (y | (y << 4)) & 0x0F0F0F0F;
    y = (y | (y << 2)) & 0x33333333;
    y = (y | (y << 1)) & 0x55555555;

    return x | (y << 1);
  }

  // find the leftmost node of a polygon ring
  function getLeftmost(start) {
    var p = start,
      leftmost = start;
    do {
      if (p.x < leftmost.x || (p.x === leftmost.x && p.y < leftmost.y)) { leftmost = p; }
      p = p.next;
    } while (p !== start);

    return leftmost;
  }

  // check if a point lies within a convex triangle
  function pointInTriangle(ax, ay, bx, by, cx, cy, px, py) {
    return (cx - px) * (ay - py) - (ax - px) * (cy - py) >= 0 &&
      (ax - px) * (by - py) - (bx - px) * (ay - py) >= 0 &&
      (bx - px) * (cy - py) - (cx - px) * (by - py) >= 0;
  }

  // check if a diagonal between two polygon nodes is valid (lies in polygon interior)
  function isValidDiagonal(a, b) {
    return a.next.i !== b.i && a.prev.i !== b.i && !intersectsPolygon(a, b) &&
      locallyInside(a, b) && locallyInside(b, a) && middleInside(a, b);
  }

  // signed area of a triangle
  function area(p, q, r) {
    return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
  }

  // check if two points are equal
  function equals(p1, p2) {
    return p1.x === p2.x && p1.y === p2.y;
  }

  // check if two segments intersect
  function intersects(p1, q1, p2, q2) {
    if ((equals(p1, q1) && equals(p2, q2)) ||
      (equals(p1, q2) && equals(p2, q1))) { return true; }
    return area(p1, q1, p2) > 0 !== area(p1, q1, q2) > 0 &&
      area(p2, q2, p1) > 0 !== area(p2, q2, q1) > 0;
  }

  // check if a polygon diagonal intersects any polygon segments
  function intersectsPolygon(a, b) {
    var p = a;
    do {
      if (p.i !== a.i && p.next.i !== a.i && p.i !== b.i && p.next.i !== b.i &&
        intersects(p, p.next, a, b)) { return true; }
      p = p.next;
    } while (p !== a);

    return false;
  }

  // check if a polygon diagonal is locally inside the polygon
  function locallyInside(a, b) {
    return area(a.prev, a, a.next) < 0 ?
      area(a, b, a.next) >= 0 && area(a, a.prev, b) >= 0 :
      area(a, b, a.prev) < 0 || area(a, a.next, b) < 0;
  }

  // check if the middle point of a polygon diagonal is inside the polygon
  function middleInside(a, b) {
    var p = a,
      inside = false,
      px = (a.x + b.x) / 2,
      py = (a.y + b.y) / 2;
    do {
      if (((p.y > py) !== (p.next.y > py)) && p.next.y !== p.y &&
        (px < (p.next.x - p.x) * (py - p.y) / (p.next.y - p.y) + p.x))
      { inside = !inside; }
      p = p.next;
    } while (p !== a);

    return inside;
  }

  // link two polygon vertices with a bridge; if the vertices belong to the same ring, it splits polygon into two;
  // if one belongs to the outer ring and another to a hole, it merges it into a single ring
  function splitPolygon(a, b) {
    var a2 = new Node(a.i, a.x, a.y),
      b2 = new Node(b.i, b.x, b.y),
      an = a.next,
      bp = b.prev;

    a.next = b;
    b.prev = a;

    a2.next = an;
    an.prev = a2;

    b2.next = a2;
    a2.prev = b2;

    bp.next = b2;
    b2.prev = bp;

    return b2;
  }

  // create a node and optionally link it with previous one (in a circular doubly linked list)
  function insertNode(i, x, y, last) {
    var p = new Node(i, x, y);

    if (!last) {
      p.prev = p;
      p.next = p;

    } else {
      p.next = last.next;
      p.prev = last;
      last.next.prev = p;
      last.next = p;
    }
    return p;
  }

  function removeNode(p) {
    p.next.prev = p.prev;
    p.prev.next = p.next;

    if (p.prevZ) { p.prevZ.nextZ = p.nextZ; }
    if (p.nextZ) { p.nextZ.prevZ = p.prevZ; }
  }

  function Node(i, x, y) {
    // vertex index in coordinates array
    this.i = i;

    // vertex coordinates
    this.x = x;
    this.y = y;

    // previous and next vertex nodes in a polygon ring
    this.prev = null;
    this.next = null;

    // z-order curve value
    this.z = null;

    // previous and next nodes in z-order
    this.prevZ = null;
    this.nextZ = null;

    // indicates whether this is a steiner point
    this.steiner = false;
  }

  // return a percentage difference between the polygon area and its triangulation area;
  // used to verify correctness of triangulation
  earcut.deviation = function (data, holeIndices, dim, triangles) {
    var hasHoles = holeIndices && holeIndices.length;
    var outerLen = hasHoles ? holeIndices[0] * dim : data.length;

    var polygonArea = Math.abs(signedArea(data, 0, outerLen, dim));
    if (hasHoles) {
      for (var i = 0, len = holeIndices.length; i < len; i++) {
        var start = holeIndices[i] * dim;
        var end = i < len - 1 ? holeIndices[i + 1] * dim : data.length;
        polygonArea -= Math.abs(signedArea(data, start, end, dim));
      }
    }

    var trianglesArea = 0;
    for (i = 0; i < triangles.length; i += 3) {
      var a = triangles[i] * dim;
      var b = triangles[i + 1] * dim;
      var c = triangles[i + 2] * dim;
      trianglesArea += Math.abs(
        (data[a] - data[c]) * (data[b + 1] - data[a + 1]) -
        (data[a] - data[b]) * (data[c + 1] - data[a + 1]));
    }

    return polygonArea === 0 && trianglesArea === 0 ? 0 :
      Math.abs((trianglesArea - polygonArea) / polygonArea);
  };

  function signedArea(data, start, end, dim) {
    var sum = 0;
    for (var i = start, j = end - dim; i < end; i += dim) {
      sum += (data[j] - data[i]) * (data[i + 1] + data[j + 1]);
      j = i;
    }
    return sum;
  }

  // turn a polygon in a multi-dimensional array form (e.g. as in GeoJSON) into a form Earcut accepts
  earcut.flatten = function (data) {
    var dim = data[0][0].length,
      result = {vertices: [], holes: [], dimensions: dim},
      holeIndex = 0;

    for (var i = 0; i < data.length; i++) {
      for (var j = 0; j < data[i].length; j++) {
        for (var d = 0; d < dim; d++) { result.vertices.push(data[i][j][d]); }
      }
      if (i > 0) {
        holeIndex += data[i - 1].length;
        result.holes.push(holeIndex);
      }
    }
    return result;
  };
  earcut_1.default = default_1;

  var punycode = createCommonjsModule(function (module, exports) {
    /*! https://mths.be/punycode v1.3.2 by @mathias */
    ;(function(root) {

      /** Detect free variables */
      var freeExports = 'object' == 'object' && exports &&
        !exports.nodeType && exports;
      var freeModule = 'object' == 'object' && module &&
        !module.nodeType && module;
      var freeGlobal = typeof commonjsGlobal == 'object' && commonjsGlobal;
      if (
        freeGlobal.global === freeGlobal ||
        freeGlobal.window === freeGlobal ||
        freeGlobal.self === freeGlobal
      ) {
        root = freeGlobal;
      }

      /**
       * The `punycode` object.
       * @name punycode
       * @type Object
       */
      var punycode,

        /** Highest positive signed 32-bit float value */
        maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

        /** Bootstring parameters */
        base = 36,
        tMin = 1,
        tMax = 26,
        skew = 38,
        damp = 700,
        initialBias = 72,
        initialN = 128, // 0x80
        delimiter = '-', // '\x2D'

        /** Regular expressions */
        regexPunycode = /^xn--/,
        regexNonASCII = /[^\x20-\x7E]/, // unprintable ASCII chars + non-ASCII chars
        regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, // RFC 3490 separators

        /** Error messages */
        errors = {
          'overflow': 'Overflow: input needs wider integers to process',
          'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
          'invalid-input': 'Invalid input'
        },

        /** Convenience shortcuts */
        baseMinusTMin = base - tMin,
        floor = Math.floor,
        stringFromCharCode = String.fromCharCode,

        /** Temporary variable */
        key;

      /*--------------------------------------------------------------------------*/

      /**
       * A generic error utility function.
       * @private
       * @param {String} type The error type.
       * @returns {Error} Throws a `RangeError` with the applicable error message.
       */
      function error(type) {
        throw RangeError(errors[type]);
      }

      /**
       * A generic `Array#map` utility function.
       * @private
       * @param {Array} array The array to iterate over.
       * @param {Function} callback The function that gets called for every array
       * item.
       * @returns {Array} A new array of values returned by the callback function.
       */
      function map(array, fn) {
        var length = array.length;
        var result = [];
        while (length--) {
          result[length] = fn(array[length]);
        }
        return result;
      }

      /**
       * A simple `Array#map`-like wrapper to work with domain name strings or email
       * addresses.
       * @private
       * @param {String} domain The domain name or email address.
       * @param {Function} callback The function that gets called for every
       * character.
       * @returns {Array} A new string of characters returned by the callback
       * function.
       */
      function mapDomain(string, fn) {
        var parts = string.split('@');
        var result = '';
        if (parts.length > 1) {
          // In email addresses, only the domain name should be punycoded. Leave
          // the local part (i.e. everything up to `@`) intact.
          result = parts[0] + '@';
          string = parts[1];
        }
        // Avoid `split(regex)` for IE8 compatibility. See #17.
        string = string.replace(regexSeparators, '\x2E');
        var labels = string.split('.');
        var encoded = map(labels, fn).join('.');
        return result + encoded;
      }

      /**
       * Creates an array containing the numeric code points of each Unicode
       * character in the string. While JavaScript uses UCS-2 internally,
       * this function will convert a pair of surrogate halves (each of which
       * UCS-2 exposes as separate characters) into a single code point,
       * matching UTF-16.
       * @see `punycode.ucs2.encode`
       * @see <https://mathiasbynens.be/notes/javascript-encoding>
       * @memberOf punycode.ucs2
       * @name decode
       * @param {String} string The Unicode input string (UCS-2).
       * @returns {Array} The new array of code points.
       */
      function ucs2decode(string) {
        var output = [],
          counter = 0,
          length = string.length,
          value,
          extra;
        while (counter < length) {
          value = string.charCodeAt(counter++);
          if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
            // high surrogate, and there is a next character
            extra = string.charCodeAt(counter++);
            if ((extra & 0xFC00) == 0xDC00) { // low surrogate
              output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
            } else {
              // unmatched surrogate; only append this code unit, in case the next
              // code unit is the high surrogate of a surrogate pair
              output.push(value);
              counter--;
            }
          } else {
            output.push(value);
          }
        }
        return output;
      }

      /**
       * Creates a string based on an array of numeric code points.
       * @see `punycode.ucs2.decode`
       * @memberOf punycode.ucs2
       * @name encode
       * @param {Array} codePoints The array of numeric code points.
       * @returns {String} The new Unicode string (UCS-2).
       */
      function ucs2encode(array) {
        return map(array, function(value) {
          var output = '';
          if (value > 0xFFFF) {
            value -= 0x10000;
            output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
            value = 0xDC00 | value & 0x3FF;
          }
          output += stringFromCharCode(value);
          return output;
        }).join('');
      }

      /**
       * Converts a basic code point into a digit/integer.
       * @see `digitToBasic()`
       * @private
       * @param {Number} codePoint The basic numeric code point value.
       * @returns {Number} The numeric value of a basic code point (for use in
       * representing integers) in the range `0` to `base - 1`, or `base` if
       * the code point does not represent a value.
       */
      function basicToDigit(codePoint) {
        if (codePoint - 48 < 10) {
          return codePoint - 22;
        }
        if (codePoint - 65 < 26) {
          return codePoint - 65;
        }
        if (codePoint - 97 < 26) {
          return codePoint - 97;
        }
        return base;
      }

      /**
       * Converts a digit/integer into a basic code point.
       * @see `basicToDigit()`
       * @private
       * @param {Number} digit The numeric value of a basic code point.
       * @returns {Number} The basic code point whose value (when used for
       * representing integers) is `digit`, which needs to be in the range
       * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
       * used; else, the lowercase form is used. The behavior is undefined
       * if `flag` is non-zero and `digit` has no uppercase form.
       */
      function digitToBasic(digit, flag) {
        //  0..25 map to ASCII a..z or A..Z
        // 26..35 map to ASCII 0..9
        return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
      }

      /**
       * Bias adaptation function as per section 3.4 of RFC 3492.
       * http://tools.ietf.org/html/rfc3492#section-3.4
       * @private
       */
      function adapt(delta, numPoints, firstTime) {
        var k = 0;
        delta = firstTime ? floor(delta / damp) : delta >> 1;
        delta += floor(delta / numPoints);
        for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
          delta = floor(delta / baseMinusTMin);
        }
        return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
      }

      /**
       * Converts a Punycode string of ASCII-only symbols to a string of Unicode
       * symbols.
       * @memberOf punycode
       * @param {String} input The Punycode string of ASCII-only symbols.
       * @returns {String} The resulting string of Unicode symbols.
       */
      function decode(input) {
        // Don't use UCS-2
        var output = [],
          inputLength = input.length,
          out,
          i = 0,
          n = initialN,
          bias = initialBias,
          basic,
          j,
          index,
          oldi,
          w,
          k,
          digit,
          t,
          /** Cached calculation results */
          baseMinusT;

        // Handle the basic code points: let `basic` be the number of input code
        // points before the last delimiter, or `0` if there is none, then copy
        // the first basic code points to the output.

        basic = input.lastIndexOf(delimiter);
        if (basic < 0) {
          basic = 0;
        }

        for (j = 0; j < basic; ++j) {
          // if it's not a basic code point
          if (input.charCodeAt(j) >= 0x80) {
            error('not-basic');
          }
          output.push(input.charCodeAt(j));
        }

        // Main decoding loop: start just after the last delimiter if any basic code
        // points were copied; start at the beginning otherwise.

        for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

          // `index` is the index of the next character to be consumed.
          // Decode a generalized variable-length integer into `delta`,
          // which gets added to `i`. The overflow checking is easier
          // if we increase `i` as we go, then subtract off its starting
          // value at the end to obtain `delta`.
          for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

            if (index >= inputLength) {
              error('invalid-input');
            }

            digit = basicToDigit(input.charCodeAt(index++));

            if (digit >= base || digit > floor((maxInt - i) / w)) {
              error('overflow');
            }

            i += digit * w;
            t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

            if (digit < t) {
              break;
            }

            baseMinusT = base - t;
            if (w > floor(maxInt / baseMinusT)) {
              error('overflow');
            }

            w *= baseMinusT;

          }

          out = output.length + 1;
          bias = adapt(i - oldi, out, oldi == 0);

          // `i` was supposed to wrap around from `out` to `0`,
          // incrementing `n` each time, so we'll fix that now:
          if (floor(i / out) > maxInt - n) {
            error('overflow');
          }

          n += floor(i / out);
          i %= out;

          // Insert `n` at position `i` of the output
          output.splice(i++, 0, n);

        }

        return ucs2encode(output);
      }

      /**
       * Converts a string of Unicode symbols (e.g. a domain name label) to a
       * Punycode string of ASCII-only symbols.
       * @memberOf punycode
       * @param {String} input The string of Unicode symbols.
       * @returns {String} The resulting Punycode string of ASCII-only symbols.
       */
      function encode(input) {
        var n,
          delta,
          handledCPCount,
          basicLength,
          bias,
          j,
          m,
          q,
          k,
          t,
          currentValue,
          output = [],
          /** `inputLength` will hold the number of code points in `input`. */
          inputLength,
          /** Cached calculation results */
          handledCPCountPlusOne,
          baseMinusT,
          qMinusT;

        // Convert the input in UCS-2 to Unicode
        input = ucs2decode(input);

        // Cache the length
        inputLength = input.length;

        // Initialize the state
        n = initialN;
        delta = 0;
        bias = initialBias;

        // Handle the basic code points
        for (j = 0; j < inputLength; ++j) {
          currentValue = input[j];
          if (currentValue < 0x80) {
            output.push(stringFromCharCode(currentValue));
          }
        }

        handledCPCount = basicLength = output.length;

        // `handledCPCount` is the number of code points that have been handled;
        // `basicLength` is the number of basic code points.

        // Finish the basic string - if it is not empty - with a delimiter
        if (basicLength) {
          output.push(delimiter);
        }

        // Main encoding loop:
        while (handledCPCount < inputLength) {

          // All non-basic code points < n have been handled already. Find the next
          // larger one:
          for (m = maxInt, j = 0; j < inputLength; ++j) {
            currentValue = input[j];
            if (currentValue >= n && currentValue < m) {
              m = currentValue;
            }
          }

          // Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
          // but guard against overflow
          handledCPCountPlusOne = handledCPCount + 1;
          if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
            error('overflow');
          }

          delta += (m - n) * handledCPCountPlusOne;
          n = m;

          for (j = 0; j < inputLength; ++j) {
            currentValue = input[j];

            if (currentValue < n && ++delta > maxInt) {
              error('overflow');
            }

            if (currentValue == n) {
              // Represent delta as a generalized variable-length integer
              for (q = delta, k = base; /* no condition */; k += base) {
                t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
                if (q < t) {
                  break;
                }
                qMinusT = q - t;
                baseMinusT = base - t;
                output.push(
                  stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
                );
                q = floor(qMinusT / baseMinusT);
              }

              output.push(stringFromCharCode(digitToBasic(q, 0)));
              bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
              delta = 0;
              ++handledCPCount;
            }
          }

          ++delta;
          ++n;

        }
        return output.join('');
      }

      /**
       * Converts a Punycode string representing a domain name or an email address
       * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
       * it doesn't matter if you call it on a string that has already been
       * converted to Unicode.
       * @memberOf punycode
       * @param {String} input The Punycoded domain name or email address to
       * convert to Unicode.
       * @returns {String} The Unicode representation of the given Punycode
       * string.
       */
      function toUnicode(input) {
        return mapDomain(input, function(string) {
          return regexPunycode.test(string)
            ? decode(string.slice(4).toLowerCase())
            : string;
        });
      }

      /**
       * Converts a Unicode string representing a domain name or an email address to
       * Punycode. Only the non-ASCII parts of the domain name will be converted,
       * i.e. it doesn't matter if you call it with a domain that's already in
       * ASCII.
       * @memberOf punycode
       * @param {String} input The domain name or email address to convert, as a
       * Unicode string.
       * @returns {String} The Punycode representation of the given domain name or
       * email address.
       */
      function toASCII(input) {
        return mapDomain(input, function(string) {
          return regexNonASCII.test(string)
            ? 'xn--' + encode(string)
            : string;
        });
      }

      /*--------------------------------------------------------------------------*/

      /** Define the public API */
      punycode = {
        /**
         * A string representing the current Punycode.js version number.
         * @memberOf punycode
         * @type String
         */
        'version': '1.3.2',
        /**
         * An object of methods to convert from JavaScript's internal character
         * representation (UCS-2) to Unicode code points, and back.
         * @see <https://mathiasbynens.be/notes/javascript-encoding>
         * @memberOf punycode
         * @type Object
         */
        'ucs2': {
          'decode': ucs2decode,
          'encode': ucs2encode
        },
        'decode': decode,
        'encode': encode,
        'toASCII': toASCII,
        'toUnicode': toUnicode
      };

      /** Expose `punycode` */
      // Some AMD build optimizers, like r.js, check for specific condition patterns
      // like the following:
      if (
        typeof undefined == 'function' &&
        typeof undefined.amd == 'object' &&
        undefined.amd
      ) {
        undefined('punycode', function() {
          return punycode;
        });
      } else if (freeExports && freeModule) {
        if (module.exports == freeExports) { // in Node.js or RingoJS v0.8.0+
          freeModule.exports = punycode;
        } else { // in Narwhal or RingoJS v0.7.0-
          for (key in punycode) {
            punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
          }
        }
      } else { // in Rhino or a web browser
        root.punycode = punycode;
      }

    }(commonjsGlobal));
  });

  'use strict';

  var util = {
    isString: function(arg) {
      return typeof(arg) === 'string';
    },
    isObject: function(arg) {
      return typeof(arg) === 'object' && arg !== null;
    },
    isNull: function(arg) {
      return arg === null;
    },
    isNullOrUndefined: function(arg) {
      return arg == null;
    }
  };
  var util_1 = util.isString;
  var util_2 = util.isObject;
  var util_3 = util.isNull;
  var util_4 = util.isNullOrUndefined;

  // Copyright Joyent, Inc. and other Node contributors.
  //
  // Permission is hereby granted, free of charge, to any person obtaining a
  // copy of this software and associated documentation files (the
  // "Software"), to deal in the Software without restriction, including
  // without limitation the rights to use, copy, modify, merge, publish,
  // distribute, sublicense, and/or sell copies of the Software, and to permit
  // persons to whom the Software is furnished to do so, subject to the
  // following conditions:
  //
  // The above copyright notice and this permission notice shall be included
  // in all copies or substantial portions of the Software.
  //
  // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
  // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
  // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
  // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
  // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
  // USE OR OTHER DEALINGS IN THE SOFTWARE.

  'use strict';

  // If obj.hasOwnProperty has been overridden, then calling
  // obj.hasOwnProperty(prop) will break.
  // See: https://github.com/joyent/node/issues/1707
  function hasOwnProperty$1(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  }

  var decode = function(qs, sep, eq, options) {
    sep = sep || '&';
    eq = eq || '=';
    var obj = {};

    if (typeof qs !== 'string' || qs.length === 0) {
      return obj;
    }

    var regexp = /\+/g;
    qs = qs.split(sep);

    var maxKeys = 1000;
    if (options && typeof options.maxKeys === 'number') {
      maxKeys = options.maxKeys;
    }

    var len = qs.length;
    // maxKeys <= 0 means that we should not limit keys count
    if (maxKeys > 0 && len > maxKeys) {
      len = maxKeys;
    }

    for (var i = 0; i < len; ++i) {
      var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

      if (idx >= 0) {
        kstr = x.substr(0, idx);
        vstr = x.substr(idx + 1);
      } else {
        kstr = x;
        vstr = '';
      }

      k = decodeURIComponent(kstr);
      v = decodeURIComponent(vstr);

      if (!hasOwnProperty$1(obj, k)) {
        obj[k] = v;
      } else if (Array.isArray(obj[k])) {
        obj[k].push(v);
      } else {
        obj[k] = [obj[k], v];
      }
    }

    return obj;
  };

  // Copyright Joyent, Inc. and other Node contributors.
  //
  // Permission is hereby granted, free of charge, to any person obtaining a
  // copy of this software and associated documentation files (the
  // "Software"), to deal in the Software without restriction, including
  // without limitation the rights to use, copy, modify, merge, publish,
  // distribute, sublicense, and/or sell copies of the Software, and to permit
  // persons to whom the Software is furnished to do so, subject to the
  // following conditions:
  //
  // The above copyright notice and this permission notice shall be included
  // in all copies or substantial portions of the Software.
  //
  // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
  // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
  // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
  // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
  // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
  // USE OR OTHER DEALINGS IN THE SOFTWARE.

  'use strict';

  var stringifyPrimitive = function(v) {
    switch (typeof v) {
      case 'string':
        return v;

      case 'boolean':
        return v ? 'true' : 'false';

      case 'number':
        return isFinite(v) ? v : '';

      default:
        return '';
    }
  };

  var encode = function(obj, sep, eq, name) {
    sep = sep || '&';
    eq = eq || '=';
    if (obj === null) {
      obj = undefined;
    }

    if (typeof obj === 'object') {
      return Object.keys(obj).map(function(k) {
        var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
        if (Array.isArray(obj[k])) {
          return obj[k].map(function(v) {
            return ks + encodeURIComponent(stringifyPrimitive(v));
          }).join(sep);
        } else {
          return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
        }
      }).join(sep);

    }

    if (!name) { return ''; }
    return encodeURIComponent(stringifyPrimitive(name)) + eq +
      encodeURIComponent(stringifyPrimitive(obj));
  };

  var querystring = createCommonjsModule(function (module, exports) {
    'use strict';

    exports.decode = exports.parse = decode;
    exports.encode = exports.stringify = encode;
  });
  var querystring_1 = querystring.decode;
  var querystring_2 = querystring.parse;
  var querystring_3 = querystring.encode;
  var querystring_4 = querystring.stringify;

  // Copyright Joyent, Inc. and other Node contributors.
  //
  // Permission is hereby granted, free of charge, to any person obtaining a
  // copy of this software and associated documentation files (the
  // "Software"), to deal in the Software without restriction, including
  // without limitation the rights to use, copy, modify, merge, publish,
  // distribute, sublicense, and/or sell copies of the Software, and to permit
  // persons to whom the Software is furnished to do so, subject to the
  // following conditions:
  //
  // The above copyright notice and this permission notice shall be included
  // in all copies or substantial portions of the Software.
  //
  // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
  // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
  // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
  // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
  // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
  // USE OR OTHER DEALINGS IN THE SOFTWARE.

  'use strict';




  var parse = urlParse;
  var resolve = urlResolve;
  var resolveObject = urlResolveObject;
  var format = urlFormat;

  var Url_1 = Url;

  function Url() {
    this.protocol = null;
    this.slashes = null;
    this.auth = null;
    this.host = null;
    this.port = null;
    this.hostname = null;
    this.hash = null;
    this.search = null;
    this.query = null;
    this.pathname = null;
    this.path = null;
    this.href = null;
  }

  // Reference: RFC 3986, RFC 1808, RFC 2396

  // define these here so at least they only have to be
  // compiled once on the first module load.
  var protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]*$/,

    // Special case for a simple path URL
    simplePathPattern = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/,

    // RFC 2396: characters reserved for delimiting URLs.
    // We actually just auto-escape these.
    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

    // RFC 2396: characters not allowed for various reasons.
    unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
    autoEscape = ['\''].concat(unwise),
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
    nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
    hostEndingChars = ['/', '?', '#'],
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[+a-z0-9A-Z_-]{0,63}$/,
    hostnamePartStart = /^([+a-z0-9A-Z_-]{0,63})(.*)$/,
    // protocols that can allow "unsafe" and "unwise" chars.
    unsafeProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that never have a hostname.
    hostlessProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that always contain a // bit.
    slashedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'https:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    };

  function urlParse(url, parseQueryString, slashesDenoteHost) {
    if (url && util.isObject(url) && url instanceof Url) { return url; }

    var u = new Url;
    u.parse(url, parseQueryString, slashesDenoteHost);
    return u;
  }

  Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
    if (!util.isString(url)) {
      throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
    }

    // Copy chrome, IE, opera backslash-handling behavior.
    // Back slashes before the query string get converted to forward slashes
    // See: https://code.google.com/p/chromium/issues/detail?id=25916
    var queryIndex = url.indexOf('?'),
      splitter =
        (queryIndex !== -1 && queryIndex < url.indexOf('#')) ? '?' : '#',
      uSplit = url.split(splitter),
      slashRegex = /\\/g;
    uSplit[0] = uSplit[0].replace(slashRegex, '/');
    url = uSplit.join(splitter);

    var rest = url;

    // trim before proceeding.
    // This is to support parse stuff like "  http://foo.com  \n"
    rest = rest.trim();

    if (!slashesDenoteHost && url.split('#').length === 1) {
      // Try fast path regexp
      var simplePath = simplePathPattern.exec(rest);
      if (simplePath) {
        this.path = rest;
        this.href = rest;
        this.pathname = simplePath[1];
        if (simplePath[2]) {
          this.search = simplePath[2];
          if (parseQueryString) {
            this.query = querystring.parse(this.search.substr(1));
          } else {
            this.query = this.search.substr(1);
          }
        } else if (parseQueryString) {
          this.search = '';
          this.query = {};
        }
        return this;
      }
    }

    var proto = protocolPattern.exec(rest);
    if (proto) {
      proto = proto[0];
      var lowerProto = proto.toLowerCase();
      this.protocol = lowerProto;
      rest = rest.substr(proto.length);
    }

    // figure out if it's got a host
    // user@server is *always* interpreted as a hostname, and url
    // resolution will treat //foo/bar as host=foo,path=bar because that's
    // how the browser resolves relative URLs.
    if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
      var slashes = rest.substr(0, 2) === '//';
      if (slashes && !(proto && hostlessProtocol[proto])) {
        rest = rest.substr(2);
        this.slashes = true;
      }
    }

    if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {

      // there's a hostname.
      // the first instance of /, ?, ;, or # ends the host.
      //
      // If there is an @ in the hostname, then non-host chars *are* allowed
      // to the left of the last @ sign, unless some host-ending character
      // comes *before* the @-sign.
      // URLs are obnoxious.
      //
      // ex:
      // http://a@b@c/ => user:a@b host:c
      // http://a@b?@c => user:a host:c path:/?@c

      // v0.12 TODO(isaacs): This is not quite how Chrome does things.
      // Review our test case against browsers more comprehensively.

      // find the first instance of any hostEndingChars
      var hostEnd = -1;
      for (var i = 0; i < hostEndingChars.length; i++) {
        var hec = rest.indexOf(hostEndingChars[i]);
        if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        { hostEnd = hec; }
      }

      // at this point, either we have an explicit point where the
      // auth portion cannot go past, or the last @ char is the decider.
      var auth, atSign;
      if (hostEnd === -1) {
        // atSign can be anywhere.
        atSign = rest.lastIndexOf('@');
      } else {
        // atSign must be in auth portion.
        // http://a@b/c@d => host:b auth:a path:/c@d
        atSign = rest.lastIndexOf('@', hostEnd);
      }

      // Now we have a portion which is definitely the auth.
      // Pull that off.
      if (atSign !== -1) {
        auth = rest.slice(0, atSign);
        rest = rest.slice(atSign + 1);
        this.auth = decodeURIComponent(auth);
      }

      // the host is the remaining to the left of the first non-host char
      hostEnd = -1;
      for (var i = 0; i < nonHostChars.length; i++) {
        var hec = rest.indexOf(nonHostChars[i]);
        if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        { hostEnd = hec; }
      }
      // if we still have not hit it, then the entire thing is a host.
      if (hostEnd === -1)
      { hostEnd = rest.length; }

      this.host = rest.slice(0, hostEnd);
      rest = rest.slice(hostEnd);

      // pull out port.
      this.parseHost();

      // we've indicated that there is a hostname,
      // so even if it's empty, it has to be present.
      this.hostname = this.hostname || '';

      // if hostname begins with [ and ends with ]
      // assume that it's an IPv6 address.
      var ipv6Hostname = this.hostname[0] === '[' &&
        this.hostname[this.hostname.length - 1] === ']';

      // validate a little.
      if (!ipv6Hostname) {
        var hostparts = this.hostname.split(/\./);
        for (var i = 0, l = hostparts.length; i < l; i++) {
          var part = hostparts[i];
          if (!part) { continue; }
          if (!part.match(hostnamePartPattern)) {
            var newpart = '';
            for (var j = 0, k = part.length; j < k; j++) {
              if (part.charCodeAt(j) > 127) {
                // we replace non-ASCII char with a temporary placeholder
                // we need this to make sure size of hostname is not
                // broken by replacing non-ASCII by nothing
                newpart += 'x';
              } else {
                newpart += part[j];
              }
            }
            // we test again with ASCII char only
            if (!newpart.match(hostnamePartPattern)) {
              var validParts = hostparts.slice(0, i);
              var notHost = hostparts.slice(i + 1);
              var bit = part.match(hostnamePartStart);
              if (bit) {
                validParts.push(bit[1]);
                notHost.unshift(bit[2]);
              }
              if (notHost.length) {
                rest = '/' + notHost.join('.') + rest;
              }
              this.hostname = validParts.join('.');
              break;
            }
          }
        }
      }

      if (this.hostname.length > hostnameMaxLen) {
        this.hostname = '';
      } else {
        // hostnames are always lower case.
        this.hostname = this.hostname.toLowerCase();
      }

      if (!ipv6Hostname) {
        // IDNA Support: Returns a punycoded representation of "domain".
        // It only converts parts of the domain name that
        // have non-ASCII characters, i.e. it doesn't matter if
        // you call it with a domain that already is ASCII-only.
        this.hostname = punycode.toASCII(this.hostname);
      }

      var p = this.port ? ':' + this.port : '';
      var h = this.hostname || '';
      this.host = h + p;
      this.href += this.host;

      // strip [ and ] from the hostname
      // the host field still retains them, though
      if (ipv6Hostname) {
        this.hostname = this.hostname.substr(1, this.hostname.length - 2);
        if (rest[0] !== '/') {
          rest = '/' + rest;
        }
      }
    }

    // now rest is set to the post-host stuff.
    // chop off any delim chars.
    if (!unsafeProtocol[lowerProto]) {

      // First, make 100% sure that any "autoEscape" chars get
      // escaped, even if encodeURIComponent doesn't think they
      // need to be.
      for (var i = 0, l = autoEscape.length; i < l; i++) {
        var ae = autoEscape[i];
        if (rest.indexOf(ae) === -1)
        { continue; }
        var esc = encodeURIComponent(ae);
        if (esc === ae) {
          esc = escape(ae);
        }
        rest = rest.split(ae).join(esc);
      }
    }


    // chop off from the tail first.
    var hash = rest.indexOf('#');
    if (hash !== -1) {
      // got a fragment string.
      this.hash = rest.substr(hash);
      rest = rest.slice(0, hash);
    }
    var qm = rest.indexOf('?');
    if (qm !== -1) {
      this.search = rest.substr(qm);
      this.query = rest.substr(qm + 1);
      if (parseQueryString) {
        this.query = querystring.parse(this.query);
      }
      rest = rest.slice(0, qm);
    } else if (parseQueryString) {
      // no query string, but parseQueryString still requested
      this.search = '';
      this.query = {};
    }
    if (rest) { this.pathname = rest; }
    if (slashedProtocol[lowerProto] &&
      this.hostname && !this.pathname) {
      this.pathname = '/';
    }

    //to support http.request
    if (this.pathname || this.search) {
      var p = this.pathname || '';
      var s = this.search || '';
      this.path = p + s;
    }

    // finally, reconstruct the href based on what has been validated.
    this.href = this.format();
    return this;
  };

  // format a parsed object into a url string
  function urlFormat(obj) {
    // ensure it's an object, and not a string url.
    // If it's an obj, this is a no-op.
    // this way, you can call url_format() on strings
    // to clean up potentially wonky urls.
    if (util.isString(obj)) { obj = urlParse(obj); }
    if (!(obj instanceof Url)) { return Url.prototype.format.call(obj); }
    return obj.format();
  }

  Url.prototype.format = function() {
    var auth = this.auth || '';
    if (auth) {
      auth = encodeURIComponent(auth);
      auth = auth.replace(/%3A/i, ':');
      auth += '@';
    }

    var protocol = this.protocol || '',
      pathname = this.pathname || '',
      hash = this.hash || '',
      host = false,
      query = '';

    if (this.host) {
      host = auth + this.host;
    } else if (this.hostname) {
      host = auth + (this.hostname.indexOf(':') === -1 ?
        this.hostname :
        '[' + this.hostname + ']');
      if (this.port) {
        host += ':' + this.port;
      }
    }

    if (this.query &&
      util.isObject(this.query) &&
      Object.keys(this.query).length) {
      query = querystring.stringify(this.query);
    }

    var search = this.search || (query && ('?' + query)) || '';

    if (protocol && protocol.substr(-1) !== ':') { protocol += ':'; }

    // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
    // unless they had them to begin with.
    if (this.slashes ||
      (!protocol || slashedProtocol[protocol]) && host !== false) {
      host = '//' + (host || '');
      if (pathname && pathname.charAt(0) !== '/') { pathname = '/' + pathname; }
    } else if (!host) {
      host = '';
    }

    if (hash && hash.charAt(0) !== '#') { hash = '#' + hash; }
    if (search && search.charAt(0) !== '?') { search = '?' + search; }

    pathname = pathname.replace(/[?#]/g, function(match) {
      return encodeURIComponent(match);
    });
    search = search.replace('#', '%23');

    return protocol + host + pathname + search + hash;
  };

  function urlResolve(source, relative) {
    return urlParse(source, false, true).resolve(relative);
  }

  Url.prototype.resolve = function(relative) {
    return this.resolveObject(urlParse(relative, false, true)).format();
  };

  function urlResolveObject(source, relative) {
    if (!source) { return relative; }
    return urlParse(source, false, true).resolveObject(relative);
  }

  Url.prototype.resolveObject = function(relative) {
    if (util.isString(relative)) {
      var rel = new Url();
      rel.parse(relative, false, true);
      relative = rel;
    }

    var result = new Url();
    var tkeys = Object.keys(this);
    for (var tk = 0; tk < tkeys.length; tk++) {
      var tkey = tkeys[tk];
      result[tkey] = this[tkey];
    }

    // hash is always overridden, no matter what.
    // even href="" will remove it.
    result.hash = relative.hash;

    // if the relative url is empty, then there's nothing left to do here.
    if (relative.href === '') {
      result.href = result.format();
      return result;
    }

    // hrefs like //foo/bar always cut to the protocol.
    if (relative.slashes && !relative.protocol) {
      // take everything except the protocol from relative
      var rkeys = Object.keys(relative);
      for (var rk = 0; rk < rkeys.length; rk++) {
        var rkey = rkeys[rk];
        if (rkey !== 'protocol')
        { result[rkey] = relative[rkey]; }
      }

      //urlParse appends trailing / to urls like http://www.example.com
      if (slashedProtocol[result.protocol] &&
        result.hostname && !result.pathname) {
        result.path = result.pathname = '/';
      }

      result.href = result.format();
      return result;
    }

    if (relative.protocol && relative.protocol !== result.protocol) {
      // if it's a known url protocol, then changing
      // the protocol does weird things
      // first, if it's not file:, then we MUST have a host,
      // and if there was a path
      // to begin with, then we MUST have a path.
      // if it is file:, then the host is dropped,
      // because that's known to be hostless.
      // anything else is assumed to be absolute.
      if (!slashedProtocol[relative.protocol]) {
        var keys = Object.keys(relative);
        for (var v = 0; v < keys.length; v++) {
          var k = keys[v];
          result[k] = relative[k];
        }
        result.href = result.format();
        return result;
      }

      result.protocol = relative.protocol;
      if (!relative.host && !hostlessProtocol[relative.protocol]) {
        var relPath = (relative.pathname || '').split('/');
        while (relPath.length && !(relative.host = relPath.shift())){ ; }
        if (!relative.host) { relative.host = ''; }
        if (!relative.hostname) { relative.hostname = ''; }
        if (relPath[0] !== '') { relPath.unshift(''); }
        if (relPath.length < 2) { relPath.unshift(''); }
        result.pathname = relPath.join('/');
      } else {
        result.pathname = relative.pathname;
      }
      result.search = relative.search;
      result.query = relative.query;
      result.host = relative.host || '';
      result.auth = relative.auth;
      result.hostname = relative.hostname || relative.host;
      result.port = relative.port;
      // to support http.request
      if (result.pathname || result.search) {
        var p = result.pathname || '';
        var s = result.search || '';
        result.path = p + s;
      }
      result.slashes = result.slashes || relative.slashes;
      result.href = result.format();
      return result;
    }

    var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
      isRelAbs = (
        relative.host ||
        relative.pathname && relative.pathname.charAt(0) === '/'
      ),
      mustEndAbs = (isRelAbs || isSourceAbs ||
        (result.host && relative.pathname)),
      removeAllDots = mustEndAbs,
      srcPath = result.pathname && result.pathname.split('/') || [],
      relPath = relative.pathname && relative.pathname.split('/') || [],
      psychotic = result.protocol && !slashedProtocol[result.protocol];

    // if the url is a non-slashed url, then relative
    // links like ../.. should be able
    // to crawl up to the hostname, as well.  This is strange.
    // result.protocol has already been set by now.
    // Later on, put the first path part into the host field.
    if (psychotic) {
      result.hostname = '';
      result.port = null;
      if (result.host) {
        if (srcPath[0] === '') { srcPath[0] = result.host; }
        else { srcPath.unshift(result.host); }
      }
      result.host = '';
      if (relative.protocol) {
        relative.hostname = null;
        relative.port = null;
        if (relative.host) {
          if (relPath[0] === '') { relPath[0] = relative.host; }
          else { relPath.unshift(relative.host); }
        }
        relative.host = null;
      }
      mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
    }

    if (isRelAbs) {
      // it's absolute.
      result.host = (relative.host || relative.host === '') ?
        relative.host : result.host;
      result.hostname = (relative.hostname || relative.hostname === '') ?
        relative.hostname : result.hostname;
      result.search = relative.search;
      result.query = relative.query;
      srcPath = relPath;
      // fall through to the dot-handling below.
    } else if (relPath.length) {
      // it's relative
      // throw away the existing file, and take the new path instead.
      if (!srcPath) { srcPath = []; }
      srcPath.pop();
      srcPath = srcPath.concat(relPath);
      result.search = relative.search;
      result.query = relative.query;
    } else if (!util.isNullOrUndefined(relative.search)) {
      // just pull out the search.
      // like href='?foo'.
      // Put this after the other two cases because it simplifies the booleans
      if (psychotic) {
        result.hostname = result.host = srcPath.shift();
        //occationaly the auth can get stuck only in host
        //this especially happens in cases like
        //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
        var authInHost = result.host && result.host.indexOf('@') > 0 ?
          result.host.split('@') : false;
        if (authInHost) {
          result.auth = authInHost.shift();
          result.host = result.hostname = authInHost.shift();
        }
      }
      result.search = relative.search;
      result.query = relative.query;
      //to support http.request
      if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
        result.path = (result.pathname ? result.pathname : '') +
          (result.search ? result.search : '');
      }
      result.href = result.format();
      return result;
    }

    if (!srcPath.length) {
      // no path at all.  easy.
      // we've already handled the other stuff above.
      result.pathname = null;
      //to support http.request
      if (result.search) {
        result.path = '/' + result.search;
      } else {
        result.path = null;
      }
      result.href = result.format();
      return result;
    }

    // if a url ENDs in . or .., then it must get a trailing slash.
    // however, if it ends in anything else non-slashy,
    // then it must NOT get a trailing slash.
    var last = srcPath.slice(-1)[0];
    var hasTrailingSlash = (
      (result.host || relative.host || srcPath.length > 1) &&
      (last === '.' || last === '..') || last === '');

    // strip single dots, resolve double dots to parent dir
    // if the path tries to go above the root, `up` ends up > 0
    var up = 0;
    for (var i = srcPath.length; i >= 0; i--) {
      last = srcPath[i];
      if (last === '.') {
        srcPath.splice(i, 1);
      } else if (last === '..') {
        srcPath.splice(i, 1);
        up++;
      } else if (up) {
        srcPath.splice(i, 1);
        up--;
      }
    }

    // if the path is allowed to go above the root, restore leading ..s
    if (!mustEndAbs && !removeAllDots) {
      for (; up--; up) {
        srcPath.unshift('..');
      }
    }

    if (mustEndAbs && srcPath[0] !== '' &&
      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
      srcPath.unshift('');
    }

    if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
      srcPath.push('');
    }

    var isAbsolute = srcPath[0] === '' ||
      (srcPath[0] && srcPath[0].charAt(0) === '/');

    // put the host back
    if (psychotic) {
      result.hostname = result.host = isAbsolute ? '' :
        srcPath.length ? srcPath.shift() : '';
      //occationaly the auth can get stuck only in host
      //this especially happens in cases like
      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
      var authInHost = result.host && result.host.indexOf('@') > 0 ?
        result.host.split('@') : false;
      if (authInHost) {
        result.auth = authInHost.shift();
        result.host = result.hostname = authInHost.shift();
      }
    }

    mustEndAbs = mustEndAbs || (result.host && srcPath.length);

    if (mustEndAbs && !isAbsolute) {
      srcPath.unshift('');
    }

    if (!srcPath.length) {
      result.pathname = null;
      result.path = null;
    } else {
      result.pathname = srcPath.join('/');
    }

    //to support request.http
    if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
      result.path = (result.pathname ? result.pathname : '') +
        (result.search ? result.search : '');
    }
    result.auth = relative.auth || result.auth;
    result.slashes = result.slashes || relative.slashes;
    result.href = result.format();
    return result;
  };

  Url.prototype.parseHost = function() {
    var host = this.host;
    var port = portPattern.exec(host);
    if (port) {
      port = port[0];
      if (port !== ':') {
        this.port = port.substr(1);
      }
      host = host.substr(0, host.length - port.length);
    }
    if (host) { this.hostname = host; }
  };

  var url = {
    parse: parse,
    resolve: resolve,
    resolveObject: resolveObject,
    format: format,
    Url: Url_1
  };

  /*!
	 * @pixi/constants - v5.1.0
	 * Compiled Fri, 19 Jul 2019 21:58:39 UTC
	 *
	 * @pixi/constants is licensed under the MIT License.
	 * http://www.opensource.org/licenses/mit-license
	 */
  /**
   * Different types of environments for WebGL.
   *
   * @static
   * @memberof PIXI
   * @name ENV
   * @enum {number}
   * @property {number} WEBGL_LEGACY - Used for older v1 WebGL devices. PixiJS will aim to ensure compatibility
   *  with older / less advanced devices. If you experience unexplained flickering prefer this environment.
   * @property {number} WEBGL - Version 1 of WebGL
   * @property {number} WEBGL2 - Version 2 of WebGL
   */
  var ENV = {
    WEBGL_LEGACY: 0,
    WEBGL: 1,
    WEBGL2: 2,
  };

  /**
   * Constant to identify the Renderer Type.
   *
   * @static
   * @memberof PIXI
   * @name RENDERER_TYPE
   * @enum {number}
   * @property {number} UNKNOWN - Unknown render type.
   * @property {number} WEBGL - WebGL render type.
   * @property {number} CANVAS - Canvas render type.
   */
  var RENDERER_TYPE = {
    UNKNOWN:    0,
    WEBGL:      1,
    CANVAS:     2,
  };

  /**
   * Various blend modes supported by PIXI.
   *
   * IMPORTANT - The WebGL renderer only supports the NORMAL, ADD, MULTIPLY and SCREEN blend modes.
   * Anything else will silently act like NORMAL.
   *
   * @memberof PIXI
   * @name BLEND_MODES
   * @enum {number}
   * @property {number} NORMAL
   * @property {number} ADD
   * @property {number} MULTIPLY
   * @property {number} SCREEN
   * @property {number} OVERLAY
   * @property {number} DARKEN
   * @property {number} LIGHTEN
   * @property {number} COLOR_DODGE
   * @property {number} COLOR_BURN
   * @property {number} HARD_LIGHT
   * @property {number} SOFT_LIGHT
   * @property {number} DIFFERENCE
   * @property {number} EXCLUSION
   * @property {number} HUE
   * @property {number} SATURATION
   * @property {number} COLOR
   * @property {number} LUMINOSITY
   * @property {number} NORMAL_NPM
   * @property {number} ADD_NPM
   * @property {number} SCREEN_NPM
   * @property {number} NONE
   * @property {number} SRC_IN
   * @property {number} SRC_OUT
   * @property {number} SRC_ATOP
   * @property {number} DST_OVER
   * @property {number} DST_IN
   * @property {number} DST_OUT
   * @property {number} DST_ATOP
   * @property {number} SUBTRACT
   * @property {number} SRC_OVER
   * @property {number} ERASE
   */
  var BLEND_MODES = {
    NORMAL:         0,
    ADD:            1,
    MULTIPLY:       2,
    SCREEN:         3,
    OVERLAY:        4,
    DARKEN:         5,
    LIGHTEN:        6,
    COLOR_DODGE:    7,
    COLOR_BURN:     8,
    HARD_LIGHT:     9,
    SOFT_LIGHT:     10,
    DIFFERENCE:     11,
    EXCLUSION:      12,
    HUE:            13,
    SATURATION:     14,
    COLOR:          15,
    LUMINOSITY:     16,
    NORMAL_NPM:     17,
    ADD_NPM:        18,
    SCREEN_NPM:     19,
    NONE:           20,

    SRC_OVER:       0,
    SRC_IN:         21,
    SRC_OUT:        22,
    SRC_ATOP:       23,
    DST_OVER:       24,
    DST_IN:         25,
    DST_OUT:        26,
    DST_ATOP:       27,
    ERASE:          26,
    SUBTRACT:       28,
  };

  /**
   * Various webgl draw modes. These can be used to specify which GL drawMode to use
   * under certain situations and renderers.
   *
   * @memberof PIXI
   * @static
   * @name DRAW_MODES
   * @enum {number}
   * @property {number} POINTS
   * @property {number} LINES
   * @property {number} LINE_LOOP
   * @property {number} LINE_STRIP
   * @property {number} TRIANGLES
   * @property {number} TRIANGLE_STRIP
   * @property {number} TRIANGLE_FAN
   */
  var DRAW_MODES = {
    POINTS:         0,
    LINES:          1,
    LINE_LOOP:      2,
    LINE_STRIP:     3,
    TRIANGLES:      4,
    TRIANGLE_STRIP: 5,
    TRIANGLE_FAN:   6,
  };

  /**
   * Various GL texture/resources formats.
   *
   * @memberof PIXI
   * @static
   * @name FORMATS
   * @enum {number}
   * @property {number} RGBA=6408
   * @property {number} RGB=6407
   * @property {number} ALPHA=6406
   * @property {number} LUMINANCE=6409
   * @property {number} LUMINANCE_ALPHA=6410
   * @property {number} DEPTH_COMPONENT=6402
   * @property {number} DEPTH_STENCIL=34041
   */
  var FORMATS = {
    RGBA:             6408,
    RGB:              6407,
    ALPHA:            6406,
    LUMINANCE:        6409,
    LUMINANCE_ALPHA:  6410,
    DEPTH_COMPONENT:  6402,
    DEPTH_STENCIL:    34041,
  };

  /**
   * Various GL target types.
   *
   * @memberof PIXI
   * @static
   * @name TARGETS
   * @enum {number}
   * @property {number} TEXTURE_2D=3553
   * @property {number} TEXTURE_CUBE_MAP=34067
   * @property {number} TEXTURE_2D_ARRAY=35866
   * @property {number} TEXTURE_CUBE_MAP_POSITIVE_X=34069
   * @property {number} TEXTURE_CUBE_MAP_NEGATIVE_X=34070
   * @property {number} TEXTURE_CUBE_MAP_POSITIVE_Y=34071
   * @property {number} TEXTURE_CUBE_MAP_NEGATIVE_Y=34072
   * @property {number} TEXTURE_CUBE_MAP_POSITIVE_Z=34073
   * @property {number} TEXTURE_CUBE_MAP_NEGATIVE_Z=34074
   */
  var TARGETS = {
    TEXTURE_2D: 3553,
    TEXTURE_CUBE_MAP: 34067,
    TEXTURE_2D_ARRAY: 35866,
    TEXTURE_CUBE_MAP_POSITIVE_X: 34069,
    TEXTURE_CUBE_MAP_NEGATIVE_X: 34070,
    TEXTURE_CUBE_MAP_POSITIVE_Y: 34071,
    TEXTURE_CUBE_MAP_NEGATIVE_Y: 34072,
    TEXTURE_CUBE_MAP_POSITIVE_Z: 34073,
    TEXTURE_CUBE_MAP_NEGATIVE_Z: 34074,
  };

  /**
   * Various GL data format types.
   *
   * @memberof PIXI
   * @static
   * @name TYPES
   * @enum {number}
   * @property {number} UNSIGNED_BYTE=5121
   * @property {number} UNSIGNED_SHORT=5123
   * @property {number} UNSIGNED_SHORT_5_6_5=33635
   * @property {number} UNSIGNED_SHORT_4_4_4_4=32819
   * @property {number} UNSIGNED_SHORT_5_5_5_1=32820
   * @property {number} FLOAT=5126
   * @property {number} HALF_FLOAT=36193
   */
  var TYPES = {
    UNSIGNED_BYTE: 5121,
    UNSIGNED_SHORT: 5123,
    UNSIGNED_SHORT_5_6_5: 33635,
    UNSIGNED_SHORT_4_4_4_4: 32819,
    UNSIGNED_SHORT_5_5_5_1: 32820,
    FLOAT: 5126,
    HALF_FLOAT: 36193,
  };

  /**
   * The scale modes that are supported by pixi.
   *
   * The {@link PIXI.settings.SCALE_MODE} scale mode affects the default scaling mode of future operations.
   * It can be re-assigned to either LINEAR or NEAREST, depending upon suitability.
   *
   * @memberof PIXI
   * @static
   * @name SCALE_MODES
   * @enum {number}
   * @property {number} LINEAR Smooth scaling
   * @property {number} NEAREST Pixelating scaling
   */
  var SCALE_MODES = {
    LINEAR:     1,
    NEAREST:    0,
  };

  /**
   * The wrap modes that are supported by pixi.
   *
   * The {@link PIXI.settings.WRAP_MODE} wrap mode affects the default wrapping mode of future operations.
   * It can be re-assigned to either CLAMP or REPEAT, depending upon suitability.
   * If the texture is non power of two then clamp will be used regardless as WebGL can
   * only use REPEAT if the texture is po2.
   *
   * This property only affects WebGL.
   *
   * @name WRAP_MODES
   * @memberof PIXI
   * @static
   * @enum {number}
   * @property {number} CLAMP - The textures uvs are clamped
   * @property {number} REPEAT - The texture uvs tile and repeat
   * @property {number} MIRRORED_REPEAT - The texture uvs tile and repeat with mirroring
   */
  var WRAP_MODES = {
    CLAMP:           33071,
    REPEAT:          10497,
    MIRRORED_REPEAT: 33648,
  };

  /**
   * Mipmap filtering modes that are supported by pixi.
   *
   * The {@link PIXI.settings.MIPMAP_TEXTURES} affects default texture filtering.
   * Mipmaps are generated for a baseTexture if its `mipmap` field is `ON`,
   * or its `POW2` and texture dimensions are powers of 2.
   * Due to platform restriction, `ON` option will work like `POW2` for webgl-1.
   *
   * This property only affects WebGL.
   *
   * @name MIPMAP_MODES
   * @memberof PIXI
   * @static
   * @enum {number}
   * @property {number} OFF - No mipmaps
   * @property {number} POW2 - Generate mipmaps if texture dimensions are pow2
   * @property {number} ON - Always generate mipmaps
   */
  var MIPMAP_MODES = {
    OFF: 0,
    POW2: 1,
    ON: 2,
  };

  /**
   * The gc modes that are supported by pixi.
   *
   * The {@link PIXI.settings.GC_MODE} Garbage Collection mode for PixiJS textures is AUTO
   * If set to GC_MODE, the renderer will occasionally check textures usage. If they are not
   * used for a specified period of time they will be removed from the GPU. They will of course
   * be uploaded again when they are required. This is a silent behind the scenes process that
   * should ensure that the GPU does not  get filled up.
   *
   * Handy for mobile devices!
   * This property only affects WebGL.
   *
   * @name GC_MODES
   * @enum {number}
   * @static
   * @memberof PIXI
   * @property {number} AUTO - Garbage collection will happen periodically automatically
   * @property {number} MANUAL - Garbage collection will need to be called manually
   */
  var GC_MODES = {
    AUTO:           0,
    MANUAL:         1,
  };

  /**
   * Constants that specify float precision in shaders.
   *
   * @name PRECISION
   * @memberof PIXI
   * @static
   * @enum {string}
   * @constant
   * @property {string} LOW='lowp'
   * @property {string} MEDIUM='mediump'
   * @property {string} HIGH='highp'
   */
  var PRECISION = {
    LOW: 'lowp',
    MEDIUM: 'mediump',
    HIGH: 'highp',
  };

  /*!
	 * @pixi/utils - v5.1.0
	 * Compiled Fri, 19 Jul 2019 21:58:39 UTC
	 *
	 * @pixi/utils is licensed under the MIT License.
	 * http://www.opensource.org/licenses/mit-license
	 */

  /**
   * The prefix that denotes a URL is for a retina asset.
   *
   * @static
   * @name RETINA_PREFIX
   * @memberof PIXI.settings
   * @type {RegExp}
   * @default /@([0-9\.]+)x/
   * @example `@2x`
   */
  settings.RETINA_PREFIX = /@([0-9\.]+)x/;

  /**
   * Should the `failIfMajorPerformanceCaveat` flag be enabled as a context option used in the `isWebGLSupported` function.
   * For most scenarios this should be left as true, as otherwise the user may have a poor experience.
   * However, it can be useful to disable under certain scenarios, such as headless unit tests.
   *
   * @static
   * @name FAIL_IF_MAJOR_PERFORMANCE_CAVEAT
   * @memberof PIXI.settings
   * @type {boolean}
   * @default true
   */
  settings.FAIL_IF_MAJOR_PERFORMANCE_CAVEAT = true;

  var saidHello = false;
  var VERSION = '5.1.0';

  /**
   * Skips the hello message of renderers that are created after this is run.
   *
   * @function skipHello
   * @memberof PIXI.utils
   */
  function skipHello()
  {
    saidHello = true;
  }

  /**
   * Logs out the version and renderer information for this running instance of PIXI.
   * If you don't want to see this message you can run `PIXI.utils.skipHello()` before
   * creating your renderer. Keep in mind that doing that will forever make you a jerk face.
   *
   * @static
   * @function sayHello
   * @memberof PIXI.utils
   * @param {string} type - The string renderer type to log.
   */
  function sayHello(type)
  {
    if (saidHello)
    {
      return;
    }

    if (navigator.userAgent.toLowerCase().indexOf('chrome') > -1)
    {
      var args = [
        ("\n %c %c %c PixiJS " + VERSION + " - âœ° " + type + " âœ°  %c  %c  http://www.pixijs.com/  %c %c â™¥%câ™¥%câ™¥ \n\n"),
        'background: #ff66a5; padding:5px 0;',
        'background: #ff66a5; padding:5px 0;',
        'color: #ff66a5; background: #030307; padding:5px 0;',
        'background: #ff66a5; padding:5px 0;',
        'background: #ffc3dc; padding:5px 0;',
        'background: #ff66a5; padding:5px 0;',
        'color: #ff2424; background: #fff; padding:5px 0;',
        'color: #ff2424; background: #fff; padding:5px 0;',
        'color: #ff2424; background: #fff; padding:5px 0;' ];

      window.console.log.apply(console, args);
    }
    else if (window.console)
    {
      window.console.log(("PixiJS " + VERSION + " - " + type + " - http://www.pixijs.com/"));
    }

    saidHello = true;
  }

  var supported;

  /**
   * Helper for checking for WebGL support.
   *
   * @memberof PIXI.utils
   * @function isWebGLSupported
   * @return {boolean} Is WebGL supported.
   */
  function isWebGLSupported()
  {
    if (typeof supported === 'undefined')
    {
      supported = (function supported()
      {
        var contextOptions = {
          stencil: true,
          failIfMajorPerformanceCaveat: settings.FAIL_IF_MAJOR_PERFORMANCE_CAVEAT,
        };

        try
        {
          if (!window.WebGLRenderingContext)
          {
            return false;
          }

          var canvas = document.createElement('canvas');
          var gl = canvas.getContext('webgl', contextOptions)
            || canvas.getContext('experimental-webgl', contextOptions);

          var success = !!(gl && gl.getContextAttributes().stencil);

          if (gl)
          {
            var loseContext = gl.getExtension('WEBGL_lose_context');

            if (loseContext)
            {
              loseContext.loseContext();
            }
          }

          gl = null;

          return success;
        }
        catch (e)
        {
          return false;
        }
      })();
    }

    return supported;
  }

  /**
   * Converts a hexadecimal color number to an [R, G, B] array of normalized floats (numbers from 0.0 to 1.0).
   *
   * @example
   * PIXI.utils.hex2rgb(0xffffff); // returns [1, 1, 1]
   * @memberof PIXI.utils
   * @function hex2rgb
   * @param {number} hex - The hexadecimal number to convert
   * @param  {number[]} [out=[]] If supplied, this array will be used rather than returning a new one
   * @return {number[]} An array representing the [R, G, B] of the color where all values are floats.
   */
  function hex2rgb(hex, out)
  {
    out = out || [];

    out[0] = ((hex >> 16) & 0xFF) / 255;
    out[1] = ((hex >> 8) & 0xFF) / 255;
    out[2] = (hex & 0xFF) / 255;

    return out;
  }

  /**
   * Converts a hexadecimal color number to a string.
   *
   * @example
   * PIXI.utils.hex2string(0xffffff); // returns "#ffffff"
   * @memberof PIXI.utils
   * @function hex2string
   * @param {number} hex - Number in hex (e.g., `0xffffff`)
   * @return {string} The string color (e.g., `"#ffffff"`).
   */
  function hex2string(hex)
  {
    hex = hex.toString(16);
    hex = '000000'.substr(0, 6 - hex.length) + hex;

    return ("#" + hex);
  }

  /**
   * Converts a hexadecimal string to a hexadecimal color number.
   *
   * @example
   * PIXI.utils.string2hex("#ffffff"); // returns 0xffffff
   * @memberof PIXI.utils
   * @function string2hex
   * @param {string} The string color (e.g., `"#ffffff"`)
   * @return {number} Number in hexadecimal.
   */
  function string2hex(string)
  {
    if (typeof string === 'string' && string[0] === '#')
    {
      string = string.substr(1);
    }

    return parseInt(string, 16);
  }

  /**
   * Converts a color as an [R, G, B] array of normalized floats to a hexadecimal number.
   *
   * @example
   * PIXI.utils.rgb2hex([1, 1, 1]); // returns 0xffffff
   * @memberof PIXI.utils
   * @function rgb2hex
   * @param {number[]} rgb - Array of numbers where all values are normalized floats from 0.0 to 1.0.
   * @return {number} Number in hexadecimal.
   */
  function rgb2hex(rgb)
  {
    return (((rgb[0] * 255) << 16) + ((rgb[1] * 255) << 8) + (rgb[2] * 255 | 0));
  }

  /**
   * Corrects PixiJS blend, takes premultiplied alpha into account
   *
   * @memberof PIXI.utils
   * @function mapPremultipliedBlendModes
   * @private
   * @param {Array<number[]>} [array] - The array to output into.
   * @return {Array<number[]>} Mapped modes.
   */
  function mapPremultipliedBlendModes()
  {
    var pm = [];
    var npm = [];

    for (var i = 0; i < 32; i++)
    {
      pm[i] = i;
      npm[i] = i;
    }

    pm[BLEND_MODES.NORMAL_NPM] = BLEND_MODES.NORMAL;
    pm[BLEND_MODES.ADD_NPM] = BLEND_MODES.ADD;
    pm[BLEND_MODES.SCREEN_NPM] = BLEND_MODES.SCREEN;

    npm[BLEND_MODES.NORMAL] = BLEND_MODES.NORMAL_NPM;
    npm[BLEND_MODES.ADD] = BLEND_MODES.ADD_NPM;
    npm[BLEND_MODES.SCREEN] = BLEND_MODES.SCREEN_NPM;

    var array = [];

    array.push(npm);
    array.push(pm);

    return array;
  }

  /**
   * maps premultiply flag and blendMode to adjusted blendMode
   * @memberof PIXI.utils
   * @const premultiplyBlendMode
   * @type {Array<number[]>}
   */
  var premultiplyBlendMode = mapPremultipliedBlendModes();

  /**
   * changes blendMode according to texture format
   *
   * @memberof PIXI.utils
   * @function correctBlendMode
   * @param {number} blendMode supposed blend mode
   * @param {boolean} premultiplied  whether source is premultiplied
   * @returns {number} true blend mode for this texture
   */
  function correctBlendMode(blendMode, premultiplied)
  {
    return premultiplyBlendMode[premultiplied ? 1 : 0][blendMode];
  }

  /**
   * combines rgb and alpha to out array
   *
   * @memberof PIXI.utils
   * @function premultiplyRgba
   * @param {Float32Array|number[]} rgb input rgb
   * @param {number} alpha alpha param
   * @param {Float32Array} [out] output
   * @param {boolean} [premultiply=true] do premultiply it
   * @returns {Float32Array} vec4 rgba
   */
  function premultiplyRgba(rgb, alpha, out, premultiply)
  {
    out = out || new Float32Array(4);
    if (premultiply || premultiply === undefined)
    {
      out[0] = rgb[0] * alpha;
      out[1] = rgb[1] * alpha;
      out[2] = rgb[2] * alpha;
    }
    else
    {
      out[0] = rgb[0];
      out[1] = rgb[1];
      out[2] = rgb[2];
    }
    out[3] = alpha;

    return out;
  }

  /**
   * premultiplies tint
   *
   * @memberof PIXI.utils
   * @function premultiplyTint
   * @param {number} tint integer RGB
   * @param {number} alpha floating point alpha (0.0-1.0)
   * @returns {number} tint multiplied by alpha
   */
  function premultiplyTint(tint, alpha)
  {
    if (alpha === 1.0)
    {
      return (alpha * 255 << 24) + tint;
    }
    if (alpha === 0.0)
    {
      return 0;
    }
    var R = ((tint >> 16) & 0xFF);
    var G = ((tint >> 8) & 0xFF);
    var B = (tint & 0xFF);

    R = ((R * alpha) + 0.5) | 0;
    G = ((G * alpha) + 0.5) | 0;
    B = ((B * alpha) + 0.5) | 0;

    return (alpha * 255 << 24) + (R << 16) + (G << 8) + B;
  }

  /**
   * converts integer tint and float alpha to vec4 form, premultiplies by default
   *
   * @memberof PIXI.utils
   * @function premultiplyTintToRgba
   * @param {number} tint input tint
   * @param {number} alpha alpha param
   * @param {Float32Array} [out] output
   * @param {boolean} [premultiply=true] do premultiply it
   * @returns {Float32Array} vec4 rgba
   */
  function premultiplyTintToRgba(tint, alpha, out, premultiply)
  {
    out = out || new Float32Array(4);
    out[0] = ((tint >> 16) & 0xFF) / 255.0;
    out[1] = ((tint >> 8) & 0xFF) / 255.0;
    out[2] = (tint & 0xFF) / 255.0;
    if (premultiply || premultiply === undefined)
    {
      out[0] *= alpha;
      out[1] *= alpha;
      out[2] *= alpha;
    }
    out[3] = alpha;

    return out;
  }

  /**
   * Generic Mask Stack data structure
   *
   * @memberof PIXI.utils
   * @function createIndicesForQuads
   * @param {number} size - Number of quads
   * @param {Uint16Array|Uint32Array} [outBuffer] - Buffer for output, length has to be `6 * size`
   * @return {Uint16Array|Uint32Array} - Resulting index buffer
   */
  function createIndicesForQuads(size, outBuffer)
  {
    if ( outBuffer === void 0 ) { outBuffer = null; }

    // the total number of indices in our array, there are 6 points per quad.
    var totalIndices = size * 6;

    outBuffer = outBuffer || new Uint16Array(totalIndices);

    if (outBuffer.length !== totalIndices)
    {
      throw new Error(("Out buffer length is incorrect, got " + (outBuffer.length) + " and expected " + totalIndices));
    }

    // fill the indices with the quads to draw
    for (var i = 0, j = 0; i < totalIndices; i += 6, j += 4)
    {
      outBuffer[i + 0] = j + 0;
      outBuffer[i + 1] = j + 1;
      outBuffer[i + 2] = j + 2;
      outBuffer[i + 3] = j + 0;
      outBuffer[i + 4] = j + 2;
      outBuffer[i + 5] = j + 3;
    }

    return outBuffer;
  }

  /**
   * Remove items from a javascript array without generating garbage
   *
   * @function removeItems
   * @memberof PIXI.utils
   * @param {Array<any>} arr Array to remove elements from
   * @param {number} startIdx starting index
   * @param {number} removeCount how many to remove
   */
  function removeItems(arr, startIdx, removeCount)
  {
    var length = arr.length;
    var i;

    if (startIdx >= length || removeCount === 0)
    {
      return;
    }

    removeCount = (startIdx + removeCount > length ? length - startIdx : removeCount);

    var len = length - removeCount;

    for (i = startIdx; i < len; ++i)
    {
      arr[i] = arr[i + removeCount];
    }

    arr.length = len;
  }

  var nextUid = 0;

  /**
   * Gets the next unique identifier
   *
   * @memberof PIXI.utils
   * @function uid
   * @return {number} The next unique identifier to use.
   */
  function uid()
  {
    return ++nextUid;
  }

  /**
   * Returns sign of number
   *
   * @memberof PIXI.utils
   * @function sign
   * @param {number} n - the number to check the sign of
   * @returns {number} 0 if `n` is 0, -1 if `n` is negative, 1 if `n` is positive
   */
  function sign(n)
  {
    if (n === 0) { return 0; }

    return n < 0 ? -1 : 1;
  }

  // Taken from the bit-twiddle package

  /**
   * Rounds to next power of two.
   *
   * @function isPow2
   * @memberof PIXI.utils
   * @param {number} v input value
   * @return {number}
   */
  function nextPow2(v)
  {
    v += v === 0;
    --v;
    v |= v >>> 1;
    v |= v >>> 2;
    v |= v >>> 4;
    v |= v >>> 8;
    v |= v >>> 16;

    return v + 1;
  }

  /**
   * Checks if a number is a power of two.
   *
   * @function isPow2
   * @memberof PIXI.utils
   * @param {number} v input value
   * @return {boolean} `true` if value is power of two
   */
  function isPow2(v)
  {
    return !(v & (v - 1)) && (!!v);
  }

  /**
   * Computes ceil of log base 2
   *
   * @function log2
   * @memberof PIXI.utils
   * @param {number} v input value
   * @return {number} logarithm base 2
   */
  function log2(v)
  {
    var r = (v > 0xFFFF) << 4;

    v >>>= r;

    var shift = (v > 0xFF) << 3;

    v >>>= shift; r |= shift;
    shift = (v > 0xF) << 2;
    v >>>= shift; r |= shift;
    shift = (v > 0x3) << 1;
    v >>>= shift; r |= shift;

    return r | (v >> 1);
  }

  /**
   * @todo Describe property usage
   *
   * @static
   * @name ProgramCache
   * @memberof PIXI.utils
   * @type {Object}
   */
  var ProgramCache = {};

  /**
   * @todo Describe property usage
   *
   * @static
   * @name TextureCache
   * @memberof PIXI.utils
   * @type {Object}
   */
  var TextureCache = Object.create(null);

  /**
   * @todo Describe property usage
   *
   * @static
   * @name BaseTextureCache
   * @memberof PIXI.utils
   * @type {Object}
   */

  var BaseTextureCache = Object.create(null);
  /**
   * Destroys all texture in the cache
   *
   * @memberof PIXI.utils
   * @function destroyTextureCache
   */
  function destroyTextureCache()
  {
    var key;

    for (key in TextureCache)
    {
      TextureCache[key].destroy();
    }
    for (key in BaseTextureCache)
    {
      BaseTextureCache[key].destroy();
    }
  }

  /**
   * Removes all textures from cache, but does not destroy them
   *
   * @memberof PIXI.utils
   * @function clearTextureCache
   */
  function clearTextureCache()
  {
    var key;

    for (key in TextureCache)
    {
      delete TextureCache[key];
    }
    for (key in BaseTextureCache)
    {
      delete BaseTextureCache[key];
    }
  }

  /**
   * Trim transparent borders from a canvas
   *
   * @memberof PIXI.utils
   * @function trimCanvas
   * @param {HTMLCanvasElement} canvas - the canvas to trim
   * @returns {object} Trim data
   */
  function trimCanvas(canvas)
  {
    // https://gist.github.com/remy/784508

    var width = canvas.width;
    var height = canvas.height;

    var context = canvas.getContext('2d');
    var imageData = context.getImageData(0, 0, width, height);
    var pixels = imageData.data;
    var len = pixels.length;

    var bound = {
      top: null,
      left: null,
      right: null,
      bottom: null,
    };
    var data = null;
    var i;
    var x;
    var y;

    for (i = 0; i < len; i += 4)
    {
      if (pixels[i + 3] !== 0)
      {
        x = (i / 4) % width;
        y = ~~((i / 4) / width);

        if (bound.top === null)
        {
          bound.top = y;
        }

        if (bound.left === null)
        {
          bound.left = x;
        }
        else if (x < bound.left)
        {
          bound.left = x;
        }

        if (bound.right === null)
        {
          bound.right = x + 1;
        }
        else if (bound.right < x)
        {
          bound.right = x + 1;
        }

        if (bound.bottom === null)
        {
          bound.bottom = y;
        }
        else if (bound.bottom < y)
        {
          bound.bottom = y;
        }
      }
    }

    if (bound.top !== null)
    {
      width = bound.right - bound.left;
      height = bound.bottom - bound.top + 1;
      data = context.getImageData(bound.left, bound.top, width, height);
    }

    return {
      height: height,
      width: width,
      data: data,
    };
  }

  /**
   * Creates a Canvas element of the given size to be used as a target for rendering to.
   *
   * @class
   * @memberof PIXI.utils
   */
  var CanvasRenderTarget = function CanvasRenderTarget(width, height, resolution)
  {
    /**
     * The Canvas object that belongs to this CanvasRenderTarget.
     *
     * @member {HTMLCanvasElement}
     */
    this.canvas = document.createElement('canvas');

    /**
     * A CanvasRenderingContext2D object representing a two-dimensional rendering context.
     *
     * @member {CanvasRenderingContext2D}
     */
    this.context = this.canvas.getContext('2d');

    this.resolution = resolution || settings.RESOLUTION;

    this.resize(width, height);
  };

  var prototypeAccessors = { width: { configurable: true },height: { configurable: true } };

  /**
   * Clears the canvas that was created by the CanvasRenderTarget class.
   *
   * @private
   */
  CanvasRenderTarget.prototype.clear = function clear ()
  {
    this.context.setTransform(1, 0, 0, 1, 0, 0);
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  };

  /**
   * Resizes the canvas to the specified width and height.
   *
   * @param {number} width - the new width of the canvas
   * @param {number} height - the new height of the canvas
   */
  CanvasRenderTarget.prototype.resize = function resize (width, height)
  {
    this.canvas.width = width * this.resolution;
    this.canvas.height = height * this.resolution;
  };

  /**
   * Destroys this canvas.
   *
   */
  CanvasRenderTarget.prototype.destroy = function destroy ()
  {
    this.context = null;
    this.canvas = null;
  };

  /**
   * The width of the canvas buffer in pixels.
   *
   * @member {number}
   */
  prototypeAccessors.width.get = function ()
  {
    return this.canvas.width;
  };

  prototypeAccessors.width.set = function (val) // eslint-disable-line require-jsdoc
  {
    this.canvas.width = val;
  };

  /**
   * The height of the canvas buffer in pixels.
   *
   * @member {number}
   */
  prototypeAccessors.height.get = function ()
  {
    return this.canvas.height;
  };

  prototypeAccessors.height.set = function (val) // eslint-disable-line require-jsdoc
  {
    this.canvas.height = val;
  };

  Object.defineProperties( CanvasRenderTarget.prototype, prototypeAccessors );

  /**
   * Regexp for data URI.
   * Based on: {@link https://github.com/ragingwind/data-uri-regex}
   *
   * @static
   * @constant {RegExp|string} DATA_URI
   * @memberof PIXI
   * @example data:image/png;base64
   */
  var DATA_URI = /^\s*data:(?:([\w-]+)\/([\w+.-]+))?(?:;charset=([\w-]+))?(?:;(base64))?,(.*)/i;

  /**
   * Typedef for decomposeDataUri return object.
   *
   * @memberof PIXI.utils
   * @typedef {object} DecomposedDataUri
   * @property {string} mediaType Media type, eg. `image`
   * @property {string} subType Sub type, eg. `png`
   * @property {string} encoding Data encoding, eg. `base64`
   * @property {string} data The actual data
   */

  /**
   * Split a data URI into components. Returns undefined if
   * parameter `dataUri` is not a valid data URI.
   *
   * @memberof PIXI.utils
   * @function decomposeDataUri
   * @param {string} dataUri - the data URI to check
   * @return {PIXI.utils.DecomposedDataUri|undefined} The decomposed data uri or undefined
   */
  function decomposeDataUri(dataUri)
  {
    var dataUriMatch = DATA_URI.exec(dataUri);

    if (dataUriMatch)
    {
      return {
        mediaType: dataUriMatch[1] ? dataUriMatch[1].toLowerCase() : undefined,
        subType: dataUriMatch[2] ? dataUriMatch[2].toLowerCase() : undefined,
        charset: dataUriMatch[3] ? dataUriMatch[3].toLowerCase() : undefined,
        encoding: dataUriMatch[4] ? dataUriMatch[4].toLowerCase() : undefined,
        data: dataUriMatch[5],
      };
    }

    return undefined;
  }

  var tempAnchor;

  /**
   * Sets the `crossOrigin` property for this resource based on if the url
   * for this resource is cross-origin. If crossOrigin was manually set, this
   * function does nothing.
   * Nipped from the resource loader!
   *
   * @ignore
   * @param {string} url - The url to test.
   * @param {object} [loc=window.location] - The location object to test against.
   * @return {string} The crossOrigin value to use (or empty string for none).
   */
  function determineCrossOrigin(url$1, loc)
  {
    if ( loc === void 0 ) { loc = window.location; }

    // data: and javascript: urls are considered same-origin
    if (url$1.indexOf('data:') === 0)
    {
      return '';
    }

    // default is window.location
    loc = loc || window.location;

    if (!tempAnchor)
    {
      tempAnchor = document.createElement('a');
    }

    // let the browser determine the full href for the url of this resource and then
    // parse with the node url lib, we can't use the properties of the anchor element
    // because they don't work in IE9 :(
    tempAnchor.href = url$1;
    url$1 = url.parse(tempAnchor.href);

    var samePort = (!url$1.port && loc.port === '') || (url$1.port === loc.port);

    // if cross origin
    if (url$1.hostname !== loc.hostname || !samePort || url$1.protocol !== loc.protocol)
    {
      return 'anonymous';
    }

    return '';
  }

  /**
   * get the resolution / device pixel ratio of an asset by looking for the prefix
   * used by spritesheets and image urls
   *
   * @memberof PIXI.utils
   * @function getResolutionOfUrl
   * @param {string} url - the image path
   * @param {number} [defaultValue=1] - the defaultValue if no filename prefix is set.
   * @return {number} resolution / device pixel ratio of an asset
   */
  function getResolutionOfUrl(url, defaultValue)
  {
    var resolution = settings.RETINA_PREFIX.exec(url);

    if (resolution)
    {
      return parseFloat(resolution[1]);
    }

    return defaultValue !== undefined ? defaultValue : 1;
  }

  // A map of warning messages already fired
  var warnings = {};

  /**
   * Helper for warning developers about deprecated features & settings.
   * A stack track for warnings is given; useful for tracking-down where
   * deprecated methods/properties/classes are being used within the code.
   *
   * @memberof PIXI.utils
   * @function deprecation
   * @param {string} version - The version where the feature became deprecated
   * @param {string} message - Message should include what is deprecated, where, and the new solution
   * @param {number} [ignoreDepth=3] - The number of steps to ignore at the top of the error stack
   *        this is mostly to ignore internal deprecation calls.
   */
  function deprecation(version, message, ignoreDepth)
  {
    if ( ignoreDepth === void 0 ) { ignoreDepth = 3; }

    // Ignore duplicat
    if (warnings[message])
    {
      return;
    }

    /* eslint-disable no-console */
    var stack = new Error().stack;

    // Handle IE < 10 and Safari < 6
    if (typeof stack === 'undefined')
    {
      console.warn('PixiJS Deprecation Warning: ', (message + "\nDeprecated since v" + version));
    }
    else
    {
      // chop off the stack trace which includes PixiJS internal calls
      stack = stack.split('\n').splice(ignoreDepth).join('\n');

      if (console.groupCollapsed)
      {
        console.groupCollapsed(
          '%cPixiJS Deprecation Warning: %c%s',
          'color:#614108;background:#fffbe6',
          'font-weight:normal;color:#614108;background:#fffbe6',
          (message + "\nDeprecated since v" + version)
        );
        console.warn(stack);
        console.groupEnd();
      }
      else
      {
        console.warn('PixiJS Deprecation Warning: ', (message + "\nDeprecated since v" + version));
        console.warn(stack);
      }
    }
    /* eslint-enable no-console */

    warnings[message] = true;
  }

  var utils_es = ({
    BaseTextureCache: BaseTextureCache,
    CanvasRenderTarget: CanvasRenderTarget,
    DATA_URI: DATA_URI,
    ProgramCache: ProgramCache,
    TextureCache: TextureCache,
    clearTextureCache: clearTextureCache,
    correctBlendMode: correctBlendMode,
    createIndicesForQuads: createIndicesForQuads,
    decomposeDataUri: decomposeDataUri,
    deprecation: deprecation,
    destroyTextureCache: destroyTextureCache,
    determineCrossOrigin: determineCrossOrigin,
    getResolutionOfUrl: getResolutionOfUrl,
    hex2rgb: hex2rgb,
    hex2string: hex2string,
    isPow2: isPow2,
    isWebGLSupported: isWebGLSupported,
    log2: log2,
    nextPow2: nextPow2,
    premultiplyBlendMode: premultiplyBlendMode,
    premultiplyRgba: premultiplyRgba,
    premultiplyTint: premultiplyTint,
    premultiplyTintToRgba: premultiplyTintToRgba,
    removeItems: removeItems,
    rgb2hex: rgb2hex,
    sayHello: sayHello,
    sign: sign,
    skipHello: skipHello,
    string2hex: string2hex,
    trimCanvas: trimCanvas,
    uid: uid,
    isMobile: isMobile_min,
    EventEmitter: eventemitter3,
    earcut: earcut_1,
    url: url
  });

  /*!
	 * @pixi/math - v5.1.0
	 * Compiled Fri, 19 Jul 2019 21:58:39 UTC
	 *
	 * @pixi/math is licensed under the MIT License.
	 * http://www.opensource.org/licenses/mit-license
	 */
  /**
   * The Point object represents a location in a two-dimensional coordinate system, where x represents
   * the horizontal axis and y represents the vertical axis.
   *
   * @class
   * @memberof PIXI
   */
  var Point = function Point(x, y)
  {
    if ( x === void 0 ) { x = 0; }
    if ( y === void 0 ) { y = 0; }

    /**
     * @member {number}
     * @default 0
     */
    this.x = x;

    /**
     * @member {number}
     * @default 0
     */
    this.y = y;
  };

  /**
   * Creates a clone of this point
   *
   * @return {PIXI.Point} a copy of the point
   */
  Point.prototype.clone = function clone ()
  {
    return new Point(this.x, this.y);
  };

  /**
   * Copies x and y from the given point
   *
   * @param {PIXI.IPoint} p - The point to copy from
   * @returns {PIXI.IPoint} Returns itself.
   */
  Point.prototype.copyFrom = function copyFrom (p)
  {
    this.set(p.x, p.y);

    return this;
  };

  /**
   * Copies x and y into the given point
   *
   * @param {PIXI.IPoint} p - The point to copy.
   * @returns {PIXI.IPoint} Given point with values updated
   */
  Point.prototype.copyTo = function copyTo (p)
  {
    p.set(this.x, this.y);

    return p;
  };

  /**
   * Returns true if the given point is equal to this point
   *
   * @param {PIXI.IPoint} p - The point to check
   * @returns {boolean} Whether the given point equal to this point
   */
  Point.prototype.equals = function equals (p)
  {
    return (p.x === this.x) && (p.y === this.y);
  };

  /**
   * Sets the point to a new x and y position.
   * If y is omitted, both x and y will be set to x.
   *
   * @param {number} [x=0] - position of the point on the x axis
   * @param {number} [y=0] - position of the point on the y axis
   */
  Point.prototype.set = function set (x, y)
  {
    this.x = x || 0;
    this.y = y || ((y !== 0) ? this.x : 0);
  };

  /**
   * The Point object represents a location in a two-dimensional coordinate system, where x represents
   * the horizontal axis and y represents the vertical axis.
   *
   * An ObservablePoint is a point that triggers a callback when the point's position is changed.
   *
   * @class
   * @memberof PIXI
   */
  var ObservablePoint = function ObservablePoint(cb, scope, x, y)
  {
    if ( x === void 0 ) { x = 0; }
    if ( y === void 0 ) { y = 0; }

    this._x = x;
    this._y = y;

    this.cb = cb;
    this.scope = scope;
  };

  var prototypeAccessors$1 = { x: { configurable: true },y: { configurable: true } };

  /**
   * Creates a clone of this point.
   * The callback and scope params can be overidden otherwise they will default
   * to the clone object's values.
   *
   * @override
   * @param {Function} [cb=null] - callback when changed
   * @param {object} [scope=null] - owner of callback
   * @return {PIXI.ObservablePoint} a copy of the point
   */
  ObservablePoint.prototype.clone = function clone (cb, scope)
  {
    if ( cb === void 0 ) { cb = null; }
    if ( scope === void 0 ) { scope = null; }

    var _cb = cb || this.cb;
    var _scope = scope || this.scope;

    return new ObservablePoint(_cb, _scope, this._x, this._y);
  };

  /**
   * Sets the point to a new x and y position.
   * If y is omitted, both x and y will be set to x.
   *
   * @param {number} [x=0] - position of the point on the x axis
   * @param {number} [y=0] - position of the point on the y axis
   */
  ObservablePoint.prototype.set = function set (x, y)
  {
    var _x = x || 0;
    var _y = y || ((y !== 0) ? _x : 0);

    if (this._x !== _x || this._y !== _y)
    {
      this._x = _x;
      this._y = _y;
      this.cb.call(this.scope);
    }
  };

  /**
   * Copies x and y from the given point
   *
   * @param {PIXI.IPoint} p - The point to copy from.
   * @returns {PIXI.IPoint} Returns itself.
   */
  ObservablePoint.prototype.copyFrom = function copyFrom (p)
  {
    if (this._x !== p.x || this._y !== p.y)
    {
      this._x = p.x;
      this._y = p.y;
      this.cb.call(this.scope);
    }

    return this;
  };

  /**
   * Copies x and y into the given point
   *
   * @param {PIXI.IPoint} p - The point to copy.
   * @returns {PIXI.IPoint} Given point with values updated
   */
  ObservablePoint.prototype.copyTo = function copyTo (p)
  {
    p.set(this._x, this._y);

    return p;
  };

  /**
   * Returns true if the given point is equal to this point
   *
   * @param {PIXI.IPoint} p - The point to check
   * @returns {boolean} Whether the given point equal to this point
   */
  ObservablePoint.prototype.equals = function equals (p)
  {
    return (p.x === this._x) && (p.y === this._y);
  };

  /**
   * The position of the displayObject on the x axis relative to the local coordinates of the parent.
   *
   * @member {number}
   */
  prototypeAccessors$1.x.get = function ()
  {
    return this._x;
  };

  prototypeAccessors$1.x.set = function (value) // eslint-disable-line require-jsdoc
  {
    if (this._x !== value)
    {
      this._x = value;
      this.cb.call(this.scope);
    }
  };

  /**
   * The position of the displayObject on the x axis relative to the local coordinates of the parent.
   *
   * @member {number}
   */
  prototypeAccessors$1.y.get = function ()
  {
    return this._y;
  };

  prototypeAccessors$1.y.set = function (value) // eslint-disable-line require-jsdoc
  {
    if (this._y !== value)
    {
      this._y = value;
      this.cb.call(this.scope);
    }
  };

  Object.defineProperties( ObservablePoint.prototype, prototypeAccessors$1 );

  /**
   * A number, or a string containing a number.
   * @memberof PIXI
   * @typedef {(PIXI.Point|PIXI.ObservablePoint)} IPoint
   */

  /**
   * Two Pi.
   *
   * @static
   * @constant {number} PI_2
   * @memberof PIXI
   */
  var PI_2 = Math.PI * 2;

  /**
   * Conversion factor for converting radians to degrees.
   *
   * @static
   * @constant {number} RAD_TO_DEG
   * @memberof PIXI
   */
  var RAD_TO_DEG = 180 / Math.PI;

  /**
   * Conversion factor for converting degrees to radians.
   *
   * @static
   * @constant {number} DEG_TO_RAD
   * @memberof PIXI
   */
  var DEG_TO_RAD = Math.PI / 180;

  /**
   * Constants that identify shapes, mainly to prevent `instanceof` calls.
   *
   * @static
   * @constant
   * @name SHAPES
   * @memberof PIXI
   * @type {object}
   * @property {number} POLY Polygon
   * @property {number} RECT Rectangle
   * @property {number} CIRC Circle
   * @property {number} ELIP Ellipse
   * @property {number} RREC Rounded Rectangle
   */
  var SHAPES = {
    POLY: 0,
    RECT: 1,
    CIRC: 2,
    ELIP: 3,
    RREC: 4,
  };

  /**
   * The PixiJS Matrix as a class makes it a lot faster.
   *
   * Here is a representation of it:
   * ```js
   * | a | c | tx|
   * | b | d | ty|
   * | 0 | 0 | 1 |
   * ```
   * @class
   * @memberof PIXI
   */
  var Matrix = function Matrix(a, b, c, d, tx, ty)
  {
    if ( a === void 0 ) { a = 1; }
    if ( b === void 0 ) { b = 0; }
    if ( c === void 0 ) { c = 0; }
    if ( d === void 0 ) { d = 1; }
    if ( tx === void 0 ) { tx = 0; }
    if ( ty === void 0 ) { ty = 0; }

    /**
     * @member {number}
     * @default 1
     */
    this.a = a;

    /**
     * @member {number}
     * @default 0
     */
    this.b = b;

    /**
     * @member {number}
     * @default 0
     */
    this.c = c;

    /**
     * @member {number}
     * @default 1
     */
    this.d = d;

    /**
     * @member {number}
     * @default 0
     */
    this.tx = tx;

    /**
     * @member {number}
     * @default 0
     */
    this.ty = ty;

    this.array = null;
  };

  var staticAccessors = { IDENTITY: { configurable: true },TEMP_MATRIX: { configurable: true } };

  /**
   * Creates a Matrix object based on the given array. The Element to Matrix mapping order is as follows:
   *
   * a = array[0]
   * b = array[1]
   * c = array[3]
   * d = array[4]
   * tx = array[2]
   * ty = array[5]
   *
   * @param {number[]} array - The array that the matrix will be populated from.
   */
  Matrix.prototype.fromArray = function fromArray (array)
  {
    this.a = array[0];
    this.b = array[1];
    this.c = array[3];
    this.d = array[4];
    this.tx = array[2];
    this.ty = array[5];
  };

  /**
   * sets the matrix properties
   *
   * @param {number} a - Matrix component
   * @param {number} b - Matrix component
   * @param {number} c - Matrix component
   * @param {number} d - Matrix component
   * @param {number} tx - Matrix component
   * @param {number} ty - Matrix component
   *
   * @return {PIXI.Matrix} This matrix. Good for chaining method calls.
   */
  Matrix.prototype.set = function set (a, b, c, d, tx, ty)
  {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.tx = tx;
    this.ty = ty;

    return this;
  };

  /**
   * Creates an array from the current Matrix object.
   *
   * @param {boolean} transpose - Whether we need to transpose the matrix or not
   * @param {Float32Array} [out=new Float32Array(9)] - If provided the array will be assigned to out
   * @return {number[]} the newly created array which contains the matrix
   */
  Matrix.prototype.toArray = function toArray (transpose, out)
  {
    if (!this.array)
    {
      this.array = new Float32Array(9);
    }

    var array = out || this.array;

    if (transpose)
    {
      array[0] = this.a;
      array[1] = this.b;
      array[2] = 0;
      array[3] = this.c;
      array[4] = this.d;
      array[5] = 0;
      array[6] = this.tx;
      array[7] = this.ty;
      array[8] = 1;
    }
    else
    {
      array[0] = this.a;
      array[1] = this.c;
      array[2] = this.tx;
      array[3] = this.b;
      array[4] = this.d;
      array[5] = this.ty;
      array[6] = 0;
      array[7] = 0;
      array[8] = 1;
    }

    return array;
  };

  /**
   * Get a new position with the current transformation applied.
   * Can be used to go from a child's coordinate space to the world coordinate space. (e.g. rendering)
   *
   * @param {PIXI.Point} pos - The origin
   * @param {PIXI.Point} [newPos] - The point that the new position is assigned to (allowed to be same as input)
   * @return {PIXI.Point} The new point, transformed through this matrix
   */
  Matrix.prototype.apply = function apply (pos, newPos)
  {
    newPos = newPos || new Point();

    var x = pos.x;
    var y = pos.y;

    newPos.x = (this.a * x) + (this.c * y) + this.tx;
    newPos.y = (this.b * x) + (this.d * y) + this.ty;

    return newPos;
  };

  /**
   * Get a new position with the inverse of the current transformation applied.
   * Can be used to go from the world coordinate space to a child's coordinate space. (e.g. input)
   *
   * @param {PIXI.Point} pos - The origin
   * @param {PIXI.Point} [newPos] - The point that the new position is assigned to (allowed to be same as input)
   * @return {PIXI.Point} The new point, inverse-transformed through this matrix
   */
  Matrix.prototype.applyInverse = function applyInverse (pos, newPos)
  {
    newPos = newPos || new Point();

    var id = 1 / ((this.a * this.d) + (this.c * -this.b));

    var x = pos.x;
    var y = pos.y;

    newPos.x = (this.d * id * x) + (-this.c * id * y) + (((this.ty * this.c) - (this.tx * this.d)) * id);
    newPos.y = (this.a * id * y) + (-this.b * id * x) + (((-this.ty * this.a) + (this.tx * this.b)) * id);

    return newPos;
  };

  /**
   * Translates the matrix on the x and y.
   *
   * @param {number} x How much to translate x by
   * @param {number} y How much to translate y by
   * @return {PIXI.Matrix} This matrix. Good for chaining method calls.
   */
  Matrix.prototype.translate = function translate (x, y)
  {
    this.tx += x;
    this.ty += y;

    return this;
  };

  /**
   * Applies a scale transformation to the matrix.
   *
   * @param {number} x The amount to scale horizontally
   * @param {number} y The amount to scale vertically
   * @return {PIXI.Matrix} This matrix. Good for chaining method calls.
   */
  Matrix.prototype.scale = function scale (x, y)
  {
    this.a *= x;
    this.d *= y;
    this.c *= x;
    this.b *= y;
    this.tx *= x;
    this.ty *= y;

    return this;
  };

  /**
   * Applies a rotation transformation to the matrix.
   *
   * @param {number} angle - The angle in radians.
   * @return {PIXI.Matrix} This matrix. Good for chaining method calls.
   */
  Matrix.prototype.rotate = function rotate (angle)
  {
    var cos = Math.cos(angle);
    var sin = Math.sin(angle);

    var a1 = this.a;
    var c1 = this.c;
    var tx1 = this.tx;

    this.a = (a1 * cos) - (this.b * sin);
    this.b = (a1 * sin) + (this.b * cos);
    this.c = (c1 * cos) - (this.d * sin);
    this.d = (c1 * sin) + (this.d * cos);
    this.tx = (tx1 * cos) - (this.ty * sin);
    this.ty = (tx1 * sin) + (this.ty * cos);

    return this;
  };

  /**
   * Appends the given Matrix to this Matrix.
   *
   * @param {PIXI.Matrix} matrix - The matrix to append.
   * @return {PIXI.Matrix} This matrix. Good for chaining method calls.
   */
  Matrix.prototype.append = function append (matrix)
  {
    var a1 = this.a;
    var b1 = this.b;
    var c1 = this.c;
    var d1 = this.d;

    this.a = (matrix.a * a1) + (matrix.b * c1);
    this.b = (matrix.a * b1) + (matrix.b * d1);
    this.c = (matrix.c * a1) + (matrix.d * c1);
    this.d = (matrix.c * b1) + (matrix.d * d1);

    this.tx = (matrix.tx * a1) + (matrix.ty * c1) + this.tx;
    this.ty = (matrix.tx * b1) + (matrix.ty * d1) + this.ty;

    return this;
  };

  /**
   * Sets the matrix based on all the available properties
   *
   * @param {number} x - Position on the x axis
   * @param {number} y - Position on the y axis
   * @param {number} pivotX - Pivot on the x axis
   * @param {number} pivotY - Pivot on the y axis
   * @param {number} scaleX - Scale on the x axis
   * @param {number} scaleY - Scale on the y axis
   * @param {number} rotation - Rotation in radians
   * @param {number} skewX - Skew on the x axis
   * @param {number} skewY - Skew on the y axis
   * @return {PIXI.Matrix} This matrix. Good for chaining method calls.
   */
  Matrix.prototype.setTransform = function setTransform (x, y, pivotX, pivotY, scaleX, scaleY, rotation, skewX, skewY)
  {
    this.a = Math.cos(rotation + skewY) * scaleX;
    this.b = Math.sin(rotation + skewY) * scaleX;
    this.c = -Math.sin(rotation - skewX) * scaleY;
    this.d = Math.cos(rotation - skewX) * scaleY;

    this.tx = x - ((pivotX * this.a) + (pivotY * this.c));
    this.ty = y - ((pivotX * this.b) + (pivotY * this.d));

    return this;
  };

  /**
   * Prepends the given Matrix to this Matrix.
   *
   * @param {PIXI.Matrix} matrix - The matrix to prepend
   * @return {PIXI.Matrix} This matrix. Good for chaining method calls.
   */
  Matrix.prototype.prepend = function prepend (matrix)
  {
    var tx1 = this.tx;

    if (matrix.a !== 1 || matrix.b !== 0 || matrix.c !== 0 || matrix.d !== 1)
    {
      var a1 = this.a;
      var c1 = this.c;

      this.a = (a1 * matrix.a) + (this.b * matrix.c);
      this.b = (a1 * matrix.b) + (this.b * matrix.d);
      this.c = (c1 * matrix.a) + (this.d * matrix.c);
      this.d = (c1 * matrix.b) + (this.d * matrix.d);
    }

    this.tx = (tx1 * matrix.a) + (this.ty * matrix.c) + matrix.tx;
    this.ty = (tx1 * matrix.b) + (this.ty * matrix.d) + matrix.ty;

    return this;
  };

  /**
   * Decomposes the matrix (x, y, scaleX, scaleY, and rotation) and sets the properties on to a transform.
   *
   * @param {PIXI.Transform} transform - The transform to apply the properties to.
   * @return {PIXI.Transform} The transform with the newly applied properties
   */
  Matrix.prototype.decompose = function decompose (transform)
  {
    // sort out rotation / skew..
    var a = this.a;
    var b = this.b;
    var c = this.c;
    var d = this.d;

    var skewX = -Math.atan2(-c, d);
    var skewY = Math.atan2(b, a);

    var delta = Math.abs(skewX + skewY);

    if (delta < 0.00001 || Math.abs(PI_2 - delta) < 0.00001)
    {
      transform.rotation = skewY;
      transform.skew.x = transform.skew.y = 0;
    }
    else
    {
      transform.rotation = 0;
      transform.skew.x = skewX;
      transform.skew.y = skewY;
    }

    // next set scale
    transform.scale.x = Math.sqrt((a * a) + (b * b));
    transform.scale.y = Math.sqrt((c * c) + (d * d));

    // next set position
    transform.position.x = this.tx;
    transform.position.y = this.ty;

    return transform;
  };

  /**
   * Inverts this matrix
   *
   * @return {PIXI.Matrix} This matrix. Good for chaining method calls.
   */
  Matrix.prototype.invert = function invert ()
  {
    var a1 = this.a;
    var b1 = this.b;
    var c1 = this.c;
    var d1 = this.d;
    var tx1 = this.tx;
    var n = (a1 * d1) - (b1 * c1);

    this.a = d1 / n;
    this.b = -b1 / n;
    this.c = -c1 / n;
    this.d = a1 / n;
    this.tx = ((c1 * this.ty) - (d1 * tx1)) / n;
    this.ty = -((a1 * this.ty) - (b1 * tx1)) / n;

    return this;
  };

  /**
   * Resets this Matrix to an identity (default) matrix.
   *
   * @return {PIXI.Matrix} This matrix. Good for chaining method calls.
   */
  Matrix.prototype.identity = function identity ()
  {
    this.a = 1;
    this.b = 0;
    this.c = 0;
    this.d = 1;
    this.tx = 0;
    this.ty = 0;

    return this;
  };

  /**
   * Creates a new Matrix object with the same values as this one.
   *
   * @return {PIXI.Matrix} A copy of this matrix. Good for chaining method calls.
   */
  Matrix.prototype.clone = function clone ()
  {
    var matrix = new Matrix();

    matrix.a = this.a;
    matrix.b = this.b;
    matrix.c = this.c;
    matrix.d = this.d;
    matrix.tx = this.tx;
    matrix.ty = this.ty;

    return matrix;
  };

  /**
   * Changes the values of the given matrix to be the same as the ones in this matrix
   *
   * @param {PIXI.Matrix} matrix - The matrix to copy to.
   * @return {PIXI.Matrix} The matrix given in parameter with its values updated.
   */
  Matrix.prototype.copyTo = function copyTo (matrix)
  {
    matrix.a = this.a;
    matrix.b = this.b;
    matrix.c = this.c;
    matrix.d = this.d;
    matrix.tx = this.tx;
    matrix.ty = this.ty;

    return matrix;
  };

  /**
   * Changes the values of the matrix to be the same as the ones in given matrix
   *
   * @param {PIXI.Matrix} matrix - The matrix to copy from.
   * @return {PIXI.Matrix} this
   */
  Matrix.prototype.copyFrom = function copyFrom (matrix)
  {
    this.a = matrix.a;
    this.b = matrix.b;
    this.c = matrix.c;
    this.d = matrix.d;
    this.tx = matrix.tx;
    this.ty = matrix.ty;

    return this;
  };

  /**
   * A default (identity) matrix
   *
   * @static
   * @const
   * @member {PIXI.Matrix}
   */
  staticAccessors.IDENTITY.get = function ()
  {
    return new Matrix();
  };

  /**
   * A temp matrix
   *
   * @static
   * @const
   * @member {PIXI.Matrix}
   */
  staticAccessors.TEMP_MATRIX.get = function ()
  {
    return new Matrix();
  };

  Object.defineProperties( Matrix, staticAccessors );

  // Your friendly neighbour https://en.wikipedia.org/wiki/Dihedral_group

  /*
	 * Transform matrix for operation n is:
	 * | ux | vx |
	 * | uy | vy |
	 */

  var ux = [1, 1, 0, -1, -1, -1, 0, 1, 1, 1, 0, -1, -1, -1, 0, 1];
  var uy = [0, 1, 1, 1, 0, -1, -1, -1, 0, 1, 1, 1, 0, -1, -1, -1];
  var vx = [0, -1, -1, -1, 0, 1, 1, 1, 0, 1, 1, 1, 0, -1, -1, -1];
  var vy = [1, 1, 0, -1, -1, -1, 0, 1, -1, -1, 0, 1, 1, 1, 0, -1];

  /**
   * [Cayley Table]{@link https://en.wikipedia.org/wiki/Cayley_table}
   * for the composition of each rotation in the dihederal group D8.
   *
   * @type number[][]
   * @private
   */
  var rotationCayley = [];

  /**
   * Matrices for each `GD8Symmetry` rotation.
   *
   * @type Matrix[]
   * @private
   */
  var rotationMatrices = [];

  /*
	 * Alias for {@code Math.sign}.
	 */
  var signum = Math.sign;

  /*
	 * Initializes `rotationCayley` and `rotationMatrices`. It is called
	 * only once below.
	 */
  function init()
  {
    for (var i = 0; i < 16; i++)
    {
      var row = [];

      rotationCayley.push(row);

      for (var j = 0; j < 16; j++)
      {
        /* Multiplies rotation matrices i and j. */
        var _ux = signum((ux[i] * ux[j]) + (vx[i] * uy[j]));
        var _uy = signum((uy[i] * ux[j]) + (vy[i] * uy[j]));
        var _vx = signum((ux[i] * vx[j]) + (vx[i] * vy[j]));
        var _vy = signum((uy[i] * vx[j]) + (vy[i] * vy[j]));

        /* Finds rotation matrix matching the product and pushes it. */
        for (var k = 0; k < 16; k++)
        {
          if (ux[k] === _ux && uy[k] === _uy
            && vx[k] === _vx && vy[k] === _vy)
          {
            row.push(k);
            break;
          }
        }
      }
    }

    for (var i$1 = 0; i$1 < 16; i$1++)
    {
      var mat = new Matrix();

      mat.set(ux[i$1], uy[i$1], vx[i$1], vy[i$1], 0, 0);
      rotationMatrices.push(mat);
    }
  }

  init();

  /**
   * @memberof PIXI
   * @typedef {number} GD8Symmetry
   * @see PIXI.GroupD8
   */

  /**
   * Implements the dihedral group D8, which is similar to
   * [group D4]{@link http://mathworld.wolfram.com/DihedralGroupD4.html};
   * D8 is the same but with diagonals, and it is used for texture
   * rotations.
   *
   * The directions the U- and V- axes after rotation
   * of an angle of `a: GD8Constant` are the vectors `(uX(a), uY(a))`
   * and `(vX(a), vY(a))`. These aren't necessarily unit vectors.
   *
   * **Origin:**<br>
   *  This is the small part of gameofbombs.com portal system. It works.
   *
   * @see PIXI.GroupD8.E
   * @see PIXI.GroupD8.SE
   * @see PIXI.GroupD8.S
   * @see PIXI.GroupD8.SW
   * @see PIXI.GroupD8.W
   * @see PIXI.GroupD8.NW
   * @see PIXI.GroupD8.N
   * @see PIXI.GroupD8.NE
   * @author Ivan @ivanpopelyshev
   * @class
   * @memberof PIXI
   */
  var GroupD8 = {
    /**
     * | Rotation | Direction |
     * |----------|-----------|
     * | 0Â°       | East      |
     *
     * @constant {PIXI.GD8Symmetry}
     */
    E: 0,

    /**
     * | Rotation | Direction |
     * |----------|-----------|
     * | 45Â°â†»     | Southeast |
     *
     * @constant {PIXI.GD8Symmetry}
     */
    SE: 1,

    /**
     * | Rotation | Direction |
     * |----------|-----------|
     * | 90Â°â†»     | South     |
     *
     * @constant {PIXI.GD8Symmetry}
     */
    S: 2,

    /**
     * | Rotation | Direction |
     * |----------|-----------|
     * | 135Â°â†»    | Southwest |
     *
     * @constant {PIXI.GD8Symmetry}
     */
    SW: 3,

    /**
     * | Rotation | Direction |
     * |----------|-----------|
     * | 180Â°     | West      |
     *
     * @constant {PIXI.GD8Symmetry}
     */
    W: 4,

    /**
     * | Rotation    | Direction    |
     * |-------------|--------------|
     * | -135Â°/225Â°â†» | Northwest    |
     *
     * @constant {PIXI.GD8Symmetry}
     */
    NW: 5,

    /**
     * | Rotation    | Direction    |
     * |-------------|--------------|
     * | -90Â°/270Â°â†»  | North        |
     *
     * @constant {PIXI.GD8Symmetry}
     */
    N: 6,

    /**
     * | Rotation    | Direction    |
     * |-------------|--------------|
     * | -45Â°/315Â°â†»  | Northeast    |
     *
     * @constant {PIXI.GD8Symmetry}
     */
    NE: 7,

    /**
     * Reflection about Y-axis.
     *
     * @constant {PIXI.GD8Symmetry}
     */
    MIRROR_VERTICAL: 8,

    /**
     * Reflection about the main diagonal.
     *
     * @constant {PIXI.GD8Symmetry}
     */
    MAIN_DIAGONAL: 10,

    /**
     * Reflection about X-axis.
     *
     * @constant {PIXI.GD8Symmetry}
     */
    MIRROR_HORIZONTAL: 12,

    /**
     * Reflection about reverse diagonal.
     *
     * @constant {PIXI.GD8Symmetry}
     */
    REVERSE_DIAGONAL: 14,

    /**
     * @memberof PIXI.GroupD8
     * @param {PIXI.GD8Symmetry} ind - sprite rotation angle.
     * @return {PIXI.GD8Symmetry} The X-component of the U-axis
     *    after rotating the axes.
     */
    uX: function (ind) { return ux[ind]; },

    /**
     * @memberof PIXI.GroupD8
     * @param {PIXI.GD8Symmetry} ind - sprite rotation angle.
     * @return {PIXI.GD8Symmetry} The Y-component of the U-axis
     *    after rotating the axes.
     */
    uY: function (ind) { return uy[ind]; },

    /**
     * @memberof PIXI.GroupD8
     * @param {PIXI.GD8Symmetry} ind - sprite rotation angle.
     * @return {PIXI.GD8Symmetry} The X-component of the V-axis
     *    after rotating the axes.
     */
    vX: function (ind) { return vx[ind]; },

    /**
     * @memberof PIXI.GroupD8
     * @param {PIXI.GD8Symmetry} ind - sprite rotation angle.
     * @return {PIXI.GD8Symmetry} The Y-component of the V-axis
     *    after rotating the axes.
     */
    vY: function (ind) { return vy[ind]; },

    /**
     * @memberof PIXI.GroupD8
     * @param {PIXI.GD8Symmetry} rotation - symmetry whose opposite
     *   is needed. Only rotations have opposite symmetries while
     *   reflections don't.
     * @return {PIXI.GD8Symmetry} The opposite symmetry of `rotation`
     */
    inv: function (rotation) {
      if (rotation & 8)// true only if between 8 & 15 (reflections)
      {
        return rotation & 15;// or rotation % 16
      }

      return (-rotation) & 7;// or (8 - rotation) % 8
    },

    /**
     * Composes the two D8 operations.
     *
     * Taking `^` as reflection:
     *
     * |       | E=0 | S=2 | W=4 | N=6 | E^=8 | S^=10 | W^=12 | N^=14 |
     * |-------|-----|-----|-----|-----|------|-------|-------|-------|
     * | E=0   | E   | S   | W   | N   | E^   | S^    | W^    | N^    |
     * | S=2   | S   | W   | N   | E   | S^   | W^    | N^    | E^    |
     * | W=4   | W   | N   | E   | S   | W^   | N^    | E^    | S^    |
     * | N=6   | N   | E   | S   | W   | N^   | E^    | S^    | W^    |
     * | E^=8  | E^  | N^  | W^  | S^  | E    | N     | W     | S     |
     * | S^=10 | S^  | E^  | N^  | W^  | S    | E     | N     | W     |
     * | W^=12 | W^  | S^  | E^  | N^  | W    | S     | E     | N     |
     * | N^=14 | N^  | W^  | S^  | E^  | N    | W     | S     | E     |
     *
     * [This is a Cayley table]{@link https://en.wikipedia.org/wiki/Cayley_table}
     * @memberof PIXI.GroupD8
     * @param {PIXI.GD8Symmetry} rotationSecond - Second operation, which
     *   is the row in the above cayley table.
     * @param {PIXI.GD8Symmetry} rotationFirst - First operation, which
     *   is the column in the above cayley table.
     * @return {PIXI.GD8Symmetry} Composed operation
     */
    add: function (rotationSecond, rotationFirst) { return (
      rotationCayley[rotationSecond][rotationFirst]
    ); },

    /**
     * Reverse of `add`.
     *
     * @memberof PIXI.GroupD8
     * @param {PIXI.GD8Symmetry} rotationSecond - Second operation
     * @param {PIXI.GD8Symmetry} rotationFirst - First operation
     * @return {PIXI.GD8Symmetry} Result
     */
    sub: function (rotationSecond, rotationFirst) { return (
      rotationCayley[rotationSecond][GroupD8.inv(rotationFirst)]
    ); },

    /**
     * Adds 180 degrees to rotation, which is a commutative
     * operation.
     *
     * @memberof PIXI.GroupD8
     * @param {number} rotation - The number to rotate.
     * @returns {number} Rotated number
     */
    rotate180: function (rotation) { return rotation ^ 4; },

    /**
     * Checks if the rotation angle is vertical, i.e. south
     * or north. It doesn't work for reflections.
     *
     * @memberof PIXI.GroupD8
     * @param {PIXI.GD8Symmetry} rotation - The number to check.
     * @returns {boolean} Whether or not the direction is vertical
     */
    isVertical: function (rotation) { return (rotation & 3) === 2; }, // rotation % 4 === 2

    /**
     * Approximates the vector `V(dx,dy)` into one of the
     * eight directions provided by `GroupD8`.
     *
     * @memberof PIXI.GroupD8
     * @param {number} dx - X-component of the vector
     * @param {number} dy - Y-component of the vector
     * @return {PIXI.GD8Symmetry} Approximation of the vector into
     *  one of the eight symmetries.
     */
    byDirection: function (dx, dy) {
      if (Math.abs(dx) * 2 <= Math.abs(dy))
      {
        if (dy >= 0)
        {
          return GroupD8.S;
        }

        return GroupD8.N;
      }
      else if (Math.abs(dy) * 2 <= Math.abs(dx))
      {
        if (dx > 0)
        {
          return GroupD8.E;
        }

        return GroupD8.W;
      }
      else if (dy > 0)
      {
        if (dx > 0)
        {
          return GroupD8.SE;
        }

        return GroupD8.SW;
      }
      else if (dx > 0)
      {
        return GroupD8.NE;
      }

      return GroupD8.NW;
    },

    /**
     * Helps sprite to compensate texture packer rotation.
     *
     * @memberof PIXI.GroupD8
     * @param {PIXI.Matrix} matrix - sprite world matrix
     * @param {PIXI.GD8Symmetry} rotation - The rotation factor to use.
     * @param {number} tx - sprite anchoring
     * @param {number} ty - sprite anchoring
     */
    matrixAppendRotationInv: function (matrix, rotation, tx, ty) {
      if ( tx === void 0 ) { tx = 0; }
      if ( ty === void 0 ) { ty = 0; }

      // Packer used "rotation", we use "inv(rotation)"
      var mat = rotationMatrices[GroupD8.inv(rotation)];

      mat.tx = tx;
      mat.ty = ty;
      matrix.append(mat);
    },
  };

  /**
   * Transform that takes care about its versions
   *
   * @class
   * @memberof PIXI
   */
  var Transform = function Transform()
  {
    /**
     * The world transformation matrix.
     *
     * @member {PIXI.Matrix}
     */
    this.worldTransform = new Matrix();

    /**
     * The local transformation matrix.
     *
     * @member {PIXI.Matrix}
     */
    this.localTransform = new Matrix();

    /**
     * The coordinate of the object relative to the local coordinates of the parent.
     *
     * @member {PIXI.ObservablePoint}
     */
    this.position = new ObservablePoint(this.onChange, this, 0, 0);

    /**
     * The scale factor of the object.
     *
     * @member {PIXI.ObservablePoint}
     */
    this.scale = new ObservablePoint(this.onChange, this, 1, 1);

    /**
     * The pivot point of the displayObject that it rotates around.
     *
     * @member {PIXI.ObservablePoint}
     */
    this.pivot = new ObservablePoint(this.onChange, this, 0, 0);

    /**
     * The skew amount, on the x and y axis.
     *
     * @member {PIXI.ObservablePoint}
     */
    this.skew = new ObservablePoint(this.updateSkew, this, 0, 0);

    /**
     * The rotation amount.
     *
     * @protected
     * @member {number}
     */
    this._rotation = 0;

    /**
     * The X-coordinate value of the normalized local X axis,
     * the first column of the local transformation matrix without a scale.
     *
     * @protected
     * @member {number}
     */
    this._cx = 1;

    /**
     * The Y-coordinate value of the normalized local X axis,
     * the first column of the local transformation matrix without a scale.
     *
     * @protected
     * @member {number}
     */
    this._sx = 0;

    /**
     * The X-coordinate value of the normalized local Y axis,
     * the second column of the local transformation matrix without a scale.
     *
     * @protected
     * @member {number}
     */
    this._cy = 0;

    /**
     * The Y-coordinate value of the normalized local Y axis,
     * the second column of the local transformation matrix without a scale.
     *
     * @protected
     * @member {number}
     */
    this._sy = 1;

    /**
     * The locally unique ID of the local transform.
     *
     * @protected
     * @member {number}
     */
    this._localID = 0;

    /**
     * The locally unique ID of the local transform
     * used to calculate the current local transformation matrix.
     *
     * @protected
     * @member {number}
     */
    this._currentLocalID = 0;

    /**
     * The locally unique ID of the world transform.
     *
     * @protected
     * @member {number}
     */
    this._worldID = 0;

    /**
     * The locally unique ID of the parent's world transform
     * used to calculate the current world transformation matrix.
     *
     * @protected
     * @member {number}
     */
    this._parentID = 0;
  };

  var prototypeAccessors$1$1 = { rotation: { configurable: true } };

  /**
   * Called when a value changes.
   *
   * @protected
   */
  Transform.prototype.onChange = function onChange ()
  {
    this._localID++;
  };

  /**
   * Called when the skew or the rotation changes.
   *
   * @protected
   */
  Transform.prototype.updateSkew = function updateSkew ()
  {
    this._cx = Math.cos(this._rotation + this.skew._y);
    this._sx = Math.sin(this._rotation + this.skew._y);
    this._cy = -Math.sin(this._rotation - this.skew._x); // cos, added PI/2
    this._sy = Math.cos(this._rotation - this.skew._x); // sin, added PI/2

    this._localID++;
  };

  /**
   * Updates the local transformation matrix.
   */
  Transform.prototype.updateLocalTransform = function updateLocalTransform ()
  {
    var lt = this.localTransform;

    if (this._localID !== this._currentLocalID)
    {
      // get the matrix values of the displayobject based on its transform properties..
      lt.a = this._cx * this.scale._x;
      lt.b = this._sx * this.scale._x;
      lt.c = this._cy * this.scale._y;
      lt.d = this._sy * this.scale._y;

      lt.tx = this.position._x - ((this.pivot._x * lt.a) + (this.pivot._y * lt.c));
      lt.ty = this.position._y - ((this.pivot._x * lt.b) + (this.pivot._y * lt.d));
      this._currentLocalID = this._localID;

      // force an update..
      this._parentID = -1;
    }
  };

  /**
   * Updates the local and the world transformation matrices.
   *
   * @param {PIXI.Transform} parentTransform - The parent transform
   */
  Transform.prototype.updateTransform = function updateTransform (parentTransform)
  {
    var lt = this.localTransform;

    if (this._localID !== this._currentLocalID)
    {
      // get the matrix values of the displayobject based on its transform properties..
      lt.a = this._cx * this.scale._x;
      lt.b = this._sx * this.scale._x;
      lt.c = this._cy * this.scale._y;
      lt.d = this._sy * this.scale._y;

      lt.tx = this.position._x - ((this.pivot._x * lt.a) + (this.pivot._y * lt.c));
      lt.ty = this.position._y - ((this.pivot._x * lt.b) + (this.pivot._y * lt.d));
      this._currentLocalID = this._localID;

      // force an update..
      this._parentID = -1;
    }

    if (this._parentID !== parentTransform._worldID)
    {
      // concat the parent matrix with the objects transform.
      var pt = parentTransform.worldTransform;
      var wt = this.worldTransform;

      wt.a = (lt.a * pt.a) + (lt.b * pt.c);
      wt.b = (lt.a * pt.b) + (lt.b * pt.d);
      wt.c = (lt.c * pt.a) + (lt.d * pt.c);
      wt.d = (lt.c * pt.b) + (lt.d * pt.d);
      wt.tx = (lt.tx * pt.a) + (lt.ty * pt.c) + pt.tx;
      wt.ty = (lt.tx * pt.b) + (lt.ty * pt.d) + pt.ty;

      this._parentID = parentTransform._worldID;

      // update the id of the transform..
      this._worldID++;
    }
  };

  /**
   * Decomposes a matrix and sets the transforms properties based on it.
   *
   * @param {PIXI.Matrix} matrix - The matrix to decompose
   */
  Transform.prototype.setFromMatrix = function setFromMatrix (matrix)
  {
    matrix.decompose(this);
    this._localID++;
  };

  /**
   * The rotation of the object in radians.
   *
   * @member {number}
   */
  prototypeAccessors$1$1.rotation.get = function ()
  {
    return this._rotation;
  };

  prototypeAccessors$1$1.rotation.set = function (value) // eslint-disable-line require-jsdoc
  {
    if (this._rotation !== value)
    {
      this._rotation = value;
      this.updateSkew();
    }
  };

  Object.defineProperties( Transform.prototype, prototypeAccessors$1$1 );

  /**
   * A default (identity) transform
   *
   * @static
   * @constant
   * @member {PIXI.Transform}
   */
  Transform.IDENTITY = new Transform();

  /**
   * Size object, contains width and height
   *
   * @memberof PIXI
   * @typedef {object} ISize
   * @property {number} width - Width component
   * @property {number} height - Height component
   */

  /**
   * Rectangle object is an area defined by its position, as indicated by its top-left corner
   * point (x, y) and by its width and its height.
   *
   * @class
   * @memberof PIXI
   */
  var Rectangle = function Rectangle(x, y, width, height)
  {
    if ( x === void 0 ) { x = 0; }
    if ( y === void 0 ) { y = 0; }
    if ( width === void 0 ) { width = 0; }
    if ( height === void 0 ) { height = 0; }

    /**
     * @member {number}
     * @default 0
     */
    this.x = Number(x);

    /**
     * @member {number}
     * @default 0
     */
    this.y = Number(y);

    /**
     * @member {number}
     * @default 0
     */
    this.width = Number(width);

    /**
     * @member {number}
     * @default 0
     */
    this.height = Number(height);

    /**
     * The type of the object, mainly used to avoid `instanceof` checks
     *
     * @member {number}
     * @readOnly
     * @default PIXI.SHAPES.RECT
     * @see PIXI.SHAPES
     */
    this.type = SHAPES.RECT;
  };

  var prototypeAccessors$2 = { left: { configurable: true },right: { configurable: true },top: { configurable: true },bottom: { configurable: true } };
  var staticAccessors$1 = { EMPTY: { configurable: true } };

  /**
   * returns the left edge of the rectangle
   *
   * @member {number}
   */
  prototypeAccessors$2.left.get = function ()
  {
    return this.x;
  };

  /**
   * returns the right edge of the rectangle
   *
   * @member {number}
   */
  prototypeAccessors$2.right.get = function ()
  {
    return this.x + this.width;
  };

  /**
   * returns the top edge of the rectangle
   *
   * @member {number}
   */
  prototypeAccessors$2.top.get = function ()
  {
    return this.y;
  };

  /**
   * returns the bottom edge of the rectangle
   *
   * @member {number}
   */
  prototypeAccessors$2.bottom.get = function ()
  {
    return this.y + this.height;
  };

  /**
   * A constant empty rectangle.
   *
   * @static
   * @constant
   * @member {PIXI.Rectangle}
   */
  staticAccessors$1.EMPTY.get = function ()
  {
    return new Rectangle(0, 0, 0, 0);
  };

  /**
   * Creates a clone of this Rectangle
   *
   * @return {PIXI.Rectangle} a copy of the rectangle
   */
  Rectangle.prototype.clone = function clone ()
  {
    return new Rectangle(this.x, this.y, this.width, this.height);
  };

  /**
   * Copies another rectangle to this one.
   *
   * @param {PIXI.Rectangle} rectangle - The rectangle to copy from.
   * @return {PIXI.Rectangle} Returns itself.
   */
  Rectangle.prototype.copyFrom = function copyFrom (rectangle)
  {
    this.x = rectangle.x;
    this.y = rectangle.y;
    this.width = rectangle.width;
    this.height = rectangle.height;

    return this;
  };

  /**
   * Copies this rectangle to another one.
   *
   * @param {PIXI.Rectangle} rectangle - The rectangle to copy to.
   * @return {PIXI.Rectangle} Returns given parameter.
   */
  Rectangle.prototype.copyTo = function copyTo (rectangle)
  {
    rectangle.x = this.x;
    rectangle.y = this.y;
    rectangle.width = this.width;
    rectangle.height = this.height;

    return rectangle;
  };

  /**
   * Checks whether the x and y coordinates given are contained within this Rectangle
   *
   * @param {number} x - The X coordinate of the point to test
   * @param {number} y - The Y coordinate of the point to test
   * @return {boolean} Whether the x/y coordinates are within this Rectangle
   */
  Rectangle.prototype.contains = function contains (x, y)
  {
    if (this.width <= 0 || this.height <= 0)
    {
      return false;
    }

    if (x >= this.x && x < this.x + this.width)
    {
      if (y >= this.y && y < this.y + this.height)
      {
        return true;
      }
    }

    return false;
  };

  /**
   * Pads the rectangle making it grow in all directions.
   *
   * @param {number} paddingX - The horizontal padding amount.
   * @param {number} paddingY - The vertical padding amount.
   */
  Rectangle.prototype.pad = function pad (paddingX, paddingY)
  {
    paddingX = paddingX || 0;
    paddingY = paddingY || ((paddingY !== 0) ? paddingX : 0);

    this.x -= paddingX;
    this.y -= paddingY;

    this.width += paddingX * 2;
    this.height += paddingY * 2;
  };

  /**
   * Fits this rectangle around the passed one.
   *
   * @param {PIXI.Rectangle} rectangle - The rectangle to fit.
   */
  Rectangle.prototype.fit = function fit (rectangle)
  {
    var x1 = Math.max(this.x, rectangle.x);
    var x2 = Math.min(this.x + this.width, rectangle.x + rectangle.width);
    var y1 = Math.max(this.y, rectangle.y);
    var y2 = Math.min(this.y + this.height, rectangle.y + rectangle.height);

    this.x = x1;
    this.width = Math.max(x2 - x1, 0);
    this.y = y1;
    this.height = Math.max(y2 - y1, 0);
  };

  /**
   * Enlarges rectangle that way its corners lie on grid
   *
   * @param {number} [resolution=1] resolution
   * @param {number} [eps=0.001] precision
   */
  Rectangle.prototype.ceil = function ceil (resolution, eps)
  {
    if ( resolution === void 0 ) { resolution = 1; }
    if ( eps === void 0 ) { eps = 0.001; }

    var x2 = Math.ceil((this.x + this.width - eps) * resolution) / resolution;
    var y2 = Math.ceil((this.y + this.height - eps) * resolution) / resolution;

    this.x = Math.floor((this.x + eps) * resolution) / resolution;
    this.y = Math.floor((this.y + eps) * resolution) / resolution;

    this.width = x2 - this.x;
    this.height = y2 - this.y;
  };

  /**
   * Enlarges this rectangle to include the passed rectangle.
   *
   * @param {PIXI.Rectangle} rectangle - The rectangle to include.
   */
  Rectangle.prototype.enlarge = function enlarge (rectangle)
  {
    var x1 = Math.min(this.x, rectangle.x);
    var x2 = Math.max(this.x + this.width, rectangle.x + rectangle.width);
    var y1 = Math.min(this.y, rectangle.y);
    var y2 = Math.max(this.y + this.height, rectangle.y + rectangle.height);

    this.x = x1;
    this.width = x2 - x1;
    this.y = y1;
    this.height = y2 - y1;
  };

  Object.defineProperties( Rectangle.prototype, prototypeAccessors$2 );
  Object.defineProperties( Rectangle, staticAccessors$1 );

  /**
   * The Circle object is used to help draw graphics and can also be used to specify a hit area for displayObjects.
   *
   * @class
   * @memberof PIXI
   */
  var Circle = function Circle(x, y, radius)
  {
    if ( x === void 0 ) { x = 0; }
    if ( y === void 0 ) { y = 0; }
    if ( radius === void 0 ) { radius = 0; }

    /**
     * @member {number}
     * @default 0
     */
    this.x = x;

    /**
     * @member {number}
     * @default 0
     */
    this.y = y;

    /**
     * @member {number}
     * @default 0
     */
    this.radius = radius;

    /**
     * The type of the object, mainly used to avoid `instanceof` checks
     *
     * @member {number}
     * @readOnly
     * @default PIXI.SHAPES.CIRC
     * @see PIXI.SHAPES
     */
    this.type = SHAPES.CIRC;
  };

  /**
   * Creates a clone of this Circle instance
   *
   * @return {PIXI.Circle} a copy of the Circle
   */
  Circle.prototype.clone = function clone ()
  {
    return new Circle(this.x, this.y, this.radius);
  };

  /**
   * Checks whether the x and y coordinates given are contained within this circle
   *
   * @param {number} x - The X coordinate of the point to test
   * @param {number} y - The Y coordinate of the point to test
   * @return {boolean} Whether the x/y coordinates are within this Circle
   */
  Circle.prototype.contains = function contains (x, y)
  {
    if (this.radius <= 0)
    {
      return false;
    }

    var r2 = this.radius * this.radius;
    var dx = (this.x - x);
    var dy = (this.y - y);

    dx *= dx;
    dy *= dy;

    return (dx + dy <= r2);
  };

  /**
   * Returns the framing rectangle of the circle as a Rectangle object
   *
   * @return {PIXI.Rectangle} the framing rectangle
   */
  Circle.prototype.getBounds = function getBounds ()
  {
    return new Rectangle(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
  };

  /**
   * The Ellipse object is used to help draw graphics and can also be used to specify a hit area for displayObjects.
   *
   * @class
   * @memberof PIXI
   */
  var Ellipse = function Ellipse(x, y, halfWidth, halfHeight)
  {
    if ( x === void 0 ) { x = 0; }
    if ( y === void 0 ) { y = 0; }
    if ( halfWidth === void 0 ) { halfWidth = 0; }
    if ( halfHeight === void 0 ) { halfHeight = 0; }

    /**
     * @member {number}
     * @default 0
     */
    this.x = x;

    /**
     * @member {number}
     * @default 0
     */
    this.y = y;

    /**
     * @member {number}
     * @default 0
     */
    this.width = halfWidth;

    /**
     * @member {number}
     * @default 0
     */
    this.height = halfHeight;

    /**
     * The type of the object, mainly used to avoid `instanceof` checks
     *
     * @member {number}
     * @readOnly
     * @default PIXI.SHAPES.ELIP
     * @see PIXI.SHAPES
     */
    this.type = SHAPES.ELIP;
  };

  /**
   * Creates a clone of this Ellipse instance
   *
   * @return {PIXI.Ellipse} a copy of the ellipse
   */
  Ellipse.prototype.clone = function clone ()
  {
    return new Ellipse(this.x, this.y, this.width, this.height);
  };

  /**
   * Checks whether the x and y coordinates given are contained within this ellipse
   *
   * @param {number} x - The X coordinate of the point to test
   * @param {number} y - The Y coordinate of the point to test
   * @return {boolean} Whether the x/y coords are within this ellipse
   */
  Ellipse.prototype.contains = function contains (x, y)
  {
    if (this.width <= 0 || this.height <= 0)
    {
      return false;
    }

    // normalize the coords to an ellipse with center 0,0
    var normx = ((x - this.x) / this.width);
    var normy = ((y - this.y) / this.height);

    normx *= normx;
    normy *= normy;

    return (normx + normy <= 1);
  };

  /**
   * Returns the framing rectangle of the ellipse as a Rectangle object
   *
   * @return {PIXI.Rectangle} the framing rectangle
   */
  Ellipse.prototype.getBounds = function getBounds ()
  {
    return new Rectangle(this.x - this.width, this.y - this.height, this.width, this.height);
  };

  /**
   * A class to define a shape via user defined co-orinates.
   *
   * @class
   * @memberof PIXI
   */
  var Polygon = function Polygon()
  {
    var arguments$1 = arguments;

    var points = [], len = arguments.length;
    while ( len-- ) { points[ len ] = arguments$1[ len ]; }

    if (Array.isArray(points[0]))
    {
      points = points[0];
    }

    // if this is an array of points, convert it to a flat array of numbers
    if (points[0] instanceof Point)
    {
      var p = [];

      for (var i = 0, il = points.length; i < il; i++)
      {
        p.push(points[i].x, points[i].y);
      }

      points = p;
    }

    /**
     * An array of the points of this polygon
     *
     * @member {number[]}
     */
    this.points = points;

    /**
     * The type of the object, mainly used to avoid `instanceof` checks
     *
     * @member {number}
     * @readOnly
     * @default PIXI.SHAPES.POLY
     * @see PIXI.SHAPES
     */
    this.type = SHAPES.POLY;

    /**
     * `false` after moveTo, `true` after `closePath`. In all other cases it is `true`.
     * @member {boolean}
     * @default true
     */
    this.closeStroke = true;
  };

  /**
   * Creates a clone of this polygon
   *
   * @return {PIXI.Polygon} a copy of the polygon
   */
  Polygon.prototype.clone = function clone ()
  {
    var polygon = new Polygon(this.points.slice());

    polygon.closeStroke = this.closeStroke;

    return polygon;
  };

  /**
   * Checks whether the x and y coordinates passed to this function are contained within this polygon
   *
   * @param {number} x - The X coordinate of the point to test
   * @param {number} y - The Y coordinate of the point to test
   * @return {boolean} Whether the x/y coordinates are within this polygon
   */
  Polygon.prototype.contains = function contains (x, y)
  {
    var inside = false;

    // use some raycasting to test hits
    // https://github.com/substack/point-in-polygon/blob/master/index.js
    var length = this.points.length / 2;

    for (var i = 0, j = length - 1; i < length; j = i++)
    {
      var xi = this.points[i * 2];
      var yi = this.points[(i * 2) + 1];
      var xj = this.points[j * 2];
      var yj = this.points[(j * 2) + 1];
      var intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * ((y - yi) / (yj - yi))) + xi);

      if (intersect)
      {
        inside = !inside;
      }
    }

    return inside;
  };

  /**
   * The Rounded Rectangle object is an area that has nice rounded corners, as indicated by its
   * top-left corner point (x, y) and by its width and its height and its radius.
   *
   * @class
   * @memberof PIXI
   */
  var RoundedRectangle = function RoundedRectangle(x, y, width, height, radius)
  {
    if ( x === void 0 ) { x = 0; }
    if ( y === void 0 ) { y = 0; }
    if ( width === void 0 ) { width = 0; }
    if ( height === void 0 ) { height = 0; }
    if ( radius === void 0 ) { radius = 20; }

    /**
     * @member {number}
     * @default 0
     */
    this.x = x;

    /**
     * @member {number}
     * @default 0
     */
    this.y = y;

    /**
     * @member {number}
     * @default 0
     */
    this.width = width;

    /**
     * @member {number}
     * @default 0
     */
    this.height = height;

    /**
     * @member {number}
     * @default 20
     */
    this.radius = radius;

    /**
     * The type of the object, mainly used to avoid `instanceof` checks
     *
     * @member {number}
     * @readonly
     * @default PIXI.SHAPES.RREC
     * @see PIXI.SHAPES
     */
    this.type = SHAPES.RREC;
  };

  /**
   * Creates a clone of this Rounded Rectangle
   *
   * @return {PIXI.RoundedRectangle} a copy of the rounded rectangle
   */
  RoundedRectangle.prototype.clone = function clone ()
  {
    return new RoundedRectangle(this.x, this.y, this.width, this.height, this.radius);
  };

  /**
   * Checks whether the x and y coordinates given are contained within this Rounded Rectangle
   *
   * @param {number} x - The X coordinate of the point to test
   * @param {number} y - The Y coordinate of the point to test
   * @return {boolean} Whether the x/y coordinates are within this Rounded Rectangle
   */
  RoundedRectangle.prototype.contains = function contains (x, y)
  {
    if (this.width <= 0 || this.height <= 0)
    {
      return false;
    }
    if (x >= this.x && x <= this.x + this.width)
    {
      if (y >= this.y && y <= this.y + this.height)
      {
        if ((y >= this.y + this.radius && y <= this.y + this.height - this.radius)
          || (x >= this.x + this.radius && x <= this.x + this.width - this.radius))
        {
          return true;
        }
        var dx = x - (this.x + this.radius);
        var dy = y - (this.y + this.radius);
        var radius2 = this.radius * this.radius;

        if ((dx * dx) + (dy * dy) <= radius2)
        {
          return true;
        }
        dx = x - (this.x + this.width - this.radius);
        if ((dx * dx) + (dy * dy) <= radius2)
        {
          return true;
        }
        dy = y - (this.y + this.height - this.radius);
        if ((dx * dx) + (dy * dy) <= radius2)
        {
          return true;
        }
        dx = x - (this.x + this.radius);
        if ((dx * dx) + (dy * dy) <= radius2)
        {
          return true;
        }
      }
    }

    return false;
  };

  /*!
	 * @pixi/display - v5.1.0
	 * Compiled Fri, 19 Jul 2019 21:58:39 UTC
	 *
	 * @pixi/display is licensed under the MIT License.
	 * http://www.opensource.org/licenses/mit-license
	 */

  /**
   * Sets the default value for the container property 'sortableChildren'.
   * If set to true, the container will sort its children by zIndex value
   * when updateTransform() is called, or manually if sortChildren() is called.
   *
   * This actually changes the order of elements in the array, so should be treated
   * as a basic solution that is not performant compared to other solutions,
   * such as @link https://github.com/pixijs/pixi-display
   *
   * Also be aware of that this may not work nicely with the addChildAt() function,
   * as the zIndex sorting may cause the child to automatically sorted to another position.
   *
   * @static
   * @constant
   * @name SORTABLE_CHILDREN
   * @memberof PIXI.settings
   * @type {boolean}
   * @default false
   */
  settings.SORTABLE_CHILDREN = false;

  /**
   * 'Builder' pattern for bounds rectangles.
   *
   * This could be called an Axis-Aligned Bounding Box.
   * It is not an actual shape. It is a mutable thing; no 'EMPTY' or those kind of problems.
   *
   * @class
   * @memberof PIXI
   */
  var Bounds = function Bounds()
  {
    /**
     * @member {number}
     * @default 0
     */
    this.minX = Infinity;

    /**
     * @member {number}
     * @default 0
     */
    this.minY = Infinity;

    /**
     * @member {number}
     * @default 0
     */
    this.maxX = -Infinity;

    /**
     * @member {number}
     * @default 0
     */
    this.maxY = -Infinity;

    this.rect = null;
  };

  /**
   * Checks if bounds are empty.
   *
   * @return {boolean} True if empty.
   */
  Bounds.prototype.isEmpty = function isEmpty ()
  {
    return this.minX > this.maxX || this.minY > this.maxY;
  };

  /**
   * Clears the bounds and resets.
   *
   */
  Bounds.prototype.clear = function clear ()
  {
    this.updateID++;

    this.minX = Infinity;
    this.minY = Infinity;
    this.maxX = -Infinity;
    this.maxY = -Infinity;
  };

  /**
   * Can return Rectangle.EMPTY constant, either construct new rectangle, either use your rectangle
   * It is not guaranteed that it will return tempRect
   *
   * @param {PIXI.Rectangle} rect - temporary object will be used if AABB is not empty
   * @returns {PIXI.Rectangle} A rectangle of the bounds
   */
  Bounds.prototype.getRectangle = function getRectangle (rect)
  {
    if (this.minX > this.maxX || this.minY > this.maxY)
    {
      return Rectangle.EMPTY;
    }

    rect = rect || new Rectangle(0, 0, 1, 1);

    rect.x = this.minX;
    rect.y = this.minY;
    rect.width = this.maxX - this.minX;
    rect.height = this.maxY - this.minY;

    return rect;
  };

  /**
   * This function should be inlined when its possible.
   *
   * @param {PIXI.Point} point - The point to add.
   */
  Bounds.prototype.addPoint = function addPoint (point)
  {
    this.minX = Math.min(this.minX, point.x);
    this.maxX = Math.max(this.maxX, point.x);
    this.minY = Math.min(this.minY, point.y);
    this.maxY = Math.max(this.maxY, point.y);
  };

  /**
   * Adds a quad, not transformed
   *
   * @param {Float32Array} vertices - The verts to add.
   */
  Bounds.prototype.addQuad = function addQuad (vertices)
  {
    var minX = this.minX;
    var minY = this.minY;
    var maxX = this.maxX;
    var maxY = this.maxY;

    var x = vertices[0];
    var y = vertices[1];

    minX = x < minX ? x : minX;
    minY = y < minY ? y : minY;
    maxX = x > maxX ? x : maxX;
    maxY = y > maxY ? y : maxY;

    x = vertices[2];
    y = vertices[3];
    minX = x < minX ? x : minX;
    minY = y < minY ? y : minY;
    maxX = x > maxX ? x : maxX;
    maxY = y > maxY ? y : maxY;

    x = vertices[4];
    y = vertices[5];
    minX = x < minX ? x : minX;
    minY = y < minY ? y : minY;
    maxX = x > maxX ? x : maxX;
    maxY = y > maxY ? y : maxY;

    x = vertices[6];
    y = vertices[7];
    minX = x < minX ? x : minX;
    minY = y < minY ? y : minY;
    maxX = x > maxX ? x : maxX;
    maxY = y > maxY ? y : maxY;

    this.minX = minX;
    this.minY = minY;
    this.maxX = maxX;
    this.maxY = maxY;
  };

  /**
   * Adds sprite frame, transformed.
   *
   * @param {PIXI.Transform} transform - TODO
   * @param {number} x0 - TODO
   * @param {number} y0 - TODO
   * @param {number} x1 - TODO
   * @param {number} y1 - TODO
   */
  Bounds.prototype.addFrame = function addFrame (transform, x0, y0, x1, y1)
  {
    var matrix = transform.worldTransform;
    var a = matrix.a;
    var b = matrix.b;
    var c = matrix.c;
    var d = matrix.d;
    var tx = matrix.tx;
    var ty = matrix.ty;

    var minX = this.minX;
    var minY = this.minY;
    var maxX = this.maxX;
    var maxY = this.maxY;

    var x = (a * x0) + (c * y0) + tx;
    var y = (b * x0) + (d * y0) + ty;

    minX = x < minX ? x : minX;
    minY = y < minY ? y : minY;
    maxX = x > maxX ? x : maxX;
    maxY = y > maxY ? y : maxY;

    x = (a * x1) + (c * y0) + tx;
    y = (b * x1) + (d * y0) + ty;
    minX = x < minX ? x : minX;
    minY = y < minY ? y : minY;
    maxX = x > maxX ? x : maxX;
    maxY = y > maxY ? y : maxY;

    x = (a * x0) + (c * y1) + tx;
    y = (b * x0) + (d * y1) + ty;
    minX = x < minX ? x : minX;
    minY = y < minY ? y : minY;
    maxX = x > maxX ? x : maxX;
    maxY = y > maxY ? y : maxY;

    x = (a * x1) + (c * y1) + tx;
    y = (b * x1) + (d * y1) + ty;
    minX = x < minX ? x : minX;
    minY = y < minY ? y : minY;
    maxX = x > maxX ? x : maxX;
    maxY = y > maxY ? y : maxY;

    this.minX = minX;
    this.minY = minY;
    this.maxX = maxX;
    this.maxY = maxY;
  };

  /**
   * Adds screen vertices from array
   *
   * @param {Float32Array} vertexData - calculated vertices
   * @param {number} beginOffset - begin offset
   * @param {number} endOffset - end offset, excluded
   */
  Bounds.prototype.addVertexData = function addVertexData (vertexData, beginOffset, endOffset)
  {
    var minX = this.minX;
    var minY = this.minY;
    var maxX = this.maxX;
    var maxY = this.maxY;

    for (var i = beginOffset; i < endOffset; i += 2)
    {
      var x = vertexData[i];
      var y = vertexData[i + 1];

      minX = x < minX ? x : minX;
      minY = y < minY ? y : minY;
      maxX = x > maxX ? x : maxX;
      maxY = y > maxY ? y : maxY;
    }

    this.minX = minX;
    this.minY = minY;
    this.maxX = maxX;
    this.maxY = maxY;
  };

  /**
   * Add an array of mesh vertices
   *
   * @param {PIXI.Transform} transform - mesh transform
   * @param {Float32Array} vertices - mesh coordinates in array
   * @param {number} beginOffset - begin offset
   * @param {number} endOffset - end offset, excluded
   */
  Bounds.prototype.addVertices = function addVertices (transform, vertices, beginOffset, endOffset)
  {
    var matrix = transform.worldTransform;
    var a = matrix.a;
    var b = matrix.b;
    var c = matrix.c;
    var d = matrix.d;
    var tx = matrix.tx;
    var ty = matrix.ty;

    var minX = this.minX;
    var minY = this.minY;
    var maxX = this.maxX;
    var maxY = this.maxY;

    for (var i = beginOffset; i < endOffset; i += 2)
    {
      var rawX = vertices[i];
      var rawY = vertices[i + 1];
      var x = (a * rawX) + (c * rawY) + tx;
      var y = (d * rawY) + (b * rawX) + ty;

      minX = x < minX ? x : minX;
      minY = y < minY ? y : minY;
      maxX = x > maxX ? x : maxX;
      maxY = y > maxY ? y : maxY;
    }

    this.minX = minX;
    this.minY = minY;
    this.maxX = maxX;
    this.maxY = maxY;
  };

  /**
   * Adds other Bounds
   *
   * @param {PIXI.Bounds} bounds - TODO
   */
  Bounds.prototype.addBounds = function addBounds (bounds)
  {
    var minX = this.minX;
    var minY = this.minY;
    var maxX = this.maxX;
    var maxY = this.maxY;

    this.minX = bounds.minX < minX ? bounds.minX : minX;
    this.minY = bounds.minY < minY ? bounds.minY : minY;
    this.maxX = bounds.maxX > maxX ? bounds.maxX : maxX;
    this.maxY = bounds.maxY > maxY ? bounds.maxY : maxY;
  };

  /**
   * Adds other Bounds, masked with Bounds
   *
   * @param {PIXI.Bounds} bounds - TODO
   * @param {PIXI.Bounds} mask - TODO
   */
  Bounds.prototype.addBoundsMask = function addBoundsMask (bounds, mask)
  {
    var _minX = bounds.minX > mask.minX ? bounds.minX : mask.minX;
    var _minY = bounds.minY > mask.minY ? bounds.minY : mask.minY;
    var _maxX = bounds.maxX < mask.maxX ? bounds.maxX : mask.maxX;
    var _maxY = bounds.maxY < mask.maxY ? bounds.maxY : mask.maxY;

    if (_minX <= _maxX && _minY <= _maxY)
    {
      var minX = this.minX;
      var minY = this.minY;
      var maxX = this.maxX;
      var maxY = this.maxY;

      this.minX = _minX < minX ? _minX : minX;
      this.minY = _minY < minY ? _minY : minY;
      this.maxX = _maxX > maxX ? _maxX : maxX;
      this.maxY = _maxY > maxY ? _maxY : maxY;
    }
  };

  /**
   * Adds other Bounds, masked with Rectangle
   *
   * @param {PIXI.Bounds} bounds - TODO
   * @param {PIXI.Rectangle} area - TODO
   */
  Bounds.prototype.addBoundsArea = function addBoundsArea (bounds, area)
  {
    var _minX = bounds.minX > area.x ? bounds.minX : area.x;
    var _minY = bounds.minY > area.y ? bounds.minY : area.y;
    var _maxX = bounds.maxX < area.x + area.width ? bounds.maxX : (area.x + area.width);
    var _maxY = bounds.maxY < area.y + area.height ? bounds.maxY : (area.y + area.height);

    if (_minX <= _maxX && _minY <= _maxY)
    {
      var minX = this.minX;
      var minY = this.minY;
      var maxX = this.maxX;
      var maxY = this.maxY;

      this.minX = _minX < minX ? _minX : minX;
      this.minY = _minY < minY ? _minY : minY;
      this.maxX = _maxX > maxX ? _maxX : maxX;
      this.maxY = _maxY > maxY ? _maxY : maxY;
    }
  };

  // _tempDisplayObjectParent = new DisplayObject();

  /**
   * The base class for all objects that are rendered on the screen.
   *
   * This is an abstract class and should not be used on its own; rather it should be extended.
   *
   * @class
   * @extends PIXI.utils.EventEmitter
   * @memberof PIXI
   */
  var DisplayObject = /*@__PURE__*/(function (EventEmitter) {
    function DisplayObject()
    {
      EventEmitter.call(this);

      this.tempDisplayObjectParent = null;

      // TODO: need to create Transform from factory
      /**
       * World transform and local transform of this object.
       * This will become read-only later, please do not assign anything there unless you know what are you doing.
       *
       * @member {PIXI.Transform}
       */
      this.transform = new Transform();

      /**
       * The opacity of the object.
       *
       * @member {number}
       */
      this.alpha = 1;

      /**
       * The visibility of the object. If false the object will not be drawn, and
       * the updateTransform function will not be called.
       *
       * Only affects recursive calls from parent. You can ask for bounds or call updateTransform manually.
       *
       * @member {boolean}
       */
      this.visible = true;

      /**
       * Can this object be rendered, if false the object will not be drawn but the updateTransform
       * methods will still be called.
       *
       * Only affects recursive calls from parent. You can ask for bounds manually.
       *
       * @member {boolean}
       */
      this.renderable = true;

      /**
       * The display object container that contains this display object.
       *
       * @member {PIXI.Container}
       * @readonly
       */
      this.parent = null;

      /**
       * The multiplied alpha of the displayObject.
       *
       * @member {number}
       * @readonly
       */
      this.worldAlpha = 1;

      /**
       * Which index in the children array the display component was before the previous zIndex sort.
       * Used by containers to help sort objects with the same zIndex, by using previous array index as the decider.
       *
       * @member {number}
       * @protected
       */
      this._lastSortedIndex = 0;

      /**
       * The zIndex of the displayObject.
       * A higher value will mean it will be rendered on top of other displayObjects within the same container.
       *
       * @member {number}
       * @protected
       */
      this._zIndex = 0;

      /**
       * The area the filter is applied to. This is used as more of an optimization
       * rather than figuring out the dimensions of the displayObject each frame you can set this rectangle.
       *
       * Also works as an interaction mask.
       *
       * @member {?PIXI.Rectangle}
       */
      this.filterArea = null;

      /**
       * Sets the filters for the displayObject.
       * * IMPORTANT: This is a WebGL only feature and will be ignored by the canvas renderer.
       * To remove filters simply set this property to `'null'`.
       *
       * @member {?PIXI.Filter[]}
       */
      this.filters = null;
      this._enabledFilters = null;

      /**
       * The bounds object, this is used to calculate and store the bounds of the displayObject.
       *
       * @member {PIXI.Bounds}
       * @protected
       */
      this._bounds = new Bounds();
      this._boundsID = 0;
      this._lastBoundsID = -1;
      this._boundsRect = null;
      this._localBoundsRect = null;

      /**
       * The original, cached mask of the object.
       *
       * @member {PIXI.Graphics|PIXI.Sprite|null}
       * @protected
       */
      this._mask = null;

      /**
       * Fired when this DisplayObject is added to a Container.
       *
       * @event PIXI.DisplayObject#added
       * @param {PIXI.Container} container - The container added to.
       */

      /**
       * Fired when this DisplayObject is removed from a Container.
       *
       * @event PIXI.DisplayObject#removed
       * @param {PIXI.Container} container - The container removed from.
       */

      /**
       * If the object has been destroyed via destroy(). If true, it should not be used.
       *
       * @member {boolean}
       * @protected
       */
      this._destroyed = false;

      /**
       * used to fast check if a sprite is.. a sprite!
       * @member {boolean}
       */
      this.isSprite = false;
    }

    if ( EventEmitter ) { DisplayObject.__proto__ = EventEmitter; }
    DisplayObject.prototype = Object.create( EventEmitter && EventEmitter.prototype );
    DisplayObject.prototype.constructor = DisplayObject;

    var prototypeAccessors = { _tempDisplayObjectParent: { configurable: true },x: { configurable: true },y: { configurable: true },worldTransform: { configurable: true },localTransform: { configurable: true },position: { configurable: true },scale: { configurable: true },pivot: { configurable: true },skew: { configurable: true },rotation: { configurable: true },angle: { configurable: true },zIndex: { configurable: true },worldVisible: { configurable: true },mask: { configurable: true } };

    /**
     * @protected
     * @member {PIXI.DisplayObject}
     */
    DisplayObject.mixin = function mixin (source)
    {
      // in ES8/ES2017, this would be really easy:
      // Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));

      // get all the enumerable property keys
      var keys = Object.keys(source);

      // loop through properties
      for (var i = 0; i < keys.length; ++i)
      {
        var propertyName = keys[i];

        // Set the property using the property descriptor - this works for accessors and normal value properties
        Object.defineProperty(
          DisplayObject.prototype,
          propertyName,
          Object.getOwnPropertyDescriptor(source, propertyName)
        );
      }
    };

    prototypeAccessors._tempDisplayObjectParent.get = function ()
    {
      if (this.tempDisplayObjectParent === null)
      {
        this.tempDisplayObjectParent = new DisplayObject();
      }

      return this.tempDisplayObjectParent;
    };

    /**
     * Updates the object transform for rendering.
     *
     * TODO - Optimization pass!
     */
    DisplayObject.prototype.updateTransform = function updateTransform ()
    {
      this.transform.updateTransform(this.parent.transform);
      // multiply the alphas..
      this.worldAlpha = this.alpha * this.parent.worldAlpha;

      this._bounds.updateID++;
    };

    /**
     * Recursively updates transform of all objects from the root to this one
     * internal function for toLocal()
     */
    DisplayObject.prototype._recursivePostUpdateTransform = function _recursivePostUpdateTransform ()
    {
      if (this.parent)
      {
        this.parent._recursivePostUpdateTransform();
        this.transform.updateTransform(this.parent.transform);
      }
      else
      {
        this.transform.updateTransform(this._tempDisplayObjectParent.transform);
      }
    };

    /**
     * Retrieves the bounds of the displayObject as a rectangle object.
     *
     * @param {boolean} [skipUpdate] - Setting to `true` will stop the transforms of the scene graph from
     *  being updated. This means the calculation returned MAY be out of date BUT will give you a
     *  nice performance boost.
     * @param {PIXI.Rectangle} [rect] - Optional rectangle to store the result of the bounds calculation.
     * @return {PIXI.Rectangle} The rectangular bounding area.
     */
    DisplayObject.prototype.getBounds = function getBounds (skipUpdate, rect)
    {
      if (!skipUpdate)
      {
        if (!this.parent)
        {
          this.parent = this._tempDisplayObjectParent;
          this.updateTransform();
          this.parent = null;
        }
        else
        {
          this._recursivePostUpdateTransform();
          this.updateTransform();
        }
      }

      if (this._boundsID !== this._lastBoundsID)
      {
        this.calculateBounds();
      }

      if (!rect)
      {
        if (!this._boundsRect)
        {
          this._boundsRect = new Rectangle();
        }

        rect = this._boundsRect;
      }

      return this._bounds.getRectangle(rect);
    };

    /**
     * Retrieves the local bounds of the displayObject as a rectangle object.
     *
     * @param {PIXI.Rectangle} [rect] - Optional rectangle to store the result of the bounds calculation.
     * @return {PIXI.Rectangle} The rectangular bounding area.
     */
    DisplayObject.prototype.getLocalBounds = function getLocalBounds (rect)
    {
      var transformRef = this.transform;
      var parentRef = this.parent;

      this.parent = null;
      this.transform = this._tempDisplayObjectParent.transform;

      if (!rect)
      {
        if (!this._localBoundsRect)
        {
          this._localBoundsRect = new Rectangle();
        }

        rect = this._localBoundsRect;
      }

      var bounds = this.getBounds(false, rect);

      this.parent = parentRef;
      this.transform = transformRef;

      return bounds;
    };

    /**
     * Calculates the global position of the display object.
     *
     * @param {PIXI.IPoint} position - The world origin to calculate from.
     * @param {PIXI.IPoint} [point] - A Point object in which to store the value, optional
     *  (otherwise will create a new Point).
     * @param {boolean} [skipUpdate=false] - Should we skip the update transform.
     * @return {PIXI.IPoint} A point object representing the position of this object.
     */
    DisplayObject.prototype.toGlobal = function toGlobal (position, point, skipUpdate)
    {
      if ( skipUpdate === void 0 ) { skipUpdate = false; }

      if (!skipUpdate)
      {
        this._recursivePostUpdateTransform();

        // this parent check is for just in case the item is a root object.
        // If it is we need to give it a temporary parent so that displayObjectUpdateTransform works correctly
        // this is mainly to avoid a parent check in the main loop. Every little helps for performance :)
        if (!this.parent)
        {
          this.parent = this._tempDisplayObjectParent;
          this.displayObjectUpdateTransform();
          this.parent = null;
        }
        else
        {
          this.displayObjectUpdateTransform();
        }
      }

      // don't need to update the lot
      return this.worldTransform.apply(position, point);
    };

    /**
     * Calculates the local position of the display object relative to another point.
     *
     * @param {PIXI.IPoint} position - The world origin to calculate from.
     * @param {PIXI.DisplayObject} [from] - The DisplayObject to calculate the global position from.
     * @param {PIXI.IPoint} [point] - A Point object in which to store the value, optional
     *  (otherwise will create a new Point).
     * @param {boolean} [skipUpdate=false] - Should we skip the update transform
     * @return {PIXI.IPoint} A point object representing the position of this object
     */
    DisplayObject.prototype.toLocal = function toLocal (position, from, point, skipUpdate)
    {
      if (from)
      {
        position = from.toGlobal(position, point, skipUpdate);
      }

      if (!skipUpdate)
      {
        this._recursivePostUpdateTransform();

        // this parent check is for just in case the item is a root object.
        // If it is we need to give it a temporary parent so that displayObjectUpdateTransform works correctly
        // this is mainly to avoid a parent check in the main loop. Every little helps for performance :)
        if (!this.parent)
        {
          this.parent = this._tempDisplayObjectParent;
          this.displayObjectUpdateTransform();
          this.parent = null;
        }
        else
        {
          this.displayObjectUpdateTransform();
        }
      }

      // simply apply the matrix..
      return this.worldTransform.applyInverse(position, point);
    };

    /**
     * Renders the object using the WebGL renderer.
     *
     * @param {PIXI.Renderer} renderer - The renderer.
     */
    DisplayObject.prototype.render = function render (renderer) // eslint-disable-line no-unused-vars
    {
      // OVERWRITE;
    };

    /**
     * Set the parent Container of this DisplayObject.
     *
     * @param {PIXI.Container} container - The Container to add this DisplayObject to.
     * @return {PIXI.Container} The Container that this DisplayObject was added to.
     */
    DisplayObject.prototype.setParent = function setParent (container)
    {
      if (!container || !container.addChild)
      {
        throw new Error('setParent: Argument must be a Container');
      }

      container.addChild(this);

      return container;
    };

    /**
     * Convenience function to set the position, scale, skew and pivot at once.
     *
     * @param {number} [x=0] - The X position
     * @param {number} [y=0] - The Y position
     * @param {number} [scaleX=1] - The X scale value
     * @param {number} [scaleY=1] - The Y scale value
     * @param {number} [rotation=0] - The rotation
     * @param {number} [skewX=0] - The X skew value
     * @param {number} [skewY=0] - The Y skew value
     * @param {number} [pivotX=0] - The X pivot value
     * @param {number} [pivotY=0] - The Y pivot value
     * @return {PIXI.DisplayObject} The DisplayObject instance
     */
    DisplayObject.prototype.setTransform = function setTransform (x, y, scaleX, scaleY, rotation, skewX, skewY, pivotX, pivotY)
    {
      if ( x === void 0 ) { x = 0; }
      if ( y === void 0 ) { y = 0; }
      if ( scaleX === void 0 ) { scaleX = 1; }
      if ( scaleY === void 0 ) { scaleY = 1; }
      if ( rotation === void 0 ) { rotation = 0; }
      if ( skewX === void 0 ) { skewX = 0; }
      if ( skewY === void 0 ) { skewY = 0; }
      if ( pivotX === void 0 ) { pivotX = 0; }
      if ( pivotY === void 0 ) { pivotY = 0; }

      this.position.x = x;
      this.position.y = y;
      this.scale.x = !scaleX ? 1 : scaleX;
      this.scale.y = !scaleY ? 1 : scaleY;
      this.rotation = rotation;
      this.skew.x = skewX;
      this.skew.y = skewY;
      this.pivot.x = pivotX;
      this.pivot.y = pivotY;

      return this;
    };

    /**
     * Base destroy method for generic display objects. This will automatically
     * remove the display object from its parent Container as well as remove
     * all current event listeners and internal references. Do not use a DisplayObject
     * after calling `destroy()`.
     *
     */
    DisplayObject.prototype.destroy = function destroy ()
    {
      this.removeAllListeners();
      if (this.parent)
      {
        this.parent.removeChild(this);
      }
      this.transform = null;

      this.parent = null;

      this._bounds = null;
      this._currentBounds = null;
      this._mask = null;

      this.filterArea = null;

      this.interactive = false;
      this.interactiveChildren = false;

      this._destroyed = true;
    };

    /**
     * The position of the displayObject on the x axis relative to the local coordinates of the parent.
     * An alias to position.x
     *
     * @member {number}
     */
    prototypeAccessors.x.get = function ()
    {
      return this.position.x;
    };

    prototypeAccessors.x.set = function (value) // eslint-disable-line require-jsdoc
    {
      this.transform.position.x = value;
    };

    /**
     * The position of the displayObject on the y axis relative to the local coordinates of the parent.
     * An alias to position.y
     *
     * @member {number}
     */
    prototypeAccessors.y.get = function ()
    {
      return this.position.y;
    };

    prototypeAccessors.y.set = function (value) // eslint-disable-line require-jsdoc
    {
      this.transform.position.y = value;
    };

    /**
     * Current transform of the object based on world (parent) factors.
     *
     * @member {PIXI.Matrix}
     * @readonly
     */
    prototypeAccessors.worldTransform.get = function ()
    {
      return this.transform.worldTransform;
    };

    /**
     * Current transform of the object based on local factors: position, scale, other stuff.
     *
     * @member {PIXI.Matrix}
     * @readonly
     */
    prototypeAccessors.localTransform.get = function ()
    {
      return this.transform.localTransform;
    };

    /**
     * The coordinate of the object relative to the local coordinates of the parent.
     * Assignment by value since pixi-v4.
     *
     * @member {PIXI.IPoint}
     */
    prototypeAccessors.position.get = function ()
    {
      return this.transform.position;
    };

    prototypeAccessors.position.set = function (value) // eslint-disable-line require-jsdoc
    {
      this.transform.position.copyFrom(value);
    };

    /**
     * The scale factor of the object.
     * Assignment by value since pixi-v4.
     *
     * @member {PIXI.IPoint}
     */
    prototypeAccessors.scale.get = function ()
    {
      return this.transform.scale;
    };

    prototypeAccessors.scale.set = function (value) // eslint-disable-line require-jsdoc
    {
      this.transform.scale.copyFrom(value);
    };

    /**
     * The pivot point of the displayObject that it rotates around.
     * Assignment by value since pixi-v4.
     *
     * @member {PIXI.IPoint}
     */
    prototypeAccessors.pivot.get = function ()
    {
      return this.transform.pivot;
    };

    prototypeAccessors.pivot.set = function (value) // eslint-disable-line require-jsdoc
    {
      this.transform.pivot.copyFrom(value);
    };

    /**
     * The skew factor for the object in radians.
     * Assignment by value since pixi-v4.
     *
     * @member {PIXI.ObservablePoint}
     */
    prototypeAccessors.skew.get = function ()
    {
      return this.transform.skew;
    };

    prototypeAccessors.skew.set = function (value) // eslint-disable-line require-jsdoc
    {
      this.transform.skew.copyFrom(value);
    };

    /**
     * The rotation of the object in radians.
     * 'rotation' and 'angle' have the same effect on a display object; rotation is in radians, angle is in degrees.
     *
     * @member {number}
     */
    prototypeAccessors.rotation.get = function ()
    {
      return this.transform.rotation;
    };

    prototypeAccessors.rotation.set = function (value) // eslint-disable-line require-jsdoc
    {
      this.transform.rotation = value;
    };

    /**
     * The angle of the object in degrees.
     * 'rotation' and 'angle' have the same effect on a display object; rotation is in radians, angle is in degrees.
     *
     * @member {number}
     */
    prototypeAccessors.angle.get = function ()
    {
      return this.transform.rotation * RAD_TO_DEG;
    };

    prototypeAccessors.angle.set = function (value) // eslint-disable-line require-jsdoc
    {
      this.transform.rotation = value * DEG_TO_RAD;
    };

    /**
     * The zIndex of the displayObject.
     * If a container has the sortableChildren property set to true, children will be automatically
     * sorted by zIndex value; a higher value will mean it will be moved towards the end of the array,
     * and thus rendered on top of other displayObjects within the same container.
     *
     * @member {number}
     */
    prototypeAccessors.zIndex.get = function ()
    {
      return this._zIndex;
    };

    prototypeAccessors.zIndex.set = function (value) // eslint-disable-line require-jsdoc
    {
      this._zIndex = value;
      if (this.parent)
      {
        this.parent.sortDirty = true;
      }
    };

    /**
     * Indicates if the object is globally visible.
     *
     * @member {boolean}
     * @readonly
     */
    prototypeAccessors.worldVisible.get = function ()
    {
      var item = this;

      do
      {
        if (!item.visible)
        {
          return false;
        }

        item = item.parent;
      } while (item);

      return true;
    };

    /**
     * Sets a mask for the displayObject. A mask is an object that limits the visibility of an
     * object to the shape of the mask applied to it. In PixiJS a regular mask must be a
     * {@link PIXI.Graphics} or a {@link PIXI.Sprite} object. This allows for much faster masking in canvas as it
     * utilities shape clipping. To remove a mask, set this property to `null`.
     *
     * For sprite mask both alpha and red channel are used. Black mask is the same as transparent mask.
     * @example
     * const graphics = new PIXI.Graphics();
     * graphics.beginFill(0xFF3300);
     * graphics.drawRect(50, 250, 100, 100);
     * graphics.endFill();
     *
     * const sprite = new PIXI.Sprite(texture);
     * sprite.mask = graphics;
     * @todo At the moment, PIXI.CanvasRenderer doesn't support PIXI.Sprite as mask.
     *
     * @member {PIXI.Graphics|PIXI.Sprite|null}
     */
    prototypeAccessors.mask.get = function ()
    {
      return this._mask;
    };

    prototypeAccessors.mask.set = function (value) // eslint-disable-line require-jsdoc
    {
      if (this._mask)
      {
        this._mask.renderable = true;
        this._mask.isMask = false;
      }

      this._mask = value;

      if (this._mask)
      {
        this._mask.renderable = false;
        this._mask.isMask = true;
      }
    };

    Object.defineProperties( DisplayObject.prototype, prototypeAccessors );

    return DisplayObject;
  }(eventemitter3));

  /**
   * DisplayObject default updateTransform, does not update children of container.
   * Will crash if there's no parent element.
   *
   * @memberof PIXI.DisplayObject#
   * @function displayObjectUpdateTransform
   */
  DisplayObject.prototype.displayObjectUpdateTransform = DisplayObject.prototype.updateTransform;

  function sortChildren(a, b)
  {
    if (a.zIndex === b.zIndex)
    {
      return a._lastSortedIndex - b._lastSortedIndex;
    }

    return a.zIndex - b.zIndex;
  }

  /**
   * A Container represents a collection of display objects.
   *
   * It is the base class of all display objects that act as a container for other objects (like Sprites).
   *
   *```js
   * let container = new PIXI.Container();
   * container.addChild(sprite);
   * ```
   *
   * @class
   * @extends PIXI.DisplayObject
   * @memberof PIXI
   */
  var Container = /*@__PURE__*/(function (DisplayObject) {
    function Container()
    {
      DisplayObject.call(this);

      /**
       * The array of children of this container.
       *
       * @member {PIXI.DisplayObject[]}
       * @readonly
       */
      this.children = [];

      /**
       * If set to true, the container will sort its children by zIndex value
       * when updateTransform() is called, or manually if sortChildren() is called.
       *
       * This actually changes the order of elements in the array, so should be treated
       * as a basic solution that is not performant compared to other solutions,
       * such as @link https://github.com/pixijs/pixi-display
       *
       * Also be aware of that this may not work nicely with the addChildAt() function,
       * as the zIndex sorting may cause the child to automatically sorted to another position.
       *
       * @see PIXI.settings.SORTABLE_CHILDREN
       *
       * @member {boolean}
       */
      this.sortableChildren = settings.SORTABLE_CHILDREN;

      /**
       * Should children be sorted by zIndex at the next updateTransform call.
       * Will get automatically set to true if a new child is added, or if a child's zIndex changes.
       *
       * @member {boolean}
       */
      this.sortDirty = false;

      /**
       * Fired when a DisplayObject is added to this Container.
       *
       * @event PIXI.Container#childAdded
       * @param {PIXI.DisplayObject} child - The child added to the Container.
       * @param {PIXI.Container} container - The container that added the child.
       * @param {number} index - The children's index of the added child.
       */

      /**
       * Fired when a DisplayObject is removed from this Container.
       *
       * @event PIXI.DisplayObject#removedFrom
       * @param {PIXI.DisplayObject} child - The child removed from the Container.
       * @param {PIXI.Container} container - The container that removed removed the child.
       * @param {number} index - The former children's index of the removed child
       */
    }

    if ( DisplayObject ) { Container.__proto__ = DisplayObject; }
    Container.prototype = Object.create( DisplayObject && DisplayObject.prototype );
    Container.prototype.constructor = Container;

    var prototypeAccessors = { width: { configurable: true },height: { configurable: true } };

    /**
     * Overridable method that can be used by Container subclasses whenever the children array is modified
     *
     * @protected
     */
    Container.prototype.onChildrenChange = function onChildrenChange ()
    {
      /* empty */
    };

    /**
     * Adds one or more children to the container.
     *
     * Multiple items can be added like so: `myContainer.addChild(thingOne, thingTwo, thingThree)`
     *
     * @param {...PIXI.DisplayObject} child - The DisplayObject(s) to add to the container
     * @return {PIXI.DisplayObject} The first child that was added.
     */
    Container.prototype.addChild = function addChild (child)
    {
      var arguments$1 = arguments;

      var argumentsLength = arguments.length;

      // if there is only one argument we can bypass looping through the them
      if (argumentsLength > 1)
      {
        // loop through the arguments property and add all children
        // use it the right way (.length and [i]) so that this function can still be optimized by JS runtimes
        for (var i = 0; i < argumentsLength; i++)
        {
          this.addChild(arguments$1[i]);
        }
      }
      else
      {
        // if the child has a parent then lets remove it as PixiJS objects can only exist in one place
        if (child.parent)
        {
          child.parent.removeChild(child);
        }

        child.parent = this;
        this.sortDirty = true;

        // ensure child transform will be recalculated
        child.transform._parentID = -1;

        this.children.push(child);

        // ensure bounds will be recalculated
        this._boundsID++;

        // TODO - lets either do all callbacks or all events.. not both!
        this.onChildrenChange(this.children.length - 1);
        this.emit('childAdded', child, this, this.children.length - 1);
        child.emit('added', this);
      }

      return child;
    };

    /**
     * Adds a child to the container at a specified index. If the index is out of bounds an error will be thrown
     *
     * @param {PIXI.DisplayObject} child - The child to add
     * @param {number} index - The index to place the child in
     * @return {PIXI.DisplayObject} The child that was added.
     */
    Container.prototype.addChildAt = function addChildAt (child, index)
    {
      if (index < 0 || index > this.children.length)
      {
        throw new Error((child + "addChildAt: The index " + index + " supplied is out of bounds " + (this.children.length)));
      }

      if (child.parent)
      {
        child.parent.removeChild(child);
      }

      child.parent = this;
      this.sortDirty = true;

      // ensure child transform will be recalculated
      child.transform._parentID = -1;

      this.children.splice(index, 0, child);

      // ensure bounds will be recalculated
      this._boundsID++;

      // TODO - lets either do all callbacks or all events.. not both!
      this.onChildrenChange(index);
      child.emit('added', this);
      this.emit('childAdded', child, this, index);

      return child;
    };

    /**
     * Swaps the position of 2 Display Objects within this container.
     *
     * @param {PIXI.DisplayObject} child - First display object to swap
     * @param {PIXI.DisplayObject} child2 - Second display object to swap
     */
    Container.prototype.swapChildren = function swapChildren (child, child2)
    {
      if (child === child2)
      {
        return;
      }

      var index1 = this.getChildIndex(child);
      var index2 = this.getChildIndex(child2);

      this.children[index1] = child2;
      this.children[index2] = child;
      this.onChildrenChange(index1 < index2 ? index1 : index2);
    };

    /**
     * Returns the index position of a child DisplayObject instance
     *
     * @param {PIXI.DisplayObject} child - The DisplayObject instance to identify
     * @return {number} The index position of the child display object to identify
     */
    Container.prototype.getChildIndex = function getChildIndex (child)
    {
      var index = this.children.indexOf(child);

      if (index === -1)
      {
        throw new Error('The supplied DisplayObject must be a child of the caller');
      }

      return index;
    };

    /**
     * Changes the position of an existing child in the display object container
     *
     * @param {PIXI.DisplayObject} child - The child DisplayObject instance for which you want to change the index number
     * @param {number} index - The resulting index number for the child display object
     */
    Container.prototype.setChildIndex = function setChildIndex (child, index)
    {
      if (index < 0 || index >= this.children.length)
      {
        throw new Error(("The index " + index + " supplied is out of bounds " + (this.children.length)));
      }

      var currentIndex = this.getChildIndex(child);

      removeItems(this.children, currentIndex, 1); // remove from old position
      this.children.splice(index, 0, child); // add at new position

      this.onChildrenChange(index);
    };

    /**
     * Returns the child at the specified index
     *
     * @param {number} index - The index to get the child at
     * @return {PIXI.DisplayObject} The child at the given index, if any.
     */
    Container.prototype.getChildAt = function getChildAt (index)
    {
      if (index < 0 || index >= this.children.length)
      {
        throw new Error(("getChildAt: Index (" + index + ") does not exist."));
      }

      return this.children[index];
    };

    /**
     * Removes one or more children from the container.
     *
     * @param {...PIXI.DisplayObject} child - The DisplayObject(s) to remove
     * @return {PIXI.DisplayObject} The first child that was removed.
     */
    Container.prototype.removeChild = function removeChild (child)
    {
      var arguments$1 = arguments;

      var argumentsLength = arguments.length;

      // if there is only one argument we can bypass looping through the them
      if (argumentsLength > 1)
      {
        // loop through the arguments property and add all children
        // use it the right way (.length and [i]) so that this function can still be optimized by JS runtimes
        for (var i = 0; i < argumentsLength; i++)
        {
          this.removeChild(arguments$1[i]);
        }
      }
      else
      {
        var index = this.children.indexOf(child);

        if (index === -1) { return null; }

        child.parent = null;
        // ensure child transform will be recalculated
        child.transform._parentID = -1;
        removeItems(this.children, index, 1);

        // ensure bounds will be recalculated
        this._boundsID++;

        // TODO - lets either do all callbacks or all events.. not both!
        this.onChildrenChange(index);
        child.emit('removed', this);
        this.emit('childRemoved', child, this, index);
      }

      return child;
    };

    /**
     * Removes a child from the specified index position.
     *
     * @param {number} index - The index to get the child from
     * @return {PIXI.DisplayObject} The child that was removed.
     */
    Container.prototype.removeChildAt = function removeChildAt (index)
    {
      var child = this.getChildAt(index);

      // ensure child transform will be recalculated..
      child.parent = null;
      child.transform._parentID = -1;
      removeItems(this.children, index, 1);

      // ensure bounds will be recalculated
      this._boundsID++;

      // TODO - lets either do all callbacks or all events.. not both!
      this.onChildrenChange(index);
      child.emit('removed', this);
      this.emit('childRemoved', child, this, index);

      return child;
    };

    /**
     * Removes all children from this container that are within the begin and end indexes.
     *
     * @param {number} [beginIndex=0] - The beginning position.
     * @param {number} [endIndex=this.children.length] - The ending position. Default value is size of the container.
     * @returns {PIXI.DisplayObject[]} List of removed children
     */
    Container.prototype.removeChildren = function removeChildren (beginIndex, endIndex)
    {
      if ( beginIndex === void 0 ) { beginIndex = 0; }

      var begin = beginIndex;
      var end = typeof endIndex === 'number' ? endIndex : this.children.length;
      var range = end - begin;
      var removed;

      if (range > 0 && range <= end)
      {
        removed = this.children.splice(begin, range);

        for (var i = 0; i < removed.length; ++i)
        {
          removed[i].parent = null;
          if (removed[i].transform)
          {
            removed[i].transform._parentID = -1;
          }
        }

        this._boundsID++;

        this.onChildrenChange(beginIndex);

        for (var i$1 = 0; i$1 < removed.length; ++i$1)
        {
          removed[i$1].emit('removed', this);
          this.emit('childRemoved', removed[i$1], this, i$1);
        }

        return removed;
      }
      else if (range === 0 && this.children.length === 0)
      {
        return [];
      }

      throw new RangeError('removeChildren: numeric values are outside the acceptable range.');
    };

    /**
     * Sorts children by zIndex. Previous order is mantained for 2 children with the same zIndex.
     */
    Container.prototype.sortChildren = function sortChildren$1 ()
    {
      var sortRequired = false;

      for (var i = 0, j = this.children.length; i < j; ++i)
      {
        var child = this.children[i];

        child._lastSortedIndex = i;

        if (!sortRequired && child.zIndex !== 0)
        {
          sortRequired = true;
        }
      }

      if (sortRequired && this.children.length > 1)
      {
        this.children.sort(sortChildren);
      }

      this.sortDirty = false;
    };

    /**
     * Updates the transform on all children of this container for rendering
     */
    Container.prototype.updateTransform = function updateTransform ()
    {
      if (this.sortableChildren && this.sortDirty)
      {
        this.sortChildren();
      }

      this._boundsID++;

      this.transform.updateTransform(this.parent.transform);

      // TODO: check render flags, how to process stuff here
      this.worldAlpha = this.alpha * this.parent.worldAlpha;

      for (var i = 0, j = this.children.length; i < j; ++i)
      {
        var child = this.children[i];

        if (child.visible)
        {
          child.updateTransform();
        }
      }
    };

    /**
     * Recalculates the bounds of the container.
     *
     */
    Container.prototype.calculateBounds = function calculateBounds ()
    {
      this._bounds.clear();

      this._calculateBounds();

      for (var i = 0; i < this.children.length; i++)
      {
        var child = this.children[i];

        if (!child.visible || !child.renderable)
        {
          continue;
        }

        child.calculateBounds();

        // TODO: filter+mask, need to mask both somehow
        if (child._mask)
        {
          child._mask.calculateBounds();
          this._bounds.addBoundsMask(child._bounds, child._mask._bounds);
        }
        else if (child.filterArea)
        {
          this._bounds.addBoundsArea(child._bounds, child.filterArea);
        }
        else
        {
          this._bounds.addBounds(child._bounds);
        }
      }

      this._lastBoundsID = this._boundsID;
    };

    /**
     * Recalculates the bounds of the object. Override this to
     * calculate the bounds of the specific object (not including children).
     *
     * @protected
     */
    Container.prototype._calculateBounds = function _calculateBounds ()
    {
      // FILL IN//
    };

    /**
     * Renders the object using the WebGL renderer
     *
     * @param {PIXI.Renderer} renderer - The renderer
     */
    Container.prototype.render = function render (renderer)
    {
      // if the object is not visible or the alpha is 0 then no need to render this element
      if (!this.visible || this.worldAlpha <= 0 || !this.renderable)
      {
        return;
      }

      // do a quick check to see if this element has a mask or a filter.
      if (this._mask || this.filters)
      {
        this.renderAdvanced(renderer);
      }
      else
      {
        this._render(renderer);

        // simple render children!
        for (var i = 0, j = this.children.length; i < j; ++i)
        {
          this.children[i].render(renderer);
        }
      }
    };

    /**
     * Render the object using the WebGL renderer and advanced features.
     *
     * @protected
     * @param {PIXI.Renderer} renderer - The renderer
     */
    Container.prototype.renderAdvanced = function renderAdvanced (renderer)
    {
      renderer.batch.flush();

      var filters = this.filters;
      var mask = this._mask;

      // push filter first as we need to ensure the stencil buffer is correct for any masking
      if (filters)
      {
        if (!this._enabledFilters)
        {
          this._enabledFilters = [];
        }

        this._enabledFilters.length = 0;

        for (var i = 0; i < filters.length; i++)
        {
          if (filters[i].enabled)
          {
            this._enabledFilters.push(filters[i]);
          }
        }

        if (this._enabledFilters.length)
        {
          renderer.filter.push(this, this._enabledFilters);
        }
      }

      if (mask)
      {
        renderer.mask.push(this, this._mask);
      }

      // add this object to the batch, only rendered if it has a texture.
      this._render(renderer);

      // now loop through the children and make sure they get rendered
      for (var i$1 = 0, j = this.children.length; i$1 < j; i$1++)
      {
        this.children[i$1].render(renderer);
      }

      renderer.batch.flush();

      if (mask)
      {
        renderer.mask.pop(this, this._mask);
      }

      if (filters && this._enabledFilters && this._enabledFilters.length)
      {
        renderer.filter.pop();
      }
    };

    /**
     * To be overridden by the subclasses.
     *
     * @protected
     * @param {PIXI.Renderer} renderer - The renderer
     */
    Container.prototype._render = function _render (renderer) // eslint-disable-line no-unused-vars
    {
      // this is where content itself gets rendered...
    };

    /**
     * Removes all internal references and listeners as well as removes children from the display list.
     * Do not use a Container after calling `destroy`.
     *
     * @param {object|boolean} [options] - Options parameter. A boolean will act as if all options
     *  have been set to that value
     * @param {boolean} [options.children=false] - if set to true, all the children will have their destroy
     *  method called as well. 'options' will be passed on to those calls.
     * @param {boolean} [options.texture=false] - Only used for child Sprites if options.children is set to true
     *  Should it destroy the texture of the child sprite
     * @param {boolean} [options.baseTexture=false] - Only used for child Sprites if options.children is set to true
     *  Should it destroy the base texture of the child sprite
     */
    Container.prototype.destroy = function destroy (options)
    {
      DisplayObject.prototype.destroy.call(this);

      this.sortDirty = false;

      var destroyChildren = typeof options === 'boolean' ? options : options && options.children;

      var oldChildren = this.removeChildren(0, this.children.length);

      if (destroyChildren)
      {
        for (var i = 0; i < oldChildren.length; ++i)
        {
          oldChildren[i].destroy(options);
        }
      }
    };

    /**
     * The width of the Container, setting this will actually modify the scale to achieve the value set
     *
     * @member {number}
     */
    prototypeAccessors.width.get = function ()
    {
      return this.scale.x * this.getLocalBounds().width;
    };

    prototypeAccessors.width.set = function (value) // eslint-disable-line require-jsdoc
    {
      var width = this.getLocalBounds().width;

      if (width !== 0)
      {
        this.scale.x = value / width;
      }
      else
      {
        this.scale.x = 1;
      }

      this._width = value;
    };

    /**
     * The height of the Container, setting this will actually modify the scale to achieve the value set
     *
     * @member {number}
     */
    prototypeAccessors.height.get = function ()
    {
      return this.scale.y * this.getLocalBounds().height;
    };

    prototypeAccessors.height.set = function (value) // eslint-disable-line require-jsdoc
    {
      var height = this.getLocalBounds().height;

      if (height !== 0)
      {
        this.scale.y = value / height;
      }
      else
      {
        this.scale.y = 1;
      }

      this._height = value;
    };

    Object.defineProperties( Container.prototype, prototypeAccessors );

    return Container;
  }(DisplayObject));

  // performance increase to avoid using call.. (10x faster)
  Container.prototype.containerUpdateTransform = Container.prototype.updateTransform;

  /*!
	 * @pixi/accessibility - v5.1.0
	 * Compiled Fri, 19 Jul 2019 21:58:39 UTC
	 *
	 * @pixi/accessibility is licensed under the MIT License.
	 * http://www.opensource.org/licenses/mit-license
	 */

  /**
   * Default property values of accessible objects
   * used by {@link PIXI.accessibility.AccessibilityManager}.
   *
   * @private
   * @function accessibleTarget
   * @memberof PIXI.accessibility
   * @type {Object}
   * @example
   *      function MyObject() {}
   *
   *      Object.assign(
   *          MyObject.prototype,
   *          PIXI.accessibility.accessibleTarget
   *      );
   */
  var accessibleTarget = {
    /**
     *  Flag for if the object is accessible. If true AccessibilityManager will overlay a
     *   shadow div with attributes set
     *
     * @member {boolean}
     * @memberof PIXI.DisplayObject#
     */
    accessible: false,

    /**
     * Sets the title attribute of the shadow div
     * If accessibleTitle AND accessibleHint has not been this will default to 'displayObject [tabIndex]'
     *
     * @member {?string}
     * @memberof PIXI.DisplayObject#
     */
    accessibleTitle: null,

    /**
     * Sets the aria-label attribute of the shadow div
     *
     * @member {string}
     * @memberof PIXI.DisplayObject#
     */
    accessibleHint: null,

    /**
     * @member {number}
     * @memberof PIXI.DisplayObject#
     * @private
     * @todo Needs docs.
     */
    tabIndex: 0,

    /**
     * @member {boolean}
     * @memberof PIXI.DisplayObject#
     * @todo Needs docs.
     */
    _accessibleActive: false,

    /**
     * @member {boolean}
     * @memberof PIXI.DisplayObject#
     * @todo Needs docs.
     */
    _accessibleDiv: false,
  };

  // add some extra variables to the container..
  DisplayObject.mixin(accessibleTarget);

  var KEY_CODE_TAB = 9;

  var DIV_TOUCH_SIZE = 100;
  var DIV_TOUCH_POS_X = 0;
  var DIV_TOUCH_POS_Y = 0;
  var DIV_TOUCH_ZINDEX = 2;

  var DIV_HOOK_SIZE = 1;
  var DIV_HOOK_POS_X = -1000;
  var DIV_HOOK_POS_Y = -1000;
  var DIV_HOOK_ZINDEX = 2;

  /**
   * The Accessibility manager recreates the ability to tab and have content read by screen readers.
   * This is very important as it can possibly help people with disabilities access PixiJS content.
   *
   * A DisplayObject can be made accessible just like it can be made interactive. This manager will map the
   * events as if the mouse was being used, minimizing the effort required to implement.
   *
   * An instance of this class is automatically created by default, and can be found at `renderer.plugins.accessibility`
   *
   * @class
   * @memberof PIXI.accessibility
   */
  var AccessibilityManager = function AccessibilityManager(renderer)
  {
    /**
     * @type {?HTMLElement}
     * @private
     */
    this._hookDiv = null;
    if (isMobile_min.tablet || isMobile_min.phone)
    {
      this.createTouchHook();
    }

    // first we create a div that will sit over the PixiJS element. This is where the div overlays will go.
    var div = document.createElement('div');

    div.style.width = DIV_TOUCH_SIZE + "px";
    div.style.height = DIV_TOUCH_SIZE + "px";
    div.style.position = 'absolute';
    div.style.top = DIV_TOUCH_POS_X + "px";
    div.style.left = DIV_TOUCH_POS_Y + "px";
    div.style.zIndex = DIV_TOUCH_ZINDEX;

    /**
     * This is the dom element that will sit over the PixiJS element. This is where the div overlays will go.
     *
     * @type {HTMLElement}
     * @private
     */
    this.div = div;

    /**
     * A simple pool for storing divs.
     *
     * @type {*}
     * @private
     */
    this.pool = [];

    /**
     * This is a tick used to check if an object is no longer being rendered.
     *
     * @type {Number}
     * @private
     */
    this.renderId = 0;

    /**
     * Setting this to true will visually show the divs.
     *
     * @type {boolean}
     */
    this.debug = false;

    /**
     * The renderer this accessibility manager works for.
     *
     * @member {PIXI.AbstractRenderer}
     */
    this.renderer = renderer;

    /**
     * The array of currently active accessible items.
     *
     * @member {Array<*>}
     * @private
     */
    this.children = [];

    /**
     * pre-bind the functions
     *
     * @type {Function}
     * @private
     */
    this._onKeyDown = this._onKeyDown.bind(this);

    /**
     * pre-bind the functions
     *
     * @type {Function}
     * @private
     */
    this._onMouseMove = this._onMouseMove.bind(this);

    /**
     * A flag
     * @type {boolean}
     * @readonly
     */
    this.isActive = false;

    /**
     * A flag
     * @type {boolean}
     * @readonly
     */
    this.isMobileAccessibility = false;

    // let listen for tab.. once pressed we can fire up and show the accessibility layer
    window.addEventListener('keydown', this._onKeyDown, false);
  };

  /**
   * Creates the touch hooks.
   *
   * @private
   */
  AccessibilityManager.prototype.createTouchHook = function createTouchHook ()
  {
    var this$1 = this;

    var hookDiv = document.createElement('button');

    hookDiv.style.width = DIV_HOOK_SIZE + "px";
    hookDiv.style.height = DIV_HOOK_SIZE + "px";
    hookDiv.style.position = 'absolute';
    hookDiv.style.top = DIV_HOOK_POS_X + "px";
    hookDiv.style.left = DIV_HOOK_POS_Y + "px";
    hookDiv.style.zIndex = DIV_HOOK_ZINDEX;
    hookDiv.style.backgroundColor = '#FF0000';
    hookDiv.title = 'HOOK DIV';

    hookDiv.addEventListener('focus', function () {
      this$1.isMobileAccessibility = true;
      this$1.activate();
      this$1.destroyTouchHook();
    });

    document.body.appendChild(hookDiv);
    this._hookDiv = hookDiv;
  };

  /**
   * Destroys the touch hooks.
   *
   * @private
   */
  AccessibilityManager.prototype.destroyTouchHook = function destroyTouchHook ()
  {
    if (!this._hookDiv)
    {
      return;
    }
    document.body.removeChild(this._hookDiv);
    this._hookDiv = null;
  };

  /**
   * Activating will cause the Accessibility layer to be shown.
   * This is called when a user presses the tab key.
   *
   * @private
   */
  AccessibilityManager.prototype.activate = function activate ()
  {
    if (this.isActive)
    {
      return;
    }

    this.isActive = true;

    window.document.addEventListener('mousemove', this._onMouseMove, true);
    window.removeEventListener('keydown', this._onKeyDown, false);

    this.renderer.on('postrender', this.update, this);

    if (this.renderer.view.parentNode)
    {
      this.renderer.view.parentNode.appendChild(this.div);
    }
  };

  /**
   * Deactivating will cause the Accessibility layer to be hidden.
   * This is called when a user moves the mouse.
   *
   * @private
   */
  AccessibilityManager.prototype.deactivate = function deactivate ()
  {
    if (!this.isActive || this.isMobileAccessibility)
    {
      return;
    }

    this.isActive = false;

    window.document.removeEventListener('mousemove', this._onMouseMove, true);
    window.addEventListener('keydown', this._onKeyDown, false);

    this.renderer.off('postrender', this.update);

    if (this.div.parentNode)
    {
      this.div.parentNode.removeChild(this.div);
    }
  };

  /**
   * This recursive function will run through the scene graph and add any new accessible objects to the DOM layer.
   *
   * @private
   * @param {PIXI.Container} displayObject - The DisplayObject to check.
   */
  AccessibilityManager.prototype.updateAccessibleObjects = function updateAccessibleObjects (displayObject)
  {
    if (!displayObject.visible)
    {
      return;
    }

    if (displayObject.accessible && displayObject.interactive)
    {
      if (!displayObject._accessibleActive)
      {
        this.addChild(displayObject);
      }

      displayObject.renderId = this.renderId;
    }

    var children = displayObject.children;

    for (var i = 0; i < children.length; i++)
    {
      this.updateAccessibleObjects(children[i]);
    }
  };

  /**
   * Before each render this function will ensure that all divs are mapped correctly to their DisplayObjects.
   *
   * @private
   */
  AccessibilityManager.prototype.update = function update ()
  {
    if (!this.renderer.renderingToScreen)
    {
      return;
    }

    // update children...
    this.updateAccessibleObjects(this.renderer._lastObjectRendered);

    var rect = this.renderer.view.getBoundingClientRect();
    var sx = rect.width / this.renderer.width;
    var sy = rect.height / this.renderer.height;

    var div = this.div;

    div.style.left = (rect.left) + "px";
    div.style.top = (rect.top) + "px";
    div.style.width = (this.renderer.width) + "px";
    div.style.height = (this.renderer.height) + "px";

    for (var i = 0; i < this.children.length; i++)
    {
      var child = this.children[i];

      if (child.renderId !== this.renderId)
      {
        child._accessibleActive = false;

        removeItems(this.children, i, 1);
        this.div.removeChild(child._accessibleDiv);
        this.pool.push(child._accessibleDiv);
        child._accessibleDiv = null;

        i--;

        if (this.children.length === 0)
        {
          this.deactivate();
        }
      }
      else
      {
        // map div to display..
        div = child._accessibleDiv;
        var hitArea = child.hitArea;
        var wt = child.worldTransform;

        if (child.hitArea)
        {
          div.style.left = ((wt.tx + (hitArea.x * wt.a)) * sx) + "px";
          div.style.top = ((wt.ty + (hitArea.y * wt.d)) * sy) + "px";

          div.style.width = (hitArea.width * wt.a * sx) + "px";
          div.style.height = (hitArea.height * wt.d * sy) + "px";
        }
        else
        {
          hitArea = child.getBounds();

          this.capHitArea(hitArea);

          div.style.left = (hitArea.x * sx) + "px";
          div.style.top = (hitArea.y * sy) + "px";

          div.style.width = (hitArea.width * sx) + "px";
          div.style.height = (hitArea.height * sy) + "px";

          // update button titles and hints if they exist and they've changed
          if (div.title !== child.accessibleTitle && child.accessibleTitle !== null)
          {
            div.title = child.accessibleTitle;
          }
          if (div.getAttribute('aria-label') !== child.accessibleHint
            && child.accessibleHint !== null)
          {
            div.setAttribute('aria-label', child.accessibleHint);
          }
        }
      }
    }

    // increment the render id..
    this.renderId++;
  };

  /**
   * Adjust the hit area based on the bounds of a display object
   *
   * @param {PIXI.Rectangle} hitArea - Bounds of the child
   */
  AccessibilityManager.prototype.capHitArea = function capHitArea (hitArea)
  {
    if (hitArea.x < 0)
    {
      hitArea.width += hitArea.x;
      hitArea.x = 0;
    }

    if (hitArea.y < 0)
    {
      hitArea.height += hitArea.y;
      hitArea.y = 0;
    }

    if (hitArea.x + hitArea.width > this.renderer.width)
    {
      hitArea.width = this.renderer.width - hitArea.x;
    }

    if (hitArea.y + hitArea.height > this.renderer.height)
    {
      hitArea.height = this.renderer.height - hitArea.y;
    }
  };

  /**
   * Adds a DisplayObject to the accessibility manager
   *
   * @private
   * @param {PIXI.DisplayObject} displayObject - The child to make accessible.
   */
  AccessibilityManager.prototype.addChild = function addChild (displayObject)
  {
    //this.activate();

    var div = this.pool.pop();

    if (!div)
    {
      div = document.createElement('button');

      div.style.width = DIV_TOUCH_SIZE + "px";
      div.style.height = DIV_TOUCH_SIZE + "px";
      div.style.backgroundColor = this.debug ? 'rgba(255,0,0,0.5)' : 'transparent';
      div.style.position = 'absolute';
      div.style.zIndex = DIV_TOUCH_ZINDEX;
      div.style.borderStyle = 'none';

      // ARIA attributes ensure that button title and hint updates are announced properly
      if (navigator.userAgent.toLowerCase().indexOf('chrome') > -1)
      {
        // Chrome doesn't need aria-live to work as intended; in fact it just gets more confused.
        div.setAttribute('aria-live', 'off');
      }
      else
      {
        div.setAttribute('aria-live', 'polite');
      }

      if (navigator.userAgent.match(/rv:.*Gecko\//))
      {
        // FireFox needs this to announce only the new button name
        div.setAttribute('aria-relevant', 'additions');
      }
      else
      {
        // required by IE, other browsers don't much care
        div.setAttribute('aria-relevant', 'text');
      }

      div.addEventListener('click', this._onClick.bind(this));
      div.addEventListener('focus', this._onFocus.bind(this));
      div.addEventListener('focusout', this._onFocusOut.bind(this));
    }

    if (displayObject.accessibleTitle && displayObject.accessibleTitle !== null)
    {
      div.title = displayObject.accessibleTitle;
    }
    else if (!displayObject.accessibleHint
      || displayObject.accessibleHint === null)
    {
      div.title = "displayObject " + (displayObject.tabIndex);
    }

    if (displayObject.accessibleHint
      && displayObject.accessibleHint !== null)
    {
      div.setAttribute('aria-label', displayObject.accessibleHint);
    }

    //

    displayObject._accessibleActive = true;
    displayObject._accessibleDiv = div;
    div.displayObject = displayObject;

    this.children.push(displayObject);
    this.div.appendChild(displayObject._accessibleDiv);
    displayObject._accessibleDiv.tabIndex = displayObject.tabIndex;
  };

  /**
   * Maps the div button press to pixi's InteractionManager (click)
   *
   * @private
   * @param {MouseEvent} e - The click event.
   */
  AccessibilityManager.prototype._onClick = function _onClick (e)
  {
    var interactionManager = this.renderer.plugins.interaction;

    interactionManager.dispatchEvent(e.target.displayObject, 'click', interactionManager.eventData);
    interactionManager.dispatchEvent(e.target.displayObject, 'pointertap', interactionManager.eventData);
    interactionManager.dispatchEvent(e.target.displayObject, 'tap', interactionManager.eventData);
  };

  /**
   * Maps the div focus events to pixi's InteractionManager (mouseover)
   *
   * @private
   * @param {FocusEvent} e - The focus event.
   */
  AccessibilityManager.prototype._onFocus = function _onFocus (e)
  {
    if (!e.target.getAttribute('aria-live', 'off'))
    {
      e.target.setAttribute('aria-live', 'assertive');
    }
    var interactionManager = this.renderer.plugins.interaction;

    interactionManager.dispatchEvent(e.target.displayObject, 'mouseover', interactionManager.eventData);
  };

  /**
   * Maps the div focus events to pixi's InteractionManager (mouseout)
   *
   * @private
   * @param {FocusEvent} e - The focusout event.
   */
  AccessibilityManager.prototype._onFocusOut = function _onFocusOut (e)
  {
    if (!e.target.getAttribute('aria-live', 'off'))
    {
      e.target.setAttribute('aria-live', 'polite');
    }
    var interactionManager = this.renderer.plugins.interaction;

    interactionManager.dispatchEvent(e.target.displayObject, 'mouseout', interactionManager.eventData);
  };

  /**
   * Is called when a key is pressed
   *
   * @private
   * @param {KeyboardEvent} e - The keydown event.
   */
  AccessibilityManager.prototype._onKeyDown = function _onKeyDown (e)
  {
    if (e.keyCode !== KEY_CODE_TAB)
    {
      return;
    }

    this.activate();
  };

  /**
   * Is called when the mouse moves across the renderer element
   *
   * @private
   * @param {MouseEvent} e - The mouse event.
   */
  AccessibilityManager.prototype._onMouseMove = function _onMouseMove (e)
  {
    if (e.movementX === 0 && e.movementY === 0)
    {
      return;
    }

    this.deactivate();
  };

  /**
   * Destroys the accessibility manager
   *
   */
  AccessibilityManager.prototype.destroy = function destroy ()
  {
    this.destroyTouchHook();
    this.div = null;

    for (var i = 0; i < this.children.length; i++)
    {
      this.children[i].div = null;
    }

    window.document.removeEventListener('mousemove', this._onMouseMove, true);
    window.removeEventListener('keydown', this._onKeyDown);

    this.pool = null;
    this.children = null;
    this.renderer = null;
  };

  var accessibility_es = ({
    AccessibilityManager: AccessibilityManager,
    accessibleTarget: accessibleTarget
  });

  /*!
	 * @pixi/runner - v5.1.0
	 * Compiled Fri, 19 Jul 2019 21:58:39 UTC
	 *
	 * @pixi/runner is licensed under the MIT License.
	 * http://www.opensource.org/licenses/mit-license
	 */
  /**
   * A Runner is a highly performant and simple alternative to signals. Best used in situations
   * where events are dispatched to many objects at high frequency (say every frame!)
   *
   *
   * like a signal..
   * ```
   * const myObject = {
   *     loaded: new PIXI.Runner('loaded')
   * }
   *
   * const listener = {
   *     loaded: function(){
   *         // thin
   *     }
   * }
   *
   * myObject.update.add(listener);
   *
   * myObject.loaded.emit();
   * ```
   *
   * Or for handling calling the same function on many items
   * ```
   * const myGame = {
   *     update: new PIXI.Runner('update')
   * }
   *
   * const gameObject = {
   *     update: function(time){
   *         // update my gamey state
   *     }
   * }
   *
   * myGame.update.add(gameObject1);
   *
   * myGame.update.emit(time);
   * ```
   * @class
   * @memberof PIXI
   */
  var Runner = function Runner(name)
  {
    this.items = [];
    this._name = name;
  };

  var prototypeAccessors$3 = { empty: { configurable: true },name: { configurable: true } };

  /**
   * Dispatch/Broadcast Runner to all listeners added to the queue.
   * @param {...any} params - optional parameters to pass to each listener
   */
  Runner.prototype.emit = function emit (a0, a1, a2, a3, a4, a5, a6, a7)
  {
    if (arguments.length > 8)
    {
      throw new Error('max arguments reached');
    }

    var ref = this;
    var name = ref.name;
    var items = ref.items;

    for (var i = 0, len = items.length; i < len; i++)
    {
      items[i][name](a0, a1, a2, a3, a4, a5, a6, a7);
    }

    return this;
  };

  /**
   * Add a listener to the Runner
   *
   * Runners do not need to have scope or functions passed to them.
   * All that is required is to pass the listening object and ensure that it has contains a function that has the same name
   * as the name provided to the Runner when it was created.
   *
   * Eg A listener passed to this Runner will require a 'complete' function.
   *
   * ```
   * const complete = new PIXI.Runner('complete');
   * ```
   *
   * The scope used will be the object itself.
   *
   * @param {any} item - The object that will be listening.
   */
  Runner.prototype.add = function add (item)
  {
    if (item[this._name])
    {
      this.remove(item);
      this.items.push(item);
    }

    return this;
  };

  /**
   * Remove a single listener from the dispatch queue.
   * @param {any} item - The listenr that you would like to remove.
   */
  Runner.prototype.remove = function remove (item)
  {
    var index = this.items.indexOf(item);

    if (index !== -1)
    {
      this.items.splice(index, 1);
    }

    return this;
  };

  /**
   * Check to see if the listener is already in the Runner
   * @param {any} item - The listener that you would like to check.
   */
  Runner.prototype.contains = function contains (item)
  {
    return this.items.indexOf(item) !== -1;
  };

  /**
   * Remove all listeners from the Runner
   */
  Runner.prototype.removeAll = function removeAll ()
  {
    this.items.length = 0;

    return this;
  };

  /**
   * Remove all references, don't use after this.
   */
  Runner.prototype.destroy = function destroy ()
  {
    this.removeAll();
    this.items = null;
    this._name = null;
  };

  /**
   * `true` if there are no this Runner contains no listeners
   *
   * @member {boolean}
   * @readonly
   */
  prototypeAccessors$3.empty.get = function ()
  {
    return this.items.length === 0;
  };

  /**
   * The name of the runner.
   *
   * @member {string}
   * @readonly
   */
  prototypeAccessors$3.name.get = function ()
  {
    return this._name;
  };

  Object.defineProperties( Runner.prototype, prototypeAccessors$3 );

  /**
   * Alias for `emit`
   * @memberof PIXI.Runner#
   * @method dispatch
   * @see PIXI.Runner#emit
   */
  Runner.prototype.dispatch = Runner.prototype.emit;

  /**
   * Alias for `emit`
   * @memberof PIXI.Runner#
   * @method run
   * @see PIXI.Runner#emit
   */
  Runner.prototype.run = Runner.prototype.emit;

  /*!
	 * @pixi/ticker - v5.1.0
	 * Compiled Fri, 19 Jul 2019 21:58:39 UTC
	 *
	 * @pixi/ticker is licensed under the MIT License.
	 * http://www.opensource.org/licenses/mit-license
	 */

  /**
   * Target frames per millisecond.
   *
   * @static
   * @name TARGET_FPMS
   * @memberof PIXI.settings
   * @type {number}
   * @default 0.06
   */
  settings.TARGET_FPMS = 0.06;

  /**
   * Represents the update priorities used by internal PIXI classes when registered with
   * the {@link PIXI.Ticker} object. Higher priority items are updated first and lower
   * priority items, such as render, should go later.
   *
   * @static
   * @constant
   * @name UPDATE_PRIORITY
   * @memberof PIXI
   * @type {object}
   * @property {number} INTERACTION=50 Highest priority, used for {@link PIXI.interaction.InteractionManager}
   * @property {number} HIGH=25 High priority updating, {@link PIXI.VideoBaseTexture} and {@link PIXI.AnimatedSprite}
   * @property {number} NORMAL=0 Default priority for ticker events, see {@link PIXI.Ticker#add}.
   * @property {number} LOW=-25 Low priority used for {@link PIXI.Application} rendering.
   * @property {number} UTILITY=-50 Lowest priority used for {@link PIXI.prepare.BasePrepare} utility.
   */
  var UPDATE_PRIORITY = {
    INTERACTION: 50,
    HIGH: 25,
    NORMAL: 0,
    LOW: -25,
    UTILITY: -50,
  };

  /**
   * Internal class for handling the priority sorting of ticker handlers.
   *
   * @private
   * @class
   * @memberof PIXI
   */
  var TickerListener = function TickerListener(fn, context, priority, once)
  {
    if ( context === void 0 ) { context = null; }
    if ( priority === void 0 ) { priority = 0; }
    if ( once === void 0 ) { once = false; }

    /**
     * The handler function to execute.
     * @private
     * @member {Function}
     */
    this.fn = fn;

    /**
     * The calling to execute.
     * @private
     * @member {*}
     */
    this.context = context;

    /**
     * The current priority.
     * @private
     * @member {number}
     */
    this.priority = priority;

    /**
     * If this should only execute once.
     * @private
     * @member {boolean}
     */
    this.once = once;

    /**
     * The next item in chain.
     * @private
     * @member {TickerListener}
     */
    this.next = null;

    /**
     * The previous item in chain.
     * @private
     * @member {TickerListener}
     */
    this.previous = null;

    /**
     * `true` if this listener has been destroyed already.
     * @member {boolean}
     * @private
     */
    this._destroyed = false;
  };

  /**
   * Simple compare function to figure out if a function and context match.
   * @private
   * @param {Function} fn - The listener function to be added for one update
   * @param {Function} context - The listener context
   * @return {boolean} `true` if the listener match the arguments
   */
  TickerListener.prototype.match = function match (fn, context)
  {
    context = context || null;

    return this.fn === fn && this.context === context;
  };

  /**
   * Emit by calling the current function.
   * @private
   * @param {number} deltaTime - time since the last emit.
   * @return {TickerListener} Next ticker
   */
  TickerListener.prototype.emit = function emit (deltaTime)
  {
    if (this.fn)
    {
      if (this.context)
      {
        this.fn.call(this.context, deltaTime);
      }
      else
      {
        this.fn(deltaTime);
      }
    }

    var redirect = this.next;

    if (this.once)
    {
      this.destroy(true);
    }

    // Soft-destroying should remove
    // the next reference
    if (this._destroyed)
    {
      this.next = null;
    }

    return redirect;
  };

  /**
   * Connect to the list.
   * @private
   * @param {TickerListener} previous - Input node, previous listener
   */
  TickerListener.prototype.connect = function connect (previous)
  {
    this.previous = previous;
    if (previous.next)
    {
      previous.next.previous = this;
    }
    this.next = previous.next;
    previous.next = this;
  };

  /**
   * Destroy and don't use after this.
   * @private
   * @param {boolean} [hard = false] `true` to remove the `next` reference, this
   *    is considered a hard destroy. Soft destroy maintains the next reference.
   * @return {TickerListener} The listener to redirect while emitting or removing.
   */
  TickerListener.prototype.destroy = function destroy (hard)
  {
    if ( hard === void 0 ) { hard = false; }

    this._destroyed = true;
    this.fn = null;
    this.context = null;

    // Disconnect, hook up next and previous
    if (this.previous)
    {
      this.previous.next = this.next;
    }

    if (this.next)
    {
      this.next.previous = this.previous;
    }

    // Redirect to the next item
    var redirect = this.next;

    // Remove references
    this.next = hard ? null : redirect;
    this.previous = null;

    return redirect;
  };

  /**
   * A Ticker class that runs an update loop that other objects listen to.
   *
   * This class is composed around listeners meant for execution on the next requested animation frame.
   * Animation frames are requested only when necessary, e.g. When the ticker is started and the emitter has listeners.
   *
   * @class
   * @memberof PIXI
   */
  var Ticker = function Ticker()
  {
    var this$1 = this;

    /**
     * The first listener. All new listeners added are chained on this.
     * @private
     * @type {TickerListener}
     */
    this._head = new TickerListener(null, null, Infinity);

    /**
     * Internal current frame request ID
     * @type {?number}
     * @private
     */
    this._requestId = null;

    /**
     * Internal value managed by minFPS property setter and getter.
     * This is the maximum allowed milliseconds between updates.
     * @type {number}
     * @private
     */
    this._maxElapsedMS = 100;

    /**
     * Internal value managed by maxFPS property setter and getter.
     * This is the minimum allowed milliseconds between updates.
     * @private
     */
    this._minElapsedMS = 0;

    /**
     * Whether or not this ticker should invoke the method
     * {@link PIXI.Ticker#start} automatically
     * when a listener is added.
     *
     * @member {boolean}
     * @default false
     */
    this.autoStart = false;

    /**
     * Scalar time value from last frame to this frame.
     * This value is capped by setting {@link PIXI.Ticker#minFPS}
     * and is scaled with {@link PIXI.Ticker#speed}.
     * **Note:** The cap may be exceeded by scaling.
     *
     * @member {number}
     * @default 1
     */
    this.deltaTime = 1;

    /**
     * Scaler time elapsed in milliseconds from last frame to this frame.
     * This value is capped by setting {@link PIXI.Ticker#minFPS}
     * and is scaled with {@link PIXI.Ticker#speed}.
     * **Note:** The cap may be exceeded by scaling.
     * If the platform supports DOMHighResTimeStamp,
     * this value will have a precision of 1 Âµs.
     * Defaults to target frame time
     *
     * @member {number}
     * @default 16.66
     */
    this.deltaMS = 1 / settings.TARGET_FPMS;

    /**
     * Time elapsed in milliseconds from last frame to this frame.
     * Opposed to what the scalar {@link PIXI.Ticker#deltaTime}
     * is based, this value is neither capped nor scaled.
     * If the platform supports DOMHighResTimeStamp,
     * this value will have a precision of 1 Âµs.
     * Defaults to target frame time
     *
     * @member {number}
     * @default 16.66
     */
    this.elapsedMS = 1 / settings.TARGET_FPMS;

    /**
     * The last time {@link PIXI.Ticker#update} was invoked.
     * This value is also reset internally outside of invoking
     * update, but only when a new animation frame is requested.
     * If the platform supports DOMHighResTimeStamp,
     * this value will have a precision of 1 Âµs.
     *
     * @member {number}
     * @default -1
     */
    this.lastTime = -1;

    /**
     * Factor of current {@link PIXI.Ticker#deltaTime}.
     * @example
     * // Scales ticker.deltaTime to what would be
     * // the equivalent of approximately 120 FPS
     * ticker.speed = 2;
     *
     * @member {number}
     * @default 1
     */
    this.speed = 1;

    /**
     * Whether or not this ticker has been started.
     * `true` if {@link PIXI.Ticker#start} has been called.
     * `false` if {@link PIXI.Ticker#stop} has been called.
     * While `false`, this value may change to `true` in the
     * event of {@link PIXI.Ticker#autoStart} being `true`
     * and a listener is added.
     *
     * @member {boolean}
     * @default false
     */
    this.started = false;

    /**
     * If enabled, deleting is disabled.
     * @member {boolean}
     * @default false
     * @private
     */
    this._protected = false;

    /**
     * Internal tick method bound to ticker instance.
     * This is because in early 2015, Function.bind
     * is still 60% slower in high performance scenarios.
     * Also separating frame requests from update method
     * so listeners may be called at any time and with
     * any animation API, just invoke ticker.update(time).
     *
     * @private
     * @param {number} time - Time since last tick.
     */
    this._tick = function (time) {
      this$1._requestId = null;

      if (this$1.started)
      {
        // Invoke listeners now
        this$1.update(time);
        // Listener side effects may have modified ticker state.
        if (this$1.started && this$1._requestId === null && this$1._head.next)
        {
          this$1._requestId = requestAnimationFrame(this$1._tick);
        }
      }
    };
  };

  var prototypeAccessors$4 = { FPS: { configurable: true },minFPS: { configurable: true },maxFPS: { configurable: true } };
  var staticAccessors$2 = { shared: { configurable: true },system: { configurable: true } };

  /**
   * Conditionally requests a new animation frame.
   * If a frame has not already been requested, and if the internal
   * emitter has listeners, a new frame is requested.
   *
   * @private
   */
  Ticker.prototype._requestIfNeeded = function _requestIfNeeded ()
  {
    if (this._requestId === null && this._head.next)
    {
      // ensure callbacks get correct delta
      this.lastTime = performance.now();
      this._requestId = requestAnimationFrame(this._tick);
    }
  };

  /**
   * Conditionally cancels a pending animation frame.
   *
   * @private
   */
  Ticker.prototype._cancelIfNeeded = function _cancelIfNeeded ()
  {
    if (this._requestId !== null)
    {
      cancelAnimationFrame(this._requestId);
      this._requestId = null;
    }
  };

  /**
   * Conditionally requests a new animation frame.
   * If the ticker has been started it checks if a frame has not already
   * been requested, and if the internal emitter has listeners. If these
   * conditions are met, a new frame is requested. If the ticker has not
   * been started, but autoStart is `true`, then the ticker starts now,
   * and continues with the previous conditions to request a new frame.
   *
   * @private
   */
  Ticker.prototype._startIfPossible = function _startIfPossible ()
  {
    if (this.started)
    {
      this._requestIfNeeded();
    }
    else if (this.autoStart)
    {
      this.start();
    }
  };

  /**
   * Register a handler for tick events. Calls continuously unless
   * it is removed or the ticker is stopped.
   *
   * @param {Function} fn - The listener function to be added for updates
   * @param {*} [context] - The listener context
   * @param {number} [priority=PIXI.UPDATE_PRIORITY.NORMAL] - The priority for emitting
   * @returns {PIXI.Ticker} This instance of a ticker
   */
  Ticker.prototype.add = function add (fn, context, priority)
  {
    if ( priority === void 0 ) { priority = UPDATE_PRIORITY.NORMAL; }

    return this._addListener(new TickerListener(fn, context, priority));
  };

  /**
   * Add a handler for the tick event which is only execute once.
   *
   * @param {Function} fn - The listener function to be added for one update
   * @param {*} [context] - The listener context
   * @param {number} [priority=PIXI.UPDATE_PRIORITY.NORMAL] - The priority for emitting
   * @returns {PIXI.Ticker} This instance of a ticker
   */
  Ticker.prototype.addOnce = function addOnce (fn, context, priority)
  {
    if ( priority === void 0 ) { priority = UPDATE_PRIORITY.NORMAL; }

    return this._addListener(new TickerListener(fn, context, priority, true));
  };

  /**
   * Internally adds the event handler so that it can be sorted by priority.
   * Priority allows certain handler (user, AnimatedSprite, Interaction) to be run
   * before the rendering.
   *
   * @private
   * @param {TickerListener} listener - Current listener being added.
   * @returns {PIXI.Ticker} This instance of a ticker
   */
  Ticker.prototype._addListener = function _addListener (listener)
  {
    // For attaching to head
    var current = this._head.next;
    var previous = this._head;

    // Add the first item
    if (!current)
    {
      listener.connect(previous);
    }
    else
    {
      // Go from highest to lowest priority
      while (current)
      {
        if (listener.priority > current.priority)
        {
          listener.connect(previous);
          break;
        }
        previous = current;
        current = current.next;
      }

      // Not yet connected
      if (!listener.previous)
      {
        listener.connect(previous);
      }
    }

    this._startIfPossible();

    return this;
  };

  /**
   * Removes any handlers matching the function and context parameters.
   * If no handlers are left after removing, then it cancels the animation frame.
   *
   * @param {Function} fn - The listener function to be removed
   * @param {*} [context] - The listener context to be removed
   * @returns {PIXI.Ticker} This instance of a ticker
   */
  Ticker.prototype.remove = function remove (fn, context)
  {
    var listener = this._head.next;

    while (listener)
    {
      // We found a match, lets remove it
      // no break to delete all possible matches
      // incase a listener was added 2+ times
      if (listener.match(fn, context))
      {
        listener = listener.destroy();
      }
      else
      {
        listener = listener.next;
      }
    }

    if (!this._head.next)
    {
      this._cancelIfNeeded();
    }

    return this;
  };

  /**
   * Starts the ticker. If the ticker has listeners
   * a new animation frame is requested at this point.
   */
  Ticker.prototype.start = function start ()
  {
    if (!this.started)
    {
      this.started = true;
      this._requestIfNeeded();
    }
  };

  /**
   * Stops the ticker. If the ticker has requested
   * an animation frame it is canceled at this point.
   */
  Ticker.prototype.stop = function stop ()
  {
    if (this.started)
    {
      this.started = false;
      this._cancelIfNeeded();
    }
  };

  /**
   * Destroy the ticker and don't use after this. Calling
   * this method removes all references to internal events.
   */
  Ticker.prototype.destroy = function destroy ()
  {
    if (!this._protected)
    {
      this.stop();

      var listener = this._head.next;

      while (listener)
      {
        listener = listener.destroy(true);
      }

      this._head.destroy();
      this._head = null;
    }
  };

  /**
   * Triggers an update. An update entails setting the
   * current {@link PIXI.Ticker#elapsedMS},
   * the current {@link PIXI.Ticker#deltaTime},
   * invoking all listeners with current deltaTime,
   * and then finally setting {@link PIXI.Ticker#lastTime}
   * with the value of currentTime that was provided.
   * This method will be called automatically by animation
   * frame callbacks if the ticker instance has been started
   * and listeners are added.
   *
   * @param {number} [currentTime=performance.now()] - the current time of execution
   */
  Ticker.prototype.update = function update (currentTime)
  {
    if ( currentTime === void 0 ) { currentTime = performance.now(); }

    var elapsedMS;

    // If the difference in time is zero or negative, we ignore most of the work done here.
    // If there is no valid difference, then should be no reason to let anyone know about it.
    // A zero delta, is exactly that, nothing should update.
    //
    // The difference in time can be negative, and no this does not mean time traveling.
    // This can be the result of a race condition between when an animation frame is requested
    // on the current JavaScript engine event loop, and when the ticker's start method is invoked
    // (which invokes the internal _requestIfNeeded method). If a frame is requested before
    // _requestIfNeeded is invoked, then the callback for the animation frame the ticker requests,
    // can receive a time argument that can be less than the lastTime value that was set within
    // _requestIfNeeded. This difference is in microseconds, but this is enough to cause problems.
    //
    // This check covers this browser engine timing issue, as well as if consumers pass an invalid
    // currentTime value. This may happen if consumers opt-out of the autoStart, and update themselves.

    if (currentTime > this.lastTime)
    {
      // Save uncapped elapsedMS for measurement
      elapsedMS = this.elapsedMS = currentTime - this.lastTime;

      // cap the milliseconds elapsed used for deltaTime
      if (elapsedMS > this._maxElapsedMS)
      {
        elapsedMS = this._maxElapsedMS;
      }

      elapsedMS *= this.speed;

      // if not enough time has passed, exit the function.
      // We give a padding (5% of minElapsedMS) to elapsedMS for this check, because the
      // nature of request animation frame means that not all browsers will return precise values.
      // However, because rAF works based on v-sync, it's won't change the effective FPS.
      if (this._minElapsedMS)
      {
        var elapsedMSPadding = this._minElapsedMS * 0.05;

        if (elapsedMS + elapsedMSPadding < this._minElapsedMS)
        {
          return;
        }
      }

      this.deltaMS = elapsedMS;
      this.deltaTime = this.deltaMS * settings.TARGET_FPMS;

      // Cache a local reference, in-case ticker is destroyed
      // during the emit, we can still check for head.next
      var head = this._head;

      // Invoke listeners added to internal emitter
      var listener = head.next;

      while (listener)
      {
        listener = listener.emit(this.deltaTime);
      }

      if (!head.next)
      {
        this._cancelIfNeeded();
      }
    }
    else
    {
      this.deltaTime = this.deltaMS = this.elapsedMS = 0;
    }

    this.lastTime = currentTime;
  };

  /**
   * The frames per second at which this ticker is running.
   * The default is approximately 60 in most modern browsers.
   * **Note:** This does not factor in the value of
   * {@link PIXI.Ticker#speed}, which is specific
   * to scaling {@link PIXI.Ticker#deltaTime}.
   *
   * @member {number}
   * @readonly
   */
  prototypeAccessors$4.FPS.get = function ()
  {
    return 1000 / this.elapsedMS;
  };

  /**
   * Manages the maximum amount of milliseconds allowed to
   * elapse between invoking {@link PIXI.Ticker#update}.
   * This value is used to cap {@link PIXI.Ticker#deltaTime},
   * but does not effect the measured value of {@link PIXI.Ticker#FPS}.
   * When setting this property it is clamped to a value between
   * `0` and `PIXI.settings.TARGET_FPMS * 1000`.
   *
   * @member {number}
   * @default 10
   */
  prototypeAccessors$4.minFPS.get = function ()
  {
    return 1000 / this._maxElapsedMS;
  };

  prototypeAccessors$4.minFPS.set = function (fps) // eslint-disable-line require-jsdoc
  {
    // Minimum must be below the maxFPS
    var minFPS = Math.min(this.maxFPS, fps);

    // Must be at least 0, but below 1 / settings.TARGET_FPMS
    var minFPMS = Math.min(Math.max(0, minFPS) / 1000, settings.TARGET_FPMS);

    this._maxElapsedMS = 1 / minFPMS;
  };

  /**
   * Manages the minimum amount of milliseconds required to
   * elapse between invoking {@link PIXI.Ticker#update}.
   * This will effect the measured value of {@link PIXI.Ticker#FPS}.
   * If it is set to `0`, then there is no limit; PixiJS will render as many frames as it can.
   * Otherwise it will be at least `minFPS`
   *
   * @member {number}
   * @default 0
   */
  prototypeAccessors$4.maxFPS.get = function ()
  {
    if (this._minElapsedMS)
    {
      return Math.round(1000 / this._minElapsedMS);
    }

    return 0;
  };

  prototypeAccessors$4.maxFPS.set = function (fps)
  {
    if (fps === 0)
    {
      this._minElapsedMS = 0;
    }
    else
    {
      // Max must be at least the minFPS
      var maxFPS = Math.max(this.minFPS, fps);

      this._minElapsedMS = 1 / (maxFPS / 1000);
    }
  };

  /**
   * The shared ticker instance used by {@link PIXI.AnimatedSprite} and by
   * {@link PIXI.VideoResource} to update animation frames / video textures.
   *
   * It may also be used by {@link PIXI.Application} if created with the `sharedTicker` option property set to true.
   *
   * The property {@link PIXI.Ticker#autoStart} is set to `true` for this instance.
   * Please follow the examples for usage, including how to opt-out of auto-starting the shared ticker.
   *
   * @example
   * let ticker = PIXI.Ticker.shared;
   * // Set this to prevent starting this ticker when listeners are added.
   * // By default this is true only for the PIXI.Ticker.shared instance.
   * ticker.autoStart = false;
   * // FYI, call this to ensure the ticker is stopped. It should be stopped
   * // if you have not attempted to render anything yet.
   * ticker.stop();
   * // Call this when you are ready for a running shared ticker.
   * ticker.start();
   *
   * @example
   * // You may use the shared ticker to render...
   * let renderer = PIXI.autoDetectRenderer();
   * let stage = new PIXI.Container();
   * document.body.appendChild(renderer.view);
   * ticker.add(function (time) {
   * renderer.render(stage);
   * });
   *
   * @example
   * // Or you can just update it manually.
   * ticker.autoStart = false;
   * ticker.stop();
   * function animate(time) {
   * ticker.update(time);
   * renderer.render(stage);
   * requestAnimationFrame(animate);
   * }
   * animate(performance.now());
   *
   * @member {PIXI.Ticker}
   * @static
   */
  staticAccessors$2.shared.get = function ()
  {
    if (!Ticker._shared)
    {
      var shared = Ticker._shared = new Ticker();

      shared.autoStart = true;
      shared._protected = true;
    }

    return Ticker._shared;
  };

  /**
   * The system ticker instance used by {@link PIXI.interaction.InteractionManager} and by
   * {@link PIXI.BasePrepare} for core timing functionality that shouldn't usually need to be paused,
   * unlike the `shared` ticker which drives visual animations and rendering which may want to be paused.
   *
   * The property {@link PIXI.Ticker#autoStart} is set to `true` for this instance.
   *
   * @member {PIXI.Ticker}
   * @static
   */
  staticAccessors$2.system.get = function ()
  {
    if (!Ticker._system)
    {
      var system = Ticker._system = new Ticker();

      system.autoStart = true;
      system._protected = true;
    }

    return Ticker._system;
  };

  Object.defineProperties( Ticker.prototype, prototypeAccessors$4 );
  Object.defineProperties( Ticker, staticAccessors$2 );

  /**
   * Middleware for for Application Ticker.
   *
   * @example
   * import {TickerPlugin} from '@pixi/ticker';
   * import {Application} from '@pixi/app';
   * Application.registerPlugin(TickerPlugin);
   *
   * @class
   * @memberof PIXI
   */
  var TickerPlugin = function TickerPlugin () {};

  TickerPlugin.init = function init (options)
  {
    var this$1 = this;

    // Set default
    options = Object.assign({
      autoStart: true,
      sharedTicker: false,
    }, options);

    // Create ticker setter
    Object.defineProperty(this, 'ticker',
      {
        set: function set(ticker)
        {
          if (this._ticker)
          {
            this._ticker.remove(this.render, this);
          }
          this._ticker = ticker;
          if (ticker)
          {
            ticker.add(this.render, this, UPDATE_PRIORITY.LOW);
          }
        },
        get: function get()
        {
          return this._ticker;
        },
      });

    /**
     * Convenience method for stopping the render.
     *
     * @method PIXI.Application#stop
     */
    this.stop = function () {
      this$1._ticker.stop();
    };

    /**
     * Convenience method for starting the render.
     *
     * @method PIXI.Application#start
     */
    this.start = function () {
      this$1._ticker.start();
    };

    /**
     * Internal reference to the ticker.
     *
     * @type {PIXI.Ticker}
     * @name _ticker
     * @memberof PIXI.Application#
     * @private
     */
    this._ticker = null;

    /**
     * Ticker for doing render updates.
     *
     * @type {PIXI.Ticker}
     * @name ticker
     * @memberof PIXI.Application#
     * @default PIXI.Ticker.shared
     */
    this.ticker = options.sharedTicker ? Ticker.shared : new Ticker();

    // Start the rendering
    if (options.autoStart)
    {
      this.start();
    }
  };

  /**
   * Clean up the ticker, scoped to application.
   *
   * @static
   * @private
   */
  TickerPlugin.destroy = function destroy ()
  {
    if (this._ticker)
    {
      var oldTicker = this._ticker;

      this.ticker = null;
      oldTicker.destroy();
    }
  };

  /*!
	 * @pixi/core - v5.1.0
	 * Compiled Fri, 19 Jul 2019 21:58:39 UTC
	 *
	 * @pixi/core is licensed under the MIT License.
	 * http://www.opensource.org/licenses/mit-license
	 */

  /**
   * Base resource class for textures that manages validation and uploading, depending on its type.
   *
   * Uploading of a base texture to the GPU is required.
   *
   * @class
   * @memberof PIXI.resources
   */
  var Resource = function Resource(width, height)
  {
    if ( width === void 0 ) { width = 0; }
    if ( height === void 0 ) { height = 0; }

    /**
     * Internal width of the resource
     * @member {number}
     * @protected
     */
    this._width = width;

    /**
     * Internal height of the resource
     * @member {number}
     * @protected
     */
    this._height = height;

    /**
     * If resource has been destroyed
     * @member {boolean}
     * @readonly
     * @default false
     */
    this.destroyed = false;

    /**
     * `true` if resource is created by BaseTexture
     * useful for doing cleanup with BaseTexture destroy
     * and not cleaning up resources that were created
     * externally.
     * @member {boolean}
     * @protected
     */
    this.internal = false;

    /**
     * Mini-runner for handling resize events
     *
     * @member {Runner}
     * @private
     */
    this.onResize = new Runner('setRealSize', 2);

    /**
     * Mini-runner for handling update events
     *
     * @member {Runner}
     * @private
     */
    this.onUpdate = new Runner('update');
  };

  var prototypeAccessors$5 = { valid: { configurable: true },width: { configurable: true },height: { configurable: true } };

  /**
   * Bind to a parent BaseTexture
   *
   * @param {PIXI.BaseTexture} baseTexture - Parent texture
   */
  Resource.prototype.bind = function bind (baseTexture)
  {
    this.onResize.add(baseTexture);
    this.onUpdate.add(baseTexture);

    // Call a resize immediate if we already
    // have the width and height of the resource
    if (this._width || this._height)
    {
      this.onResize.run(this._width, this._height);
    }
  };

  /**
   * Unbind to a parent BaseTexture
   *
   * @param {PIXI.BaseTexture} baseTexture - Parent texture
   */
  Resource.prototype.unbind = function unbind (baseTexture)
  {
    this.onResize.remove(baseTexture);
    this.onUpdate.remove(baseTexture);
  };

  /**
   * Trigger a resize event
   */
  Resource.prototype.resize = function resize (width, height)
  {
    if (width !== this._width || height !== this._height)
    {
      this._width = width;
      this._height = height;
      this.onResize.run(width, height);
    }
  };

  /**
   * Has been validated
   * @readonly
   * @member {boolean}
   */
  prototypeAccessors$5.valid.get = function ()
  {
    return !!this._width && !!this._height;
  };

  /**
   * Has been updated trigger event
   */
  Resource.prototype.update = function update ()
  {
    if (!this.destroyed)
    {
      this.onUpdate.run();
    }
  };

  /**
   * This can be overridden to start preloading a resource
   * or do any other prepare step.
   * @protected
   * @return {Promise<void>} Handle the validate event
   */
  Resource.prototype.load = function load ()
  {
    return Promise.resolve();
  };

  /**
   * The width of the resource.
   *
   * @member {number}
   * @readonly
   */
  prototypeAccessors$5.width.get = function ()
  {
    return this._width;
  };

  /**
   * The height of the resource.
   *
   * @member {number}
   * @readonly
   */
  prototypeAccessors$5.height.get = function ()
  {
    return this._height;
  };

  /**
   * Uploads the texture or returns false if it cant for some reason. Override this.
   *
   * @param {PIXI.Renderer} renderer - yeah, renderer!
   * @param {PIXI.BaseTexture} baseTexture - the texture
   * @param {PIXI.GLTexture} glTexture - texture instance for this webgl context
   * @returns {boolean} true is success
   */
  Resource.prototype.upload = function upload (renderer, baseTexture, glTexture) // eslint-disable-line no-unused-vars
  {
    return false;
  };

  /**
   * Set the style, optional to override
   *
   * @param {PIXI.Renderer} renderer - yeah, renderer!
   * @param {PIXI.BaseTexture} baseTexture - the texture
   * @param {PIXI.GLTexture} glTexture - texture instance for this webgl context
   * @returns {boolean} `true` is success
   */
  Resource.prototype.style = function style (renderer, baseTexture, glTexture) // eslint-disable-line no-unused-vars
  {
    return false;
  };

  /**
   * Clean up anything, this happens when destroying is ready.
   *
   * @protected
   */
  Resource.prototype.dispose = function dispose ()
  {
    // override
  };

  /**
   * Call when destroying resource, unbind any BaseTexture object
   * before calling this method, as reference counts are maintained
   * internally.
   */
  Resource.prototype.destroy = function destroy ()
  {
    if (!this.destroyed)
    {
      this.onResize.removeAll();
      this.onResize = null;
      this.onUpdate.removeAll();
      this.onUpdate = null;
      this.destroyed = true;
      this.dispose();
    }
  };

  Object.defineProperties( Resource.prototype, prototypeAccessors$5 );

  /**
   * Base for all the image/canvas resources
   * @class
   * @extends PIXI.resources.Resource
   * @memberof PIXI.resources
   */
  var BaseImageResource = /*@__PURE__*/(function (Resource) {
    function BaseImageResource(source)
    {
      var width = source.naturalWidth || source.videoWidth || source.width;
      var height = source.naturalHeight || source.videoHeight || source.height;

      Resource.call(this, width, height);

      /**
       * The source element
       * @member {HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|SVGElement}
       * @readonly
       */
      this.source = source;
    }

    if ( Resource ) { BaseImageResource.__proto__ = Resource; }
    BaseImageResource.prototype = Object.create( Resource && Resource.prototype );
    BaseImageResource.prototype.constructor = BaseImageResource;

    /**
     * Set cross origin based detecting the url and the crossorigin
     * @protected
     * @param {HTMLElement} element - Element to apply crossOrigin
     * @param {string} url - URL to check
     * @param {boolean|string} [crossorigin=true] - Cross origin value to use
     */
    BaseImageResource.crossOrigin = function crossOrigin (element, url, crossorigin)
    {
      if (crossorigin === undefined && url.indexOf('data:') !== 0)
      {
        element.crossOrigin = determineCrossOrigin(url);
      }
      else if (crossorigin !== false)
      {
        element.crossOrigin = typeof crossorigin === 'string' ? crossorigin : 'anonymous';
      }
    };

    /**
     * Upload the texture to the GPU.
     * @param {PIXI.Renderer} renderer Upload to the renderer
     * @param {PIXI.BaseTexture} baseTexture Reference to parent texture
     * @param {PIXI.GLTexture} glTexture
     * @param {HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|SVGElement} [source] (optional)
     * @returns {boolean} true is success
     */
    BaseImageResource.prototype.upload = function upload (renderer, baseTexture, glTexture, source)
    {
      var gl = renderer.gl;
      var width = baseTexture.realWidth;
      var height = baseTexture.realHeight;

      source = source || this.source;

      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, baseTexture.premultiplyAlpha);

      if (baseTexture.target === gl.TEXTURE_2D && glTexture.width === width && glTexture.height === height)
      {
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, baseTexture.format, baseTexture.type, source);
      }
      else
      {
        glTexture.width = width;
        glTexture.height = height;

        gl.texImage2D(baseTexture.target, 0, baseTexture.format, baseTexture.format, baseTexture.type, source);
      }

      return true;
    };

    /**
     * Checks if source width/height was changed, resize can cause extra baseTexture update.
     * Triggers one update in any case.
     */
    BaseImageResource.prototype.update = function update ()
    {
      if (this.destroyed)
      {
        return;
      }

      var width = this.source.naturalWidth || this.source.videoWidth || this.source.width;
      var height = this.source.naturalHeight || this.source.videoHeight || this.source.height;

      this.resize(width, height);

      Resource.prototype.update.call(this);
    };

    /**
     * Destroy this BaseImageResource
     * @override
     * @param {PIXI.BaseTexture} [fromTexture] Optional base texture
     * @return {boolean} Destroy was successful
     */
    BaseImageResource.prototype.dispose = function dispose ()
    {
      this.source = null;
    };

    return BaseImageResource;
  }(Resource));

  /**
   * Resource type for HTMLImageElement.
   * @class
   * @extends PIXI.resources.BaseImageResource
   * @memberof PIXI.resources
   */
  var ImageResource = /*@__PURE__*/(function (BaseImageResource) {
    function ImageResource(source, options)
    {
      options = options || {};

      if (!(source instanceof HTMLImageElement))
      {
        var imageElement = new Image();

        BaseImageResource.crossOrigin(imageElement, source, options.crossorigin);

        imageElement.src = source;
        source = imageElement;
      }

      BaseImageResource.call(this, source);

      /**
       * URL of the image source
       * @member {string}
       */
      this.url = source.src;

      /**
       * When process is completed
       * @member {Promise<void>}
       * @private
       */
      this._process = null;

      /**
       * If the image should be disposed after upload
       * @member {boolean}
       * @default false
       */
      this.preserveBitmap = false;

      /**
       * If capable, convert the image using createImageBitmap API
       * @member {boolean}
       * @default PIXI.settings.CREATE_IMAGE_BITMAP
       */
      this.createBitmap = (options.createBitmap !== undefined
        ? options.createBitmap : settings.CREATE_IMAGE_BITMAP) && !!window.createImageBitmap;

      /**
       * Controls texture premultiplyAlpha field
       * Copies from options
       * @member {boolean|null}
       * @readonly
       */
      this.premultiplyAlpha = options.premultiplyAlpha !== false;

      /**
       * The ImageBitmap element created for HTMLImageElement
       * @member {ImageBitmap}
       * @default null
       */
      this.bitmap = null;

      /**
       * Promise when loading
       * @member {Promise<void>}
       * @private
       * @default null
       */
      this._load = null;

      if (options.autoLoad !== false)
      {
        this.load();
      }
    }

    if ( BaseImageResource ) { ImageResource.__proto__ = BaseImageResource; }
    ImageResource.prototype = Object.create( BaseImageResource && BaseImageResource.prototype );
    ImageResource.prototype.constructor = ImageResource;

    /**
     * returns a promise when image will be loaded and processed
     *
     * @param {boolean} [createBitmap=true] whether process image into bitmap
     * @returns {Promise<void>}
     */
    ImageResource.prototype.load = function load (createBitmap)
    {
      var this$1 = this;

      if (createBitmap !== undefined)
      {
        this.createBitmap = createBitmap;
      }

      if (this._load)
      {
        return this._load;
      }

      this._load = new Promise(function (resolve) {
        this$1.url = this$1.source.src;
        var ref = this$1;
        var source = ref.source;

        var completed = function () {
          if (this$1.destroyed)
          {
            return;
          }
          source.onload = null;
          source.onerror = null;

          this$1.resize(source.width, source.height);
          this$1._load = null;

          if (this$1.createBitmap)
          {
            resolve(this$1.process());
          }
          else
          {
            resolve(this$1);
          }
        };

        if (source.complete && source.src)
        {
          completed();
        }
        else
        {
          source.onload = completed;
        }
      });

      return this._load;
    };

    /**
     * Called when we need to convert image into BitmapImage.
     * Can be called multiple times, real promise is cached inside.
     *
     * @returns {Promise<void>} cached promise to fill that bitmap
     */
    ImageResource.prototype.process = function process ()
    {
      var this$1 = this;

      if (this._process !== null)
      {
        return this._process;
      }
      if (this.bitmap !== null || !window.createImageBitmap)
      {
        return Promise.resolve(this);
      }

      this._process = window.createImageBitmap(this.source,
        0, 0, this.source.width, this.source.height,
        {
          premultiplyAlpha: this.premultiplyAlpha ? 'premultiply' : 'none',
        })
        .then(function (bitmap) {
          if (this$1.destroyed)
          {
            return Promise.reject();
          }
          this$1.bitmap = bitmap;
          this$1.update();
          this$1._process = null;

          return Promise.resolve(this$1);
        });

      return this._process;
    };

    /**
     * Upload the image resource to GPU.
     *
     * @param {PIXI.Renderer} renderer - Renderer to upload to
     * @param {PIXI.BaseTexture} baseTexture - BaseTexture for this resource
     * @param {PIXI.GLTexture} glTexture - GLTexture to use
     * @returns {boolean} true is success
     */
    ImageResource.prototype.upload = function upload (renderer, baseTexture, glTexture)
    {
      baseTexture.premultiplyAlpha = this.premultiplyAlpha;

      if (!this.createBitmap)
      {
        return BaseImageResource.prototype.upload.call(this, renderer, baseTexture, glTexture);
      }
      if (!this.bitmap)
      {
        // yeah, ignore the output
        this.process();
        if (!this.bitmap)
        {
          return false;
        }
      }

      BaseImageResource.prototype.upload.call(this, renderer, baseTexture, glTexture, this.bitmap);

      if (!this.preserveBitmap)
      {
        // checks if there are other renderers that possibly need this bitmap

        var flag = true;

        for (var key in baseTexture._glTextures)
        {
          var otherTex = baseTexture._glTextures[key];

          if (otherTex !== glTexture && otherTex.dirtyId !== baseTexture.dirtyId)
          {
            flag = false;
            break;
          }
        }

        if (flag)
        {
          if (this.bitmap.close)
          {
            this.bitmap.close();
          }

          this.bitmap = null;
        }
      }

      return true;
    };

    /**
     * Destroys this texture
     * @override
     */
    ImageResource.prototype.dispose = function dispose ()
    {
      BaseImageResource.prototype.dispose.call(this);

      if (this.bitmap)
      {
        this.bitmap.close();
        this.bitmap = null;
      }
      this._process = null;
      this._load = null;
    };

    return ImageResource;
  }(BaseImageResource));

  /**
   * Collection of installed resource types, class must extend {@link PIXI.resources.Resource}.
   * @example
   * class CustomResource extends PIXI.resources.Resource {
   *   // MUST have source, options constructor signature
   *   // for auto-detected resources to be created.
   *   constructor(source, options) {
   *     super();
   *   }
   *   upload(renderer, baseTexture, glTexture) {
   *     // upload with GL
   *     return true;
   *   }
   *   // used to auto-detect resource
   *   static test(source, extension) {
   *     return extension === 'xyz'|| source instanceof SomeClass;
   *   }
   * }
   * // Install the new resource type
   * PIXI.resources.INSTALLED.push(CustomResource);
   *
   * @name PIXI.resources.INSTALLED
   * @type {Array<*>}
   * @static
   * @readonly
   */
  var INSTALLED = [];

  /**
   * Create a resource element from a single source element. This
   * auto-detects which type of resource to create. All resources that
   * are auto-detectable must have a static `test` method and a constructor
   * with the arguments `(source, options?)`. Currently, the supported
   * resources for auto-detection include:
   *  - {@link PIXI.resources.ImageResource}
   *  - {@link PIXI.resources.CanvasResource}
   *  - {@link PIXI.resources.VideoResource}
   *  - {@link PIXI.resources.SVGResource}
   *  - {@link PIXI.resources.BufferResource}
   * @static
   * @function PIXI.resources.autoDetectResource
   * @param {string|*} source - Resource source, this can be the URL to the resource,
   *        a typed-array (for BufferResource), HTMLVideoElement, SVG data-uri
   *        or any other resource that can be auto-detected. If not resource is
   *        detected, it's assumed to be an ImageResource.
   * @param {object} [options] - Pass-through options to use for Resource
   * @param {number} [options.width] - Width of BufferResource or SVG rasterization
   * @param {number} [options.height] - Height of BufferResource or SVG rasterization
   * @param {boolean} [options.autoLoad=true] - Image, SVG and Video flag to start loading
   * @param {number} [options.scale=1] - SVG source scale. Overridden by width, height
   * @param {boolean} [options.createBitmap=PIXI.settings.CREATE_IMAGE_BITMAP] - Image option to create Bitmap object
   * @param {boolean} [options.crossorigin=true] - Image and Video option to set crossOrigin
   * @param {boolean} [options.autoPlay=true] - Video option to start playing video immediately
   * @param {number} [options.updateFPS=0] - Video option to update how many times a second the
   *        texture should be updated from the video. Leave at 0 to update at every render
   * @return {PIXI.resources.Resource} The created resource.
   */
  function autoDetectResource(source, options)
  {
    if (!source)
    {
      return null;
    }

    var extension = '';

    if (typeof source === 'string')
    {
      // search for file extension: period, 3-4 chars, then ?, # or EOL
      var result = (/\.(\w{3,4})(?:$|\?|#)/i).exec(source);

      if (result)
      {
        extension = result[1].toLowerCase();
      }
    }

    for (var i = INSTALLED.length - 1; i >= 0; --i)
    {
      var ResourcePlugin = INSTALLED[i];

      if (ResourcePlugin.test && ResourcePlugin.test(source, extension))
      {
        return new ResourcePlugin(source, options);
      }
    }

    // When in doubt: probably an image
    // might be appropriate to throw an error or return null
    return new ImageResource(source, options);
  }

  /**
   * @interface SharedArrayBuffer
   */

  /**
   * Buffer resource with data of typed array.
   * @class
   * @extends PIXI.resources.Resource
   * @memberof PIXI.resources
   */
  var BufferResource = /*@__PURE__*/(function (Resource) {
    function BufferResource(source, options)
    {
      var ref = options || {};
      var width = ref.width;
      var height = ref.height;

      if (!width || !height)
      {
        throw new Error('BufferResource width or height invalid');
      }

      Resource.call(this, width, height);

      /**
       * Source array
       * Cannot be ClampedUint8Array because it cant be uploaded to WebGL
       *
       * @member {Float32Array|Uint8Array|Uint32Array}
       */
      this.data = source;
    }

    if ( Resource ) { BufferResource.__proto__ = Resource; }
    BufferResource.prototype = Object.create( Resource && Resource.prototype );
    BufferResource.prototype.constructor = BufferResource;

    /**
     * Upload the texture to the GPU.
     * @param {PIXI.Renderer} renderer Upload to the renderer
     * @param {PIXI.BaseTexture} baseTexture Reference to parent texture
     * @param {PIXI.GLTexture} glTexture glTexture
     * @returns {boolean} true is success
     */
    BufferResource.prototype.upload = function upload (renderer, baseTexture, glTexture)
    {
      var gl = renderer.gl;

      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, baseTexture.premultiplyAlpha);

      if (glTexture.width === baseTexture.width && glTexture.height === baseTexture.height)
      {
        gl.texSubImage2D(
          baseTexture.target,
          0,
          0,
          0,
          baseTexture.width,
          baseTexture.height,
          baseTexture.format,
          baseTexture.type,
          this.data
        );
      }
      else
      {
        glTexture.width = baseTexture.width;
        glTexture.height = baseTexture.height;

        gl.texImage2D(
          baseTexture.target,
          0,
          glTexture.internalFormat,
          baseTexture.width,
          baseTexture.height,
          0,
          baseTexture.format,
          glTexture.type,
          this.data
        );
      }

      return true;
    };

    /**
     * Destroy and don't use after this
     * @override
     */
    BufferResource.prototype.dispose = function dispose ()
    {
      this.data = null;
    };

    /**
     * Used to auto-detect the type of resource.
     *
     * @static
     * @param {*} source - The source object
     * @return {boolean} `true` if <canvas>
     */
    BufferResource.test = function test (source)
    {
      return source instanceof Float32Array
        || source instanceof Uint8Array
        || source instanceof Uint32Array;
    };

    return BufferResource;
  }(Resource));

  var defaultBufferOptions = {
    scaleMode: SCALE_MODES.NEAREST,
    format: FORMATS.RGBA,
    premultiplyAlpha: false,
  };

  /**
   * A Texture stores the information that represents an image.
   * All textures have a base texture, which contains information about the source.
   * Therefore you can have many textures all using a single BaseTexture
   *
   * @class
   * @extends PIXI.utils.EventEmitter
   * @memberof PIXI
   * @param {PIXI.resources.Resource|string|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement} [resource=null]
   *        The current resource to use, for things that aren't Resource objects, will be converted
   *        into a Resource.
   * @param {Object} [options] - Collection of options
   * @param {PIXI.MIPMAP_MODES} [options.mipmap=PIXI.settings.MIPMAP_TEXTURES] - If mipmapping is enabled for texture
   * @param {number} [options.anisotropicLevel=PIXI.settings.ANISOTROPIC_LEVEL] - Anisotropic filtering level of texture
   * @param {PIXI.WRAP_MODES} [options.wrapMode=PIXI.settings.WRAP_MODE] - Wrap mode for textures
   * @param {PIXI.SCALE_MODES} [options.scaleMode=PIXI.settings.SCALE_MODE] - Default scale mode, linear, nearest
   * @param {PIXI.FORMATS} [options.format=PIXI.FORMATS.RGBA] - GL format type
   * @param {PIXI.TYPES} [options.type=PIXI.TYPES.UNSIGNED_BYTE] - GL data type
   * @param {PIXI.TARGETS} [options.target=PIXI.TARGETS.TEXTURE_2D] - GL texture target
   * @param {boolean} [options.premultiplyAlpha=true] - Pre multiply the image alpha
   * @param {number} [options.width=0] - Width of the texture
   * @param {number} [options.height=0] - Height of the texture
   * @param {number} [options.resolution] - Resolution of the base texture
   * @param {object} [options.resourceOptions] - Optional resource options,
   *        see {@link PIXI.resources.autoDetectResource autoDetectResource}
   */
  var BaseTexture = /*@__PURE__*/(function (EventEmitter) {
    function BaseTexture(resource, options)
    {
      if ( resource === void 0 ) { resource = null; }
      if ( options === void 0 ) { options = null; }

      EventEmitter.call(this);

      options = options || {};

      var premultiplyAlpha = options.premultiplyAlpha;
      var mipmap = options.mipmap;
      var anisotropicLevel = options.anisotropicLevel;
      var scaleMode = options.scaleMode;
      var width = options.width;
      var height = options.height;
      var wrapMode = options.wrapMode;
      var format = options.format;
      var type = options.type;
      var target = options.target;
      var resolution = options.resolution;
      var resourceOptions = options.resourceOptions;

      // Convert the resource to a Resource object
      if (resource && !(resource instanceof Resource))
      {
        resource = autoDetectResource(resource, resourceOptions);
        resource.internal = true;
      }

      /**
       * The width of the base texture set when the image has loaded
       *
       * @readonly
       * @member {number}
       */
      this.width = width || 0;

      /**
       * The height of the base texture set when the image has loaded
       *
       * @readonly
       * @member {number}
       */
      this.height = height || 0;

      /**
       * The resolution / device pixel ratio of the texture
       *
       * @member {number}
       * @default PIXI.settings.RESOLUTION
       */
      this.resolution = resolution || settings.RESOLUTION;

      /**
       * Mipmap mode of the texture, affects downscaled images
       *
       * @member {PIXI.MIPMAP_MODES}
       * @default PIXI.settings.MIPMAP_TEXTURES
       */
      this.mipmap = mipmap !== undefined ? mipmap : settings.MIPMAP_TEXTURES;

      /**
       * Anisotropic filtering level of texture
       *
       * @member {number}
       * @default PIXI.settings.ANISOTROPIC_LEVEL
       */
      this.anisotropicLevel = anisotropicLevel !== undefined ? anisotropicLevel : settings.ANISOTROPIC_LEVEL;

      /**
       * How the texture wraps
       * @member {number}
       */
      this.wrapMode = wrapMode || settings.WRAP_MODE;

      /**
       * The scale mode to apply when scaling this texture
       *
       * @member {PIXI.SCALE_MODES}
       * @default PIXI.settings.SCALE_MODE
       */
      this.scaleMode = scaleMode !== undefined ? scaleMode : settings.SCALE_MODE;

      /**
       * The pixel format of the texture
       *
       * @member {PIXI.FORMATS}
       * @default PIXI.FORMATS.RGBA
       */
      this.format = format || FORMATS.RGBA;

      /**
       * The type of resource data
       *
       * @member {PIXI.TYPES}
       * @default PIXI.TYPES.UNSIGNED_BYTE
       */
      this.type = type || TYPES.UNSIGNED_BYTE;

      /**
       * The target type
       *
       * @member {PIXI.TARGETS}
       * @default PIXI.TARGETS.TEXTURE_2D
       */
      this.target = target || TARGETS.TEXTURE_2D;

      /**
       * Set to true to enable pre-multiplied alpha
       *
       * @member {boolean}
       * @default true
       */
      this.premultiplyAlpha = premultiplyAlpha !== false;

      /**
       * Global unique identifier for this BaseTexture
       *
       * @member {string}
       * @protected
       */
      this.uid = uid();

      /**
       * Used by automatic texture Garbage Collection, stores last GC tick when it was bound
       *
       * @member {number}
       * @protected
       */
      this.touched = 0;

      /**
       * Whether or not the texture is a power of two, try to use power of two textures as much
       * as you can
       *
       * @readonly
       * @member {boolean}
       * @default false
       */
      this.isPowerOfTwo = false;
      this._refreshPOT();

      /**
       * The map of render context textures where this is bound
       *
       * @member {Object}
       * @private
       */
      this._glTextures = {};

      /**
       * Used by TextureSystem to only update texture to the GPU when needed.
       * Please call `update()` to increment it.
       *
       * @readonly
       * @member {number}
       */
      this.dirtyId = 0;

      /**
       * Used by TextureSystem to only update texture style when needed.
       *
       * @protected
       * @member {number}
       */
      this.dirtyStyleId = 0;

      /**
       * Currently default cache ID.
       *
       * @member {string}
       */
      this.cacheId = null;

      /**
       * Generally speaking means when resource is loaded.
       * @readonly
       * @member {boolean}
       */
      this.valid = width > 0 && height > 0;

      /**
       * The collection of alternative cache ids, since some BaseTextures
       * can have more than one ID, short name and longer full URL
       *
       * @member {Array<string>}
       * @readonly
       */
      this.textureCacheIds = [];

      /**
       * Flag if BaseTexture has been destroyed.
       *
       * @member {boolean}
       * @readonly
       */
      this.destroyed = false;

      /**
       * The resource used by this BaseTexture, there can only
       * be one resource per BaseTexture, but textures can share
       * resources.
       *
       * @member {PIXI.resources.Resource}
       * @readonly
       */
      this.resource = null;

      /**
       * Number of the texture batch, used by multi-texture renderers
       *
       * @member {number}
       */
      this._batchEnabled = 0;

      /**
       * Fired when a not-immediately-available source finishes loading.
       *
       * @protected
       * @event PIXI.BaseTexture#loaded
       * @param {PIXI.BaseTexture} baseTexture - Resource loaded.
       */

      /**
       * Fired when a not-immediately-available source fails to load.
       *
       * @protected
       * @event PIXI.BaseTexture#error
       * @param {PIXI.BaseTexture} baseTexture - Resource errored.
       */

      /**
       * Fired when BaseTexture is updated.
       *
       * @protected
       * @event PIXI.BaseTexture#loaded
       * @param {PIXI.BaseTexture} baseTexture - Resource loaded.
       */

      /**
       * Fired when BaseTexture is destroyed.
       *
       * @protected
       * @event PIXI.BaseTexture#error
       * @param {PIXI.BaseTexture} baseTexture - Resource errored.
       */

      /**
       * Fired when BaseTexture is updated.
       *
       * @protected
       * @event PIXI.BaseTexture#update
       * @param {PIXI.BaseTexture} baseTexture - Instance of texture being updated.
       */

      /**
       * Fired when BaseTexture is destroyed.
       *
       * @protected
       * @event PIXI.BaseTexture#dispose
       * @param {PIXI.BaseTexture} baseTexture - Instance of texture being destroyed.
       */

      // Set the resource
      this.setResource(resource);
    }

    if ( EventEmitter ) { BaseTexture.__proto__ = EventEmitter; }
    BaseTexture.prototype = Object.create( EventEmitter && EventEmitter.prototype );
    BaseTexture.prototype.constructor = BaseTexture;

    var prototypeAccessors = { realWidth: { configurable: true },realHeight: { configurable: true } };

    /**
     * Pixel width of the source of this texture
     *
     * @readonly
     * @member {number}
     */
    prototypeAccessors.realWidth.get = function ()
    {
      return Math.ceil(this.width * this.resolution);
    };

    /**
     * Pixel height of the source of this texture
     *
     * @readonly
     * @member {number}
     */
    prototypeAccessors.realHeight.get = function ()
    {
      return Math.ceil(this.height * this.resolution);
    };

    /**
     * Changes style options of BaseTexture
     *
     * @param {PIXI.SCALE_MODES} [scaleMode] - Pixi scalemode
     * @param {PIXI.MIPMAP_MODES} [mipmap] - enable mipmaps
     * @returns {PIXI.BaseTexture} this
     */
    BaseTexture.prototype.setStyle = function setStyle (scaleMode, mipmap)
    {
      var dirty;

      if (scaleMode !== undefined && scaleMode !== this.scaleMode)
      {
        this.scaleMode = scaleMode;
        dirty = true;
      }

      if (mipmap !== undefined && mipmap !== this.mipmap)
      {
        this.mipmap = mipmap;
        dirty = true;
      }

      if (dirty)
      {
        this.dirtyStyleId++;
      }

      return this;
    };

    /**
     * Changes w/h/resolution. Texture becomes valid if width and height are greater than zero.
     *
     * @param {number} width Visual width
     * @param {number} height Visual height
     * @param {number} [resolution] Optionally set resolution
     * @returns {PIXI.BaseTexture} this
     */
    BaseTexture.prototype.setSize = function setSize (width, height, resolution)
    {
      this.resolution = resolution || this.resolution;
      this.width = width;
      this.height = height;
      this._refreshPOT();
      this.update();

      return this;
    };

    /**
     * Sets real size of baseTexture, preserves current resolution.
     *
     * @param {number} realWidth Full rendered width
     * @param {number} realHeight Full rendered height
     * @param {number} [resolution] Optionally set resolution
     * @returns {PIXI.BaseTexture} this
     */
    BaseTexture.prototype.setRealSize = function setRealSize (realWidth, realHeight, resolution)
    {
      this.resolution = resolution || this.resolution;
      this.width = Math.ceil(realWidth / this.resolution);
      this.height = Math.ceil(realHeight / this.resolution);
      this._refreshPOT();
      this.update();

      return this;
    };

    /**
     * Refresh check for isPowerOfTwo texture based on size
     *
     * @private
     */
    BaseTexture.prototype._refreshPOT = function _refreshPOT ()
    {
      this.isPowerOfTwo = isPow2(this.realWidth) && isPow2(this.realHeight);
    };

    /**
     * Changes resolution
     *
     * @param {number} [resolution] res
     * @returns {PIXI.BaseTexture} this
     */
    BaseTexture.prototype.setResolution = function setResolution (resolution)
    {
      var oldResolution = this.resolution;

      if (oldResolution === resolution)
      {
        return this;
      }

      this.resolution = resolution;

      if (this.valid)
      {
        this.width = Math.ceil(this.width * oldResolution / resolution);
        this.height = Math.ceil(this.height * oldResolution / resolution);
        this.emit('update', this);
      }

      this._refreshPOT();

      return this;
    };

    /**
     * Sets the resource if it wasn't set. Throws error if resource already present
     *
     * @param {PIXI.resources.Resource} resource - that is managing this BaseTexture
     * @returns {PIXI.BaseTexture} this
     */
    BaseTexture.prototype.setResource = function setResource (resource)
    {
      if (this.resource === resource)
      {
        return this;
      }

      if (this.resource)
      {
        throw new Error('Resource can be set only once');
      }

      resource.bind(this);

      this.resource = resource;

      return this;
    };

    /**
     * Invalidates the object. Texture becomes valid if width and height are greater than zero.
     */
    BaseTexture.prototype.update = function update ()
    {
      if (!this.valid)
      {
        if (this.width > 0 && this.height > 0)
        {
          this.valid = true;
          this.emit('loaded', this);
          this.emit('update', this);
        }
      }
      else
      {
        this.dirtyId++;
        this.dirtyStyleId++;
        this.emit('update', this);
      }
    };

    /**
     * Destroys this base texture.
     * The method stops if resource doesn't want this texture to be destroyed.
     * Removes texture from all caches.
     */
    BaseTexture.prototype.destroy = function destroy ()
    {
      // remove and destroy the resource
      if (this.resource)
      {
        this.resource.unbind(this);
        // only destroy resourced created internally
        if (this.resource.internal)
        {
          this.resource.destroy();
        }
        this.resource = null;
      }

      if (this.cacheId)
      {
        delete BaseTextureCache[this.cacheId];
        delete TextureCache[this.cacheId];

        this.cacheId = null;
      }

      // finally let the WebGL renderer know..
      this.dispose();

      BaseTexture.removeFromCache(this);
      this.textureCacheIds = null;

      this.destroyed = true;
    };

    /**
     * Frees the texture from WebGL memory without destroying this texture object.
     * This means you can still use the texture later which will upload it to GPU
     * memory again.
     *
     * @fires PIXI.BaseTexture#dispose
     */
    BaseTexture.prototype.dispose = function dispose ()
    {
      this.emit('dispose', this);
    };

    /**
     * Helper function that creates a base texture based on the source you provide.
     * The source can be - image url, image element, canvas element. If the
     * source is an image url or an image element and not in the base texture
     * cache, it will be created and loaded.
     *
     * @static
     * @param {string|HTMLImageElement|HTMLCanvasElement|SVGElement|HTMLVideoElement} source - The
     *        source to create base texture from.
     * @param {object} [options] See {@link PIXI.BaseTexture}'s constructor for options.
     * @returns {PIXI.BaseTexture} The new base texture.
     */
    BaseTexture.from = function from (source, options)
    {
      var cacheId = null;

      if (typeof source === 'string')
      {
        cacheId = source;
      }
      else
      {
        if (!source._pixiId)
        {
          source._pixiId = "pixiid_" + (uid());
        }

        cacheId = source._pixiId;
      }

      var baseTexture = BaseTextureCache[cacheId];

      if (!baseTexture)
      {
        baseTexture = new BaseTexture(source, options);
        baseTexture.cacheId = cacheId;
        BaseTexture.addToCache(baseTexture, cacheId);
      }

      return baseTexture;
    };

    /**
     * Create a new BaseTexture with a BufferResource from a Float32Array.
     * RGBA values are floats from 0 to 1.
     * @static
     * @param {Float32Array|Uint8Array} buffer The optional array to use, if no data
     *        is provided, a new Float32Array is created.
     * @param {number} width - Width of the resource
     * @param {number} height - Height of the resource
     * @param {object} [options] See {@link PIXI.BaseTexture}'s constructor for options.
     * @return {PIXI.BaseTexture} The resulting new BaseTexture
     */
    BaseTexture.fromBuffer = function fromBuffer (buffer, width, height, options)
    {
      buffer = buffer || new Float32Array(width * height * 4);

      var resource = new BufferResource(buffer, { width: width, height: height });
      var type = buffer instanceof Float32Array ? TYPES.FLOAT : TYPES.UNSIGNED_BYTE;

      return new BaseTexture(resource, Object.assign(defaultBufferOptions, options || { width: width, height: height, type: type }));
    };

    /**
     * Adds a BaseTexture to the global BaseTextureCache. This cache is shared across the whole PIXI object.
     *
     * @static
     * @param {PIXI.BaseTexture} baseTexture - The BaseTexture to add to the cache.
     * @param {string} id - The id that the BaseTexture will be stored against.
     */
    BaseTexture.addToCache = function addToCache (baseTexture, id)
    {
      if (id)
      {
        if (baseTexture.textureCacheIds.indexOf(id) === -1)
        {
          baseTexture.textureCacheIds.push(id);
        }

        if (BaseTextureCache[id])
        {
          // eslint-disable-next-line no-console
          console.warn(("BaseTexture added to the cache with an id [" + id + "] that already had an entry"));
        }

        BaseTextureCache[id] = baseTexture;
      }
    };

    /**
     * Remove a BaseTexture from the global BaseTextureCache.
     *
     * @static
     * @param {string|PIXI.BaseTexture} baseTexture - id of a BaseTexture to be removed, or a BaseTexture instance itself.
     * @return {PIXI.BaseTexture|null} The BaseTexture that was removed.
     */
    BaseTexture.removeFromCache = function removeFromCache (baseTexture)
    {
      if (typeof baseTexture === 'string')
      {
        var baseTextureFromCache = BaseTextureCache[baseTexture];

        if (baseTextureFromCache)
        {
          var index = baseTextureFromCache.textureCacheIds.indexOf(baseTexture);

          if (index > -1)
          {
            baseTextureFromCache.textureCacheIds.splice(index, 1);
          }

          delete BaseTextureCache[baseTexture];

          return baseTextureFromCache;
        }
      }
      else if (baseTexture && baseTexture.textureCacheIds)
      {
        for (var i = 0; i < baseTexture.textureCacheIds.length; ++i)
        {
          delete BaseTextureCache[baseTexture.textureCacheIds[i]];
        }

        baseTexture.textureCacheIds.length = 0;

        return baseTexture;
      }

      return null;
    };

    Object.defineProperties( BaseTexture.prototype, prototypeAccessors );

    return BaseTexture;
  }(eventemitter3));

  /**
   * Global number of the texture batch, used by multi-texture renderers
   *
   * @static
   * @member {number}
   */
  BaseTexture._globalBatch = 0;

  /**
   * A resource that contains a number of sources.
   *
   * @class
   * @extends PIXI.resources.Resource
   * @memberof PIXI.resources
   * @param {number|Array<*>} source - Number of items in array or the collection
   *        of image URLs to use. Can also be resources, image elements, canvas, etc.
   * @param {object} [options] Options to apply to {@link PIXI.resources.autoDetectResource}
   * @param {number} [options.width] - Width of the resource
   * @param {number} [options.height] - Height of the resource
   */
  var ArrayResource = /*@__PURE__*/(function (Resource) {
    function ArrayResource(source, options)
    {
      options = options || {};

      var urls;
      var length = source;

      if (Array.isArray(source))
      {
        urls = source;
        length = source.length;
      }

      Resource.call(this, options.width, options.height);

      /**
       * Collection of resources.
       * @member {Array<PIXI.BaseTexture>}
       * @readonly
       */
      this.items = [];

      /**
       * Dirty IDs for each part
       * @member {Array<number>}
       * @readonly
       */
      this.itemDirtyIds = [];

      for (var i = 0; i < length; i++)
      {
        var partTexture = new BaseTexture();

        this.items.push(partTexture);
        this.itemDirtyIds.push(-1);
      }

      /**
       * Number of elements in array
       *
       * @member {number}
       * @readonly
       */
      this.length = length;

      /**
       * Promise when loading
       * @member {Promise}
       * @private
       * @default null
       */
      this._load = null;

      if (urls)
      {
        for (var i$1 = 0; i$1 < length; i$1++)
        {
          this.addResourceAt(autoDetectResource(urls[i$1], options), i$1);
        }
      }
    }

    if ( Resource ) { ArrayResource.__proto__ = Resource; }
    ArrayResource.prototype = Object.create( Resource && Resource.prototype );
    ArrayResource.prototype.constructor = ArrayResource;

    /**
     * Destroy this BaseImageResource
     * @override
     */
    ArrayResource.prototype.dispose = function dispose ()
    {
      for (var i = 0, len = this.length; i < len; i++)
      {
        this.items[i].destroy();
      }
      this.items = null;
      this.itemDirtyIds = null;
      this._load = null;
    };

    /**
     * Set a resource by ID
     *
     * @param {PIXI.resources.Resource} resource
     * @param {number} index - Zero-based index of resource to set
     * @return {PIXI.resources.ArrayResource} Instance for chaining
     */
    ArrayResource.prototype.addResourceAt = function addResourceAt (resource, index)
    {
      var baseTexture = this.items[index];

      if (!baseTexture)
      {
        throw new Error(("Index " + index + " is out of bounds"));
      }

      // Inherit the first resource dimensions
      if (resource.valid && !this.valid)
      {
        this.resize(resource.width, resource.height);
      }

      this.items[index].setResource(resource);

      return this;
    };

    /**
     * Set the parent base texture
     * @member {PIXI.BaseTexture}
     * @override
     */
    ArrayResource.prototype.bind = function bind (baseTexture)
    {
      Resource.prototype.bind.call(this, baseTexture);

      baseTexture.target = TARGETS.TEXTURE_2D_ARRAY;

      for (var i = 0; i < this.length; i++)
      {
        this.items[i].on('update', baseTexture.update, baseTexture);
      }
    };

    /**
     * Unset the parent base texture
     * @member {PIXI.BaseTexture}
     * @override
     */
    ArrayResource.prototype.unbind = function unbind (baseTexture)
    {
      Resource.prototype.unbind.call(this, baseTexture);

      for (var i = 0; i < this.length; i++)
      {
        this.items[i].off('update', baseTexture.update, baseTexture);
      }
    };

    /**
     * Load all the resources simultaneously
     * @override
     * @return {Promise<void>} When load is resolved
     */
    ArrayResource.prototype.load = function load ()
    {
      var this$1 = this;

      if (this._load)
      {
        return this._load;
      }

      var resources = this.items.map(function (item) { return item.resource; });

      // TODO: also implement load part-by-part strategy
      var promises = resources.map(function (item) { return item.load(); });

      this._load = Promise.all(promises)
        .then(function () {
            var ref = resources[0];
            var width = ref.width;
            var height = ref.height;

            this$1.resize(width, height);

            return Promise.resolve(this$1);
          }
        );

      return this._load;
    };

    /**
     * Upload the resources to the GPU.
     * @param {PIXI.Renderer} renderer
     * @param {PIXI.BaseTexture} texture
     * @param {PIXI.GLTexture} glTexture
     * @returns {boolean} whether texture was uploaded
     */
    ArrayResource.prototype.upload = function upload (renderer, texture, glTexture)
    {
      var ref = this;
      var length = ref.length;
      var itemDirtyIds = ref.itemDirtyIds;
      var items = ref.items;
      var gl = renderer.gl;

      if (glTexture.dirtyId < 0)
      {
        gl.texImage3D(
          gl.TEXTURE_2D_ARRAY,
          0,
          texture.format,
          this._width,
          this._height,
          length,
          0,
          texture.format,
          texture.type,
          null
        );
      }

      for (var i = 0; i < length; i++)
      {
        var item = items[i];

        if (itemDirtyIds[i] < item.dirtyId)
        {
          itemDirtyIds[i] = item.dirtyId;
          if (item.valid)
          {
            gl.texSubImage3D(
              gl.TEXTURE_2D_ARRAY,
              0,
              0, // xoffset
              0, // yoffset
              i, // zoffset
              item.resource.width,
              item.resource.height,
              1,
              texture.format,
              texture.type,
              item.resource.source
            );
          }
        }
      }

      return true;
    };

    return ArrayResource;
  }(Resource));

  /**
   * @interface OffscreenCanvas
   */

  /**
   * Resource type for HTMLCanvasElement.
   * @class
   * @extends PIXI.resources.BaseImageResource
   * @memberof PIXI.resources
   * @param {HTMLCanvasElement} source - Canvas element to use
   */
  var CanvasResource = /*@__PURE__*/(function (BaseImageResource) {
    function CanvasResource () {
      BaseImageResource.apply(this, arguments);
    }

    if ( BaseImageResource ) { CanvasResource.__proto__ = BaseImageResource; }
    CanvasResource.prototype = Object.create( BaseImageResource && BaseImageResource.prototype );
    CanvasResource.prototype.constructor = CanvasResource;

    CanvasResource.test = function test (source)
    {
      var OffscreenCanvas = window.OffscreenCanvas;

      // Check for browsers that don't yet support OffscreenCanvas
      if (OffscreenCanvas && source instanceof OffscreenCanvas)
      {
        return true;
      }

      return source instanceof HTMLCanvasElement;
    };

    return CanvasResource;
  }(BaseImageResource));

  /**
   * Resource for a CubeTexture which contains six resources.
   *
   * @class
   * @extends PIXI.resources.ArrayResource
   * @memberof PIXI.resources
   * @param {Array<string|PIXI.resources.Resource>} [source] Collection of URLs or resources
   *        to use as the sides of the cube.
   * @param {object} [options] - ImageResource options
   * @param {number} [options.width] - Width of resource
   * @param {number} [options.height] - Height of resource
   */
  var CubeResource = /*@__PURE__*/(function (ArrayResource) {
    function CubeResource(source, options)
    {
      options = options || {};

      ArrayResource.call(this, source, options);

      if (this.length !== CubeResource.SIDES)
      {
        throw new Error(("Invalid length. Got " + (this.length) + ", expected 6"));
      }

      for (var i = 0; i < CubeResource.SIDES; i++)
      {
        this.items[i].target = TARGETS.TEXTURE_CUBE_MAP_POSITIVE_X + i;
      }

      if (options.autoLoad !== false)
      {
        this.load();
      }
    }

    if ( ArrayResource ) { CubeResource.__proto__ = ArrayResource; }
    CubeResource.prototype = Object.create( ArrayResource && ArrayResource.prototype );
    CubeResource.prototype.constructor = CubeResource;

    /**
     * Add binding
     *
     * @override
     * @param {PIXI.BaseTexture} baseTexture - parent base texture
     */
    CubeResource.prototype.bind = function bind (baseTexture)
    {
      ArrayResource.prototype.bind.call(this, baseTexture);

      baseTexture.target = TARGETS.TEXTURE_CUBE_MAP;
    };

    /**
     * Upload the resource
     *
     * @returns {boolean} true is success
     */
    CubeResource.prototype.upload = function upload (renderer, baseTexture, glTexture)
    {
      var dirty = this.itemDirtyIds;

      for (var i = 0; i < CubeResource.SIDES; i++)
      {
        var side = this.items[i];

        if (dirty[i] < side.dirtyId)
        {
          dirty[i] = side.dirtyId;
          if (side.valid)
          {
            side.resource.upload(renderer, side, glTexture);
          }
        }
      }

      return true;
    };

    return CubeResource;
  }(ArrayResource));

  /**
   * Number of texture sides to store for CubeResources
   *
   * @name PIXI.resources.CubeResource.SIDES
   * @static
   * @member {number}
   * @default 6
   */
  CubeResource.SIDES = 6;

  /**
   * Resource type for SVG elements and graphics.
   * @class
   * @extends PIXI.resources.BaseImageResource
   * @memberof PIXI.resources
   * @param {string} source - Base64 encoded SVG element or URL for SVG file.
   * @param {object} [options] - Options to use
   * @param {number} [options.scale=1] Scale to apply to SVG. Overridden by...
   * @param {number} [options.width] Rasterize SVG this wide. Aspect ratio preserved if height not specified.
   * @param {number} [options.height] Rasterize SVG this high. Aspect ratio preserved if width not specified.
   * @param {boolean} [options.autoLoad=true] Start loading right away.
   */
  var SVGResource = /*@__PURE__*/(function (BaseImageResource) {
    function SVGResource(source, options)
    {
      options = options || {};

      BaseImageResource.call(this, document.createElement('canvas'));
      this._width = 0;
      this._height = 0;

      /**
       * Base64 encoded SVG element or URL for SVG file
       * @readonly
       * @member {string}
       */
      this.svg = source;

      /**
       * The source scale to apply when rasterizing on load
       * @readonly
       * @member {number}
       */
      this.scale = options.scale || 1;

      /**
       * A width override for rasterization on load
       * @readonly
       * @member {number}
       */
      this._overrideWidth = options.width;

      /**
       * A height override for rasterization on load
       * @readonly
       * @member {number}
       */
      this._overrideHeight = options.height;

      /**
       * Call when completely loaded
       * @private
       * @member {function}
       */
      this._resolve = null;

      /**
       * Cross origin value to use
       * @private
       * @member {boolean|string}
       */
      this._crossorigin = options.crossorigin;

      /**
       * Promise when loading
       * @member {Promise<void>}
       * @private
       * @default null
       */
      this._load = null;

      if (options.autoLoad !== false)
      {
        this.load();
      }
    }

    if ( BaseImageResource ) { SVGResource.__proto__ = BaseImageResource; }
    SVGResource.prototype = Object.create( BaseImageResource && BaseImageResource.prototype );
    SVGResource.prototype.constructor = SVGResource;

    SVGResource.prototype.load = function load ()
    {
      var this$1 = this;

      if (this._load)
      {
        return this._load;
      }

      this._load = new Promise(function (resolve) {
        // Save this until after load is finished
        this$1._resolve = function () {
          this$1.resize(this$1.source.width, this$1.source.height);
          resolve(this$1);
        };

        // Convert SVG inline string to data-uri
        if ((/^\<svg/).test(this$1.svg.trim()))
        {
          if (!btoa)
          {
            throw new Error('Your browser doesn\'t support base64 conversions.');
          }
          this$1.svg = "data:image/svg+xml;base64," + (btoa(unescape(encodeURIComponent(this$1.svg))));
        }

        this$1._loadSvg();
      });

      return this._load;
    };

    /**
     * Loads an SVG image from `imageUrl` or `data URL`.
     *
     * @private
     */
    SVGResource.prototype._loadSvg = function _loadSvg ()
    {
      var this$1 = this;

      var tempImage = new Image();

      BaseImageResource.crossOrigin(tempImage, this.svg, this._crossorigin);
      tempImage.src = this.svg;

      tempImage.onload = function () {
        var svgWidth = tempImage.width;
        var svgHeight = tempImage.height;

        if (!svgWidth || !svgHeight)
        {
          throw new Error('The SVG image must have width and height defined (in pixels), canvas API needs them.');
        }

        // Set render size
        var width = svgWidth * this$1.scale;
        var height = svgHeight * this$1.scale;

        if (this$1._overrideWidth || this$1._overrideHeight)
        {
          width = this$1._overrideWidth || this$1._overrideHeight / svgHeight * svgWidth;
          height = this$1._overrideHeight || this$1._overrideWidth / svgWidth * svgHeight;
        }
        width = Math.round(width);
        height = Math.round(height);

        // Create a canvas element
        var canvas = this$1.source;

        canvas.width = width;
        canvas.height = height;
        canvas._pixiId = "canvas_" + (uid());

        // Draw the Svg to the canvas
        canvas
          .getContext('2d')
          .drawImage(tempImage, 0, 0, svgWidth, svgHeight, 0, 0, width, height);

        this$1._resolve();
        this$1._resolve = null;
      };
    };

    /**
     * Get size from an svg string using regexp.
     *
     * @method
     * @param {string} svgString - a serialized svg element
     * @return {PIXI.ISize} image extension
     */
    SVGResource.getSize = function getSize (svgString)
    {
      var sizeMatch = SVGResource.SVG_SIZE.exec(svgString);
      var size = {};

      if (sizeMatch)
      {
        size[sizeMatch[1]] = Math.round(parseFloat(sizeMatch[3]));
        size[sizeMatch[5]] = Math.round(parseFloat(sizeMatch[7]));
      }

      return size;
    };

    /**
     * Destroys this texture
     * @override
     */
    SVGResource.prototype.dispose = function dispose ()
    {
      BaseImageResource.prototype.dispose.call(this);
      this._resolve = null;
      this._crossorigin = null;
    };

    /**
     * Used to auto-detect the type of resource.
     *
     * @static
     * @param {*} source - The source object
     * @param {string} extension - The extension of source, if set
     */
    SVGResource.test = function test (source, extension)
    {
      // url file extension is SVG
      return extension === 'svg'
        // source is SVG data-uri
        || (typeof source === 'string' && source.indexOf('data:image/svg+xml;base64') === 0)
        // source is SVG inline
        || (typeof source === 'string' && source.indexOf('<svg') === 0);
    };

    return SVGResource;
  }(BaseImageResource));

  /**
   * RegExp for SVG size.
   *
   * @static
   * @constant {RegExp|string} SVG_SIZE
   * @memberof PIXI.resources.SVGResource
   * @example &lt;svg width="100" height="100"&gt;&lt;/svg&gt;
   */
  SVGResource.SVG_SIZE = /<svg[^>]*(?:\s(width|height)=('|")(\d*(?:\.\d+)?)(?:px)?('|"))[^>]*(?:\s(width|height)=('|")(\d*(?:\.\d+)?)(?:px)?('|"))[^>]*>/i; // eslint-disable-line max-len

  /**
   * Resource type for HTMLVideoElement.
   * @class
   * @extends PIXI.resources.BaseImageResource
   * @memberof PIXI.resources
   * @param {HTMLVideoElement|object|string|Array<string|object>} source - Video element to use.
   * @param {object} [options] - Options to use
   * @param {boolean} [options.autoLoad=true] - Start loading the video immediately
   * @param {boolean} [options.autoPlay=true] - Start playing video immediately
   * @param {number} [options.updateFPS=0] - How many times a second to update the texture from the video.
   * Leave at 0 to update at every render.
   * @param {boolean} [options.crossorigin=true] - Load image using cross origin
   */
  var VideoResource = /*@__PURE__*/(function (BaseImageResource) {
    function VideoResource(source, options)
    {
      options = options || {};

      if (!(source instanceof HTMLVideoElement))
      {
        var videoElement = document.createElement('video');

        videoElement.setAttribute('webkit-playsinline', '');
        videoElement.setAttribute('playsinline', '');

        if (typeof source === 'string')
        {
          source = [source];
        }

        BaseImageResource.crossOrigin(videoElement, (source[0].src || source[0]), options.crossorigin);

        // array of objects or strings
        for (var i = 0; i < source.length; ++i)
        {
          var sourceElement = document.createElement('source');

          var ref = source[i];
          var src = ref.src;
          var mime = ref.mime;

          src = src || source[i];

          var baseSrc = src.split('?').shift().toLowerCase();
          var ext = baseSrc.substr(baseSrc.lastIndexOf('.') + 1);

          mime = mime || ("video/" + ext);

          sourceElement.src = src;
          sourceElement.type = mime;

          videoElement.appendChild(sourceElement);
        }

        // Override the source
        source = videoElement;
      }

      BaseImageResource.call(this, source);

      this._autoUpdate = true;
      this._isAutoUpdating = false;
      this._updateFPS = options.updateFPS || 0;
      this._msToNextUpdate = 0;

      /**
       * When set to true will automatically play videos used by this texture once
       * they are loaded. If false, it will not modify the playing state.
       *
       * @member {boolean}
       * @default true
       */
      this.autoPlay = options.autoPlay !== false;

      /**
       * Promise when loading
       * @member {Promise<void>}
       * @private
       * @default null
       */
      this._load = null;

      /**
       * Callback when completed with load.
       * @member {function}
       * @private
       */
      this._resolve = null;

      // Bind for listeners
      this._onCanPlay = this._onCanPlay.bind(this);

      if (options.autoLoad !== false)
      {
        this.load();
      }
    }

    if ( BaseImageResource ) { VideoResource.__proto__ = BaseImageResource; }
    VideoResource.prototype = Object.create( BaseImageResource && BaseImageResource.prototype );
    VideoResource.prototype.constructor = VideoResource;

    var prototypeAccessors = { autoUpdate: { configurable: true },updateFPS: { configurable: true } };

    /**
     * Trigger updating of the texture
     *
     * @param {number} [deltaTime=0] - time delta since last tick
     */
    VideoResource.prototype.update = function update (deltaTime)
    {
      if ( deltaTime === void 0 ) { deltaTime = 0; }

      if (!this.destroyed)
      {
        // account for if video has had its playbackRate changed
        var elapsedMS = Ticker.shared.elapsedMS * this.source.playbackRate;

        this._msToNextUpdate = Math.floor(this._msToNextUpdate - elapsedMS);
        if (!this._updateFPS || this._msToNextUpdate <= 0)
        {
          BaseImageResource.prototype.update.call(this, deltaTime);
          this._msToNextUpdate = this._updateFPS ? Math.floor(1000 / this._updateFPS) : 0;
        }
      }
    };

    /**
     * Start preloading the video resource.
     *
     * @protected
     * @return {Promise<void>} Handle the validate event
     */
    VideoResource.prototype.load = function load ()
    {
      var this$1 = this;

      if (this._load)
      {
        return this._load;
      }

      var source = this.source;

      if ((source.readyState === source.HAVE_ENOUGH_DATA || source.readyState === source.HAVE_FUTURE_DATA)
        && source.width && source.height)
      {
        source.complete = true;
      }

      source.addEventListener('play', this._onPlayStart.bind(this));
      source.addEventListener('pause', this._onPlayStop.bind(this));

      if (!this._isSourceReady())
      {
        source.addEventListener('canplay', this._onCanPlay);
        source.addEventListener('canplaythrough', this._onCanPlay);
      }
      else
      {
        this._onCanPlay();
      }

      this._load = new Promise(function (resolve) {
        if (this$1.valid)
        {
          resolve(this$1);
        }
        else
        {
          this$1._resolve = resolve;

          source.load();
        }
      });

      return this._load;
    };

    /**
     * Returns true if the underlying source is playing.
     *
     * @private
     * @return {boolean} True if playing.
     */
    VideoResource.prototype._isSourcePlaying = function _isSourcePlaying ()
    {
      var source = this.source;

      return (source.currentTime > 0 && source.paused === false && source.ended === false && source.readyState > 2);
    };

    /**
     * Returns true if the underlying source is ready for playing.
     *
     * @private
     * @return {boolean} True if ready.
     */
    VideoResource.prototype._isSourceReady = function _isSourceReady ()
    {
      return this.source.readyState === 3 || this.source.readyState === 4;
    };

    /**
     * Runs the update loop when the video is ready to play
     *
     * @private
     */
    VideoResource.prototype._onPlayStart = function _onPlayStart ()
    {
      // Just in case the video has not received its can play even yet..
      if (!this.valid)
      {
        this._onCanPlay();
      }

      if (!this._isAutoUpdating && this.autoUpdate)
      {
        Ticker.shared.add(this.update, this);
        this._isAutoUpdating = true;
      }
    };

    /**
     * Fired when a pause event is triggered, stops the update loop
     *
     * @private
     */
    VideoResource.prototype._onPlayStop = function _onPlayStop ()
    {
      if (this._isAutoUpdating)
      {
        Ticker.shared.remove(this.update, this);
        this._isAutoUpdating = false;
      }
    };

    /**
     * Fired when the video is loaded and ready to play
     *
     * @private
     */
    VideoResource.prototype._onCanPlay = function _onCanPlay ()
    {
      var ref = this;
      var source = ref.source;

      source.removeEventListener('canplay', this._onCanPlay);
      source.removeEventListener('canplaythrough', this._onCanPlay);

      var valid = this.valid;

      this.resize(source.videoWidth, source.videoHeight);

      // prevent multiple loaded dispatches..
      if (!valid && this._resolve)
      {
        this._resolve(this);
        this._resolve = null;
      }

      if (this._isSourcePlaying())
      {
        this._onPlayStart();
      }
      else if (this.autoPlay)
      {
        source.play();
      }
    };

    /**
     * Destroys this texture
     * @override
     */
    VideoResource.prototype.dispose = function dispose ()
    {
      if (this._isAutoUpdating)
      {
        Ticker.shared.remove(this.update, this);
      }

      if (this.source)
      {
        this.source.pause();
        this.source.src = '';
        this.source.load();
      }
      BaseImageResource.prototype.dispose.call(this);
    };

    /**
     * Should the base texture automatically update itself, set to true by default
     *
     * @member {boolean}
     */
    prototypeAccessors.autoUpdate.get = function ()
    {
      return this._autoUpdate;
    };

    prototypeAccessors.autoUpdate.set = function (value) // eslint-disable-line require-jsdoc
    {
      if (value !== this._autoUpdate)
      {
        this._autoUpdate = value;

        if (!this._autoUpdate && this._isAutoUpdating)
        {
          Ticker.shared.remove(this.update, this);
          this._isAutoUpdating = false;
        }
        else if (this._autoUpdate && !this._isAutoUpdating)
        {
          Ticker.shared.add(this.update, this);
          this._isAutoUpdating = true;
        }
      }
    };

    /**
     * How many times a second to update the texture from the video. Leave at 0 to update at every render.
     * A lower fps can help performance, as updating the texture at 60fps on a 30ps video may not be efficient.
     *
     * @member {number}
     */
    prototypeAccessors.updateFPS.get = function ()
    {
      return this._updateFPS;
    };

    prototypeAccessors.updateFPS.set = function (value) // eslint-disable-line require-jsdoc
    {
      if (value !== this._updateFPS)
      {
        this._updateFPS = value;
      }
    };

    /**
     * Used to auto-detect the type of resource.
     *
     * @static
     * @param {*} source - The source object
     * @param {string} extension - The extension of source, if set
     * @return {boolean} `true` if video source
     */
    VideoResource.test = function test (source, extension)
    {
      return (source instanceof HTMLVideoElement)
        || VideoResource.TYPES.indexOf(extension) > -1;
    };

    Object.defineProperties( VideoResource.prototype, prototypeAccessors );

    return VideoResource;
  }(BaseImageResource));

  /**
   * List of common video file extensions supported by VideoResource.
   * @constant
   * @member {Array<string>}
   * @static
   * @readonly
   */
  VideoResource.TYPES = ['mp4', 'm4v', 'webm', 'ogg', 'ogv', 'h264', 'avi', 'mov'];

  /**
   * Resource type for ImageBitmap.
   * @class
   * @extends PIXI.resources.BaseImageResource
   * @memberof PIXI.resources
   * @param {ImageBitmap} source - Image element to use
   */
  var ImageBitmapResource = /*@__PURE__*/(function (BaseImageResource) {
    function ImageBitmapResource () {
      BaseImageResource.apply(this, arguments);
    }

    if ( BaseImageResource ) { ImageBitmapResource.__proto__ = BaseImageResource; }
    ImageBitmapResource.prototype = Object.create( BaseImageResource && BaseImageResource.prototype );
    ImageBitmapResource.prototype.constructor = ImageBitmapResource;

    ImageBitmapResource.test = function test (source)
    {
      return !!window.createImageBitmap && source instanceof ImageBitmap;
    };

    return ImageBitmapResource;
  }(BaseImageResource));

  INSTALLED.push(
    ImageResource,
    ImageBitmapResource,
    CanvasResource,
    VideoResource,
    SVGResource,
    BufferResource,
    CubeResource,
    ArrayResource
  );

  var index = ({
    INSTALLED: INSTALLED,
    autoDetectResource: autoDetectResource,
    ArrayResource: ArrayResource,
    BufferResource: BufferResource,
    CanvasResource: CanvasResource,
    CubeResource: CubeResource,
    ImageResource: ImageResource,
    ImageBitmapResource: ImageBitmapResource,
    SVGResource: SVGResource,
    VideoResource: VideoResource,
    Resource: Resource,
    BaseImageResource: BaseImageResource
  });

  /**
   * System is a base class used for extending systems used by the {@link PIXI.Renderer}
   *
   * @see PIXI.Renderer#addSystem
   * @class
   * @memberof PIXI
   */
  var System = function System(renderer)
  {
    /**
     * The renderer this manager works for.
     *
     * @member {PIXI.Renderer}
     */
    this.renderer = renderer;
  };

  /**
   * Generic destroy methods to be overridden by the subclass
   */
  System.prototype.destroy = function destroy ()
  {
    this.renderer = null;
  };

  /**
   * Resource type for DepthTexture.
   * @class
   * @extends PIXI.resources.BufferResource
   * @memberof PIXI.resources
   */
  var DepthResource = /*@__PURE__*/(function (BufferResource) {
    function DepthResource () {
      BufferResource.apply(this, arguments);
    }

    if ( BufferResource ) { DepthResource.__proto__ = BufferResource; }
    DepthResource.prototype = Object.create( BufferResource && BufferResource.prototype );
    DepthResource.prototype.constructor = DepthResource;

    DepthResource.prototype.upload = function upload (renderer, baseTexture, glTexture)
    {
      var gl = renderer.gl;

      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, baseTexture.premultiplyAlpha);

      if (glTexture.width === baseTexture.width && glTexture.height === baseTexture.height)
      {
        gl.texSubImage2D(
          baseTexture.target,
          0,
          0,
          0,
          baseTexture.width,
          baseTexture.height,
          baseTexture.format,
          baseTexture.type,
          this.data
        );
      }
      else
      {
        glTexture.width = baseTexture.width;
        glTexture.height = baseTexture.height;

        gl.texImage2D(
          baseTexture.target,
          0,
          gl.DEPTH_COMPONENT16, // Needed for depth to render properly in webgl2.0
          baseTexture.width,
          baseTexture.height,
          0,
          baseTexture.format,
          baseTexture.type,
          this.data
        );
      }

      return true;
    };

    return DepthResource;
  }(BufferResource));

  /**
   * Frame buffer used by the BaseRenderTexture
   *
   * @class
   * @memberof PIXI
   */
  var Framebuffer = function Framebuffer(width, height)
  {
    this.width = Math.ceil(width || 100);
    this.height = Math.ceil(height || 100);

    this.stencil = false;
    this.depth = false;

    this.dirtyId = 0;
    this.dirtyFormat = 0;
    this.dirtySize = 0;

    this.depthTexture = null;
    this.colorTextures = [];

    this.glFramebuffers = {};

    this.disposeRunner = new Runner('disposeFramebuffer', 2);
  };

  var prototypeAccessors$1$2 = { colorTexture: { configurable: true } };

  /**
   * Reference to the colorTexture.
   *
   * @member {PIXI.Texture[]}
   * @readonly
   */
  prototypeAccessors$1$2.colorTexture.get = function ()
  {
    return this.colorTextures[0];
  };

  /**
   * Add texture to the colorTexture array
   *
   * @param {number} [index=0] - Index of the array to add the texture to
   * @param {PIXI.Texture} [texture] - Texture to add to the array
   */
  Framebuffer.prototype.addColorTexture = function addColorTexture (index, texture)
  {
    if ( index === void 0 ) { index = 0; }

    // TODO add some validation to the texture - same width / height etc?
    this.colorTextures[index] = texture || new BaseTexture(null, { scaleMode: 0,
      resolution: 1,
      mipmap: false,
      width: this.width,
      height: this.height });// || new Texture();

    this.dirtyId++;
    this.dirtyFormat++;

    return this;
  };

  /**
   * Add a depth texture to the frame buffer
   *
   * @param {PIXI.Texture} [texture] - Texture to add
   */
  Framebuffer.prototype.addDepthTexture = function addDepthTexture (texture)
  {
    /* eslint-disable max-len */
    this.depthTexture = texture || new BaseTexture(new DepthResource(null, { width: this.width, height: this.height }), { scaleMode: 0,
      resolution: 1,
      width: this.width,
      height: this.height,
      mipmap: false,
      format: FORMATS.DEPTH_COMPONENT,
      type: TYPES.UNSIGNED_SHORT });// UNSIGNED_SHORT;
    /* eslint-disable max-len */
    this.dirtyId++;
    this.dirtyFormat++;

    return this;
  };

  /**
   * Enable depth on the frame buffer
   */
  Framebuffer.prototype.enableDepth = function enableDepth ()
  {
    this.depth = true;

    this.dirtyId++;
    this.dirtyFormat++;

    return this;
  };

  /**
   * Enable stencil on the frame buffer
   */
  Framebuffer.prototype.enableStencil = function enableStencil ()
  {
    this.stencil = true;

    this.dirtyId++;
    this.dirtyFormat++;

    return this;
  };

  /**
   * Resize the frame buffer
   *
   * @param {number} width - Width of the frame buffer to resize to
   * @param {number} height - Height of the frame buffer to resize to
   */
  Framebuffer.prototype.resize = function resize (width, height)
  {
    width = Math.ceil(width);
    height = Math.ceil(height);

    if (width === this.width && height === this.height) { return; }

    this.width = width;
    this.height = height;

    this.dirtyId++;
    this.dirtySize++;

    for (var i = 0; i < this.colorTextures.length; i++)
    {
      var texture = this.colorTextures[i];
      var resolution = texture.resolution;

      // take into acount the fact the texture may have a different resolution..
      texture.setSize(width / resolution, height / resolution);
    }

    if (this.depthTexture)
    {
      var resolution$1 = this.depthTexture.resolution;

      this.depthTexture.setSize(width / resolution$1, height / resolution$1);
    }
  };

  /**
   * disposes WebGL resources that are connected to this geometry
   */
  Framebuffer.prototype.dispose = function dispose ()
  {
    this.disposeRunner.run(this, false);
  };

  Object.defineProperties( Framebuffer.prototype, prototypeAccessors$1$2 );

  /**
   * A BaseRenderTexture is a special texture that allows any PixiJS display object to be rendered to it.
   *
   * __Hint__: All DisplayObjects (i.e. Sprites) that render to a BaseRenderTexture should be preloaded
   * otherwise black rectangles will be drawn instead.
   *
   * A BaseRenderTexture takes a snapshot of any Display Object given to its render method. The position
   * and rotation of the given Display Objects is ignored. For example:
   *
   * ```js
   * let renderer = PIXI.autoDetectRenderer();
   * let baseRenderTexture = new PIXI.BaseRenderTexture({ width: 800, height: 600 });
   * let renderTexture = new PIXI.RenderTexture(baseRenderTexture);
   * let sprite = PIXI.Sprite.from("spinObj_01.png");
   *
   * sprite.position.x = 800/2;
   * sprite.position.y = 600/2;
   * sprite.anchor.x = 0.5;
   * sprite.anchor.y = 0.5;
   *
   * renderer.render(sprite, renderTexture);
   * ```
   *
   * The Sprite in this case will be rendered using its local transform. To render this sprite at 0,0
   * you can clear the transform
   *
   * ```js
   *
   * sprite.setTransform()
   *
   * let baseRenderTexture = new PIXI.BaseRenderTexture({ width: 100, height: 100 });
   * let renderTexture = new PIXI.RenderTexture(baseRenderTexture);
   *
   * renderer.render(sprite, renderTexture);  // Renders to center of RenderTexture
   * ```
   *
   * @class
   * @extends PIXI.BaseTexture
   * @memberof PIXI
   */
  var BaseRenderTexture = /*@__PURE__*/(function (BaseTexture) {
    function BaseRenderTexture(options)
    {
      if (typeof options === 'number')
      {
        /* eslint-disable prefer-rest-params */
        // Backward compatibility of signature
        var width$1 = arguments[0];
        var height$1 = arguments[1];
        var scaleMode = arguments[2];
        var resolution = arguments[3];

        options = { width: width$1, height: height$1, scaleMode: scaleMode, resolution: resolution };
        /* eslint-enable prefer-rest-params */
      }

      BaseTexture.call(this, null, options);

      var ref = options || {};
      var width = ref.width;
      var height = ref.height;

      // Set defaults
      this.mipmap = false;
      this.width = Math.ceil(width) || 100;
      this.height = Math.ceil(height) || 100;
      this.valid = true;

      /**
       * A reference to the canvas render target (we only need one as this can be shared across renderers)
       *
       * @protected
       * @member {object}
       */
      this._canvasRenderTarget = null;

      this.clearColor = [0, 0, 0, 0];

      this.framebuffer = new Framebuffer(this.width * this.resolution, this.height * this.resolution)
        .addColorTexture(0, this)
        .enableStencil();

      // TODO - could this be added the systems?

      /**
       * The data structure for the stencil masks.
       *
       * @member {PIXI.Graphics[]}
       */
      this.stencilMaskStack = [];

      /**
       * The data structure for the filters.
       *
       * @member {PIXI.Graphics[]}
       */
      this.filterStack = [{}];
    }

    if ( BaseTexture ) { BaseRenderTexture.__proto__ = BaseTexture; }
    BaseRenderTexture.prototype = Object.create( BaseTexture && BaseTexture.prototype );
    BaseRenderTexture.prototype.constructor = BaseRenderTexture;

    /**
     * Resizes the BaseRenderTexture.
     *
     * @param {number} width - The width to resize to.
     * @param {number} height - The height to resize to.
     */
    BaseRenderTexture.prototype.resize = function resize (width, height)
    {
      width = Math.ceil(width);
      height = Math.ceil(height);
      this.framebuffer.resize(width * this.resolution, height * this.resolution);
    };

    /**
     * Frees the texture and framebuffer from WebGL memory without destroying this texture object.
     * This means you can still use the texture later which will upload it to GPU
     * memory again.
     *
     * @fires PIXI.BaseTexture#dispose
     */
    BaseRenderTexture.prototype.dispose = function dispose ()
    {
      this.framebuffer.dispose();

      BaseTexture.prototype.dispose.call(this);
    };

    /**
     * Destroys this texture.
     *
     */
    BaseRenderTexture.prototype.destroy = function destroy ()
    {
      BaseTexture.prototype.destroy.call(this, true);

      this.framebuffer = null;
    };

    return BaseRenderTexture;
  }(BaseTexture));

  /**
   * Stores a texture's frame in UV coordinates, in
   * which everything lies in the rectangle `[(0,0), (1,0),
   * (1,1), (0,1)]`.
   *
   * | Corner       | Coordinates |
   * |--------------|-------------|
   * | Top-Left     | `(x0,y0)`   |
   * | Top-Right    | `(x1,y1)`   |
   * | Bottom-Right | `(x2,y2)`   |
   * | Bottom-Left  | `(x3,y3)`   |
   *
   * @class
   * @protected
   * @memberof PIXI
   */
  var TextureUvs = function TextureUvs()
  {
    /**
     * X-component of top-left corner `(x0,y0)`.
     *
     * @member {number}
     */
    this.x0 = 0;

    /**
     * Y-component of top-left corner `(x0,y0)`.
     *
     * @member {number}
     */
    this.y0 = 0;

    /**
     * X-component of top-right corner `(x1,y1)`.
     *
     * @member {number}
     */
    this.x1 = 1;

    /**
     * Y-component of top-right corner `(x1,y1)`.
     *
     * @member {number}
     */
    this.y1 = 0;

    /**
     * X-component of bottom-right corner `(x2,y2)`.
     *
     * @member {number}
     */
    this.x2 = 1;

    /**
     * Y-component of bottom-right corner `(x2,y2)`.
     *
     * @member {number}
     */
    this.y2 = 1;

    /**
     * X-component of bottom-left corner `(x3,y3)`.
     *
     * @member {number}
     */
    this.x3 = 0;

    /**
     * Y-component of bottom-right corner `(x3,y3)`.
     *
     * @member {number}
     */
    this.y3 = 1;

    this.uvsFloat32 = new Float32Array(8);
  };

  /**
   * Sets the texture Uvs based on the given frame information.
   *
   * @protected
   * @param {PIXI.Rectangle} frame - The frame of the texture
   * @param {PIXI.Rectangle} baseFrame - The base frame of the texture
   * @param {number} rotate - Rotation of frame, see {@link PIXI.GroupD8}
   */
  TextureUvs.prototype.set = function set (frame, baseFrame, rotate)
  {
    var tw = baseFrame.width;
    var th = baseFrame.height;

    if (rotate)
    {
      // width and height div 2 div baseFrame size
      var w2 = frame.width / 2 / tw;
      var h2 = frame.height / 2 / th;

      // coordinates of center
      var cX = (frame.x / tw) + w2;
      var cY = (frame.y / th) + h2;

      rotate = GroupD8.add(rotate, GroupD8.NW); // NW is top-left corner
      this.x0 = cX + (w2 * GroupD8.uX(rotate));
      this.y0 = cY + (h2 * GroupD8.uY(rotate));

      rotate = GroupD8.add(rotate, 2); // rotate 90 degrees clockwise
      this.x1 = cX + (w2 * GroupD8.uX(rotate));
      this.y1 = cY + (h2 * GroupD8.uY(rotate));

      rotate = GroupD8.add(rotate, 2);
      this.x2 = cX + (w2 * GroupD8.uX(rotate));
      this.y2 = cY + (h2 * GroupD8.uY(rotate));

      rotate = GroupD8.add(rotate, 2);
      this.x3 = cX + (w2 * GroupD8.uX(rotate));
      this.y3 = cY + (h2 * GroupD8.uY(rotate));
    }
    else
    {
      this.x0 = frame.x / tw;
      this.y0 = frame.y / th;

      this.x1 = (frame.x + frame.width) / tw;
      this.y1 = frame.y / th;

      this.x2 = (frame.x + frame.width) / tw;
      this.y2 = (frame.y + frame.height) / th;

      this.x3 = frame.x / tw;
      this.y3 = (frame.y + frame.height) / th;
    }

    this.uvsFloat32[0] = this.x0;
    this.uvsFloat32[1] = this.y0;
    this.uvsFloat32[2] = this.x1;
    this.uvsFloat32[3] = this.y1;
    this.uvsFloat32[4] = this.x2;
    this.uvsFloat32[5] = this.y2;
    this.uvsFloat32[6] = this.x3;
    this.uvsFloat32[7] = this.y3;
  };

  var DEFAULT_UVS = new TextureUvs();

  /**
   * A texture stores the information that represents an image or part of an image.
   *
   * It cannot be added to the display list directly; instead use it as the texture for a Sprite.
   * If no frame is provided for a texture, then the whole image is used.
   *
   * You can directly create a texture from an image and then reuse it multiple times like this :
   *
   * ```js
   * let texture = PIXI.Texture.from('assets/image.png');
   * let sprite1 = new PIXI.Sprite(texture);
   * let sprite2 = new PIXI.Sprite(texture);
   * ```
   *
   * If you didnt pass the texture frame to constructor, it enables `noFrame` mode:
   * it subscribes on baseTexture events, it automatically resizes at the same time as baseTexture.
   *
   * Textures made from SVGs, loaded or not, cannot be used before the file finishes processing.
   * You can check for this by checking the sprite's _textureID property.
   * ```js
   * var texture = PIXI.Texture.from('assets/image.svg');
   * var sprite1 = new PIXI.Sprite(texture);
   * //sprite1._textureID should not be undefined if the texture has finished processing the SVG file
   * ```
   * You can use a ticker or rAF to ensure your sprites load the finished textures after processing. See issue #3068.
   *
   * @class
   * @extends PIXI.utils.EventEmitter
   * @memberof PIXI
   */
  var Texture = /*@__PURE__*/(function (EventEmitter) {
    function Texture(baseTexture, frame, orig, trim, rotate, anchor)
    {
      EventEmitter.call(this);

      /**
       * Does this Texture have any frame data assigned to it?
       *
       * This mode is enabled automatically if no frame was passed inside constructor.
       *
       * In this mode texture is subscribed to baseTexture events, and fires `update` on any change.
       *
       * Beware, after loading or resize of baseTexture event can fired two times!
       * If you want more control, subscribe on baseTexture itself.
       *
       * ```js
       * texture.on('update', () => {});
       * ```
       *
       * Any assignment of `frame` switches off `noFrame` mode.
       *
       * @member {boolean}
       */
      this.noFrame = false;

      if (!frame)
      {
        this.noFrame = true;
        frame = new Rectangle(0, 0, 1, 1);
      }

      if (baseTexture instanceof Texture)
      {
        baseTexture = baseTexture.baseTexture;
      }

      /**
       * The base texture that this texture uses.
       *
       * @member {PIXI.BaseTexture}
       */
      this.baseTexture = baseTexture;

      /**
       * This is the area of the BaseTexture image to actually copy to the Canvas / WebGL when rendering,
       * irrespective of the actual frame size or placement (which can be influenced by trimmed texture atlases)
       *
       * @member {PIXI.Rectangle}
       */
      this._frame = frame;

      /**
       * This is the trimmed area of original texture, before it was put in atlas
       * Please call `updateUvs()` after you change coordinates of `trim` manually.
       *
       * @member {PIXI.Rectangle}
       */
      this.trim = trim;

      /**
       * This will let the renderer know if the texture is valid. If it's not then it cannot be rendered.
       *
       * @member {boolean}
       */
      this.valid = false;

      /**
       * This will let a renderer know that a texture has been updated (used mainly for WebGL uv updates)
       *
       * @member {boolean}
       */
      this.requiresUpdate = false;

      /**
       * The WebGL UV data cache. Can be used as quad UV
       *
       * @member {PIXI.TextureUvs}
       * @protected
       */
      this._uvs = DEFAULT_UVS;

      /**
       * Default TextureMatrix instance for this texture
       * By default that object is not created because its heavy
       *
       * @member {PIXI.TextureMatrix}
       */
      this.uvMatrix = null;

      /**
       * This is the area of original texture, before it was put in atlas
       *
       * @member {PIXI.Rectangle}
       */
      this.orig = orig || frame;// new Rectangle(0, 0, 1, 1);

      this._rotate = Number(rotate || 0);

      if (rotate === true)
      {
        // this is old texturepacker legacy, some games/libraries are passing "true" for rotated textures
        this._rotate = 2;
      }
      else if (this._rotate % 2 !== 0)
      {
        throw new Error('attempt to use diamond-shaped UVs. If you are sure, set rotation manually');
      }

      /**
       * Anchor point that is used as default if sprite is created with this texture.
       * Changing the `defaultAnchor` at a later point of time will not update Sprite's anchor point.
       * @member {PIXI.Point}
       * @default {0,0}
       */
      this.defaultAnchor = anchor ? new Point(anchor.x, anchor.y) : new Point(0, 0);

      /**
       * Update ID is observed by sprites and TextureMatrix instances.
       * Call updateUvs() to increment it.
       *
       * @member {number}
       * @protected
       */

      this._updateID = 0;

      /**
       * The ids under which this Texture has been added to the texture cache. This is
       * automatically set as long as Texture.addToCache is used, but may not be set if a
       * Texture is added directly to the TextureCache array.
       *
       * @member {string[]}
       */
      this.textureCacheIds = [];

      if (!baseTexture.valid)
      {
        baseTexture.once('loaded', this.onBaseTextureUpdated, this);
      }
      else if (this.noFrame)
      {
        // if there is no frame we should monitor for any base texture changes..
        if (baseTexture.valid)
        {
          this.onBaseTextureUpdated(baseTexture);
        }
      }
      else
      {
        this.frame = frame;
      }

      if (this.noFrame)
      {
        baseTexture.on('update', this.onBaseTextureUpdated, this);
      }
    }

    if ( EventEmitter ) { Texture.__proto__ = EventEmitter; }
    Texture.prototype = Object.create( EventEmitter && EventEmitter.prototype );
    Texture.prototype.constructor = Texture;

    var prototypeAccessors = { frame: { configurable: true },rotate: { configurable: true },width: { configurable: true },height: { configurable: true } };

    /**
     * Updates this texture on the gpu.
     *
     * Calls the TextureResource update.
     *
     * If you adjusted `frame` manually, please call `updateUvs()` instead.
     *
     */
    Texture.prototype.update = function update ()
    {
      if (this.baseTexture.resource)
      {
        this.baseTexture.resource.update();
      }
    };

    /**
     * Called when the base texture is updated
     *
     * @protected
     * @param {PIXI.BaseTexture} baseTexture - The base texture.
     */
    Texture.prototype.onBaseTextureUpdated = function onBaseTextureUpdated (baseTexture)
    {
      if (this.noFrame)
      {
        if (!this.baseTexture.valid)
        {
          return;
        }

        this._frame.width = baseTexture.width;
        this._frame.height = baseTexture.height;
        this.valid = true;
        this.updateUvs();
      }
      else
      {
        // TODO this code looks confusing.. boo to abusing getters and setters!
        // if user gave us frame that has bigger size than resized texture it can be a problem
        this.frame = this._frame;
      }

      this.emit('update', this);
    };

    /**
     * Destroys this texture
     *
     * @param {boolean} [destroyBase=false] Whether to destroy the base texture as well
     */
    Texture.prototype.destroy = function destroy (destroyBase)
    {
      if (this.baseTexture)
      {
        if (destroyBase)
        {
          var ref = this.baseTexture;
          var resource = ref.resource;

          // delete the texture if it exists in the texture cache..
          // this only needs to be removed if the base texture is actually destroyed too..
          if (resource && TextureCache[resource.url])
          {
            Texture.removeFromCache(resource.url);
          }

          this.baseTexture.destroy();
        }

        this.baseTexture.off('update', this.onBaseTextureUpdated, this);

        this.baseTexture = null;
      }

      this._frame = null;
      this._uvs = null;
      this.trim = null;
      this.orig = null;

      this.valid = false;

      Texture.removeFromCache(this);
      this.textureCacheIds = null;
    };

    /**
     * Creates a new texture object that acts the same as this one.
     *
     * @return {PIXI.Texture} The new texture
     */
    Texture.prototype.clone = function clone ()
    {
      return new Texture(this.baseTexture, this.frame, this.orig, this.trim, this.rotate, this.defaultAnchor);
    };

    /**
     * Updates the internal WebGL UV cache. Use it after you change `frame` or `trim` of the texture.
     * Call it after changing the frame
     */
    Texture.prototype.updateUvs = function updateUvs ()
    {
      if (this._uvs === DEFAULT_UVS)
      {
        this._uvs = new TextureUvs();
      }

      this._uvs.set(this._frame, this.baseTexture, this.rotate);

      this._updateID++;
    };

    /**
     * Helper function that creates a new Texture based on the source you provide.
     * The source can be - frame id, image url, video url, canvas element, video element, base texture
     *
     * @static
     * @param {number|string|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|PIXI.BaseTexture} source
     *        Source to create texture from
     * @param {object} [options] See {@link PIXI.BaseTexture}'s constructor for options.
     * @return {PIXI.Texture} The newly created texture
     */
    Texture.from = function from (source, options)
    {
      if ( options === void 0 ) { options = {}; }

      var cacheId = null;

      if (typeof source === 'string')
      {
        cacheId = source;
      }
      else
      {
        if (!source._pixiId)
        {
          source._pixiId = "pixiid_" + (uid());
        }

        cacheId = source._pixiId;
      }

      var texture = TextureCache[cacheId];

      if (!texture)
      {
        if (!options.resolution)
        {
          options.resolution = getResolutionOfUrl(source);
        }

        texture = new Texture(new BaseTexture(source, options));
        texture.baseTexture.cacheId = cacheId;

        BaseTexture.addToCache(texture.baseTexture, cacheId);
        Texture.addToCache(texture, cacheId);
      }

      // lets assume its a base texture!
      return texture;
    };

    /**
     * Create a new Texture with a BufferResource from a Float32Array.
     * RGBA values are floats from 0 to 1.
     * @static
     * @param {Float32Array|Uint8Array} buffer The optional array to use, if no data
     *        is provided, a new Float32Array is created.
     * @param {number} width - Width of the resource
     * @param {number} height - Height of the resource
     * @param {object} [options] See {@link PIXI.BaseTexture}'s constructor for options.
     * @return {PIXI.Texture} The resulting new BaseTexture
     */
    Texture.fromBuffer = function fromBuffer (buffer, width, height, options)
    {
      return new Texture(BaseTexture.fromBuffer(buffer, width, height, options));
    };

    /**
     * Create a texture from a source and add to the cache.
     *
     * @static
     * @param {HTMLImageElement|HTMLCanvasElement} source - The input source.
     * @param {String} imageUrl - File name of texture, for cache and resolving resolution.
     * @param {String} [name] - Human readable name for the texture cache. If no name is
     *        specified, only `imageUrl` will be used as the cache ID.
     * @return {PIXI.Texture} Output texture
     */
    Texture.fromLoader = function fromLoader (source, imageUrl, name)
    {
      var resource = new ImageResource(source);

      resource.url = imageUrl;

      var baseTexture = new BaseTexture(resource, {
        scaleMode: settings.SCALE_MODE,
        resolution: getResolutionOfUrl(imageUrl),
      });

      var texture = new Texture(baseTexture);

      // No name, use imageUrl instead
      if (!name)
      {
        name = imageUrl;
      }

      // lets also add the frame to pixi's global cache for 'fromLoader' function
      BaseTexture.addToCache(texture.baseTexture, name);
      Texture.addToCache(texture, name);

      // also add references by url if they are different.
      if (name !== imageUrl)
      {
        BaseTexture.addToCache(texture.baseTexture, imageUrl);
        Texture.addToCache(texture, imageUrl);
      }

      return texture;
    };

    /**
     * Adds a Texture to the global TextureCache. This cache is shared across the whole PIXI object.
     *
     * @static
     * @param {PIXI.Texture} texture - The Texture to add to the cache.
     * @param {string} id - The id that the Texture will be stored against.
     */
    Texture.addToCache = function addToCache (texture, id)
    {
      if (id)
      {
        if (texture.textureCacheIds.indexOf(id) === -1)
        {
          texture.textureCacheIds.push(id);
        }

        if (TextureCache[id])
        {
          // eslint-disable-next-line no-console
          console.warn(("Texture added to the cache with an id [" + id + "] that already had an entry"));
        }

        TextureCache[id] = texture;
      }
    };

    /**
     * Remove a Texture from the global TextureCache.
     *
     * @static
     * @param {string|PIXI.Texture} texture - id of a Texture to be removed, or a Texture instance itself
     * @return {PIXI.Texture|null} The Texture that was removed
     */
    Texture.removeFromCache = function removeFromCache (texture)
    {
      if (typeof texture === 'string')
      {
        var textureFromCache = TextureCache[texture];

        if (textureFromCache)
        {
          var index = textureFromCache.textureCacheIds.indexOf(texture);

          if (index > -1)
          {
            textureFromCache.textureCacheIds.splice(index, 1);
          }

          delete TextureCache[texture];

          return textureFromCache;
        }
      }
      else if (texture && texture.textureCacheIds)
      {
        for (var i = 0; i < texture.textureCacheIds.length; ++i)
        {
          // Check that texture matches the one being passed in before deleting it from the cache.
          if (TextureCache[texture.textureCacheIds[i]] === texture)
          {
            delete TextureCache[texture.textureCacheIds[i]];
          }
        }

        texture.textureCacheIds.length = 0;

        return texture;
      }

      return null;
    };

    /**
     * The frame specifies the region of the base texture that this texture uses.
     * Please call `updateUvs()` after you change coordinates of `frame` manually.
     *
     * @member {PIXI.Rectangle}
     */
    prototypeAccessors.frame.get = function ()
    {
      return this._frame;
    };

    prototypeAccessors.frame.set = function (frame) // eslint-disable-line require-jsdoc
    {
      this._frame = frame;

      this.noFrame = false;

      var x = frame.x;
      var y = frame.y;
      var width = frame.width;
      var height = frame.height;
      var xNotFit = x + width > this.baseTexture.width;
      var yNotFit = y + height > this.baseTexture.height;

      if (xNotFit || yNotFit)
      {
        var relationship = xNotFit && yNotFit ? 'and' : 'or';
        var errorX = "X: " + x + " + " + width + " = " + (x + width) + " > " + (this.baseTexture.width);
        var errorY = "Y: " + y + " + " + height + " = " + (y + height) + " > " + (this.baseTexture.height);

        throw new Error('Texture Error: frame does not fit inside the base Texture dimensions: '
          + errorX + " " + relationship + " " + errorY);
      }

      this.valid = width && height && this.baseTexture.valid;

      if (!this.trim && !this.rotate)
      {
        this.orig = frame;
      }

      if (this.valid)
      {
        this.updateUvs();
      }
    };

    /**
     * Indicates whether the texture is rotated inside the atlas
     * set to 2 to compensate for texture packer rotation
     * set to 6 to compensate for spine packer rotation
     * can be used to rotate or mirror sprites
     * See {@link PIXI.GroupD8} for explanation
     *
     * @member {number}
     */
    prototypeAccessors.rotate.get = function ()
    {
      return this._rotate;
    };

    prototypeAccessors.rotate.set = function (rotate) // eslint-disable-line require-jsdoc
    {
      this._rotate = rotate;
      if (this.valid)
      {
        this.updateUvs();
      }
    };

    /**
     * The width of the Texture in pixels.
     *
     * @member {number}
     */
    prototypeAccessors.width.get = function ()
    {
      return this.orig.width;
    };

    /**
     * The height of the Texture in pixels.
     *
     * @member {number}
     */
    prototypeAccessors.height.get = function ()
    {
      return this.orig.height;
    };

    Object.defineProperties( Texture.prototype, prototypeAccessors );

    return Texture;
  }(eventemitter3));

  function createWhiteTexture()
  {
    var canvas = document.createElement('canvas');

    canvas.width = 16;
    canvas.height = 16;

    var context = canvas.getContext('2d');

    context.fillStyle = 'white';
    context.fillRect(0, 0, 16, 16);

    return new Texture(new BaseTexture(new CanvasResource(canvas)));
  }

  function removeAllHandlers(tex)
  {
    tex.destroy = function _emptyDestroy() { /* empty */ };
    tex.on = function _emptyOn() { /* empty */ };
    tex.once = function _emptyOnce() { /* empty */ };
    tex.emit = function _emptyEmit() { /* empty */ };
  }

  /**
   * An empty texture, used often to not have to create multiple empty textures.
   * Can not be destroyed.
   *
   * @static
   * @constant
   * @member {PIXI.Texture}
   */
  Texture.EMPTY = new Texture(new BaseTexture());
  removeAllHandlers(Texture.EMPTY);
  removeAllHandlers(Texture.EMPTY.baseTexture);

  /**
   * A white texture of 10x10 size, used for graphics and other things
   * Can not be destroyed.
   *
   * @static
   * @constant
   * @member {PIXI.Texture}
   */
  Texture.WHITE = createWhiteTexture();
  removeAllHandlers(Texture.WHITE);
  removeAllHandlers(Texture.WHITE.baseTexture);

  /**
   * A RenderTexture is a special texture that allows any PixiJS display object to be rendered to it.
   *
   * __Hint__: All DisplayObjects (i.e. Sprites) that render to a RenderTexture should be preloaded
   * otherwise black rectangles will be drawn instead.
   *
   * __Hint-2__: The actual memory allocation will happen on first render.
   * You shouldn't create renderTextures each frame just to delete them after, try to reuse them.
   *
   * A RenderTexture takes a snapshot of any Display Object given to its render method. For example:
   *
   * ```js
   * let renderer = PIXI.autoDetectRenderer();
   * let renderTexture = PIXI.RenderTexture.create(800, 600);
   * let sprite = PIXI.Sprite.from("spinObj_01.png");
   *
   * sprite.position.x = 800/2;
   * sprite.position.y = 600/2;
   * sprite.anchor.x = 0.5;
   * sprite.anchor.y = 0.5;
   *
   * renderer.render(sprite, renderTexture);
   * ```
   *
   * The Sprite in this case will be rendered using its local transform. To render this sprite at 0,0
   * you can clear the transform
   *
   * ```js
   *
   * sprite.setTransform()
   *
   * let renderTexture = new PIXI.RenderTexture.create(100, 100);
   *
   * renderer.render(sprite, renderTexture);  // Renders to center of RenderTexture
   * ```
   *
   * @class
   * @extends PIXI.Texture
   * @memberof PIXI
   */
  var RenderTexture = /*@__PURE__*/(function (Texture) {
    function RenderTexture(baseRenderTexture, frame)
    {
      // support for legacy..
      var _legacyRenderer = null;

      if (!(baseRenderTexture instanceof BaseRenderTexture))
      {
        /* eslint-disable prefer-rest-params, no-console */
        var width = arguments[1];
        var height = arguments[2];
        var scaleMode = arguments[3];
        var resolution = arguments[4];

        // we have an old render texture..
        console.warn(("Please use RenderTexture.create(" + width + ", " + height + ") instead of the ctor directly."));
        _legacyRenderer = arguments[0];
        /* eslint-enable prefer-rest-params, no-console */

        frame = null;
        baseRenderTexture = new BaseRenderTexture({
          width: width,
          height: height,
          scaleMode: scaleMode,
          resolution: resolution,
        });
      }

      /**
       * The base texture object that this texture uses
       *
       * @member {PIXI.BaseTexture}
       */
      Texture.call(this, baseRenderTexture, frame);

      this.legacyRenderer = _legacyRenderer;

      /**
       * This will let the renderer know if the texture is valid. If it's not then it cannot be rendered.
       *
       * @member {boolean}
       */
      this.valid = true;

      /**
       * FilterSystem temporary storage
       * @protected
       * @member {PIXI.Rectangle}
       */
      this.filterFrame = null;

      /**
       * The key for pooled texture of FilterSystem
       * @protected
       * @member {string}
       */
      this.filterPoolKey = null;

      this.updateUvs();
    }

    if ( Texture ) { RenderTexture.__proto__ = Texture; }
    RenderTexture.prototype = Object.create( Texture && Texture.prototype );
    RenderTexture.prototype.constructor = RenderTexture;

    /**
     * Resizes the RenderTexture.
     *
     * @param {number} width - The width to resize to.
     * @param {number} height - The height to resize to.
     * @param {boolean} [resizeBaseTexture=true] - Should the baseTexture.width and height values be resized as well?
     */
    RenderTexture.prototype.resize = function resize (width, height, resizeBaseTexture)
    {
      if ( resizeBaseTexture === void 0 ) { resizeBaseTexture = true; }

      width = Math.ceil(width);
      height = Math.ceil(height);

      // TODO - could be not required..
      this.valid = (width > 0 && height > 0);

      this._frame.width = this.orig.width = width;
      this._frame.height = this.orig.height = height;

      if (resizeBaseTexture)
      {
        this.baseTexture.resize(width, height);
      }

      this.updateUvs();
    };

    /**
     * Changes the resolution of baseTexture, but does not change framebuffer size.
     *
     * @param {number} resolution - The new resolution to apply to RenderTexture
     */
    RenderTexture.prototype.setResolution = function setResolution (resolution)
    {
      var ref = this;
      var baseTexture = ref.baseTexture;

      if (baseTexture.resolution === resolution)
      {
        return;
      }

      baseTexture.setResolution(resolution);
      this.resize(baseTexture.width, baseTexture.height, false);
    };

    /**
     * A short hand way of creating a render texture.
     *
     * @param {object} [options] - Options
     * @param {number} [options.width=100] - The width of the render texture
     * @param {number} [options.height=100] - The height of the render texture
     * @param {number} [options.scaleMode=PIXI.settings.SCALE_MODE] - See {@link PIXI.SCALE_MODES} for possible values
     * @param {number} [options.resolution=1] - The resolution / device pixel ratio of the texture being generated
     * @return {PIXI.RenderTexture} The new render texture
     */
    RenderTexture.create = function create (options)
    {
      // fallback, old-style: create(width, height, scaleMode, resolution)
      if (typeof options === 'number')
      {
        /* eslint-disable prefer-rest-params */
        options = {
          width: options,
          height: arguments[1],
          scaleMode: arguments[2],
          resolution: arguments[3],
        };
        /* eslint-enable prefer-rest-params */
      }

      return new RenderTexture(new BaseRenderTexture(options));
    };

    return RenderTexture;
  }(Texture));

  /**
   * Experimental!
   *
   * Texture pool, used by FilterSystem and plugins
   * Stores collection of temporary pow2 or screen-sized renderTextures
   *
   * @class
   * @memberof PIXI
   */
  var RenderTexturePool = function RenderTexturePool(textureOptions)
  {
    this.texturePool = {};
    this.textureOptions = textureOptions || {};
    /**
     * Allow renderTextures of the same size as screen, not just pow2
     *
     * Automatically sets to true after `setScreenSize`
     *
     * @member {boolean}
     * @default false
     */
    this.enableFullScreen = false;

    this._pixelsWidth = 0;
    this._pixelsHeight = 0;
  };

  /**
   * creates of texture with params that were specified in pool constructor
   *
   * @param {number} realWidth width of texture in pixels
   * @param {number} realHeight height of texture in pixels
   * @returns {RenderTexture}
   */
  RenderTexturePool.prototype.createTexture = function createTexture (realWidth, realHeight)
  {
    var baseRenderTexture = new BaseRenderTexture(Object.assign({
      width: realWidth,
      height: realHeight,
    }, this.textureOptions));

    return new RenderTexture(baseRenderTexture);
  };

  /**
   * Gets a Power-of-Two render texture or fullScreen texture
   *
   * @protected
   * @param {number} minWidth - The minimum width of the render texture in real pixels.
   * @param {number} minHeight - The minimum height of the render texture in real pixels.
   * @param {number} [resolution=1] - The resolution of the render texture.
   * @return {PIXI.RenderTexture} The new render texture.
   */
  RenderTexturePool.prototype.getOptimalTexture = function getOptimalTexture (minWidth, minHeight, resolution)
  {
    if ( resolution === void 0 ) { resolution = 1; }

    var key = RenderTexturePool.SCREEN_KEY;

    minWidth *= resolution;
    minHeight *= resolution;

    if (!this.enableFullScreen || minWidth !== this._pixelsWidth || minHeight !== this._pixelsHeight)
    {
      minWidth = nextPow2(minWidth);
      minHeight = nextPow2(minHeight);
      key = ((minWidth & 0xFFFF) << 16) | (minHeight & 0xFFFF);
    }

    if (!this.texturePool[key])
    {
      this.texturePool[key] = [];
    }

    var renderTexture = this.texturePool[key].pop();

    if (!renderTexture)
    {
      renderTexture = this.createTexture(minWidth, minHeight);
    }

    renderTexture.filterPoolKey = key;
    renderTexture.setResolution(resolution);

    return renderTexture;
  };

  /**
   * Gets extra texture of the same size as current renderTexture
   *
   * @param {number} [resolution] resolution, by default its the same as in current renderTexture
   * @returns {PIXI.RenderTexture}
   */
  RenderTexturePool.prototype.getFilterTexture = function getFilterTexture (resolution)
  {
    var rt = this.renderer.renderTexture.current;

    var filterTexture = this.getOptimalTexture(rt.width, rt.height, resolution || rt.baseTexture.resolution);

    filterTexture.filterFrame = rt.filterFrame;

    return filterTexture;
  };

  /**
   * Place a render texture back into the pool.
   * @param {PIXI.RenderTexture} renderTexture - The renderTexture to free
   */
  RenderTexturePool.prototype.returnTexture = function returnTexture (renderTexture)
  {
    var key = renderTexture.filterPoolKey;

    renderTexture.filterFrame = null;
    this.texturePool[key].push(renderTexture);
  };

  /**
   * Alias for returnTexture, to be compliant with FilterSystem interface
   * @param {PIXI.RenderTexture} renderTexture - The renderTexture to free
   */
  RenderTexturePool.prototype.returnFilterTexture = function returnFilterTexture (renderTexture)
  {
    this.returnTexture(renderTexture);
  };

  /**
   * Clears the pool
   *
   * @param {boolean} [destroyTextures=true] destroy all stored textures
   */
  RenderTexturePool.prototype.clear = function clear (destroyTextures)
  {
    destroyTextures = destroyTextures !== false;
    if (destroyTextures)
    {
      for (var i in this.texturePool)
      {
        var textures = this.texturePool[i];

        if (textures)
        {
          for (var j = 0; j < textures.length; j++)
          {
            textures[j].destroy(true);
          }
        }
      }
    }

    this.texturePool = {};
  };

  /**
   * If screen size was changed, drops all screen-sized textures,
   * sets new screen size, sets `enableFullScreen` to true
   *
   * Size is measured in pixels, `renderer.view` can be passed here.
   *
   * @param {PIXI.ISize} size - Initial size of screen
   */
  RenderTexturePool.prototype.setScreenSize = function setScreenSize (size)
  {
    if (size.width === this._pixelsWidth
      && size.height === this._pixelsHeight)
    {
      return;
    }

    var screenKey = RenderTexturePool.SCREEN_KEY;
    var textures = this.texturePool[screenKey];

    this.enableFullScreen = size.width > 0 && size.height > 0;

    if (textures)
    {
      for (var j = 0; j < textures.length; j++)
      {
        textures[j].destroy(true);
      }
    }
    this.texturePool[screenKey] = [];

    this._pixelsWidth = size.width;
    this._pixelsHeight = size.height;
  };

  /**
   * Key that is used to store fullscreen renderTextures in a pool
   *
   * @static
   * @const {string}
   */
  RenderTexturePool.SCREEN_KEY = 'screen';

  /* eslint-disable max-len */

  /**
   * Holds the information for a single attribute structure required to render geometry.
   *
   * This does not contain the actual data, but instead has a buffer id that maps to a {@link PIXI.Buffer}
   * This can include anything from positions, uvs, normals, colors etc.
   *
   * @class
   * @memberof PIXI
   */
  var Attribute = function Attribute(buffer, size, normalized, type, stride, start, instance)
  {
    if ( normalized === void 0 ) { normalized = false; }
    if ( type === void 0 ) { type = 5126; }

    this.buffer = buffer;
    this.size = size;
    this.normalized = normalized;
    this.type = type;
    this.stride = stride;
    this.start = start;
    this.instance = instance;
  };

  /**
   * Destroys the Attribute.
   */
  Attribute.prototype.destroy = function destroy ()
  {
    this.buffer = null;
  };

  /**
   * Helper function that creates an Attribute based on the information provided
   *
   * @static
   * @param {string} buffer  the id of the buffer that this attribute will look for
   * @param {Number} [size=2] the size of the attribute. If you have 2 floats per vertex (eg position x and y) this would be 2
   * @param {Number} [stride=0] How far apart (in floats) the start of each value is. (used for interleaving data)
   * @param {Number} [start=0] How far into the array to start reading values (used for interleaving data)
   * @param {Boolean} [normalized=false] should the data be normalized.
   *
   * @returns {PIXI.Attribute} A new {@link PIXI.Attribute} based on the information provided
   */
  Attribute.from = function from (buffer, size, normalized, type, stride)
  {
    return new Attribute(buffer, size, normalized, type, stride);
  };

  var UID = 0;
  /* eslint-disable max-len */

  /**
   * A wrapper for data so that it can be used and uploaded by WebGL
   *
   * @class
   * @memberof PIXI
   */
  var Buffer = function Buffer(data, _static, index)
  {
    if ( _static === void 0 ) { _static = true; }
    if ( index === void 0 ) { index = false; }

    /**
     * The data in the buffer, as a typed array
     *
     * @member {ArrayBuffer| SharedArrayBuffer|ArrayBufferView}
     */
    this.data = data || new Float32Array(1);

    /**
     * A map of renderer IDs to webgl buffer
     *
     * @private
     * @member {object<number, GLBuffer>}
     */
    this._glBuffers = {};

    this._updateID = 0;

    this.index = index;

    this.static = _static;

    this.id = UID++;

    this.disposeRunner = new Runner('disposeBuffer', 2);
  };

  // TODO could explore flagging only a partial upload?
  /**
   * flags this buffer as requiring an upload to the GPU
   * @param {ArrayBuffer|SharedArrayBuffer|ArrayBufferView} [data] the data to update in the buffer.
   */
  Buffer.prototype.update = function update (data)
  {
    this.data = data || this.data;
    this._updateID++;
  };

  /**
   * disposes WebGL resources that are connected to this geometry
   */
  Buffer.prototype.dispose = function dispose ()
  {
    this.disposeRunner.run(this, false);
  };

  /**
   * Destroys the buffer
   */
  Buffer.prototype.destroy = function destroy ()
  {
    this.dispose();

    this.data = null;
  };

  /**
   * Helper function that creates a buffer based on an array or TypedArray
   *
   * @static
   * @param {ArrayBufferView | number[]} data the TypedArray that the buffer will store. If this is a regular Array it will be converted to a Float32Array.
   * @return {PIXI.Buffer} A new Buffer based on the data provided.
   */
  Buffer.from = function from (data)
  {
    if (data instanceof Array)
    {
      data = new Float32Array(data);
    }

    return new Buffer(data);
  };

  function getBufferType(array)
  {
    if (array.BYTES_PER_ELEMENT === 4)
    {
      if (array instanceof Float32Array)
      {
        return 'Float32Array';
      }
      else if (array instanceof Uint32Array)
      {
        return 'Uint32Array';
      }

      return 'Int32Array';
    }
    else if (array.BYTES_PER_ELEMENT === 2)
    {
      if (array instanceof Uint16Array)
      {
        return 'Uint16Array';
      }
    }
    else if (array.BYTES_PER_ELEMENT === 1)
    {
      if (array instanceof Uint8Array)
      {
        return 'Uint8Array';
      }
    }

    // TODO map out the rest of the array elements!
    return null;
  }

  /* eslint-disable object-shorthand */
  var map = {
    Float32Array: Float32Array,
    Uint32Array: Uint32Array,
    Int32Array: Int32Array,
    Uint8Array: Uint8Array,
  };

  function interleaveTypedArrays(arrays, sizes)
  {
    var outSize = 0;
    var stride = 0;
    var views = {};

    for (var i = 0; i < arrays.length; i++)
    {
      stride += sizes[i];
      outSize += arrays[i].length;
    }

    var buffer = new ArrayBuffer(outSize * 4);

    var out = null;
    var littleOffset = 0;

    for (var i$1 = 0; i$1 < arrays.length; i$1++)
    {
      var size = sizes[i$1];
      var array = arrays[i$1];

      var type = getBufferType(array);

      if (!views[type])
      {
        views[type] = new map[type](buffer);
      }

      out = views[type];

      for (var j = 0; j < array.length; j++)
      {
        var indexStart = ((j / size | 0) * stride) + littleOffset;
        var index = j % size;

        out[indexStart + index] = array[j];
      }

      littleOffset += size;
    }

    return new Float32Array(buffer);
  }

  var byteSizeMap = { 5126: 4, 5123: 2, 5121: 1 };
  var UID$1 = 0;

  /* eslint-disable object-shorthand */
  var map$1 = {
    Float32Array: Float32Array,
    Uint32Array: Uint32Array,
    Int32Array: Int32Array,
    Uint8Array: Uint8Array,
    Uint16Array: Uint16Array,
  };

  /* eslint-disable max-len */

  /**
   * The Geometry represents a model. It consists of two components:
   * - GeometryStyle - The structure of the model such as the attributes layout
   * - GeometryData - the data of the model - this consists of buffers.
   * This can include anything from positions, uvs, normals, colors etc.
   *
   * Geometry can be defined without passing in a style or data if required (thats how I prefer!)
   *
   * ```js
   * let geometry = new PIXI.Geometry();
   *
   * geometry.addAttribute('positions', [0, 0, 100, 0, 100, 100, 0, 100], 2);
   * geometry.addAttribute('uvs', [0,0,1,0,1,1,0,1],2)
   * geometry.addIndex([0,1,2,1,3,2])
   *
   * ```
   * @class
   * @memberof PIXI
   */
  var Geometry = function Geometry(buffers, attributes)
  {
    if ( buffers === void 0 ) { buffers = []; }
    if ( attributes === void 0 ) { attributes = {}; }

    this.buffers = buffers;

    this.indexBuffer = null;

    this.attributes = attributes;

    /**
     * A map of renderer IDs to webgl VAOs
     *
     * @protected
     * @type {object}
     */
    this.glVertexArrayObjects = {};

    this.id = UID$1++;

    this.instanced = false;

    /**
     * Number of instances in this geometry, pass it to `GeometrySystem.draw()`
     * @member {number}
     * @default 1
     */
    this.instanceCount = 1;

    this._size = null;

    this.disposeRunner = new Runner('disposeGeometry', 2);

    /**
     * Count of existing (not destroyed) meshes that reference this geometry
     * @member {number}
     */
    this.refCount = 0;
  };

  /**
   *
   * Adds an attribute to the geometry
   *
   * @param {String} id - the name of the attribute (matching up to a shader)
   * @param {PIXI.Buffer} [buffer] the buffer that holds the data of the attribute . You can also provide an Array and a buffer will be created from it.
   * @param {Number} [size=0] the size of the attribute. If you have 2 floats per vertex (eg position x and y) this would be 2
   * @param {Boolean} [normalized=false] should the data be normalized.
   * @param {Number} [type=PIXI.TYPES.FLOAT] what type of number is the attribute. Check {PIXI.TYPES} to see the ones available
   * @param {Number} [stride=0] How far apart (in floats) the start of each value is. (used for interleaving data)
   * @param {Number} [start=0] How far into the array to start reading values (used for interleaving data)
   *
   * @return {PIXI.Geometry} returns self, useful for chaining.
   */
  Geometry.prototype.addAttribute = function addAttribute (id, buffer, size, normalized, type, stride, start, instance)
  {
    if ( normalized === void 0 ) { normalized = false; }
    if ( instance === void 0 ) { instance = false; }

    if (!buffer)
    {
      throw new Error('You must pass a buffer when creating an attribute');
    }

    // check if this is a buffer!
    if (!buffer.data)
    {
      // its an array!
      if (buffer instanceof Array)
      {
        buffer = new Float32Array(buffer);
      }

      buffer = new Buffer(buffer);
    }

    var ids = id.split('|');

    if (ids.length > 1)
    {
      for (var i = 0; i < ids.length; i++)
      {
        this.addAttribute(ids[i], buffer, size, normalized, type);
      }

      return this;
    }

    var bufferIndex = this.buffers.indexOf(buffer);

    if (bufferIndex === -1)
    {
      this.buffers.push(buffer);
      bufferIndex = this.buffers.length - 1;
    }

    this.attributes[id] = new Attribute(bufferIndex, size, normalized, type, stride, start, instance);

    // assuming that if there is instanced data then this will be drawn with instancing!
    this.instanced = this.instanced || instance;

    return this;
  };

  /**
   * returns the requested attribute
   *
   * @param {String} id  the name of the attribute required
   * @return {PIXI.Attribute} the attribute requested.
   */
  Geometry.prototype.getAttribute = function getAttribute (id)
  {
    return this.attributes[id];
  };

  /**
   * returns the requested buffer
   *
   * @param {String} id  the name of the buffer required
   * @return {PIXI.Buffer} the buffer requested.
   */
  Geometry.prototype.getBuffer = function getBuffer (id)
  {
    return this.buffers[this.getAttribute(id).buffer];
  };

  /**
   *
   * Adds an index buffer to the geometry
   * The index buffer contains integers, three for each triangle in the geometry, which reference the various attribute buffers (position, colour, UV coordinates, other UV coordinates, normal, â€¦). There is only ONE index buffer.
   *
   * @param {PIXI.Buffer} [buffer] the buffer that holds the data of the index buffer. You can also provide an Array and a buffer will be created from it.
   * @return {PIXI.Geometry} returns self, useful for chaining.
   */
  Geometry.prototype.addIndex = function addIndex (buffer)
  {
    if (!buffer.data)
    {
      // its an array!
      if (buffer instanceof Array)
      {
        buffer = new Uint16Array(buffer);
      }

      buffer = new Buffer(buffer);
    }

    buffer.index = true;
    this.indexBuffer = buffer;

    if (this.buffers.indexOf(buffer) === -1)
    {
      this.buffers.push(buffer);
    }

    return this;
  };

  /**
   * returns the index buffer
   *
   * @return {PIXI.Buffer} the index buffer.
   */
  Geometry.prototype.getIndex = function getIndex ()
  {
    return this.indexBuffer;
  };

  /**
   * this function modifies the structure so that all current attributes become interleaved into a single buffer
   * This can be useful if your model remains static as it offers a little performance boost
   *
   * @return {PIXI.Geometry} returns self, useful for chaining.
   */
  Geometry.prototype.interleave = function interleave ()
  {
    // a simple check to see if buffers are already interleaved..
    if (this.buffers.length === 1 || (this.buffers.length === 2 && this.indexBuffer)) { return this; }

    // assume already that no buffers are interleaved
    var arrays = [];
    var sizes = [];
    var interleavedBuffer = new Buffer();
    var i;

    for (i in this.attributes)
    {
      var attribute = this.attributes[i];

      var buffer = this.buffers[attribute.buffer];

      arrays.push(buffer.data);

      sizes.push((attribute.size * byteSizeMap[attribute.type]) / 4);

      attribute.buffer = 0;
    }

    interleavedBuffer.data = interleaveTypedArrays(arrays, sizes);

    for (i = 0; i < this.buffers.length; i++)
    {
      if (this.buffers[i] !== this.indexBuffer)
      {
        this.buffers[i].destroy();
      }
    }

    this.buffers = [interleavedBuffer];

    if (this.indexBuffer)
    {
      this.buffers.push(this.indexBuffer);
    }

    return this;
  };

  Geometry.prototype.getSize = function getSize ()
  {
    for (var i in this.attributes)
    {
      var attribute = this.attributes[i];
      var buffer = this.buffers[attribute.buffer];

      return buffer.data.length / ((attribute.stride / 4) || attribute.size);
    }

    return 0;
  };

  /**
   * disposes WebGL resources that are connected to this geometry
   */
  Geometry.prototype.dispose = function dispose ()
  {
    this.disposeRunner.run(this, false);
  };

  /**
   * Destroys the geometry.
   */
  Geometry.prototype.destroy = function destroy ()
  {
    this.dispose();

    this.buffers = null;
    this.indexBuffer.destroy();

    this.attributes = null;
  };

  /**
   * returns a clone of the geometry
   *
   * @returns {PIXI.Geometry} a new clone of this geometry
   */
  Geometry.prototype.clone = function clone ()
  {
    var geometry = new Geometry();

    for (var i = 0; i < this.buffers.length; i++)
    {
      geometry.buffers[i] = new Buffer(this.buffers[i].data.slice());
    }

    for (var i$1 in this.attributes)
    {
      var attrib = this.attributes[i$1];

      geometry.attributes[i$1] = new Attribute(
        attrib.buffer,
        attrib.size,
        attrib.normalized,
        attrib.type,
        attrib.stride,
        attrib.start,
        attrib.instance
      );
    }

    if (this.indexBuffer)
    {
      geometry.indexBuffer = geometry.buffers[this.buffers.indexOf(this.indexBuffer)];
      geometry.indexBuffer.index = true;
    }

    return geometry;
  };

  /**
   * merges an array of geometries into a new single one
   * geometry attribute styles must match for this operation to work
   *
   * @param {PIXI.Geometry[]} geometries array of geometries to merge
   * @returns {PIXI.Geometry} shiny new geometry!
   */
  Geometry.merge = function merge (geometries)
  {
    // todo add a geometry check!
    // also a size check.. cant be too big!]

    var geometryOut = new Geometry();

    var arrays = [];
    var sizes = [];
    var offsets = [];

    var geometry;

    // pass one.. get sizes..
    for (var i = 0; i < geometries.length; i++)
    {
      geometry = geometries[i];

      for (var j = 0; j < geometry.buffers.length; j++)
      {
        sizes[j] = sizes[j] || 0;
        sizes[j] += geometry.buffers[j].data.length;
        offsets[j] = 0;
      }
    }

    // build the correct size arrays..
    for (var i$1 = 0; i$1 < geometry.buffers.length; i$1++)
    {
      // TODO types!
      arrays[i$1] = new map$1[getBufferType(geometry.buffers[i$1].data)](sizes[i$1]);
      geometryOut.buffers[i$1] = new Buffer(arrays[i$1]);
    }

    // pass to set data..
    for (var i$2 = 0; i$2 < geometries.length; i$2++)
    {
      geometry = geometries[i$2];

      for (var j$1 = 0; j$1 < geometry.buffers.length; j$1++)
      {
        arrays[j$1].set(geometry.buffers[j$1].data, offsets[j$1]);
        offsets[j$1] += geometry.buffers[j$1].data.length;
      }
    }

    geometryOut.attributes = geometry.attributes;

    if (geometry.indexBuffer)
    {
      geometryOut.indexBuffer = geometryOut.buffers[geometry.buffers.indexOf(geometry.indexBuffer)];
      geometryOut.indexBuffer.index = true;

      var offset = 0;
      var stride = 0;
      var offset2 = 0;
      var bufferIndexToCount = 0;

      // get a buffer
      for (var i$3 = 0; i$3 < geometry.buffers.length; i$3++)
      {
        if (geometry.buffers[i$3] !== geometry.indexBuffer)
        {
          bufferIndexToCount = i$3;
          break;
        }
      }

      // figure out the stride of one buffer..
      for (var i$4 in geometry.attributes)
      {
        var attribute = geometry.attributes[i$4];

        if ((attribute.buffer | 0) === bufferIndexToCount)
        {
          stride += ((attribute.size * byteSizeMap[attribute.type]) / 4);
        }
      }

      // time to off set all indexes..
      for (var i$5 = 0; i$5 < geometries.length; i$5++)
      {
        var indexBufferData = geometries[i$5].indexBuffer.data;

        for (var j$2 = 0; j$2 < indexBufferData.length; j$2++)
        {
          geometryOut.indexBuffer.data[j$2 + offset2] += offset;
        }

        offset += geometry.buffers[bufferIndexToCount].data.length / (stride);
        offset2 += indexBufferData.length;
      }
    }

    return geometryOut;
  };

  /**
   * Helper class to create a quad
   *
   * @class
   * @memberof PIXI
   */
  var Quad = /*@__PURE__*/(function (Geometry) {
    function Quad()
    {
      Geometry.call(this);

      this.addAttribute('aVertexPosition', [
        0, 0,
        1, 0,
        1, 1,
        0, 1 ])
        .addIndex([0, 1, 3, 2]);
    }

    if ( Geometry ) { Quad.__proto__ = Geometry; }
    Quad.prototype = Object.create( Geometry && Geometry.prototype );
    Quad.prototype.constructor = Quad;

    return Quad;
  }(Geometry));

  /**
   * Helper class to create a quad with uvs like in v4
   *
   * @class
   * @memberof PIXI
   * @extends PIXI.Geometry
   */
  var QuadUv = /*@__PURE__*/(function (Geometry) {
    function QuadUv()
    {
      Geometry.call(this);

      /**
       * An array of vertices
       *
       * @member {Float32Array}
       */
      this.vertices = new Float32Array([
        -1, -1,
        1, -1,
        1, 1,
        -1, 1 ]);

      /**
       * The Uvs of the quad
       *
       * @member {Float32Array}
       */
      this.uvs = new Float32Array([
        0, 0,
        1, 0,
        1, 1,
        0, 1 ]);

      this.vertexBuffer = new Buffer(this.vertices);
      this.uvBuffer = new Buffer(this.uvs);

      this.addAttribute('aVertexPosition', this.vertexBuffer)
        .addAttribute('aTextureCoord', this.uvBuffer)
        .addIndex([0, 1, 2, 0, 2, 3]);
    }

    if ( Geometry ) { QuadUv.__proto__ = Geometry; }
    QuadUv.prototype = Object.create( Geometry && Geometry.prototype );
    QuadUv.prototype.constructor = QuadUv;

    /**
     * Maps two Rectangle to the quad.
     *
     * @param {PIXI.Rectangle} targetTextureFrame - the first rectangle
     * @param {PIXI.Rectangle} destinationFrame - the second rectangle
     * @return {PIXI.Quad} Returns itself.
     */
    QuadUv.prototype.map = function map (targetTextureFrame, destinationFrame)
    {
      var x = 0; // destinationFrame.x / targetTextureFrame.width;
      var y = 0; // destinationFrame.y / targetTextureFrame.height;

      this.uvs[0] = x;
      this.uvs[1] = y;

      this.uvs[2] = x + (destinationFrame.width / targetTextureFrame.width);
      this.uvs[3] = y;

      this.uvs[4] = x + (destinationFrame.width / targetTextureFrame.width);
      this.uvs[5] = y + (destinationFrame.height / targetTextureFrame.height);

      this.uvs[6] = x;
      this.uvs[7] = y + (destinationFrame.height / targetTextureFrame.height);

      x = destinationFrame.x;
      y = destinationFrame.y;

      this.vertices[0] = x;
      this.vertices[1] = y;

      this.vertices[2] = x + destinationFrame.width;
      this.vertices[3] = y;

      this.vertices[4] = x + destinationFrame.width;
      this.vertices[5] = y + destinationFrame.height;

      this.vertices[6] = x;
      this.vertices[7] = y + destinationFrame.height;

      this.invalidate();

      return this;
    };

    /**
     * legacy upload method, just marks buffers dirty
     * @returns {PIXI.QuadUv} Returns itself.
     */
    QuadUv.prototype.invalidate = function invalidate ()
    {
      this.vertexBuffer._updateID++;
      this.uvBuffer._updateID++;

      return this;
    };

    return QuadUv;
  }(Geometry));

  var UID$2 = 0;

  /**
   * Uniform group holds uniform map and some ID's for work
   *
   * @class
   * @memberof PIXI
   */
  var UniformGroup = function UniformGroup(uniforms, _static)
  {
    /**
     * uniform values
     * @member {object}
     * @readonly
     */
    this.uniforms = uniforms;

    /**
     * Its a group and not a single uniforms
     * @member {boolean}
     * @readonly
     * @default true
     */
    this.group = true;

    // lets generate this when the shader ?
    this.syncUniforms = {};

    /**
     * dirty version
     * @protected
     * @member {number}
     */
    this.dirtyId = 0;

    /**
     * unique id
     * @protected
     * @member {number}
     */
    this.id = UID$2++;

    /**
     * Uniforms wont be changed after creation
     * @member {boolean}
     */
    this.static = !!_static;
  };

  UniformGroup.prototype.update = function update ()
  {
    this.dirtyId++;
  };

  UniformGroup.prototype.add = function add (name, uniforms, _static)
  {
    this.uniforms[name] = new UniformGroup(uniforms, _static);
  };

  UniformGroup.from = function from (uniforms, _static)
  {
    return new UniformGroup(uniforms, _static);
  };

  /**
   * System plugin to the renderer to manage filter states.
   *
   * @class
   * @private
   */
  var FilterState = function FilterState()
  {
    this.renderTexture = null;

    /**
     * Target of the filters
     * We store for case when custom filter wants to know the element it was applied on
     * @member {PIXI.DisplayObject}
     * @private
     */
    this.target = null;

    /**
     * Compatibility with PixiJS v4 filters
     * @member {boolean}
     * @default false
     * @private
     */
    this.legacy = false;

    /**
     * Resolution of filters
     * @member {number}
     * @default 1
     * @private
     */
    this.resolution = 1;

    // next three fields are created only for root
    // re-assigned for everything else

    /**
     * Source frame
     * @member {PIXI.Rectangle}
     * @private
     */
    this.sourceFrame = new Rectangle();

    /**
     * Destination frame
     * @member {PIXI.Rectangle}
     * @private
     */
    this.destinationFrame = new Rectangle();

    /**
     * Collection of filters
     * @member {PIXI.Filter[]}
     * @private
     */
    this.filters = [];
  };

  /**
   * clears the state
   * @private
   */
  FilterState.prototype.clear = function clear ()
  {
    this.target = null;
    this.filters = null;
    this.renderTexture = null;
  };

  /**
   * System plugin to the renderer to manage the filters.
   *
   * @class
   * @memberof PIXI.systems
   * @extends PIXI.System
   */
  var FilterSystem = /*@__PURE__*/(function (System) {
    function FilterSystem(renderer)
    {
      System.call(this, renderer);

      /**
       * List of filters for the FilterSystem
       * @member {Object[]}
       * @readonly
       */
      this.defaultFilterStack = [{}];

      /**
       * stores a bunch of PO2 textures used for filtering
       * @member {Object}
       */
      this.texturePool = new RenderTexturePool();

      this.texturePool.setScreenSize(renderer.view);

      /**
       * a pool for storing filter states, save us creating new ones each tick
       * @member {Object[]}
       */
      this.statePool = [];

      /**
       * A very simple geometry used when drawing a filter effect to the screen
       * @member {PIXI.Quad}
       */
      this.quad = new Quad();

      /**
       * Quad UVs
       * @member {PIXI.QuadUv}
       */
      this.quadUv = new QuadUv();

      /**
       * Temporary rect for maths
       * @type {PIXI.Rectangle}
       */
      this.tempRect = new Rectangle();

      /**
       * Active state
       * @member {object}
       */
      this.activeState = {};

      /**
       * This uniform group is attached to filter uniforms when used
       * @member {PIXI.UniformGroup}
       * @property {PIXI.Rectangle} outputFrame
       * @property {Float32Array} inputSize
       * @property {Float32Array} inputPixel
       * @property {Float32Array} inputClamp
       * @property {Number} resolution
       * @property {Float32Array} filterArea
       * @property {Fload32Array} filterClamp
       */
      this.globalUniforms = new UniformGroup({
        outputFrame: this.tempRect,
        inputSize: new Float32Array(4),
        inputPixel: new Float32Array(4),
        inputClamp: new Float32Array(4),
        resolution: 1,

        // legacy variables
        filterArea: new Float32Array(4),
        filterClamp: new Float32Array(4),
      }, true);

      this._pixelsWidth = renderer.view.width;
      this._pixelsHeight = renderer.view.height;
    }

    if ( System ) { FilterSystem.__proto__ = System; }
    FilterSystem.prototype = Object.create( System && System.prototype );
    FilterSystem.prototype.constructor = FilterSystem;

    /**
     * Adds a new filter to the System.
     *
     * @param {PIXI.DisplayObject} target - The target of the filter to render.
     * @param {PIXI.Filter[]} filters - The filters to apply.
     */
    FilterSystem.prototype.push = function push (target, filters)
    {
      var renderer = this.renderer;
      var filterStack = this.defaultFilterStack;
      var state = this.statePool.pop() || new FilterState();

      var resolution = filters[0].resolution;
      var padding = filters[0].padding;
      var autoFit = filters[0].autoFit;
      var legacy = filters[0].legacy;

      for (var i = 1; i < filters.length; i++)
      {
        var filter =  filters[i];

        // lets use the lowest resolution..
        resolution = Math.min(resolution, filter.resolution);
        // and the largest amount of padding!
        padding = Math.max(padding, filter.padding);
        // only auto fit if all filters are autofit
        autoFit = autoFit || filter.autoFit;

        legacy = legacy || filter.legacy;
      }

      if (filterStack.length === 1)
      {
        this.defaultFilterStack[0].renderTexture = renderer.renderTexture.current;
      }

      filterStack.push(state);

      state.resolution = resolution;

      state.legacy = legacy;

      state.target = target;

      state.sourceFrame.copyFrom(target.filterArea || target.getBounds(true));

      state.sourceFrame.pad(padding);
      if (autoFit)
      {
        state.sourceFrame.fit(this.renderer.renderTexture.sourceFrame);
      }

      // round to whole number based on resolution
      state.sourceFrame.ceil(resolution);

      state.renderTexture = this.getOptimalFilterTexture(state.sourceFrame.width, state.sourceFrame.height, resolution);
      state.filters = filters;

      state.destinationFrame.width = state.renderTexture.width;
      state.destinationFrame.height = state.renderTexture.height;

      state.renderTexture.filterFrame = state.sourceFrame;

      renderer.renderTexture.bind(state.renderTexture, state.sourceFrame);// /, state.destinationFrame);
      renderer.renderTexture.clear();
    };

    /**
     * Pops off the filter and applies it.
     *
     */
    FilterSystem.prototype.pop = function pop ()
    {
      var filterStack = this.defaultFilterStack;
      var state = filterStack.pop();
      var filters = state.filters;

      this.activeState = state;

      var globalUniforms = this.globalUniforms.uniforms;

      globalUniforms.outputFrame = state.sourceFrame;
      globalUniforms.resolution = state.resolution;

      var inputSize = globalUniforms.inputSize;
      var inputPixel = globalUniforms.inputPixel;
      var inputClamp = globalUniforms.inputClamp;

      inputSize[0] = state.destinationFrame.width;
      inputSize[1] = state.destinationFrame.height;
      inputSize[2] = 1.0 / inputSize[0];
      inputSize[3] = 1.0 / inputSize[1];

      inputPixel[0] = inputSize[0] * state.resolution;
      inputPixel[1] = inputSize[1] * state.resolution;
      inputPixel[2] = 1.0 / inputPixel[0];
      inputPixel[3] = 1.0 / inputPixel[1];

      inputClamp[0] = 0.5 * inputPixel[2];
      inputClamp[1] = 0.5 * inputPixel[3];
      inputClamp[2] = (state.sourceFrame.width * inputSize[2]) - (0.5 * inputPixel[2]);
      inputClamp[3] = (state.sourceFrame.height * inputSize[3]) - (0.5 * inputPixel[3]);

      // only update the rect if its legacy..
      if (state.legacy)
      {
        var filterArea = globalUniforms.filterArea;

        filterArea[0] = state.destinationFrame.width;
        filterArea[1] = state.destinationFrame.height;
        filterArea[2] = state.sourceFrame.x;
        filterArea[3] = state.sourceFrame.y;

        globalUniforms.filterClamp = globalUniforms.inputClamp;
      }

      this.globalUniforms.update();

      var lastState = filterStack[filterStack.length - 1];

      if (filters.length === 1)
      {
        filters[0].apply(this, state.renderTexture, lastState.renderTexture, false, state);

        this.returnFilterTexture(state.renderTexture);
      }
      else
      {
        var flip = state.renderTexture;
        var flop = this.getOptimalFilterTexture(
          flip.width,
          flip.height,
          state.resolution
        );

        flop.filterFrame = flip.filterFrame;

        var i = 0;

        for (i = 0; i < filters.length - 1; ++i)
        {
          filters[i].apply(this, flip, flop, true, state);

          var t = flip;

          flip = flop;
          flop = t;
        }

        filters[i].apply(this, flip, lastState.renderTexture, false, state);

        this.returnFilterTexture(flip);
        this.returnFilterTexture(flop);
      }

      state.clear();
      this.statePool.push(state);
    };

    /**
     * Draws a filter.
     *
     * @param {PIXI.Filter} filter - The filter to draw.
     * @param {PIXI.RenderTexture} input - The input render target.
     * @param {PIXI.RenderTexture} output - The target to output to.
     * @param {boolean} clear - Should the output be cleared before rendering to it
     */
    FilterSystem.prototype.applyFilter = function applyFilter (filter, input, output, clear)
    {
      var renderer = this.renderer;

      renderer.renderTexture.bind(output, output ? output.filterFrame : null);

      if (clear)
      {
        // gl.disable(gl.SCISSOR_TEST);
        renderer.renderTexture.clear();
        // gl.enable(gl.SCISSOR_TEST);
      }

      // set the uniforms..
      filter.uniforms.uSampler = input;
      filter.uniforms.filterGlobals = this.globalUniforms;

      // TODO make it so that the order of this does not matter..
      // because it does at the moment cos of global uniforms.
      // they need to get resynced

      renderer.state.set(filter.state);
      renderer.shader.bind(filter);

      if (filter.legacy)
      {
        this.quadUv.map(input._frame, input.filterFrame);

        renderer.geometry.bind(this.quadUv);
        renderer.geometry.draw(DRAW_MODES.TRIANGLES);
      }
      else
      {
        renderer.geometry.bind(this.quad);
        renderer.geometry.draw(DRAW_MODES.TRIANGLE_STRIP);
      }
    };

    /**
     * Multiply _input normalized coordinates_ to this matrix to get _sprite texture normalized coordinates_.
     *
     * Use `outputMatrix * vTextureCoord` in the shader.
     *
     * @param {PIXI.Matrix} outputMatrix - The matrix to output to.
     * @param {PIXI.Sprite} sprite - The sprite to map to.
     * @return {PIXI.Matrix} The mapped matrix.
     */
    FilterSystem.prototype.calculateSpriteMatrix = function calculateSpriteMatrix (outputMatrix, sprite)
    {
      var ref = this.activeState;
      var sourceFrame = ref.sourceFrame;
      var destinationFrame = ref.destinationFrame;
      var ref$1 = sprite._texture;
      var orig = ref$1.orig;
      var mappedMatrix = outputMatrix.set(destinationFrame.width, 0, 0,
        destinationFrame.height, sourceFrame.x, sourceFrame.y);
      var worldTransform = sprite.worldTransform.copyTo(Matrix.TEMP_MATRIX);

      worldTransform.invert();
      mappedMatrix.prepend(worldTransform);
      mappedMatrix.scale(1.0 / orig.width, 1.0 / orig.height);
      mappedMatrix.translate(sprite.anchor.x, sprite.anchor.y);

      return mappedMatrix;
    };

    /**
     * Destroys this Filter System.
     */
    FilterSystem.prototype.destroy = function destroy ()
    {
      // Those textures has to be destroyed by RenderTextureSystem or FramebufferSystem
      this.texturePool.clear(false);
    };

    /**
     * Gets a Power-of-Two render texture or fullScreen texture
     *
     * @protected
     * @param {number} minWidth - The minimum width of the render texture in real pixels.
     * @param {number} minHeight - The minimum height of the render texture in real pixels.
     * @param {number} [resolution=1] - The resolution of the render texture.
     * @return {PIXI.RenderTexture} The new render texture.
     */
    FilterSystem.prototype.getOptimalFilterTexture = function getOptimalFilterTexture (minWidth, minHeight, resolution)
    {
      if ( resolution === void 0 ) { resolution = 1; }

      return this.texturePool.getOptimalTexture(minWidth, minHeight, resolution);
    };

    /**
     * Gets extra render texture to use inside current filter
     *
     * @param {number} resolution resolution of the renderTexture
     * @returns {PIXI.RenderTexture}
     */
    FilterSystem.prototype.getFilterTexture = function getFilterTexture (resolution)
    {
      var rt = this.activeState.renderTexture;
      var filterTexture = this.texturePool.getOptimalTexture(rt.width, rt.height, resolution || rt.resolution);

      filterTexture.filterFrame = rt.filterFrame;

      return filterTexture;
    };

    /**
     * Frees a render texture back into the pool.
     *
     * @param {PIXI.RenderTexture} renderTexture - The renderTarget to free
     */
    FilterSystem.prototype.returnFilterTexture = function returnFilterTexture (renderTexture)
    {
      this.texturePool.returnTexture(renderTexture);
    };

    /**
     * Empties the texture pool.
     */
    FilterSystem.prototype.emptyPool = function emptyPool ()
    {
      this.texturePool.clear(true);
    };

    /**
     * calls `texturePool.resize()`, affects fullScreen renderTextures
     */
    FilterSystem.prototype.resize = function resize ()
    {
      this.texturePool.setScreenSize(this.renderer.view);
    };

    return FilterSystem;
  }(System));

  /**
   * Base for a common object renderer that can be used as a
   * system renderer plugin.
   *
   * @class
   * @extends PIXI.System
   * @memberof PIXI
   */
  var ObjectRenderer = function ObjectRenderer(renderer)
  {
    /**
     * The renderer this manager works for.
     *
     * @member {PIXI.Renderer}
     */
    this.renderer = renderer;
  };

  /**
   * Stub method that should be used to empty the current
   * batch by rendering objects now.
   */
  ObjectRenderer.prototype.flush = function flush ()
  {
    // flush!
  };

  /**
   * Generic destruction method that frees all resources. This
   * should be called by subclasses.
   */
  ObjectRenderer.prototype.destroy = function destroy ()
  {
    this.renderer = null;
  };

  /**
   * Stub method that initializes any state required before
   * rendering starts. It is different from the `prerender`
   * signal, which occurs every frame, in that it is called
   * whenever an object requests _this_ renderer specifically.
   */
  ObjectRenderer.prototype.start = function start ()
  {
    // set the shader..
  };

  /**
   * Stops the renderer. It should free up any state and
   * become dormant.
   */
  ObjectRenderer.prototype.stop = function stop ()
  {
    this.flush();
  };

  /**
   * Keeps the object to render. It doesn't have to be
   * rendered immediately.
   *
   * @param {PIXI.DisplayObject} object - The object to render.
   */
  ObjectRenderer.prototype.render = function render (object) // eslint-disable-line no-unused-vars
  {
    // render the object
  };

  /**
   * System plugin to the renderer to manage batching.
   *
   * @class
   * @extends PIXI.System
   * @memberof PIXI.systems
   */
  var BatchSystem = /*@__PURE__*/(function (System) {
    function BatchSystem(renderer)
    {
      System.call(this, renderer);

      /**
       * An empty renderer.
       *
       * @member {PIXI.ObjectRenderer}
       */
      this.emptyRenderer = new ObjectRenderer(renderer);

      /**
       * The currently active ObjectRenderer.
       *
       * @member {PIXI.ObjectRenderer}
       */
      this.currentRenderer = this.emptyRenderer;
    }

    if ( System ) { BatchSystem.__proto__ = System; }
    BatchSystem.prototype = Object.create( System && System.prototype );
    BatchSystem.prototype.constructor = BatchSystem;

    /**
     * Changes the current renderer to the one given in parameter
     *
     * @param {PIXI.ObjectRenderer} objectRenderer - The object renderer to use.
     */
    BatchSystem.prototype.setObjectRenderer = function setObjectRenderer (objectRenderer)
    {
      if (this.currentRenderer === objectRenderer)
      {
        return;
      }

      this.currentRenderer.stop();
      this.currentRenderer = objectRenderer;

      this.currentRenderer.start();
    };

    /**
     * This should be called if you wish to do some custom rendering
     * It will basically render anything that may be batched up such as sprites
     */
    BatchSystem.prototype.flush = function flush ()
    {
      this.setObjectRenderer(this.emptyRenderer);
    };

    /**
     * Reset the system to an empty renderer
     */
    BatchSystem.prototype.reset = function reset ()
    {
      this.setObjectRenderer(this.emptyRenderer);
    };

    return BatchSystem;
  }(System));

  /**
   * The maximum support for using WebGL. If a device does not
   * support WebGL version, for instance WebGL 2, it will still
   * attempt to fallback support to WebGL 1. If you want to
   * explicitly remove feature support to target a more stable
   * baseline, prefer a lower environment.
   *
   * Due to {@link https://bugs.chromium.org/p/chromium/issues/detail?id=934823|bug in chromium}
   * we disable webgl2 by default for all non-apple mobile devices.
   *
   * @static
   * @name PREFER_ENV
   * @memberof PIXI.settings
   * @type {number}
   * @default PIXI.ENV.WEBGL2
   */
  settings.PREFER_ENV = isMobile_min.any ? ENV.WEBGL : ENV.WEBGL2;

  var CONTEXT_UID = 0;

  /**
   * System plugin to the renderer to manage the context.
   *
   * @class
   * @extends PIXI.System
   * @memberof PIXI.systems
   */
  var ContextSystem = /*@__PURE__*/(function (System) {
    function ContextSystem(renderer)
    {
      System.call(this, renderer);

      /**
       * Either 1 or 2 to reflect the WebGL version being used
       * @member {number}
       * @readonly
       */
      this.webGLVersion = 1;

      /**
       * Extensions being used
       * @member {object}
       * @readonly
       * @property {WEBGL_draw_buffers} drawBuffers - WebGL v1 extension
       * @property {WEBGL_depth_texture} depthTexture - WebGL v1 extension
       * @property {OES_texture_float} floatTexture - WebGL v1 extension
       * @property {WEBGL_lose_context} loseContext - WebGL v1 extension
       * @property {OES_vertex_array_object} vertexArrayObject - WebGL v1 extension
       * @property {EXT_texture_filter_anisotropic} anisotropicFiltering - WebGL v1 and v2 extension
       */
      this.extensions = {};

      // Bind functions
      this.handleContextLost = this.handleContextLost.bind(this);
      this.handleContextRestored = this.handleContextRestored.bind(this);

      renderer.view.addEventListener('webglcontextlost', this.handleContextLost, false);
      renderer.view.addEventListener('webglcontextrestored', this.handleContextRestored, false);
    }

    if ( System ) { ContextSystem.__proto__ = System; }
    ContextSystem.prototype = Object.create( System && System.prototype );
    ContextSystem.prototype.constructor = ContextSystem;

    var prototypeAccessors = { isLost: { configurable: true } };

    /**
     * `true` if the context is lost
     * @member {boolean}
     * @readonly
     */
    prototypeAccessors.isLost.get = function ()
    {
      return (!this.gl || this.gl.isContextLost());
    };

    /**
     * Handle the context change event
     * @param {WebGLRenderingContext} gl new webgl context
     */
    ContextSystem.prototype.contextChange = function contextChange (gl)
    {
      this.gl = gl;
      this.renderer.gl = gl;
      this.renderer.CONTEXT_UID = CONTEXT_UID++;

      // restore a context if it was previously lost
      if (gl.isContextLost() && gl.getExtension('WEBGL_lose_context'))
      {
        gl.getExtension('WEBGL_lose_context').restoreContext();
      }
    };

    /**
     * Initialize the context
     *
     * @protected
     * @param {WebGLRenderingContext} gl - WebGL context
     */
    ContextSystem.prototype.initFromContext = function initFromContext (gl)
    {
      this.gl = gl;
      this.validateContext(gl);
      this.renderer.gl = gl;
      this.renderer.CONTEXT_UID = CONTEXT_UID++;
      this.renderer.runners.contextChange.run(gl);
    };

    /**
     * Initialize from context options
     *
     * @protected
     * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
     * @param {object} options - context attributes
     */
    ContextSystem.prototype.initFromOptions = function initFromOptions (options)
    {
      var gl = this.createContext(this.renderer.view, options);

      this.initFromContext(gl);
    };

    /**
     * Helper class to create a WebGL Context
     *
     * @param canvas {HTMLCanvasElement} the canvas element that we will get the context from
     * @param options {object} An options object that gets passed in to the canvas element containing the context attributes
     * @see https://developer.mozilla.org/en/docs/Web/API/HTMLCanvasElement/getContext
     * @return {WebGLRenderingContext} the WebGL context
     */
    ContextSystem.prototype.createContext = function createContext (canvas, options)
    {
      var gl;

      if (settings.PREFER_ENV >= ENV.WEBGL2)
      {
        gl = canvas.getContext('webgl2', options);
      }

      if (gl)
      {
        this.webGLVersion = 2;
      }
      else
      {
        this.webGLVersion = 1;

        gl = canvas.getContext('webgl', options)
          || canvas.getContext('experimental-webgl', options);

        if (!gl)
        {
          // fail, not able to get a context
          throw new Error('This browser does not support WebGL. Try using the canvas renderer');
        }
      }

      this.gl = gl;

      this.getExtensions();

      return gl;
    };

    /**
     * Auto-populate the extensions
     *
     * @protected
     */
    ContextSystem.prototype.getExtensions = function getExtensions ()
    {
      // time to set up default extensions that Pixi uses.
      var ref = this;
      var gl = ref.gl;

      if (this.webGLVersion === 1)
      {
        Object.assign(this.extensions, {
          drawBuffers: gl.getExtension('WEBGL_draw_buffers'),
          depthTexture: gl.getExtension('WEBKIT_WEBGL_depth_texture'),
          loseContext: gl.getExtension('WEBGL_lose_context'),
          vertexArrayObject: gl.getExtension('OES_vertex_array_object')
            || gl.getExtension('MOZ_OES_vertex_array_object')
            || gl.getExtension('WEBKIT_OES_vertex_array_object'),
          anisotropicFiltering: gl.getExtension('EXT_texture_filter_anisotropic'),
          uint32ElementIndex: gl.getExtension('OES_element_index_uint'),
          // Floats and half-floats
          floatTexture: gl.getExtension('OES_texture_float'),
          floatTextureLinear: gl.getExtension('OES_texture_float_linear'),
          textureHalfFloat: gl.getExtension('OES_texture_half_float'),
          textureHalfFloatLinear: gl.getExtension('OES_texture_half_float_linear'),
        });
      }
      else if (this.webGLVersion === 2)
      {
        Object.assign(this.extensions, {
          anisotropicFiltering: gl.getExtension('EXT_texture_filter_anisotropic'),
          // Floats and half-floats
          colorBufferFloat: gl.getExtension('EXT_color_buffer_float'),
          floatTextureLinear: gl.getExtension('OES_texture_float_linear'),
        });
      }
    };

    /**
     * Handles a lost webgl context
     *
     * @protected
     * @param {WebGLContextEvent} event - The context lost event.
     */
    ContextSystem.prototype.handleContextLost = function handleContextLost (event)
    {
      event.preventDefault();
    };

    /**
     * Handles a restored webgl context
     *
     * @protected
     */
    ContextSystem.prototype.handleContextRestored = function handleContextRestored ()
    {
      this.renderer.runners.contextChange.run(this.gl);
    };

    ContextSystem.prototype.destroy = function destroy ()
    {
      var view = this.renderer.view;

      // remove listeners
      view.removeEventListener('webglcontextlost', this.handleContextLost);
      view.removeEventListener('webglcontextrestored', this.handleContextRestored);

      this.gl.useProgram(null);

      if (this.extensions.loseContext)
      {
        this.extensions.loseContext.loseContext();
      }
    };

    /**
     * Handle the post-render runner event
     *
     * @protected
     */
    ContextSystem.prototype.postrender = function postrender ()
    {
      this.gl.flush();
    };

    /**
     * Validate context
     *
     * @protected
     * @param {WebGLRenderingContext} gl - Render context
     */
    ContextSystem.prototype.validateContext = function validateContext (gl)
    {
      var attributes = gl.getContextAttributes();

      // this is going to be fairly simple for now.. but at least we have room to grow!
      if (!attributes.stencil)
      {
        /* eslint-disable max-len */

        /* eslint-disable no-console */
        console.warn('Provided WebGL context does not have a stencil buffer, masks may not render correctly');
        /* eslint-enable no-console */

        /* eslint-enable max-len */
      }
    };

    Object.defineProperties( ContextSystem.prototype, prototypeAccessors );

    return ContextSystem;
  }(System));

  /**
   * System plugin to the renderer to manage framebuffers.
   *
   * @class
   * @extends PIXI.System
   * @memberof PIXI.systems
   */
  var FramebufferSystem = /*@__PURE__*/(function (System) {
    function FramebufferSystem(renderer)
    {
      System.call(this, renderer);

      /**
       * A list of managed framebuffers
       * @member {PIXI.Framebuffer[]}
       * @readonly
       */
      this.managedFramebuffers = [];

      /**
       * Framebuffer value that shows that we don't know what is bound
       * @member {Framebuffer}
       * @readonly
       */
      this.unknownFramebuffer = new Framebuffer(10, 10);
    }

    if ( System ) { FramebufferSystem.__proto__ = System; }
    FramebufferSystem.prototype = Object.create( System && System.prototype );
    FramebufferSystem.prototype.constructor = FramebufferSystem;

    var prototypeAccessors = { size: { configurable: true } };

    /**
     * Sets up the renderer context and necessary buffers.
     */
    FramebufferSystem.prototype.contextChange = function contextChange ()
    {
      var gl = this.gl = this.renderer.gl;

      this.CONTEXT_UID = this.renderer.CONTEXT_UID;
      this.current = this.unknownFramebuffer;
      this.viewport = new Rectangle();
      this.hasMRT = true;
      this.writeDepthTexture = true;

      this.disposeAll(true);

      // webgl2
      if (this.renderer.context.webGLVersion === 1)
      {
        // webgl 1!
        var nativeDrawBuffersExtension = this.renderer.context.extensions.drawBuffers;
        var nativeDepthTextureExtension = this.renderer.context.extensions.depthTexture;

        if (settings.PREFER_ENV === ENV.WEBGL_LEGACY)
        {
          nativeDrawBuffersExtension = null;
          nativeDepthTextureExtension = null;
        }

        if (nativeDrawBuffersExtension)
        {
          gl.drawBuffers = function (activeTextures) { return nativeDrawBuffersExtension.drawBuffersWEBGL(activeTextures); };
        }
        else
        {
          this.hasMRT = false;
          gl.drawBuffers = function () {
            // empty
          };
        }

        if (!nativeDepthTextureExtension)
        {
          this.writeDepthTexture = false;
        }
      }
    };

    /**
     * Bind a framebuffer
     *
     * @param {PIXI.Framebuffer} framebuffer
     * @param {PIXI.Rectangle} [frame] frame, default is framebuffer size
     */
    FramebufferSystem.prototype.bind = function bind (framebuffer, frame)
    {
      var ref = this;
      var gl = ref.gl;

      if (framebuffer)
      {
        // TODO caching layer!

        var fbo = framebuffer.glFramebuffers[this.CONTEXT_UID] || this.initFramebuffer(framebuffer);

        if (this.current !== framebuffer)
        {
          this.current = framebuffer;
          gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.framebuffer);
        }
        // make sure all textures are unbound..

        // now check for updates...
        if (fbo.dirtyId !== framebuffer.dirtyId)
        {
          fbo.dirtyId = framebuffer.dirtyId;

          if (fbo.dirtyFormat !== framebuffer.dirtyFormat)
          {
            fbo.dirtyFormat = framebuffer.dirtyFormat;
            this.updateFramebuffer(framebuffer);
          }
          else if (fbo.dirtySize !== framebuffer.dirtySize)
          {
            fbo.dirtySize = framebuffer.dirtySize;
            this.resizeFramebuffer(framebuffer);
          }
        }

        for (var i = 0; i < framebuffer.colorTextures.length; i++)
        {
          if (framebuffer.colorTextures[i].texturePart)
          {
            this.renderer.texture.unbind(framebuffer.colorTextures[i].texture);
          }
          else
          {
            this.renderer.texture.unbind(framebuffer.colorTextures[i]);
          }
        }

        if (framebuffer.depthTexture)
        {
          this.renderer.texture.unbind(framebuffer.depthTexture);
        }

        if (frame)
        {
          this.setViewport(frame.x, frame.y, frame.width, frame.height);
        }
        else
        {
          this.setViewport(0, 0, framebuffer.width, framebuffer.height);
        }
      }
      else
      {
        if (this.current)
        {
          this.current = null;
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }

        if (frame)
        {
          this.setViewport(frame.x, frame.y, frame.width, frame.height);
        }
        else
        {
          this.setViewport(0, 0, this.renderer.width, this.renderer.height);
        }
      }
    };

    /**
     * Set the WebGLRenderingContext's viewport.
     *
     * @param {Number} x - X position of viewport
     * @param {Number} y - Y position of viewport
     * @param {Number} width - Width of viewport
     * @param {Number} height - Height of viewport
     */
    FramebufferSystem.prototype.setViewport = function setViewport (x, y, width, height)
    {
      var v = this.viewport;

      if (v.width !== width || v.height !== height || v.x !== x || v.y !== y)
      {
        v.x = x;
        v.y = y;
        v.width = width;
        v.height = height;

        this.gl.viewport(x, y, width, height);
      }
    };

    /**
     * Get the size of the current width and height. Returns object with `width` and `height` values.
     *
     * @member {object}
     * @readonly
     */
    prototypeAccessors.size.get = function ()
    {
      if (this.current)
      {
        // TODO store temp
        return { x: 0, y: 0, width: this.current.width, height: this.current.height };
      }

      return { x: 0, y: 0, width: this.renderer.width, height: this.renderer.height };
    };

    /**
     * Clear the color of the context
     *
     * @param {Number} r - Red value from 0 to 1
     * @param {Number} g - Green value from 0 to 1
     * @param {Number} b - Blue value from 0 to 1
     * @param {Number} a - Alpha value from 0 to 1
     */
    FramebufferSystem.prototype.clear = function clear (r, g, b, a)
    {
      var ref = this;
      var gl = ref.gl;

      // TODO clear color can be set only one right?
      gl.clearColor(r, g, b, a);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    };

    /**
     * Initialize framebuffer
     *
     * @protected
     * @param {PIXI.Framebuffer} framebuffer
     */
    FramebufferSystem.prototype.initFramebuffer = function initFramebuffer (framebuffer)
    {
      var ref = this;
      var gl = ref.gl;

      // TODO - make this a class?
      var fbo = {
        framebuffer: gl.createFramebuffer(),
        stencil: null,
        dirtyId: 0,
        dirtyFormat: 0,
        dirtySize: 0,
      };

      framebuffer.glFramebuffers[this.CONTEXT_UID] = fbo;

      this.managedFramebuffers.push(framebuffer);
      framebuffer.disposeRunner.add(this);

      return fbo;
    };

    /**
     * Resize the framebuffer
     *
     * @protected
     * @param {PIXI.Framebuffer} framebuffer
     */
    FramebufferSystem.prototype.resizeFramebuffer = function resizeFramebuffer (framebuffer)
    {
      var ref = this;
      var gl = ref.gl;

      var fbo = framebuffer.glFramebuffers[this.CONTEXT_UID];

      if (fbo.stencil)
      {
        gl.bindRenderbuffer(gl.RENDERBUFFER, fbo.stencil);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, framebuffer.width, framebuffer.height);
      }

      var colorTextures = framebuffer.colorTextures;

      for (var i = 0; i < colorTextures.length; i++)
      {
        this.renderer.texture.bind(colorTextures[i], 0);
      }

      if (framebuffer.depthTexture)
      {
        this.renderer.texture.bind(framebuffer.depthTexture, 0);
      }
    };

    /**
     * Update the framebuffer
     *
     * @protected
     * @param {PIXI.Framebuffer} framebuffer
     */
    FramebufferSystem.prototype.updateFramebuffer = function updateFramebuffer (framebuffer)
    {
      var ref = this;
      var gl = ref.gl;

      var fbo = framebuffer.glFramebuffers[this.CONTEXT_UID];

      // bind the color texture
      var colorTextures = framebuffer.colorTextures;

      var count = colorTextures.length;

      if (!gl.drawBuffers)
      {
        count = Math.min(count, 1);
      }

      var activeTextures = [];

      for (var i = 0; i < count; i++)
      {
        var texture = framebuffer.colorTextures[i];

        if (texture.texturePart)
        {
          this.renderer.texture.bind(texture.texture, 0);

          gl.framebufferTexture2D(gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0 + i,
            gl.TEXTURE_CUBE_MAP_NEGATIVE_X + texture.side,
            texture.texture._glTextures[this.CONTEXT_UID].texture,
            0);
        }
        else
        {
          this.renderer.texture.bind(texture, 0);

          gl.framebufferTexture2D(gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0 + i,
            gl.TEXTURE_2D,
            texture._glTextures[this.CONTEXT_UID].texture,
            0);
        }

        activeTextures.push(gl.COLOR_ATTACHMENT0 + i);
      }

      if (activeTextures.length > 1)
      {
        gl.drawBuffers(activeTextures);
      }

      if (framebuffer.depthTexture)
      {
        var writeDepthTexture = this.writeDepthTexture;

        if (writeDepthTexture)
        {
          var depthTexture = framebuffer.depthTexture;

          this.renderer.texture.bind(depthTexture, 0);

          gl.framebufferTexture2D(gl.FRAMEBUFFER,
            gl.DEPTH_ATTACHMENT,
            gl.TEXTURE_2D,
            depthTexture._glTextures[this.CONTEXT_UID].texture,
            0);
        }
      }

      if (!fbo.stencil && (framebuffer.stencil || framebuffer.depth))
      {
        fbo.stencil = gl.createRenderbuffer();

        gl.bindRenderbuffer(gl.RENDERBUFFER, fbo.stencil);

        // TODO.. this is depth AND stencil?
        if (!framebuffer.depthTexture)
        { // you can't have both, so one should take priority if enabled
          gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, fbo.stencil);
        }
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, framebuffer.width, framebuffer.height);
        // fbo.enableStencil();
      }
    };

    /**
     * Disposes framebuffer
     * @param {PIXI.Framebuffer} framebuffer framebuffer that has to be disposed of
     * @param {boolean} [contextLost=false] If context was lost, we suppress all delete function calls
     */
    FramebufferSystem.prototype.disposeFramebuffer = function disposeFramebuffer (framebuffer, contextLost)
    {
      var fbo = framebuffer.glFramebuffers[this.CONTEXT_UID];
      var gl = this.gl;

      if (!fbo)
      {
        return;
      }

      delete framebuffer.glFramebuffers[this.CONTEXT_UID];

      var index = this.managedFramebuffers.indexOf(framebuffer);

      if (index >= 0)
      {
        this.managedFramebuffers.splice(index, 1);
      }

      framebuffer.disposeRunner.remove(this);

      if (!contextLost)
      {
        gl.deleteFramebuffer(fbo.framebuffer);
        if (fbo.stencil)
        {
          gl.deleteRenderbuffer(fbo.stencil);
        }
      }
    };

    /**
     * Disposes all framebuffers, but not textures bound to them
     * @param {boolean} [contextLost=false] If context was lost, we suppress all delete function calls
     */
    FramebufferSystem.prototype.disposeAll = function disposeAll (contextLost)
    {
      var list = this.managedFramebuffers;

      this.managedFramebuffers = [];

      for (var i = 0; i < list.length; i++)
      {
        this.disposeFramebuffer(list[i], contextLost);
      }
    };

    /**
     * resets framebuffer stored state, binds screen framebuffer
     *
     * should be called before renderTexture reset()
     */
    FramebufferSystem.prototype.reset = function reset ()
    {
      this.current = this.unknownFramebuffer;
      this.viewport = new Rectangle();
    };

    Object.defineProperties( FramebufferSystem.prototype, prototypeAccessors );

    return FramebufferSystem;
  }(System));

  var GLBuffer = function GLBuffer(buffer)
  {
    this.buffer = buffer;
    this.updateID = -1;
    this.byteLength = -1;
    this.refCount = 0;
  };

  var byteSizeMap$1 = { 5126: 4, 5123: 2, 5121: 1 };

  /**
   * System plugin to the renderer to manage geometry.
   *
   * @class
   * @extends PIXI.System
   * @memberof PIXI.systems
   */
  var GeometrySystem = /*@__PURE__*/(function (System) {
    function GeometrySystem(renderer)
    {
      System.call(this, renderer);

      this._activeGeometry = null;
      this._activeVao = null;

      /**
       * `true` if we has `*_vertex_array_object` extension
       * @member {boolean}
       * @readonly
       */
      this.hasVao = true;

      /**
       * `true` if has `ANGLE_instanced_arrays` extension
       * @member {boolean}
       * @readonly
       */
      this.hasInstance = true;

      /**
       * `true` if support `gl.UNSIGNED_INT` in `gl.drawElements` or `gl.drawElementsInstanced`
       * @member {boolean}
       * @readonly
       */
      this.canUseUInt32ElementIndex = false;

      /**
       * A cache of currently bound buffer,
       * contains only two members with keys ARRAY_BUFFER and ELEMENT_ARRAY_BUFFER
       * @member {Object.<number, PIXI.Buffer>}
       * @readonly
       */
      this.boundBuffers = {};

      /**
       * Cache for all geometries by id, used in case renderer gets destroyed or for profiling
       * @member {object}
       * @readonly
       */
      this.managedGeometries = {};

      /**
       * Cache for all buffers by id, used in case renderer gets destroyed or for profiling
       * @member {object}
       * @readonly
       */
      this.managedBuffers = {};
    }

    if ( System ) { GeometrySystem.__proto__ = System; }
    GeometrySystem.prototype = Object.create( System && System.prototype );
    GeometrySystem.prototype.constructor = GeometrySystem;

    /**
     * Sets up the renderer context and necessary buffers.
     */
    GeometrySystem.prototype.contextChange = function contextChange ()
    {
      this.disposeAll(true);

      var gl = this.gl = this.renderer.gl;
      var context = this.renderer.context;

      this.CONTEXT_UID = this.renderer.CONTEXT_UID;

      // webgl2
      if (!gl.createVertexArray)
      {
        // webgl 1!
        var nativeVaoExtension = this.renderer.context.extensions.vertexArrayObject;

        if (settings.PREFER_ENV === ENV.WEBGL_LEGACY)
        {
          nativeVaoExtension = null;
        }

        if (nativeVaoExtension)
        {
          gl.createVertexArray = function () { return nativeVaoExtension.createVertexArrayOES(); };

          gl.bindVertexArray = function (vao) { return nativeVaoExtension.bindVertexArrayOES(vao); };

          gl.deleteVertexArray = function (vao) { return nativeVaoExtension.deleteVertexArrayOES(vao); };
        }
        else
        {
          this.hasVao = false;
          gl.createVertexArray = function () {
            // empty
          };

          gl.bindVertexArray = function () {
            // empty
          };

          gl.deleteVertexArray = function () {
            // empty
          };
        }
      }

      if (!gl.vertexAttribDivisor)
      {
        var instanceExt = gl.getExtension('ANGLE_instanced_arrays');

        if (instanceExt)
        {
          gl.vertexAttribDivisor = function (a, b) { return instanceExt.vertexAttribDivisorANGLE(a, b); };

          gl.drawElementsInstanced = function (a, b, c, d, e) { return instanceExt.drawElementsInstancedANGLE(a, b, c, d, e); };

          gl.drawArraysInstanced = function (a, b, c, d) { return instanceExt.drawArraysInstancedANGLE(a, b, c, d); };
        }
        else
        {
          this.hasInstance = false;
        }
      }

      this.canUseUInt32ElementIndex = context.webGLVersion === 2 || !!context.extensions.uint32ElementIndex;
    };

    /**
     * Binds geometry so that is can be drawn. Creating a Vao if required
     *
     * @param {PIXI.Geometry} geometry instance of geometry to bind
     * @param {PIXI.Shader} [shader] instance of shader to use vao for
     */
    GeometrySystem.prototype.bind = function bind (geometry, shader)
    {
      shader = shader || this.renderer.shader.shader;

      var ref = this;
      var gl = ref.gl;

      // not sure the best way to address this..
      // currently different shaders require different VAOs for the same geometry
      // Still mulling over the best way to solve this one..
      // will likely need to modify the shader attribute locations at run time!
      var vaos = geometry.glVertexArrayObjects[this.CONTEXT_UID];

      if (!vaos)
      {
        this.managedGeometries[geometry.id] = geometry;
        geometry.disposeRunner.add(this);
        geometry.glVertexArrayObjects[this.CONTEXT_UID] = vaos = {};
      }

      var vao = vaos[shader.program.id] || this.initGeometryVao(geometry, shader.program);

      this._activeGeometry = geometry;

      if (this._activeVao !== vao)
      {
        this._activeVao = vao;

        if (this.hasVao)
        {
          gl.bindVertexArray(vao);
        }
        else
        {
          this.activateVao(geometry, shader.program);
        }
      }

      // TODO - optimise later!
      // don't need to loop through if nothing changed!
      // maybe look to add an 'autoupdate' to geometry?
      this.updateBuffers();
    };

    /**
     * Reset and unbind any active VAO and geometry
     */
    GeometrySystem.prototype.reset = function reset ()
    {
      this.unbind();
    };

    /**
     * Update buffers
     * @protected
     */
    GeometrySystem.prototype.updateBuffers = function updateBuffers ()
    {
      var geometry = this._activeGeometry;
      var ref = this;
      var gl = ref.gl;

      for (var i = 0; i < geometry.buffers.length; i++)
      {
        var buffer = geometry.buffers[i];

        var glBuffer = buffer._glBuffers[this.CONTEXT_UID];

        if (buffer._updateID !== glBuffer.updateID)
        {
          glBuffer.updateID = buffer._updateID;

          // TODO can cache this on buffer! maybe added a getter / setter?
          var type = buffer.index ? gl.ELEMENT_ARRAY_BUFFER : gl.ARRAY_BUFFER;

          // TODO this could change if the VAO changes...
          // need to come up with a better way to cache..
          // if (this.boundBuffers[type] !== glBuffer)
          // {
          // this.boundBuffers[type] = glBuffer;
          gl.bindBuffer(type, glBuffer.buffer);
          // }

          this._boundBuffer = glBuffer;

          if (glBuffer.byteLength >= buffer.data.byteLength)
          {
            // offset is always zero for now!
            gl.bufferSubData(type, 0, buffer.data);
          }
          else
          {
            var drawType = buffer.static ? gl.STATIC_DRAW : gl.DYNAMIC_DRAW;

            glBuffer.byteLength = buffer.data.byteLength;
            gl.bufferData(type, buffer.data, drawType);
          }
        }
      }
    };

    /**
     * Check compability between a geometry and a program
     * @protected
     * @param {PIXI.Geometry} geometry - Geometry instance
     * @param {PIXI.Program} program - Program instance
     */
    GeometrySystem.prototype.checkCompatibility = function checkCompatibility (geometry, program)
    {
      // geometry must have at least all the attributes that the shader requires.
      var geometryAttributes = geometry.attributes;
      var shaderAttributes = program.attributeData;

      for (var j in shaderAttributes)
      {
        if (!geometryAttributes[j])
        {
          throw new Error(("shader and geometry incompatible, geometry missing the \"" + j + "\" attribute"));
        }
      }
    };

    /**
     * Takes a geometry and program and generates a unique signature for them.
     *
     * @param {PIXI.Geometry} geometry to get signature from
     * @param {PIXI.Program} program to test geometry against
     * @returns {String} Unique signature of the geometry and program
     * @protected
     */
    GeometrySystem.prototype.getSignature = function getSignature (geometry, program)
    {
      var attribs = geometry.attributes;
      var shaderAttributes = program.attributeData;

      var strings = ['g', geometry.id];

      for (var i in attribs)
      {
        if (shaderAttributes[i])
        {
          strings.push(i);
        }
      }

      return strings.join('-');
    };

    /**
     * Creates or gets Vao with the same structure as the geometry and stores it on the geometry.
     * If vao is created, it is bound automatically.
     *
     * @protected
     * @param {PIXI.Geometry} geometry - Instance of geometry to to generate Vao for
     * @param {PIXI.Program} program - Instance of program
     */
    GeometrySystem.prototype.initGeometryVao = function initGeometryVao (geometry, program)
    {
      this.checkCompatibility(geometry, program);

      var gl = this.gl;
      var CONTEXT_UID = this.CONTEXT_UID;

      var signature = this.getSignature(geometry, program);

      var vaoObjectHash = geometry.glVertexArrayObjects[this.CONTEXT_UID];

      var vao = vaoObjectHash[signature];

      if (vao)
      {
        // this will give us easy access to the vao
        vaoObjectHash[program.id] = vao;

        return vao;
      }

      var buffers = geometry.buffers;
      var attributes = geometry.attributes;
      var tempStride = {};
      var tempStart = {};

      for (var j in buffers)
      {
        tempStride[j] = 0;
        tempStart[j] = 0;
      }

      for (var j$1 in attributes)
      {
        if (!attributes[j$1].size && program.attributeData[j$1])
        {
          attributes[j$1].size = program.attributeData[j$1].size;
        }
        else if (!attributes[j$1].size)
        {
          console.warn(("PIXI Geometry attribute '" + j$1 + "' size cannot be determined (likely the bound shader does not have the attribute)"));  // eslint-disable-line
        }

        tempStride[attributes[j$1].buffer] += attributes[j$1].size * byteSizeMap$1[attributes[j$1].type];
      }

      for (var j$2 in attributes)
      {
        var attribute = attributes[j$2];
        var attribSize = attribute.size;

        if (attribute.stride === undefined)
        {
          if (tempStride[attribute.buffer] === attribSize * byteSizeMap$1[attribute.type])
          {
            attribute.stride = 0;
          }
          else
          {
            attribute.stride = tempStride[attribute.buffer];
          }
        }

        if (attribute.start === undefined)
        {
          attribute.start = tempStart[attribute.buffer];

          tempStart[attribute.buffer] += attribSize * byteSizeMap$1[attribute.type];
        }
      }

      vao = gl.createVertexArray();

      gl.bindVertexArray(vao);

      // first update - and create the buffers!
      // only create a gl buffer if it actually gets
      for (var i = 0; i < buffers.length; i++)
      {
        var buffer = buffers[i];

        if (!buffer._glBuffers[CONTEXT_UID])
        {
          buffer._glBuffers[CONTEXT_UID] = new GLBuffer(gl.createBuffer());
          this.managedBuffers[buffer.id] = buffer;
          buffer.disposeRunner.add(this);
        }

        buffer._glBuffers[CONTEXT_UID].refCount++;
      }

      // TODO - maybe make this a data object?
      // lets wait to see if we need to first!

      this.activateVao(geometry, program);

      this._activeVao = vao;

      // add it to the cache!
      vaoObjectHash[program.id] = vao;
      vaoObjectHash[signature] = vao;

      return vao;
    };

    /**
     * Disposes buffer
     * @param {PIXI.Buffer} buffer buffer with data
     * @param {boolean} [contextLost=false] If context was lost, we suppress deleteVertexArray
     */
    GeometrySystem.prototype.disposeBuffer = function disposeBuffer (buffer, contextLost)
    {
      if (!this.managedBuffers[buffer.id])
      {
        return;
      }

      delete this.managedBuffers[buffer.id];

      var glBuffer = buffer._glBuffers[this.CONTEXT_UID];
      var gl = this.gl;

      buffer.disposeRunner.remove(this);

      if (!glBuffer)
      {
        return;
      }

      if (!contextLost)
      {
        gl.deleteBuffer(glBuffer.buffer);
      }

      delete buffer._glBuffers[this.CONTEXT_UID];
    };

    /**
     * Disposes geometry
     * @param {PIXI.Geometry} geometry Geometry with buffers. Only VAO will be disposed
     * @param {boolean} [contextLost=false] If context was lost, we suppress deleteVertexArray
     */
    GeometrySystem.prototype.disposeGeometry = function disposeGeometry (geometry, contextLost)
    {
      if (!this.managedGeometries[geometry.id])
      {
        return;
      }

      delete this.managedGeometries[geometry.id];

      var vaos = geometry.glVertexArrayObjects[this.CONTEXT_UID];
      var gl = this.gl;
      var buffers = geometry.buffers;

      geometry.disposeRunner.remove(this);

      if (!vaos)
      {
        return;
      }

      for (var i = 0; i < buffers.length; i++)
      {
        var buf = buffers[i]._glBuffers[this.CONTEXT_UID];

        buf.refCount--;
        if (buf.refCount === 0 && !contextLost)
        {
          this.disposeBuffer(buffers[i], contextLost);
        }
      }

      if (!contextLost)
      {
        for (var vaoId in vaos)
        {
          // delete only signatures, everything else are copies
          if (vaoId[0] === 'g')
          {
            var vao = vaos[vaoId];

            if (this._activeVao === vao)
            {
              this.unbind();
            }
            gl.deleteVertexArray(vao);
          }
        }
      }

      delete geometry.glVertexArrayObjects[this.CONTEXT_UID];
    };

    /**
     * dispose all WebGL resources of all managed geometries and buffers
     * @param {boolean} [contextLost=false] If context was lost, we suppress `gl.delete` calls
     */
    GeometrySystem.prototype.disposeAll = function disposeAll (contextLost)
    {
      var all = Object.keys(this.managedGeometries);

      for (var i = 0; i < all.length; i++)
      {
        this.disposeGeometry(this.managedGeometries[all[i]], contextLost);
      }
      all = Object.keys(this.managedBuffers);
      for (var i$1 = 0; i$1 < all.length; i$1++)
      {
        this.disposeBuffer(this.managedBuffers[all[i$1]], contextLost);
      }
    };

    /**
     * Activate vertex array object
     *
     * @protected
     * @param {PIXI.Geometry} geometry - Geometry instance
     * @param {PIXI.Program} program - Shader program instance
     */
    GeometrySystem.prototype.activateVao = function activateVao (geometry, program)
    {
      var gl = this.gl;
      var CONTEXT_UID = this.CONTEXT_UID;
      var buffers = geometry.buffers;
      var attributes = geometry.attributes;

      if (geometry.indexBuffer)
      {
        // first update the index buffer if we have one..
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geometry.indexBuffer._glBuffers[CONTEXT_UID].buffer);
      }

      var lastBuffer = null;

      // add a new one!
      for (var j in attributes)
      {
        var attribute = attributes[j];
        var buffer = buffers[attribute.buffer];
        var glBuffer = buffer._glBuffers[CONTEXT_UID];

        if (program.attributeData[j])
        {
          if (lastBuffer !== glBuffer)
          {
            gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer.buffer);

            lastBuffer = glBuffer;
          }

          var location = program.attributeData[j].location;

          // TODO introduce state again
          // we can optimise this for older devices that have no VAOs
          gl.enableVertexAttribArray(location);

          gl.vertexAttribPointer(location,
            attribute.size,
            attribute.type || gl.FLOAT,
            attribute.normalized,
            attribute.stride,
            attribute.start);

          if (attribute.instance)
          {
            // TODO calculate instance count based of this...
            if (this.hasInstance)
            {
              gl.vertexAttribDivisor(location, 1);
            }
            else
            {
              throw new Error('geometry error, GPU Instancing is not supported on this device');
            }
          }
        }
      }
    };

    /**
     * Draw the geometry
     *
     * @param {Number} type - the type primitive to render
     * @param {Number} [size] - the number of elements to be rendered
     * @param {Number} [start] - Starting index
     * @param {Number} [instanceCount] - the number of instances of the set of elements to execute
     */
    GeometrySystem.prototype.draw = function draw (type, size, start, instanceCount)
    {
      var ref = this;
      var gl = ref.gl;
      var geometry = this._activeGeometry;

      // TODO.. this should not change so maybe cache the function?

      if (geometry.indexBuffer)
      {
        var byteSize = geometry.indexBuffer.data.BYTES_PER_ELEMENT;
        var glType = byteSize === 2 ? gl.UNSIGNED_SHORT : gl.UNSIGNED_INT;

        if (byteSize === 2 || (byteSize === 4 && this.canUseUInt32ElementIndex))
        {
          if (geometry.instanced)
          {
            /* eslint-disable max-len */
            gl.drawElementsInstanced(type, size || geometry.indexBuffer.data.length, glType, (start || 0) * byteSize, instanceCount || 1);
            /* eslint-enable max-len */
          }
          else
          {
            /* eslint-disable max-len */
            gl.drawElements(type, size || geometry.indexBuffer.data.length, glType, (start || 0) * byteSize);
            /* eslint-enable max-len */
          }
        }
        else
        {
          console.warn('unsupported index buffer type: uint32');
        }
      }
      else if (geometry.instanced)
      {
        // TODO need a better way to calculate size..
        gl.drawArraysInstanced(type, start, size || geometry.getSize(), instanceCount || 1);
      }
      else
      {
        gl.drawArrays(type, start, size || geometry.getSize());
      }

      return this;
    };

    /**
     * Unbind/reset everything
     * @protected
     */
    GeometrySystem.prototype.unbind = function unbind ()
    {
      this.gl.bindVertexArray(null);
      this._activeVao = null;
      this._activeGeometry = null;
    };

    return GeometrySystem;
  }(System));

  /**
   * @method compileProgram
   * @private
   * @memberof PIXI.glCore.shader
   * @param gl {WebGLRenderingContext} The current WebGL context {WebGLProgram}
   * @param vertexSrc {string|string[]} The vertex shader source as an array of strings.
   * @param fragmentSrc {string|string[]} The fragment shader source as an array of strings.
   * @param attributeLocations {Object} An attribute location map that lets you manually set the attribute locations
   * @return {WebGLProgram} the shader program
   */
  function compileProgram(gl, vertexSrc, fragmentSrc, attributeLocations)
  {
    var glVertShader = compileShader(gl, gl.VERTEX_SHADER, vertexSrc);
    var glFragShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSrc);

    var program = gl.createProgram();

    gl.attachShader(program, glVertShader);
    gl.attachShader(program, glFragShader);

    // optionally, set the attributes manually for the program rather than letting WebGL decide..
    if (attributeLocations)
    {
      for (var i in attributeLocations)
      {
        gl.bindAttribLocation(program, attributeLocations[i], i);
      }
    }

    gl.linkProgram(program);

    // if linking fails, then log and cleanup
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    {
      console.error('Pixi.js Error: Could not initialize shader.');
      console.error('gl.VALIDATE_STATUS', gl.getProgramParameter(program, gl.VALIDATE_STATUS));
      console.error('gl.getError()', gl.getError());

      // if there is a program info log, log it
      if (gl.getProgramInfoLog(program) !== '')
      {
        console.warn('Pixi.js Warning: gl.getProgramInfoLog()', gl.getProgramInfoLog(program));
      }

      gl.deleteProgram(program);
      program = null;
    }

    // clean up some shaders
    gl.deleteShader(glVertShader);
    gl.deleteShader(glFragShader);

    return program;
  }

  /**
   * @private
   * @param gl {WebGLRenderingContext} The current WebGL context {WebGLProgram}
   * @param type {Number} the type, can be either VERTEX_SHADER or FRAGMENT_SHADER
   * @param vertexSrc {string|string[]} The vertex shader source as an array of strings.
   * @return {WebGLShader} the shader
   */
  function compileShader(gl, type, src)
  {
    var shader = gl.createShader(type);

    gl.shaderSource(shader, src);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    {
      console.warn(src);
      console.error(gl.getShaderInfoLog(shader));

      return null;
    }

    return shader;
  }

  /**
   * @method defaultValue
   * @memberof PIXI.glCore.shader
   * @param type {String} Type of value
   * @param size {Number}
   * @private
   */
  function defaultValue(type, size)
  {
    switch (type)
    {
      case 'float':
        return 0;

      case 'vec2':
        return new Float32Array(2 * size);

      case 'vec3':
        return new Float32Array(3 * size);

      case 'vec4':
        return new Float32Array(4 * size);

      case 'int':
      case 'sampler2D':
      case 'sampler2DArray':
        return 0;

      case 'ivec2':
        return new Int32Array(2 * size);

      case 'ivec3':
        return new Int32Array(3 * size);

      case 'ivec4':
        return new Int32Array(4 * size);

      case 'bool':
        return false;

      case 'bvec2':

        return booleanArray(2 * size);

      case 'bvec3':
        return booleanArray(3 * size);

      case 'bvec4':
        return booleanArray(4 * size);

      case 'mat2':
        return new Float32Array([1, 0,
          0, 1]);

      case 'mat3':
        return new Float32Array([1, 0, 0,
          0, 1, 0,
          0, 0, 1]);

      case 'mat4':
        return new Float32Array([1, 0, 0, 0,
          0, 1, 0, 0,
          0, 0, 1, 0,
          0, 0, 0, 1]);
    }

    return null;
  }

  function booleanArray(size)
  {
    var array = new Array(size);

    for (var i = 0; i < array.length; i++)
    {
      array[i] = false;
    }

    return array;
  }

  var context = null;

  /**
   * returns a little WebGL context to use for program inspection.
   *
   * @static
   * @private
   * @returns {webGL-context} a gl context to test with
   */
  function getTestContext()
  {
    if (!context)
    {
      var canvas = document.createElement('canvas');

      var gl;

      if (settings.PREFER_ENV >= ENV.WEBGL2)
      {
        gl = canvas.getContext('webgl2', {});
      }

      if (!gl)
      {
        gl = canvas.getContext('webgl', {})
          || canvas.getContext('experimental-webgl', {});

        if (!gl)
        {
          // fail, not able to get a context
          throw new Error('This browser does not support WebGL. Try using the canvas renderer');
        }
        else
        {
          // for shader testing..
          gl.getExtension('WEBGL_draw_buffers');
        }
      }

      context = gl;

      return gl;
    }

    return context;
  }

  var maxFragmentPrecision;

  function getMaxFragmentPrecision()
  {
    if (!maxFragmentPrecision)
    {
      maxFragmentPrecision = PRECISION.MEDIUM;
      var gl = getTestContext();

      if (gl)
      {
        if (gl.getShaderPrecisionFormat)
        {
          var shaderFragment = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);

          maxFragmentPrecision = shaderFragment.precision ? PRECISION.HIGH : PRECISION.MEDIUM;
        }
      }
    }

    return maxFragmentPrecision;
  }

  /**
   * Sets the float precision on the shader, ensuring the device supports the request precision.
   * If the precision is already present, it just ensures that the device is able to handle it.
   *
   * @private
   * @param {string} src - The shader source
   * @param {string} requestedPrecision - The request float precision of the shader. Options are 'lowp', 'mediump' or 'highp'.
   * @param {string} maxSupportedPrecision - The maximum precision the shader supports.
   *
   * @return {string} modified shader source
   */
  function setPrecision(src, requestedPrecision, maxSupportedPrecision)
  {
    if (src.substring(0, 9) !== 'precision')
    {
      // no precision supplied, so PixiJS will add the requested level.
      var precision = requestedPrecision;

      // If highp is requested but not supported, downgrade precision to a level all devices support.
      if (requestedPrecision === PRECISION.HIGH && maxSupportedPrecision !== PRECISION.HIGH)
      {
        precision = PRECISION.MEDIUM;
      }

      return ("precision " + precision + " float;\n" + src);
    }
    else if (maxSupportedPrecision !== PRECISION.HIGH && src.substring(0, 15) === 'precision highp')
    {
      // precision was supplied, but at a level this device does not support, so downgrading to mediump.
      return src.replace('precision highp', 'precision mediump');
    }

    return src;
  }

  var GLSL_TO_SIZE = {
    float:    1,
    vec2:     2,
    vec3:     3,
    vec4:     4,

    int:      1,
    ivec2:    2,
    ivec3:    3,
    ivec4:    4,

    bool:     1,
    bvec2:    2,
    bvec3:    3,
    bvec4:    4,

    mat2:     4,
    mat3:     9,
    mat4:     16,

    sampler2D:  1,
  };

  /**
   * @private
   * @method mapSize
   * @memberof PIXI.glCore.shader
   * @param type {String}
   * @return {Number}
   */
  function mapSize(type)
  {
    return GLSL_TO_SIZE[type];
  }

  var GL_TABLE = null;

  var GL_TO_GLSL_TYPES = {
    FLOAT:       'float',
    FLOAT_VEC2:  'vec2',
    FLOAT_VEC3:  'vec3',
    FLOAT_VEC4:  'vec4',

    INT:         'int',
    INT_VEC2:    'ivec2',
    INT_VEC3:    'ivec3',
    INT_VEC4:    'ivec4',

    BOOL:        'bool',
    BOOL_VEC2:   'bvec2',
    BOOL_VEC3:   'bvec3',
    BOOL_VEC4:   'bvec4',

    FLOAT_MAT2:  'mat2',
    FLOAT_MAT3:  'mat3',
    FLOAT_MAT4:  'mat4',

    SAMPLER_2D:  'sampler2D',
    SAMPLER_CUBE:  'samplerCube',
    SAMPLER_2D_ARRAY:  'sampler2DArray',
  };

  function mapType(gl, type)
  {
    if (!GL_TABLE)
    {
      var typeNames = Object.keys(GL_TO_GLSL_TYPES);

      GL_TABLE = {};

      for (var i = 0; i < typeNames.length; ++i)
      {
        var tn = typeNames[i];

        GL_TABLE[gl[tn]] = GL_TO_GLSL_TYPES[tn];
      }
    }

    return GL_TABLE[type];
  }

  // cv = CachedValue
  // v = value
  // ud = uniformData
  // uv = uniformValue
  // l = location
  var GLSL_TO_SINGLE_SETTERS_CACHED = {

    float: "\n    if(cv !== v)\n    {\n        cv.v = v;\n        gl.uniform1f(location, v)\n    }",

    vec2: "\n    if(cv[0] !== v[0] || cv[1] !== v[1])\n    {\n        cv[0] = v[0];\n        cv[1] = v[1];\n        gl.uniform2f(location, v[0], v[1])\n    }",

    vec3: "\n    if(cv[0] !== v[0] || cv[1] !== v[1] || cv[2] !== v[2])\n    {\n        cv[0] = v[0];\n        cv[1] = v[1];\n        cv[2] = v[2];\n\n        gl.uniform3f(location, v[0], v[1], v[2])\n    }",

    vec4:     'gl.uniform4f(location, v[0], v[1], v[2], v[3])',

    int:      'gl.uniform1i(location, v)',
    ivec2:    'gl.uniform2i(location, v[0], v[1])',
    ivec3:    'gl.uniform3i(location, v[0], v[1], v[2])',
    ivec4:    'gl.uniform4i(location, v[0], v[1], v[2], v[3])',

    bool:     'gl.uniform1i(location, v)',
    bvec2:    'gl.uniform2i(location, v[0], v[1])',
    bvec3:    'gl.uniform3i(location, v[0], v[1], v[2])',
    bvec4:    'gl.uniform4i(location, v[0], v[1], v[2], v[3])',

    mat2:     'gl.uniformMatrix2fv(location, false, v)',
    mat3:     'gl.uniformMatrix3fv(location, false, v)',
    mat4:     'gl.uniformMatrix4fv(location, false, v)',

    sampler2D:      'gl.uniform1i(location, v)',
    samplerCube:    'gl.uniform1i(location, v)',
    sampler2DArray: 'gl.uniform1i(location, v)',
  };

  var GLSL_TO_ARRAY_SETTERS = {

    float:    "gl.uniform1fv(location, v)",

    vec2:     "gl.uniform2fv(location, v)",
    vec3:     "gl.uniform3fv(location, v)",
    vec4:     'gl.uniform4fv(location, v)',

    mat4:     'gl.uniformMatrix4fv(location, false, v)',
    mat3:     'gl.uniformMatrix3fv(location, false, v)',
    mat2:     'gl.uniformMatrix2fv(location, false, v)',

    int:      'gl.uniform1iv(location, v)',
    ivec2:    'gl.uniform2iv(location, v)',
    ivec3:    'gl.uniform3iv(location, v)',
    ivec4:    'gl.uniform4iv(location, v)',

    bool:     'gl.uniform1iv(location, v)',
    bvec2:    'gl.uniform2iv(location, v)',
    bvec3:    'gl.uniform3iv(location, v)',
    bvec4:    'gl.uniform4iv(location, v)',

    sampler2D:      'gl.uniform1iv(location, v)',
    samplerCube:    'gl.uniform1iv(location, v)',
    sampler2DArray: 'gl.uniform1iv(location, v)',
  };

  function generateUniformsSync(group, uniformData)
  {
    var textureCount = 0;
    var func = "var v = null;\n    var cv = null\n    var gl = renderer.gl";

    for (var i in group.uniforms)
    {
      var data = uniformData[i];

      if (!data)
      {
        if (group.uniforms[i].group)
        {
          func += "\n                    renderer.shader.syncUniformGroup(uv." + i + ");\n                ";
        }

        continue;
      }

      // TODO && uniformData[i].value !== 0 <-- do we still need this?
      if (data.type === 'float' && data.size === 1)
      {
        func += "\n            if(uv." + i + " !== ud." + i + ".value)\n            {\n                ud." + i + ".value = uv." + i + "\n                gl.uniform1f(ud." + i + ".location, uv." + i + ")\n            }\n";
      }
      /* eslint-disable max-len */
      else if ((data.type === 'sampler2D' || data.type === 'samplerCube' || data.type === 'sampler2DArray') && data.size === 1 && !data.isArray)
      /* eslint-disable max-len */
      {
        func += "\n            renderer.texture.bind(uv." + i + ", " + textureCount + ");\n\n            if(ud." + i + ".value !== " + textureCount + ")\n            {\n                ud." + i + ".value = " + textureCount + ";\n                gl.uniform1i(ud." + i + ".location, " + textureCount + ");\n; // eslint-disable-line max-len\n            }\n";

        textureCount++;
      }
      else if (data.type === 'mat3' && data.size === 1)
      {
        if (group.uniforms[i].a !== undefined)
        {
          // TODO and some smart caching dirty ids here!
          func += "\n                gl.uniformMatrix3fv(ud." + i + ".location, false, uv." + i + ".toArray(true));\n                \n";
        }
        else
        {
          func += "\n                gl.uniformMatrix3fv(ud." + i + ".location, false, uv." + i + ");\n                \n";
        }
      }
      else if (data.type === 'vec2' && data.size === 1)
      {
        // TODO - do we need both here?
        // maybe we can get away with only using points?
        if (group.uniforms[i].x !== undefined)
        {
          func += "\n                cv = ud." + i + ".value;\n                v = uv." + i + ";\n\n                if(cv[0] !== v.x || cv[1] !== v.y)\n                {\n                    cv[0] = v.x;\n                    cv[1] = v.y;\n                    gl.uniform2f(ud." + i + ".location, v.x, v.y);\n                }\n";
        }
        else
        {
          func += "\n                cv = ud." + i + ".value;\n                v = uv." + i + ";\n\n                if(cv[0] !== v[0] || cv[1] !== v[1])\n                {\n                    cv[0] = v[0];\n                    cv[1] = v[1];\n                    gl.uniform2f(ud." + i + ".location, v[0], v[1]);\n                }\n                \n";
        }
      }
      else if (data.type === 'vec4' && data.size === 1)
      {
        // TODO - do we need both here?
        // maybe we can get away with only using points?
        if (group.uniforms[i].width !== undefined)
        {
          func += "\n                cv = ud." + i + ".value;\n                v = uv." + i + ";\n\n                if(cv[0] !== v.x || cv[1] !== v.y || cv[2] !== v.width || cv[3] !== v.height)\n                {\n                    cv[0] = v.x;\n                    cv[1] = v.y;\n                    cv[2] = v.width;\n                    cv[3] = v.height;\n                    gl.uniform4f(ud." + i + ".location, v.x, v.y, v.width, v.height)\n                }\n";
        }
        else
        {
          func += "\n                cv = ud." + i + ".value;\n                v = uv." + i + ";\n\n                if(cv[0] !== v[0] || cv[1] !== v[1] || cv[2] !== v[2] || cv[3] !== v[3])\n                {\n                    cv[0] = v[0];\n                    cv[1] = v[1];\n                    cv[2] = v[2];\n                    cv[3] = v[3];\n\n                    gl.uniform4f(ud." + i + ".location, v[0], v[1], v[2], v[3])\n                }\n                \n";
        }
      }
      else
      {
        var templateType = (data.size === 1) ? GLSL_TO_SINGLE_SETTERS_CACHED : GLSL_TO_ARRAY_SETTERS;

        var template =  templateType[data.type].replace('location', ("ud." + i + ".location"));

        func += "\n            cv = ud." + i + ".value;\n            v = uv." + i + ";\n            " + template + ";\n";
      }
    }

    return new Function('ud', 'uv', 'renderer', func); // eslint-disable-line no-new-func
  }

  var fragTemplate = [
    'precision mediump float;',
    'void main(void){',
    'float test = 0.1;',
    '%forloop%',
    'gl_FragColor = vec4(0.0);',
    '}' ].join('\n');

  function checkMaxIfStatementsInShader(maxIfs, gl)
  {
    if (maxIfs === 0)
    {
      throw new Error('Invalid value of `0` passed to `checkMaxIfStatementsInShader`');
    }

    var shader = gl.createShader(gl.FRAGMENT_SHADER);

    while (true) // eslint-disable-line no-constant-condition
    {
      var fragmentSrc = fragTemplate.replace(/%forloop%/gi, generateIfTestSrc(maxIfs));

      gl.shaderSource(shader, fragmentSrc);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
      {
        maxIfs = (maxIfs / 2) | 0;
      }
      else
      {
        // valid!
        break;
      }
    }

    return maxIfs;
  }

  function generateIfTestSrc(maxIfs)
  {
    var src = '';

    for (var i = 0; i < maxIfs; ++i)
    {
      if (i > 0)
      {
        src += '\nelse ';
      }

      if (i < maxIfs - 1)
      {
        src += "if(test == " + i + ".0){}";
      }
    }

    return src;
  }

  // Cache the result to prevent running this over and over
  var unsafeEval;

  /**
   * Not all platforms allow to generate function code (e.g., `new Function`).
   * this provides the platform-level detection.
   *
   * @private
   * @returns {boolean}
   */
  function unsafeEvalSupported()
  {
    if (typeof unsafeEval === 'boolean')
    {
      return unsafeEval;
    }

    try
    {
      /* eslint-disable no-new-func */
      var func = new Function('param1', 'param2', 'param3', 'return param1[param2] === param3;');
      /* eslint-enable no-new-func */

      unsafeEval = func({ a: 'b' }, 'a', 'b') === true;
    }
    catch (e)
    {
      unsafeEval = false;
    }

    return unsafeEval;
  }

  var defaultFragment = "varying vec2 vTextureCoord;\n\nuniform sampler2D uSampler;\n\nvoid main(void){\n   gl_FragColor *= texture2D(uSampler, vTextureCoord);\n}";

  var defaultVertex = "attribute vec2 aVertexPosition;\nattribute vec2 aTextureCoord;\n\nuniform mat3 projectionMatrix;\n\nvarying vec2 vTextureCoord;\n\nvoid main(void){\n   gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);\n   vTextureCoord = aTextureCoord;\n}\n";

  // import * as from '../systems/shader/shader';

  var UID$3 = 0;

  var nameCache = {};

  /**
   * Helper class to create a shader program.
   *
   * @class
   * @memberof PIXI
   */
  var Program = function Program(vertexSrc, fragmentSrc, name)
  {
    if ( name === void 0 ) { name = 'pixi-shader'; }

    this.id = UID$3++;

    /**
     * The vertex shader.
     *
     * @member {string}
     */
    this.vertexSrc = vertexSrc || Program.defaultVertexSrc;

    /**
     * The fragment shader.
     *
     * @member {string}
     */
    this.fragmentSrc = fragmentSrc || Program.defaultFragmentSrc;

    this.vertexSrc = this.vertexSrc.trim();
    this.fragmentSrc = this.fragmentSrc.trim();

    if (this.vertexSrc.substring(0, 8) !== '#version')
    {
      name = name.replace(/\s+/g, '-');

      if (nameCache[name])
      {
        nameCache[name]++;
        name += "-" + (nameCache[name]);
      }
      else
      {
        nameCache[name] = 1;
      }

      this.vertexSrc = "#define SHADER_NAME " + name + "\n" + (this.vertexSrc);
      this.fragmentSrc = "#define SHADER_NAME " + name + "\n" + (this.fragmentSrc);

      this.vertexSrc = setPrecision(this.vertexSrc, settings.PRECISION_VERTEX, PRECISION.HIGH);
      this.fragmentSrc = setPrecision(this.fragmentSrc, settings.PRECISION_FRAGMENT, getMaxFragmentPrecision());
    }

    // currently this does not extract structs only default types
    this.extractData(this.vertexSrc, this.fragmentSrc);

    // this is where we store shader references..
    this.glPrograms = {};

    this.syncUniforms = null;
  };

  var staticAccessors$3 = { defaultVertexSrc: { configurable: true },defaultFragmentSrc: { configurable: true } };

  /**
   * Extracts the data for a buy creating a small test program
   * or reading the src directly.
   * @protected
   *
   * @param {string} [vertexSrc] - The source of the vertex shader.
   * @param {string} [fragmentSrc] - The source of the fragment shader.
   */
  Program.prototype.extractData = function extractData (vertexSrc, fragmentSrc)
  {
    var gl = getTestContext();

    if (gl)
    {
      var program = compileProgram(gl, vertexSrc, fragmentSrc);

      this.attributeData = this.getAttributeData(program, gl);
      this.uniformData = this.getUniformData(program, gl);

      gl.deleteProgram(program);
    }
    else
    {
      this.uniformData = {};
      this.attributeData = {};
    }
  };

  /**
   * returns the attribute data from the program
   * @private
   *
   * @param {WebGLProgram} [program] - the WebGL program
   * @param {WebGLRenderingContext} [gl] - the WebGL context
   *
   * @returns {object} the attribute data for this program
   */
  Program.prototype.getAttributeData = function getAttributeData (program, gl)
  {
    var attributes = {};
    var attributesArray = [];

    var totalAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);

    for (var i = 0; i < totalAttributes; i++)
    {
      var attribData = gl.getActiveAttrib(program, i);
      var type = mapType(gl, attribData.type);

      /*eslint-disable */
      var data = {
        type: type,
        name: attribData.name,
        size: mapSize(type),
        location: 0,
      };
      /* eslint-enable */

      attributes[attribData.name] = data;
      attributesArray.push(data);
    }

    attributesArray.sort(function (a, b) { return (a.name > b.name) ? 1 : -1; }); // eslint-disable-line no-confusing-arrow

    for (var i$1 = 0; i$1 < attributesArray.length; i$1++)
    {
      attributesArray[i$1].location = i$1;
    }

    return attributes;
  };

  /**
   * returns the uniform data from the program
   * @private
   *
   * @param {webGL-program} [program] - the webgl program
   * @param {context} [gl] - the WebGL context
   *
   * @returns {object} the uniform data for this program
   */
  Program.prototype.getUniformData = function getUniformData (program, gl)
  {
    var uniforms = {};

    var totalUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

    // TODO expose this as a prop?
    // const maskRegex = new RegExp('^(projectionMatrix|uSampler|translationMatrix)$');
    // const maskRegex = new RegExp('^(projectionMatrix|uSampler|translationMatrix)$');

    for (var i = 0; i < totalUniforms; i++)
    {
      var uniformData = gl.getActiveUniform(program, i);
      var name = uniformData.name.replace(/\[.*?\]/, '');

      var isArray = uniformData.name.match(/\[.*?\]/, '');
      var type = mapType(gl, uniformData.type);

      /*eslint-disable */
      uniforms[name] = {
        type: type,
        size: uniformData.size,
        isArray:isArray,
        value: defaultValue(type, uniformData.size),
      };
      /* eslint-enable */
    }

    return uniforms;
  };

  /**
   * The default vertex shader source
   *
   * @static
   * @constant
   * @member {string}
   */
  staticAccessors$3.defaultVertexSrc.get = function ()
  {
    return defaultVertex;
  };

  /**
   * The default fragment shader source
   *
   * @static
   * @constant
   * @member {string}
   */
  staticAccessors$3.defaultFragmentSrc.get = function ()
  {
    return defaultFragment;
  };

  /**
   * A short hand function to create a program based of a vertex and fragment shader
   * this method will also check to see if there is a cached program.
   *
   * @param {string} [vertexSrc] - The source of the vertex shader.
   * @param {string} [fragmentSrc] - The source of the fragment shader.
   * @param {object} [uniforms] - Custom uniforms to use to augment the built-in ones.
   *
   * @returns {PIXI.Program} an shiny new Pixi shader!
   */
  Program.from = function from (vertexSrc, fragmentSrc, name)
  {
    var key = vertexSrc + fragmentSrc;

    var program = ProgramCache[key];

    if (!program)
    {
      ProgramCache[key] = program = new Program(vertexSrc, fragmentSrc, name);
    }

    return program;
  };

  Object.defineProperties( Program, staticAccessors$3 );

  /**
   * A helper class for shaders
   *
   * @class
   * @memberof PIXI
   */
  var Shader = function Shader(program, uniforms)
  {
    /**
     * Program that the shader uses
     *
     * @member {PIXI.Program}
     */
    this.program = program;

    // lets see whats been passed in
    // uniforms should be converted to a uniform group
    if (uniforms)
    {
      if (uniforms instanceof UniformGroup)
      {
        this.uniformGroup = uniforms;
      }
      else
      {
        this.uniformGroup = new UniformGroup(uniforms);
      }
    }
    else
    {
      this.uniformGroup = new UniformGroup({});
    }

    // time to build some getters and setters!
    // I guess down the line this could sort of generate an instruction list rather than use dirty ids?
    // does the trick for now though!
    for (var i in program.uniformData)
    {
      if (this.uniformGroup.uniforms[i] instanceof Array)
      {
        this.uniformGroup.uniforms[i] = new Float32Array(this.uniformGroup.uniforms[i]);
      }
    }
  };

  var prototypeAccessors$2$1 = { uniforms: { configurable: true } };

  // TODO move to shader system..
  Shader.prototype.checkUniformExists = function checkUniformExists (name, group)
  {
    if (group.uniforms[name])
    {
      return true;
    }

    for (var i in group.uniforms)
    {
      var uniform = group.uniforms[i];

      if (uniform.group)
      {
        if (this.checkUniformExists(name, uniform))
        {
          return true;
        }
      }
    }

    return false;
  };

  Shader.prototype.destroy = function destroy ()
  {
    // usage count on programs?
    // remove if not used!
    this.uniformGroup = null;
  };

  /**
   * Shader uniform values, shortcut for `uniformGroup.uniforms`
   * @readonly
   * @member {object}
   */
  prototypeAccessors$2$1.uniforms.get = function ()
  {
    return this.uniformGroup.uniforms;
  };

  /**
   * A short hand function to create a shader based of a vertex and fragment shader
   *
   * @param {string} [vertexSrc] - The source of the vertex shader.
   * @param {string} [fragmentSrc] - The source of the fragment shader.
   * @param {object} [uniforms] - Custom uniforms to use to augment the built-in ones.
   *
   * @returns {PIXI.Shader} an shiny new Pixi shader!
   */
  Shader.from = function from (vertexSrc, fragmentSrc, uniforms)
  {
    var program = Program.from(vertexSrc, fragmentSrc);

    return new Shader(program, uniforms);
  };

  Object.defineProperties( Shader.prototype, prototypeAccessors$2$1 );

  /* eslint-disable max-len */

  var BLEND = 0;
  var OFFSET = 1;
  var CULLING = 2;
  var DEPTH_TEST = 3;
  var WINDING = 4;

  /**
   * This is a WebGL state, and is is passed The WebGL StateManager.
   *
   * Each mesh rendered may require WebGL to be in a different state.
   * For example you may want different blend mode or to enable polygon offsets
   *
   * @class
   * @memberof PIXI
   */
  var State = function State()
  {
    this.data = 0;

    this.blendMode = BLEND_MODES.NORMAL;
    this.polygonOffset = 0;

    this.blend = true;
    //  this.depthTest = true;
  };

  var prototypeAccessors$3$1 = { blend: { configurable: true },offsets: { configurable: true },culling: { configurable: true },depthTest: { configurable: true },clockwiseFrontFace: { configurable: true },blendMode: { configurable: true },polygonOffset: { configurable: true } };

  /**
   * Activates blending of the computed fragment color values
   *
   * @member {boolean}
   */
  prototypeAccessors$3$1.blend.get = function ()
  {
    return !!(this.data & (1 << BLEND));
  };

  prototypeAccessors$3$1.blend.set = function (value) // eslint-disable-line require-jsdoc
  {
    if (!!(this.data & (1 << BLEND)) !== value)
    {
      this.data ^= (1 << BLEND);
    }
  };

  /**
   * Activates adding an offset to depth values of polygon's fragments
   *
   * @member {boolean}
   * @default false
   */
  prototypeAccessors$3$1.offsets.get = function ()
  {
    return !!(this.data & (1 << OFFSET));
  };

  prototypeAccessors$3$1.offsets.set = function (value) // eslint-disable-line require-jsdoc
  {
    if (!!(this.data & (1 << OFFSET)) !== value)
    {
      this.data ^= (1 << OFFSET);
    }
  };

  /**
   * Activates culling of polygons.
   *
   * @member {boolean}
   * @default false
   */
  prototypeAccessors$3$1.culling.get = function ()
  {
    return !!(this.data & (1 << CULLING));
  };

  prototypeAccessors$3$1.culling.set = function (value) // eslint-disable-line require-jsdoc
  {
    if (!!(this.data & (1 << CULLING)) !== value)
    {
      this.data ^= (1 << CULLING);
    }
  };

  /**
   * Activates depth comparisons and updates to the depth buffer.
   *
   * @member {boolean}
   * @default false
   */
  prototypeAccessors$3$1.depthTest.get = function ()
  {
    return !!(this.data & (1 << DEPTH_TEST));
  };

  prototypeAccessors$3$1.depthTest.set = function (value) // eslint-disable-line require-jsdoc
  {
    if (!!(this.data & (1 << DEPTH_TEST)) !== value)
    {
      this.data ^= (1 << DEPTH_TEST);
    }
  };

  /**
   * Specifies whether or not front or back-facing polygons can be culled.
   * @member {boolean}
   * @default false
   */
  prototypeAccessors$3$1.clockwiseFrontFace.get = function ()
  {
    return !!(this.data & (1 << WINDING));
  };

  prototypeAccessors$3$1.clockwiseFrontFace.set = function (value) // eslint-disable-line require-jsdoc
  {
    if (!!(this.data & (1 << WINDING)) !== value)
    {
      this.data ^= (1 << WINDING);
    }
  };

  /**
   * The blend mode to be applied when this state is set. Apply a value of `PIXI.BLEND_MODES.NORMAL` to reset the blend mode.
   * Setting this mode to anything other than NO_BLEND will automatically switch blending on.
   *
   * @member {number}
   * @default PIXI.BLEND_MODES.NORMAL
   * @see PIXI.BLEND_MODES
   */
  prototypeAccessors$3$1.blendMode.get = function ()
  {
    return this._blendMode;
  };

  prototypeAccessors$3$1.blendMode.set = function (value) // eslint-disable-line require-jsdoc
  {
    this.blend = (value !== BLEND_MODES.NONE);
    this._blendMode = value;
  };

  /**
   * The polygon offset. Setting this property to anything other than 0 will automatically enable polygon offset fill.
   *
   * @member {number}
   * @default 0
   */
  prototypeAccessors$3$1.polygonOffset.get = function ()
  {
    return this._polygonOffset;
  };

  prototypeAccessors$3$1.polygonOffset.set = function (value) // eslint-disable-line require-jsdoc
  {
    this.offsets = !!value;
    this._polygonOffset = value;
  };

  State.for2d = function for2d ()
  {
    var state = new State();

    state.depthTest = false;
    state.blend = true;

    return state;
  };

  Object.defineProperties( State.prototype, prototypeAccessors$3$1 );

  var defaultVertex$1 = "attribute vec2 aVertexPosition;\n\nuniform mat3 projectionMatrix;\n\nvarying vec2 vTextureCoord;\n\nuniform vec4 inputSize;\nuniform vec4 outputFrame;\n\nvec4 filterVertexPosition( void )\n{\n    vec2 position = aVertexPosition * max(outputFrame.zw, vec2(0.)) + outputFrame.xy;\n\n    return vec4((projectionMatrix * vec3(position, 1.0)).xy, 0.0, 1.0);\n}\n\nvec2 filterTextureCoord( void )\n{\n    return aVertexPosition * (outputFrame.zw * inputSize.zw);\n}\n\nvoid main(void)\n{\n    gl_Position = filterVertexPosition();\n    vTextureCoord = filterTextureCoord();\n}\n";

  var defaultFragment$1 = "varying vec2 vTextureCoord;\n\nuniform sampler2D uSampler;\n\nvoid main(void){\n   gl_FragColor = texture2D(uSampler, vTextureCoord);\n}\n";

  /**
   * Filter is a special type of WebGL shader that is applied to the screen.
   *
   * {@link http://pixijs.io/examples/#/filters/blur-filter.js Example} of the
   * {@link PIXI.filters.BlurFilter BlurFilter}.
   *
   * ### Usage
   * Filters can be applied to any DisplayObject or Container.
   * PixiJS' `FilterSystem` renders the container into temporary Framebuffer,
   * then filter renders it to the screen.
   * Multiple filters can be added to the `filters` array property and stacked on each other.
   *
   * ```
   * const filter = new PIXI.Filter(myShaderVert, myShaderFrag, { myUniform: 0.5 });
   * const container = new PIXI.Container();
   * container.filters = [filter];
   * ```
   *
   * ### Previous Version Differences
   *
   * In PixiJS **v3**, a filter was always applied to _whole screen_.
   *
   * In PixiJS **v4**, a filter can be applied _only part of the screen_.
   * Developers had to create a set of uniforms to deal with coordinates.
   *
   * In PixiJS **v5** combines _both approaches_.
   * Developers can use normal coordinates of v3 and then allow filter to use partial Framebuffers,
   * bringing those extra uniforms into account.
   *
   * Also be aware that we have changed default vertex shader, please consult
   * {@link https://github.com/pixijs/pixi.js/wiki/v5-Creating-filters Wiki}.
   *
   * ### Built-in Uniforms
   *
   * PixiJS viewport uses screen (CSS) coordinates, `(0, 0, renderer.screen.width, renderer.screen.height)`,
   * and `projectionMatrix` uniform maps it to the gl viewport.
   *
   * **uSampler**
   *
   * The most important uniform is the input texture that container was rendered into.
   * _Important note: as with all Framebuffers in PixiJS, both input and output are
   * premultiplied by alpha._
   *
   * By default, input normalized coordinates are passed to fragment shader with `vTextureCoord`.
   * Use it to sample the input.
   *
   * ```
   * const fragment = `
   * varying vec2 vTextureCoord;
   * uniform sampler2D uSampler;
   * void main(void)
   * {
   *    gl_FragColor = texture2D(uSampler, vTextureCoord);
   * }
   * `;
   *
   * const myFilter = new PIXI.Filter(null, fragment);
   * ```
   *
   * This filter is just one uniform less than {@link PIXI.filters.AlphaFilter AlphaFilter}.
   *
   * **outputFrame**
   *
   * The `outputFrame` holds the rectangle where filter is applied in screen (CSS) coordinates.
   * It's the same as `renderer.screen` for a fullscreen filter.
   * Only a part of  `outputFrame.zw` size of temporary Framebuffer is used,
   * `(0, 0, outputFrame.width, outputFrame.height)`,
   *
   * Filters uses this quad to normalized (0-1) space, its passed into `aVertexPosition` attribute.
   * To calculate vertex position in screen space using normalized (0-1) space:
   *
   * ```
   * vec4 filterVertexPosition( void )
   * {
   *     vec2 position = aVertexPosition * max(outputFrame.zw, vec2(0.)) + outputFrame.xy;
   *     return vec4((projectionMatrix * vec3(position, 1.0)).xy, 0.0, 1.0);
   * }
   * ```
   *
   * **inputSize**
   *
   * Temporary framebuffer is different, it can be either the size of screen, either power-of-two.
   * The `inputSize.xy` are size of temporary framebuffer that holds input.
   * The `inputSize.zw` is inverted, it's a shortcut to evade division inside the shader.
   *
   * Set `inputSize.xy = outputFrame.zw` for a fullscreen filter.
   *
   * To calculate input normalized coordinate, you have to map it to filter normalized space.
   * Multiply by `outputFrame.zw` to get input coordinate.
   * Divide by `inputSize.xy` to get input normalized coordinate.
   *
   * ```
   * vec2 filterTextureCoord( void )
   * {
   *     return aVertexPosition * (outputFrame.zw * inputSize.zw); // same as /inputSize.xy
   * }
   * ```
   * **resolution**
   *
   * The `resolution` is the ratio of screen (CSS) pixels to real pixels.
   *
   * **inputPixel**
   *
   * `inputPixel.xy` is the size of framebuffer in real pixels, same as `inputSize.xy * resolution`
   * `inputPixel.zw` is inverted `inputPixel.xy`.
   *
   * It's handy for filters that use neighbour pixels, like {@link PIXI.filters.FXAAFilter FXAAFilter}.
   *
   * **inputClamp**
   *
   * If you try to get info from outside of used part of Framebuffer - you'll get undefined behaviour.
   * For displacements, coordinates has to be clamped.
   *
   * The `inputClamp.xy` is left-top pixel center, you may ignore it, because we use left-top part of Framebuffer
   * `inputClamp.zw` is bottom-right pixel center.
   *
   * ```
   * vec4 color = texture2D(uSampler, clamp(modifigedTextureCoord, inputClamp.xy, inputClamp.zw))
   * ```
   * OR
   * ```
   * vec4 color = texture2D(uSampler, min(modifigedTextureCoord, inputClamp.zw))
   * ```
   *
   * ### Additional Information
   *
   * Complete documentation on Filter usage is located in the
   * {@link https://github.com/pixijs/pixi.js/wiki/v5-Creating-filters Wiki}.
   *
   * Since PixiJS only had a handful of built-in filters, additional filters can be downloaded
   * {@link https://github.com/pixijs/pixi-filters here} from the PixiJS Filters repository.
   *
   * @class
   * @memberof PIXI
   * @extends PIXI.Shader
   */
  var Filter = /*@__PURE__*/(function (Shader) {
    function Filter(vertexSrc, fragmentSrc, uniforms)
    {
      var program = Program.from(vertexSrc || Filter.defaultVertexSrc,
        fragmentSrc || Filter.defaultFragmentSrc);

      Shader.call(this, program, uniforms);

      /**
       * The padding of the filter. Some filters require extra space to breath such as a blur.
       * Increasing this will add extra width and height to the bounds of the object that the
       * filter is applied to.
       *
       * @member {number}
       */
      this.padding = 0;

      /**
       * The resolution of the filter. Setting this to be lower will lower the quality but
       * increase the performance of the filter.
       *
       * @member {number}
       */
      this.resolution = settings.FILTER_RESOLUTION;

      /**
       * If enabled is true the filter is applied, if false it will not.
       *
       * @member {boolean}
       */
      this.enabled = true;

      /**
       * If enabled, PixiJS will fit the filter area into boundaries for better performance.
       * Switch it off if it does not work for specific shader.
       *
       * @member {boolean}
       */
      this.autoFit = true;

      /**
       * Legacy filters use position and uvs from attributes
       * @member {boolean}
       * @readonly
       */
      this.legacy = !!this.program.attributeData.aTextureCoord;

      /**
       * The WebGL state the filter requires to render
       * @member {PIXI.State}
       */
      this.state = new State();
    }

    if ( Shader ) { Filter.__proto__ = Shader; }
    Filter.prototype = Object.create( Shader && Shader.prototype );
    Filter.prototype.constructor = Filter;

    var prototypeAccessors = { blendMode: { configurable: true } };
    var staticAccessors = { defaultVertexSrc: { configurable: true },defaultFragmentSrc: { configurable: true } };

    /**
     * Applies the filter
     *
     * @param {PIXI.systems.FilterSystem} filterManager - The renderer to retrieve the filter from
     * @param {PIXI.RenderTexture} input - The input render target.
     * @param {PIXI.RenderTexture} output - The target to output to.
     * @param {boolean} clear - Should the output be cleared before rendering to it
     * @param {object} [currentState] - It's current state of filter.
     *        There are some useful properties in the currentState :
     *        target, filters, sourceFrame, destinationFrame, renderTarget, resolution
     */
    Filter.prototype.apply = function apply (filterManager, input, output, clear, currentState)
    {
      // do as you please!

      filterManager.applyFilter(this, input, output, clear, currentState);

      // or just do a regular render..
    };

    /**
     * Sets the blendmode of the filter
     *
     * @member {number}
     * @default PIXI.BLEND_MODES.NORMAL
     */
    prototypeAccessors.blendMode.get = function ()
    {
      return this.state.blendMode;
    };

    prototypeAccessors.blendMode.set = function (value) // eslint-disable-line require-jsdoc
    {
      this.state.blendMode = value;
    };

    /**
     * The default vertex shader source
     *
     * @static
     * @type {string}
     * @constant
     */
    staticAccessors.defaultVertexSrc.get = function ()
    {
      return defaultVertex$1;
    };

    /**
     * The default fragment shader source
     *
     * @static
     * @type {string}
     * @constant
     */
    staticAccessors.defaultFragmentSrc.get = function ()
    {
      return defaultFragment$1;
    };

    Object.defineProperties( Filter.prototype, prototypeAccessors );
    Object.defineProperties( Filter, staticAccessors );

    return Filter;
  }(Shader));

  /**
   * Used for caching shader IDs
   *
   * @static
   * @type {object}
   * @protected
   */
  Filter.SOURCE_KEY_MAP = {};

  var vertex = "attribute vec2 aVertexPosition;\nattribute vec2 aTextureCoord;\n\nuniform mat3 projectionMatrix;\nuniform mat3 otherMatrix;\n\nvarying vec2 vMaskCoord;\nvarying vec2 vTextureCoord;\n\nvoid main(void)\n{\n    gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);\n\n    vTextureCoord = aTextureCoord;\n    vMaskCoord = ( otherMatrix * vec3( aTextureCoord, 1.0)  ).xy;\n}\n";

  var fragment = "varying vec2 vMaskCoord;\nvarying vec2 vTextureCoord;\n\nuniform sampler2D uSampler;\nuniform sampler2D mask;\nuniform float alpha;\nuniform float npmAlpha;\nuniform vec4 maskClamp;\n\nvoid main(void)\n{\n    float clip = step(3.5,\n        step(maskClamp.x, vMaskCoord.x) +\n        step(maskClamp.y, vMaskCoord.y) +\n        step(vMaskCoord.x, maskClamp.z) +\n        step(vMaskCoord.y, maskClamp.w));\n\n    vec4 original = texture2D(uSampler, vTextureCoord);\n    vec4 masky = texture2D(mask, vMaskCoord);\n    float alphaMul = 1.0 - npmAlpha * (1.0 - masky.a);\n\n    original *= (alphaMul * masky.r * alpha * clip);\n\n    gl_FragColor = original;\n}\n";

  var tempMat = new Matrix();

  /**
   * Class controls uv mapping from Texture normal space to BaseTexture normal space.
   *
   * Takes `trim` and `rotate` into account. May contain clamp settings for Meshes and TilingSprite.
   *
   * Can be used in Texture `uvMatrix` field, or separately, you can use different clamp settings on the same texture.
   * If you want to add support for texture region of certain feature or filter, that's what you're looking for.
   *
   * Takes track of Texture changes through `_lastTextureID` private field.
   * Use `update()` method call to track it from outside.
   *
   * @see PIXI.Texture
   * @see PIXI.Mesh
   * @see PIXI.TilingSprite
   * @class
   * @memberof PIXI
   */
  var TextureMatrix = function TextureMatrix(texture, clampMargin)
  {
    this._texture = texture;

    /**
     * Matrix operation that converts texture region coords to texture coords
     * @member {PIXI.Matrix}
     * @readonly
     */
    this.mapCoord = new Matrix();

    /**
     * Clamp region for normalized coords, left-top pixel center in xy , bottom-right in zw.
     * Calculated based on clampOffset.
     * @member {Float32Array}
     * @readonly
     */
    this.uClampFrame = new Float32Array(4);

    /**
     * Normalized clamp offset.
     * Calculated based on clampOffset.
     * @member {Float32Array}
     * @readonly
     */
    this.uClampOffset = new Float32Array(2);

    /**
     * Tracks Texture frame changes
     * @member {number}
     * @protected
     */
    this._updateID = -1;

    /**
     * Changes frame clamping
     * Works with TilingSprite and Mesh
     * Change to 1.5 if you texture has repeated right and bottom lines, that leads to smoother borders
     *
     * @default 0
     * @member {number}
     */
    this.clampOffset = 0;

    /**
     * Changes frame clamping
     * Works with TilingSprite and Mesh
     * Change to -0.5 to add a pixel to the edge, recommended for transparent trimmed textures in atlas
     *
     * @default 0.5
     * @member {number}
     */
    this.clampMargin = (typeof clampMargin === 'undefined') ? 0.5 : clampMargin;

    /**
     * If texture size is the same as baseTexture
     * @member {boolean}
     * @default false
     * @readonly
     */
    this.isSimple = false;
  };

  var prototypeAccessors$4$1 = { texture: { configurable: true } };

  /**
   * texture property
   * @member {PIXI.Texture}
   */
  prototypeAccessors$4$1.texture.get = function ()
  {
    return this._texture;
  };

  prototypeAccessors$4$1.texture.set = function (value) // eslint-disable-line require-jsdoc
  {
    this._texture = value;
    this._updateID = -1;
  };

  /**
   * Multiplies uvs array to transform
   * @param {Float32Array} uvs mesh uvs
   * @param {Float32Array} [out=uvs] output
   * @returns {Float32Array} output
   */
  TextureMatrix.prototype.multiplyUvs = function multiplyUvs (uvs, out)
  {
    if (out === undefined)
    {
      out = uvs;
    }

    var mat = this.mapCoord;

    for (var i = 0; i < uvs.length; i += 2)
    {
      var x = uvs[i];
      var y = uvs[i + 1];

      out[i] = (x * mat.a) + (y * mat.c) + mat.tx;
      out[i + 1] = (x * mat.b) + (y * mat.d) + mat.ty;
    }

    return out;
  };

  /**
   * updates matrices if texture was changed
   * @param {boolean} [forceUpdate=false] if true, matrices will be updated any case
   * @returns {boolean} whether or not it was updated
   */
  TextureMatrix.prototype.update = function update (forceUpdate)
  {
    var tex = this._texture;

    if (!tex || !tex.valid)
    {
      return false;
    }

    if (!forceUpdate
      && this._updateID === tex._updateID)
    {
      return false;
    }

    this._updateID = tex._updateID;

    var uvs = tex._uvs;

    this.mapCoord.set(uvs.x1 - uvs.x0, uvs.y1 - uvs.y0, uvs.x3 - uvs.x0, uvs.y3 - uvs.y0, uvs.x0, uvs.y0);

    var orig = tex.orig;
    var trim = tex.trim;

    if (trim)
    {
      tempMat.set(orig.width / trim.width, 0, 0, orig.height / trim.height,
        -trim.x / trim.width, -trim.y / trim.height);
      this.mapCoord.append(tempMat);
    }

    var texBase = tex.baseTexture;
    var frame = this.uClampFrame;
    var margin = this.clampMargin / texBase.resolution;
    var offset = this.clampOffset;

    frame[0] = (tex._frame.x + margin + offset) / texBase.width;
    frame[1] = (tex._frame.y + margin + offset) / texBase.height;
    frame[2] = (tex._frame.x + tex._frame.width - margin + offset) / texBase.width;
    frame[3] = (tex._frame.y + tex._frame.height - margin + offset) / texBase.height;
    this.uClampOffset[0] = offset / texBase.realWidth;
    this.uClampOffset[1] = offset / texBase.realHeight;

    this.isSimple = tex._frame.width === texBase.width
      && tex._frame.height === texBase.height
      && tex.rotate === 0;

    return true;
  };

  Object.defineProperties( TextureMatrix.prototype, prototypeAccessors$4$1 );

  /**
   * This handles a Sprite acting as a mask, as opposed to a Graphic.
   *
   * WebGL only.
   *
   * @class
   * @extends PIXI.Filter
   * @memberof PIXI
   */
  var SpriteMaskFilter = /*@__PURE__*/(function (Filter) {
    function SpriteMaskFilter(sprite)
    {
      var maskMatrix = new Matrix();

      Filter.call(this, vertex, fragment);

      sprite.renderable = false;

      /**
       * Sprite mask
       * @member {PIXI.Sprite}
       */
      this.maskSprite = sprite;

      /**
       * Mask matrix
       * @member {PIXI.Matrix}
       */
      this.maskMatrix = maskMatrix;
    }

    if ( Filter ) { SpriteMaskFilter.__proto__ = Filter; }
    SpriteMaskFilter.prototype = Object.create( Filter && Filter.prototype );
    SpriteMaskFilter.prototype.constructor = SpriteMaskFilter;

    /**
     * Applies the filter
     *
     * @param {PIXI.systems.FilterSystem} filterManager - The renderer to retrieve the filter from
     * @param {PIXI.RenderTexture} input - The input render target.
     * @param {PIXI.RenderTexture} output - The target to output to.
     * @param {boolean} clear - Should the output be cleared before rendering to it.
     */
    SpriteMaskFilter.prototype.apply = function apply (filterManager, input, output, clear)
    {
      var maskSprite = this.maskSprite;
      var tex = this.maskSprite.texture;

      if (!tex.valid)
      {
        return;
      }
      if (!tex.transform)
      {
        // margin = 0.0, let it bleed a bit, shader code becomes easier
        // assuming that atlas textures were made with 1-pixel padding
        tex.transform = new TextureMatrix(tex, 0.0);
      }
      tex.transform.update();

      this.uniforms.npmAlpha = tex.baseTexture.premultiplyAlpha ? 0.0 : 1.0;
      this.uniforms.mask = tex;
      // get _normalized sprite texture coords_ and convert them to _normalized atlas texture coords_ with `prepend`
      this.uniforms.otherMatrix = filterManager.calculateSpriteMatrix(this.maskMatrix, maskSprite)
        .prepend(tex.transform.mapCoord);
      this.uniforms.alpha = maskSprite.worldAlpha;
      this.uniforms.maskClamp = tex.transform.uClampFrame;

      filterManager.applyFilter(this, input, output, clear);
    };

    return SpriteMaskFilter;
  }(Filter));

  /**
   * System plugin to the renderer to manage masks.
   *
   * @class
   * @extends PIXI.System
   * @memberof PIXI.systems
   */
  var MaskSystem = /*@__PURE__*/(function (System) {
    function MaskSystem(renderer)
    {
      System.call(this, renderer);

      // TODO - we don't need both!
      /**
       * `true` if current pushed masked is scissor
       * @member {boolean}
       * @readonly
       */
      this.scissor = false;

      /**
       * Mask data
       * @member {PIXI.Graphics}
       * @readonly
       */
      this.scissorData = null;

      /**
       * Target to mask
       * @member {PIXI.DisplayObject}
       * @readonly
       */
      this.scissorRenderTarget = null;

      /**
       * Enable scissor
       * @member {boolean}
       * @readonly
       */
      this.enableScissor = false;

      /**
       * Pool of used sprite mask filters
       * @member {PIXI.SpriteMaskFilter[]}
       * @readonly
       */
      this.alphaMaskPool = [];

      /**
       * Current index of alpha mask pool
       * @member {number}
       * @default 0
       * @readonly
       */
      this.alphaMaskIndex = 0;
    }

    if ( System ) { MaskSystem.__proto__ = System; }
    MaskSystem.prototype = Object.create( System && System.prototype );
    MaskSystem.prototype.constructor = MaskSystem;

    /**
     * Applies the Mask and adds it to the current filter stack.
     *
     * @param {PIXI.DisplayObject} target - Display Object to push the mask to
     * @param {PIXI.Sprite|PIXI.Graphics} maskData - The masking data.
     */
    MaskSystem.prototype.push = function push (target, maskData)
    {
      // TODO the root check means scissor rect will not
      // be used on render textures more info here:
      // https://github.com/pixijs/pixi.js/pull/3545

      if (maskData.isSprite)
      {
        this.pushSpriteMask(target, maskData);
      }
      else if (this.enableScissor
        && !this.scissor
        && this.renderer._activeRenderTarget.root
        && !this.renderer.stencil.stencilMaskStack.length
        && maskData.isFastRect())
      {
        var matrix = maskData.worldTransform;

        var rot = Math.atan2(matrix.b, matrix.a);

        // use the nearest degree!
        rot = Math.round(rot * (180 / Math.PI));

        if (rot % 90)
        {
          this.pushStencilMask(maskData);
        }
        else
        {
          this.pushScissorMask(target, maskData);
        }
      }
      else
      {
        this.pushStencilMask(maskData);
      }
    };

    /**
     * Removes the last mask from the mask stack and doesn't return it.
     *
     * @param {PIXI.DisplayObject} target - Display Object to pop the mask from
     * @param {PIXI.Sprite|PIXI.Graphics} maskData - The masking data.
     */
    MaskSystem.prototype.pop = function pop (target, maskData)
    {
      if (maskData.isSprite)
      {
        this.popSpriteMask(target, maskData);
      }
      else if (this.enableScissor && !this.renderer.stencil.stencilMaskStack.length)
      {
        this.popScissorMask(target, maskData);
      }
      else
      {
        this.popStencilMask(target, maskData);
      }
    };

    /**
     * Applies the Mask and adds it to the current filter stack.
     *
     * @param {PIXI.RenderTexture} target - Display Object to push the sprite mask to
     * @param {PIXI.Sprite} maskData - Sprite to be used as the mask
     */
    MaskSystem.prototype.pushSpriteMask = function pushSpriteMask (target, maskData)
    {
      var alphaMaskFilter = this.alphaMaskPool[this.alphaMaskIndex];

      if (!alphaMaskFilter)
      {
        alphaMaskFilter = this.alphaMaskPool[this.alphaMaskIndex] = [new SpriteMaskFilter(maskData)];
      }

      alphaMaskFilter[0].resolution = this.renderer.resolution;
      alphaMaskFilter[0].maskSprite = maskData;

      var stashFilterArea = target.filterArea;

      target.filterArea = maskData.getBounds(true);
      this.renderer.filter.push(target, alphaMaskFilter);
      target.filterArea = stashFilterArea;

      this.alphaMaskIndex++;
    };

    /**
     * Removes the last filter from the filter stack and doesn't return it.
     *
     */
    MaskSystem.prototype.popSpriteMask = function popSpriteMask ()
    {
      this.renderer.filter.pop();
      this.alphaMaskIndex--;
    };

    /**
     * Applies the Mask and adds it to the current filter stack.
     *
     * @param {PIXI.Sprite|PIXI.Graphics} maskData - The masking data.
     */
    MaskSystem.prototype.pushStencilMask = function pushStencilMask (maskData)
    {
      this.renderer.batch.flush();
      this.renderer.stencil.pushStencil(maskData);
    };

    /**
     * Removes the last filter from the filter stack and doesn't return it.
     *
     */
    MaskSystem.prototype.popStencilMask = function popStencilMask ()
    {
      // this.renderer.currentRenderer.stop();
      this.renderer.stencil.popStencil();
    };

    /**
     *
     * @param {PIXI.DisplayObject} target - Display Object to push the mask to
     * @param {PIXI.Graphics} maskData - The masking data.
     */
    MaskSystem.prototype.pushScissorMask = function pushScissorMask (target, maskData)
    {
      maskData.renderable = true;

      var renderTarget = this.renderer._activeRenderTarget;

      var bounds = maskData.getBounds();

      bounds.fit(renderTarget.size);
      maskData.renderable = false;

      this.renderer.gl.enable(this.renderer.gl.SCISSOR_TEST);

      var resolution = this.renderer.resolution;

      this.renderer.gl.scissor(
        bounds.x * resolution,
        (renderTarget.root ? renderTarget.size.height - bounds.y - bounds.height : bounds.y) * resolution,
        bounds.width * resolution,
        bounds.height * resolution
      );

      this.scissorRenderTarget = renderTarget;
      this.scissorData = maskData;
      this.scissor = true;
    };

    /**
     * Pop scissor mask
     *
     */
    MaskSystem.prototype.popScissorMask = function popScissorMask ()
    {
      this.scissorRenderTarget = null;
      this.scissorData = null;
      this.scissor = false;

      // must be scissor!
      var ref = this.renderer;
      var gl = ref.gl;

      gl.disable(gl.SCISSOR_TEST);
    };

    return MaskSystem;
  }(System));

  /**
   * System plugin to the renderer to manage stencils (used for masks).
   *
   * @class
   * @extends PIXI.System
   * @memberof PIXI.systems
   */
  var StencilSystem = /*@__PURE__*/(function (System) {
    function StencilSystem(renderer)
    {
      System.call(this, renderer);

      /**
       * The mask stack
       * @member {PIXI.Graphics[]}
       */
      this.stencilMaskStack = [];
    }

    if ( System ) { StencilSystem.__proto__ = System; }
    StencilSystem.prototype = Object.create( System && System.prototype );
    StencilSystem.prototype.constructor = StencilSystem;

    /**
     * Changes the mask stack that is used by this System.
     *
     * @param {PIXI.Graphics[]} stencilMaskStack - The mask stack
     */
    StencilSystem.prototype.setMaskStack = function setMaskStack (stencilMaskStack)
    {
      var gl = this.renderer.gl;

      if (stencilMaskStack.length !== this.stencilMaskStack.length)
      {
        if (stencilMaskStack.length === 0)
        {
          gl.disable(gl.STENCIL_TEST);
        }
        else
        {
          gl.enable(gl.STENCIL_TEST);
        }
      }

      this.stencilMaskStack = stencilMaskStack;
    };

    /**
     * Applies the Mask and adds it to the current stencil stack. @alvin
     *
     * @param {PIXI.Graphics} graphics - The mask
     */
    StencilSystem.prototype.pushStencil = function pushStencil (graphics)
    {
      var gl = this.renderer.gl;
      var prevMaskCount = this.stencilMaskStack.length;

      if (prevMaskCount === 0)
      {
        gl.enable(gl.STENCIL_TEST);
      }

      this.stencilMaskStack.push(graphics);

      // Increment the reference stencil value where the new mask overlaps with the old ones.
      gl.colorMask(false, false, false, false);
      gl.stencilFunc(gl.EQUAL, prevMaskCount, this._getBitwiseMask());
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);

      graphics.renderable = true;
      graphics.render(this.renderer);
      this.renderer.batch.flush();
      graphics.renderable = false;

      this._useCurrent();
    };

    /**
     * Removes the last mask from the stencil stack. @alvin
     */
    StencilSystem.prototype.popStencil = function popStencil ()
    {
      var gl = this.renderer.gl;
      var graphics = this.stencilMaskStack.pop();

      if (this.stencilMaskStack.length === 0)
      {
        // the stack is empty!
        gl.disable(gl.STENCIL_TEST);
        gl.clear(gl.STENCIL_BUFFER_BIT);
        gl.clearStencil(0);
      }
      else
      {
        // Decrement the reference stencil value where the popped mask overlaps with the other ones
        gl.colorMask(false, false, false, false);
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.DECR);

        graphics.renderable = true;
        graphics.render(this.renderer);
        this.renderer.batch.flush();
        graphics.renderable = false;

        this._useCurrent();
      }
    };

    /**
     * Setup renderer to use the current stencil data.
     * @private
     */
    StencilSystem.prototype._useCurrent = function _useCurrent ()
    {
      var gl = this.renderer.gl;

      gl.colorMask(true, true, true, true);
      gl.stencilFunc(gl.EQUAL, this.stencilMaskStack.length, this._getBitwiseMask());
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
    };

    /**
     * Fill 1s equal to the number of acitve stencil masks.
     * @private
     * @return {number} The bitwise mask.
     */
    StencilSystem.prototype._getBitwiseMask = function _getBitwiseMask ()
    {
      return (1 << this.stencilMaskStack.length) - 1;
    };

    /**
     * Destroys the mask stack.
     *
     */
    StencilSystem.prototype.destroy = function destroy ()
    {
      System.prototype.destroy.call(this, this);

      this.stencilMaskStack = null;
    };

    return StencilSystem;
  }(System));

  /**
   * System plugin to the renderer to manage the projection matrix.
   *
   * @class
   * @extends PIXI.System
   * @memberof PIXI.systems
   */

  var ProjectionSystem = /*@__PURE__*/(function (System) {
    function ProjectionSystem(renderer)
    {
      System.call(this, renderer);

      /**
       * Destination frame
       * @member {PIXI.Rectangle}
       * @readonly
       */
      this.destinationFrame = null;

      /**
       * Source frame
       * @member {PIXI.Rectangle}
       * @readonly
       */
      this.sourceFrame = null;

      /**
       * Default destination frame
       * @member {PIXI.Rectangle}
       * @readonly
       */
      this.defaultFrame = null;

      /**
       * Project matrix
       * @member {PIXI.Matrix}
       * @readonly
       */
      this.projectionMatrix = new Matrix();

      /**
       * A transform that will be appended to the projection matrix
       * if null, nothing will be applied
       * @member {PIXI.Matrix}
       */
      this.transform = null;
    }

    if ( System ) { ProjectionSystem.__proto__ = System; }
    ProjectionSystem.prototype = Object.create( System && System.prototype );
    ProjectionSystem.prototype.constructor = ProjectionSystem;

    /**
     * Updates the projection matrix based on a projection frame (which is a rectangle)
     *
     * @param {PIXI.Rectangle} destinationFrame - The destination frame.
     * @param {PIXI.Rectangle} sourceFrame - The source frame.
     * @param {Number} resolution - Resolution
     * @param {boolean} root - If is root
     */
    ProjectionSystem.prototype.update = function update (destinationFrame, sourceFrame, resolution, root)
    {
      this.destinationFrame = destinationFrame || this.destinationFrame || this.defaultFrame;
      this.sourceFrame = sourceFrame || this.sourceFrame || destinationFrame;

      this.calculateProjection(this.destinationFrame, this.sourceFrame, resolution, root);

      if (this.transform)
      {
        this.projectionMatrix.append(this.transform);
      }

      var renderer =  this.renderer;

      renderer.globalUniforms.uniforms.projectionMatrix = this.projectionMatrix;
      renderer.globalUniforms.update();

      // this will work for now
      // but would be sweet to stick and even on the global uniforms..
      if (renderer.shader.shader)
      {
        renderer.shader.syncUniformGroup(renderer.shader.shader.uniforms.globals);
      }
    };

    /**
     * Updates the projection matrix based on a projection frame (which is a rectangle)
     *
     * @param {PIXI.Rectangle} destinationFrame - The destination frame.
     * @param {PIXI.Rectangle} sourceFrame - The source frame.
     * @param {Number} resolution - Resolution
     * @param {boolean} root - If is root
     */
    ProjectionSystem.prototype.calculateProjection = function calculateProjection (destinationFrame, sourceFrame, resolution, root)
    {
      var pm = this.projectionMatrix;

      // I don't think we will need this line..
      // pm.identity();

      if (!root)
      {
        pm.a = (1 / destinationFrame.width * 2) * resolution;
        pm.d = (1 / destinationFrame.height * 2) * resolution;

        pm.tx = -1 - (sourceFrame.x * pm.a);
        pm.ty = -1 - (sourceFrame.y * pm.d);
      }
      else
      {
        pm.a = (1 / destinationFrame.width * 2) * resolution;
        pm.d = (-1 / destinationFrame.height * 2) * resolution;

        pm.tx = -1 - (sourceFrame.x * pm.a);
        pm.ty = 1 - (sourceFrame.y * pm.d);
      }
    };

    /**
     * Sets the transform of the active render target to the given matrix
     *
     * @param {PIXI.Matrix} matrix - The transformation matrix
     */
    ProjectionSystem.prototype.setTransform = function setTransform ()// matrix)
    {
      // this._activeRenderTarget.transform = matrix;
    };

    return ProjectionSystem;
  }(System));

  var tempRect = new Rectangle();

  /**
   * System plugin to the renderer to manage render textures.
   *
   * Should be added after FramebufferSystem
   *
   * @class
   * @extends PIXI.System
   * @memberof PIXI.systems
   */

  var RenderTextureSystem = /*@__PURE__*/(function (System) {
    function RenderTextureSystem(renderer)
    {
      System.call(this, renderer);

      /**
       * The clear background color as rgba
       * @member {number[]}
       */
      this.clearColor = renderer._backgroundColorRgba;

      // TODO move this property somewhere else!
      /**
       * List of masks for the StencilSystem
       * @member {PIXI.Graphics[]}
       * @readonly
       */
      this.defaultMaskStack = [];

      // empty render texture?
      /**
       * Render texture
       * @member {PIXI.RenderTexture}
       * @readonly
       */
      this.current = null;

      /**
       * Source frame
       * @member {PIXI.Rectangle}
       * @readonly
       */
      this.sourceFrame = new Rectangle();

      /**
       * Destination frame
       * @member {PIXI.Rectangle}
       * @readonly
       */
      this.destinationFrame = new Rectangle();
    }

    if ( System ) { RenderTextureSystem.__proto__ = System; }
    RenderTextureSystem.prototype = Object.create( System && System.prototype );
    RenderTextureSystem.prototype.constructor = RenderTextureSystem;

    /**
     * Bind the current render texture
     * @param {PIXI.RenderTexture} [renderTexture] - RenderTexture to bind, by default its `null`, the screen
     * @param {PIXI.Rectangle} [sourceFrame] - part of screen that is mapped to the renderTexture
     * @param {PIXI.Rectangle} [destinationFrame] - part of renderTexture, by default it has the same size as sourceFrame
     */
    RenderTextureSystem.prototype.bind = function bind (renderTexture, sourceFrame, destinationFrame)
    {
      if ( renderTexture === void 0 ) { renderTexture = null; }

      this.current = renderTexture;

      var renderer = this.renderer;

      var resolution;

      if (renderTexture)
      {
        var baseTexture = renderTexture.baseTexture;

        resolution = baseTexture.resolution;

        if (!destinationFrame)
        {
          tempRect.width = baseTexture.realWidth;
          tempRect.height = baseTexture.realHeight;

          destinationFrame = tempRect;
        }

        if (!sourceFrame)
        {
          sourceFrame = destinationFrame;
        }

        this.renderer.framebuffer.bind(baseTexture.framebuffer, destinationFrame);

        this.renderer.projection.update(destinationFrame, sourceFrame, resolution, false);
        this.renderer.stencil.setMaskStack(baseTexture.stencilMaskStack);
      }
      else
      {
        resolution = this.renderer.resolution;

        // TODO these validation checks happen deeper down..
        // thing they can be avoided..
        if (!destinationFrame)
        {
          tempRect.width = renderer.width;
          tempRect.height = renderer.height;

          destinationFrame = tempRect;
        }

        if (!sourceFrame)
        {
          sourceFrame = destinationFrame;
        }

        renderer.framebuffer.bind(null, destinationFrame);

        // TODO store this..
        this.renderer.projection.update(destinationFrame, sourceFrame, resolution, true);
        this.renderer.stencil.setMaskStack(this.defaultMaskStack);
      }

      this.sourceFrame.copyFrom(sourceFrame);

      this.destinationFrame.x = destinationFrame.x / resolution;
      this.destinationFrame.y = destinationFrame.y / resolution;

      this.destinationFrame.width = destinationFrame.width / resolution;
      this.destinationFrame.height = destinationFrame.height / resolution;

      if (sourceFrame === destinationFrame)
      {
        this.sourceFrame.copyFrom(this.destinationFrame);
      }
    };

    /**
     * Erases the render texture and fills the drawing area with a colour
     *
     * @param {number[]} [clearColor] - The color as rgba, default to use the renderer backgroundColor
     * @return {PIXI.Renderer} Returns itself.
     */
    RenderTextureSystem.prototype.clear = function clear (clearColor)
    {
      if (this.current)
      {
        clearColor = clearColor || this.current.baseTexture.clearColor;
      }
      else
      {
        clearColor = clearColor || this.clearColor;
      }

      this.renderer.framebuffer.clear(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
    };

    RenderTextureSystem.prototype.resize = function resize ()// screenWidth, screenHeight)
    {
      // resize the root only!
      this.bind(null);
    };

    /**
     * Resets renderTexture state
     */
    RenderTextureSystem.prototype.reset = function reset ()
    {
      this.bind(null);
    };

    return RenderTextureSystem;
  }(System));

  /**
   * Helper class to create a WebGL Program
   *
   * @class
   * @memberof PIXI
   */
  var GLProgram = function GLProgram(program, uniformData)
  {
    /**
     * The shader program
     *
     * @member {WebGLProgram}
     */
    this.program = program;

    /**
     * holds the uniform data which contains uniform locations
     * and current uniform values used for caching and preventing unneeded GPU commands
     * @member {Object}
     */
    this.uniformData = uniformData;

    /**
     * uniformGroups holds the various upload functions for the shader. Each uniform group
     * and program have a unique upload function generated.
     * @member {Object}
     */
    this.uniformGroups = {};
  };

  /**
   * Destroys this program
   */
  GLProgram.prototype.destroy = function destroy ()
  {
    this.uniformData = null;
    this.uniformGroups = null;
    this.program = null;
  };

  var UID$4 = 0;

  /**
   * System plugin to the renderer to manage shaders.
   *
   * @class
   * @memberof PIXI.systems
   * @extends PIXI.System
   */
  var ShaderSystem = /*@__PURE__*/(function (System) {
    function ShaderSystem(renderer)
    {
      System.call(this, renderer);

      // Validation check that this environment support `new Function`
      this.systemCheck();

      /**
       * The current WebGL rendering context
       *
       * @member {WebGLRenderingContext}
       */
      this.gl = null;

      this.shader = null;
      this.program = null;

      /**
       * Cache to holds the generated functions. Stored against UniformObjects unique signature
       * @type {Object}
       * @private
       */
      this.cache = {};

      this.id = UID$4++;
    }

    if ( System ) { ShaderSystem.__proto__ = System; }
    ShaderSystem.prototype = Object.create( System && System.prototype );
    ShaderSystem.prototype.constructor = ShaderSystem;

    /**
     * Overrideable function by `@pixi/unsafe-eval` to silence
     * throwing an error if platform doesn't support unsafe-evals.
     *
     * @private
     */
    ShaderSystem.prototype.systemCheck = function systemCheck ()
    {
      if (!unsafeEvalSupported())
      {
        throw new Error('Current environment does not allow unsafe-eval, '
          + 'please use @pixi/unsafe-eval module to enable support.');
      }
    };

    ShaderSystem.prototype.contextChange = function contextChange (gl)
    {
      this.gl = gl;
      this.reset();
    };

    /**
     * Changes the current shader to the one given in parameter
     *
     * @param {PIXI.Shader} shader - the new shader
     * @param {boolean} dontSync - false if the shader should automatically sync its uniforms.
     * @returns {PIXI.GLProgram} the glProgram that belongs to the shader.
     */
    ShaderSystem.prototype.bind = function bind (shader, dontSync)
    {
      shader.uniforms.globals = this.renderer.globalUniforms;

      var program = shader.program;
      var glProgram = program.glPrograms[this.renderer.CONTEXT_UID] || this.generateShader(shader);

      this.shader = shader;

      // TODO - some current Pixi plugins bypass this.. so it not safe to use yet..
      if (this.program !== program)
      {
        this.program = program;
        this.gl.useProgram(glProgram.program);
      }

      if (!dontSync)
      {
        this.syncUniformGroup(shader.uniformGroup);
      }

      return glProgram;
    };

    /**
     * Uploads the uniforms values to the currently bound shader.
     *
     * @param {object} uniforms - the uniforms values that be applied to the current shader
     */
    ShaderSystem.prototype.setUniforms = function setUniforms (uniforms)
    {
      var shader = this.shader.program;
      var glProgram = shader.glPrograms[this.renderer.CONTEXT_UID];

      shader.syncUniforms(glProgram.uniformData, uniforms, this.renderer);
    };

    ShaderSystem.prototype.syncUniformGroup = function syncUniformGroup (group)
    {
      var glProgram = this.getglProgram();

      if (!group.static || group.dirtyId !== glProgram.uniformGroups[group.id])
      {
        glProgram.uniformGroups[group.id] = group.dirtyId;

        this.syncUniforms(group, glProgram);
      }
    };

    /**
     * Overrideable by the @pixi/unsafe-eval package to use static
     * syncUnforms instead.
     *
     * @private
     */
    ShaderSystem.prototype.syncUniforms = function syncUniforms (group, glProgram)
    {
      var syncFunc = group.syncUniforms[this.shader.program.id] || this.createSyncGroups(group);

      syncFunc(glProgram.uniformData, group.uniforms, this.renderer);
    };

    ShaderSystem.prototype.createSyncGroups = function createSyncGroups (group)
    {
      var id = this.getSignature(group, this.shader.program.uniformData);

      if (!this.cache[id])
      {
        this.cache[id] = generateUniformsSync(group, this.shader.program.uniformData);
      }

      group.syncUniforms[this.shader.program.id] = this.cache[id];

      return group.syncUniforms[this.shader.program.id];
    };

    /**
     * Takes a uniform group and data and generates a unique signature for them.
     *
     * @param {PIXI.UniformGroup} group the uniform group to get signature of
     * @param {Object} uniformData uniform information generated by the shader
     * @returns {String} Unique signature of the uniform group
     * @private
     */
    ShaderSystem.prototype.getSignature = function getSignature (group, uniformData)
    {
      var uniforms = group.uniforms;

      var strings = [];

      for (var i in uniforms)
      {
        strings.push(i);

        if (uniformData[i])
        {
          strings.push(uniformData[i].type);
        }
      }

      return strings.join('-');
    };

    /**
     * Returns the underlying GLShade rof the currently bound shader.
     * This can be handy for when you to have a little more control over the setting of your uniforms.
     *
     * @return {PIXI.GLProgram} the glProgram for the currently bound Shader for this context
     */
    ShaderSystem.prototype.getglProgram = function getglProgram ()
    {
      if (this.shader)
      {
        return this.shader.program.glPrograms[this.renderer.CONTEXT_UID];
      }

      return null;
    };

    /**
     * Generates a glProgram version of the Shader provided.
     *
     * @private
     * @param {PIXI.Shader} shader the shader that the glProgram will be based on.
     * @return {PIXI.GLProgram} A shiny new glProgram!
     */
    ShaderSystem.prototype.generateShader = function generateShader (shader)
    {
      var gl = this.gl;

      var program = shader.program;

      var attribMap = {};

      for (var i in program.attributeData)
      {
        attribMap[i] = program.attributeData[i].location;
      }

      var shaderProgram = compileProgram(gl, program.vertexSrc, program.fragmentSrc, attribMap);
      var uniformData = {};

      for (var i$1 in program.uniformData)
      {
        var data = program.uniformData[i$1];

        uniformData[i$1] = {
          location: gl.getUniformLocation(shaderProgram, i$1),
          value: defaultValue(data.type, data.size),
        };
      }

      var glProgram = new GLProgram(shaderProgram, uniformData);

      program.glPrograms[this.renderer.CONTEXT_UID] = glProgram;

      return glProgram;
    };

    /**
     * Resets ShaderSystem state, does not affect WebGL state
     */
    ShaderSystem.prototype.reset = function reset ()
    {
      this.program = null;
      this.shader = null;
    };

    /**
     * Destroys this System and removes all its textures
     */
    ShaderSystem.prototype.destroy = function destroy ()
    {
      // TODO implement destroy method for ShaderSystem
      this.destroyed = true;
    };

    return ShaderSystem;
  }(System));

  /**
   * Maps gl blend combinations to WebGL.
   *
   * @memberof PIXI
   * @function mapWebGLBlendModesToPixi
   * @private
   * @param {WebGLRenderingContext} gl - The rendering context.
   * @param {number[][]} [array=[]] - The array to output into.
   * @return {number[][]} Mapped modes.
   */
  function mapWebGLBlendModesToPixi(gl, array)
  {
    if ( array === void 0 ) { array = []; }

    // TODO - premultiply alpha would be different.
    // add a boolean for that!
    array[BLEND_MODES.NORMAL] = [gl.ONE, gl.ONE_MINUS_SRC_ALPHA];
    array[BLEND_MODES.ADD] = [gl.ONE, gl.ONE];
    array[BLEND_MODES.MULTIPLY] = [gl.DST_COLOR, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA];
    array[BLEND_MODES.SCREEN] = [gl.ONE, gl.ONE_MINUS_SRC_COLOR, gl.ONE, gl.ONE_MINUS_SRC_ALPHA];
    array[BLEND_MODES.OVERLAY] = [gl.ONE, gl.ONE_MINUS_SRC_ALPHA];
    array[BLEND_MODES.DARKEN] = [gl.ONE, gl.ONE_MINUS_SRC_ALPHA];
    array[BLEND_MODES.LIGHTEN] = [gl.ONE, gl.ONE_MINUS_SRC_ALPHA];
    array[BLEND_MODES.COLOR_DODGE] = [gl.ONE, gl.ONE_MINUS_SRC_ALPHA];
    array[BLEND_MODES.COLOR_BURN] = [gl.ONE, gl.ONE_MINUS_SRC_ALPHA];
    array[BLEND_MODES.HARD_LIGHT] = [gl.ONE, gl.ONE_MINUS_SRC_ALPHA];
    array[BLEND_MODES.SOFT_LIGHT] = [gl.ONE, gl.ONE_MINUS_SRC_ALPHA];
    array[BLEND_MODES.DIFFERENCE] = [gl.ONE, gl.ONE_MINUS_SRC_ALPHA];
    array[BLEND_MODES.EXCLUSION] = [gl.ONE, gl.ONE_MINUS_SRC_ALPHA];
    array[BLEND_MODES.HUE] = [gl.ONE, gl.ONE_MINUS_SRC_ALPHA];
    array[BLEND_MODES.SATURATION] = [gl.ONE, gl.ONE_MINUS_SRC_ALPHA];
    array[BLEND_MODES.COLOR] = [gl.ONE, gl.ONE_MINUS_SRC_ALPHA];
    array[BLEND_MODES.LUMINOSITY] = [gl.ONE, gl.ONE_MINUS_SRC_ALPHA];
    array[BLEND_MODES.NONE] = [0, 0];

    // not-premultiplied blend modes
    array[BLEND_MODES.NORMAL_NPM] = [gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA];
    array[BLEND_MODES.ADD_NPM] = [gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE];
    array[BLEND_MODES.SCREEN_NPM] = [gl.SRC_ALPHA, gl.ONE_MINUS_SRC_COLOR, gl.ONE, gl.ONE_MINUS_SRC_ALPHA];

    // composite operations
    array[BLEND_MODES.SRC_IN] = [gl.DST_ALPHA, gl.ZERO];
    array[BLEND_MODES.SRC_OUT] = [gl.ONE_MINUS_DST_ALPHA, gl.ZERO];
    array[BLEND_MODES.SRC_ATOP] = [gl.DST_ALPHA, gl.ONE_MINUS_SRC_ALPHA];
    array[BLEND_MODES.DST_OVER] = [gl.ONE_MINUS_DST_ALPHA, gl.ONE];
    array[BLEND_MODES.DST_IN] = [gl.ZERO, gl.SRC_ALPHA];
    array[BLEND_MODES.DST_OUT] = [gl.ZERO, gl.ONE_MINUS_SRC_ALPHA];
    array[BLEND_MODES.DST_ATOP] = [gl.ONE_MINUS_DST_ALPHA, gl.SRC_ALPHA];

    // SUBTRACT from flash
    array[BLEND_MODES.SUBTRACT] = [gl.ONE, gl.ONE, gl.ONE, gl.ONE, gl.FUNC_REVERSE_SUBTRACT, gl.FUNC_ADD];

    return array;
  }

  var BLEND$1 = 0;
  var OFFSET$1 = 1;
  var CULLING$1 = 2;
  var DEPTH_TEST$1 = 3;
  var WINDING$1 = 4;

  /**
   * System plugin to the renderer to manage WebGL state machines.
   *
   * @class
   * @extends PIXI.System
   * @memberof PIXI.systems
   */
  var StateSystem = /*@__PURE__*/(function (System) {
    function StateSystem(renderer)
    {
      System.call(this, renderer);

      /**
       * GL context
       * @member {WebGLRenderingContext}
       * @readonly
       */
      this.gl = null;

      /**
       * State ID
       * @member {number}
       * @readonly
       */
      this.stateId = 0;

      /**
       * Polygon offset
       * @member {number}
       * @readonly
       */
      this.polygonOffset = 0;

      /**
       * Blend mode
       * @member {number}
       * @default PIXI.BLEND_MODES.NONE
       * @readonly
       */
      this.blendMode = BLEND_MODES.NONE;

      /**
       * Whether current blend equation is different
       * @member {boolean}
       * @protected
       */
      this._blendEq = false;

      /**
       * Collection of calls
       * @member {function[]}
       * @readonly
       */
      this.map = [];

      // map functions for when we set state..
      this.map[BLEND$1] = this.setBlend;
      this.map[OFFSET$1] = this.setOffset;
      this.map[CULLING$1] = this.setCullFace;
      this.map[DEPTH_TEST$1] = this.setDepthTest;
      this.map[WINDING$1] = this.setFrontFace;

      /**
       * Collection of check calls
       * @member {function[]}
       * @readonly
       */
      this.checks = [];

      /**
       * Default WebGL State
       * @member {PIXI.State}
       * @readonly
       */
      this.defaultState = new State();
      this.defaultState.blend = true;
      this.defaultState.depth = true;
    }

    if ( System ) { StateSystem.__proto__ = System; }
    StateSystem.prototype = Object.create( System && System.prototype );
    StateSystem.prototype.constructor = StateSystem;

    StateSystem.prototype.contextChange = function contextChange (gl)
    {
      this.gl = gl;

      this.blendModes = mapWebGLBlendModesToPixi(gl);

      this.set(this.defaultState);

      this.reset();
    };

    /**
     * Sets the current state
     *
     * @param {*} state - The state to set.
     */
    StateSystem.prototype.set = function set (state)
    {
      state = state || this.defaultState;

      // TODO maybe to an object check? ( this.state === state )?
      if (this.stateId !== state.data)
      {
        var diff = this.stateId ^ state.data;
        var i = 0;

        // order from least to most common
        while (diff)
        {
          if (diff & 1)
          {
            // state change!
            this.map[i].call(this, !!(state.data & (1 << i)));
          }

          diff = diff >> 1;
          i++;
        }

        this.stateId = state.data;
      }

      // based on the above settings we check for specific modes..
      // for example if blend is active we check and set the blend modes
      // or of polygon offset is active we check the poly depth.
      for (var i$1 = 0; i$1 < this.checks.length; i$1++)
      {
        this.checks[i$1](this, state);
      }
    };

    /**
     * Sets the state, when previous state is unknown
     *
     * @param {*} state - The state to set
     */
    StateSystem.prototype.forceState = function forceState (state)
    {
      state = state || this.defaultState;
      for (var i = 0; i < this.map.length; i++)
      {
        this.map[i].call(this, !!(state.data & (1 << i)));
      }
      for (var i$1 = 0; i$1 < this.checks.length; i$1++)
      {
        this.checks[i$1](this, state);
      }

      this.stateId = state.data;
    };

    /**
     * Enables or disabled blending.
     *
     * @param {boolean} value - Turn on or off webgl blending.
     */
    StateSystem.prototype.setBlend = function setBlend (value)
    {
      this.updateCheck(StateSystem.checkBlendMode, value);

      this.gl[value ? 'enable' : 'disable'](this.gl.BLEND);
    };

    /**
     * Enables or disable polygon offset fill
     *
     * @param {boolean} value - Turn on or off webgl polygon offset testing.
     */
    StateSystem.prototype.setOffset = function setOffset (value)
    {
      this.updateCheck(StateSystem.checkPolygonOffset, value);

      this.gl[value ? 'enable' : 'disable'](this.gl.POLYGON_OFFSET_FILL);
    };

    /**
     * Sets whether to enable or disable depth test.
     *
     * @param {boolean} value - Turn on or off webgl depth testing.
     */
    StateSystem.prototype.setDepthTest = function setDepthTest (value)
    {
      this.gl[value ? 'enable' : 'disable'](this.gl.DEPTH_TEST);
    };

    /**
     * Sets whether to enable or disable cull face.
     *
     * @param {boolean} value - Turn on or off webgl cull face.
     */
    StateSystem.prototype.setCullFace = function setCullFace (value)
    {
      this.gl[value ? 'enable' : 'disable'](this.gl.CULL_FACE);
    };

    /**
     * Sets the gl front face.
     *
     * @param {boolean} value - true is clockwise and false is counter-clockwise
     */
    StateSystem.prototype.setFrontFace = function setFrontFace (value)
    {
      this.gl.frontFace(this.gl[value ? 'CW' : 'CCW']);
    };

    /**
     * Sets the blend mode.
     *
     * @param {number} value - The blend mode to set to.
     */
    StateSystem.prototype.setBlendMode = function setBlendMode (value)
    {
      if (value === this.blendMode)
      {
        return;
      }

      this.blendMode = value;

      var mode = this.blendModes[value];
      var gl = this.gl;

      if (mode.length === 2)
      {
        gl.blendFunc(mode[0], mode[1]);
      }
      else
      {
        gl.blendFuncSeparate(mode[0], mode[1], mode[2], mode[3]);
      }
      if (mode.length === 6)
      {
        this._blendEq = true;
        gl.blendEquationSeparate(mode[4], mode[5]);
      }
      else if (this._blendEq)
      {
        this._blendEq = false;
        gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);
      }
    };

    /**
     * Sets the polygon offset.
     *
     * @param {number} value - the polygon offset
     * @param {number} scale - the polygon offset scale
     */
    StateSystem.prototype.setPolygonOffset = function setPolygonOffset (value, scale)
    {
      this.gl.polygonOffset(value, scale);
    };

    // used
    /**
     * Resets all the logic and disables the vaos
     */
    StateSystem.prototype.reset = function reset ()
    {
      this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, false);

      this.forceState(0);

      this._blendEq = true;
      this.blendMode = -1;
      this.setBlendMode(0);
    };

    /**
     * checks to see which updates should be checked based on which settings have been activated.
     * For example, if blend is enabled then we should check the blend modes each time the state is changed
     * or if polygon fill is activated then we need to check if the polygon offset changes.
     * The idea is that we only check what we have too.
     *
     * @param {Function} func  the checking function to add or remove
     * @param {boolean} value  should the check function be added or removed.
     */
    StateSystem.prototype.updateCheck = function updateCheck (func, value)
    {
      var index = this.checks.indexOf(func);

      if (value && index === -1)
      {
        this.checks.push(func);
      }
      else if (!value && index !== -1)
      {
        this.checks.splice(index, 1);
      }
    };

    /**
     * A private little wrapper function that we call to check the blend mode.
     *
     * @static
     * @private
     * @param {PIXI.StateSystem} System  the System to perform the state check on
     * @param {PIXI.State} state  the state that the blendMode will pulled from
     */
    StateSystem.checkBlendMode = function checkBlendMode (system, state)
    {
      system.setBlendMode(state.blendMode);
    };

    /**
     * A private little wrapper function that we call to check the polygon offset.
     *
     * @static
     * @private
     * @param {PIXI.StateSystem} System  the System to perform the state check on
     * @param {PIXI.State} state  the state that the blendMode will pulled from
     */
    StateSystem.checkPolygonOffset = function checkPolygonOffset (system, state)
    {
      system.setPolygonOffset(state.polygonOffset, 0);
    };

    return StateSystem;
  }(System));

  /**
   * System plugin to the renderer to manage texture garbage collection on the GPU,
   * ensuring that it does not get clogged up with textures that are no longer being used.
   *
   * @class
   * @memberof PIXI.systems
   * @extends PIXI.System
   */
  var TextureGCSystem = /*@__PURE__*/(function (System) {
    function TextureGCSystem(renderer)
    {
      System.call(this, renderer);

      /**
       * Count
       * @member {number}
       * @readonly
       */
      this.count = 0;

      /**
       * Check count
       * @member {number}
       * @readonly
       */
      this.checkCount = 0;

      /**
       * Maximum idle time, in seconds
       * @member {number}
       * @see PIXI.settings.GC_MAX_IDLE
       */
      this.maxIdle = settings.GC_MAX_IDLE;

      /**
       * Maximum number of item to check
       * @member {number}
       * @see PIXI.settings.GC_MAX_CHECK_COUNT
       */
      this.checkCountMax = settings.GC_MAX_CHECK_COUNT;

      /**
       * Current garabage collection mode
       * @member {PIXI.GC_MODES}
       * @see PIXI.settings.GC_MODE
       */
      this.mode = settings.GC_MODE;
    }

    if ( System ) { TextureGCSystem.__proto__ = System; }
    TextureGCSystem.prototype = Object.create( System && System.prototype );
    TextureGCSystem.prototype.constructor = TextureGCSystem;

    /**
     * Checks to see when the last time a texture was used
     * if the texture has not been used for a specified amount of time it will be removed from the GPU
     */
    TextureGCSystem.prototype.postrender = function postrender ()
    {
      this.count++;

      if (this.mode === GC_MODES.MANUAL)
      {
        return;
      }

      this.checkCount++;

      if (this.checkCount > this.checkCountMax)
      {
        this.checkCount = 0;

        this.run();
      }
    };

    /**
     * Checks to see when the last time a texture was used
     * if the texture has not been used for a specified amount of time it will be removed from the GPU
     */
    TextureGCSystem.prototype.run = function run ()
    {
      var tm = this.renderer.texture;
      var managedTextures =  tm.managedTextures;
      var wasRemoved = false;

      for (var i = 0; i < managedTextures.length; i++)
      {
        var texture = managedTextures[i];

        // only supports non generated textures at the moment!
        if (!texture.framebuffer && this.count - texture.touched > this.maxIdle)
        {
          tm.destroyTexture(texture, true);
          managedTextures[i] = null;
          wasRemoved = true;
        }
      }

      if (wasRemoved)
      {
        var j = 0;

        for (var i$1 = 0; i$1 < managedTextures.length; i$1++)
        {
          if (managedTextures[i$1] !== null)
          {
            managedTextures[j++] = managedTextures[i$1];
          }
        }

        managedTextures.length = j;
      }
    };

    /**
     * Removes all the textures within the specified displayObject and its children from the GPU
     *
     * @param {PIXI.DisplayObject} displayObject - the displayObject to remove the textures from.
     */
    TextureGCSystem.prototype.unload = function unload (displayObject)
    {
      var tm = this.renderer.textureSystem;

      // only destroy non generated textures
      if (displayObject._texture && displayObject._texture._glRenderTargets)
      {
        tm.destroyTexture(displayObject._texture);
      }

      for (var i = displayObject.children.length - 1; i >= 0; i--)
      {
        this.unload(displayObject.children[i]);
      }
    };

    return TextureGCSystem;
  }(System));

  /**
   * Internal texture for WebGL context
   * @class
   * @memberof PIXI
   */
  var GLTexture = function GLTexture(texture)
  {
    /**
     * The WebGL texture
     * @member {WebGLTexture}
     */
    this.texture = texture;

    /**
     * Width of texture that was used in texImage2D
     * @member {number}
     */
    this.width = -1;

    /**
     * Height of texture that was used in texImage2D
     * @member {number}
     */
    this.height = -1;

    /**
     * Texture contents dirty flag
     * @member {number}
     */
    this.dirtyId = -1;

    /**
     * Texture style dirty flag
     * @member {number}
     */
    this.dirtyStyleId = -1;

    /**
     * Whether mip levels has to be generated
     * @member {boolean}
     */
    this.mipmap = false;

    /**
     * WrapMode copied from baseTexture
     * @member {number}
     */
    this.wrapMode = 33071;

    /**
     * Type copied from baseTexture
     * @member {number}
     */
    this.type = 6408;

    /**
     * Type copied from baseTexture
     * @member {number}
     */
    this.internalFormat = 5121;
  };

  /**
   * System plugin to the renderer to manage textures.
   *
   * @class
   * @extends PIXI.System
   * @memberof PIXI.systems
   */
  var TextureSystem = /*@__PURE__*/(function (System) {
    function TextureSystem(renderer)
    {
      System.call(this, renderer);

      // TODO set to max textures...
      /**
       * Bound textures
       * @member {PIXI.BaseTexture[]}
       * @readonly
       */
      this.boundTextures = [];
      /**
       * Current location
       * @member {number}
       * @readonly
       */
      this.currentLocation = -1;

      /**
       * List of managed textures
       * @member {PIXI.BaseTexture[]}
       * @readonly
       */
      this.managedTextures = [];

      /**
       * Did someone temper with textures state? We'll overwrite them when we need to unbind something.
       * @member {boolean}
       * @private
       */
      this._unknownBoundTextures = false;

      /**
       * BaseTexture value that shows that we don't know what is bound
       * @member {PIXI.BaseTexture}
       * @readonly
       */
      this.unknownTexture = new BaseTexture();
    }

    if ( System ) { TextureSystem.__proto__ = System; }
    TextureSystem.prototype = Object.create( System && System.prototype );
    TextureSystem.prototype.constructor = TextureSystem;

    /**
     * Sets up the renderer context and necessary buffers.
     */
    TextureSystem.prototype.contextChange = function contextChange ()
    {
      var gl = this.gl = this.renderer.gl;

      this.CONTEXT_UID = this.renderer.CONTEXT_UID;

      this.webGLVersion = this.renderer.context.webGLVersion;

      var maxTextures = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);

      this.boundTextures.length = maxTextures;

      for (var i = 0; i < maxTextures; i++)
      {
        this.boundTextures[i] = null;
      }

      // TODO move this.. to a nice make empty textures class..
      this.emptyTextures = {};

      var emptyTexture2D = new GLTexture(gl.createTexture());

      gl.bindTexture(gl.TEXTURE_2D, emptyTexture2D.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));

      this.emptyTextures[gl.TEXTURE_2D] = emptyTexture2D;
      this.emptyTextures[gl.TEXTURE_CUBE_MAP] = new GLTexture(gl.createTexture());

      gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.emptyTextures[gl.TEXTURE_CUBE_MAP].texture);

      for (var i$1 = 0; i$1 < 6; i$1++)
      {
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i$1, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      }

      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

      for (var i$2 = 0; i$2 < this.boundTextures.length; i$2++)
      {
        this.bind(null, i$2);
      }
    };

    /**
     * Bind a texture to a specific location
     *
     * If you want to unbind something, please use `unbind(texture)` instead of `bind(null, textureLocation)`
     *
     * @param {PIXI.Texture|PIXI.BaseTexture} texture - Texture to bind
     * @param {number} [location=0] - Location to bind at
     */
    TextureSystem.prototype.bind = function bind (texture, location)
    {
      if ( location === void 0 ) { location = 0; }

      var ref = this;
      var gl = ref.gl;

      if (texture)
      {
        texture = texture.baseTexture || texture;

        if (texture.valid)
        {
          texture.touched = this.renderer.textureGC.count;

          var glTexture = texture._glTextures[this.CONTEXT_UID] || this.initTexture(texture);

          if (this.currentLocation !== location)
          {
            this.currentLocation = location;
            gl.activeTexture(gl.TEXTURE0 + location);
          }

          if (this.boundTextures[location] !== texture)
          {
            gl.bindTexture(texture.target, glTexture.texture);
          }

          if (glTexture.dirtyId !== texture.dirtyId)
          {
            this.updateTexture(texture);
          }

          this.boundTextures[location] = texture;
        }
      }
      else
      {
        if (this.currentLocation !== location)
        {
          this.currentLocation = location;
          gl.activeTexture(gl.TEXTURE0 + location);
        }

        gl.bindTexture(gl.TEXTURE_2D, this.emptyTextures[gl.TEXTURE_2D].texture);
        this.boundTextures[location] = null;
      }
    };

    /**
     * Resets texture location and bound textures
     *
     * Actual `bind(null, i)` calls will be performed at next `unbind()` call
     */
    TextureSystem.prototype.reset = function reset ()
    {
      this._unknownBoundTextures = true;
      this.currentLocation = -1;

      for (var i = 0; i < this.boundTextures.length; i++)
      {
        this.boundTextures[i] = this.unknownTexture;
      }
    };

    /**
     * Unbind a texture
     * @param {PIXI.Texture|PIXI.BaseTexture} texture - Texture to bind
     */
    TextureSystem.prototype.unbind = function unbind (texture)
    {
      var ref = this;
      var gl = ref.gl;
      var boundTextures = ref.boundTextures;

      if (this._unknownBoundTextures)
      {
        this._unknownBoundTextures = false;
        // someone changed webGL state,
        // we have to be sure that our texture does not appear in multi-texture renderer samplers
        for (var i = 0; i < boundTextures.length; i++)
        {
          if (boundTextures[i] === this.unknownTexture)
          {
            this.bind(null, i);
          }
        }
      }

      for (var i$1 = 0; i$1 < boundTextures.length; i$1++)
      {
        if (boundTextures[i$1] === texture)
        {
          if (this.currentLocation !== i$1)
          {
            gl.activeTexture(gl.TEXTURE0 + i$1);
            this.currentLocation = i$1;
          }

          gl.bindTexture(gl.TEXTURE_2D, this.emptyTextures[texture.target].texture);
          boundTextures[i$1] = null;
        }
      }
    };

    /**
     * Initialize a texture
     *
     * @private
     * @param {PIXI.BaseTexture} texture - Texture to initialize
     */
    TextureSystem.prototype.initTexture = function initTexture (texture)
    {
      var glTexture = new GLTexture(this.gl.createTexture());

      // guarantee an update..
      glTexture.dirtyId = -1;

      texture._glTextures[this.CONTEXT_UID] = glTexture;

      this.managedTextures.push(texture);
      texture.on('dispose', this.destroyTexture, this);

      return glTexture;
    };

    TextureSystem.prototype.initTextureType = function initTextureType (texture, glTexture)
    {
      glTexture.internalFormat = texture.format;
      glTexture.type = texture.type;
      if (this.webGLVersion !== 2)
      {
        return;
      }
      var gl = this.renderer.gl;

      if (texture.type === gl.FLOAT
        && texture.format === gl.RGBA)
      {
        glTexture.internalFormat = gl.RGBA32F;
      }
      // that's WebGL1 HALF_FLOAT_OES
      // we have to convert it to WebGL HALF_FLOAT
      if (texture.type === TYPES.HALF_FLOAT)
      {
        glTexture.type = gl.HALF_FLOAT;
      }
      if (glTexture.type === gl.HALF_FLOAT
        && texture.format === gl.RGBA)
      {
        glTexture.internalFormat = gl.RGBA16F;
      }
    };

    /**
     * Update a texture
     *
     * @private
     * @param {PIXI.BaseTexture} texture - Texture to initialize
     */
    TextureSystem.prototype.updateTexture = function updateTexture (texture)
    {
      var glTexture = texture._glTextures[this.CONTEXT_UID];

      if (!glTexture)
      {
        return;
      }

      var renderer = this.renderer;

      this.initTextureType(texture, glTexture);

      if (texture.resource && texture.resource.upload(renderer, texture, glTexture))
      { ; }
      else
      {
        // default, renderTexture-like logic
        var width = texture.realWidth;
        var height = texture.realHeight;
        var gl = renderer.gl;

        if (glTexture.width !== width
          || glTexture.height !== height
          || glTexture.dirtyId < 0)
        {
          glTexture.width = width;
          glTexture.height = height;

          gl.texImage2D(texture.target, 0,
            glTexture.internalFormat,
            width,
            height,
            0,
            texture.format,
            glTexture.type,
            null);
        }
      }

      // lets only update what changes..
      if (texture.dirtyStyleId !== glTexture.dirtyStyleId)
      {
        this.updateTextureStyle(texture);
      }
      glTexture.dirtyId = texture.dirtyId;
    };

    /**
     * Deletes the texture from WebGL
     *
     * @private
     * @param {PIXI.BaseTexture|PIXI.Texture} texture - the texture to destroy
     * @param {boolean} [skipRemove=false] - Whether to skip removing the texture from the TextureManager.
     */
    TextureSystem.prototype.destroyTexture = function destroyTexture (texture, skipRemove)
    {
      var ref = this;
      var gl = ref.gl;

      texture = texture.baseTexture || texture;

      if (texture._glTextures[this.CONTEXT_UID])
      {
        this.unbind(texture);

        gl.deleteTexture(texture._glTextures[this.CONTEXT_UID].texture);
        texture.off('dispose', this.destroyTexture, this);

        delete texture._glTextures[this.CONTEXT_UID];

        if (!skipRemove)
        {
          var i = this.managedTextures.indexOf(texture);

          if (i !== -1)
          {
            removeItems(this.managedTextures, i, 1);
          }
        }
      }
    };

    /**
     * Update texture style such as mipmap flag
     *
     * @private
     * @param {PIXI.BaseTexture} texture - Texture to update
     */
    TextureSystem.prototype.updateTextureStyle = function updateTextureStyle (texture)
    {
      var glTexture = texture._glTextures[this.CONTEXT_UID];

      if (!glTexture)
      {
        return;
      }

      if ((texture.mipmap === MIPMAP_MODES.POW2 || this.webGLVersion !== 2) && !texture.isPowerOfTwo)
      {
        glTexture.mipmap = 0;
        glTexture.wrapMode = WRAP_MODES.CLAMP;
      }
      else
      {
        glTexture.mipmap = texture.mipmap >= 1;
        glTexture.wrapMode = texture.wrapMode;
      }

      if (texture.resource && texture.resource.style(this.renderer, texture, glTexture))
      { ; }
      else
      {
        this.setStyle(texture, glTexture);
      }

      glTexture.dirtyStyleId = texture.dirtyStyleId;
    };

    /**
     * Set style for texture
     *
     * @private
     * @param {PIXI.BaseTexture} texture - Texture to update
     * @param {PIXI.GLTexture} glTexture
     */
    TextureSystem.prototype.setStyle = function setStyle (texture, glTexture)
    {
      var gl = this.gl;

      if (glTexture.mipmap)
      {
        gl.generateMipmap(texture.target);
      }

      gl.texParameteri(texture.target, gl.TEXTURE_WRAP_S, glTexture.wrapMode);
      gl.texParameteri(texture.target, gl.TEXTURE_WRAP_T, glTexture.wrapMode);

      if (glTexture.mipmap)
      {
        /* eslint-disable max-len */
        gl.texParameteri(texture.target, gl.TEXTURE_MIN_FILTER, texture.scaleMode ? gl.LINEAR_MIPMAP_LINEAR : gl.NEAREST_MIPMAP_NEAREST);
        /* eslint-disable max-len */

        var anisotropicExt = this.renderer.context.extensions.anisotropicFiltering;

        if (anisotropicExt && texture.anisotropicLevel > 0 && texture.scaleMode === SCALE_MODES.LINEAR)
        {
          var level = Math.min(texture.anisotropicLevel, gl.getParameter(anisotropicExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT));

          gl.texParameterf(texture.target, anisotropicExt.TEXTURE_MAX_ANISOTROPY_EXT, level);
        }
      }
      else
      {
        gl.texParameteri(texture.target, gl.TEXTURE_MIN_FILTER, texture.scaleMode ? gl.LINEAR : gl.NEAREST);
      }

      gl.texParameteri(texture.target, gl.TEXTURE_MAG_FILTER, texture.scaleMode ? gl.LINEAR : gl.NEAREST);
    };

    return TextureSystem;
  }(System));

  /**
   * Systems are individual components to the Renderer pipeline.
   * @namespace PIXI.systems
   */

  var systems = ({
    FilterSystem: FilterSystem,
    BatchSystem: BatchSystem,
    ContextSystem: ContextSystem,
    FramebufferSystem: FramebufferSystem,
    GeometrySystem: GeometrySystem,
    MaskSystem: MaskSystem,
    StencilSystem: StencilSystem,
    ProjectionSystem: ProjectionSystem,
    RenderTextureSystem: RenderTextureSystem,
    ShaderSystem: ShaderSystem,
    StateSystem: StateSystem,
    TextureGCSystem: TextureGCSystem,
    TextureSystem: TextureSystem
  });

  var tempMatrix = new Matrix();

  /**
   * The AbstractRenderer is the base for a PixiJS Renderer. It is extended by the {@link PIXI.CanvasRenderer}
   * and {@link PIXI.Renderer} which can be used for rendering a PixiJS scene.
   *
   * @abstract
   * @class
   * @extends PIXI.utils.EventEmitter
   * @memberof PIXI
   */
  var AbstractRenderer = /*@__PURE__*/(function (EventEmitter) {
    function AbstractRenderer(system, options)
    {
      EventEmitter.call(this);

      // Add the default render options
      options = Object.assign({}, settings.RENDER_OPTIONS, options);

      // Deprecation notice for renderer roundPixels option
      if (options.roundPixels)
      {
        settings.ROUND_PIXELS = options.roundPixels;
        deprecation('5.0.0', 'Renderer roundPixels option is deprecated, please use PIXI.settings.ROUND_PIXELS', 2);
      }

      /**
       * The supplied constructor options.
       *
       * @member {Object}
       * @readOnly
       */
      this.options = options;

      /**
       * The type of the renderer.
       *
       * @member {number}
       * @default PIXI.RENDERER_TYPE.UNKNOWN
       * @see PIXI.RENDERER_TYPE
       */
      this.type = RENDERER_TYPE.UNKNOWN;

      /**
       * Measurements of the screen. (0, 0, screenWidth, screenHeight).
       *
       * Its safe to use as filterArea or hitArea for the whole stage.
       *
       * @member {PIXI.Rectangle}
       */
      this.screen = new Rectangle(0, 0, options.width, options.height);

      /**
       * The canvas element that everything is drawn to.
       *
       * @member {HTMLCanvasElement}
       */
      this.view = options.view || document.createElement('canvas');

      /**
       * The resolution / device pixel ratio of the renderer.
       *
       * @member {number}
       * @default 1
       */
      this.resolution = options.resolution || settings.RESOLUTION;

      /**
       * Whether the render view is transparent.
       *
       * @member {boolean}
       */
      this.transparent = options.transparent;

      /**
       * Whether CSS dimensions of canvas view should be resized to screen dimensions automatically.
       *
       * @member {boolean}
       */
      this.autoDensity = options.autoDensity || options.autoResize || false;
      // autoResize is deprecated, provides fallback support

      /**
       * The value of the preserveDrawingBuffer flag affects whether or not the contents of
       * the stencil buffer is retained after rendering.
       *
       * @member {boolean}
       */
      this.preserveDrawingBuffer = options.preserveDrawingBuffer;

      /**
       * This sets if the CanvasRenderer will clear the canvas or not before the new render pass.
       * If the scene is NOT transparent PixiJS will use a canvas sized fillRect operation every
       * frame to set the canvas background color. If the scene is transparent PixiJS will use clearRect
       * to clear the canvas every frame. Disable this by setting this to false. For example, if
       * your game has a canvas filling background image you often don't need this set.
       *
       * @member {boolean}
       * @default
       */
      this.clearBeforeRender = options.clearBeforeRender;

      /**
       * The background color as a number.
       *
       * @member {number}
       * @protected
       */
      this._backgroundColor = 0x000000;

      /**
       * The background color as an [R, G, B] array.
       *
       * @member {number[]}
       * @protected
       */
      this._backgroundColorRgba = [0, 0, 0, 0];

      /**
       * The background color as a string.
       *
       * @member {string}
       * @protected
       */
      this._backgroundColorString = '#000000';

      this.backgroundColor = options.backgroundColor || this._backgroundColor; // run bg color setter

      /**
       * This temporary display object used as the parent of the currently being rendered item.
       *
       * @member {PIXI.DisplayObject}
       * @protected
       */
      this._tempDisplayObjectParent = new Container();

      /**
       * The last root object that the renderer tried to render.
       *
       * @member {PIXI.DisplayObject}
       * @protected
       */
      this._lastObjectRendered = this._tempDisplayObjectParent;

      /**
       * Collection of plugins.
       * @readonly
       * @member {object}
       */
      this.plugins = {};
    }

    if ( EventEmitter ) { AbstractRenderer.__proto__ = EventEmitter; }
    AbstractRenderer.prototype = Object.create( EventEmitter && EventEmitter.prototype );
    AbstractRenderer.prototype.constructor = AbstractRenderer;

    var prototypeAccessors = { width: { configurable: true },height: { configurable: true },backgroundColor: { configurable: true } };

    /**
     * Initialize the plugins.
     *
     * @protected
     * @param {object} staticMap - The dictionary of statically saved plugins.
     */
    AbstractRenderer.prototype.initPlugins = function initPlugins (staticMap)
    {
      for (var o in staticMap)
      {
        this.plugins[o] = new (staticMap[o])(this);
      }
    };

    /**
     * Same as view.width, actual number of pixels in the canvas by horizontal.
     *
     * @member {number}
     * @readonly
     * @default 800
     */
    prototypeAccessors.width.get = function ()
    {
      return this.view.width;
    };

    /**
     * Same as view.height, actual number of pixels in the canvas by vertical.
     *
     * @member {number}
     * @readonly
     * @default 600
     */
    prototypeAccessors.height.get = function ()
    {
      return this.view.height;
    };

    /**
     * Resizes the screen and canvas to the specified width and height.
     * Canvas dimensions are multiplied by resolution.
     *
     * @param {number} screenWidth - The new width of the screen.
     * @param {number} screenHeight - The new height of the screen.
     */
    AbstractRenderer.prototype.resize = function resize (screenWidth, screenHeight)
    {
      this.screen.width = screenWidth;
      this.screen.height = screenHeight;

      this.view.width = screenWidth * this.resolution;
      this.view.height = screenHeight * this.resolution;

      if (this.autoDensity)
      {
        this.view.style.width = screenWidth + "px";
        this.view.style.height = screenHeight + "px";
      }
    };

    /**
     * Useful function that returns a texture of the display object that can then be used to create sprites
     * This can be quite useful if your displayObject is complicated and needs to be reused multiple times.
     *
     * @param {PIXI.DisplayObject} displayObject - The displayObject the object will be generated from.
     * @param {number} scaleMode - Should be one of the scaleMode consts.
     * @param {number} resolution - The resolution / device pixel ratio of the texture being generated.
     * @param {PIXI.Rectangle} [region] - The region of the displayObject, that shall be rendered,
     *        if no region is specified, defaults to the local bounds of the displayObject.
     * @return {PIXI.RenderTexture} A texture of the graphics object.
     */
    AbstractRenderer.prototype.generateTexture = function generateTexture (displayObject, scaleMode, resolution, region)
    {
      region = region || displayObject.getLocalBounds();

      // minimum texture size is 1x1, 0x0 will throw an error
      if (region.width === 0) { region.width = 1; }
      if (region.height === 0) { region.height = 1; }

      var renderTexture = RenderTexture.create(region.width | 0, region.height | 0, scaleMode, resolution);

      tempMatrix.tx = -region.x;
      tempMatrix.ty = -region.y;

      this.render(displayObject, renderTexture, false, tempMatrix, !!displayObject.parent);

      return renderTexture;
    };

    /**
     * Removes everything from the renderer and optionally removes the Canvas DOM element.
     *
     * @param {boolean} [removeView=false] - Removes the Canvas element from the DOM.
     */
    AbstractRenderer.prototype.destroy = function destroy (removeView)
    {
      for (var o in this.plugins)
      {
        this.plugins[o].destroy();
        this.plugins[o] = null;
      }

      if (removeView && this.view.parentNode)
      {
        this.view.parentNode.removeChild(this.view);
      }

      this.plugins = null;

      this.type = RENDERER_TYPE.UNKNOWN;

      this.view = null;

      this.screen = null;

      this.resolution = 0;

      this.transparent = false;

      this.autoDensity = false;

      this.blendModes = null;

      this.options = null;

      this.preserveDrawingBuffer = false;
      this.clearBeforeRender = false;

      this._backgroundColor = 0;
      this._backgroundColorRgba = null;
      this._backgroundColorString = null;

      this._tempDisplayObjectParent = null;
      this._lastObjectRendered = null;
    };

    /**
     * The background color to fill if not transparent
     *
     * @member {number}
     */
    prototypeAccessors.backgroundColor.get = function ()
    {
      return this._backgroundColor;
    };

    prototypeAccessors.backgroundColor.set = function (value) // eslint-disable-line require-jsdoc
    {
      this._backgroundColor = value;
      this._backgroundColorString = hex2string(value);
      hex2rgb(value, this._backgroundColorRgba);
    };

    Object.defineProperties( AbstractRenderer.prototype, prototypeAccessors );

    return AbstractRenderer;
  }(eventemitter3));

  /**
   * The Renderer draws the scene and all its content onto a WebGL enabled canvas.
   *
   * This renderer should be used for browsers that support WebGL.
   *
   * This renderer works by automatically managing WebGLBatchesm, so no need for Sprite Batches or Sprite Clouds.
   * Don't forget to add the view to your DOM or you will not see anything!
   *
   * @class
   * @memberof PIXI
   * @extends PIXI.AbstractRenderer
   */
  var Renderer = /*@__PURE__*/(function (AbstractRenderer) {
    function Renderer(options)
    {
      if ( options === void 0 ) { options = {}; }

      AbstractRenderer.call(this, 'WebGL', options);

      // the options will have been modified here in the super constructor with pixi's default settings..
      options = this.options;

      /**
       * The type of this renderer as a standardized const
       *
       * @member {number}
       * @see PIXI.RENDERER_TYPE
       */
      this.type = RENDERER_TYPE.WEBGL;

      // this will be set by the contextSystem (this.context)
      this.gl = null;
      this.CONTEXT_UID = 0;

      // TODO legacy!

      /**
       * Internal signal instances of **runner**, these
       * are assigned to each system created.
       * @see PIXI.Runner
       * @name PIXI.Renderer#runners
       * @private
       * @type {object}
       * @readonly
       * @property {PIXI.Runner} destroy - Destroy runner
       * @property {PIXI.Runner} contextChange - Context change runner
       * @property {PIXI.Runner} reset - Reset runner
       * @property {PIXI.Runner} update - Update runner
       * @property {PIXI.Runner} postrender - Post-render runner
       * @property {PIXI.Runner} prerender - Pre-render runner
       * @property {PIXI.Runner} resize - Resize runner
       */
      this.runners = {
        destroy: new Runner('destroy'),
        contextChange: new Runner('contextChange', 1),
        reset: new Runner('reset'),
        update: new Runner('update'),
        postrender: new Runner('postrender'),
        prerender: new Runner('prerender'),
        resize: new Runner('resize', 2),
      };

      /**
       * Global uniforms
       * @member {PIXI.UniformGroup}
       */
      this.globalUniforms = new UniformGroup({
        projectionMatrix: new Matrix(),
      }, true);

      /**
       * Mask system instance
       * @member {PIXI.systems.MaskSystem} mask
       * @memberof PIXI.Renderer#
       * @readonly
       */
      this.addSystem(MaskSystem, 'mask')
      /**
       * Context system instance
       * @member {PIXI.systems.ContextSystem} context
       * @memberof PIXI.Renderer#
       * @readonly
       */
        .addSystem(ContextSystem, 'context')
        /**
         * State system instance
         * @member {PIXI.systems.StateSystem} state
         * @memberof PIXI.Renderer#
         * @readonly
         */
        .addSystem(StateSystem, 'state')
        /**
         * Shader system instance
         * @member {PIXI.systems.ShaderSystem} shader
         * @memberof PIXI.Renderer#
         * @readonly
         */
        .addSystem(ShaderSystem, 'shader')
        /**
         * Texture system instance
         * @member {PIXI.systems.TextureSystem} texture
         * @memberof PIXI.Renderer#
         * @readonly
         */
        .addSystem(TextureSystem, 'texture')
        /**
         * Geometry system instance
         * @member {PIXI.systems.GeometrySystem} geometry
         * @memberof PIXI.Renderer#
         * @readonly
         */
        .addSystem(GeometrySystem, 'geometry')
        /**
         * Framebuffer system instance
         * @member {PIXI.systems.FramebufferSystem} framebuffer
         * @memberof PIXI.Renderer#
         * @readonly
         */
        .addSystem(FramebufferSystem, 'framebuffer')
        /**
         * Stencil system instance
         * @member {PIXI.systems.StencilSystem} stencil
         * @memberof PIXI.Renderer#
         * @readonly
         */
        .addSystem(StencilSystem, 'stencil')
        /**
         * Projection system instance
         * @member {PIXI.systems.ProjectionSystem} projection
         * @memberof PIXI.Renderer#
         * @readonly
         */
        .addSystem(ProjectionSystem, 'projection')
        /**
         * Texture garbage collector system instance
         * @member {PIXI.systems.TextureGCSystem} textureGC
         * @memberof PIXI.Renderer#
         * @readonly
         */
        .addSystem(TextureGCSystem, 'textureGC')
        /**
         * Filter system instance
         * @member {PIXI.systems.FilterSystem} filter
         * @memberof PIXI.Renderer#
         * @readonly
         */
        .addSystem(FilterSystem, 'filter')
        /**
         * RenderTexture system instance
         * @member {PIXI.systems.RenderTextureSystem} renderTexture
         * @memberof PIXI.Renderer#
         * @readonly
         */
        .addSystem(RenderTextureSystem, 'renderTexture')

        /**
         * Batch system instance
         * @member {PIXI.systems.BatchSystem} batch
         * @memberof PIXI.Renderer#
         * @readonly
         */
        .addSystem(BatchSystem, 'batch');

      this.initPlugins(Renderer.__plugins);

      /**
       * The options passed in to create a new WebGL context.
       */
      if (options.context)
      {
        this.context.initFromContext(options.context);
      }
      else
      {
        this.context.initFromOptions({
          alpha: this.transparent,
          antialias: options.antialias,
          premultipliedAlpha: this.transparent && this.transparent !== 'notMultiplied',
          stencil: true,
          preserveDrawingBuffer: options.preserveDrawingBuffer,
          powerPreference: this.options.powerPreference,
        });
      }

      /**
       * Flag if we are rendering to the screen vs renderTexture
       * @member {boolean}
       * @readonly
       * @default true
       */
      this.renderingToScreen = true;

      sayHello(this.context.webGLVersion === 2 ? 'WebGL 2' : 'WebGL 1');

      this.resize(this.options.width, this.options.height);
    }

    if ( AbstractRenderer ) { Renderer.__proto__ = AbstractRenderer; }
    Renderer.prototype = Object.create( AbstractRenderer && AbstractRenderer.prototype );
    Renderer.prototype.constructor = Renderer;

    /**
     * Add a new system to the renderer.
     * @param {Function} ClassRef - Class reference
     * @param {string} [name] - Property name for system, if not specified
     *        will use a static `name` property on the class itself. This
     *        name will be assigned as s property on the Renderer so make
     *        sure it doesn't collide with properties on Renderer.
     * @return {PIXI.Renderer} Return instance of renderer
     */
    Renderer.create = function create (options)
    {
      if (isWebGLSupported())
      {
        return new Renderer(options);
      }

      throw new Error('WebGL unsupported in this browser, use "pixi.js-legacy" for fallback canvas2d support.');
    };

    Renderer.prototype.addSystem = function addSystem (ClassRef, name)
    {
      if (!name)
      {
        name = ClassRef.name;
      }

      var system = new ClassRef(this);

      if (this[name])
      {
        throw new Error(("Whoops! The name \"" + name + "\" is already in use"));
      }

      this[name] = system;

      for (var i in this.runners)
      {
        this.runners[i].add(system);
      }

      /**
       * Fired after rendering finishes.
       *
       * @event PIXI.Renderer#postrender
       */

      /**
       * Fired before rendering starts.
       *
       * @event PIXI.Renderer#prerender
       */

      /**
       * Fired when the WebGL context is set.
       *
       * @event PIXI.Renderer#context
       * @param {WebGLRenderingContext} gl - WebGL context.
       */

      return this;
    };

    /**
     * Renders the object to its WebGL view
     *
     * @param {PIXI.DisplayObject} displayObject - The object to be rendered.
     * @param {PIXI.RenderTexture} [renderTexture] - The render texture to render to.
     * @param {boolean} [clear=true] - Should the canvas be cleared before the new render.
     * @param {PIXI.Matrix} [transform] - A transform to apply to the render texture before rendering.
     * @param {boolean} [skipUpdateTransform=false] - Should we skip the update transform pass?
     */
    Renderer.prototype.render = function render (displayObject, renderTexture, clear, transform, skipUpdateTransform)
    {
      // can be handy to know!
      this.renderingToScreen = !renderTexture;

      this.runners.prerender.run();
      this.emit('prerender');

      // apply a transform at a GPU level
      this.projection.transform = transform;

      // no point rendering if our context has been blown up!
      if (this.context.isLost)
      {
        return;
      }

      if (!renderTexture)
      {
        this._lastObjectRendered = displayObject;
      }

      if (!skipUpdateTransform)
      {
        // update the scene graph
        var cacheParent = displayObject.parent;

        displayObject.parent = this._tempDisplayObjectParent;
        displayObject.updateTransform();
        displayObject.parent = cacheParent;
        // displayObject.hitArea = //TODO add a temp hit area
      }

      this.renderTexture.bind(renderTexture);
      this.batch.currentRenderer.start();

      if (clear !== undefined ? clear : this.clearBeforeRender)
      {
        this.renderTexture.clear();
      }

      displayObject.render(this);

      // apply transform..
      this.batch.currentRenderer.flush();

      if (renderTexture)
      {
        renderTexture.baseTexture.update();
      }

      this.runners.postrender.run();

      // reset transform after render
      this.projection.transform = null;

      this.emit('postrender');
    };

    /**
     * Resizes the WebGL view to the specified width and height.
     *
     * @param {number} screenWidth - The new width of the screen.
     * @param {number} screenHeight - The new height of the screen.
     */
    Renderer.prototype.resize = function resize (screenWidth, screenHeight)
    {
      AbstractRenderer.prototype.resize.call(this, screenWidth, screenHeight);

      this.runners.resize.run(screenWidth, screenHeight);
    };

    /**
     * Resets the WebGL state so you can render things however you fancy!
     *
     * @return {PIXI.Renderer} Returns itself.
     */
    Renderer.prototype.reset = function reset ()
    {
      this.runners.reset.run();

      return this;
    };

    /**
     * Clear the frame buffer
     */
    Renderer.prototype.clear = function clear ()
    {
      this.framebuffer.bind();
      this.framebuffer.clear();
    };

    /**
     * Removes everything from the renderer (event listeners, spritebatch, etc...)
     *
     * @param {boolean} [removeView=false] - Removes the Canvas element from the DOM.
     *  See: https://github.com/pixijs/pixi.js/issues/2233
     */
    Renderer.prototype.destroy = function destroy (removeView)
    {
      this.runners.destroy.run();

      for (var r in this.runners)
      {
        this.runners[r].destroy();
      }

      // call base destroy
      AbstractRenderer.prototype.destroy.call(this, removeView);

      // TODO nullify all the managers..
      this.gl = null;
    };

    /**
     * Collection of installed plugins. These are included by default in PIXI, but can be excluded
     * by creating a custom build. Consult the README for more information about creating custom
     * builds and excluding plugins.
     * @name PIXI.Renderer#plugins
     * @type {object}
     * @readonly
     * @property {PIXI.accessibility.AccessibilityManager} accessibility Support tabbing interactive elements.
     * @property {PIXI.extract.Extract} extract Extract image data from renderer.
     * @property {PIXI.interaction.InteractionManager} interaction Handles mouse, touch and pointer events.
     * @property {PIXI.prepare.Prepare} prepare Pre-render display objects.
     */

    /**
     * Adds a plugin to the renderer.
     *
     * @method
     * @param {string} pluginName - The name of the plugin.
     * @param {Function} ctor - The constructor function or class for the plugin.
     */
    Renderer.registerPlugin = function registerPlugin (pluginName, ctor)
    {
      Renderer.__plugins = Renderer.__plugins || {};
      Renderer.__plugins[pluginName] = ctor;
    };

    return Renderer;
  }(AbstractRenderer));

  /**
   * This helper function will automatically detect which renderer you should be using.
   * WebGL is the preferred renderer as it is a lot faster. If WebGL is not supported by
   * the browser then this function will return a canvas renderer
   *
   * @memberof PIXI
   * @function autoDetectRenderer
   * @param {object} [options] - The optional renderer parameters
   * @param {number} [options.width=800] - the width of the renderers view
   * @param {number} [options.height=600] - the height of the renderers view
   * @param {HTMLCanvasElement} [options.view] - the canvas to use as a view, optional
   * @param {boolean} [options.transparent=false] - If the render view is transparent, default false
   * @param {boolean} [options.autoDensity=false] - Resizes renderer view in CSS pixels to allow for
   *   resolutions other than 1
   * @param {boolean} [options.antialias=false] - sets antialias
   * @param {boolean} [options.preserveDrawingBuffer=false] - enables drawing buffer preservation, enable this if you
   *  need to call toDataUrl on the webgl context
   * @param {number} [options.backgroundColor=0x000000] - The background color of the rendered area
   *  (shown if not transparent).
   * @param {boolean} [options.clearBeforeRender=true] - This sets if the renderer will clear the canvas or
   *   not before the new render pass.
   * @param {number} [options.resolution=1] - The resolution / device pixel ratio of the renderer, retina would be 2
   * @param {boolean} [options.forceCanvas=false] - prevents selection of WebGL renderer, even if such is present, this
   *   option only is available when using **pixi.js-legacy** or **@pixi/canvas-renderer** modules, otherwise
   *   it is ignored.
   * @param {boolean} [options.forceFXAA=false] - forces FXAA antialiasing to be used over native.
   *  FXAA is faster, but may not always look as great **webgl only**
   * @param {string} [options.powerPreference] - Parameter passed to webgl context, set to "high-performance"
   *  for devices with dual graphics card **webgl only**
   * @return {PIXI.Renderer|PIXI.CanvasRenderer} Returns WebGL renderer if available, otherwise CanvasRenderer
   */
  function autoDetectRenderer(options)
  {
    return Renderer.create(options);
  }

  var _default = "attribute vec2 aVertexPosition;\nattribute vec2 aTextureCoord;\n\nuniform mat3 projectionMatrix;\n\nvarying vec2 vTextureCoord;\n\nvoid main(void)\n{\n    gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);\n    vTextureCoord = aTextureCoord;\n}";

  var defaultFilter = "attribute vec2 aVertexPosition;\n\nuniform mat3 projectionMatrix;\n\nvarying vec2 vTextureCoord;\n\nuniform vec4 inputSize;\nuniform vec4 outputFrame;\n\nvec4 filterVertexPosition( void )\n{\n    vec2 position = aVertexPosition * max(outputFrame.zw, vec2(0.)) + outputFrame.xy;\n\n    return vec4((projectionMatrix * vec3(position, 1.0)).xy, 0.0, 1.0);\n}\n\nvec2 filterTextureCoord( void )\n{\n    return aVertexPosition * (outputFrame.zw * inputSize.zw);\n}\n\nvoid main(void)\n{\n    gl_Position = filterVertexPosition();\n    vTextureCoord = filterTextureCoord();\n}\n";

  /**
   * A Texture that depends on six other resources.
   *
   * @class
   * @extends PIXI.BaseTexture
   * @memberof PIXI
   */
  var CubeTexture = /*@__PURE__*/(function (BaseTexture) {
    function CubeTexture () {
      BaseTexture.apply(this, arguments);
    }

    if ( BaseTexture ) { CubeTexture.__proto__ = BaseTexture; }
    CubeTexture.prototype = Object.create( BaseTexture && BaseTexture.prototype );
    CubeTexture.prototype.constructor = CubeTexture;

    CubeTexture.from = function from (resources, options)
    {
      return new CubeTexture(new CubeResource(resources, options));
    };

    return CubeTexture;
  }(BaseTexture));

  /**
   * Used by the batcher to draw batches.
   * Each one of these contains all information required to draw a bound geometry.
   *
   * @class
   * @memberof PIXI
   */
  var BatchDrawCall = function BatchDrawCall()
  {
    this.textures = [];
    this.ids = [];
    this.blend = 0;
    this.textureCount = 0;
    this.start = 0;
    this.size = 0;
    this.type = 4;
  };

  /**
   * Flexible wrapper around `ArrayBuffer` that also provides
   * typed array views on demand.
   *
   * @class
   * @memberof PIXI
   */
  var ViewableBuffer = function ViewableBuffer(size)
  {
    /**
     * Underlying `ArrayBuffer` that holds all the data
     * and is of capacity `size`.
     *
     * @member {ArrayBuffer}
     */
    this.rawBinaryData = new ArrayBuffer(size);

    /**
     * View on the raw binary data as a `Uint32Array`.
     *
     * @member {Uint32Array}
     */
    this.uint32View = new Uint32Array(this.rawBinaryData);

    /**
     * View on the raw binary data as a `Float32Array`.
     *
     * @member {Float32Array}
     */
    this.float32View = new Float32Array(this.rawBinaryData);
  };

  var prototypeAccessors$5$1 = { int8View: { configurable: true },uint8View: { configurable: true },int16View: { configurable: true },uint16View: { configurable: true },int32View: { configurable: true } };

  /**
   * View on the raw binary data as a `Int8Array`.
   *
   * @member {Int8Array}
   */
  prototypeAccessors$5$1.int8View.get = function ()
  {
    if (!this._int8View)
    {
      this._int8View = new Int8Array(this.rawBinaryData);
    }

    return this._int8View;
  };

  /**
   * View on the raw binary data as a `Uint8Array`.
   *
   * @member {Uint8Array}
   */
  prototypeAccessors$5$1.uint8View.get = function ()
  {
    if (!this._uint8View)
    {
      this._uint8View = new Uint8Array(this.rawBinaryData);
    }

    return this._uint8View;
  };

  /**
   * View on the raw binary data as a `Int16Array`.
   *
   * @member {Int16Array}
   */
  prototypeAccessors$5$1.int16View.get = function ()
  {
    if (!this._int16View)
    {
      this._int16View = new Int16Array(this.rawBinaryData);
    }

    return this._int16View;
  };

  /**
   * View on the raw binary data as a `Uint16Array`.
   *
   * @member {Uint16Array}
   */
  prototypeAccessors$5$1.uint16View.get = function ()
  {
    if (!this._uint16View)
    {
      this._uint16View = new Uint16Array(this.rawBinaryData);
    }

    return this._uint16View;
  };

  /**
   * View on the raw binary data as a `Int32Array`.
   *
   * @member {Int32Array}
   */
  prototypeAccessors$5$1.int32View.get = function ()
  {
    if (!this._int32View)
    {
      this._int32View = new Int32Array(this.rawBinaryData);
    }

    return this._int32View;
  };

  /**
   * Returns the view of the given type.
   *
   * @param {string} type - One of `int8`, `uint8`, `int16`,
   *`uint16`, `int32`, `uint32`, and `float32`.
   * @return {object} typed array of given type
   */
  ViewableBuffer.prototype.view = function view (type)
  {
    return this[(type + "View")];
  };

  /**
   * Destroys all buffer references. Do not use after calling
   * this.
   */
  ViewableBuffer.prototype.destroy = function destroy ()
  {
    this.rawBinaryData = null;
    this._int8View = null;
    this._uint8View = null;
    this._int16View = null;
    this._uint16View = null;
    this._int32View = null;
    this.uint32View = null;
    this.float32View = null;
  };

  ViewableBuffer.sizeOf = function sizeOf (type)
  {
    switch (type)
    {
      case 'int8':
      case 'uint8':
        return 1;
      case 'int16':
      case 'uint16':
        return 2;
      case 'int32':
      case 'uint32':
      case 'float32':
        return 4;
      default:
        throw new Error((type + " isn't a valid view type"));
    }
  };

  Object.defineProperties( ViewableBuffer.prototype, prototypeAccessors$5$1 );

  /**
   * Renderer dedicated to drawing and batching sprites.
   *
   * This is the default batch renderer. It buffers objects
   * with texture-based geometries and renders them in
   * batches. It uploads multiple textures to the GPU to
   * reduce to the number of draw calls.
   *
   * @class
   * @protected
   * @memberof PIXI
   * @extends PIXI.ObjectRenderer
   */
  var AbstractBatchRenderer = /*@__PURE__*/(function (ObjectRenderer) {
    function AbstractBatchRenderer(renderer)
    {
      ObjectRenderer.call(this, renderer);

      /**
       * This is used to generate a shader that can
       * color each vertex based on a `aTextureId`
       * attribute that points to an texture in `uSampler`.
       *
       * This enables the objects with different textures
       * to be drawn in the same draw call.
       *
       * You can customize your shader by creating your
       * custom shader generator.
       *
       * @member {PIXI.BatchShaderGenerator}
       * @protected
       */
      this.shaderGenerator = null;

      /**
       * The class that represents the geometry of objects
       * that are going to be batched with this.
       *
       * @member {object}
       * @default PIXI.BatchGeometry
       * @protected
       */
      this.geometryClass = null;

      /**
       * Size of data being buffered per vertex in the
       * attribute buffers (in floats). By default, the
       * batch-renderer plugin uses 6:
       *
       * | aVertexPosition | 2 |
       * |-----------------|---|
       * | aTextureCoords  | 2 |
       * | aColor          | 1 |
       * | aTextureId      | 1 |
       *
       * @member {number}
       * @readonly
       */
      this.vertexSize = null;

      /**
       * The WebGL state in which this renderer will work.
       *
       * @member {PIXI.State}
       * @readonly
       */
      this.state = State.for2d();

      /**
       * The number of bufferable objects before a flush
       * occurs automatically.
       *
       * @member {number}
       * @default settings.SPRITE_MAX_TEXTURES
       */
      this.size = 2000 * 4;// settings.SPRITE_BATCH_SIZE, 2000 is a nice balance between mobile/desktop

      /**
       * Total count of all vertices used by the currently
       * buffered objects.
       *
       * @member {number}
       * @private
       */
      this._vertexCount = 0;

      /**
       * Total count of all indices used by the currently
       * buffered objects.
       *
       * @member {number}
       * @private
       */
      this._indexCount = 0;

      /**
       * Buffer of objects that are yet to be rendered.
       *
       * @member {PIXI.DisplayObject[]}
       * @private
       */
      this._bufferedElements = [];

      /**
       * Number of elements that are buffered and are
       * waiting to be flushed.
       *
       * @member {number}
       * @private
       */
      this._bufferSize = 0;

      /**
       * This shader is generated by `this.shaderGenerator`.
       *
       * It is generated specifically to handle the required
       * number of textures being batched together.
       *
       * @member {PIXI.Shader}
       * @protected
       */
      this._shader = null;

      /**
       * Pool of `this.geometryClass` geometry objects
       * that store buffers. They are used to pass data
       * to the shader on each draw call.
       *
       * These are never re-allocated again, unless a
       * context change occurs; however, the pool may
       * be expanded if required.
       *
       * @member {PIXI.Geometry[]}
       * @private
       * @see PIXI.AbstractBatchRenderer.contextChange
       */
      this._packedGeometries = [];

      /**
       * Size of `this._packedGeometries`. It can be expanded
       * if more than `this._packedGeometryPoolSize` flushes
       * occur in a single frame.
       *
       * @member {number}
       * @private
       */
      this._packedGeometryPoolSize = 2;

      /**
       * A flush may occur multiple times in a single
       * frame. On iOS devices or when
       * `settings.CAN_UPLOAD_SAME_BUFFER` is false, the
       * batch renderer does not upload data to the same
       * `WebGLBuffer` for performance reasons.
       *
       * This is the index into `packedGeometries` that points to
       * geometry holding the most recent buffers.
       *
       * @member {number}
       * @private
       */
      this._flushId = 0;

      /**
       * Pool of `BatchDrawCall` objects that `flush` used
       * to create "batches" of the objects being rendered.
       *
       * These are never re-allocated again.
       *
       * @member BatchDrawCall[]
       * @private
       */
      this._drawCalls = [];

      for (var k = 0; k < this.size / 4; k++)
      { // initialize the draw-calls pool to max size.
        this._drawCalls[k] = new BatchDrawCall();
      }

      /**
       * Pool of `ViewableBuffer` objects that are sorted in
       * order of increasing size. The flush method uses
       * the buffer with the least size above the amount
       * it requires. These are used for passing attributes.
       *
       * The first buffer has a size of 8; each subsequent
       * buffer has double capacity of its previous.
       *
       * @member {PIXI.ViewableBuffer}
       * @private
       * @see PIXI.AbstractBatchRenderer#getAttributeBuffer
       */
      this._aBuffers = {};

      /**
       * Pool of `Uint16Array` objects that are sorted in
       * order of increasing size. The flush method uses
       * the buffer with the least size above the amount
       * it requires. These are used for passing indices.
       *
       * The first buffer has a size of 12; each subsequent
       * buffer has double capacity of its previous.
       *
       * @member {Uint16Array[]}
       * @private
       * @see PIXI.AbstractBatchRenderer#getIndexBuffer
       */
      this._iBuffers = {};

      /**
       * Maximum number of textures that can be uploaded to
       * the GPU under the current context. It is initialized
       * properly in `this.contextChange`.
       *
       * @member {number}
       * @see PIXI.AbstractBatchRenderer#contextChange
       * @readonly
       */
      this.MAX_TEXTURES = 1;

      this.renderer.on('prerender', this.onPrerender, this);
      renderer.runners.contextChange.add(this);
    }

    if ( ObjectRenderer ) { AbstractBatchRenderer.__proto__ = ObjectRenderer; }
    AbstractBatchRenderer.prototype = Object.create( ObjectRenderer && ObjectRenderer.prototype );
    AbstractBatchRenderer.prototype.constructor = AbstractBatchRenderer;

    /**
     * Handles the `contextChange` signal.
     *
     * It calculates `this.MAX_TEXTURES` and allocating the
     * packed-geometry object pool.
     */
    AbstractBatchRenderer.prototype.contextChange = function contextChange ()
    {
      var gl = this.renderer.gl;

      if (settings.PREFER_ENV === ENV.WEBGL_LEGACY)
      {
        this.MAX_TEXTURES = 1;
      }
      else
      {
        // step 1: first check max textures the GPU can handle.
        this.MAX_TEXTURES = Math.min(
          gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
          settings.SPRITE_MAX_TEXTURES);

        // step 2: check the maximum number of if statements the shader can have too..
        this.MAX_TEXTURES = checkMaxIfStatementsInShader(
          this.MAX_TEXTURES, gl);
      }

      this._shader = this.shaderGenerator.generateShader(this.MAX_TEXTURES);

      // we use the second shader as the first one depending on your browser
      // may omit aTextureId as it is not used by the shader so is optimized out.
      for (var i = 0; i < this._packedGeometryPoolSize; i++)
      {
        /* eslint-disable max-len */
        this._packedGeometries[i] = new (this.geometryClass)();
      }
    };

    /**
     * Handles the `prerender` signal.
     *
     * It ensures that flushes start from the first geometry
     * object again.
     */
    AbstractBatchRenderer.prototype.onPrerender = function onPrerender ()
    {
      this._flushId = 0;
    };

    /**
     * Buffers the "batchable" object. It need not be rendered
     * immediately.
     *
     * @param {PIXI.Sprite} sprite - the sprite to render when
     *    using this spritebatch
     */
    AbstractBatchRenderer.prototype.render = function render (element)
    {
      if (!element._texture.valid)
      {
        return;
      }

      if (this._vertexCount + (element.vertexData.length / 2) > this.size)
      {
        this.flush();
      }

      this._vertexCount += element.vertexData.length / 2;
      this._indexCount += element.indices.length;
      this._bufferedElements[this._bufferSize++] = element;
    };

    /**
     * Renders the content _now_ and empties the current batch.
     */
    AbstractBatchRenderer.prototype.flush = function flush ()
    {
      if (this._vertexCount === 0)
      {
        return;
      }

      var attributeBuffer = this.getAttributeBuffer(this._vertexCount);
      var indexBuffer = this.getIndexBuffer(this._indexCount);
      var gl = this.renderer.gl;

      var ref = this;
      var elements = ref._bufferedElements;
      var drawCalls = ref._drawCalls;
      var MAX_TEXTURES = ref.MAX_TEXTURES;
      var packedGeometries = ref._packedGeometries;
      var vertexSize = ref.vertexSize;

      var touch = this.renderer.textureGC.count;

      var index = 0;
      var _indexCount = 0;

      var nextTexture;
      var currentTexture;
      var textureCount = 0;

      var currentGroup = drawCalls[0];
      var groupCount = 0;

      var blendMode = -1;// blend-mode of previous element/sprite/object!

      currentGroup.textureCount = 0;
      currentGroup.start = 0;
      currentGroup.blend = blendMode;

      var TICK = ++BaseTexture._globalBatch;
      var i;

      for (i = 0; i < this._bufferSize; ++i)
      {
        var sprite = elements[i];

        elements[i] = null;
        nextTexture = sprite._texture.baseTexture;

        var spriteBlendMode = premultiplyBlendMode[
          nextTexture.premultiplyAlpha ? 1 : 0][sprite.blendMode];

        if (blendMode !== spriteBlendMode)
        {
          blendMode = spriteBlendMode;

          // force the batch to break!
          currentTexture = null;
          textureCount = MAX_TEXTURES;
          TICK++;
        }

        if (currentTexture !== nextTexture)
        {
          currentTexture = nextTexture;

          if (nextTexture._batchEnabled !== TICK)
          {
            if (textureCount === MAX_TEXTURES)
            {
              TICK++;

              textureCount = 0;

              currentGroup.size = _indexCount - currentGroup.start;

              currentGroup = drawCalls[groupCount++];
              currentGroup.textureCount = 0;
              currentGroup.blend = blendMode;
              currentGroup.start = _indexCount;
            }

            nextTexture.touched = touch;
            nextTexture._batchEnabled = TICK;
            nextTexture._id = textureCount;

            currentGroup.textures[currentGroup.textureCount++] = nextTexture;
            textureCount++;
          }
        }

        this.packInterleavedGeometry(sprite, attributeBuffer,
          indexBuffer, index, _indexCount);

        // push a graphics..
        index += (sprite.vertexData.length / 2) * vertexSize;
        _indexCount += sprite.indices.length;
      }

      BaseTexture._globalBatch = TICK;
      currentGroup.size = _indexCount - currentGroup.start;

      if (!settings.CAN_UPLOAD_SAME_BUFFER)
      { /* Usually on iOS devices, where the browser doesn't
	            like uploads to the same buffer in a single frame. */
        if (this._packedGeometryPoolSize <= this._flushId)
        {
          this._packedGeometryPoolSize++;
          packedGeometries[this._flushId] = new (this.geometryClass)();
        }

        packedGeometries[this._flushId]._buffer.update(attributeBuffer.rawBinaryData, 0);
        packedGeometries[this._flushId]._indexBuffer.update(indexBuffer, 0);

        this.renderer.geometry.bind(packedGeometries[this._flushId]);
        this.renderer.geometry.updateBuffers();
        this._flushId++;
      }
      else
      {
        // lets use the faster option, always use buffer number 0
        packedGeometries[this._flushId]._buffer.update(attributeBuffer.rawBinaryData, 0);
        packedGeometries[this._flushId]._indexBuffer.update(indexBuffer, 0);

        this.renderer.geometry.updateBuffers();
      }

      var textureSystem = this.renderer.texture;
      var stateSystem = this.renderer.state;

      // Upload textures and do the draw calls
      for (i = 0; i < groupCount; i++)
      {
        var group = drawCalls[i];
        var groupTextureCount = group.textureCount;

        for (var j = 0; j < groupTextureCount; j++)
        {
          textureSystem.bind(group.textures[j], j);
          group.textures[j] = null;
        }

        stateSystem.setBlendMode(group.blend);
        gl.drawElements(group.type, group.size, gl.UNSIGNED_SHORT, group.start * 2);
      }

      // reset elements for the next flush
      this._bufferSize = 0;
      this._vertexCount = 0;
      this._indexCount = 0;
    };

    /**
     * Starts a new sprite batch.
     */
    AbstractBatchRenderer.prototype.start = function start ()
    {
      this.renderer.state.set(this.state);

      this.renderer.shader.bind(this._shader);

      if (settings.CAN_UPLOAD_SAME_BUFFER)
      {
        // bind buffer #0, we don't need others
        this.renderer.geometry.bind(this._packedGeometries[this._flushId]);
      }
    };

    /**
     * Stops and flushes the current batch.
     */
    AbstractBatchRenderer.prototype.stop = function stop ()
    {
      this.flush();
    };

    /**
     * Destroys this `AbstractBatchRenderer`. It cannot be used again.
     */
    AbstractBatchRenderer.prototype.destroy = function destroy ()
    {
      for (var i = 0; i < this._packedGeometryPoolSize; i++)
      {
        if (this._packedGeometries[i])
        {
          this._packedGeometries[i].destroy();
        }
      }

      this.renderer.off('prerender', this.onPrerender, this);

      this._aBuffers = null;
      this._iBuffers = null;
      this._packedGeometries = null;
      this._drawCalls = null;

      if (this._shader)
      {
        this._shader.destroy();
        this._shader = null;
      }

      ObjectRenderer.prototype.destroy.call(this);
    };

    /**
     * Fetches an attribute buffer from `this._aBuffers` that
     * can hold atleast `size` floats.
     *
     * @param {number} size - minimum capacity required
     * @return {ViewableBuffer} - buffer than can hold atleast `size` floats
     * @private
     */
    AbstractBatchRenderer.prototype.getAttributeBuffer = function getAttributeBuffer (size)
    {
      // 8 vertices is enough for 2 quads
      var roundedP2 = nextPow2(Math.ceil(size / 8));
      var roundedSizeIndex = log2(roundedP2);
      var roundedSize = roundedP2 * 8;

      if (this._aBuffers.length <= roundedSizeIndex)
      {
        this._iBuffers.length = roundedSizeIndex + 1;
      }

      var buffer = this._aBuffers[roundedSize];

      if (!buffer)
      {
        this._aBuffers[roundedSize] = buffer = new ViewableBuffer(roundedSize * this.vertexSize * 4);
      }

      return buffer;
    };

    /**
     * Fetches an index buffer from `this._iBuffers` that can
     * has atleast `size` capacity.
     *
     * @param {number} size - minimum required capacity
     * @return {Uint16Array} - buffer that can fit `size`
     *    indices.
     * @private
     */
    AbstractBatchRenderer.prototype.getIndexBuffer = function getIndexBuffer (size)
    {
      // 12 indices is enough for 2 quads
      var roundedP2 = nextPow2(Math.ceil(size / 12));
      var roundedSizeIndex = log2(roundedP2);
      var roundedSize = roundedP2 * 12;

      if (this._iBuffers.length <= roundedSizeIndex)
      {
        this._iBuffers.length = roundedSizeIndex + 1;
      }

      var buffer = this._iBuffers[roundedSizeIndex];

      if (!buffer)
      {
        this._iBuffers[roundedSizeIndex] = buffer = new Uint16Array(roundedSize);
      }

      return buffer;
    };

    /**
     * Takes the four batching parameters of `element`, interleaves
     * and pushes them into the batching attribute/index buffers given.
     *
     * It uses these properties: `vertexData` `uvs`, `textureId` and
     * `indicies`. It also uses the "tint" of the base-texture, if
     * present.
     *
     * @param {PIXI.Sprite} element - element being rendered
     * @param {PIXI.ViewableBuffer} attributeBuffer - attribute buffer.
     * @param {Uint16Array} indexBuffer - index buffer
     * @param {number} aIndex - number of floats already in the attribute buffer
     * @param {number} iIndex - number of indices already in `indexBuffer`
     */
    AbstractBatchRenderer.prototype.packInterleavedGeometry = function packInterleavedGeometry (element, attributeBuffer, indexBuffer, aIndex, iIndex)
    {
      var uint32View = attributeBuffer.uint32View;
      var float32View = attributeBuffer.float32View;

      var packedVertices = aIndex / this.vertexSize;
      var uvs = element.uvs;
      var indicies = element.indices;
      var vertexData = element.vertexData;
      var textureId = element._texture.baseTexture._id;

      var alpha = Math.min(element.worldAlpha, 1.0);
      var argb = (alpha < 1.0
        && element._texture.baseTexture.premultiplyAlpha)
        ? premultiplyTint(element._tintRGB, alpha)
        : element._tintRGB + (alpha * 255 << 24);

      // lets not worry about tint! for now..
      for (var i = 0; i < vertexData.length; i += 2)
      {
        float32View[aIndex++] = vertexData[i];
        float32View[aIndex++] = vertexData[i + 1];
        float32View[aIndex++] = uvs[i];
        float32View[aIndex++] = uvs[i + 1];
        uint32View[aIndex++] = argb;
        float32View[aIndex++] = textureId;
      }

      for (var i$1 = 0; i$1 < indicies.length; i$1++)
      {
        indexBuffer[iIndex++] = packedVertices + indicies[i$1];
      }
    };

    return AbstractBatchRenderer;
  }(ObjectRenderer));

  /**
   * Helper that generates batching multi-texture shader. Use it with your new BatchRenderer
   *
   * @class
   * @memberof PIXI
   */
  var BatchShaderGenerator = function BatchShaderGenerator(vertexSrc, fragTemplate)
  {
    /**
     * Reference to the vertex shader source.
     *
     * @member {string}
     */
    this.vertexSrc = vertexSrc;

    /**
     * Reference to the fragement shader template. Must contain "%count%" and "%forloop%".
     *
     * @member {string}
     */
    this.fragTemplate = fragTemplate;

    this.programCache = {};
    this.defaultGroupCache = {};

    if (fragTemplate.indexOf('%count%') < 0)
    {
      throw new Error('Fragment template must contain "%count%".');
    }

    if (fragTemplate.indexOf('%forloop%') < 0)
    {
      throw new Error('Fragment template must contain "%forloop%".');
    }
  };

  BatchShaderGenerator.prototype.generateShader = function generateShader (maxTextures)
  {
    if (!this.programCache[maxTextures])
    {
      var sampleValues = new Int32Array(maxTextures);

      for (var i = 0; i < maxTextures; i++)
      {
        sampleValues[i] = i;
      }

      this.defaultGroupCache[maxTextures] = UniformGroup.from({ uSamplers: sampleValues }, true);

      var fragmentSrc = this.fragTemplate;

      fragmentSrc = fragmentSrc.replace(/%count%/gi, ("" + maxTextures));
      fragmentSrc = fragmentSrc.replace(/%forloop%/gi, this.generateSampleSrc(maxTextures));

      this.programCache[maxTextures] = new Program(this.vertexSrc, fragmentSrc);
    }

    var uniforms = {
      tint: new Float32Array([1, 1, 1, 1]),
      translationMatrix: new Matrix(),
      default: this.defaultGroupCache[maxTextures],
    };

    return new Shader(this.programCache[maxTextures], uniforms);
  };

  BatchShaderGenerator.prototype.generateSampleSrc = function generateSampleSrc (maxTextures)
  {
    var src = '';

    src += '\n';
    src += '\n';

    for (var i = 0; i < maxTextures; i++)
    {
      if (i > 0)
      {
        src += '\nelse ';
      }

      if (i < maxTextures - 1)
      {
        src += "if(vTextureId < " + i + ".5)";
      }

      src += '\n{';
      src += "\n\tcolor = texture2D(uSamplers[" + i + "], vTextureCoord);";
      src += '\n}';
    }

    src += '\n';
    src += '\n';

    return src;
  };

  /**
   * Geometry used to batch standard PIXI content (e.g. Mesh, Sprite, Graphics objects).
   *
   * @class
   * @memberof PIXI
   */
  var BatchGeometry = /*@__PURE__*/(function (Geometry) {
    function BatchGeometry(_static)
    {
      if ( _static === void 0 ) { _static = false; }

      Geometry.call(this);

      /**
       * Buffer used for position, color, texture IDs
       *
       * @member {PIXI.Buffer}
       * @protected
       */
      this._buffer = new Buffer(null, _static, false);

      /**
       * Index buffer data
       *
       * @member {PIXI.Buffer}
       * @protected
       */
      this._indexBuffer = new Buffer(null, _static, true);

      this.addAttribute('aVertexPosition', this._buffer, 2, false, TYPES.FLOAT)
        .addAttribute('aTextureCoord', this._buffer, 2, false, TYPES.FLOAT)
        .addAttribute('aColor', this._buffer, 4, true, TYPES.UNSIGNED_BYTE)
        .addAttribute('aTextureId', this._buffer, 1, true, TYPES.FLOAT)
        .addIndex(this._indexBuffer);
    }

    if ( Geometry ) { BatchGeometry.__proto__ = Geometry; }
    BatchGeometry.prototype = Object.create( Geometry && Geometry.prototype );
    BatchGeometry.prototype.constructor = BatchGeometry;

    return BatchGeometry;
  }(Geometry));

  var defaultVertex$2 = "precision highp float;\nattribute vec2 aVertexPosition;\nattribute vec2 aTextureCoord;\nattribute vec4 aColor;\nattribute float aTextureId;\n\nuniform mat3 projectionMatrix;\nuniform mat3 translationMatrix;\nuniform vec4 tint;\n\nvarying vec2 vTextureCoord;\nvarying vec4 vColor;\nvarying float vTextureId;\n\nvoid main(void){\n    gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);\n\n    vTextureCoord = aTextureCoord;\n    vTextureId = aTextureId;\n    vColor = aColor * tint;\n}\n";

  var defaultFragment$2 = "varying vec2 vTextureCoord;\nvarying vec4 vColor;\nvarying float vTextureId;\nuniform sampler2D uSamplers[%count%];\n\nvoid main(void){\n    vec4 color;\n    %forloop%\n    gl_FragColor = color * vColor;\n}\n";

  /**
   * @class
   * @memberof PIXI
   * @hideconstructor
   */
  var BatchPluginFactory = function BatchPluginFactory () {};

  var staticAccessors$1$1 = { defaultVertexSrc: { configurable: true },defaultFragmentTemplate: { configurable: true } };

  BatchPluginFactory.create = function create (options)
  {
    var ref = Object.assign({
      vertex: defaultVertex$2,
      fragment: defaultFragment$2,
      geometryClass: BatchGeometry,
      vertexSize: 6,
    }, options);
    var vertex = ref.vertex;
    var fragment = ref.fragment;
    var vertexSize = ref.vertexSize;
    var geometryClass = ref.geometryClass;

    return /*@__PURE__*/(function (AbstractBatchRenderer) {
      function BatchPlugin(renderer)
      {
        AbstractBatchRenderer.call(this, renderer);

        this.shaderGenerator = new BatchShaderGenerator(vertex, fragment);
        this.geometryClass = geometryClass;
        this.vertexSize = vertexSize;
      }

      if ( AbstractBatchRenderer ) { BatchPlugin.__proto__ = AbstractBatchRenderer; }
      BatchPlugin.prototype = Object.create( AbstractBatchRenderer && AbstractBatchRenderer.prototype );
      BatchPlugin.prototype.constructor = BatchPlugin;

      return BatchPlugin;
    }(AbstractBatchRenderer));
  };

  /**
   * The default vertex shader source
   *
   * @static
   * @type {string}
   * @constant
   */
  staticAccessors$1$1.defaultVertexSrc.get = function ()
  {
    return defaultVertex$2;
  };

  /**
   * The default fragment shader source
   *
   * @static
   * @type {string}
   * @constant
   */
  staticAccessors$1$1.defaultFragmentTemplate.get = function ()
  {
    return defaultFragment$2;
  };

  Object.defineProperties( BatchPluginFactory, staticAccessors$1$1 );

  // Setup the default BatchRenderer plugin, this is what
  // we'll actually export at the root level
  var BatchRenderer = BatchPluginFactory.create();

  /*!
	 * @pixi/extract - v5.1.0
	 * Compiled Fri, 19 Jul 2019 21:58:39 UTC
	 *
	 * @pixi/extract is licensed under the MIT License.
	 * http://www.opensource.org/licenses/mit-license
	 */

  var TEMP_RECT = new Rectangle();
  var BYTES_PER_PIXEL = 4;

  /**
   * The extract manager provides functionality to export content from the renderers.
   *
   * An instance of this class is automatically created by default, and can be found at `renderer.plugins.extract`
   *
   * @class
   * @memberof PIXI.extract
   */
  var Extract = function Extract(renderer)
  {
    this.renderer = renderer;
    /**
     * Collection of methods for extracting data (image, pixels, etc.) from a display object or render texture
     *
     * @member {PIXI.extract.Extract} extract
     * @memberof PIXI.Renderer#
     * @see PIXI.extract.Extract
     */
    renderer.extract = this;
  };

  /**
   * Will return a HTML Image of the target
   *
   * @param {PIXI.DisplayObject|PIXI.RenderTexture} target - A displayObject or renderTexture
   *  to convert. If left empty will use the main renderer
   * @param {string} [format] - Image format, e.g. "image/jpeg" or "image/webp".
   * @param {number} [quality] - JPEG or Webp compression from 0 to 1. Default is 0.92.
   * @return {HTMLImageElement} HTML Image of the target
   */
  Extract.prototype.image = function image (target, format, quality)
  {
    var image = new Image();

    image.src = this.base64(target, format, quality);

    return image;
  };

  /**
   * Will return a a base64 encoded string of this target. It works by calling
   *  `Extract.getCanvas` and then running toDataURL on that.
   *
   * @param {PIXI.DisplayObject|PIXI.RenderTexture} target - A displayObject or renderTexture
   *  to convert. If left empty will use the main renderer
   * @param {string} [format] - Image format, e.g. "image/jpeg" or "image/webp".
   * @param {number} [quality] - JPEG or Webp compression from 0 to 1. Default is 0.92.
   * @return {string} A base64 encoded string of the texture.
   */
  Extract.prototype.base64 = function base64 (target, format, quality)
  {
    return this.canvas(target).toDataURL(format, quality);
  };

  /**
   * Creates a Canvas element, renders this target to it and then returns it.
   *
   * @param {PIXI.DisplayObject|PIXI.RenderTexture} target - A displayObject or renderTexture
   *  to convert. If left empty will use the main renderer
   * @return {HTMLCanvasElement} A Canvas element with the texture rendered on.
   */
  Extract.prototype.canvas = function canvas (target)
  {
    var renderer = this.renderer;
    var resolution;
    var frame;
    var flipY = false;
    var renderTexture;
    var generated = false;

    if (target)
    {
      if (target instanceof RenderTexture)
      {
        renderTexture = target;
      }
      else
      {
        renderTexture = this.renderer.generateTexture(target);
        generated = true;
      }
    }

    if (renderTexture)
    {
      resolution = renderTexture.baseTexture.resolution;
      frame = renderTexture.frame;
      flipY = false;
      renderer.renderTexture.bind(renderTexture);
    }
    else
    {
      resolution = this.renderer.resolution;

      flipY = true;

      frame = TEMP_RECT;
      frame.width = this.renderer.width;
      frame.height = this.renderer.height;

      renderer.renderTexture.bind(null);
    }

    var width = Math.floor(frame.width * resolution);
    var height = Math.floor(frame.height * resolution);

    var canvasBuffer = new CanvasRenderTarget(width, height, 1);

    var webglPixels = new Uint8Array(BYTES_PER_PIXEL * width * height);

    // read pixels to the array
    var gl = renderer.gl;

    gl.readPixels(
      frame.x * resolution,
      frame.y * resolution,
      width,
      height,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      webglPixels
    );

    // add the pixels to the canvas
    var canvasData = canvasBuffer.context.getImageData(0, 0, width, height);

    Extract.arrayPostDivide(webglPixels, canvasData.data);

    canvasBuffer.context.putImageData(canvasData, 0, 0);

    // pulling pixels
    if (flipY)
    {
      canvasBuffer.context.scale(1, -1);
      canvasBuffer.context.drawImage(canvasBuffer.canvas, 0, -height);
    }

    if (generated)
    {
      renderTexture.destroy(true);
    }

    // send the canvas back..
    return canvasBuffer.canvas;
  };

  /**
   * Will return a one-dimensional array containing the pixel data of the entire texture in RGBA
   * order, with integer values between 0 and 255 (included).
   *
   * @param {PIXI.DisplayObject|PIXI.RenderTexture} target - A displayObject or renderTexture
   *  to convert. If left empty will use the main renderer
   * @return {Uint8Array} One-dimensional array containing the pixel data of the entire texture
   */
  Extract.prototype.pixels = function pixels (target)
  {
    var renderer = this.renderer;
    var resolution;
    var frame;
    var renderTexture;
    var generated = false;

    if (target)
    {
      if (target instanceof RenderTexture)
      {
        renderTexture = target;
      }
      else
      {
        renderTexture = this.renderer.generateTexture(target);
        generated = true;
      }
    }

    if (renderTexture)
    {
      resolution = renderTexture.baseTexture.resolution;
      frame = renderTexture.frame;

      // bind the buffer
      renderer.renderTexture.bind(renderTexture);
    }
    else
    {
      resolution = renderer.resolution;

      frame = TEMP_RECT;
      frame.width = renderer.width;
      frame.height = renderer.height;

      renderer.renderTexture.bind(null);
    }

    var width = frame.width * resolution;
    var height = frame.height * resolution;

    var webglPixels = new Uint8Array(BYTES_PER_PIXEL * width * height);

    // read pixels to the array
    var gl = renderer.gl;

    gl.readPixels(
      frame.x * resolution,
      frame.y * resolution,
      width,
      height,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      webglPixels
    );

    if (generated)
    {
      renderTexture.destroy(true);
    }

    Extract.arrayPostDivide(webglPixels, webglPixels);

    return webglPixels;
  };

  /**
   * Destroys the extract
   *
   */
  Extract.prototype.destroy = function destroy ()
  {
    this.renderer.extract = null;
    this.renderer = null;
  };

  /**
   * Takes premultiplied pixel data and produces regular pixel data
   *
   * @private
   * @param pixels {number[] | Uint8Array | Uint8ClampedArray} array of pixel data
   * @param out {number[] | Uint8Array | Uint8ClampedArray} output array
   */
  Extract.arrayPostDivide = function arrayPostDivide (pixels, out)
  {
    for (var i = 0; i < pixels.length; i += 4)
    {
      var alpha = out[i + 3] = pixels[i + 3];

      if (alpha !== 0)
      {
        out[i] = Math.round(Math.min(pixels[i] * 255.0 / alpha, 255.0));
        out[i + 1] = Math.round(Math.min(pixels[i + 1] * 255.0 / alpha, 255.0));
        out[i + 2] = Math.round(Math.min(pixels[i + 2] * 255.0 / alpha, 255.0));
      }
      else
      {
        out[i] = pixels[i];
        out[i + 1] = pixels[i + 1];
        out[i + 2] = pixels[i + 2];
      }
    }
  };

  var extract_es = ({
    Extract: Extract
  });

  /*!
	 * @pixi/interaction - v5.1.0
	 * Compiled Fri, 19 Jul 2019 21:58:39 UTC
	 *
	 * @pixi/interaction is licensed under the MIT License.
	 * http://www.opensource.org/licenses/mit-license
	 */

  /**
   * Holds all information related to an Interaction event
   *
   * @class
   * @memberof PIXI.interaction
   */
  var InteractionData = function InteractionData()
  {
    /**
     * This point stores the global coords of where the touch/mouse event happened
     *
     * @member {PIXI.Point}
     */
    this.global = new Point();

    /**
     * The target Sprite that was interacted with
     *
     * @member {PIXI.Sprite}
     */
    this.target = null;

    /**
     * When passed to an event handler, this will be the original DOM Event that was captured
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent
     * @see https://developer.mozilla.org/en-US/docs/Web/API/TouchEvent
     * @see https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent
     * @member {MouseEvent|TouchEvent|PointerEvent}
     */
    this.originalEvent = null;

    /**
     * Unique identifier for this interaction
     *
     * @member {number}
     */
    this.identifier = null;

    /**
     * Indicates whether or not the pointer device that created the event is the primary pointer.
     * @see https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/isPrimary
     * @type {Boolean}
     */
    this.isPrimary = false;

    /**
     * Indicates which button was pressed on the mouse or pointer device to trigger the event.
     * @see https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button
     * @type {number}
     */
    this.button = 0;

    /**
     * Indicates which buttons are pressed on the mouse or pointer device when the event is triggered.
     * @see https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/buttons
     * @type {number}
     */
    this.buttons = 0;

    /**
     * The width of the pointer's contact along the x-axis, measured in CSS pixels.
     * radiusX of TouchEvents will be represented by this value.
     * @see https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/width
     * @type {number}
     */
    this.width = 0;

    /**
     * The height of the pointer's contact along the y-axis, measured in CSS pixels.
     * radiusY of TouchEvents will be represented by this value.
     * @see https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/height
     * @type {number}
     */
    this.height = 0;

    /**
     * The angle, in degrees, between the pointer device and the screen.
     * @see https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/tiltX
     * @type {number}
     */
    this.tiltX = 0;

    /**
     * The angle, in degrees, between the pointer device and the screen.
     * @see https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/tiltY
     * @type {number}
     */
    this.tiltY = 0;

    /**
     * The type of pointer that triggered the event.
     * @see https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/pointerType
     * @type {string}
     */
    this.pointerType = null;

    /**
     * Pressure applied by the pointing device during the event. A Touch's force property
     * will be represented by this value.
     * @see https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/pressure
     * @type {number}
     */
    this.pressure = 0;

    /**
     * From TouchEvents (not PointerEvents triggered by touches), the rotationAngle of the Touch.
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Touch/rotationAngle
     * @type {number}
     */
    this.rotationAngle = 0;

    /**
     * Twist of a stylus pointer.
     * @see https://w3c.github.io/pointerevents/#pointerevent-interface
     * @type {number}
     */
    this.twist = 0;

    /**
     * Barrel pressure on a stylus pointer.
     * @see https://w3c.github.io/pointerevents/#pointerevent-interface
     * @type {number}
     */
    this.tangentialPressure = 0;
  };

  var prototypeAccessors$6 = { pointerId: { configurable: true } };

  /**
   * The unique identifier of the pointer. It will be the same as `identifier`.
   * @readonly
   * @member {number}
   * @see https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/pointerId
   */
  prototypeAccessors$6.pointerId.get = function ()
  {
    return this.identifier;
  };

  /**
   * This will return the local coordinates of the specified displayObject for this InteractionData
   *
   * @param {PIXI.DisplayObject} displayObject - The DisplayObject that you would like the local
   *  coords off
   * @param {PIXI.Point} [point] - A Point object in which to store the value, optional (otherwise
   *  will create a new point)
   * @param {PIXI.Point} [globalPos] - A Point object containing your custom global coords, optional
   *  (otherwise will use the current global coords)
   * @return {PIXI.Point} A point containing the coordinates of the InteractionData position relative
   *  to the DisplayObject
   */
  InteractionData.prototype.getLocalPosition = function getLocalPosition (displayObject, point, globalPos)
  {
    return displayObject.worldTransform.applyInverse(globalPos || this.global, point);
  };

  /**
   * Copies properties from normalized event data.
   *
   * @param {Touch|MouseEvent|PointerEvent} event The normalized event data
   */
  InteractionData.prototype.copyEvent = function copyEvent (event)
  {
    // isPrimary should only change on touchstart/pointerdown, so we don't want to overwrite
    // it with "false" on later events when our shim for it on touch events might not be
    // accurate
    if (event.isPrimary)
    {
      this.isPrimary = true;
    }
    this.button = event.button;
    // event.buttons is not available in all browsers (ie. Safari), but it does have a non-standard
    // event.which property instead, which conveys the same information.
    this.buttons = Number.isInteger(event.buttons) ? event.buttons : event.which;
    this.width = event.width;
    this.height = event.height;
    this.tiltX = event.tiltX;
    this.tiltY = event.tiltY;
    this.pointerType = event.pointerType;
    this.pressure = event.pressure;
    this.rotationAngle = event.rotationAngle;
    this.twist = event.twist || 0;
    this.tangentialPressure = event.tangentialPressure || 0;
  };

  /**
   * Resets the data for pooling.
   */
  InteractionData.prototype.reset = function reset ()
  {
    // isPrimary is the only property that we really need to reset - everything else is
    // guaranteed to be overwritten
    this.isPrimary = false;
  };

  Object.defineProperties( InteractionData.prototype, prototypeAccessors$6 );

  /**
   * Event class that mimics native DOM events.
   *
   * @class
   * @memberof PIXI.interaction
   */
  var InteractionEvent = function InteractionEvent()
  {
    /**
     * Whether this event will continue propagating in the tree
     *
     * @member {boolean}
     */
    this.stopped = false;

    /**
     * The object which caused this event to be dispatched.
     * For listener callback see {@link PIXI.interaction.InteractionEvent.currentTarget}.
     *
     * @member {PIXI.DisplayObject}
     */
    this.target = null;

    /**
     * The object whose event listenerâ€™s callback is currently being invoked.
     *
     * @member {PIXI.DisplayObject}
     */
    this.currentTarget = null;

    /**
     * Type of the event
     *
     * @member {string}
     */
    this.type = null;

    /**
     * InteractionData related to this event
     *
     * @member {PIXI.interaction.InteractionData}
     */
    this.data = null;
  };

  /**
   * Prevents event from reaching any objects other than the current object.
   *
   */
  InteractionEvent.prototype.stopPropagation = function stopPropagation ()
  {
    this.stopped = true;
  };

  /**
   * Resets the event.
   */
  InteractionEvent.prototype.reset = function reset ()
  {
    this.stopped = false;
    this.currentTarget = null;
    this.target = null;
  };

  /**
   * DisplayObjects with the {@link PIXI.interaction.interactiveTarget} mixin use this class to track interactions
   *
   * @class
   * @private
   * @memberof PIXI.interaction
   */
  var InteractionTrackingData = function InteractionTrackingData(pointerId)
  {
    this._pointerId = pointerId;
    this._flags = InteractionTrackingData.FLAGS.NONE;
  };

  var prototypeAccessors$1$3 = { pointerId: { configurable: true },flags: { configurable: true },none: { configurable: true },over: { configurable: true },rightDown: { configurable: true },leftDown: { configurable: true } };

  /**
   *
   * @private
   * @param {number} flag - The interaction flag to set
   * @param {boolean} yn - Should the flag be set or unset
   */
  InteractionTrackingData.prototype._doSet = function _doSet (flag, yn)
  {
    if (yn)
    {
      this._flags = this._flags | flag;
    }
    else
    {
      this._flags = this._flags & (~flag);
    }
  };

  /**
   * Unique pointer id of the event
   *
   * @readonly
   * @private
   * @member {number}
   */
  prototypeAccessors$1$3.pointerId.get = function ()
  {
    return this._pointerId;
  };

  /**
   * State of the tracking data, expressed as bit flags
   *
   * @private
   * @member {number}
   */
  prototypeAccessors$1$3.flags.get = function ()
  {
    return this._flags;
  };

  prototypeAccessors$1$3.flags.set = function (flags) // eslint-disable-line require-jsdoc
  {
    this._flags = flags;
  };

  /**
   * Is the tracked event inactive (not over or down)?
   *
   * @private
   * @member {number}
   */
  prototypeAccessors$1$3.none.get = function ()
  {
    return this._flags === this.constructor.FLAGS.NONE;
  };

  /**
   * Is the tracked event over the DisplayObject?
   *
   * @private
   * @member {boolean}
   */
  prototypeAccessors$1$3.over.get = function ()
  {
    return (this._flags & this.constructor.FLAGS.OVER) !== 0;
  };

  prototypeAccessors$1$3.over.set = function (yn) // eslint-disable-line require-jsdoc
  {
    this._doSet(this.constructor.FLAGS.OVER, yn);
  };

  /**
   * Did the right mouse button come down in the DisplayObject?
   *
   * @private
   * @member {boolean}
   */
  prototypeAccessors$1$3.rightDown.get = function ()
  {
    return (this._flags & this.constructor.FLAGS.RIGHT_DOWN) !== 0;
  };

  prototypeAccessors$1$3.rightDown.set = function (yn) // eslint-disable-line require-jsdoc
  {
    this._doSet(this.constructor.FLAGS.RIGHT_DOWN, yn);
  };

  /**
   * Did the left mouse button come down in the DisplayObject?
   *
   * @private
   * @member {boolean}
   */
  prototypeAccessors$1$3.leftDown.get = function ()
  {
    return (this._flags & this.constructor.FLAGS.LEFT_DOWN) !== 0;
  };

  prototypeAccessors$1$3.leftDown.set = function (yn) // eslint-disable-line require-jsdoc
  {
    this._doSet(this.constructor.FLAGS.LEFT_DOWN, yn);
  };

  Object.defineProperties( InteractionTrackingData.prototype, prototypeAccessors$1$3 );

  InteractionTrackingData.FLAGS = Object.freeze({
    NONE: 0,
    OVER: 1 << 0,
    LEFT_DOWN: 1 << 1,
    RIGHT_DOWN: 1 << 2,
  });

  /**
   * Interface for classes that represent a hit area.
   *
   * It is implemented by the following classes:
   * - {@link PIXI.Circle}
   * - {@link PIXI.Ellipse}
   * - {@link PIXI.Polygon}
   * - {@link PIXI.RoundedRectangle}
   *
   * @interface IHitArea
   * @memberof PIXI
   */

  /**
   * Checks whether the x and y coordinates given are contained within this area
   *
   * @method
   * @name contains
   * @memberof PIXI.IHitArea#
   * @param {number} x - The X coordinate of the point to test
   * @param {number} y - The Y coordinate of the point to test
   * @return {boolean} Whether the x/y coordinates are within this area
   */

  /**
   * Default property values of interactive objects
   * Used by {@link PIXI.interaction.InteractionManager} to automatically give all DisplayObjects these properties
   *
   * @private
   * @name interactiveTarget
   * @type {Object}
   * @memberof PIXI.interaction
   * @example
   *      function MyObject() {}
   *
   *      Object.assign(
   *          DisplayObject.prototype,
   *          PIXI.interaction.interactiveTarget
   *      );
   */
  var interactiveTarget = {

    /**
     * Enable interaction events for the DisplayObject. Touch, pointer and mouse
     * events will not be emitted unless `interactive` is set to `true`.
     *
     * @example
     * const sprite = new PIXI.Sprite(texture);
     * sprite.interactive = true;
     * sprite.on('tap', (event) => {
     *    //handle event
     * });
     * @member {boolean}
     * @memberof PIXI.DisplayObject#
     */
    interactive: false,

    /**
     * Determines if the children to the displayObject can be clicked/touched
     * Setting this to false allows PixiJS to bypass a recursive `hitTest` function
     *
     * @member {boolean}
     * @memberof PIXI.Container#
     */
    interactiveChildren: true,

    /**
     * Interaction shape. Children will be hit first, then this shape will be checked.
     * Setting this will cause this shape to be checked in hit tests rather than the displayObject's bounds.
     *
     * @example
     * const sprite = new PIXI.Sprite(texture);
     * sprite.interactive = true;
     * sprite.hitArea = new PIXI.Rectangle(0, 0, 100, 100);
     * @member {PIXI.IHitArea}
     * @memberof PIXI.DisplayObject#
     */
    hitArea: null,

    /**
     * If enabled, the mouse cursor use the pointer behavior when hovered over the displayObject if it is interactive
     * Setting this changes the 'cursor' property to `'pointer'`.
     *
     * @example
     * const sprite = new PIXI.Sprite(texture);
     * sprite.interactive = true;
     * sprite.buttonMode = true;
     * @member {boolean}
     * @memberof PIXI.DisplayObject#
     */
    get buttonMode()
    {
      return this.cursor === 'pointer';
    },
    set buttonMode(value)
    {
      if (value)
      {
        this.cursor = 'pointer';
      }
      else if (this.cursor === 'pointer')
      {
        this.cursor = null;
      }
    },

    /**
     * This defines what cursor mode is used when the mouse cursor
     * is hovered over the displayObject.
     *
     * @example
     * const sprite = new PIXI.Sprite(texture);
     * sprite.interactive = true;
     * sprite.cursor = 'wait';
     * @see https://developer.mozilla.org/en/docs/Web/CSS/cursor
     *
     * @member {string}
     * @memberof PIXI.DisplayObject#
     */
    cursor: null,

    /**
     * Internal set of all active pointers, by identifier
     *
     * @member {Map<number, InteractionTrackingData>}
     * @memberof PIXI.DisplayObject#
     * @private
     */
    get trackedPointers()
    {
      if (this._trackedPointers === undefined) { this._trackedPointers = {}; }

      return this._trackedPointers;
    },

    /**
     * Map of all tracked pointers, by identifier. Use trackedPointers to access.
     *
     * @private
     * @type {Map<number, InteractionTrackingData>}
     */
    _trackedPointers: undefined,
  };

  // Mix interactiveTarget into DisplayObject.prototype,
  // after deprecation has been handled
  DisplayObject.mixin(interactiveTarget);

  var MOUSE_POINTER_ID = 1;

  // helpers for hitTest() - only used inside hitTest()
  var hitTestEvent = {
    target: null,
    data: {
      global: null,
    },
  };

  /**
   * The interaction manager deals with mouse, touch and pointer events.
   *
   * Any DisplayObject can be interactive if its `interactive` property is set to true.
   *
   * This manager also supports multitouch.
   *
   * An instance of this class is automatically created by default, and can be found at `renderer.plugins.interaction`
   *
   * @class
   * @extends PIXI.utils.EventEmitter
   * @memberof PIXI.interaction
   */
  var InteractionManager = /*@__PURE__*/(function (EventEmitter) {
    function InteractionManager(renderer, options)
    {
      EventEmitter.call(this);

      options = options || {};

      /**
       * The renderer this interaction manager works for.
       *
       * @member {PIXI.AbstractRenderer}
       */
      this.renderer = renderer;

      /**
       * Should default browser actions automatically be prevented.
       * Does not apply to pointer events for backwards compatibility
       * preventDefault on pointer events stops mouse events from firing
       * Thus, for every pointer event, there will always be either a mouse of touch event alongside it.
       *
       * @member {boolean}
       * @default true
       */
      this.autoPreventDefault = options.autoPreventDefault !== undefined ? options.autoPreventDefault : true;

      /**
       * Frequency in milliseconds that the mousemove, mouseover & mouseout interaction events will be checked.
       *
       * @member {number}
       * @default 10
       */
      this.interactionFrequency = options.interactionFrequency || 10;

      /**
       * The mouse data
       *
       * @member {PIXI.interaction.InteractionData}
       */
      this.mouse = new InteractionData();
      this.mouse.identifier = MOUSE_POINTER_ID;

      // setting the mouse to start off far off screen will mean that mouse over does
      //  not get called before we even move the mouse.
      this.mouse.global.set(-999999);

      /**
       * Actively tracked InteractionData
       *
       * @private
       * @member {Object.<number,PIXI.interaction.InteractionData>}
       */
      this.activeInteractionData = {};
      this.activeInteractionData[MOUSE_POINTER_ID] = this.mouse;

      /**
       * Pool of unused InteractionData
       *
       * @private
       * @member {PIXI.interaction.InteractionData[]}
       */
      this.interactionDataPool = [];

      /**
       * An event data object to handle all the event tracking/dispatching
       *
       * @member {object}
       */
      this.eventData = new InteractionEvent();

      /**
       * The DOM element to bind to.
       *
       * @protected
       * @member {HTMLElement}
       */
      this.interactionDOMElement = null;

      /**
       * This property determines if mousemove and touchmove events are fired only when the cursor
       * is over the object.
       * Setting to true will make things work more in line with how the DOM version works.
       * Setting to false can make things easier for things like dragging
       * It is currently set to false as this is how PixiJS used to work. This will be set to true in
       * future versions of pixi.
       *
       * @member {boolean}
       * @default false
       */
      this.moveWhenInside = false;

      /**
       * Have events been attached to the dom element?
       *
       * @protected
       * @member {boolean}
       */
      this.eventsAdded = false;

      /**
       * Is the mouse hovering over the renderer?
       *
       * @protected
       * @member {boolean}
       */
      this.mouseOverRenderer = false;

      /**
       * Does the device support touch events
       * https://www.w3.org/TR/touch-events/
       *
       * @readonly
       * @member {boolean}
       */
      this.supportsTouchEvents = 'ontouchstart' in window;

      /**
       * Does the device support pointer events
       * https://www.w3.org/Submission/pointer-events/
       *
       * @readonly
       * @member {boolean}
       */
      this.supportsPointerEvents = !!window.PointerEvent;

      // this will make it so that you don't have to call bind all the time

      /**
       * @private
       * @member {Function}
       */
      this.onPointerUp = this.onPointerUp.bind(this);
      this.processPointerUp = this.processPointerUp.bind(this);

      /**
       * @private
       * @member {Function}
       */
      this.onPointerCancel = this.onPointerCancel.bind(this);
      this.processPointerCancel = this.processPointerCancel.bind(this);

      /**
       * @private
       * @member {Function}
       */
      this.onPointerDown = this.onPointerDown.bind(this);
      this.processPointerDown = this.processPointerDown.bind(this);

      /**
       * @private
       * @member {Function}
       */
      this.onPointerMove = this.onPointerMove.bind(this);
      this.processPointerMove = this.processPointerMove.bind(this);

      /**
       * @private
       * @member {Function}
       */
      this.onPointerOut = this.onPointerOut.bind(this);
      this.processPointerOverOut = this.processPointerOverOut.bind(this);

      /**
       * @private
       * @member {Function}
       */
      this.onPointerOver = this.onPointerOver.bind(this);

      /**
       * Dictionary of how different cursor modes are handled. Strings are handled as CSS cursor
       * values, objects are handled as dictionaries of CSS values for interactionDOMElement,
       * and functions are called instead of changing the CSS.
       * Default CSS cursor values are provided for 'default' and 'pointer' modes.
       * @member {Object.<string, Object>}
       */
      this.cursorStyles = {
        default: 'inherit',
        pointer: 'pointer',
      };

      /**
       * The mode of the cursor that is being used.
       * The value of this is a key from the cursorStyles dictionary.
       *
       * @member {string}
       */
      this.currentCursorMode = null;

      /**
       * Internal cached let.
       *
       * @private
       * @member {string}
       */
      this.cursor = null;

      /**
       * Internal cached let.
       *
       * @private
       * @member {PIXI.Point}
       */
      this._tempPoint = new Point();

      /**
       * The current resolution / device pixel ratio.
       *
       * @member {number}
       * @default 1
       */
      this.resolution = 1;

      /**
       * Fired when a pointer device button (usually a mouse left-button) is pressed on the display
       * object.
       *
       * @event PIXI.interaction.InteractionManager#mousedown
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a pointer device secondary button (usually a mouse right-button) is pressed
       * on the display object.
       *
       * @event PIXI.interaction.InteractionManager#rightdown
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a pointer device button (usually a mouse left-button) is released over the display
       * object.
       *
       * @event PIXI.interaction.InteractionManager#mouseup
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a pointer device secondary button (usually a mouse right-button) is released
       * over the display object.
       *
       * @event PIXI.interaction.InteractionManager#rightup
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a pointer device button (usually a mouse left-button) is pressed and released on
       * the display object.
       *
       * @event PIXI.interaction.InteractionManager#click
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a pointer device secondary button (usually a mouse right-button) is pressed
       * and released on the display object.
       *
       * @event PIXI.interaction.InteractionManager#rightclick
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a pointer device button (usually a mouse left-button) is released outside the
       * display object that initially registered a
       * [mousedown]{@link PIXI.interaction.InteractionManager#event:mousedown}.
       *
       * @event PIXI.interaction.InteractionManager#mouseupoutside
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a pointer device secondary button (usually a mouse right-button) is released
       * outside the display object that initially registered a
       * [rightdown]{@link PIXI.interaction.InteractionManager#event:rightdown}.
       *
       * @event PIXI.interaction.InteractionManager#rightupoutside
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a pointer device (usually a mouse) is moved while over the display object
       *
       * @event PIXI.interaction.InteractionManager#mousemove
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a pointer device (usually a mouse) is moved onto the display object
       *
       * @event PIXI.interaction.InteractionManager#mouseover
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a pointer device (usually a mouse) is moved off the display object
       *
       * @event PIXI.interaction.InteractionManager#mouseout
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a pointer device button is pressed on the display object.
       *
       * @event PIXI.interaction.InteractionManager#pointerdown
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a pointer device button is released over the display object.
       * Not always fired when some buttons are held down while others are released. In those cases,
       * use [mousedown]{@link PIXI.interaction.InteractionManager#event:mousedown} and
       * [mouseup]{@link PIXI.interaction.InteractionManager#event:mouseup} instead.
       *
       * @event PIXI.interaction.InteractionManager#pointerup
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when the operating system cancels a pointer event
       *
       * @event PIXI.interaction.InteractionManager#pointercancel
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a pointer device button is pressed and released on the display object.
       *
       * @event PIXI.interaction.InteractionManager#pointertap
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a pointer device button is released outside the display object that initially
       * registered a [pointerdown]{@link PIXI.interaction.InteractionManager#event:pointerdown}.
       *
       * @event PIXI.interaction.InteractionManager#pointerupoutside
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a pointer device is moved while over the display object
       *
       * @event PIXI.interaction.InteractionManager#pointermove
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a pointer device is moved onto the display object
       *
       * @event PIXI.interaction.InteractionManager#pointerover
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a pointer device is moved off the display object
       *
       * @event PIXI.interaction.InteractionManager#pointerout
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a touch point is placed on the display object.
       *
       * @event PIXI.interaction.InteractionManager#touchstart
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a touch point is removed from the display object.
       *
       * @event PIXI.interaction.InteractionManager#touchend
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when the operating system cancels a touch
       *
       * @event PIXI.interaction.InteractionManager#touchcancel
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a touch point is placed and removed from the display object.
       *
       * @event PIXI.interaction.InteractionManager#tap
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a touch point is removed outside of the display object that initially
       * registered a [touchstart]{@link PIXI.interaction.InteractionManager#event:touchstart}.
       *
       * @event PIXI.interaction.InteractionManager#touchendoutside
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a touch point is moved along the display object.
       *
       * @event PIXI.interaction.InteractionManager#touchmove
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a pointer device button (usually a mouse left-button) is pressed on the display.
       * object. DisplayObject's `interactive` property must be set to `true` to fire event.
       *
       * @event PIXI.DisplayObject#mousedown
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a pointer device secondary button (usually a mouse right-button) is pressed
       * on the display object. DisplayObject's `interactive` property must be set to `true` to fire event.
       *
       * @event PIXI.DisplayObject#rightdown
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a pointer device button (usually a mouse left-button) is released over the display
       * object. DisplayObject's `interactive` property must be set to `true` to fire event.
       *
       * @event PIXI.DisplayObject#mouseup
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a pointer device secondary button (usually a mouse right-button) is released
       * over the display object. DisplayObject's `interactive` property must be set to `true` to fire event.
       *
       * @event PIXI.DisplayObject#rightup
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a pointer device button (usually a mouse left-button) is pressed and released on
       * the display object. DisplayObject's `interactive` property must be set to `true` to fire event.
       *
       * @event PIXI.DisplayObject#click
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a pointer device secondary button (usually a mouse right-button) is pressed
       * and released on the display object. DisplayObject's `interactive` property must be set to `true` to fire event.
       *
       * @event PIXI.DisplayObject#rightclick
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a pointer device button (usually a mouse left-button) is released outside the
       * display object that initially registered a
       * [mousedown]{@link PIXI.DisplayObject#event:mousedown}.
       * DisplayObject's `interactive` property must be set to `true` to fire event.
       *
       * @event PIXI.DisplayObject#mouseupoutside
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a pointer device secondary button (usually a mouse right-button) is released
       * outside the display object that initially registered a
       * [rightdown]{@link PIXI.DisplayObject#event:rightdown}.
       * DisplayObject's `interactive` property must be set to `true` to fire event.
       *
       * @event PIXI.DisplayObject#rightupoutside
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a pointer device (usually a mouse) is moved while over the display object.
       * DisplayObject's `interactive` property must be set to `true` to fire event.
       *
       * @event PIXI.DisplayObject#mousemove
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a pointer device (usually a mouse) is moved onto the display object.
       * DisplayObject's `interactive` property must be set to `true` to fire event.
       *
       * @event PIXI.DisplayObject#mouseover
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a pointer device (usually a mouse) is moved off the display object.
       * DisplayObject's `interactive` property must be set to `true` to fire event.
       *
       * @event PIXI.DisplayObject#mouseout
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a pointer device button is pressed on the display object.
       * DisplayObject's `interactive` property must be set to `true` to fire event.
       *
       * @event PIXI.DisplayObject#pointerdown
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a pointer device button is released over the display object.
       * DisplayObject's `interactive` property must be set to `true` to fire event.
       *
       * @event PIXI.DisplayObject#pointerup
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when the operating system cancels a pointer event.
       * DisplayObject's `interactive` property must be set to `true` to fire event.
       *
       * @event PIXI.DisplayObject#pointercancel
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a pointer device button is pressed and released on the display object.
       * DisplayObject's `interactive` property must be set to `true` to fire event.
       *
       * @event PIXI.DisplayObject#pointertap
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a pointer device button is released outside the display object that initially
       * registered a [pointerdown]{@link PIXI.DisplayObject#event:pointerdown}.
       * DisplayObject's `interactive` property must be set to `true` to fire event.
       *
       * @event PIXI.DisplayObject#pointerupoutside
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a pointer device is moved while over the display object.
       * DisplayObject's `interactive` property must be set to `true` to fire event.
       *
       * @event PIXI.DisplayObject#pointermove
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a pointer device is moved onto the display object.
       * DisplayObject's `interactive` property must be set to `true` to fire event.
       *
       * @event PIXI.DisplayObject#pointerover
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a pointer device is moved off the display object.
       * DisplayObject's `interactive` property must be set to `true` to fire event.
       *
       * @event PIXI.DisplayObject#pointerout
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a touch point is placed on the display object.
       * DisplayObject's `interactive` property must be set to `true` to fire event.
       *
       * @event PIXI.DisplayObject#touchstart
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a touch point is removed from the display object.
       * DisplayObject's `interactive` property must be set to `true` to fire event.
       *
       * @event PIXI.DisplayObject#touchend
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when the operating system cancels a touch.
       * DisplayObject's `interactive` property must be set to `true` to fire event.
       *
       * @event PIXI.DisplayObject#touchcancel
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a touch point is placed and removed from the display object.
       * DisplayObject's `interactive` property must be set to `true` to fire event.
       *
       * @event PIXI.DisplayObject#tap
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a touch point is removed outside of the display object that initially
       * registered a [touchstart]{@link PIXI.DisplayObject#event:touchstart}.
       * DisplayObject's `interactive` property must be set to `true` to fire event.
       *
       * @event PIXI.DisplayObject#touchendoutside
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      /**
       * Fired when a touch point is moved along the display object.
       * DisplayObject's `interactive` property must be set to `true` to fire event.
       *
       * @event PIXI.DisplayObject#touchmove
       * @param {PIXI.interaction.InteractionEvent} event - Interaction event
       */

      this.setTargetElement(this.renderer.view, this.renderer.resolution);
    }

    if ( EventEmitter ) { InteractionManager.__proto__ = EventEmitter; }
    InteractionManager.prototype = Object.create( EventEmitter && EventEmitter.prototype );
    InteractionManager.prototype.constructor = InteractionManager;

    /**
     * Hit tests a point against the display tree, returning the first interactive object that is hit.
     *
     * @param {PIXI.Point} globalPoint - A point to hit test with, in global space.
     * @param {PIXI.Container} [root] - The root display object to start from. If omitted, defaults
     * to the last rendered root of the associated renderer.
     * @return {PIXI.DisplayObject} The hit display object, if any.
     */
    InteractionManager.prototype.hitTest = function hitTest (globalPoint, root)
    {
      // clear the target for our hit test
      hitTestEvent.target = null;
      // assign the global point
      hitTestEvent.data.global = globalPoint;
      // ensure safety of the root
      if (!root)
      {
        root = this.renderer._lastObjectRendered;
      }
      // run the hit test
      this.processInteractive(hitTestEvent, root, null, true);
      // return our found object - it'll be null if we didn't hit anything

      return hitTestEvent.target;
    };

    /**
     * Sets the DOM element which will receive mouse/touch events. This is useful for when you have
     * other DOM elements on top of the renderers Canvas element. With this you'll be bale to delegate
     * another DOM element to receive those events.
     *
     * @param {HTMLElement} element - the DOM element which will receive mouse and touch events.
     * @param {number} [resolution=1] - The resolution / device pixel ratio of the new element (relative to the canvas).
     */
    InteractionManager.prototype.setTargetElement = function setTargetElement (element, resolution)
    {
      if ( resolution === void 0 ) { resolution = 1; }

      this.removeEvents();

      this.interactionDOMElement = element;

      this.resolution = resolution;

      this.addEvents();
    };

    /**
     * Registers all the DOM events
     *
     * @private
     */
    InteractionManager.prototype.addEvents = function addEvents ()
    {
      if (!this.interactionDOMElement)
      {
        return;
      }

      Ticker.system.add(this.update, this, UPDATE_PRIORITY.INTERACTION);

      if (window.navigator.msPointerEnabled)
      {
        this.interactionDOMElement.style['-ms-content-zooming'] = 'none';
        this.interactionDOMElement.style['-ms-touch-action'] = 'none';
      }
      else if (this.supportsPointerEvents)
      {
        this.interactionDOMElement.style['touch-action'] = 'none';
      }

      /**
       * These events are added first, so that if pointer events are normalized, they are fired
       * in the same order as non-normalized events. ie. pointer event 1st, mouse / touch 2nd
       */
      if (this.supportsPointerEvents)
      {
        window.document.addEventListener('pointermove', this.onPointerMove, true);
        this.interactionDOMElement.addEventListener('pointerdown', this.onPointerDown, true);
        // pointerout is fired in addition to pointerup (for touch events) and pointercancel
        // we already handle those, so for the purposes of what we do in onPointerOut, we only
        // care about the pointerleave event
        this.interactionDOMElement.addEventListener('pointerleave', this.onPointerOut, true);
        this.interactionDOMElement.addEventListener('pointerover', this.onPointerOver, true);
        window.addEventListener('pointercancel', this.onPointerCancel, true);
        window.addEventListener('pointerup', this.onPointerUp, true);
      }
      else
      {
        window.document.addEventListener('mousemove', this.onPointerMove, true);
        this.interactionDOMElement.addEventListener('mousedown', this.onPointerDown, true);
        this.interactionDOMElement.addEventListener('mouseout', this.onPointerOut, true);
        this.interactionDOMElement.addEventListener('mouseover', this.onPointerOver, true);
        window.addEventListener('mouseup', this.onPointerUp, true);
      }

      // always look directly for touch events so that we can provide original data
      // In a future version we should change this to being just a fallback and rely solely on
      // PointerEvents whenever available
      if (this.supportsTouchEvents)
      {
        this.interactionDOMElement.addEventListener('touchstart', this.onPointerDown, true);
        this.interactionDOMElement.addEventListener('touchcancel', this.onPointerCancel, true);
        this.interactionDOMElement.addEventListener('touchend', this.onPointerUp, true);
        this.interactionDOMElement.addEventListener('touchmove', this.onPointerMove, true);
      }

      this.eventsAdded = true;
    };

    /**
     * Removes all the DOM events that were previously registered
     *
     * @private
     */
    InteractionManager.prototype.removeEvents = function removeEvents ()
    {
      if (!this.interactionDOMElement)
      {
        return;
      }

      Ticker.system.remove(this.update, this);

      if (window.navigator.msPointerEnabled)
      {
        this.interactionDOMElement.style['-ms-content-zooming'] = '';
        this.interactionDOMElement.style['-ms-touch-action'] = '';
      }
      else if (this.supportsPointerEvents)
      {
        this.interactionDOMElement.style['touch-action'] = '';
      }

      if (this.supportsPointerEvents)
      {
        window.document.removeEventListener('pointermove', this.onPointerMove, true);
        this.interactionDOMElement.removeEventListener('pointerdown', this.onPointerDown, true);
        this.interactionDOMElement.removeEventListener('pointerleave', this.onPointerOut, true);
        this.interactionDOMElement.removeEventListener('pointerover', this.onPointerOver, true);
        window.removeEventListener('pointercancel', this.onPointerCancel, true);
        window.removeEventListener('pointerup', this.onPointerUp, true);
      }
      else
      {
        window.document.removeEventListener('mousemove', this.onPointerMove, true);
        this.interactionDOMElement.removeEventListener('mousedown', this.onPointerDown, true);
        this.interactionDOMElement.removeEventListener('mouseout', this.onPointerOut, true);
        this.interactionDOMElement.removeEventListener('mouseover', this.onPointerOver, true);
        window.removeEventListener('mouseup', this.onPointerUp, true);
      }

      if (this.supportsTouchEvents)
      {
        this.interactionDOMElement.removeEventListener('touchstart', this.onPointerDown, true);
        this.interactionDOMElement.removeEventListener('touchcancel', this.onPointerCancel, true);
        this.interactionDOMElement.removeEventListener('touchend', this.onPointerUp, true);
        this.interactionDOMElement.removeEventListener('touchmove', this.onPointerMove, true);
      }

      this.interactionDOMElement = null;

      this.eventsAdded = false;
    };

    /**
     * Updates the state of interactive objects.
     * Invoked by a throttled ticker update from {@link PIXI.Ticker.system}.
     *
     * @param {number} deltaTime - time delta since last tick
     */
    InteractionManager.prototype.update = function update (deltaTime)
    {
      this._deltaTime += deltaTime;

      if (this._deltaTime < this.interactionFrequency)
      {
        return;
      }

      this._deltaTime = 0;

      if (!this.interactionDOMElement)
      {
        return;
      }

      // if the user move the mouse this check has already been done using the mouse move!
      if (this.didMove)
      {
        this.didMove = false;

        return;
      }

      this.cursor = null;

      // Resets the flag as set by a stopPropagation call. This flag is usually reset by a user interaction of any kind,
      // but there was a scenario of a display object moving under a static mouse cursor.
      // In this case, mouseover and mouseevents would not pass the flag test in dispatchEvent function
      for (var k in this.activeInteractionData)
      {
        // eslint-disable-next-line no-prototype-builtins
        if (this.activeInteractionData.hasOwnProperty(k))
        {
          var interactionData = this.activeInteractionData[k];

          if (interactionData.originalEvent && interactionData.pointerType !== 'touch')
          {
            var interactionEvent = this.configureInteractionEventForDOMEvent(
              this.eventData,
              interactionData.originalEvent,
              interactionData
            );

            this.processInteractive(
              interactionEvent,
              this.renderer._lastObjectRendered,
              this.processPointerOverOut,
              true
            );
          }
        }
      }

      this.setCursorMode(this.cursor);
    };

    /**
     * Sets the current cursor mode, handling any callbacks or CSS style changes.
     *
     * @param {string} mode - cursor mode, a key from the cursorStyles dictionary
     */
    InteractionManager.prototype.setCursorMode = function setCursorMode (mode)
    {
      mode = mode || 'default';
      // if the mode didn't actually change, bail early
      if (this.currentCursorMode === mode)
      {
        return;
      }
      this.currentCursorMode = mode;
      var style = this.cursorStyles[mode];

      // only do things if there is a cursor style for it
      if (style)
      {
        switch (typeof style)
        {
          case 'string':
            // string styles are handled as cursor CSS
            this.interactionDOMElement.style.cursor = style;
            break;
          case 'function':
            // functions are just called, and passed the cursor mode
            style(mode);
            break;
          case 'object':
            // if it is an object, assume that it is a dictionary of CSS styles,
            // apply it to the interactionDOMElement
            Object.assign(this.interactionDOMElement.style, style);
            break;
        }
      }
      else if (typeof mode === 'string' && !Object.prototype.hasOwnProperty.call(this.cursorStyles, mode))
      {
        // if it mode is a string (not a Symbol) and cursorStyles doesn't have any entry
        // for the mode, then assume that the dev wants it to be CSS for the cursor.
        this.interactionDOMElement.style.cursor = mode;
      }
    };

    /**
     * Dispatches an event on the display object that was interacted with
     *
     * @param {PIXI.Container|PIXI.Sprite|PIXI.TilingSprite} displayObject - the display object in question
     * @param {string} eventString - the name of the event (e.g, mousedown)
     * @param {object} eventData - the event data object
     * @private
     */
    InteractionManager.prototype.dispatchEvent = function dispatchEvent (displayObject, eventString, eventData)
    {
      if (!eventData.stopped)
      {
        eventData.currentTarget = displayObject;
        eventData.type = eventString;

        displayObject.emit(eventString, eventData);

        if (displayObject[eventString])
        {
          displayObject[eventString](eventData);
        }
      }
    };

    /**
     * Maps x and y coords from a DOM object and maps them correctly to the PixiJS view. The
     * resulting value is stored in the point. This takes into account the fact that the DOM
     * element could be scaled and positioned anywhere on the screen.
     *
     * @param  {PIXI.Point} point - the point that the result will be stored in
     * @param  {number} x - the x coord of the position to map
     * @param  {number} y - the y coord of the position to map
     */
    InteractionManager.prototype.mapPositionToPoint = function mapPositionToPoint (point, x, y)
    {
      var rect;

      // IE 11 fix
      if (!this.interactionDOMElement.parentElement)
      {
        rect = { x: 0, y: 0, width: 0, height: 0 };
      }
      else
      {
        rect = this.interactionDOMElement.getBoundingClientRect();
      }

      var resolutionMultiplier = 1.0 / this.resolution;

      point.x = ((x - rect.left) * (this.interactionDOMElement.width / rect.width)) * resolutionMultiplier;
      point.y = ((y - rect.top) * (this.interactionDOMElement.height / rect.height)) * resolutionMultiplier;
    };

    /**
     * This function is provides a neat way of crawling through the scene graph and running a
     * specified function on all interactive objects it finds. It will also take care of hit
     * testing the interactive objects and passes the hit across in the function.
     *
     * @protected
     * @param {PIXI.interaction.InteractionEvent} interactionEvent - event containing the point that
     *  is tested for collision
     * @param {PIXI.Container|PIXI.Sprite|PIXI.TilingSprite} displayObject - the displayObject
     *  that will be hit test (recursively crawls its children)
     * @param {Function} [func] - the function that will be called on each interactive object. The
     *  interactionEvent, displayObject and hit will be passed to the function
     * @param {boolean} [hitTest] - this indicates if the objects inside should be hit test against the point
     * @param {boolean} [interactive] - Whether the displayObject is interactive
     * @return {boolean} returns true if the displayObject hit the point
     */
    InteractionManager.prototype.processInteractive = function processInteractive (interactionEvent, displayObject, func, hitTest, interactive)
    {
      if (!displayObject || !displayObject.visible)
      {
        return false;
      }

      var point = interactionEvent.data.global;

      // Took a little while to rework this function correctly! But now it is done and nice and optimized! ^_^
      //
      // This function will now loop through all objects and then only hit test the objects it HAS
      // to, not all of them. MUCH faster..
      // An object will be hit test if the following is true:
      //
      // 1: It is interactive.
      // 2: It belongs to a parent that is interactive AND one of the parents children have not already been hit.
      //
      // As another little optimization once an interactive object has been hit we can carry on
      // through the scenegraph, but we know that there will be no more hits! So we can avoid extra hit tests
      // A final optimization is that an object is not hit test directly if a child has already been hit.

      interactive = displayObject.interactive || interactive;

      var hit = false;
      var interactiveParent = interactive;

      // Flag here can set to false if the event is outside the parents hitArea or mask
      var hitTestChildren = true;

      // If there is a hitArea, no need to test against anything else if the pointer is not within the hitArea
      // There is also no longer a need to hitTest children.
      if (displayObject.hitArea)
      {
        if (hitTest)
        {
          displayObject.worldTransform.applyInverse(point, this._tempPoint);
          if (!displayObject.hitArea.contains(this._tempPoint.x, this._tempPoint.y))
          {
            hitTest = false;
            hitTestChildren = false;
          }
          else
          {
            hit = true;
          }
        }
        interactiveParent = false;
      }
      // If there is a mask, no need to hitTest against anything else if the pointer is not within the mask.
      // We still want to hitTestChildren, however, to ensure a mouseout can still be generated.
      // https://github.com/pixijs/pixi.js/issues/5135
      else if (displayObject._mask)
      {
        if (hitTest)
        {
          if (!(displayObject._mask.containsPoint && displayObject._mask.containsPoint(point)))
          {
            hitTest = false;
          }
        }
      }

      // ** FREE TIP **! If an object is not interactive or has no buttons in it
      // (such as a game scene!) set interactiveChildren to false for that displayObject.
      // This will allow PixiJS to completely ignore and bypass checking the displayObjects children.
      if (hitTestChildren && displayObject.interactiveChildren && displayObject.children)
      {
        var children = displayObject.children;

        for (var i = children.length - 1; i >= 0; i--)
        {
          var child = children[i];

          // time to get recursive.. if this function will return if something is hit..
          var childHit = this.processInteractive(interactionEvent, child, func, hitTest, interactiveParent);

          if (childHit)
          {
            // its a good idea to check if a child has lost its parent.
            // this means it has been removed whilst looping so its best
            if (!child.parent)
            {
              continue;
            }

            // we no longer need to hit test any more objects in this container as we we
            // now know the parent has been hit
            interactiveParent = false;

            // If the child is interactive , that means that the object hit was actually
            // interactive and not just the child of an interactive object.
            // This means we no longer need to hit test anything else. We still need to run
            // through all objects, but we don't need to perform any hit tests.

            if (childHit)
            {
              if (interactionEvent.target)
              {
                hitTest = false;
              }
              hit = true;
            }
          }
        }
      }

      // no point running this if the item is not interactive or does not have an interactive parent.
      if (interactive)
      {
        // if we are hit testing (as in we have no hit any objects yet)
        // We also don't need to worry about hit testing if once of the displayObjects children
        // has already been hit - but only if it was interactive, otherwise we need to keep
        // looking for an interactive child, just in case we hit one
        if (hitTest && !interactionEvent.target)
        {
          // already tested against hitArea if it is defined
          if (!displayObject.hitArea && displayObject.containsPoint)
          {
            if (displayObject.containsPoint(point))
            {
              hit = true;
            }
          }
        }

        if (displayObject.interactive)
        {
          if (hit && !interactionEvent.target)
          {
            interactionEvent.target = displayObject;
          }

          if (func)
          {
            func(interactionEvent, displayObject, !!hit);
          }
        }
      }

      return hit;
    };

    /**
     * Is called when the pointer button is pressed down on the renderer element
     *
     * @private
     * @param {PointerEvent} originalEvent - The DOM event of a pointer button being pressed down
     */
    InteractionManager.prototype.onPointerDown = function onPointerDown (originalEvent)
    {
      // if we support touch events, then only use those for touch events, not pointer events
      if (this.supportsTouchEvents && originalEvent.pointerType === 'touch') { return; }

      var events = this.normalizeToPointerData(originalEvent);

      /**
       * No need to prevent default on natural pointer events, as there are no side effects
       * Normalized events, however, may have the double mousedown/touchstart issue on the native android browser,
       * so still need to be prevented.
       */

      // Guaranteed that there will be at least one event in events, and all events must have the same pointer type

      if (this.autoPreventDefault && events[0].isNormalized)
      {
        var cancelable = originalEvent.cancelable || !('cancelable' in originalEvent);

        if (cancelable)
        {
          originalEvent.preventDefault();
        }
      }

      var eventLen = events.length;

      for (var i = 0; i < eventLen; i++)
      {
        var event = events[i];

        var interactionData = this.getInteractionDataForPointerId(event);

        var interactionEvent = this.configureInteractionEventForDOMEvent(this.eventData, event, interactionData);

        interactionEvent.data.originalEvent = originalEvent;

        this.processInteractive(interactionEvent, this.renderer._lastObjectRendered, this.processPointerDown, true);

        this.emit('pointerdown', interactionEvent);
        if (event.pointerType === 'touch')
        {
          this.emit('touchstart', interactionEvent);
        }
        // emit a mouse event for "pen" pointers, the way a browser would emit a fallback event
        else if (event.pointerType === 'mouse' || event.pointerType === 'pen')
        {
          var isRightButton = event.button === 2;

          this.emit(isRightButton ? 'rightdown' : 'mousedown', this.eventData);
        }
      }
    };

    /**
     * Processes the result of the pointer down check and dispatches the event if need be
     *
     * @private
     * @param {PIXI.interaction.InteractionEvent} interactionEvent - The interaction event wrapping the DOM event
     * @param {PIXI.Container|PIXI.Sprite|PIXI.TilingSprite} displayObject - The display object that was tested
     * @param {boolean} hit - the result of the hit test on the display object
     */
    InteractionManager.prototype.processPointerDown = function processPointerDown (interactionEvent, displayObject, hit)
    {
      var data = interactionEvent.data;
      var id = interactionEvent.data.identifier;

      if (hit)
      {
        if (!displayObject.trackedPointers[id])
        {
          displayObject.trackedPointers[id] = new InteractionTrackingData(id);
        }
        this.dispatchEvent(displayObject, 'pointerdown', interactionEvent);

        if (data.pointerType === 'touch')
        {
          this.dispatchEvent(displayObject, 'touchstart', interactionEvent);
        }
        else if (data.pointerType === 'mouse' || data.pointerType === 'pen')
        {
          var isRightButton = data.button === 2;

          if (isRightButton)
          {
            displayObject.trackedPointers[id].rightDown = true;
          }
          else
          {
            displayObject.trackedPointers[id].leftDown = true;
          }

          this.dispatchEvent(displayObject, isRightButton ? 'rightdown' : 'mousedown', interactionEvent);
        }
      }
    };

    /**
     * Is called when the pointer button is released on the renderer element
     *
     * @private
     * @param {PointerEvent} originalEvent - The DOM event of a pointer button being released
     * @param {boolean} cancelled - true if the pointer is cancelled
     * @param {Function} func - Function passed to {@link processInteractive}
     */
    InteractionManager.prototype.onPointerComplete = function onPointerComplete (originalEvent, cancelled, func)
    {
      var events = this.normalizeToPointerData(originalEvent);

      var eventLen = events.length;

      // if the event wasn't targeting our canvas, then consider it to be pointerupoutside
      // in all cases (unless it was a pointercancel)
      var eventAppend = originalEvent.target !== this.interactionDOMElement ? 'outside' : '';

      for (var i = 0; i < eventLen; i++)
      {
        var event = events[i];

        var interactionData = this.getInteractionDataForPointerId(event);

        var interactionEvent = this.configureInteractionEventForDOMEvent(this.eventData, event, interactionData);

        interactionEvent.data.originalEvent = originalEvent;

        // perform hit testing for events targeting our canvas or cancel events
        this.processInteractive(interactionEvent, this.renderer._lastObjectRendered, func, cancelled || !eventAppend);

        this.emit(cancelled ? 'pointercancel' : ("pointerup" + eventAppend), interactionEvent);

        if (event.pointerType === 'mouse' || event.pointerType === 'pen')
        {
          var isRightButton = event.button === 2;

          this.emit(isRightButton ? ("rightup" + eventAppend) : ("mouseup" + eventAppend), interactionEvent);
        }
        else if (event.pointerType === 'touch')
        {
          this.emit(cancelled ? 'touchcancel' : ("touchend" + eventAppend), interactionEvent);
          this.releaseInteractionDataForPointerId(event.pointerId, interactionData);
        }
      }
    };

    /**
     * Is called when the pointer button is cancelled
     *
     * @private
     * @param {PointerEvent} event - The DOM event of a pointer button being released
     */
    InteractionManager.prototype.onPointerCancel = function onPointerCancel (event)
    {
      // if we support touch events, then only use those for touch events, not pointer events
      if (this.supportsTouchEvents && event.pointerType === 'touch') { return; }

      this.onPointerComplete(event, true, this.processPointerCancel);
    };

    /**
     * Processes the result of the pointer cancel check and dispatches the event if need be
     *
     * @private
     * @param {PIXI.interaction.InteractionEvent} interactionEvent - The interaction event wrapping the DOM event
     * @param {PIXI.Container|PIXI.Sprite|PIXI.TilingSprite} displayObject - The display object that was tested
     */
    InteractionManager.prototype.processPointerCancel = function processPointerCancel (interactionEvent, displayObject)
    {
      var data = interactionEvent.data;

      var id = interactionEvent.data.identifier;

      if (displayObject.trackedPointers[id] !== undefined)
      {
        delete displayObject.trackedPointers[id];
        this.dispatchEvent(displayObject, 'pointercancel', interactionEvent);

        if (data.pointerType === 'touch')
        {
          this.dispatchEvent(displayObject, 'touchcancel', interactionEvent);
        }
      }
    };

    /**
     * Is called when the pointer button is released on the renderer element
     *
     * @private
     * @param {PointerEvent} event - The DOM event of a pointer button being released
     */
    InteractionManager.prototype.onPointerUp = function onPointerUp (event)
    {
      // if we support touch events, then only use those for touch events, not pointer events
      if (this.supportsTouchEvents && event.pointerType === 'touch') { return; }

      this.onPointerComplete(event, false, this.processPointerUp);
    };

    /**
     * Processes the result of the pointer up check and dispatches the event if need be
     *
     * @private
     * @param {PIXI.interaction.InteractionEvent} interactionEvent - The interaction event wrapping the DOM event
     * @param {PIXI.Container|PIXI.Sprite|PIXI.TilingSprite} displayObject - The display object that was tested
     * @param {boolean} hit - the result of the hit test on the display object
     */
    InteractionManager.prototype.processPointerUp = function processPointerUp (interactionEvent, displayObject, hit)
    {
      var data = interactionEvent.data;

      var id = interactionEvent.data.identifier;

      var trackingData = displayObject.trackedPointers[id];

      var isTouch = data.pointerType === 'touch';

      var isMouse = (data.pointerType === 'mouse' || data.pointerType === 'pen');
      // need to track mouse down status in the mouse block so that we can emit
      // event in a later block
      var isMouseTap = false;

      // Mouse only
      if (isMouse)
      {
        var isRightButton = data.button === 2;

        var flags = InteractionTrackingData.FLAGS;

        var test = isRightButton ? flags.RIGHT_DOWN : flags.LEFT_DOWN;

        var isDown = trackingData !== undefined && (trackingData.flags & test);

        if (hit)
        {
          this.dispatchEvent(displayObject, isRightButton ? 'rightup' : 'mouseup', interactionEvent);

          if (isDown)
          {
            this.dispatchEvent(displayObject, isRightButton ? 'rightclick' : 'click', interactionEvent);
            // because we can confirm that the mousedown happened on this object, flag for later emit of pointertap
            isMouseTap = true;
          }
        }
        else if (isDown)
        {
          this.dispatchEvent(displayObject, isRightButton ? 'rightupoutside' : 'mouseupoutside', interactionEvent);
        }
        // update the down state of the tracking data
        if (trackingData)
        {
          if (isRightButton)
          {
            trackingData.rightDown = false;
          }
          else
          {
            trackingData.leftDown = false;
          }
        }
      }

      // Pointers and Touches, and Mouse
      if (hit)
      {
        this.dispatchEvent(displayObject, 'pointerup', interactionEvent);
        if (isTouch) { this.dispatchEvent(displayObject, 'touchend', interactionEvent); }

        if (trackingData)
        {
          // emit pointertap if not a mouse, or if the mouse block decided it was a tap
          if (!isMouse || isMouseTap)
          {
            this.dispatchEvent(displayObject, 'pointertap', interactionEvent);
          }
          if (isTouch)
          {
            this.dispatchEvent(displayObject, 'tap', interactionEvent);
            // touches are no longer over (if they ever were) when we get the touchend
            // so we should ensure that we don't keep pretending that they are
            trackingData.over = false;
          }
        }
      }
      else if (trackingData)
      {
        this.dispatchEvent(displayObject, 'pointerupoutside', interactionEvent);
        if (isTouch) { this.dispatchEvent(displayObject, 'touchendoutside', interactionEvent); }
      }
      // Only remove the tracking data if there is no over/down state still associated with it
      if (trackingData && trackingData.none)
      {
        delete displayObject.trackedPointers[id];
      }
    };

    /**
     * Is called when the pointer moves across the renderer element
     *
     * @private
     * @param {PointerEvent} originalEvent - The DOM event of a pointer moving
     */
    InteractionManager.prototype.onPointerMove = function onPointerMove (originalEvent)
    {
      // if we support touch events, then only use those for touch events, not pointer events
      if (this.supportsTouchEvents && originalEvent.pointerType === 'touch') { return; }

      var events = this.normalizeToPointerData(originalEvent);

      if (events[0].pointerType === 'mouse' || events[0].pointerType === 'pen')
      {
        this.didMove = true;

        this.cursor = null;
      }

      var eventLen = events.length;

      for (var i = 0; i < eventLen; i++)
      {
        var event = events[i];

        var interactionData = this.getInteractionDataForPointerId(event);

        var interactionEvent = this.configureInteractionEventForDOMEvent(this.eventData, event, interactionData);

        interactionEvent.data.originalEvent = originalEvent;

        this.processInteractive(interactionEvent, this.renderer._lastObjectRendered, this.processPointerMove, true);

        this.emit('pointermove', interactionEvent);
        if (event.pointerType === 'touch') { this.emit('touchmove', interactionEvent); }
        if (event.pointerType === 'mouse' || event.pointerType === 'pen') { this.emit('mousemove', interactionEvent); }
      }

      if (events[0].pointerType === 'mouse')
      {
        this.setCursorMode(this.cursor);

        // TODO BUG for parents interactive object (border order issue)
      }
    };

    /**
     * Processes the result of the pointer move check and dispatches the event if need be
     *
     * @private
     * @param {PIXI.interaction.InteractionEvent} interactionEvent - The interaction event wrapping the DOM event
     * @param {PIXI.Container|PIXI.Sprite|PIXI.TilingSprite} displayObject - The display object that was tested
     * @param {boolean} hit - the result of the hit test on the display object
     */
    InteractionManager.prototype.processPointerMove = function processPointerMove (interactionEvent, displayObject, hit)
    {
      var data = interactionEvent.data;

      var isTouch = data.pointerType === 'touch';

      var isMouse = (data.pointerType === 'mouse' || data.pointerType === 'pen');

      if (isMouse)
      {
        this.processPointerOverOut(interactionEvent, displayObject, hit);
      }

      if (!this.moveWhenInside || hit)
      {
        this.dispatchEvent(displayObject, 'pointermove', interactionEvent);
        if (isTouch) { this.dispatchEvent(displayObject, 'touchmove', interactionEvent); }
        if (isMouse) { this.dispatchEvent(displayObject, 'mousemove', interactionEvent); }
      }
    };

    /**
     * Is called when the pointer is moved out of the renderer element
     *
     * @private
     * @param {PointerEvent} originalEvent - The DOM event of a pointer being moved out
     */
    InteractionManager.prototype.onPointerOut = function onPointerOut (originalEvent)
    {
      // if we support touch events, then only use those for touch events, not pointer events
      if (this.supportsTouchEvents && originalEvent.pointerType === 'touch') { return; }

      var events = this.normalizeToPointerData(originalEvent);

      // Only mouse and pointer can call onPointerOut, so events will always be length 1
      var event = events[0];

      if (event.pointerType === 'mouse')
      {
        this.mouseOverRenderer = false;
        this.setCursorMode(null);
      }

      var interactionData = this.getInteractionDataForPointerId(event);

      var interactionEvent = this.configureInteractionEventForDOMEvent(this.eventData, event, interactionData);

      interactionEvent.data.originalEvent = event;

      this.processInteractive(interactionEvent, this.renderer._lastObjectRendered, this.processPointerOverOut, false);

      this.emit('pointerout', interactionEvent);
      if (event.pointerType === 'mouse' || event.pointerType === 'pen')
      {
        this.emit('mouseout', interactionEvent);
      }
      else
      {
        // we can get touchleave events after touchend, so we want to make sure we don't
        // introduce memory leaks
        this.releaseInteractionDataForPointerId(interactionData.identifier);
      }
    };

    /**
     * Processes the result of the pointer over/out check and dispatches the event if need be
     *
     * @private
     * @param {PIXI.interaction.InteractionEvent} interactionEvent - The interaction event wrapping the DOM event
     * @param {PIXI.Container|PIXI.Sprite|PIXI.TilingSprite} displayObject - The display object that was tested
     * @param {boolean} hit - the result of the hit test on the display object
     */
    InteractionManager.prototype.processPointerOverOut = function processPointerOverOut (interactionEvent, displayObject, hit)
    {
      var data = interactionEvent.data;

      var id = interactionEvent.data.identifier;

      var isMouse = (data.pointerType === 'mouse' || data.pointerType === 'pen');

      var trackingData = displayObject.trackedPointers[id];

      // if we just moused over the display object, then we need to track that state
      if (hit && !trackingData)
      {
        trackingData = displayObject.trackedPointers[id] = new InteractionTrackingData(id);
      }

      if (trackingData === undefined) { return; }

      if (hit && this.mouseOverRenderer)
      {
        if (!trackingData.over)
        {
          trackingData.over = true;
          this.dispatchEvent(displayObject, 'pointerover', interactionEvent);
          if (isMouse)
          {
            this.dispatchEvent(displayObject, 'mouseover', interactionEvent);
          }
        }

        // only change the cursor if it has not already been changed (by something deeper in the
        // display tree)
        if (isMouse && this.cursor === null)
        {
          this.cursor = displayObject.cursor;
        }
      }
      else if (trackingData.over)
      {
        trackingData.over = false;
        this.dispatchEvent(displayObject, 'pointerout', this.eventData);
        if (isMouse)
        {
          this.dispatchEvent(displayObject, 'mouseout', interactionEvent);
        }
        // if there is no mouse down information for the pointer, then it is safe to delete
        if (trackingData.none)
        {
          delete displayObject.trackedPointers[id];
        }
      }
    };

    /**
     * Is called when the pointer is moved into the renderer element
     *
     * @private
     * @param {PointerEvent} originalEvent - The DOM event of a pointer button being moved into the renderer view
     */
    InteractionManager.prototype.onPointerOver = function onPointerOver (originalEvent)
    {
      var events = this.normalizeToPointerData(originalEvent);

      // Only mouse and pointer can call onPointerOver, so events will always be length 1
      var event = events[0];

      var interactionData = this.getInteractionDataForPointerId(event);

      var interactionEvent = this.configureInteractionEventForDOMEvent(this.eventData, event, interactionData);

      interactionEvent.data.originalEvent = event;

      if (event.pointerType === 'mouse')
      {
        this.mouseOverRenderer = true;
      }

      this.emit('pointerover', interactionEvent);
      if (event.pointerType === 'mouse' || event.pointerType === 'pen')
      {
        this.emit('mouseover', interactionEvent);
      }
    };

    /**
     * Get InteractionData for a given pointerId. Store that data as well
     *
     * @private
     * @param {PointerEvent} event - Normalized pointer event, output from normalizeToPointerData
     * @return {PIXI.interaction.InteractionData} - Interaction data for the given pointer identifier
     */
    InteractionManager.prototype.getInteractionDataForPointerId = function getInteractionDataForPointerId (event)
    {
      var pointerId = event.pointerId;

      var interactionData;

      if (pointerId === MOUSE_POINTER_ID || event.pointerType === 'mouse')
      {
        interactionData = this.mouse;
      }
      else if (this.activeInteractionData[pointerId])
      {
        interactionData = this.activeInteractionData[pointerId];
      }
      else
      {
        interactionData = this.interactionDataPool.pop() || new InteractionData();
        interactionData.identifier = pointerId;
        this.activeInteractionData[pointerId] = interactionData;
      }
      // copy properties from the event, so that we can make sure that touch/pointer specific
      // data is available
      interactionData.copyEvent(event);

      return interactionData;
    };

    /**
     * Return unused InteractionData to the pool, for a given pointerId
     *
     * @private
     * @param {number} pointerId - Identifier from a pointer event
     */
    InteractionManager.prototype.releaseInteractionDataForPointerId = function releaseInteractionDataForPointerId (pointerId)
    {
      var interactionData = this.activeInteractionData[pointerId];

      if (interactionData)
      {
        delete this.activeInteractionData[pointerId];
        interactionData.reset();
        this.interactionDataPool.push(interactionData);
      }
    };

    /**
     * Configure an InteractionEvent to wrap a DOM PointerEvent and InteractionData
     *
     * @private
     * @param {PIXI.interaction.InteractionEvent} interactionEvent - The event to be configured
     * @param {PointerEvent} pointerEvent - The DOM event that will be paired with the InteractionEvent
     * @param {PIXI.interaction.InteractionData} interactionData - The InteractionData that will be paired
     *        with the InteractionEvent
     * @return {PIXI.interaction.InteractionEvent} the interaction event that was passed in
     */
    InteractionManager.prototype.configureInteractionEventForDOMEvent = function configureInteractionEventForDOMEvent (interactionEvent, pointerEvent, interactionData)
    {
      interactionEvent.data = interactionData;

      this.mapPositionToPoint(interactionData.global, pointerEvent.clientX, pointerEvent.clientY);

      // Not really sure why this is happening, but it's how a previous version handled things
      if (pointerEvent.pointerType === 'touch')
      {
        pointerEvent.globalX = interactionData.global.x;
        pointerEvent.globalY = interactionData.global.y;
      }

      interactionData.originalEvent = pointerEvent;
      interactionEvent.reset();

      return interactionEvent;
    };

    /**
     * Ensures that the original event object contains all data that a regular pointer event would have
     *
     * @private
     * @param {TouchEvent|MouseEvent|PointerEvent} event - The original event data from a touch or mouse event
     * @return {PointerEvent[]} An array containing a single normalized pointer event, in the case of a pointer
     *  or mouse event, or a multiple normalized pointer events if there are multiple changed touches
     */
    InteractionManager.prototype.normalizeToPointerData = function normalizeToPointerData (event)
    {
      var normalizedEvents = [];

      if (this.supportsTouchEvents && event instanceof TouchEvent)
      {
        for (var i = 0, li = event.changedTouches.length; i < li; i++)
        {
          var touch = event.changedTouches[i];

          if (typeof touch.button === 'undefined') { touch.button = event.touches.length ? 1 : 0; }
          if (typeof touch.buttons === 'undefined') { touch.buttons = event.touches.length ? 1 : 0; }
          if (typeof touch.isPrimary === 'undefined')
          {
            touch.isPrimary = event.touches.length === 1 && event.type === 'touchstart';
          }
          if (typeof touch.width === 'undefined') { touch.width = touch.radiusX || 1; }
          if (typeof touch.height === 'undefined') { touch.height = touch.radiusY || 1; }
          if (typeof touch.tiltX === 'undefined') { touch.tiltX = 0; }
          if (typeof touch.tiltY === 'undefined') { touch.tiltY = 0; }
          if (typeof touch.pointerType === 'undefined') { touch.pointerType = 'touch'; }
          if (typeof touch.pointerId === 'undefined') { touch.pointerId = touch.identifier || 0; }
          if (typeof touch.pressure === 'undefined') { touch.pressure = touch.force || 0.5; }
          if (typeof touch.twist === 'undefined') { touch.twist = 0; }
          if (typeof touch.tangentialPressure === 'undefined') { touch.tangentialPressure = 0; }
          // TODO: Remove these, as layerX/Y is not a standard, is deprecated, has uneven
          // support, and the fill ins are not quite the same
          // offsetX/Y might be okay, but is not the same as clientX/Y when the canvas's top
          // left is not 0,0 on the page
          if (typeof touch.layerX === 'undefined') { touch.layerX = touch.offsetX = touch.clientX; }
          if (typeof touch.layerY === 'undefined') { touch.layerY = touch.offsetY = touch.clientY; }

          // mark the touch as normalized, just so that we know we did it
          touch.isNormalized = true;

          normalizedEvents.push(touch);
        }
      }
      // apparently PointerEvent subclasses MouseEvent, so yay
      else if (event instanceof MouseEvent && (!this.supportsPointerEvents || !(event instanceof window.PointerEvent)))
      {
        if (typeof event.isPrimary === 'undefined') { event.isPrimary = true; }
        if (typeof event.width === 'undefined') { event.width = 1; }
        if (typeof event.height === 'undefined') { event.height = 1; }
        if (typeof event.tiltX === 'undefined') { event.tiltX = 0; }
        if (typeof event.tiltY === 'undefined') { event.tiltY = 0; }
        if (typeof event.pointerType === 'undefined') { event.pointerType = 'mouse'; }
        if (typeof event.pointerId === 'undefined') { event.pointerId = MOUSE_POINTER_ID; }
        if (typeof event.pressure === 'undefined') { event.pressure = 0.5; }
        if (typeof event.twist === 'undefined') { event.twist = 0; }
        if (typeof event.tangentialPressure === 'undefined') { event.tangentialPressure = 0; }

        // mark the mouse event as normalized, just so that we know we did it
        event.isNormalized = true;

        normalizedEvents.push(event);
      }
      else
      {
        normalizedEvents.push(event);
      }

      return normalizedEvents;
    };

    /**
     * Destroys the interaction manager
     *
     */
    InteractionManager.prototype.destroy = function destroy ()
    {
      this.removeEvents();

      this.removeAllListeners();

      this.renderer = null;

      this.mouse = null;

      this.eventData = null;

      this.interactionDOMElement = null;

      this.onPointerDown = null;
      this.processPointerDown = null;

      this.onPointerUp = null;
      this.processPointerUp = null;

      this.onPointerCancel = null;
      this.processPointerCancel = null;

      this.onPointerMove = null;
      this.processPointerMove = null;

      this.onPointerOut = null;
      this.processPointerOverOut = null;

      this.onPointerOver = null;

      this._tempPoint = null;
    };

    return InteractionManager;
  }(eventemitter3));

  var interaction_es = ({
    InteractionData: InteractionData,
    InteractionEvent: InteractionEvent,
    InteractionManager: InteractionManager,
    InteractionTrackingData: InteractionTrackingData,
    interactiveTarget: interactiveTarget
  });

  /*!
	 * @pixi/graphics - v5.1.0
	 * Compiled Fri, 19 Jul 2019 21:58:39 UTC
	 *
	 * @pixi/graphics is licensed under the MIT License.
	 * http://www.opensource.org/licenses/mit-license
	 */

  /**
   * Graphics curves resolution settings. If `adaptive` flag is set to `true`,
   * the resolution is calculated based on the curve's length to ensure better visual quality.
   * Adaptive draw works with `bezierCurveTo` and `quadraticCurveTo`.
   *
   * @static
   * @constant
   * @memberof PIXI
   * @name GRAPHICS_CURVES
   * @type {object}
   * @property {boolean} adaptive=false - flag indicating if the resolution should be adaptive
   * @property {number} maxLength=10 - maximal length of a single segment of the curve (if adaptive = false, ignored)
   * @property {number} minSegments=8 - minimal number of segments in the curve (if adaptive = false, ignored)
   * @property {number} maxSegments=2048 - maximal number of segments in the curve (if adaptive = false, ignored)
   */
  var GRAPHICS_CURVES = {
    adaptive: true,
    maxLength: 10,
    minSegments: 8,
    maxSegments: 2048,
    _segmentsCount: function _segmentsCount(length, defaultSegments)
    {
      if ( defaultSegments === void 0 ) { defaultSegments = 20; }

      if (!this.adaptive)
      {
        return defaultSegments;
      }

      var result = Math.ceil(length / this.maxLength);

      if (result < this.minSegments)
      {
        result = this.minSegments;
      }
      else if (result > this.maxSegments)
      {
        result = this.maxSegments;
      }

      return result;
    },
  };

  /**
   * Fill style object for Graphics.
   *
   * @class
   * @memberof PIXI
   */
  var FillStyle = function FillStyle()
  {
    this.reset();
  };

  /**
   * Clones the object
   *
   * @return {PIXI.FillStyle}
   */
  FillStyle.prototype.clone = function clone ()
  {
    var obj = new FillStyle();

    obj.color = this.color;
    obj.alpha = this.alpha;
    obj.texture = this.texture;
    obj.matrix = this.matrix;
    obj.visible = this.visible;

    return obj;
  };

  /**
   * Reset
   */
  FillStyle.prototype.reset = function reset ()
  {
    /**
     * The hex color value used when coloring the Graphics object.
     *
     * @member {number}
     * @default 1
     */
    this.color = 0xFFFFFF;

    /**
     * The alpha value used when filling the Graphics object.
     *
     * @member {number}
     * @default 1
     */
    this.alpha = 1;

    /**
     * The texture to be used for the fill.
     *
     * @member {string}
     * @default 0
     */
    this.texture = Texture.WHITE;

    /**
     * The transform aplpied to the texture.
     *
     * @member {string}
     * @default 0
     */
    this.matrix = null;

    /**
     * If the current fill is visible.
     *
     * @member {boolean}
     * @default false
     */
    this.visible = false;
  };

  /**
   * Destroy and don't use after this
   */
  FillStyle.prototype.destroy = function destroy ()
  {
    this.texture = null;
    this.matrix = null;
  };

  /**
   * A class to contain data useful for Graphics objects
   *
   * @class
   * @memberof PIXI
   */
  var GraphicsData = function GraphicsData(shape, fillStyle, lineStyle, matrix)
  {
    if ( fillStyle === void 0 ) { fillStyle = null; }
    if ( lineStyle === void 0 ) { lineStyle = null; }
    if ( matrix === void 0 ) { matrix = null; }

    /**
     * The shape object to draw.
     * @member {PIXI.Circle|PIXI.Ellipse|PIXI.Polygon|PIXI.Rectangle|PIXI.RoundedRectangle}
     */
    this.shape = shape;

    /**
     * The style of the line.
     * @member {PIXI.LineStyle}
     */
    this.lineStyle = lineStyle;

    /**
     * The style of the fill.
     * @member {PIXI.FillStyle}
     */
    this.fillStyle = fillStyle;

    /**
     * The transform matrix.
     * @member {PIXI.Matrix}
     */
    this.matrix = matrix;

    /**
     * The type of the shape, see the Const.Shapes file for all the existing types,
     * @member {number}
     */
    this.type = shape.type;

    /**
     * The collection of points.
     * @member {number[]}
     */
    this.points = [];

    /**
     * The collection of holes.
     * @member {PIXI.GraphicsData[]}
     */
    this.holes = [];
  };

  /**
   * Creates a new GraphicsData object with the same values as this one.
   *
   * @return {PIXI.GraphicsData} Cloned GraphicsData object
   */
  GraphicsData.prototype.clone = function clone ()
  {
    return new GraphicsData(
      this.shape,
      this.fillStyle,
      this.lineStyle,
      this.matrix
    );
  };

  /**
   * Destroys the Graphics data.
   */
  GraphicsData.prototype.destroy = function destroy ()
  {
    this.shape = null;
    this.holes.length = 0;
    this.holes = null;
    this.points.length = 0;
    this.points = null;
    this.lineStyle = null;
    this.fillStyle = null;
  };

  /**
   * Builds a circle to draw
   *
   * Ignored from docs since it is not directly exposed.
   *
   * @ignore
   * @private
   * @param {PIXI.WebGLGraphicsData} graphicsData - The graphics object to draw
   * @param {object} webGLData - an object containing all the WebGL-specific information to create this shape
   * @param {object} webGLDataNativeLines - an object containing all the WebGL-specific information to create nativeLines
   */
  var buildCircle = {

    build: function build(graphicsData)
    {
      // need to convert points to a nice regular data
      var circleData = graphicsData.shape;
      var points = graphicsData.points;
      var x = circleData.x;
      var y = circleData.y;
      var width;
      var height;

      points.length = 0;

      // TODO - bit hacky??
      if (graphicsData.type === SHAPES.CIRC)
      {
        width = circleData.radius;
        height = circleData.radius;
      }
      else
      {
        width = circleData.width;
        height = circleData.height;
      }

      if (width === 0 || height === 0)
      {
        return;
      }

      var totalSegs = Math.floor(30 * Math.sqrt(circleData.radius))
        || Math.floor(15 * Math.sqrt(circleData.width + circleData.height));

      totalSegs /= 2.3;

      var seg = (Math.PI * 2) / totalSegs;

      for (var i = 0; i < totalSegs; i++)
      {
        points.push(
          x + (Math.sin(-seg * i) * width),
          y + (Math.cos(-seg * i) * height)
        );
      }

      points.push(
        points[0],
        points[1]
      );
    },

    triangulate: function triangulate(graphicsData, graphicsGeometry)
    {
      var points = graphicsData.points;
      var verts = graphicsGeometry.points;
      var indices = graphicsGeometry.indices;

      var vertPos = verts.length / 2;
      var center = vertPos;

      verts.push(graphicsData.shape.x, graphicsData.shape.y);

      for (var i = 0; i < points.length; i += 2)
      {
        verts.push(points[i], points[i + 1]);

        // add some uvs
        indices.push(vertPos++, center, vertPos);
      }
    },
  };

  /**
   * Builds a line to draw
   *
   * Ignored from docs since it is not directly exposed.
   *
   * @ignore
   * @private
   * @param {PIXI.GraphicsData} graphicsData - The graphics object containing all the necessary properties
   * @param {PIXI.GraphicsGeometry} graphicsGeometry - Geometry where to append output
   */
  function buildLine (graphicsData, graphicsGeometry)
  {
    if (graphicsData.lineStyle.native)
    {
      buildNativeLine(graphicsData, graphicsGeometry);
    }
    else
    {
      buildLine$1(graphicsData, graphicsGeometry);
    }
  }

  /**
   * Builds a line to draw using the polygon method.
   *
   * Ignored from docs since it is not directly exposed.
   *
   * @ignore
   * @private
   * @param {PIXI.GraphicsData} graphicsData - The graphics object containing all the necessary properties
   * @param {PIXI.GraphicsGeometry} graphicsGeometry - Geometry where to append output
   */
  function buildLine$1(graphicsData, graphicsGeometry)
  {
    var shape = graphicsData.shape;
    var points = graphicsData.points || shape.points.slice();

    if (points.length === 0)
    {
      return;
    }
    // if the line width is an odd number add 0.5 to align to a whole pixel
    // commenting this out fixes #711 and #1620
    // if (graphicsData.lineWidth%2)
    // {
    //     for (i = 0; i < points.length; i++)
    //     {
    //         points[i] += 0.5;
    //     }
    // }

    var style = graphicsData.lineStyle;

    // get first and last point.. figure out the middle!
    var firstPoint = new Point(points[0], points[1]);
    var lastPoint = new Point(points[points.length - 2], points[points.length - 1]);
    var closedShape = shape.type !== SHAPES.POLY || shape.closeStroke;
    var closedPath = firstPoint.x === lastPoint.x && firstPoint.y === lastPoint.y;

    // if the first point is the last point - gonna have issues :)
    if (closedShape)
    {
      // need to clone as we are going to slightly modify the shape..
      points = points.slice();

      if (closedPath)
      {
        points.pop();
        points.pop();
        lastPoint.set(points[points.length - 2], points[points.length - 1]);
      }

      var midPointX = lastPoint.x + ((firstPoint.x - lastPoint.x) * 0.5);
      var midPointY = lastPoint.y + ((firstPoint.y - lastPoint.y) * 0.5);

      points.unshift(midPointX, midPointY);
      points.push(midPointX, midPointY);
    }

    var verts = graphicsGeometry.points;
    var length = points.length / 2;
    var indexCount = points.length;
    var indexStart = verts.length / 2;

    // DRAW the Line
    var width = style.width / 2;

    // sort color
    var p1x = points[0];
    var p1y = points[1];
    var p2x = points[2];
    var p2y = points[3];
    var p3x = 0;
    var p3y = 0;

    var perpx = -(p1y - p2y);
    var perpy = p1x - p2x;
    var perp2x = 0;
    var perp2y = 0;
    var perp3x = 0;
    var perp3y = 0;

    var dist = Math.sqrt((perpx * perpx) + (perpy * perpy));

    perpx /= dist;
    perpy /= dist;
    perpx *= width;
    perpy *= width;

    var ratio = style.alignment;// 0.5;
    var r1 = (1 - ratio) * 2;
    var r2 = ratio * 2;

    // start
    verts.push(
      p1x - (perpx * r1),
      p1y - (perpy * r1));

    verts.push(
      p1x + (perpx * r2),
      p1y + (perpy * r2));

    for (var i = 1; i < length - 1; ++i)
    {
      p1x = points[(i - 1) * 2];
      p1y = points[((i - 1) * 2) + 1];

      p2x = points[i * 2];
      p2y = points[(i * 2) + 1];

      p3x = points[(i + 1) * 2];
      p3y = points[((i + 1) * 2) + 1];

      perpx = -(p1y - p2y);
      perpy = p1x - p2x;

      dist = Math.sqrt((perpx * perpx) + (perpy * perpy));
      perpx /= dist;
      perpy /= dist;
      perpx *= width;
      perpy *= width;

      perp2x = -(p2y - p3y);
      perp2y = p2x - p3x;

      dist = Math.sqrt((perp2x * perp2x) + (perp2y * perp2y));
      perp2x /= dist;
      perp2y /= dist;
      perp2x *= width;
      perp2y *= width;

      var a1 = (-perpy + p1y) - (-perpy + p2y);
      var b1 = (-perpx + p2x) - (-perpx + p1x);
      var c1 = ((-perpx + p1x) * (-perpy + p2y)) - ((-perpx + p2x) * (-perpy + p1y));
      var a2 = (-perp2y + p3y) - (-perp2y + p2y);
      var b2 = (-perp2x + p2x) - (-perp2x + p3x);
      var c2 = ((-perp2x + p3x) * (-perp2y + p2y)) - ((-perp2x + p2x) * (-perp2y + p3y));

      var denom = (a1 * b2) - (a2 * b1);

      if (Math.abs(denom) < 0.1)
      {
        denom += 10.1;
        verts.push(
          p2x - (perpx * r1),
          p2y - (perpy * r1));

        verts.push(
          p2x + (perpx * r2),
          p2y + (perpy * r2));

        continue;
      }

      var px = ((b1 * c2) - (b2 * c1)) / denom;
      var py = ((a2 * c1) - (a1 * c2)) / denom;
      var pdist = ((px - p2x) * (px - p2x)) + ((py - p2y) * (py - p2y));

      if (pdist > (196 * width * width))
      {
        perp3x = perpx - perp2x;
        perp3y = perpy - perp2y;

        dist = Math.sqrt((perp3x * perp3x) + (perp3y * perp3y));
        perp3x /= dist;
        perp3y /= dist;
        perp3x *= width;
        perp3y *= width;

        verts.push(p2x - (perp3x * r1), p2y - (perp3y * r1));

        verts.push(p2x + (perp3x * r2), p2y + (perp3y * r2));

        verts.push(p2x - (perp3x * r2 * r1), p2y - (perp3y * r1));

        indexCount++;
      }
      else
      {
        verts.push(p2x + ((px - p2x) * r1), p2y + ((py - p2y) * r1));

        verts.push(p2x - ((px - p2x) * r2), p2y - ((py - p2y) * r2));
      }
    }

    p1x = points[(length - 2) * 2];
    p1y = points[((length - 2) * 2) + 1];

    p2x = points[(length - 1) * 2];
    p2y = points[((length - 1) * 2) + 1];

    perpx = -(p1y - p2y);
    perpy = p1x - p2x;

    dist = Math.sqrt((perpx * perpx) + (perpy * perpy));
    perpx /= dist;
    perpy /= dist;
    perpx *= width;
    perpy *= width;

    verts.push(p2x - (perpx * r1), p2y - (perpy * r1));

    verts.push(p2x + (perpx * r2), p2y + (perpy * r2));

    var indices = graphicsGeometry.indices;

    // indices.push(indexStart);

    for (var i$1 = 0; i$1 < indexCount - 2; ++i$1)
    {
      indices.push(indexStart, indexStart + 1, indexStart + 2);

      indexStart++;
    }
  }

  /**
   * Builds a line to draw using the gl.drawArrays(gl.LINES) method
   *
   * Ignored from docs since it is not directly exposed.
   *
   * @ignore
   * @private
   * @param {PIXI.GraphicsData} graphicsData - The graphics object containing all the necessary properties
   * @param {PIXI.GraphicsGeometry} graphicsGeometry - Geometry where to append output
   */
  function buildNativeLine(graphicsData, graphicsGeometry)
  {
    var i = 0;

    var shape = graphicsData.shape;
    var points = graphicsData.points || shape.points;
    var closedShape = shape.type !== SHAPES.POLY || shape.closeStroke;

    if (points.length === 0) { return; }

    var verts = graphicsGeometry.points;
    var indices = graphicsGeometry.indices;
    var length = points.length / 2;

    var startIndex = verts.length / 2;
    var currentIndex = startIndex;

    verts.push(points[0], points[1]);

    for (i = 1; i < length; i++)
    {
      verts.push(points[i * 2], points[(i * 2) + 1]);
      indices.push(currentIndex, currentIndex + 1);

      currentIndex++;
    }

    if (closedShape)
    {
      indices.push(currentIndex, startIndex);
    }
  }

  /**
   * Builds a polygon to draw
   *
   * Ignored from docs since it is not directly exposed.
   *
   * @ignore
   * @private
   * @param {PIXI.WebGLGraphicsData} graphicsData - The graphics object containing all the necessary properties
   * @param {object} webGLData - an object containing all the WebGL-specific information to create this shape
   * @param {object} webGLDataNativeLines - an object containing all the WebGL-specific information to create nativeLines
   */
  var buildPoly = {

    build: function build(graphicsData)
    {
      graphicsData.points = graphicsData.shape.points.slice();
    },

    triangulate: function triangulate(graphicsData, graphicsGeometry)
    {
      var points = graphicsData.points;
      var holes = graphicsData.holes;
      var verts = graphicsGeometry.points;
      var indices = graphicsGeometry.indices;

      if (points.length >= 6)
      {
        var holeArray = [];
        // Process holes..

        for (var i = 0; i < holes.length; i++)
        {
          var hole = holes[i];

          holeArray.push(points.length / 2);
          points = points.concat(hole.points);
        }

        // sort color
        var triangles = earcut_1(points, holeArray, 2);

        if (!triangles)
        {
          return;
        }

        var vertPos = verts.length / 2;

        for (var i$1 = 0; i$1 < triangles.length; i$1 += 3)
        {
          indices.push(triangles[i$1] + vertPos);
          indices.push(triangles[i$1 + 1] + vertPos);
          indices.push(triangles[i$1 + 2] + vertPos);
        }

        for (var i$2 = 0; i$2 < points.length; i$2++)
        {
          verts.push(points[i$2]);
        }
      }
    },
  };

  /**
   * Builds a rectangle to draw
   *
   * Ignored from docs since it is not directly exposed.
   *
   * @ignore
   * @private
   * @param {PIXI.WebGLGraphicsData} graphicsData - The graphics object containing all the necessary properties
   * @param {object} webGLData - an object containing all the WebGL-specific information to create this shape
   * @param {object} webGLDataNativeLines - an object containing all the WebGL-specific information to create nativeLines
   */
  var buildRectangle = {

    build: function build(graphicsData)
    {
      // --- //
      // need to convert points to a nice regular data
      //
      var rectData = graphicsData.shape;
      var x = rectData.x;
      var y = rectData.y;
      var width = rectData.width;
      var height = rectData.height;

      var points = graphicsData.points;

      points.length = 0;

      points.push(x, y,
        x + width, y,
        x + width, y + height,
        x, y + height);
    },

    triangulate: function triangulate(graphicsData, graphicsGeometry)
    {
      var points = graphicsData.points;
      var verts = graphicsGeometry.points;

      var vertPos = verts.length / 2;

      verts.push(points[0], points[1],
        points[2], points[3],
        points[6], points[7],
        points[4], points[5]);

      graphicsGeometry.indices.push(vertPos, vertPos + 1, vertPos + 2,
        vertPos + 1, vertPos + 2, vertPos + 3);
    },
  };

  /**
   * Builds a rounded rectangle to draw
   *
   * Ignored from docs since it is not directly exposed.
   *
   * @ignore
   * @private
   * @param {PIXI.WebGLGraphicsData} graphicsData - The graphics object containing all the necessary properties
   * @param {object} webGLData - an object containing all the WebGL-specific information to create this shape
   * @param {object} webGLDataNativeLines - an object containing all the WebGL-specific information to create nativeLines
   */
  var buildRoundedRectangle = {

    build: function build(graphicsData)
    {
      var rrectData = graphicsData.shape;
      var points = graphicsData.points;
      var x = rrectData.x;
      var y = rrectData.y;
      var width = rrectData.width;
      var height = rrectData.height;

      var radius = rrectData.radius;

      points.length = 0;

      quadraticBezierCurve(x, y + radius,
        x, y,
        x + radius, y,
        points);
      quadraticBezierCurve(x + width - radius,
        y, x + width, y,
        x + width, y + radius,
        points);
      quadraticBezierCurve(x + width, y + height - radius,
        x + width, y + height,
        x + width - radius, y + height,
        points);
      quadraticBezierCurve(x + radius, y + height,
        x, y + height,
        x, y + height - radius,
        points);

      // this tiny number deals with the issue that occurs when points overlap and earcut fails to triangulate the item.
      // TODO - fix this properly, this is not very elegant.. but it works for now.
    },

    triangulate: function triangulate(graphicsData, graphicsGeometry)
    {
      var points = graphicsData.points;

      var verts = graphicsGeometry.points;
      var indices = graphicsGeometry.indices;

      var vecPos = verts.length / 2;

      var triangles = earcut_1(points, null, 2);

      for (var i = 0, j = triangles.length; i < j; i += 3)
      {
        indices.push(triangles[i] + vecPos);
        //     indices.push(triangles[i] + vecPos);
        indices.push(triangles[i + 1] + vecPos);
        //   indices.push(triangles[i + 2] + vecPos);
        indices.push(triangles[i + 2] + vecPos);
      }

      for (var i$1 = 0, j$1 = points.length; i$1 < j$1; i$1++)
      {
        verts.push(points[i$1], points[++i$1]);
      }
    },
  };

  /**
   * Calculate a single point for a quadratic bezier curve.
   * Utility function used by quadraticBezierCurve.
   * Ignored from docs since it is not directly exposed.
   *
   * @ignore
   * @private
   * @param {number} n1 - first number
   * @param {number} n2 - second number
   * @param {number} perc - percentage
   * @return {number} the result
   *
   */
  function getPt(n1, n2, perc)
  {
    var diff = n2 - n1;

    return n1 + (diff * perc);
  }

  /**
   * Calculate the points for a quadratic bezier curve. (helper function..)
   * Based on: https://stackoverflow.com/questions/785097/how-do-i-implement-a-bezier-curve-in-c
   *
   * Ignored from docs since it is not directly exposed.
   *
   * @ignore
   * @private
   * @param {number} fromX - Origin point x
   * @param {number} fromY - Origin point x
   * @param {number} cpX - Control point x
   * @param {number} cpY - Control point y
   * @param {number} toX - Destination point x
   * @param {number} toY - Destination point y
   * @param {number[]} [out=[]] - The output array to add points into. If not passed, a new array is created.
   * @return {number[]} an array of points
   */
  function quadraticBezierCurve(fromX, fromY, cpX, cpY, toX, toY, out)
  {
    if ( out === void 0 ) { out = []; }

    var n = 20;
    var points = out;

    var xa = 0;
    var ya = 0;
    var xb = 0;
    var yb = 0;
    var x = 0;
    var y = 0;

    for (var i = 0, j = 0; i <= n; ++i)
    {
      j = i / n;

      // The Green Line
      xa = getPt(fromX, cpX, j);
      ya = getPt(fromY, cpY, j);
      xb = getPt(cpX, toX, j);
      yb = getPt(cpY, toY, j);

      // The Black Dot
      x = getPt(xa, xb, j);
      y = getPt(ya, yb, j);

      points.push(x, y);
    }

    return points;
  }

  var BATCH_POOL = [];
  var DRAW_CALL_POOL = [];

  /**
   * Map of fill commands for each shape type.
   *
   * @member {Object}
   * @private
   */
  var fillCommands = {};

  fillCommands[SHAPES.POLY] = buildPoly;
  fillCommands[SHAPES.CIRC] = buildCircle;
  fillCommands[SHAPES.ELIP] = buildCircle;
  fillCommands[SHAPES.RECT] = buildRectangle;
  fillCommands[SHAPES.RREC] = buildRoundedRectangle;

  /**
   * A little internal structure to hold interim batch objects.
   *
   * @private
   */
  var BatchPart = function BatchPart()
  {
    this.style = null;
    this.size = 0;
    this.start = 0;
    this.attribStart = 0;
    this.attribSize = 0;
  };

  /**
   * The Graphics class contains methods used to draw primitive shapes such as lines, circles and
   * rectangles to the display, and to color and fill them.
   *
   * GraphicsGeometry is designed to not be continually updating the geometry since it's expensive
   * to re-tesselate using **earcut**. Consider using {@link PIXI.Mesh} for this use-case, it's much faster.
   *
   * @class
   * @extends PIXI.BatchGeometry
   * @memberof PIXI
   */
  var GraphicsGeometry = /*@__PURE__*/(function (BatchGeometry) {
    function GraphicsGeometry()
    {
      BatchGeometry.call(this);

      /**
       * An array of points to draw, 2 numbers per point
       *
       * @member {number[]}
       * @protected
       */
      this.points = [];

      /**
       * The collection of colors
       *
       * @member {number[]}
       * @protected
       */
      this.colors = [];

      /**
       * The UVs collection
       *
       * @member {number[]}
       * @protected
       */
      this.uvs = [];

      /**
       * The indices of the vertices
       *
       * @member {number[]}
       * @protected
       */
      this.indices = [];

      /**
       * Reference to the texture IDs.
       *
       * @member {number[]}
       * @protected
       */
      this.textureIds = [];

      /**
       * The collection of drawn shapes.
       *
       * @member {PIXI.GraphicsData[]}
       * @protected
       */
      this.graphicsData = [];

      /**
       * Used to detect if the graphics object has changed. If this is set to true then the graphics
       * object will be recalculated.
       *
       * @member {number}
       * @protected
       */
      this.dirty = 0;

      /**
       * Batches need to regenerated if the geometry is updated.
       *
       * @member {number}
       * @protected
       */
      this.batchDirty = -1;

      /**
       * Used to check if the cache is dirty.
       *
       * @member {number}
       * @protected
       */
      this.cacheDirty = -1;

      /**
       * Used to detect if we clear the graphics WebGL data.
       *
       * @member {number}
       * @default 0
       * @protected
       */
      this.clearDirty = 0;

      /**
       * List of current draw calls drived from the batches.
       *
       * @member {object[]}
       * @protected
       */
      this.drawCalls = [];

      /**
       * Intermediate abstract format sent to batch system.
       * Can be converted to drawCalls or to batchable objects.
       *
       * @member {object[]}
       * @protected
       */
      this.batches = [];

      /**
       * Index of the current last shape in the stack of calls.
       *
       * @member {number}
       * @protected
       */
      this.shapeIndex = 0;

      /**
       * Cached bounds.
       *
       * @member {PIXI.Bounds}
       * @protected
       */
      this._bounds = new Bounds();

      /**
       * The bounds dirty flag.
       *
       * @member {number}
       * @protected
       */
      this.boundsDirty = -1;

      /**
       * Padding to add to the bounds.
       *
       * @member {number}
       * @default 0
       */
      this.boundsPadding = 0;

      this.batchable = false;

      this.indicesUint16 = null;

      this.uvsFloat32 = null;
    }

    if ( BatchGeometry ) { GraphicsGeometry.__proto__ = BatchGeometry; }
    GraphicsGeometry.prototype = Object.create( BatchGeometry && BatchGeometry.prototype );
    GraphicsGeometry.prototype.constructor = GraphicsGeometry;

    var prototypeAccessors = { bounds: { configurable: true } };

    /**
     * Get the current bounds of the graphic geometry.
     *
     * @member {PIXI.Bounds}
     * @readonly
     */
    prototypeAccessors.bounds.get = function ()
    {
      if (this.boundsDirty !== this.dirty)
      {
        this.boundsDirty = this.dirty;
        this.calculateBounds();
      }

      return this._bounds;
    };

    /**
     * Clears the graphics that were drawn to this Graphics object, and resets fill and line style settings.
     *
     * @return {PIXI.GraphicsGeometry} This GraphicsGeometry object. Good for chaining method calls
     */
    GraphicsGeometry.prototype.clear = function clear ()
    {
      if (this.graphicsData.length > 0)
      {
        this.boundsDirty = -1;
        this.dirty++;
        this.clearDirty++;
        this.batchDirty++;
        this.graphicsData.length = 0;
        this.shapeIndex = 0;

        this.points.length = 0;
        this.colors.length = 0;
        this.uvs.length = 0;
        this.indices.length = 0;
        this.textureIds.length = 0;

        for (var i = 0; i < this.drawCalls.length; i++)
        {
          this.drawCalls[i].textures.length = 0;
          DRAW_CALL_POOL.push(this.drawCalls[i]);
        }

        this.drawCalls.length = 0;

        for (var i$1 = 0; i$1 < this.batches.length; i$1++)
        {
          var batch =  this.batches[i$1];

          batch.start = 0;
          batch.attribStart = 0;
          batch.style = null;
          BATCH_POOL.push(batch);
        }

        this.batches.length = 0;
      }

      return this;
    };

    /**
     * Draws the given shape to this Graphics object. Can be any of Circle, Rectangle, Ellipse, Line or Polygon.
     *
     * @param {PIXI.Circle|PIXI.Ellipse|PIXI.Polygon|PIXI.Rectangle|PIXI.RoundedRectangle} shape - The shape object to draw.
     * @param {PIXI.FillStyle} fillStyle - Defines style of the fill.
     * @param {PIXI.LineStyle} lineStyle - Defines style of the lines.
     * @param {PIXI.Matrix} matrix - Transform applied to the points of the shape.
     * @return {PIXI.GraphicsGeometry} Returns geometry for chaining.
     */
    GraphicsGeometry.prototype.drawShape = function drawShape (shape, fillStyle, lineStyle, matrix)
    {
      var data = new GraphicsData(shape, fillStyle, lineStyle, matrix);

      this.graphicsData.push(data);
      this.dirty++;

      return this;
    };

    /**
     * Draws the given shape to this Graphics object. Can be any of Circle, Rectangle, Ellipse, Line or Polygon.
     *
     * @param {PIXI.Circle|PIXI.Ellipse|PIXI.Polygon|PIXI.Rectangle|PIXI.RoundedRectangle} shape - The shape object to draw.
     * @param {PIXI.Matrix} matrix - Transform applied to the points of the shape.
     * @return {PIXI.GraphicsGeometry} Returns geometry for chaining.
     */
    GraphicsGeometry.prototype.drawHole = function drawHole (shape, matrix)
    {
      if (!this.graphicsData.length)
      {
        return null;
      }

      var data = new GraphicsData(shape, null, null, matrix);

      var lastShape = this.graphicsData[this.graphicsData.length - 1];

      data.lineStyle = lastShape.lineStyle;

      lastShape.holes.push(data);

      this.dirty++;

      return data;
    };

    /**
     * Destroys the Graphics object.
     *
     * @param {object|boolean} [options] - Options parameter. A boolean will act as if all
     *  options have been set to that value
     * @param {boolean} [options.children=false] - if set to true, all the children will have
     *  their destroy method called as well. 'options' will be passed on to those calls.
     * @param {boolean} [options.texture=false] - Only used for child Sprites if options.children is set to true
     *  Should it destroy the texture of the child sprite
     * @param {boolean} [options.baseTexture=false] - Only used for child Sprites if options.children is set to true
     *  Should it destroy the base texture of the child sprite
     */
    GraphicsGeometry.prototype.destroy = function destroy (options)
    {
      BatchGeometry.prototype.destroy.call(this, options);

      // destroy each of the GraphicsData objects
      for (var i = 0; i < this.graphicsData.length; ++i)
      {
        this.graphicsData[i].destroy();
      }

      this.points.length = 0;
      this.points = null;
      this.colors.length = 0;
      this.colors = null;
      this.uvs.length = 0;
      this.uvs = null;
      this.indices.length = 0;
      this.indices = null;
      this.indexBuffer.destroy();
      this.indexBuffer = null;
      this.graphicsData.length = 0;
      this.graphicsData = null;
      this.drawCalls.length = 0;
      this.drawCalls = null;
      this.batches.length = 0;
      this.batches = null;
      this._bounds = null;
    };

    /**
     * Check to see if a point is contained within this geometry.
     *
     * @param {PIXI.Point} point - Point to check if it's contained.
     * @return {Boolean} `true` if the point is contained within geometry.
     */
    GraphicsGeometry.prototype.containsPoint = function containsPoint (point)
    {
      var graphicsData = this.graphicsData;

      for (var i = 0; i < graphicsData.length; ++i)
      {
        var data = graphicsData[i];

        if (!data.fillStyle.visible)
        {
          continue;
        }

        // only deal with fills..
        if (data.shape)
        {
          if (data.shape.contains(point.x, point.y))
          {
            if (data.holes)
            {
              for (var i$1 = 0; i$1 < data.holes.length; i$1++)
              {
                var hole = data.holes[i$1];

                if (hole.shape.contains(point.x, point.y))
                {
                  return false;
                }
              }
            }

            return true;
          }
        }
      }

      return false;
    };

    /**
     * Generates intermediate batch data. Either gets converted to drawCalls
     * or used to convert to batch objects directly by the Graphics object.
     * @protected
     */
    GraphicsGeometry.prototype.updateBatches = function updateBatches ()
    {
      if (this.dirty === this.cacheDirty) { return; }
      if (this.graphicsData.length === 0)
      {
        this.batchable = true;

        return;
      }

      if (this.dirty !== this.cacheDirty)
      {
        for (var i = 0; i < this.graphicsData.length; i++)
        {
          var data = this.graphicsData[i];

          if (data.fillStyle && !data.fillStyle.texture.baseTexture.valid) { return; }
          if (data.lineStyle && !data.lineStyle.texture.baseTexture.valid) { return; }
        }
      }

      this.cacheDirty = this.dirty;

      var uvs = this.uvs;

      var batchPart = null;
      var currentTexture = null;
      var currentColor = 0;
      var currentNative = false;

      if (this.batches.length > 0)
      {
        batchPart = this.batches[this.batches.length - 1];

        var style = batchPart.style;

        currentTexture = style.texture.baseTexture;
        currentColor = style.color + style.alpha;
        currentNative = style.native;
      }

      for (var i$1 = this.shapeIndex; i$1 < this.graphicsData.length; i$1++)
      {
        this.shapeIndex++;

        var data$1 = this.graphicsData[i$1];
        var command = fillCommands[data$1.type];

        var fillStyle = data$1.fillStyle;
        var lineStyle = data$1.lineStyle;

        // build out the shapes points..
        command.build(data$1);

        if (data$1.matrix)
        {
          this.transformPoints(data$1.points, data$1.matrix);
        }

        for (var j = 0; j < 2; j++)
        {
          var style$1 = (j === 0) ? fillStyle : lineStyle;

          if (!style$1.visible) { continue; }

          var nextTexture = style$1.texture.baseTexture;

          var index$1 = this.indices.length;
          var attribIndex = this.points.length / 2;

          // close batch if style is different
          if (batchPart
            && (currentTexture !== nextTexture
              || currentColor !== (style$1.color + style$1.alpha)
              || currentNative !== style$1.native))
          {
            batchPart.size = index$1 - batchPart.start;
            batchPart.attribSize = attribIndex - batchPart.attribStart;

            if (batchPart.size > 0)
            {
              batchPart = null;
            }
          }
          // spawn new batch if its first batch or previous was closed
          if (!batchPart)
          {
            batchPart = BATCH_POOL.pop() || new BatchPart();
            this.batches.push(batchPart);
            nextTexture.wrapMode = WRAP_MODES.REPEAT;
            currentTexture = nextTexture;
            currentColor = style$1.color + style$1.alpha;
            currentNative = style$1.native;

            batchPart.style = style$1;
            batchPart.start = index$1;
            batchPart.attribStart = attribIndex;
          }

          var start = this.points.length / 2;

          if (j === 0)
          {
            if (data$1.holes.length)
            {
              this.processHoles(data$1.holes);

              buildPoly.triangulate
