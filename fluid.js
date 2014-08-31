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
    this.bufferSize = (this.gridResolution + 2) * (this.gridResolution + 2);
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

    this.fpsStack = Array.Generate(this.dt, 100);

    this.canvas = canvas;
    this.context = this.canvas.getContext('2d');

    var self = this;
    window.requestAnimFrame(function() {self.tick();});
}

FField.prototype = {
    tick: function(_dt) {
        var now = new Date().getTime();
        this.dt = typeof _dt !== "undefined" ? _dt : 0.1;
        this.fpsStack.shift();
        this.fpsStack.push(1 / this.dt);

        this.update();
        this.draw();

        if(this.debug) {
            var fps = this.fpsStack.reduce(function(x, y){return x + y;}, 0) / this.fpsStack.length;
            fps = Math.round(fps * 10) / 10;

            var fpsText = "FPS: " + fps;
            var mouseText = "Mouse: X: " + this.mouse.x + "  Y: " + this.mouse.y;

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
        var cMouse = {x: 0, y: 0};

        cMouse = Mouse.getRelativeTo(this.canvas);

        // Lower boundary
        cMouse.x = Math.max(0, this.mouse.x);
        cMouse.y = Math.max(0, this.mouse.y);

        // Upper boundary
        cMouse.x = Math.min(this.canvas.width, this.mouse.x);
        cMouse.y = Math.min(this.canvas.height, this.mouse.y);

        if(this.mouse.x == 0)
            this.mouse = cMouse;

        var gridX = ((this.mouse.x / 512) * this.gridResolution + 1);
        var gridY = (((512 - this.mouse.y) / 512) * this.gridResolution + 1);

        if(gridX < 1 || gridX > this.gridResolution || gridY < 1 || gridY > this.gridResolution)
            return;

        if(Mouse.buttons.left) {
            this.u[this.IX(gridX, gridY)] = this.force * (cMouse.x - this.mouse.x);
            this.v[this.IX(gridX, gridY)] = this.force * (this.mouse.y - cMouse.y);
        }

        if(Mouse.buttons.right) {
            this.dens_prev[this.IX(gridX, gridY)] = this.source;
        }

        this.mouse = cMouse;
    },

    velocityStep: function(){

    },

    densityStep: function() {

    },

    draw: function() {
        this.context.fillStyle = 'black';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    },

    IX: function(x, y) {
        return this.gridResPlus2 * y + x;
    }
};