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




function FField(canvas, debug) {
    this.debug = debug || false;

    this.gridResolution = 128;
    this.gridResPlus2 = this.gridResolution + 2;
    this.bufferSize = this.gridResPlus2 * this.gridResPlus2;
    this.dt = 0.1;
    this.diffusionRate = 0.0;
    this.viscocity = 0.0;
    this.force = 5.0; // scales the mouse movement that generate a force
    this.source = 300.0; // amount of density that will be deposited
    this.mouse = {x: 0, y: 0};

    this.u = Array.Generate(0, this.bufferSize);
    this.v = Array.Generate(0, this.bufferSize);
    this.dens = Array.Generate(0, this.bufferSize);

    this.u_prev = Array.Generate(0, this.bufferSize);
    this.v_prev = Array.Generate(0, this.bufferSize);
    this.dens_prev = Array.Generate(0, this.bufferSize);

    this.fpsStack = [];

    this.canvas = canvas;
    this.context = this.canvas.getContext('2d');
    this.canvas.oncontextmenu = function (e) {e.preventDefault();};
    this.cwidth = this.canvas.width; // Caching
    this.cheight = this.canvas.height; // Caching

    var self = this;
    window.requestAnimFrame(function() {self.tick();});
}

FField.prototype = {
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
            var mouseText = "Mouse: X: " + this.mouse.x + "  Y: " + this.mouse.y;
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

        var gridX = Math.floor((this.mouse.x / 512) * this.gridResolution + 1);
        var gridY = Math.floor(((512 - this.mouse.y) / 512) * this.gridResolution + 1);

        if (!(gridX < 1 || gridX > this.gridResolution || gridY < 1 || gridY > this.gridResolution)) {
            if (Mouse.buttons.left) {
                this.u[this.IX(gridX, gridY)] = this.force * (cMouse.x - this.mouse.x);
                this.v[this.IX(gridX, gridY)] = this.force * (this.mouse.y - cMouse.y);
            }

            if (Mouse.buttons.right) {
                this.dens[this.IX(gridX, gridY)] = this.source;
            }
        }

        this.mouse = cMouse;
    },

    velocityStep: function(){

    },

    densityStep: function() {

    },

    draw: function() {
        this.context.clearRect(0, 0, this.cwidth, this.cheight)
        var buffer = this.context.getImageData(0, 0, this.cwidth, this.cheight);
        var bufferData = buffer.data;
        var h = this.cwidth / this.gridResolution;

        for(var x = 0; x <= this.gridResolution; x++) {
            for(var y = 0; y <= this.gridResolution; y++) {

                var d00 = this.dens[this.IX(x, this.gridResolution - y)] & 0xFF;

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
    }
};