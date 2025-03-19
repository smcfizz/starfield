let color = one.color;
let stats = new Stats();

class Starfield {
    // TODO support custom parameters
    // TODO support transitioning to hyperspace animation
    // TODO support mouse parallax
    constructor(props = {}) {
        this.state = {
            init: true, // Init?
            canvas: false, // Canvas?
            start: false, // Start animation?
            stop: false, // Stop animation?
            destroy: false,
            reset: false, // Reset animation?
            running: false
        };
        this.debug = false;
        this.clickToWarp = false;
        this.quantity = 512;
        this.mouse = {
            x: 0,
            y: 0
        };
        this.cursor = {
            x: 0,
            y: 0
        };
        this.easing = 1;
        this.hyperspace = false;
        this.warpFactor = 10;
        this.speed = 1;
        this.opacity = 0.1;
        this.starColor = 'rgba(255,255,255,1)';
        this.bgColor = 'rgba(0,0,0,1)';
        this.colors = {
            fill: this.hyperspace ? color(this.bgColor).alpha(this.opacity).cssa() : this.bgColor
        };
        this.compColors = {
            stars: color(this.starColor).hex(),
            bg: color(this.bgColor).hex()
        };
        this.compSpeed = {
            lyph: this.hyperspace ? (this.speed * this.warpFactor) : this.speed // light-years per hour
        };
        this.ratio = {
            computed: this.quantity / 2
        };
        this.ids = {
            cid: 'canvas-starfield',
            vid: 'viewport-' + this.state.uid
        };
        this.handleResize = null;

        // Create canvas element
        let cvs = document.createElement('canvas');
        cvs.id = this.ids.cid;
        document.body.appendChild(cvs);

        // Initialize and begin animation
        this.ready();
    }
    
    init() {
        this.state.init = true
        this.state.canvas = true
        this.state.start = true
        this.state.running = false
        this.state.stop = false
        this.state.reset = false
        // Correct to reset mouse and cursor?
        this.mouse = {
            x: 0,
            y: 0
        };
        this.cursor = {
            x: 0,
            y: 0
        };
        this.starz()
        this.listeners()

        if (this.debug) {
            stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
            document.body.appendChild(stats.dom)
            stats.dom.style.top = '20px'
            stats.dom.style.right = '20px'
            stats.dom.style.left = 'auto'
        }
    }

    starz() {
        let self = this

        let sd = {
            // Set up viewport data
            w: 0,
            h: 0,
            el: null,
            ctx: null,

            // Canvas measurements
            cw: 0,
            ch: 0,

            // Axes
            x: 0,
            y: 0,
            z: 0,

            // Star data
            star: {
                // Etc
                colorRatio: 0,

                // The stars
                arr: []
            },

            prevTime: 0
        }

        // DOM interactions
        let dom = {
            measure: {
            viewport () {
                fastdom.measure(function () {
                    sd.w = window.innerWidth
                    sd.h = window.innerHeight

                    // Set up axes
                    sd.x = Math.round(sd.w / 2)
                    sd.y = Math.round(sd.h / 2)
                    sd.z = (sd.w + sd.h) / 2

                    sd.star.colorRatio = 1 / sd.z

                    if (self.resizing || self.cursor.x === 0 || self.cursor.y === 0) {
                        // Initialize cursor position
                        self.cursor.x = sd.x
                        self.cursor.y = sd.y
                    }

                    if (self.mouse.x === 0 || self.mouse.y === 0) {
                        // Initialize mouse position
                        self.mouse.x = self.cursor.x - sd.x
                        self.mouse.y = self.cursor.y - sd.y
                    }
                })

                fastdom.catch = function () {
                    return
                }
            }
            }
        }

        // Star functions
        let sf = {
            /**
             * Set up the viewport
             */
            viewport () {
                dom.measure.viewport()
            },

            /**
             * Set up the canvas
             */
            canvas () {
                dom.measure.viewport()

                // Set up context
                let c = document.getElementById(self.ids.cid)
                sd.ctx = c.getContext('2d')

                // Adjust canvas dimensions
                sd.ctx.canvas.width = sd.w
                sd.ctx.canvas.height = sd.h

                // Set up canvas colors
                sd.ctx.fillStyle = self.colors.fill
                sd.ctx.strokeStyle = self.starColor
            },

            /**
             * Initialize the array of stars and their positions, if it hasn't been done already
             */
            bigBang () {
                let starinited = sd.star.arr.length === self.quantity
                let starrandomized = false

                if (sd.star.arr.length > 0) {
                    if (sd.star.arr[0][0] !== 0 || sd.star.arr[0][0] !== Infinity) {
                    starrandomized = true
                    }
                }

                let boom = function () {
                    sd.star.arr = new Array(self.quantity)

                    // Set up the star array
                    for (var i = 0; i < self.quantity; i++) {
                        sd.star.arr[i] = new Array(8)

                        // Give each star random positions on the canvas
                        sd.star.arr[i][0] = Math.random() * sd.w * 2 - sd.x * 2
                        sd.star.arr[i][1] = Math.random() * sd.h * 2 - sd.y * 2
                        sd.star.arr[i][2] = Math.round(Math.random() * sd.z)
                        sd.star.arr[i][3] = 0
                        sd.star.arr[i][4] = 0
                        sd.star.arr[i][5] = 0 // prev x
                        sd.star.arr[i][6] = 0 // prev y
                        sd.star.arr[i][7] = true // test var
                    }
                }

                if (!starinited) {
                    boom()
                } else if (starinited && !starrandomized) {
                    boom()
                }
            },

            /**
             * Updates canvas elem dimensions, adjusts star coords proportionally
             */
            resize () {
                if (self.resizing) {
                    // Save old dimensions and star positions
                    let oldStar = sd.star
                    dom.measure.viewport()

                    sd.cw = sd.ctx.canvas.width
                    sd.ch = sd.ctx.canvas.height

                    // Only resize if context width/height !== container width/height
                    if (sd.cw !== sd.w || sd.ch !== sd.h) {
                    sd.x = Math.round(sd.w / 2)
                    sd.y = Math.round(sd.h / 2)
                    sd.z = (sd.w + sd.h) / 2

                    sd.star.colorRatio = 1 / sd.z

                    // Get ratio of new dimensions to old dimensions
                    let rw = sd.w / sd.cw
                    let rh = sd.h / sd.ch

                    // Update context dimensions
                    sd.ctx.canvas.width = sd.w
                    sd.ctx.canvas.height = sd.h

                    // Recalculate star positions
                    if (!sd.star.arr.length) {
                        sf.bigBang()
                    } else {
                        for (var i = 0; i < self.quantity; i++) {
                        sd.star.arr[i]
                        sd.star.arr[i][0] = oldStar.arr[i][0] * rw
                        sd.star.arr[i][1] = oldStar.arr[i][1] * rh

                        sd.star.arr[i][3] = sd.x + (sd.star.arr[i][0] / sd.star.arr[i][2]) * self.ratio.computed
                        sd.star.arr[i][4] = sd.y + (sd.star.arr[i][1] / sd.star.arr[i][2]) * self.ratio.computed
                        }
                    }

                    // Reset canvas colors (context resets completely when resized)
                    sd.ctx.fillStyle = self.colors.fill
                    sd.ctx.strokeStyle = self.starColor

                    self.resizing = false
                    }
                } else {
                    return
                }
            },

            anim: {
                init () {
                    MainLoop
                    .setBegin(sf.anim.begin)
                    .setUpdate(sf.anim.update)
                    .setDraw(sf.anim.draw)
                    .setEnd(sf.anim.end)
                },

                /**
                 * Kick off the animation loop
                 */
                start () {
                    MainLoop.start()
                    self.resizing = true
                },

                /**
                 * Begin frame
                 */
                begin () {
                    if (self.debug) {
                        stats.begin()
                    }

                    sf.resize()

                    if (sd.prevTime === 0) {
                        sd.prevTime = Date.now()
                    }

                    self.state.running = MainLoop.isRunning()
                },

                /**
                 * Calculate the position of each star
                 */
                update () {
                    self.mouse.x = (self.cursor.x - sd.x) / self.easing
                    self.mouse.y = (self.cursor.y - sd.y) / self.easing

                    if (sd.star.arr.length > 0) {
                        for (var i = 0; i < self.quantity; i++) {
                            sd.star.arr[i][7] = true
                            sd.star.arr[i][5] = sd.star.arr[i][3]
                            sd.star.arr[i][6] = sd.star.arr[i][4]
                            sd.star.arr[i][0] += self.mouse.x >> 4

                            // X coords
                            if (sd.star.arr[i][0] > sd.x << 1) {
                                sd.star.arr[i][0] -= sd.w << 1
                                sd.star.arr[i][7] = false
                            }
                            if (sd.star.arr[i][0] < -sd.x << 1) {
                                sd.star.arr[i][0] += sd.w << 1
                                sd.star.arr[i][7] = false
                            }

                            // Y coords
                            sd.star.arr[i][1] += self.mouse.y >> 4
                            if (sd.star.arr[i][1] > sd.y << 1) {
                                sd.star.arr[i][1] -= sd.h << 1
                                sd.star.arr[i][7] = false
                            }
                            if (sd.star.arr[i][1] < -sd.y << 1) {
                                sd.star.arr[i][1] += sd.h << 1
                                sd.star.arr[i][7] = false
                            }

                            // Z coords
                            sd.star.arr[i][2] -= self.compSpeed.lyph
                            if (sd.star.arr[i][2] > sd.z) {
                                sd.star.arr[i][2] -= sd.z
                                sd.star.arr[i][7] = false
                            }
                            if (sd.star.arr[i][2] < 0) {
                                sd.star.arr[i][2] += sd.z
                                sd.star.arr[i][7] = false
                            }

                            sd.star.arr[i][3] = sd.x + (sd.star.arr[i][0] / sd.star.arr[i][2]) * self.ratio.computed
                            sd.star.arr[i][4] = sd.y + (sd.star.arr[i][1] / sd.star.arr[i][2]) * self.ratio.computed
                        }
                    }
                },

                draw () {
                    sd.ctx.fillStyle = self.colors.fill
                    sd.ctx.fillRect(0, 0, sd.w, sd.h)
                    sd.ctx.strokeStyle = self.starColor

                    if (sd.star.arr.length) {
                    for (var i = 0; i < self.quantity; i++) {
                        if (sd.star.arr[i][5] > 0 &&
                        sd.star.arr[i][5] < sd.w &&
                        sd.star.arr[i][6] > 0 &&
                        sd.star.arr[i][6] < sd.h &&
                        sd.star.arr[i][7]) {
                            sd.ctx.lineWidth = (1 - sd.star.colorRatio * sd.star.arr[i][2]) * 2
                            sd.ctx.beginPath()
                            sd.ctx.moveTo(sd.star.arr[i][5], sd.star.arr[i][6])
                            sd.ctx.lineTo(sd.star.arr[i][3], sd.star.arr[i][4])
                            sd.ctx.stroke()
                            sd.ctx.closePath()
                        }
                    }
                    }
                },

                stop () {
                    MainLoop.stop()
                    self.state.running = MainLoop.isRunning()
                },

                end (fps, panic) {
                    if (self.debug) {
                        stats.end()
                    }

                    // Check FPS every second. If it drops too low, reduce the number of stars
                    // If the stars are too few (it looks fugly), stop the animation
                    let delta = Date.now() - sd.prevTime
                    if (fps < 24 && delta >= 1000) {
                        self.stop()
                        MainLoop.resetFrameDelta()
                        self.quantity = self.quantity - 25
                        self.reset()

                        if (self.quantity < 64) {
                            self.stop()
                        }

                        sd.prevTime = 0
                    }

                    if (panic) {
                        MainLoop.resetFrameDelta()
                    }
                },

                /**
                 * Reset the whole kit and kaboodle
                 */
                reset () {
                    self.stop()

                    // Reset dimensions
                    sf.resetDims()

                    self.init()
                },

                destroy () {
                    self.stop()

                    sf.resetDims()

                    sf = null
                    sd = null
                }
            },

            resetDims () {
                sd.x = 0
                sd.y = 0
                sd.z = 0
                sd.w = 0
                sd.h = 0
                sd.cw = 0
                sd.ch = 0
            }
        }

        // Animation/init logic and state management
        // Check for destroy, stop, and reset first
        if (self.state.destroy) {
            self.state.destroy = false
            sf.anim.destroy()
        }

        if (self.state.stop) {
            self.state.stop = false
            sf.anim.stop()
        }

        if (self.state.reset) {
            self.state.reset = false
            sf.anim.reset()
        }

        // Initialization
        if (self.state.init) {
            self.state.init = false
            sf.viewport()
            sf.anim.init()
        }

        // Set up the canvas if it isn't already
        if (self.state.canvas) {
            self.state.canvas = false
            sf.canvas()
        }

        // Animation start
        if (self.state.start) {
            self.state.start = false
            sf.anim.start()
        }

        self.listeners();
    }

    // Animation controls
    reset () {
        this.state.reset = true
        this.starz()
    }

    stop () {
        this.state.stop = true
        this.starz()
    }

    start () {
        this.state.start = true
        this.starz()
    }

    listeners() {
        /**
         * Add window resize listener
         */
        // Prevent multiple listeners from being registered and impacting performance
        if (this.handleResize) {
            window.visualViewport.removeEventListener('resize', this.handleResize)
        }
        // Optional debounce support
        this.handleResize = this.debounce((event) => this.resizeHandler(this, event), 0);
        window.visualViewport.addEventListener('resize', this.handleResize)
        window.visualViewport.addEventListener("beforeunload", () => {
            window.removeEventListener("resize", this.resizedHandler);
        });

        /**
         * Add/remove mouse move listeners
         */
        // if (this.mouseAdjust) {
        //     window.addEventListener('mousemove', this.mouseHandler)
        // } else {
        //     window.removeEventListener('mousemove', this.mouseHandler)
        // }

        /**
         * Add/remove tilt listeners
         */
        // if (this.tiltAdjust) {
        //     window.addEventListener('deviceorientation', this.tiltHandler)
        // } else {
        //     window.removeEventListener('deviceorientation', this.tiltHandler)
        // }

        /**
         * Add/remove click listeners
         */
        if (this.clickToWarp) {
            window.addEventListener('mousedown', this.clickHandler)
            window.addEventListener('mouseup', this.clickHandler)
        } else {
            window.removeEventListener('mousedown', this.clickHandler)
            window.removeEventListener('mouseup', this.clickHandler)
        }
    }

    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    resizeHandler(self, event) {
        self.resizing = true
    }

    /**
     * Adds mouse coords to model on move event
     * @param  {event} event mouse move event
     * @return {none}
     */
    mouseHandler (event) {
        let self = this
        let el = this.$el.parentNode
  
        fastdom.measure(function () {
          self.cursor.x = event.pageX || event.clientX + el.scrollLeft - el.clientLeft
          self.cursor.y = event.pageY || event.clientY + el.scrollTop - el.clientTop
        })
    }

    /**
     * Toggles hyperspace on event
     * @param  {event} event Click event
     * @return {null}
     */
    clickHandler (event) {
        if (event.type === 'mousedown') {
          this.hyperspace = true
        }
  
        if (event.type === 'mouseup') {
          this.hyperspace = false
        }
    }

    ready() {
        let self = this
    
        setTimeout(function () { self.init() }, 100)
    }
}

const starfield = new Starfield({});