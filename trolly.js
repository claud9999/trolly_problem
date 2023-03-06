/*
direction = NW, N, NE, W, E, SW, S, SE
*/

class NPC {
    constructor(emoji, x, y, map) {
        this.emoji = emoji;
        this.map = map;
        this.x = x;
        this.y = y;
    }

    paint() {
        this.map.ctx.fillText(this.emoji, this.x * this.map.cell_width, this.y * this.map.cell_height);
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
            case 0: /* heading NW, N, NE */
                direction = Math.floor(Math.random() * 3);
                y = map.height;
                x = Math.floor((Math.random() + Math.random()) / 2 * map.width);
                break;
            case 1: /* heading SE, S, SW */
                direction = Math.floor(Math.random() * 3) + 4;
                y = -1;
                x = Math.floor((Math.random() + Math.random()) / 2 * map.width);
                break;
            case 2: /* heading NE, E, SE */
                direction = Math.floor(Math.random() * 3) + 2;
                x = -1;
                y = Math.floor((Math.random() + Math.random()) / 2 * map.height);
                break;
            case 3: /* heading NW, W, SW */
                direction = (Math.floor(Math.random() * 3) + 6) % 8;
                x = map.width;
                y = Math.floor((Math.random() + Math.random()) / 2 * map.height);
                break;
        }
        this.points.push([x, y]);

        while(1) {
            if (prevdir >= 0) { /* mark leaving path */
                map.data[x + y * map.width] |= map.bitmap[(prevdir + 4) % 8];
            }
            x += map.delta[direction][0];
            y += map.delta[direction][1];
            if (x < 0 || x >= map.width || y < 0 || y >= map.height) break;
            map.data[x + y * map.width] |= map.bitmap[direction]; /* mark entering path */
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
        this.points.push([x, y]);
    }

    draw(ctx) {
        ctx.moveTo(this.points[0][0] * this.map.cell_width, this.points[0][1] * this.map.cell_height);
        for(var i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i][0] * this.map.cell_width, this.points[i][1] * this.map.cell_height);
        };

        ctx.lineWidth = 6;
        ctx.strokeStyle = "black";
        ctx.stroke();

        ctx.lineWidth = 3;
        ctx.strokeStyle = "white";
        ctx.stroke();
    }
}

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
        this.data = new Array(this.width * this.height);
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

        for (var i = 0; i < this.data.length; i++) {
            this.data[i] = 0;
        }

        this.lines = [];
        this.npcs = [];
    }

    add() {
        this.lines.push(new Rail(this));
    }

    draw() {
        for(var i = 0; i < this.lines.length; i++) {
            this.lines[i].draw(this.ctx);
        };
        for (i = 0; i < this.npcs.length; i++) {
            this.npcs[i].paint();
        }
    }

    addNPC() {
        const emojis = "😀😃😄😁😆😅😂🤣🥲🥹☺️😊😇🙂🙃😉😌😍🥰😘😗😙😚😋😛😝😜🤪🤨🧐🤓😎🥸🤩🥳😏😒😞😔😟😕🙁☹️😣😖😫😩🥺😢😭😮‍💨😤😠😡🤬🤯😳🥶😱😨😰😥😓🫣🤗🫡🤔🫢🤭🤫🤥😶😶️😐😑😬🫠🙄😯😦😧😮😲🥱😴🤤😪😵😵💫🫥🤐🥴🤢🤮🤧😷🤒🤕🤑🤠🤡💩";
        this.npcs.push(new NPC(emojis.charAt(0), Math.floor(Math.random() * this.width), Math.floor(Math.random() * this.height), this));
    }
}

function kp(event) {
    console.log(event.keyCode);
}

function trolly() {
    var c = document.getElementById("trolly");
    window.onkeydown = kp;
    var rm = new RailMap();
    for(var i = 0; i < 10; i++) {
        rm.add();
    };
    for(i = 0; i < 10; i ++) {
        rm.addNPC();
    }
    rm.draw();
}