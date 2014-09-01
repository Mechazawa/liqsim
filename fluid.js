window.requestAnimFrame = (function(){
    return  window.requestAnimationFrame       ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            function( callback ){
                window.setTimeout(callback, 1000 / 60);
            };
})();

Array.Generate = function(val, size) {
    var x = [];
    while(x.length < size)
        x.push(val);
    return x;
};

var Mouse = {
    x: 0,
    y: 0,

    buttons : {
        left: false,
        right: false
    },

    getRelativeTo: function(element) {
        var rect = element.getBoundingClientRect();
        return {
            x: Mouse.x - rect.left,
            y: Mouse.y - rect.top
        };
    },

    init: function() {
        document.addEventListener('mousemove', function(evt){
            Mouse.x = evt.clientX;
            Mouse.y = evt.clientY;
        }, false);

        document.body.addEventListener('mousedown', function (e){
            if(e.button === 0 || e.button === 1)
                Mouse.buttons.left = true;
            else if (e.button === 2)
                Mouse.buttons.right = true;
        }, false);

        document.body.addEventListener('mouseup', function (e){
            if(e.button === 0 || e.button === 1)
                Mouse.buttons.left = false;
            else if (e.button === 2)
                Mouse.buttons.right = false;
        }, false);
    }
};



function FField(canvas, resolution, debug) {
    this.debug = debug || false;

    this.gridResolution = resolution || 128;
    this.diffusionRate = 0.0;
    this.viscocity = 0.0;
    this.force = 5.0; // scales the mouse movement that generate a force
    this.source = 300.0; // amount of density that will be deposited

    this.gridResPlus1 =  this.gridResolution + 1;
    this.gridResPlus2 = this.gridResolution + 2;
    this.bufferSize = this.gridResPlus2 * this.gridResPlus2;

    this.u = Array.Generate(0, this.bufferSize);
    this.v = Array.Generate(0, this.bufferSize);
    this.dens = Array.Generate(0, this.bufferSize);

    this.u_prev = Array.Generate(0, this.bufferSize);
    this.v_prev = Array.Generate(0, this.bufferSize);
    this.dens_prev = Array.Generate(0, this.bufferSize);

    this.fpsStack = [];
    this.mouse = {x: 0, y: 0};
    this.dt = 0.1;

    this.canvas = canvas;
    this.context = this.canvas.getContext('2d');
    this.canvas.oncontextmenu = function (e) {e.preventDefault();};
    this.cwidth = this.canvas.width; // Caching
    this.cheight = this.canvas.height; // Caching

    var self = this;
    window.requestAnimFrame(function() {self.tick();});
}

FField.prototype = {
    stop: function() {
        this.tick = function(_) { };
    },

    tick: function(_dt) {
        var now = new Date().getTime();
        this.dt = typeof _dt !== "undefined" ? _dt : 0.1;
        this.fpsStack.push(1 / this.dt);
        if(this.fpsStack.length > 50)
            this.fpsStack.shift();

        this.update();
        this.draw();

        if(this.debug) {
            var fps = this.fpsStack.reduce(function(x, y){return x + y;}, 0) / this.fpsStack.length;
            fps = Math.round(fps * 10) / 10;

            var fpsText = "FPS: " + fps;
            var mouseText = "Mouse: " +
                  "X: " + Math.floor(this.mouse.x) +
                "  Y: " + Math.floor(this.mouse.y);
            if(Mouse.buttons.left) mouseText += " L";
            if(Mouse.buttons.right) mouseText += " R";

            this.context.font = '18pt Arial';
            this.context.fillStyle = 'white';

            this.context.lineWidth = 3;
            this.context.strokeText(fpsText, 10, 25);
            this.context.strokeText(mouseText, 10, 50);
            this.context.lineWidth = 1;
            this.context.fillText(fpsText, 10, 25);
            this.context.fillText(mouseText, 10, 50);
        }

        var self = this;
        window.requestAnimFrame(function() {
            self.tick((new Date().getTime() - now) / 1000)
        });
    },

    update: function () {
        this.u_prev = Array.Generate(0, this.bufferSize);
        this.v_prev = Array.Generate(0, this.bufferSize);
        this.dens_prev = Array.Generate(0, this.bufferSize);

        this.handleInput();
        this.velocityStep();
        this.densityStep();
    },

    handleInput: function() {
        var cMouse = Mouse.getRelativeTo(this.canvas);

        // Lower boundary
        cMouse.x = Math.max(0, cMouse.x);
        cMouse.y = Math.max(0, cMouse.y);

        // Upper boundary
        cMouse.x = Math.min(this.canvas.width, cMouse.x);
        cMouse.y = Math.min(this.canvas.height, cMouse.y);

        if(this.mouse.x == 0)
            this.mouse = cMouse;

        var gridX = Math.floor((this.mouse.x / this.cwidth) * this.gridResPlus1);
        var gridY = Math.floor(((this.cheight - this.mouse.y) / this.cheight) * this.gridResPlus1); // TODO Fixme on non-square surfices

        if (!(gridX < 1 || gridX > this.gridResolution || gridY < 1 || gridY > this.gridResolution)) {
            if (Mouse.buttons.left) {
                this.u[this.IX(gridX, gridY)] = this.force * (cMouse.x - this.mouse.x);
                this.v[this.IX(gridX, gridY)] = this.force * (this.mouse.y - cMouse.y);
            }

            if (Mouse.buttons.right) {
                for(var x = 6; x >= 0; x--)
                    for(var y = 6; y >= 0; y--)
                        this.dens_prev[this.IX(gridX - x, gridY - y + 4)] = this.source;
            }
        }

        this.mouse = cMouse;
    },

    draw: function() {
        this.context.clearRect(0, 0, this.cwidth, this.cheight);
        var buffer = this.context.getImageData(0, 0, this.cwidth, this.cheight);
        var bufferData = buffer.data;
        var h = this.cwidth / this.gridResolution;

        for(var x = 0; x <= this.gridResolution; x++) {
            for(var y = 0; y <= this.gridResolution; y++) {

                var d00 = this.dens[this.IX(x, this.gridResolution - y)];
                d00 = Math.min(0xff, d00);

                for(var x2 = 0; x2 < h; x2++) {
                    for(var y2 = 0; y2 < h; y2++) {
                        var index = ((h*y + y2) * this.cwidth + (h*x + x2)) * 4;
                        bufferData[index] = d00; // RED
                        bufferData[++index] = d00; // GREEN
                        bufferData[++index] = d00; // BLUE
                        bufferData[++index] = 255; // ALPHA
                    }
                }
            }
        }

        this.context.putImageData(buffer, 0 ,0);
    },

    IX: function(x, y) {
        return this.gridResPlus2 * y + x;
    },

    setBnd: function(b, x) {
        for (var i = 1; i <= this.gridResolution; i++) {
            var z = x[this.IX(1, i)];
            var y = x[this.IX(this.gridResolution, i)];
            x[this.IX(0, i)] = b == 1 ? -z : z;
            x[this.IX(this.gridResPlus1, i)] = b == 1 ? -y : y;

            z = x[this.IX(i, 1)];
            y = x[this.IX(i, this.gridResolution)];
            x[this.IX(i, 0)] = b == 2 ? -z : z;
            x[this.IX(i, this.gridResPlus1)] = b == 2 ? -y : y;
        }

        x[this.IX(0, 0)] = 0.5 * (x[this.IX(1, 0)] + x[this.IX(0, 1)]);
        x[this.IX(0, this.gridResPlus1)] = 0.5 * (x[this.IX(1, this.gridResPlus1)] + x[this.IX(0, this.gridResolution)]);
        x[this.IX(this.gridResPlus1, 0)] = 0.5 * (x[this.IX(this.gridResolution, 0)] + x[this.IX(this.gridResPlus1, 1)]);
        x[this.IX(this.gridResPlus1, this.gridResPlus1)] = 0.5 * (x[this.IX(this.gridResolution, this.gridResPlus1)] + x[this.IX(this.gridResPlus1, this.gridResolution)]);

        return x;
    },

    linearSolve: function(b, current, previous, a, div) {
        var inverseC = 1/div;
        var locA = a;
        var locB = b;
        var pCur = current;

        var iterations = locA === 0? 1 : 20;
        for (var k = 0; k < iterations; k++)  {
            for (var x = this.gridResolution; x > 0; --x) {
                for (var y = this.gridResolution; y > 0; --y) {
                    var i = this.IX(x, y);
                    var v = previous[i];

                    if (locA != 0) {
                        var s = pCur[i - 1] +
                            pCur[i + 1] +
                            pCur[i - this.gridResPlus2] +
                            pCur[i + this.gridResPlus2];

                        v += locA * s;
                    }

                    pCur[i] = v * inverseC;
                }
            }
        }

        this.setBnd(locB, current);
    },

    advect: function(b, current, prev, u, v) {
        var i0, j0, i1, j1;
        var x, y, s0, t0, s1, t1, dt0;

        dt0 = this.dt * this.gridResolution;
        for (var i = 1; i <= this.gridResolution; i++)
        {
            for (var j = 1; j <= this.gridResolution; j++)
            {
                var ix1 = this.IX(i,j);

                x = i - dt0 * u[ix1];
                y = j - dt0 * v[ix1];

                if (x < 0.5)
                    x = 0.5;

                if (x > this.gridResolution + 0.5)
                    x = this.gridResolution + 0.5;

                i0 = Math.floor(x);
                i1 = i0 + 1;

                if (y < 0.5)
                    y = 0.5;

                if (y > this.gridResolution + 0.5)
                    y = this.gridResolution + 0.5;

                j0 = Math.floor(y);
                j1 = j0 + 1;
                s1 = x - i0;
                s0 = 1 - s1;
                t1 = y - j0;
                t0 = 1 - t1;

                current[ix1] = s0 * (t0 * prev[this.IX(i0, j0)] + t1 * prev[this.IX(i0, j1)]) +
                    s1 * (t0 * prev[this.IX(i1, j0)] + t1 * prev[this.IX(i1, j1)]);
            }
        }
        this.setBnd(b, current);
    },

    diffuse: function(b, current, prev, rate) {
        var a = this.dt * rate * this.gridResolution * this.gridResolution;
        this.linearSolve(b, current, prev, a, 1 + 4 * a);
    },

    project: function() {
        var i, j;

        for (i = 1; i <= this.gridResolution; i++)
        {
            for (j = 1; j <= this.gridResolution; j++)
            {
                this.v_prev[this.IX(i, j)] = -0.5 * (this.u[this.IX(i + 1, j)] - this.u[this.IX(i - 1, j)] + this.v[this.IX(i, j + 1)] - this.v[this.IX(i, j - 1)]) / this.gridResolution;
                this.u_prev[this.IX(i, j)] = 0;
            }
        }
        this.setBnd(0, this.v_prev);
        this.setBnd(0, this.u_prev);
    
        this.linearSolve(0, this.u_prev, this.v_prev, 1, 4);
    
        for (i = 1; i <= this.gridResolution; i++)
        {
            for (j = 1; j <= this.gridResolution; j++)
            {
                this.u[this.IX(i, j)] -= 0.5 * this.gridResolution * (this.u_prev[this.IX(i + 1, j)] - this.u_prev[this.IX(i - 1, j)]);
                this.v[this.IX(i, j)] -= 0.5 * this.gridResolution * (this.u_prev[this.IX(i, j + 1)] - this.u_prev[this.IX(i, j - 1)]);
            }
        }
    
        this.setBnd(1, this.u);
        this.setBnd(2, this.v);
    },

    densityStep: function() {
        this.addSource(this.dens, this.dens_prev);

        //swapBuffers(ref dens_prev, ref dens);
        var z = this.dens_prev; this.dens_prev = this.dens; this.dens = z;
        this.diffuse(0, this.dens, this.dens_prev, this.diffusionRate);

        z = this.dens_prev; this.dens_prev = this.dens; this.dens = z;
        this.advect(0, this.dens, this.dens_prev, this.u, this.v);
    },

    velocityStep: function() {
        // N, u, v, u_prev, v_prev, visc, dt
        this.addSource(this.u, this.u_prev);
        this.addSource(this.v, this.v_prev);

        var z = this.u_prev; this.u_prev = this.u; this.u = z;
        this.diffuse(1, this.u, this.u_prev, this.viscocity);

        z = this.v_prev; this.v_prev = this.v; this.v = z;
        this.diffuse(2, this.v, this.v_prev, this.viscocity);

        this.project();

        z = this.u_prev; this.u_prev = this.u; this.u = z;
        z = this.v_prev; this.v_prev = this.v; this.v = z;

        this.advect(1, this.u, this.u_prev, this.u_prev, this.v_prev);
        this.advect(2, this.v, this.v_prev, this.u_prev, this.v_prev);

        this.project();
    },

    addSource: function(current, prev) {
        for (var i = 0; i < this.bufferSize; i++)
            current[i] += this.dt * prev[i];
    }
};