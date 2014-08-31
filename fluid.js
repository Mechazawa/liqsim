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
    this.pixelBuffer = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
    for(var i = 0; i < this.pixelBuffer.length / 4; i++)
        this.pixelBuffer.data[4 * i + 3] = 255;
    this.pixelBufferData = this.pixelBuffer.data;
    this.cwidth = this.canvas.width; // Caching

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
                this.dens_prev[this.IX(gridX, gridY)] = this.source;
            }
        }

        this.mouse = cMouse;
    },

    velocityStep: function(){

    },

    densityStep: function() {

    },

    draw: function() {

        var h = 1 / this.gridResolution;

        for(var i = 0; i <= this.gridResolution; i++) {
            var x = (i - 0.5) * h;
            for(var j = 0; j <= this.gridResolution; j++) {
                var y = (j - 0.5) * h;

                var d00 =  Math.min(255, this.dens[this.IX(i, j)]);
                //var d01 = this.dens[this.IX(i, j + 1)];
                //var d10 = this.dens[this.IX(i + 1, j)];
                //var d11 = this.dens[this.IX(i + 1, j + 1)];

                this.drawPixel(d00, x, y);
                //this.drawPixel(d01, x, y + h);
                //this.drawPixel(d10, x + h, y);
                //this.drawPixel(d11, x + h, y + h);
            }
        }

        // DOM Hack
        this.pixelBuffer.data = this.pixelBufferData;
        this.context.putImageData(this.pixelBuffer, 0 ,0);
    },

    drawPixel: function(d, x, y) {
        var pos = 4 * ((x * this.cwidth) + y);
        this.pixelBufferData[pos] = dn; // RED
        this.pixelBufferData[pos + 1] = dn; // GREEN
        this.pixelBufferData[pos + 2] = dn; // BLUE
    },

    IX: function(x, y) {
        return this.gridResPlus2 * y + x;
    }
};