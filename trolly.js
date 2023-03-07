/*
direction =
    1 = heading up + left, 2 = up, 4 = up + right,
    8 = right,
    16 = down + right, 32 = down, 64 = down + left,
    128 = left
*/

class Switch {
    constructor(x, y, direction, map) {
        this.x = x; this.y = y; this.direction = direction;
        this.map = map;
    }

    paint() {
        this.map.ctx.lineWidth = 6;
        this.map.ctx.strokeStyle = "black";
        this.map.ctx.strokeRect((this.x - 1) * this.map.cell_width, (this.y - 1) * this.map.cell_height, this.map.cell_width * 2, this.map.cell_height * 2)
    }
}
class NPC {
    constructor(emoji, x, y, map) {
        this.map = map;
        this.emoji = emoji;
        this.x = x;
        this.y = y;
    }

    paint() {
        this.map.ctx.fillText(this.emoji, 0, 0);
    }
}
class Rail {
    constructor(map) {
        this.map = map;
        this.points = [];
        var x = 0;
        var y = 0;
        /* pick edge to start from, 0 = bottom, 1 = top, 2 = left, 3 = right */
        var direction = Math.floor(Math.random() * 4);
        var prevdir = -1;
        switch(direction) {
            case 0: /* heading up (+ left or right) */
                direction = Math.floor(Math.random() * 3);
                y = map.height;
                x = Math.floor((Math.random() + Math.random()) / 2 * map.width);
                break;
            case 1: /* heading down (+ left or right) */
                direction = Math.floor(Math.random() * 3) + 4;
                y = -1;
                x = Math.floor((Math.random() + Math.random()) / 2 * map.width);
                break;
            case 2: /* heading right (+ up or down) */
                direction = Math.floor(Math.random() * 3) + 2;
                x = -1;
                y = Math.floor((Math.random() + Math.random()) / 2 * map.height);
                break;
            case 3: /* heading left (+ up or down) */
                direction = (Math.floor(Math.random() * 3) + 6) % 8;
                x = map.width;
                y = Math.floor((Math.random() + Math.random()) / 2 * map.height);
                break;
        }
        this.points.push([x, y]);

        while(1) {
            if (prevdir >= 0) { /* mark leaving path */
                map.railcells[x + y * map.width] |= map.bitmap[(prevdir + 4) % 8];
            }
            x += map.delta[direction][0];
            y += map.delta[direction][1];
            if (x < 0 || x >= map.width || y < 0 || y >= map.height) break;
            if (map.terminus[direction] & map.railcells[x + y * map.width]) {
                break; /* there are tracks going (basically) the same direction */
            }
            map.railcells[x + y * map.width] |= map.bitmap[direction]; /* mark entering path */
            var turn = Math.random();
            if (turn > 0.9 && turn < 0.95) { /* turn left */
                this.points.push([x, y]);
                direction--; if (direction < 0) direction = 7;
            } else if (turn >= 0.95) {
                this.points.push([x, y]);
                direction++; if (direction > 7) direction = 0;
            }
            prevdir = direction;
        }
        map.railcells[x + y * map.width] |= map.bitmap[direction]; /* mark entering path */
        this.points.push([x, y]);
    }

    paint() {
        this.map.ctx.moveTo(this.points[0][0] * this.map.cell_width, this.points[0][1] * this.map.cell_height);
        for(var i = 1; i < this.points.length; i++) {
            this.map.ctx.lineTo(this.points[i][0] * this.map.cell_width, this.points[i][1] * this.map.cell_height);
        };

        this.map.ctx.lineWidth = 6;
        this.map.ctx.strokeStyle = "black";
        this.map.ctx.stroke();

        this.map.ctx.lineWidth = 3;
        this.map.ctx.strokeStyle = "white";
        this.map.ctx.stroke();
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
        this.railcells = new Array(this.width * this.height);
        this.switches = new Array();
        this.delta = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];
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
        for (var i = 0; i < this.railcells.length; i++) {
            this.railcells[i] = 0;
        }

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
        this.npcs.push(new NPC(emojis.substring(0,1), Math.floor(Math.random() * this.width), Math.floor(Math.random() * this.height), this));
    }

    addSwitch(x, y, direction) {
        this.switches.push(new Switch(x, y, direction, this));
    }

    addSwitches() {
        for(var x = 0; x < this.width; x++) {
            for (var y = 0; y < this.height; y++) {
                var c = this.railcells[x + y * this.width];
                if (c == 0) continue;
                var cnt = 0;
                for(var direction = 0; direction < 8; direction++) {
                    if ((c & (2 ** direction)) == 0) continue;
                    if(cnt == 2) { /* already two, now on third */
                        this.addSwitch(x, y, direction);
                        break;
                    } else cnt++;
                }
            }
        }
    }
}

function kp(event) {
    console.log(event.keyCode);
}

function trolly() {
    var c = document.getElementById("trolly");
    window.onkeydown = kp;
    var rm = new RailMap();
    for(var i = 0; i < 20; i++) {
        rm.add();
    };
/*    for(i = 0; i < 10; i ++) {
        rm.addNPC();
    }
    */

    rm.addSwitches();

    rm.paint();
}