/* CC-BY https://creativecommons.org/licenses/by/4.0/legalcode Chris Knight cdk-trollyproblem@accessoft.org */

var game = false;

var score = 0;

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
        ctx.strokeStyle = "green";
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

    move(d = -1) { return true; }
}

class Splat extends Token {
    constructor(emoji, x, y, map, count = 20) {
        super(emoji, x, y, map);
        this.count = count;
    }

    move(d = -1) {
        return this.count-- > 0;
    }
}

class NPC extends Token {
    constructor(emoji, x, y, map, speed) {
        super(emoji, x, y, map);
        this.count = Math.floor(Math.random() * speed);
        this.speed = speed;
        this.d = Math.floor(Math.random() * 8);

        return;

        // search for a rail cell
        while(
                x >= 0 && x < this.map.width
                && y >= 0 && y < this.map.height
                && this.map.railcells[x][y] == 0) {
            x += this.map.delta[this.d].x;
            y += this.map.delta[this.d].y;
        }
        if (x >= 0 && x < this.map.width && y >= 0 && y < this.map.height) {
            this.x = x; this.y = y;
        }

        // otherwise stay where I am
    }

    // if my speed is 1, I will move every 20 turns...
    // if my speed is 15, I'll move on turn 2, 3, 5, 6, 8, 9...
    tick() {
        this.count += this.speed;
    }

    move(d = -1) {
        if(d >= 0) this.d = d;

        var x = this.x + this.map.delta[this.d].x;
        var y = this.y + this.map.delta[this.d].y;

        // don't move into square with PC
        if (x == this.map.pc.x && y == this.map.pc.y) return true;

        // don't move into square with train
        for (var i = 0; i < this.map.trains.length; i++) {
            if (x == this.map.trains[i].x && y == this.map.trains[i].y) return true;
        }

        // push the other NPC(s)
        for (i = 0; i < this.map.npcs.length; i++) {
            if (x == this.map.npcs[i].x && y == this.map.npcs[i].y) this.map.npcs[i].move(d);
        }

        this.x = x; this.y = y;

        // return false if I've moved off the map, so I get removed
        return (x >= 0 && y >= 0 && x < this.map.width && y < this.map.height);
    }

    update() {
        if (this.count < 20) return true;
        this.count -= 20;
        return this.move();
    }
}

class PC extends Token {
    constructor(emoji, x, y, map) {
        super(emoji, x, y, map);
    }

    move(d = -1) {
        if(d >= 0) this.d = d;

        const dx = this.map.delta[d].x; const dy = this.map.delta[d].y;
        const pc_x = this.x + dx; const pc_y = this.y + dy;

        // no going off the screen
        if (pc_x < 0 || pc_y < 0 || pc_x >= this.map.width || pc_y >= this.map.height) return true;

        // push an NPC
        for (var i = 0; i < this.map.npcs.length; i++) {
            if (this.map.npcs[i].x == pc_x && this.map.npcs[i].y == pc_y) this.map.npcs[i].move(d);
        };

        // can't move through a train
        for (i = 0; i < this.map.trains.length; i++) {
            if (this.map.trains[i].x == pc_x && this.map.trains[i].y == pc_y) return true;
        }

        this.x = pc_x; this.y = pc_y;

        return true;
    }
}

class Train extends Token {
    constructor(line, speed) {
        super("\u{1F683}", line.points[0].x, line.points[0].y, line.map);
        this.line = line;
        this.segnum = 0;
        this.l = 0;
        this.d = line.points[0].d;
        this.remaining = 0;
        this.speed = speed;
    }

    tick() {
        this.remaining += this.speed;
    }

    move(d = -1) {
        // we ignore the d parameter
        if (this.remaining <= 0) return true;
        this.remaining--;

        var td = 0;
        const c = this.map.railcells[this.x][this.y];

        // check if I'm at a switch and can take it
        for (var s = 0; d < 0 && s < this.map.switches.length; s++) {
            var sw = this.map.switches[s];
            if (sw.x != this.x || sw.y != this.y) continue;
            td = this.d - 1; if (td < 0) td = 7;
            if (td == sw.d || (this.d + 1) % 8 == sw.d) d = sw.d;
        }

        // proceed forward, if possible
        if (d < 0 && c & (2 ** this.d)) d = this.d;

        // take a branch, if possible
        if (d < 0) {
            if(Math.random() > 0.5) {
                // try left first
                td = this.d - 1; if (td < 0) td = 7;
                if (c & (2 ** td)) d = td;
                // then try right
                else {
                    td = (this.d + 1) % 8;
                    if (c & (2 ** td)) d = td;
                }
            } else {
                // try right first
                td = (this.d + 1) % 8;
                if (c & (2 ** td)) d = td;
                // then left
                else {
                    td = this.d - 1; if (td < 0) td = 7;
                    if (c & (2 ** td)) d = td;
                }
            }
        }

        if(d < 0) return false;

        this.d = d;

        this.x += this.map.delta[d].x;
        this.y += this.map.delta[d].y;
        if(this.x < 0 || this.y < 0 || this.x >= this.map.width || this.y >= this.map.height) return false;

        for(var i = 0; i < this.map.trains.length; i++) {
            const tr = this.map.trains[i];
            // another train going a different direction, I explode
            // TODO: add explosion
            if (tr.x == this.x && tr.y == this.y && tr.d != this.d) return false;
        }

        for (i = 0; i < this.map.npcs.length; i++) {
            const npc = this.map.npcs[i];
            if (npc.x == this.x && npc.y == this.y) {
                score++;
                // TODO: create *splat*
                this.map.splats.push(new Splat("\u{2728}", npc.x, npc.y, this.map));

                this.map.npcs.splice(i--, 1);
                this.map.addNPC();
            }
        }

        if (this.map.pc.x == this.x && this.map.pc.y == this.y) {
            gameover();
        }

        return true;
    }
}

class RailSegment extends Point {
    constructor(x, y, d) {
        super(x, y);
        this.d = d; this.l = 0;
    }
}

class RailLine {
    constructor(map) {
        this.map = map;
        this.c = linecolors[Math.floor(Math.random() * linecolors.length)];
        this.build();
        this.mark();
    }

    // starting from one edge, start plotting out the route...
    // turning, occasionally (but not until after moving a few spaces in)
    // and joining any tracks that this one runs into at a 45-degree.
    // ...otherwise terminating when I reach a screen edge.
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

    // In order to map out where the rail lines are, I keep an
    // array with each cell having an integer bitmap of the
    // directions tracks are heading out of the cell. Once
    // I've run "build()", then I go through and mark the cells
    // so that later rail lines can intersect this one.
    mark() {
        for (var n = 0; n < this.points.length; n++) {
            var p = this.points[n];
            var x = p.x; var y = p.y; var d = p.d;
            for(var l = 0; l < p.l; l++) {
                // mark outgoing
                this.map.railcells[x][y] |= (2 ** d);
                x += this.map.delta[d].x;
                y += this.map.delta[d].y;
                // mark incoming
                this.map.railcells[x][y] |= (2 ** ((d + 4) % 8));
            }
        }
    }

    // Draw this rail on the canvas.
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
        ctx.strokeStyle = this.c;
        ctx.stroke();

        ctx.lineWidth = 3;
        ctx.strokeStyle = "white";
        ctx.stroke();
     }
}

// the "master" class, containing all rail lines, NPC's, trains, and canvas details.
class RailMap {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext("2d");
        this.pixel_width = window.innerWidth - 10;
        this.canvas.width = this.pixel_width;
        this.pixel_height = window.innerHeight - 10;
        this.canvas.height = this.pixel_height;

        var meas = this.ctx.measureText("\u{1F600}");
        this.cell_width = meas.width;
        this.cell_height = meas.actualBoundingBoxAscent;
        this.width = Math.floor(this.pixel_width / this.cell_width);
        this.height = Math.floor(this.pixel_height / this.cell_height);
        this.railcellsbuf = new ArrayBuffer(this.width * this.height);
        this.railcells = new Array(this.width);
        for(var x = 0; x < this.width; x++) {
            this.railcells[x] = new Uint8ClampedArray(this.railcellsbuf.slice(x * this.height, (x + 1) * this.height));
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

        this.lines = new Array();
        this.npcs = new Array();
        this.splats = new Array();
        this.trains = new Array();
    }

    addLine() {
        this.lines.push(new RailLine(this));
    }

    paint() {
        this.ctx.clearRect(0, 0, this.pixel_width, this.pixel_height);

        var i = 0;
        for(i = 0; i < this.lines.length; i++) this.lines[i].paint(this.ctx);

        for(i = 0; i < this.switches.length; i++) this.switches[i].paint(this.ctx);

        for(i = 0; i < this.npcs.length; i++) this.npcs[i].paint(this.ctx);

        for(i = 0; i < this.splats.length; i++) this.splats[i].paint(this.ctx);

        for(i = 0; i < this.trains.length; i++) this.trains[i].paint(this.ctx);

        this.pc.paint(this.ctx);

        this.ctx.fillText("score: " + score, this.pixel_width - 100, 20);
    }

    addNPC() {
        // create an NPC, their speed will be score-dependent
        // (later NPCs will move faster, initial ones will move very slowly.)
        var e = Math.floor(Math.random() * emojis.length / 2) * 2;
        this.npcs.push(new NPC(
            emojis.substring(e, e + 2),
            Math.floor(Math.random() * this.width),
            Math.floor(Math.random() * this.height),
            this,
            Math.floor(Math.random() * 3) + score));
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
        this.trains.push(new Train(this.lines[railnum], Math.floor(Math.random() * 3) + score + 1));
    }

    // returns true if there is a switch here and I've updated it...
    toggleSwitch(x, y) {
        var s = 0;
        for (s = 0; s < this.switches.length; s++) {
            if (this.switches[s].x == x && this.switches[s].y == y) break;
        }
        if(s == this.switches.length) return false;
        s = this.switches[s];
        for(var d = (s.d + 1) % 8; d != s.d; d = (d + 1) % 8) {
            if (this.railcells[x][y] & (2 ** d)) break;
        }
        s.d = d;
        return true;
    }
}

var updateNPCs = true; // NPCs don't move when PC is moving

function kp(event) {
    updateNPCs = false;
    var d = -1;
    switch(event.keyCode) {
        case 81: // up + left
            d = 0; break;
        case 38: // up
        case 87:
            d = 1; break;
        case 69: // up + right
            d = 2; break;
        case 39: // right
        case 68:
            d = 3; break;
        case 67: // down + right
            d = 4; break;
        case 40: // down
        case 88:
            d = 5; break;
        case 90: // down + left
            d = 6; break;
        case 37: // left
        case 65:
            d = 7; break;
        case 32: // switch
        case 83:
            game.toggleSwitch(game.pc.x, game.pc.y);
            break;
    }

    if (d >= 0) game.pc.move(d);

    // when trains disappear/crash, replace them.
    // also increase train density as score goes up.
    if(game.trains.length < score + 4) game.addTrain();

    // let the trains move since I've moved...
    for(i = 0; i < game.trains.length; i++) {
        game.trains[i].tick();
    }

    // let the NPCs move since I've moved...
    for(i = 0; i < game.npcs.length; i++) {
        game.npcs[i].tick();
    }

    for(i = 0; i < game.splats.length; i++) {
        if(!game.splats[i].move()) game.splats.splice(i--, 1);
    }

    game.paint();

    updateNPCs = true;
}

function doUpdates() {
    for(var i = 0; i < game.trains.length; i++) {
        if(!game.trains[i].move()) game.trains.splice(i--,1);
    }

    for(i = 0; i < game.npcs.length; i++) {
        if(!game.npcs[i].update()) {
            game.npcs.splice(i--,1);
            game.addNPC();
        }
    }

    game.paint();
}

function trolly() {
    var c = document.getElementById("trolly");
    window.onkeydown = kp;
    score = 0;

    game = new RailMap(c);

    game.pc = new PC("\u{1F479}", Math.floor(game.width / 2), Math.floor(game.height / 2), game);

    // add a fixed-number of rail lines
    // TODO: perhaps this should be canvas size-dependent?
    for(var i = 0; i < 15; i++) {
        game.addLine();
    };

    for(i = 0; i < 10; i ++) {
        game.addNPC();
    }

    game.addSwitches();

    game.paint();

    setInterval(doUpdates, 200);
}

function gameover() {
    var c = document.getElementById("trolly");
    var g = document.getElementById("gameover");
    if(!c.hidden) {
        c.hidden = true;
        g.hidden = false;
        var s = document.getElementById("score");
        s.innerText = score;
    }
}

function mouseclick(event) {
    updateNPCs = false;

    var dx = 0;
    // left third of the screen
    if (event.screenX < Math.floor(game.pixel_width / 3)) dx = -1;
    // right third of the screen
    else if (event.screenX > Math.floor(game.pixel_width / 3) * 2) dx = 1;

    var dy = 0;
    // top third of the screen
    if (event.screenY < Math.floor(game.pixel_height / 3)) dy = -1;
    // bottom third of the screen
    else if (event.screenY > Math.floor(game.pixel_height / 3) * 2) dy = 1;

    if (dx == 0 && dy == 0) game.toggleSwitch(game.pc.x, game.pc.y);
    else {
        var d = 0;
        for (d = 0; d < 8; d++) {
            if (game.delta[d].x == dx && game.delta[d].y == dy) break;
        }
        game.pc.move(d);
    }

    // when trains disappear/crash, replace them.
    // also increase train density as score goes up.
    if(game.trains.length < score + 4) game.addTrain();

    // let the trains move since I've moved...
    for(i = 0; i < game.trains.length; i++) {
        game.trains[i].tick();
    }

    // let the NPCs move since I've moved...
    for(i = 0; i < game.npcs.length; i++) {
        game.npcs[i].tick();
    }

    for(i = 0; i < game.splats.length; i++) {
        if(!game.splats[i].move()) game.splats.splice(i--, 1);
    }

    game.paint();

    updateNPCs = true;
}

function showgame() {
    var c = document.getElementById("trolly");
    c.addEventListener('mousedown', mouseclick);
    var i = document.getElementById("instructions");
    if(c.hidden) {
        i.hidden = true;
        c.hidden = false;
        c.width = "100%";
        c.height = "100%";
        trolly();
    }
}