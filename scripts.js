(function() {

  /* ============================================ */
  /* FRAME ANIMATION POLYFILLS
  /* ============================================ */

  /**
   * Request animation frame
   */
  var raf = (function () {
    return window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      window.oRequestAnimationFrame ||
      function (callback) {
        return window.setTimeout(callback, 1000 / 60);
      };
  })();

  /**
   * Cancel animation frame
   */
  var caf = (function () {
    return window.cancelAnimationFrame ||
      window.webkitCancelAnimationFrame ||
      window.mozCancelAnimationFrame ||
      window.msCancelAnimationFrame ||
      window.oCancelAnimationFrame ||
      function (callback) {
        window.clearTimeout(callback);
      };
  })();

  /* ============================================ */
  /* HELPER FUNCTIONS
  /* ============================================ */

  /**
   * Creates a class.
   * @param {Function} $constructor Class constructor
   * @param {Object}   $class       Class body
   * @param {Class}    $parent      Class to inherit from
   */
  function createClass($constructor, $class, $parent) {
    var $newConstructor;

    if ($parent) {
      $newConstructor = function () {
        $parent.apply(this, Array.prototype.slice.call(arguments));
        $constructor.apply(this, Array.prototype.slice.call(arguments));
      };

      $newConstructor.prototype = Object.create($parent.prototype);

      Object.assign($newConstructor.prototype, $class, {
        constructor: $newConstructor
      });
    } else {
      $newConstructor = $constructor;
      $newConstructor.prototype = $class;
    }

    return $newConstructor;
  }

  /**
   * Animates properties of an object
   * @param {Object} obj Object to animate its properties
   * @param {Object} props An object that represents the properties to be animated
   * @param {Object} settings Animation settings
   * 
   * Example:
   * 
   * var o = { x: 100 };
   * animate(o, { x: 200 }, { duration: 500, delay: 100 });
   * 
   * var o = { x: 100, y: 100 };
   * animate(o, {
   *   x: { 
   *     from: 300,
   *     to: 500,
   *     duration: 1000 // overrides settings.duration
   *   },
   *   y: { 
   *     from: 0,
   *     to: 900
   *   },
   * }, { duration: 500, delay: 100 });
   */
  function animate(obj, props, settings) {
    var easing = Object.assign({}, {
      easeInOutCubic: function (x, t, b, c, d) {
        if ((t /= d / 2) < 1) return c / 2 * t * t * t + b;
        return c / 2 * ((t -= 2) * t * t + 2) + b;
      },
      easeOutElastic: function (x, t, b, c, d) {
        var s = 1.70158;
        var p = 0;
        var a = c;
        if (t == 0) return b;
        if ((t /= d) == 1) return b + c;
        if (!p) p = d * .3;
        if (a < Math.abs(c)) {
          a = c;
          var s = p / 4;
        } else var s = p / (2 * Math.PI) * Math.asin(c / a);
        return a * Math.pow(2, - 10 * t) * Math.sin((t * d - s) * (2 * Math.PI) / p) + c + b;
      },
    },
      (window.animationEasing || {})
    );

    Object.keys(props).forEach(function (prop) {
      var propSettings = {};

      if (isObjectType(props[prop], 'object')) {
        propSettings = props[prop];
      } else {
        propSettings.to = props[prop];
      }

      var animation = Object.assign(
        {
          time: 0,
          from: 0,
          to: 1,
          duration: 1000,
          delay: 0,
          easing: 'easeInOutCubic',
          step: null,
          complete: null,
        },
        {
          from: obj[prop],
          to: obj[prop]
        },
        (settings || {}),
        propSettings
      );

      animation.time -= animation.delay;

      (function tick() {
        animation.time = Math.min(animation.time + 1000 / 60, animation.duration);

        obj[prop] = easing[animation.easing](
          null,
          Math.max(0, animation.time),
          animation.from,
          animation.to - animation.from,
          animation.duration
        );

        animation.step && animation.step(obj[prop], animation);

        if (animation.time >= animation.duration) {
          animation.time = animation.duration;
          animation.complete && animation.complete();
          caf(animation.id);
        } else {
          animation.id = raf(tick);
        }
      }());
    });
  }

  /**
   * Generates a random float number.
   * @param  {Number} min Minimum value
   * @param  {Number} max Maximum value
   * @return {Number}     The generated random number
   */
  function rand(min, max) {
    if (typeof max === 'undefined') {
      max = min;
      min = 0;
    }

    return min + Math.random() * (max - min);
  }

  /**
   * Generates a random integer.
   * @param  {Number} min Minimum value
   * @param  {Number} max Maximum value
   * @return {Number}     The generated random integer
   */
  function irand(min, max) {
    if (typeof max === 'undefined') {
      max = min;
      min = 0;
    }

    return Math.floor(rand(min, max + 1));
  }

  /**
   * Stops event
   * @param  {Event} e Event to be stopped
   */
  function stopEvent(e) {
    e.preventDefault();
    e.stopPropagation();
    e.cancelBubble = true;
    e.returnValue = false;
  }

  /**
   * Checks whether the given value is of a specific type
   * @param {Object} val  Value to check
   * @param {Object} type Type to check against
   */
  function isObjectType(val, type) {
    return Object.prototype.toString.call(val).toLowerCase() === '[object ' + type.toLowerCase() + ']';
  }

  /**
   * Deep clones an object
   * @param {Object} obj Object to clone
   */
  function cloneObject(obj) {
    var newObj = Object.assign({}, obj);

    Object.keys(newObj).forEach(function (key) {
      if (isObjectType(newObj[key], 'object')) {
        newObj[key] = cloneObject(newObj[key]);
      }

      if (isObjectType(newObj[key], 'array')) {
        newObj[key] = Array.prototype.slice.call(newObj[key]);
      }
    });

    return newObj;
  }

  /**
   * Detects whether there is an intersection between two rectangles
   * @param {Object} rectA First rectangle in the format: { top: *, bottom: *, right: *, left: * }
   * @param {Object} rectB Second rectangle in the format: { top: *, bottom: *, right: *, left: * }
   */
  function aabb(rectA, rectB) {
    return (
      rectA.right > rectB.left &&
      rectA.left < rectB.right &&
      rectA.bottom > rectB.top &&
      rectA.top < rectB.bottom
    );
  }

  /**
   * Converts hex colors to RGB values
   * @param  {String} hex Hex Color
   * @return {Object}     RGB Object
   */
  function getRGB(hex) {
    var arrBuff = new ArrayBuffer(4);
    var vw = new DataView(arrBuff);
    vw.setUint32(0, parseInt(hex.slice(1), 16), false);
    var arrByte = new Uint8Array(arrBuff);

    return {
      red: arrByte[1],
      green: arrByte[2],
      blue: arrByte[3],
      toString: function () {
        return arrByte[1] + ',' + arrByte[2] + ',' + arrByte[3];
      }
    };
  }

  /**
   * Detects whether the device is touch enabled
   */
  function isTouch() {
    return !!('ontouchstart' in window);
  }

  /* ============================================ */
  /* RENDER
  /* ============================================ */

  var canvas = document.getElementById('canvas');

  var Renderer = createClass(
    function (canvas) {
      if (canvas) {
        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        this.render();
      }
    },

    {
      paused: false,
      handlers: {},

      render: function () {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (!this.paused) {
          this.trigger('update');
          this.trigger('updated');
        }

        this.trigger('render');
        this.trigger('rendered');

        this.frame = raf(this.render.bind(this));
      },

      pause: function () {
        this.paused = true;
      },

      resume: function () {
        this.paused = false;
      },

      start: function () {
        this.render();
      },

      stop: function () {
        caf(this.frame);
      },

      on: function (event, callback, order) {
        order = order || 0;
        this.handlers[event] = this.handlers[event] || {};
        this.handlers[event][order] = this.handlers[event][order] || [];
        this.handlers[event][order].push(callback);
      },

      off: function (event, callback) {
        if (this.handlers[event]) {
          var orders = Object.keys(this.handlers[event]);

          for (var i = 0; i < orders.length; i++) {
            var callbacks = this.handlers[event][orders[i]];

            for (var j = 0; j < callbacks.length; j++) {
              if (callback === callbacks[j]) {
                this.handlers[event][orders[i]].splice(j, 1);
                return true;
              }
            }
          }
        }

        return false;
      },

      trigger: function (event) {
        if (this.handlers[event]) {
          var orders = Object.keys(this.handlers[event]).sort(function (a, b) {
            return a - b;
          });

          for (var i = 0; i < orders.length; i++) {
            var callbacks = this.handlers[event][orders[i]];

            for (var j = 0; j < callbacks.length; j++) {
              callbacks[j].call();
            }
          }
        }
      }
    }
  );

  var renderer = new Renderer(canvas);

  // resize canvas

  window.addEventListener('resize', (function resizeCanvas() {
    var scaleFactor = 1 + (0.8 * 1100 / window.innerHeight);

    canvas.width = scaleFactor * canvas.offsetWidth;
    canvas.height = scaleFactor * canvas.offsetHeight;

    // throttle
    var timeout;
    return function () {
      clearTimeout(timeout);
      setTimeout(resizeCanvas, 300);
    };
  }()));

  /* ============================================ */
  /* CANVAS OBJECT
  /* ============================================ */

  var CanvasObject = createClass(
    function (renderer, options) {
      this.renderer = renderer;
      this.canvas = this.renderer.canvas;
      this.context = this.renderer.context;

      // initialize
      this.init(options);

      // listen for 'update' and 'render' events on the canvas element
      this.__updateEventListener = this.update.bind(this);
      this.__renderEventListener = this.render.bind(this);

      this.renderer.on('update', this.__updateEventListener);
      this.renderer.on('render', this.__renderEventListener, this.zindex);
    },
    {
      defaults: {
        originX: 0,
        originY: 0,
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        zindex: 0,
        sprite: null,
        spriteReady: false,
        spriteRect: { x: 0, y: 0, width: 100, height: 100 },
        showOrigin: false,
        showBounds: false,
        originColor: 'red',
        boundsColor: 'red',
        onUpdate: null,
        onRender: null,
        onDraw: null,
        onDeath: null,
      },

      init: function (options) {
        this.options = Object.assign({}, cloneObject(this.defaults), cloneObject(options));
        Object.assign(this, cloneObject(this.options));
      },

      update: function () {
        if (this.options.onUpdate) {
          this.options.onUpdate.call(this);
        }
      },

      offsetX: function () {
        return this.originX * this.width;
      },

      offsetY: function () {
        return this.originY * this.height;
      },

      animate: function (props, settings) {
        animate(this, props, settings);
      },

      render: function () {
        this.beforeDraw();

        if (this.sprite) {
          if (!this.spriteImage || (this.spriteImage && this.spriteImage.spriteSource !== this.sprite)) {
            this.spriteImage = new Image(this.width, this.height);

            this.spriteImage.onload = function () {
              this.spriteReady = true;
              this.drawSprite();
            }.bind(this);

            this.spriteImage.src = this.spriteImage.spriteSource = this.sprite;
          } else {
            this.drawSprite();
          }
        }

        this.draw();

        if (this.options.onDraw) {
          this.options.onDraw.call(this);
        }

        this.afterDraw();

        if (this.options.onRender) {
          this.options.onRender.call(this);
        }
      },

      beforeDraw: function() {
        this.context.save();

        this.context.globalAlpha = this.opacity;
        this.context.translate(this.x, this.y);
        this.context.rotate(this.rotation * Math.PI / 180); /* rotate then scale */
        this.context.scale(this.scaleX, this.scaleY); /* rotate then scale */
      },

      draw: function () {
        // use this function to draw the object
      },

      afterDraw: function() {
        if (this.showOrigin) {
          this.drawOrigin();
        }

        if (this.showBounds) {
          this.drawBounds();
        }

        this.context.restore();
      },

      drawSprite: function () {
        if (!this.spriteReady) return;

        this.context.drawImage(
          this.spriteImage,
          this.spriteRect.x, /* sprite x */
          this.spriteRect.y, /* sprite y */
          this.spriteRect.width, /* sprite width */
          this.spriteRect.height, /* sprite height */
          -this.offsetX(), /* object x */
          -this.offsetY(), /* object y */
          this.width, /* object width */
          this.height /* object height */
        );
      },

      drawBounds: function () {
        this.context.beginPath();
        this.context.rect(0 - this.offsetX(), 0 - this.offsetY(), this.width, this.height);
        this.context.strokeStyle = this.boundsColor;
        this.context.stroke();
      },

      drawOrigin: function () {
        this.context.beginPath();
        this.context.arc(0, 0, 5, 0, 2 * Math.PI, false);
        this.context.fillStyle = this.originColor;
        this.context.fill();
      },

      getBounds: function () {
        return {
          top: this.y - this.offsetY(),
          bottom: this.y - this.offsetY() + this.height,
          left: this.x - this.offsetX(),
          right: this.x - this.offsetX() + this.width,
        };
      },

      destroy: function () {
        this.destroyed = true;

        this.renderer.off('update', this.__updateEventListener);
        this.renderer.off('render', this.__renderEventListener);

        if (this.options.onDeath) {
          this.options.onDeath.call(this);
        }
      }
    }
  );

  /* ============================================ */
  /* ANIMATABLE
  /* ============================================ */

  var Animatable = createClass(
    function (renderer, options) {
      // constructor
    },
    {
      defaults: Object.assign({}, cloneObject(CanvasObject.prototype.defaults), {
        fps: 10,
        speed: 1,
        breakpoints: [],
        framesCount: 0,
        totalFrames: 1,
        paused: false,
        reversed: false,
        loop: false,
      }),

      update: function () {
        if (!this.paused) {
          var min = 0;
          var max = 60 * (this.totalFrames - 1) / this.fps;
          var nextFrameCount = this.framesCount + (this.reversed ? -this.speed : this.speed);

          this.setFramesCount(Math.max(min, Math.min(max, nextFrameCount)));

          if (this.loop) {
            if (nextFrameCount > max) {
              this.setFramesCount(0);
            } else
              if (nextFrameCount < 0) {
                this.setFramesCount(max);
              }
          }
        }

        this.spriteRect.y = this.options.spriteRect.y + this.currentFrame() * this.spriteRect.height;

        if (this.breakpoints.indexOf(this.currentFrame) != -1) {
          this.pause();
        }

        CanvasObject.prototype.update.call(this);
      },

      setFramesCount: function (framesCount) {
        this.framesCount = Math.max(0, Math.min(60 * (this.totalFrames - 1) / this.fps, framesCount));
      },

      stop: function () {
        this.pause();
        this.goto(this.totalFrames - 1);
      },

      pause: function () {
        this.paused = true;
      },

      play: function () {
        this.paused = false;
      },

      reverse: function () {
        this.reversed = true;
      },

      forward: function () {
        this.reversed = false;
      },

      goto: function (frame) {
        this.setFramesCount(60 * frame / this.fps);
      },

      gotoAndPlay: function (frame) {
        this.goto(frame);
        this.play();
      },

      gotoAndStop: function (frame) {
        this.goto(frame);
        this.pause();
      },

      nextFrame: function () {
        this.goto(this.currentFrame + 1);
      },

      prevFrame: function (v) {
        this.goto(this.currentFrame - 1);
      },

      currentFrame: function () {
        return Math.floor(this.framesCount * this.fps / 60);
      }
    },
    CanvasObject
  );

  /* ============================================ */
  /* BIRD
  /* ============================================ */

  var Bird = createClass(
    function (renderer, options) {
      this.anatomy = {
        beak: new CanvasObject(this.renderer, {
          sprite: 'bird-sprite.png',
          spriteRect: { x: 100, y: 50, width: 40, height: 70 },
          width: 40,
          height: 70,
          zindex: 1,
        }),

        tail_outer: new CanvasObject(this.renderer, {
          sprite: 'bird-sprite.png',
          spriteRect: { x: 160, y: 0, width: 40, height: 47 },
          width: 40,
          height: 47,
          originX: 1,
          originY: 0,
          zindex: 1,
        }),

        tail_inner: new CanvasObject(this.renderer, {
          sprite: 'bird-sprite.png',
          spriteRect: { x: 160, y: 47, width: 40, height: 47 },
          width: 40,
          height: 47,
          originX: 1,
          originY: 0,
          zindex: 1,
        }),

        feet_inner: new CanvasObject(this.renderer, {
          sprite: 'bird-sprite.png',
          spriteRect: { x: 180, y: 100, width: 40, height: 20 },
          width: 40,
          height: 20,
          originX: 0.5,
          originY: 0,
          zindex: 1,
        }),

        body: new CanvasObject(this.renderer, {
          sprite: 'bird-sprite.png',
          spriteRect: { x: 0, y: 0, width: 100, height: 120 },
          width: 100,
          height: 120,
          originX: 0.5,
          originY: 0.5,
          zindex: 1,
        }),

        feet_outer: new CanvasObject(this.renderer, {
          sprite: 'bird-sprite.png',
          spriteRect: { x: 140, y: 100, width: 40, height: 20 },
          width: 40,
          height: 20,
          originX: 0.5,
          originY: 0,
          zindex: 1,
        }),

        eye: new CanvasObject(this.renderer, {
          sprite: 'bird-sprite.png',
          spriteRect: { x: 100, y: 0, width: 35, height: 50 },
          width: 35,
          height: 50,
          originX: 0.5,
          originY: 0.5,
          zindex: 1,
        }),

        pupil: new CanvasObject(this.renderer, {
          sprite: 'bird-sprite.png',
          spriteRect: { x: 140, y: 0, width: 8, height: 10 },
          width: 8,
          height: 10,
          originX: 0.5,
          originY: 0.5,
          zindex: 1,
        }),

        wing: new Animatable(this.renderer, {
          sprite: 'bird-sprite.png',
          spriteRect: { x: 200, y: 0, width: 70, height: 50 },
          width: 70,
          height: 50,
          originX: 0.5,
          originY: 1,
          totalFrames: 2,
          paused: true,
          zindex: 1,
        }),
      };
    },
    {
      defaults: Object.assign({}, cloneObject(CanvasObject.prototype.defaults), {
        width: 100,
        height: 120,
        originX: 0.5,
        originY: 0.5,
        dir: 1,
        vx: 0,
        vy: 0,
        strength: 20,
        weight: 1.1,
        wingFlap: 0,
        anatomy: {},
        pupilDX: 8,
        pupilDY: 0,
      }),

      update: function () {
        var ox = this.x;
        var oy = this.y;

        this.x += this.dir * this.vx;
        this.y += this.vy;

        this.vy += this.weight;

        this.anatomy.beak.x = this.x + 40 * this.dir;
        this.anatomy.beak.y = this.y - 44;
        this.anatomy.beak.scaleX = this.dir;

        this.anatomy.tail_outer.x = this.x - 44 * this.dir;
        this.anatomy.tail_outer.y = this.y + 14;
        this.anatomy.tail_outer.scaleX = this.dir;
        this.anatomy.tail_outer.rotation = 2 * (this.dir * (this.y - oy) + this.dir);

        this.anatomy.tail_inner.x = this.x - 40 * this.dir;
        this.anatomy.tail_inner.y = this.y + 22;
        this.anatomy.tail_inner.scaleX = this.dir;
        this.anatomy.tail_inner.rotation += (1.5 * this.dir * (this.y - oy) - this.anatomy.tail_inner.rotation) / 3;

        this.anatomy.feet_inner.x = this.x + 0 * this.dir;
        this.anatomy.feet_inner.y = this.y + 55;
        this.anatomy.feet_inner.scaleX = this.dir;
        this.anatomy.feet_inner.rotation += (-2 * this.dir * (this.y - oy - 5) - this.anatomy.feet_inner.rotation) / 3;

        this.anatomy.body.x = this.x;
        this.anatomy.body.y = this.y;
        this.anatomy.body.scaleX = this.dir;

        this.anatomy.feet_outer.x = this.x + 0 * this.dir;
        this.anatomy.feet_outer.y = this.y + 60;
        this.anatomy.feet_outer.scaleX = this.dir;
        this.anatomy.feet_outer.rotation += (-1.5 * this.dir * (this.y - oy - 15) - this.anatomy.feet_outer.rotation) / 3;

        this.anatomy.eye.x = this.x + 28 * this.dir;
        this.anatomy.eye.y = this.y - 30;
        this.anatomy.eye.scaleX = this.dir;

        this.anatomy.pupil.x = this.x + this.pupilDX + 38 * this.dir;
        this.anatomy.pupil.y = this.y + this.pupilDY - 30;

        this.anatomy.pupil.x = this.x + this.pupilDX + 30 * this.dir;
        this.anatomy.pupil.y = this.y + this.pupilDY - 30;

        this.wingFlap = Math.max(0, this.wingFlap * 0.4);

        this.anatomy.wing.x = this.x - 20 * this.dir;
        this.anatomy.wing.y = this.y + 10;
        this.anatomy.wing.rotation = Math.min(25, Math.max(-25, 2 * this.dir * (this.y - oy))) - 15 * this.dir;
        this.anatomy.wing.scaleX = this.dir;
        this.anatomy.wing.scaleY += (Math.min(1.25, Math.max(-1.25, 0.25 * (4 + this.y - oy + this.wingFlap))) - this.anatomy.wing.scaleY) / 1.2;
        this.anatomy.wing.goto(this.anatomy.wing.scaleY > 0 ? 0 : 1);

        CanvasObject.prototype.update.call(this);
      },

      flap: function (strength) {
        this.wingFlap = 30 * (strength || this.strength);
        this.vy = -1 * (strength || this.strength);
      },

      blink: function () {
        var eye = this.anatomy.eye;
        eye.animate({
          scaleY: {
            to: 0,
            duration: 40,
            complete: function () {
              eye.animate({
                scaleY: {
                  to: 1,
                  duration: 80
                }
              })
            }
          }
        });

        var pupil = this.anatomy.pupil;
        pupil.animate({
          scaleY: {
            to: 0,
            duration: 80,
            complete: function () {
              pupil.animate({
                scaleY: {
                  to: 1,
                  duration: 80
                }
              })
            }
          }
        });
      },

      lookAt: function (x, y) {
        this.animate({
          pupilDX: {
            to: Math.min(9, Math.max(-10, 0.1 * (x - this.x))),
            duration: 80
          },

          pupilDY: {
            to: Math.min(10, Math.max(-10, 0.1 * (y - this.y))),
            duration: 80
          },
        });
      },

      destroy: function () {
        CanvasObject.prototype.destroy.call(this);

        Object.keys(this.anatomy).forEach(function (part) {
          this.anatomy[part].destroy();
        }.bind(this));
      }
    },
    CanvasObject
  );

  var ShockedBird = createClass(
    function (renderer, options) {
      this.counter = 0;
    },
    {
      defaults: Object.assign({}, cloneObject(Animatable.prototype.defaults), {
        width: 200,
        height: 200,
        originX: 0.5,
        originY: 0.5,
        sprite: 'bird-shocked.png',
        spriteRect: { x: 0, y: 0, width: 200, height: 200 },
        totalFrames: 6,
        fps: 24,
        loop: true
      }),

      update: function () {
        Animatable.prototype.update.call(this);

        this.scaleX = rand(0.95, 1.05);
        this.scaleY = rand(0.95, 1.05);

        if (this.counter <= 0) {
          this.counter = rand(5, 15);
          this.spriteRect.x = this.width * irand(2);
        } else {
          this.counter--;
        }
      }
    },
    Animatable
  );

  var DeadBird = createClass(
    function (renderer, options) {
      this.anatomy = {
        ring_top: new CanvasObject(this.renderer, {
          sprite: 'bird-ghost.png',
          spriteRect: { x: 110, y: 90, width: 75, height: 10 },
          width: 75,
          height: 10,
          originX: 0.5,
          originY: 1,
          x: this.x,
          y: this.y,
          zindex: 4,
        }),

        ring_bottom: new CanvasObject(this.renderer, {
          sprite: 'bird-ghost.png',
          spriteRect: { x: 110, y: 100, width: 75, height: 11 },
          width: 75,
          height: 11,
          originX: 0.5,
          originY: 0,
          x: this.x,
          y: this.y,
          zindex: 6,
        }),

        body: new CanvasObject(this.renderer, {
          sprite: 'bird-ghost.png',
          spriteRect: { x: 0, y: 0, width: 100, height: 120 },
          width: 100,
          height: 120,
          originX: 0.5,
          originY: 0.5,
          scaleX: 0,
          scaleY: 0,
          zindex: 5,
        }),

        wing_right: new CanvasObject(this.renderer, {
          sprite: 'bird-ghost.png',
          spriteRect: { x: 110, y: 0, width: 100, height: 72 },
          width: 100,
          height: 72,
          originX: 1,
          originY: 1,
          zindex: -1,
          scaleX: -1.25,
          scaleY: 1.25,
          opacity: 0.95,
          zindex: 4,
        }),

        wing_left: new CanvasObject(this.renderer, {
          sprite: 'bird-ghost.png',
          spriteRect: { x: 110, y: 0, width: 100, height: 72 },
          width: 100,
          height: 72,
          originX: 1,
          originY: 1,
          zindex: -1,
          scaleX: 1.25,
          scaleY: 1.25,
          opacity: 0.95,
          zindex: 4,
        }),
      };

      this.timeout = setTimeout(function flap() {
        this.vy = -8;
        this.timeout = setTimeout(flap.bind(this), 1500);
      }.bind(this), 700);

      this.anatomy.body.animate({
        scaleX: {
          to: 1,
          duration: 600,
          easing: 'easeOutElastic',
        },
        scaleY: {
          to: 1,
          duration: 400,
          easing: 'easeOutElastic',
        }
      });

      this.anatomy.wing_right.animate({
        scaleX: {
          from: 0,
          to: this.anatomy.wing_right.options.scaleX,
          easing: 'easeInOutCubic',
          duration: 600,
          delay: 300
        },
        scaleY: {
          from: 0,
          to: this.anatomy.wing_right.options.scaleY,
          easing: 'easeInOutCubic',
          duration: 600,
          delay: 300
        }
      });

      this.anatomy.wing_left.animate({
        scaleX: {
          from: 0,
          to: this.anatomy.wing_left.options.scaleX,
          easing: 'easeInOutCubic',
          duration: 600,
          delay: 300
        },
        scaleY: {
          from: 0,
          to: this.anatomy.wing_left.options.scaleY,
          easing: 'easeInOutCubic',
          duration: 600,
          delay: 300
        }
      });
    },
    {
      defaults: Object.assign({}, cloneObject(CanvasObject.prototype.defaults), {
        anatomy: {},
        width: 200,
        height: 200,
        originX: 0.5,
        originY: 0.5,
        vy: -1,
        oy: 0,
      }),

      update: function () {
        this.oy = this.y;

        this.y += this.vy;
        this.vy += 0.1;

        this.anatomy.body.scaleY += (1 - 0.035 * (this.y - this.oy) - this.anatomy.body.scaleY) / 5;
        this.anatomy.body.scaleX += (1 + (1 - this.anatomy.body.scaleY) - this.anatomy.body.scaleX) / 5;

        this.anatomy.ring_top.x = this.x;
        this.anatomy.ring_top.y += (this.y - 90 - 0.25 * (this.y - this.oy) - this.anatomy.ring_top.y) / 5;

        this.anatomy.ring_bottom.x = this.x;
        this.anatomy.ring_bottom.y = this.anatomy.ring_top.y;

        this.anatomy.body.x = this.x;
        this.anatomy.body.y = this.y;

        this.anatomy.wing_right.x = this.x - 10;
        this.anatomy.wing_right.y = this.y - 20;
        this.anatomy.wing_right.rotation += (Math.max(-30, -17 * (this.y - this.oy)) - this.anatomy.wing_right.rotation) / 5;

        this.anatomy.wing_left.x = this.x + 10;
        this.anatomy.wing_left.y = this.y - 20;
        this.anatomy.wing_left.rotation += (Math.min(30, 17 * (this.y - this.oy)) - this.anatomy.wing_left.rotation) / 5;

        if (this.y < -this.height) {
          this.destroy();
        }

        CanvasObject.prototype.update.call(this);
      },

      destroy: function () {
        CanvasObject.prototype.destroy.call(this);

        Object.keys(this.anatomy).forEach(function (part) {
          this.anatomy[part].destroy();
        }.bind(this));

        clearTimeout(this.timeout);
      }
    },
    CanvasObject
  );

  var DeadFeather = createClass(
    function (renderer, options) {
      this.dvx = rand(0.1, 0.3);
      this.dvy = rand(0.09, 0.18);
      this.maxVY = rand(1.5, 2.5);
      this.rotation = rand(360);
      this.dr = rand(180, 360);
      this.ddr = rand(0.9, 0.98);
      this.t = rand(360);
      this.wt = 0.04;
      this.amplitude = rand(10, 20);

      this.spriteRect.y = rand(1) > 0.5 ? 0 : 47;
    },
    {
      defaults: Object.assign({}, cloneObject(CanvasObject.prototype.defaults), {
        sprite: 'bird-sprite.png',
        spriteRect: { x: 160, y: 0, width: 40, height: 47 },
        width: 40,
        height: 47,
        originX: 0.5,
        originY: 0.5,
        zindex: 1,
        vx: 0,
        vy: 0,
      }),

      update: function () {
        this.t += this.wt;

        this.x += this.vx + 0.3 * this.amplitude * Math.sin(this.t);
        this.y += this.vy;

        this.vx *= this.dvx;
        this.vy = Math.min(this.maxVY, this.vy + this.dvy);

        this.rotation = this.amplitude * Math.cos(this.t) - 135 + this.dr;
        this.dr *= this.ddr;

        if (this.y > this.canvas.height + this.height) {
          this.destroy();
        }

        CanvasObject.prototype.update.call(this);
      }
    },
    CanvasObject
  );

  /* ============================================ */
  /* POOF
  /* ============================================ */

  var PoofParticle = createClass(
    function (renderer, options) {
      // constructor
    },
    {
      defaults: Object.assign({}, cloneObject(CanvasObject.prototype.defaults), {
        radius: 20,
        lightColor: '#f0f0f0',
        shadeColor: '#d9d9d9',
      }),

      draw: function () {
        var shadeColor = getRGB(this.shadeColor);

        this.context.beginPath();
        this.context.arc(0, 0, this.radius, 0, 2 * Math.PI, true);
        this.context.fillStyle = 'rgba(' + shadeColor.red + ', ' + shadeColor.green + ', ' + shadeColor.blue + ', ' + this.opacity + ')';
        this.context.fill();

        var lightColor = getRGB(this.lightColor);

        this.context.beginPath();
        this.context.arc(0, -0.2 * this.radius, 0.8 * this.radius, 0, 2 * Math.PI, true);
        this.context.fillStyle = 'rgba(' + lightColor.red + ', ' + lightColor.green + ', ' + lightColor.blue + ', ' + this.opacity + ')';
        this.context.fill();
      }
    },
    CanvasObject
  );

  var Poof = createClass(
    function (renderer, options) {
      this.particles = [];

      this.blast = new PoofParticle(this.renderer, {
        x: this.x,
        y: this.y,
        radius: 0,
      });

      for (var i = 0; i < 50; i++) {
        this.particles.push(new PoofParticle(this.renderer, {
          x: this.x + rand(-30, 30),
          y: this.y + rand(-30, 30),
          radius: rand(10, 30),
          vx: rand(-10, 10),
          vy: rand(-2, 5),
          vya: rand(0.1, 0.25),
          decay: rand(0.5, 0.65),
          amplitude: 0,
          t: rand(2),
          dt: rand(-0.02, 0.02),
          zindex: this.zindex
        }));
      }
    },
    {
      defaults: Object.assign({}, cloneObject(CanvasObject.prototype.defaults), {
        blastSize: 80,
      }),

      update: function () {
        this.blastSize += 3;
        this.blast.radius += (this.blastSize - this.blast.radius) / 2;
        this.blast.opacity -= 0.06;

        if (this.blast.radius > 0.55 * this.blastSize) {
          this.particles.forEach(function (particle, i) {
            particle.t += particle.dt;
            particle.amplitude += 3 * particle.dt;

            particle.x += particle.vx + particle.amplitude * Math.sin(particle.t);
            particle.y += particle.vy;

            particle.vx *= 0.92;
            particle.vy -= particle.vya;

            particle.radius -= particle.decay;

            if (particle.radius <= 0) {
              particle.destroy();
              this.particles.splice(i, 1);
            }
          }.bind(this));
        }

        if (this.particles.length === 0) {
          this.destroy();
          this.blast.destroy();
        }
      }
    },
    CanvasObject
  );

  /* ============================================ */
  /* CLOUD
  /* ============================================ */

  var Cloud = createClass(
    function (renderer, options) {
      // constructor
    },
    {
      defaults: Object.assign({}, cloneObject(CanvasObject.prototype.defaults), {
        sprite: 'clouds.png',
        width: 280,
        height: 140,
        originX: 0.5,
        originY: 0.5,
        spriteRect: { x: 0, y: 0, width: 280, height: 140 },
        shape: 0,
        t: rand(10),
      }),

      update: function () {
        this.t += 0.05;

        this.scaleX = this.depth * (1 + 0.08 * Math.sin(this.t));
        this.scaleY = this.depth + 0.75 * (this.depth - this.scaleX);
        this.opacity = 1.5 * this.depth;

        this.spriteRect.y = this.shape * this.spriteRect.height;

        CanvasObject.prototype.update.call(this);
      },
    },
    CanvasObject
  );

  /* ============================================ */
  /* PIPE
  /* ============================================ */

  var Pipe = createClass(
    function (renderer, options) {
      if (this.placement === 'top') {
        this.sprite = 'pipes-top.png';
      }
    },
    {
      defaults: Object.assign({}, cloneObject(CanvasObject.prototype.defaults), {
        sprite: 'pipes-bottom.png',
        width: 280,
        height: 1102,
        originX: 0.5,
        spriteRect: { x: 0, y: 0, width: 280, height: 1102 },
        placement: 'bottom',
        shape: 0,
      }),

      update: function () {
        this.spriteRect.x = this.shape * this.spriteRect.width;
        CanvasObject.prototype.update.call(this);
      }
    },
    CanvasObject
  );

  /* ============================================ */
  /* WIRES
  /* ============================================ */

  var Wires = createClass(
    function (renderer, options) {
      if (this.placement === 'top') {
        this.sprite = 'wires-top.png';
      }

      this.tx = 0;
      this.ty = 0;
    },
    {
      defaults: Object.assign({}, cloneObject(CanvasObject.prototype.defaults), {
        sprite: 'wires-bottom.png',
        width: 280,
        height: 1102,
        originX: 0.5,
        spriteRect: { x: 0, y: 0, width: 280, height: 1102 },
        placement: 'bottom',
        shape: 0,
        zap: false,
      }),

      update: function () {
        this.spriteRect.x = this.shape * (4 * this.spriteRect.width);

        if (this.zap) {
          this.tx += (rand(-0.03, 0.03) - this.tx) / 3;
          this.ty += (rand(-0.0015, 0.0025) - this.ty) / 3;
          this.spriteRect.x = this.shape * (4 * this.spriteRect.width) + irand(1, 3) * this.spriteRect.width;
        } else {
          this.tx += (0 - this.tx) / 21;
          this.ty += (0 - this.ty) / 21;
        }

        this.scaleX = 1 + this.tx;
        this.scaleY = 1 + this.ty;

        CanvasObject.prototype.update.call(this);
      },
    },
    CanvasObject
  );

  /* ============================================ */
  /* GAME
  /* ============================================ */

  var Game = createClass(
    function (renderer) {
      this.renderer = renderer;
      this.canvas = this.renderer.canvas;
      this.context = this.renderer.context;

      this.bestScore = localStorage.getItem('fb_score') || 0;

      this.__updateEventListener = this.update.bind(this);
      this.__keyDownEventListener = this.keydown.bind(this);
      this.__keyUpEventListener = this.keyup.bind(this);
      this.__mouseDownEventListener = this.mousedown.bind(this);

      this.renderer.on('update', this.__updateEventListener);

      window.addEventListener('keydown', this.__keyDownEventListener);
      window.addEventListener('keyup', this.__keyUpEventListener);
      window.addEventListener(isTouch() ? 'touchstart' : 'mousedown', this.__mouseDownEventListener);

      this.reset();
    },
    {
      _started: false,
      _paused: false,
      _ended: false,
      _score: 0,
      _bestScore: 0,

      speed: 6,
      minSpeed: 6,
      maxSpeed: 6.7,
      speedStep: 0.04,

      pipes: {},
      pipeID: 0,

      clouds: {},
      cloudID: 0,

      set started(v) {
        this._started = v;
        document.body.classList[v ? 'add' : 'remove']('is-started');
      },

      get started() {
        return this._started;
      },

      set paused(v) {
        this._paused = v;
        document.body.classList[v ? 'add' : 'remove']('is-paused');
      },

      get paused() {
        return this._paused;
      },

      set ended(v) {
        this._ended = v;
        document.body.classList[v ? 'add' : 'remove']('is-ended');
      },

      get ended() {
        return this._ended;
      },

      set score(v) {
        this._score = v;
        score.innerHTML = this._score;
      },

      get score() {
        return this._score;
      },

      set bestScore(v) {
        this._bestScore = v;
        bestscore.innerHTML = this._bestScore;
      },

      get bestScore() {
        return this._bestScore;
      },

      reset: function () {
        // reset state
        this.started = false;
        this.paused = false;
        this.ended = false;

        // reset speed
        this.speed = this.minSpeed;

        // reset score
        this.score = 0;

        // reset pipes maker
        this.pipeID = 0;

        Object.keys(this.pipes).forEach(function (pipeID) {
          this.destroyPipe(pipeID);
        }.bind(this));

        this.timeToNextPipe = 200;

        // reset clouds maker
        this.cloudID = 0;

        Object.keys(this.clouds).forEach(function (cloudID) {
          this.destroyCloud(cloudID);
        }.bind(this));

        this.timeToNextCloud = 0;

        for (var i = 0; i < irand(5, 8); i++) {
          this.createCloud(rand(this.canvas.width), rand(this.canvas.height));
        }

        // reset bird reference
        if (this.bird) {
          this.bird.destroy();
        }

        if (this.birdGhost) {
          this.birdGhost.destroy();
        }

        if (this.deadFeathers) {
          this.deadFeathers.forEach(function (deadFeather) {
            deadFeather.destroy();
          });
        }

        this.bird = new Bird(this.renderer, {
          x: 0.2 * this.canvas.width,
          y: -200,
        });

        this.blinkCounter = -1;
        this.lookCounter = -1;
      },

      start: function () {
        this.started = true;
      },

      pause: function () {
        if (this.ended || !this.started) {
          return;
        }

        this.paused = true;
        this.renderer.pause();
      },

      resume: function () {
        if (this.ended) {
          return;
        }

        this.paused = false;
        this.renderer.resume();
      },

      end: function () {
        if (this.ended) {
          return;
        }

        // end the game
        this.ended = true;

        // destroy bird reference
        this.bird.destroy();

        // delay ability to restart the game
        setTimeout(function () {
          this.canRestart = true;
        }.bind(this), 3000);
      },

      update: function () {
        if (this.paused) {
          return;
        }

        // zero speed if the game has ended
        if (this.ended) {
          this.speed = 0;
        }

        // keep flying until the game starts
        if (!this.started && !this.ended) {
          if (this.bird.y > 0.55 * this.canvas.height) {
            this.bird.flap(16);
          }
        }

        // blink and look around
        if (this.blinkCounter <= 0) {
          this.blinkCounter = irand(10, 300);
          this.bird.blink();
        } else {
          this.blinkCounter--;
        }

        if (this.started && this.score > 0) {
          if (this.lookCounter <= 0) {
            var v = rand(10);

            // don't let the bird stare at the screen two times in a row (it's weird)
            if (v <= 1.5 && this.eyeTarget == 'screen') {
              v += 1.5;
            }

            if (v > 1.5) {
              var pipeIDs = Object.keys(this.pipes);
              var randomPipeID = irand(pipeIDs.length - 1);
              this.eyeTarget = this.pipes[pipeIDs[randomPipeID]];
            } else {
              this.bird.lookAt(this.bird.x, this.bird.y);
              this.eyeTarget = 'screen';
            }

            this.lookCounter = irand(50, 300);
          } else {
            this.lookCounter--;
          }

          if (this.eyeTarget instanceof Pipe && !this.eyeTarget.destroyed) {
            var tx = this.eyeTarget.x;
            var ty = this.eyeTarget.y;

            if (this.eyeTarget.placement === 'bottom') {
              ty -= this.eyeTarget.height;
            } else {
              ty += this.eyeTarget.height;
            }

            this.bird.lookAt(tx, ty);
          } else
            if (this.eyeTarget !== 'screen') {
              this.lookCounter = 0;
            }
        }

        // don't let the bird leave the viewport
        if (this.started) {
          if (this.bird.y < 0.5 * this.bird.height) {
            this.bird.y = 0.5 * this.bird.height;
            this.bird.vy = 5;
          }

          if (this.bird.y > this.canvas.height - 0.5 * this.bird.height) {
            this.bird.y = this.canvas.height - 0.5 * this.bird.height;
            this.bird.vy = -20;
          }
        }

        // create clouds
        if (this.timeToNextCloud <= 0) {
          if (Object.keys(this.clouds).length < 8) {
            this.timeToNextCloud = irand(70, 100);
            this.createCloud();
          }
        } else {
          this.timeToNextCloud--;
        }

        // move clouds
        Object.keys(this.clouds).forEach(function (cloudID) {
          var cloud = this.clouds[cloudID];

          cloud.x -= 0.5 * this.speed;

          if (cloud.x < -0.5 * cloud.width) {
            this.destroyCloud(cloudID);
          }
        }.bind(this));

        // create pipes
        if (this.started) {
          if (this.timeToNextPipe <= 0) {
            this.timeToNextPipe = irand(100, 130);
            this.createPipes();
          } else {
            this.timeToNextPipe--;
          }
        }

        // move pipes
        Object.keys(this.pipes).forEach(function (pipeID) {
          var pipe = this.pipes[pipeID];

          pipe.x -= this.speed;
          pipe.wires.x = pipe.x;

          if (pipe.y <= 0 && pipe.x + 0.5 * pipe.width < this.bird.x && !pipe.passed) {
            pipe.passed = true;

            if (!this.ended) {
              this.score += 1;

              if (this.score > this.bestScore) {
                this.bestScore = this.score;
                localStorage.setItem('fb_score', this.bestScore);
              }

              // increment speed
              this.speed = Math.min(this.maxSpeed, this.speed + this.speedStep);
            }
          }

          if (pipe.x < -0.5 * pipe.width) {
            this.destroyPipe(pipeID);
          }

          if (!this.ended && this.birdHitsPipe(pipe)) {
            this.end();

            pipe.wires.zap = true;

            this.birdGhost = new ShockedBird(this.renderer, {
              x: this.bird.x,
              y: this.bird.y,
            });

            setTimeout(function () {
              pipe.wires.zap = false;

              new Poof(this.renderer, {
                x: this.birdGhost.x,
                y: this.birdGhost.y,
                zindex: 10,
              });

              this.deadFeathers = [];

              var deadFeathersCount = irand(8, 15);

              for (var i = 0; i < deadFeathersCount; i++) {
                this.deadFeathers.push(new DeadFeather(this.renderer, {
                  x: this.birdGhost.x,
                  y: this.birdGhost.y,
                  vx: rand(15, 40) * Math.cos((360 / deadFeathersCount) * (i + 1) * Math.PI / 180),
                  vy: rand(8, 15) * Math.sin((360 / deadFeathersCount) * (i + 1) * Math.PI / 180),
                  zindex: rand(1) > 0.5 ? 10 : 0,
                }));
              }

              this.birdGhost.destroy();

              this.birdGhost = new DeadBird(this.renderer, {
                x: this.bird.x + 15,
                y: this.bird.y + 10,
              });
            }.bind(this), 1000);

            navigator.vibrate && navigator.vibrate(1000);

            var killCount = +localStorage.getItem('fb_killCount') || 0;
            localStorage.setItem('fb_killCount', killCount + 1);
            
            if (killCount + 1 >= 3) {
              killcount.innerHTML = killCount + 1;
            }
          }
        }.bind(this));
      },

      birdHitsPipe: function (pipe) {
        // bird bounds
        var birdBounds = this.bird.getBounds();

        // head and front
        var birdBoundsA = cloneObject(birdBounds);
        birdBoundsA.left += 0.5 * this.bird.width;
        birdBoundsA.right -= 0.1 * this.bird.width;
        birdBoundsA.bottom -= 0.25 * this.bird.width;

        // butt and belly
        var birdBoundsB = cloneObject(birdBounds);
        birdBoundsB.right -= 0.15 * this.bird.width;
        birdBoundsB.left += 0.05 * this.bird.width;
        birdBoundsB.top += 0.5 * this.bird.height;
        birdBoundsB.bottom -= 0.05 * this.bird.height;

        // beak
        var birdBoundsC = cloneObject(birdBounds);
        birdBoundsC.right += 0.3 * this.bird.width;
        birdBoundsC.left = birdBoundsC.right - 0.3 * this.bird.width;
        birdBoundsC.top += 0.3 * this.bird.height;
        birdBoundsC.bottom = birdBoundsC.top + 0.25 * this.bird.height;

        // pipe bounds
        var pipeBounds = pipe.getBounds();
        pipeBounds.right -= pipe.width * 0.1;
        pipeBounds.left += pipe.width * 0.15;

        return aabb(birdBoundsA, pipeBounds) || aabb(birdBoundsB, pipeBounds) || aabb(birdBoundsC, pipeBounds);
      },

      createCloud: function (x, y) {
        if (!this.paused && !this.ended) {
          var cloud = new Cloud(this.renderer, {
            x: typeof x !== 'undefined' ? x : this.canvas.width + Cloud.prototype.defaults.width,
            y: typeof y !== 'undefined' ? y : rand(this.canvas.height),
            depth: rand(0.25, 1),
            shape: irand(3),
            zindex: -2
          });

          this.clouds[++this.cloudID] = cloud;
        }
      },

      destroyCloud: function (cloudID) {
        if (this.clouds[cloudID]) {
          this.clouds[cloudID].destroy();
          delete this.clouds[cloudID];
        }
      },

      createPipes: function () {
        if (!this.paused && !this.ended) {
          var gap = 440 + 50 * (this.maxSpeed - this.speed) - 50 * (this.speed - this.minSpeed);
          var position = rand(0.25, 0.75) * this.canvas.height;

          // create top pipe
          var topPipe = new Pipe(this.renderer, {
            x: this.canvas.width + Pipe.prototype.defaults.width,
            y: position - Pipe.prototype.defaults.height - 0.5 * gap,
            originY: 0,
            placement: 'top',
            shape: irand(3),
          });
          this.pipes[++this.pipeID] = topPipe;

          topPipe.wires = new Wires(this.renderer, {
            x: topPipe.x,
            y: topPipe.y,
            originY: 0,
            placement: 'top',
            shape: irand(1),
          });

          // create bottom pipe
          var bottomPipe = new Pipe(this.renderer, {
            x: this.canvas.width + Pipe.prototype.defaults.width,
            y: position + Pipe.prototype.defaults.height + 0.5 * gap,
            originY: 1,
            placement: 'bottom',
            shape: irand(3),
          });
          this.pipes[++this.pipeID] = bottomPipe;

          bottomPipe.wires = new Wires(this.renderer, {
            x: bottomPipe.x,
            y: bottomPipe.y,
            originY: 1,
            placement: 'bottom',
            shape: irand(1),
          });
        }
      },

      destroyPipe: function (pipeID) {
        if (this.pipes[pipeID]) {
          this.pipes[pipeID].wires.destroy();
          this.pipes[pipeID].destroy();
          delete this.pipes[pipeID];
        }
      },

      destroy: function () {
        this.end();

        Object.keys(this.pipes).forEach(function (pipeID) {
          this.destroyPipe(pipeID);
        }.bind(this));

        Object.keys(this.clouds).forEach(function (cloudID) {
          this.destroyCloud(cloudID);
        }.bind(this));

        this.renderer.off('update', this.__updateEventListener);

        window.removeEventListener('keydown', this.__keyDownEventListener);
        window.removeEventListener('keyup', this.__keyUpEventListener);
        window.removeEventListener(isTouch() ? 'touchstart' : 'mousedown', this.__mouseDownEventListener);
      },

      mousedown: function (e) {
        this.useAction();
      },

      keydown: function (e) {
        if (e.keyCode === 27) {
          /// escape
          if (this.paused) {
            this.resume();
          } else {
            this.pause();
          }
        } else {
          if (!this.keyDownTimeout) {
            this.useAction();

            this.keyDownTimeout = setTimeout(function () {
              delete this.keyDownTimeout;
            }.bind(this), 150);
          }
        }
      },

      keyup: function (e) {
        // keyup
      },

      useAction: function () {
        if (this.ended) {
          if (this.canRestart) {
            this.canRestart = false;
            this.reset();
          }
        } else {
          if (!this.started) {
            this.start();
          }

          if (this.paused) {
            this.resume();
          }

          this.bird.flap();
        }
      }
    }
  );

  /* ============================================ */
  /* INITIALIZE
  /* ============================================ */

  if (isTouch()) {
    document.body.classList.add('is-touch');
  }

  function preloadImages(images, onComplete, onProgress) {
    var loaded = 0;

    preloadImage(images[loaded]);

    function preloadImage(src) {
      if (images.length === loaded) {
        return onComplete && onComplete();
      }

      var img = new Image();

      img.onload = function () {
        loaded++;
        onProgress && onProgress(loaded / images.length);
        preloadImage(images[loaded]);
      }

      img.src = src;

      img.style.visibility = 'hidden';
      img.style.width = '1px';
      img.style.height = '1px';
      img.style.position = 'fixed';

      document.body.appendChild(img);
    }
  }

  preloadImages([
    'bird-sprite.png',
    'bird-shocked.png',
    'bird-ghost.png',
    'pipes-top.png',
    'pipes-bottom.png',
    'wires-top.png',
    'wires-bottom.png',
    'clouds.png'
  ], function () {
    document.body.classList.add('is-loaded');

    var game = new Game(renderer);

    window.addEventListener('blur', function () {
      game.pause();
    });
  }, function (v) {
    preloader.innerHTML = Math.ceil(v * 100) + '%';
  });

}());