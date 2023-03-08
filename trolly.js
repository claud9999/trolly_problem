/*
direction =
    1 = heading up + left, 2 = up, 4 = up + right,
    8 = right,
    16 = down + right, 32 = down, 64 = down + left,
    128 = left
*/

class Point {
    constructor(x, y) { this.x = x; this.y = y; }
}

class Switch extends Point {
    constructor(x, y, direction, map) {
        super(x, y); this.direction = direction;
        this.map = map;
    }

    paint() {
        this.map.ctx.beginPath();
        this.map.ctx.lineWidth = 3;
        this.map.ctx.strokeStyle = "red";
        this.map.ctx.moveTo(this.x * this.map.cell_width, this.y * this.map.cell_height);
        this.map.ctx.lineTo((this.x + this.map.delta[this.direction].x) * this.map.cell_width, (this.y + this.map.delta[this.direction].y) * this.map.cell_height);
        this.map.ctx.stroke();
    }
}
class NPC extends Point {
    constructor(emoji, x, y, map) {
        super(x, y);
        this.map = map;
        this.emoji = emoji;
    }

    paint() {
        this.map.ctx.fillText(this.emoji, this.x * this.map.cell_width, this.y * this.map.cell_height);
    }
}

class RailSegment extends Point {
    constructor(x, y, d) {
        super(x, y);
        this.d = d; this.l = 0;
    }
}

class Rail {
    build() {
        var x = 0;
        var y = 0;
        var l = 0;
        this.points = new Array();

        /* pick edge to start from, 0 = bottom, 1 = top, 2 = left, 3 = right */
        var d = Math.floor(Math.random() * 4);
        switch(d) {
            case 0: /* heading up (+ left or right) */
                d = Math.floor(Math.random() * 3);
                y = this.map.height - 1;
                x = Math.floor((Math.random() + Math.random()) / 2 * this.map.width);
                break;
            case 1: /* heading down (+ left or right) */
                d = Math.floor(Math.random() * 3) + 4;
                y = 0;
                x = Math.floor((Math.random() + Math.random()) / 2 * this.map.width);
                break;
            case 2: /* heading right (+ up or down) */
                d = Math.floor(Math.random() * 3) + 2;
                x = 0;
                y = Math.floor((Math.random() + Math.random()) / 2 * this.map.height);
                break;
            case 3: /* heading left (+ up or down) */
                d = (Math.floor(Math.random() * 3) + 6) % 8;
                x = this.map.width - 1;
                y = Math.floor((Math.random() + Math.random()) / 2 * this.map.height);
                break;
        }
        var segment = new RailSegment(x, y, d);
        this.points.push(segment);

        while(1) {
            x += this.map.delta[d].x;
            y += this.map.delta[d].y;
            segment.l++;
            l++;
            if (x < 0 || x > this.map.width - 1 || y < 0 || y > this.map.height - 1) {
                segment.l--;
                break;
            }
            if (this.map.terminus[d] & this.map.railcells[x][y]) {
                break; /* there are tracks going (basically) the same direction */
            }
            if (l > 3) { // don't start turning for a few steps into the map */
                var turn = Math.random();
                if (turn > 0.9 && turn < 0.95) { /* turn left */
                    d--; if (d < 0) d = 7;
                    segment = new RailSegment(x, y, d);
                    this.points.push(segment);
                } else if (turn >= 0.95) {
                    d++; if (d > 7) d = 0;
                    segment = new RailSegment(x, y, d);
                    this.points.push(segment);
                }
            }
        }

        /* too short, try again */
        if(l < 10) return this.build();
    }

    mark() {
        for (var n = 0; n < this.points.length; n++) {
            var p = this.points[n];
            var x = p.x; var y = p.y; var d = p.d;
            for(var l = 0; l < p.l; l++) {
                // mark outgoing
                this.map.railcells[x][y] |= this.map.bitmap[(d + 4) % 8];
                x += this.map.delta[d].x;
                y += this.map.delta[d].y;
                // mark incoming
                this.map.railcells[x][y] |= this.map.bitmap[d];
            }
        }
    }

    constructor(map) {
        this.map = map;
        this.build();
        this.mark();
    }

    paint() {
        this.map.ctx.beginPath();
        var i = 1;
        var p = this.points[0];
        var m = this.map;
        m.ctx.moveTo(p.x * m.cell_width,
            p.y * m.cell_height);
        for(i = 1; i < this.points.length; i++) {
            p = this.points[i];
            m.ctx.lineTo(
                p.x * m.cell_width,
                p.y * m.cell_height);
        }
        m.ctx.lineTo(
            (p.x + m.delta[p.d].x * p.l) * m.cell_width,
            (p.y + m.delta[p.d].y * p.l) * m.cell_height
            );

        m.ctx.lineWidth = 6;
        m.ctx.strokeStyle = "black";
        m.ctx.stroke();

        m.ctx.lineWidth = 3;
        m.ctx.strokeStyle = "white";
        m.ctx.stroke();
     }
}

class RailMap {
    constructor() {
        this.canvas = document.getElementById("trolly");
        this.ctx = this.canvas.getContext("2d");
        this.pixel_width = window.innerWidth - 20;
        this.canvas.width = this.pixel_width;
        this.pixel_height = window.innerHeight - 20;
        this.canvas.height = this.pixel_height;

        var meas = this.ctx.measureText("\u{1F600}");
        this.cell_width = meas.width;
        this.cell_height = meas.actualBoundingBoxAscent;
        this.width = Math.floor(this.pixel_width / this.cell_width);
        this.height = Math.floor(this.pixel_height / this.cell_height);
        this.railcells = new Array(this.width);
        for(var x = 0; x < this.width; x++) {
            this.railcells[x] = new Array(this.height);
            for(var y = 0; y < this.height; y++) this.railcells[x][y] = 0;
        }
        this.switches = new Array();
        this.delta = [
            new Point(-1, -1), // up + left
            new Point(0, -1), // up
            new Point(1, -1), // up + right
            new Point(1, 0), // right
            new Point(1, 1), // down + right
            new Point(0, 1), // down
            new Point(-1, 1), // down + left
            new Point(-1, 0) // left
        ];
        this.bitmap = [1, 2, 4, 8, 16, 32, 64, 128];
        this.terminus = [
            /* for a given direction, if there are outgoing in one of these directions, stop */
            131, /* left, up + left, up */
            7,   /* up + left, up, up + right */
            14,  /* up, up + right, right */
            28,  /* up + right, right, down + right */
            56,  /* right, down + right, down */
            112,  /* down + right, down, down + left */
            224,  /* down, down + left, left */
            193 /* down + left, left, up + left */
        ];

        this.lines = [];
        this.npcs = [];
    }

    add() {
        this.lines.push(new Rail(this));
    }

    paint() {
        for(var i = 0; i < this.lines.length; i++) {
            this.lines[i].paint();
        };
        for (i = 0; i < this.npcs.length; i++) {
            this.npcs[i].paint();
        }
        for (i = 0; i < this.switches.length; i++) {
            this.switches[i].paint();
        }
    }

    addNPC() {
        this.npcs.push(new NPC(emojis.substring(0,2), Math.floor(Math.random() * this.width), Math.floor(Math.random() * this.height), this));
    }

    addSwitch(x, y, direction) {
        this.switches.push(new Switch(x, y, direction, this));
    }

    addSwitches() {
        for(var x = 0; x < this.width; x++) {
            for (var y = 0; y < this.height; y++) {
                var c = this.railcells[x][y];
                if (c == 0) continue; // shortcut empty cells
                for (var b = 0; b < 8; b++) {
                    if (c & (2 ** b)) {
                        if (c & (2 ** ((b + 1) % 8))) {
                            console.log([c.toString(2),x,y,b]);
                            this.addSwitch(x, y, b);
                            break;
                        }
                    }
                }
            }
        }
    }
}

function kp(event) {
    console.log(event.keyCode);
}

var rm;

function trolly() {
    var c = document.getElementById("trolly");
    window.onkeydown = kp;

    rm = new RailMap();

    for(var i = 0; i < 20; i++) {
        rm.add();
    };

    for(i = 0; i < 10; i ++) {
        rm.addNPC();
    }

    rm.addSwitches();

    rm.paint();
}