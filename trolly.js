/*
direction = NW, N, NE, W, E, SW, S, SE
*/

class RailMap {
    /* array of cels, with a bit map for which side/corner is connected
        1 = top-left
        2 = top
        4 = top-right
        8 = left
        16 = right
        32 = bottom-left
        64 = bottom-right
    */
    constructor(m) {
        this.m = m;
        this.data = new Array(m.width * m.height);
        this.delta = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];
        this.bits = {};
        this.bits.NW = 1;
        this.bits.N = 2;
        this.bits.NE = 4;
        this.bits.E = 8;
        this.bits.SE = 16;
        this.bits.S = 32;
        this.bits.SW = 64;
        this.bits.W = 128;
        this.bitmap = [
            this.bits.NW,
            this.bits.N,
            this.bits.NE,
            this.bits.E,
            this.bits.SE,
            this.bits.S,
            this.bits.SW,
            this.bits.W];
        for (var i = 0; i < this.data.length; i++) this.data[i] = 0;
    }

    add() {
        var x = 0;
        var y = 0;
        /* pick edge to start from, 0 = bottom, 1 = top, 2 = left, 3 = right */
        var direction = Math.floor(Math.random() * 4);
        var prevdir = -1;
        switch(direction) {
            case 0: /* heading NW, N, NE */
                direction = Math.floor(Math.random() * 3);
                y = this.m.height;
                x = Math.floor((Math.random() + Math.random()) / 2 * this.m.width);
                break;
            case 1: /* heading SE, S, SW */
                direction = Math.floor(Math.random() * 3) + 4;
                y = -1;
                x = Math.floor((Math.random() + Math.random()) / 2 * this.m.width);
                break;
            case 2: /* heading NE, E, SE */
                direction = Math.floor(Math.random() * 3) + 2;
                x = -1;
                y = Math.floor((Math.random() + Math.random()) / 2 * this.m.height);
                break;
            case 3: /* heading NW, W, SW */
                direction = (Math.floor(Math.random() * 3) + 6) % 8;
                x = this.m.width;
                y = Math.floor((Math.random() + Math.random()) / 2 * this.m.height);
                break;
        }

        while(1) {
            if (prevdir >= 0) { /* mark leaving path */
                this.data[x + y * this.m.width] |= this.bitmap[(prevdir + 4) % 8];
            }
            x += this.delta[direction][0];
            y += this.delta[direction][1];
            if (x < 0 || x >= this.m.width || y < 0 || y >= this.m.height) break;
            this.data[x + y * this.m.width] |= this.bitmap[direction]; /* mark entering path */
            if(Math.random() > 0.9) {
                direction += Math.floor(Math.random() * 3) - 1;
                if (direction < 0) direction = 7;
                if (direction == 8) direction = 0;
            }
            prevdir = direction;
        }
    }

    draw() {
        const ctx = this.m.ctx;
        for (var x = 0; x < this.m.width; x++) {
            var cell_left = x * this.m.cell_width;
            var cell_right = cell_left + this.m.cell_width;
            var cell_x_ctr = Math.floor((cell_left + cell_right) / 2);

            for (var y = 0; y < this.m.height; y++) {
                var d = this.data[x + y * this.m.width];
                if (d == 0) continue; /* skip empty cells */

                var cell_top = y * this.m.cell_height;
                var cell_bottom = cell_top + this.m.cell_height;
                var cell_y_ctr = Math.floor((cell_top + cell_bottom) / 2);

                if(d & this.bits.NW) { /* draw from bottom right to center */
                    ctx.moveTo(cell_right, cell_bottom);
                    ctx.lineTo(cell_x_ctr, cell_y_ctr);
                }
                if(d & this.bits.N) { /* draw from bottom center to center */
                    ctx.moveTo(cell_x_ctr, cell_bottom);
                    ctx.lineTo(cell_x_ctr, cell_y_ctr);
                }
                if(d & this.bits.NE) { /* draw from bottom left to center */
                    ctx.moveTo(cell_left, cell_bottom);
                    ctx.lineTo(cell_x_ctr, cell_y_ctr);
                }
                if(d & this.bits.W) { /* draw from center right to center */
                    ctx.moveTo(cell_right, cell_y_ctr);
                    ctx.lineTo(cell_x_ctr, cell_y_ctr);
                }
                if(d & this.bits.E) { /* draw from center left to center */
                    ctx.moveTo(cell_left, cell_y_ctr);
                    ctx.lineTo(cell_x_ctr, cell_y_ctr);
                }
                if(d & this.bits.SW) { /* draw from bottom center to center */
                    ctx.moveTo(cell_right, cell_top);
                    ctx.lineTo(cell_x_ctr, cell_y_ctr);
                }
                if(d & this.bits.S) { /* draw from top center to center */
                    ctx.moveTo(cell_x_ctr, cell_top);
                    ctx.lineTo(cell_x_ctr, cell_y_ctr);
                }
                if(d & this.bits.SE) { /* draw from bottom center to center */
                    ctx.moveTo(cell_left, cell_top);
                    ctx.lineTo(cell_x_ctr, cell_y_ctr);
                }
            }
        }

        ctx.lineWidth = 6;
        ctx.strokeStyle = "black";
        ctx.stroke();

        ctx.lineWidth = 3;
        ctx.strokeStyle = "white";
        ctx.stroke();
    }
}

class TrollyMap {
    constructor() {
        this.canvas = document.getElementById("trolly");
        this.ctx = this.canvas.getContext("2d");
        this.pixel_width = window.innerWidth - 20;
        this.canvas.width = this.pixel_width;
        this.pixel_height = window.innerHeight - 20;
        this.canvas.height = this.pixel_height;

        const meas = this.ctx.measureText("\u{1F600}");
        this.cell_width = meas.width;
        this.cell_height = meas.actualBoundingBoxAscent;
        this.width = Math.floor(this.pixel_width / this.cell_width);
        this.height = Math.floor(this.pixel_height / this.cell_height);
    }
}

function trolly() {
    var m = new TrollyMap();
    var rm = new RailMap(m);
    for(var i = 0; i < 10; i++) {
        rm.add();
    }
    rm.draw();
}