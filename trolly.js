/*
d =
    1 = heading up + left, 2 = up, 4 = up + right,
    8 = right,
    16 = down + right, 32 = down, 64 = down + left,
    128 = left
*/

class Point {
    constructor(x, y) { this.x = x; this.y = y; }
}

class Switch extends Point {
    constructor(x, y, d, map) {
        super(x, y); this.d = d;
        this.map = map;
    }

    paint(ctx) {
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "red";
        ctx.moveTo(this.x * this.map.cell_width, this.y * this.map.cell_height);
        ctx.lineTo((this.x + this.map.delta[this.d].x) * this.map.cell_width, (this.y + this.map.delta[this.d].y) * this.map.cell_height);
        ctx.stroke();
    }
}

class Token extends Point {
    constructor(emoji, x, y, map) {
        super(x, y);
        this.map = map;
        this.emoji = emoji;
    }

    paint(ctx) {
        ctx.fillText(this.emoji, (this.x - 0.5) * this.map.cell_width, (this.y + 0.5) * this.map.cell_height);
    }

    move() { return true; }
}

class NPC extends Token {
    constructor(emoji, x, y, map) {
        super(emoji, x, y, map);
    }

    move() {
        x += Math.floor(Math.random() * 3) - 1;
        y += Math.floor(Math.random() * 3) - 1;
        return (x >= 0 && y >= 0 && x < this.map.width && y < this.map.height);
    }
}

class PC extends Token {
    constructor(emoji, x, y, map) {
        super(emoji, x, y, map);
    }
}

class Train extends Token {
    constructor(line) {
        super("\u{1F683}", line.points[0].x, line.points[0].y, line.map);
        this.line = line;
        this.segnum = 0;
        this.l = 0;
        this.d = line.points[0].d;
    }

    move() {
        if (this.l == this.line.points[this.segnum].l) {
            this.segnum++;
            if (this.segnum >= this.line.points.length)
                return false;
            this.l = 0;
            this.d = this.line.points[this.segnum].d;
        }

        this.x += this.map.delta[this.d].x;
        this.y += this.map.delta[this.d].y;
        this.l++;

        return true;
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
                console.log(["TERM", x, y, d]);
                break; /* there are tracks going (basically) the same d */
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
                this.map.railcells[x][y] |= this.map.bitmap[d];
                x += this.map.delta[d].x;
                y += this.map.delta[d].y;
                // mark incoming
                this.map.railcells[x][y] |= this.map.bitmap[(d + 4) % 8];
            }
        }
    }

    constructor(map) {
        this.map = map;
        this.build();
        this.mark();
    }

    paint(ctx) {
        ctx.beginPath();
        const m = this.map;
        var i = 1;
        var p = this.points[0];
        ctx.moveTo(p.x * m.cell_width,
            p.y * m.cell_height);
        for(i = 1; i < this.points.length; i++) {
            p = this.points[i];
            ctx.lineTo(
                p.x * m.cell_width,
                p.y * m.cell_height);
        }
        ctx.lineTo(
            (p.x + m.delta[p.d].x * p.l) * m.cell_width,
            (p.y + m.delta[p.d].y * p.l) * m.cell_height
            );

        ctx.lineWidth = 6;
        ctx.strokeStyle = "black";
        ctx.stroke();

        ctx.lineWidth = 3;
        ctx.strokeStyle = "white";
        ctx.stroke();
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
            /* for a given d, if there are outgoing in one of these ds, stop */
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
        this.trains = [];

        this.pc = new PC("\u{1F479}", Math.floor(this.width / 2), Math.floor(this.height / 2), this);
    }

    add() {
        this.lines.push(new Rail(this));
    }

    paint() {
        this.ctx.clearRect(0,0, this.pixel_width, this.pixel_height);

        for(var i = 0; i < this.lines.length; i++) {
            this.lines[i].paint(this.ctx);
        };

        for (var i = 0; i < this.npcs.length; i++) {
            this.npcs[i].paint(this.ctx);
        }
        for (i = 0; i < this.switches.length; i++) {
            this.switches[i].paint(this.ctx);
        }

        for (i = 0; i < this.trains.length; i++) {
            this.trains[i].paint(this.ctx);
        }

        this.pc.paint(this.ctx);
    }

    addNPC() {
        this.npcs.push(new NPC(emojis.substring(0,2), Math.floor(Math.random() * this.width), Math.floor(Math.random() * this.height), this));
    }

    addSwitch(x, y, d) {
        this.switches.push(new Switch(x, y, d, this));
    }

    addSwitches() {
        for(var x = 0; x < this.width; x++) {
            for (var y = 0; y < this.height; y++) {
                var c = this.railcells[x][y];
                if (c == 0) continue; // shortcut empty cells
                for (var d = 0; d < 8; d++) {
                    if (c & (2 ** d)) {
                        if (c & (2 ** ((d + 1) % 8))) {
                            console.log([c.toString(2), x, y, d]);
                            this.addSwitch(x, y, d);
                            break;
                        }
                    }
                }
            }
        }
    }

    addTrain() {
        var railnum = Math.floor(Math.random() * this.lines.length);
        this.trains.push(new Train(this.lines[railnum]));
    }

    toggleSwitch(x, y) {
        var s = 0;
        for (s = 0; s < this.switches.length; s++) {
            if (this.switches[s].x == x && this.switches[s].y == y) break;
        }
        if(s == this.switches.length) return;
        s = this.switches[s];
        for(var d = (s.d + 1) % 8; d != s.d; d = (d + 1) % 8) {
            if (this.railcells[x][y] & this.bitmap[d]) break;
        }
        s.d = d;
    }
}

function kp(event) {
    console.log(event.keyCode);
    switch(event.keyCode) {
        case 37: // left
        case 65:
            rm.pc.x--;
            break;
        case 38: // up
        case 87:
            rm.pc.y--;
            break;
        case 39: // right
        case 68:
            rm.pc.x++;
            break;
        case 40: // down
        case 83:
            rm.pc.y++;
            break;
        case 32: // spacebar
            rm.toggleSwitch(rm.pc.x, rm.pc.y);
    }
    if(rm.trains.length < 4) rm.addTrain();

/*    for(var i = 0; i < rm.npcs.length; i++) {
        if(!rm.npcs[i].move()) rm.trains.splice(i--,1);
    }
    */

    for(i = 0; i < rm.trains.length; i++) {
        if(!rm.trains[i].move()) rm.trains.splice(i--,1);
    }

    rm.paint();
}

var rm;

function paint() {
    rm.paint();
}

function trolly() {
    var c = document.getElementById("trolly");
    window.onkeydown = kp;

    rm = new RailMap();

    for(var i = 0; i < 10; i++) {
        rm.add();
    };

    for(i = 0; i < 10; i ++) {
        rm.addNPC();
    }

    rm.addSwitches();

    rm.paint();
}