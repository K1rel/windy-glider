import Phaser from 'phaser';

/* ──────────────────────────
   TUNABLE LAYOUT CONSTANTS
   ────────────────────────── */
const MIN_VERTICAL_GAP   = 160;   // smallest hole between two pillars
const MIN_HORIZONTAL_GAP = 400;   // min. distance between pillar pairs

export default class GameScene extends Phaser.Scene {
    constructor () { super('GameScene'); }

    /* ═════════════════════════ PRELOAD ═════════════════════════ */
    preload () {
        /* minimal textures so the demo runs without external assets */
        const tex = (key, w, h, draw) => {
            const g = this.add.graphics();
            draw(g);
            g.generateTexture(key, w, h);
            g.destroy();
        };
        tex('glider',   50, 20, g => g.fillStyle(0xffffff).fillRect(0,0,50,20));
        tex('obstacle', 60,200, g => g.fillStyle(0x8B4513).fillRect(0,0,60,200));
        tex('star',     50, 50, g => g.fillStyle(0xffff00).fillCircle(25,25,25));
        tex('wind',     80,100, g => g.fillStyle(0xADD8E6,0.5).fillRect(0,0,80,100));
        tex('ground',   50, 50, g => g.fillStyle(0x00ff00).fillRect(0,0,50,50));
    }

    /* ═════════════════════════ CREATE ═════════════════════════ */
    create () {
        /* — state — */
        this.score = 0;
        this.lives = 3;
        this.distance = 0;
        this.difficultyLevel = 1;
        this.gameState = 'playing';
        this.lastSpawnX = 0;

        /* — sky — */
        this.cameras.main.setBackgroundColor(0x87ceeb);

        /* — groups — */
        this.obstacles    = this.physics.add.staticGroup();
        this.collectibles = this.add.group();
        this.windZones    = this.physics.add.group();

        /* — world pieces — */
        this.createGround();
        this.createGlider();

        /* — collisions — */
        this.physics.add.collider(this.glider, this.obstacles, this.handleObstacleCollision, null, this);
        this.physics.add.collider(this.glider, this.ground,     this.handleGroundCollision,   null, this);

        /* — camera follow — */
        const cam = this.cameras.main;
        cam.setBounds(0, 0, Number.MAX_SAFE_INTEGER, cam.height);
        cam.startFollow(this.glider, true, 0.1, 0.1);
        cam.setFollowOffset(-cam.width / 4, 0);
        cam.roundPixels = true;

        /* — wind swipe input — */
        this.windController = { strength: 0, direction: 0, isSwiping: false, startX: 0, startY: 0, startTime: 0 };
        this.input.on('pointerdown', this.startSwipe,  this);
        this.input.on('pointermove', this.updateSwipe, this);
        this.input.on('pointerup',   this.endSwipe,    this);

        /* — HUD scene — */
        this.scene.launch('UIScene');

        /* — bootstrap level — */
        this.generateLevel(); this.generateLevel(); this.generateLevel();

        /* — difficulty timer — */
        this.time.addEvent({ delay: 1000, loop: true, callback: () => { this.difficultyLevel++; } });
    }

    /* ───────────────────────── GROUND */
    createGround () {
        const cam = this.cameras.main;
        this.ground = this.add
            .tileSprite(0, cam.height - 50, cam.width, 50, 'ground')
            .setOrigin(0,0)
            .setScrollFactor(0);
        this.physics.add.existing(this.ground, true);
    }

    /* ───────────────────────── GLIDER */
    createGlider () {
        const cam = this.cameras.main;
        this.glider = this.physics.add.sprite(200, cam.height / 2, 'glider');
        const body = this.glider.body;
        body.setBounce(0.1)
            .setDrag(0.985)
            .setMaxVelocity(400, 300)
            .setAngularDrag(0.8);
        body.velocity.x = 100;   // forward motion
    }

    /* ════════════════ WIND SWIPE HANDLERS ════════════════ */
    startSwipe (p) {
        if (this.gameState !== 'playing') return;
        Object.assign(this.windController, {
            isSwiping: true,
            startX: p.x, startY: p.y,
            startTime: this.time.now,
            strength: 120,
            direction: Math.atan2(this.glider.y - p.y, this.glider.x - p.x)
        });
    }
    updateSwipe (p) {
        if (!this.windController.isSwiping) return;
        this.windController.direction = Math.atan2(this.glider.y - p.y, this.glider.x - p.x);
    }
    endSwipe (p) {
        if (!this.windController.isSwiping) return;
        const w = this.windController;
        const dx = p.x - w.startX, dy = p.y - w.startY;
        const dist = Math.hypot(dx, dy);
        const speed = dist / (this.time.now - w.startTime);
        w.direction = Math.atan2(dy, dx);
        w.strength  = Math.min(450, speed * 10 + dist * 0.5);
        this.events.emit('updateWind', w.strength / 450);
        w.isSwiping = false;
    }

    /* ════════════════ LEVEL GENERATION ════════════════ */
    generateLevel () {
        const cam = this.cameras.main;
        const spawnX = Math.max(cam.scrollX + cam.width + 300,
            this.lastSpawnX + MIN_HORIZONTAL_GAP);
        const groundTop = this.ground.y, safeGap = 10;

        /* pillar pair */
        const gapSize  = Math.max(MIN_VERTICAL_GAP, 200 - this.difficultyLevel * 10);
        const centerY  = Phaser.Math.Between(100, groundTop - safeGap - gapSize / 2);

        this.obstacles.create(spawnX, 0, 'obstacle')
            .setOrigin(0,0).setDisplaySize(60, centerY - gapSize / 2).refreshBody();
        this.obstacles.create(spawnX, centerY + gapSize / 2, 'obstacle')
            .setOrigin(0,0).setDisplaySize(60, groundTop - (centerY + gapSize / 2)).refreshBody();

        /* guaranteed star in the gap (bigger) */
        this.collectibles.create(spawnX + 30, centerY, 'star')
            .setScale(0.5)
            .setData('points', 10);

        /* wind zone (optional) */
        if (Phaser.Math.Between(0,1)) {
            const wzY = Phaser.Math.Between(50, groundTop - safeGap - 100);
            const wz  = this.windZones.create(spawnX + 100, wzY, 'wind');
            wz.setSize(80, 100).setAlpha(0.3).setImmovable(true)
                .setData('forceY', Phaser.Math.Between(0,1) ? -2 : 2);
        }

        /* random star, avoiding pillars */
        if (Phaser.Math.Between(0,1)) {
            for (let tries = 0; tries < 5; tries++) {
                const sx = spawnX + Phaser.Math.Between(0, 200);
                const sy = Phaser.Math.Between(50, groundTop - safeGap - 25);
                const overlaps = this.obstacles.getChildren().some(ob =>
                    sx > ob.x - 30 && sx < ob.x + ob.displayWidth + 30 &&
                    sy > ob.y      && sy < ob.y + ob.displayHeight);
                if (!overlaps) {
                    this.collectibles.create(sx, sy, 'star')
                        .setScale(0.5)
                        .setData('points', Phaser.Math.Between(0, 9) ? 10 : 50);
                    break;
                }
            }
        }

        this.lastSpawnX = spawnX;
    }

    /* ═══════════════════════ UPDATE ═══════════════════════ */
    update () {
        if (this.gameState !== 'playing') return;

        /* ground scroll */
        const cam = this.cameras.main;
        this.ground.width = cam.width;
        this.ground.tilePositionX = cam.scrollX;

        /* distance HUD */
        this.distance = this.glider.x * 0.05;
        this.events.emit('updateDistance', this.distance);

        /* physics */
        this.updateGliderPhysics();
        if (this.windController.strength > 0)
            this.applyWindForces(this.game.loop.delta);

        /* wind zone influence */
        this.physics.overlap(this.glider, this.windZones, this.handleWindZoneCollision, null, this);

        /* star collection */
        this.collectibles.getChildren().forEach(star => {
            if (!star.active) return;
            const d = Phaser.Math.Distance.Between(this.glider.x, this.glider.y, star.x, star.y);
            if (d < 30) this.handleCollectibleCollision(this.glider, star);
        });

        /* spawn ahead */
        if (this.glider.x > this.lastSpawnX - MIN_HORIZONTAL_GAP)
            this.generateLevel();

        /* cleanup off-screen items */
        this.cleanupObjects();

        /* grass collision */
        if (this.glider.y + this.glider.displayHeight / 2 >= this.ground.y)
            this.gameOver();
    }

    /* ───────────────── PHYSICS HELPERS */
    updateGliderPhysics () {
        const v = this.glider.body.velocity;
        if (v.x < 80) v.x = 80;             // never stall
        v.y += 0.35;                        // simple gravity
        const drag = Math.pow(v.length() / 300, 2) * 0.98;
        this.glider.body.drag = Math.max(0.985, 1 - drag);
    }

    applyWindForces (dtMs) {
        const w  = this.windController;
        const v  = this.glider.body.velocity;
        const dt = dtMs / 16.67;            // 1 ≈ one frame at 60 FPS
        const accel = 0.12 * dt;            // tweak for feel

        v.x += Math.cos(w.direction) * w.strength * accel;
        v.y += Math.sin(w.direction) * w.strength * accel;

        /* torque */
        if (w.strength > 20) {
            const a = Phaser.Math.Angle.ShortestBetween(
                this.glider.angle,
                Phaser.Math.RadToDeg(w.direction)
            );
            this.glider.body.angularVelocity += (a / 180) * (w.strength / 250);
        }

        /* decay */
        w.strength *= Math.pow(0.92, dt);
    }

    /* ───────────────── COLLISION HANDLERS */
    handleGroundCollision () { this.gameOver(); }

    handleObstacleCollision (glider, pillar) {
        pillar.destroy();
        this.lives--;
        this.events.emit('updateLives', this.lives);

        if (this.lives <= 0) { this.gameOver(); return; }

        /* bounce back & invulnerability flicker */
        glider.body.velocity.x = Math.max(50, glider.body.velocity.x * 0.3);
        glider.body.velocity.y = -Math.abs(glider.body.velocity.y) * 0.7;
        glider.x -= 15;
        glider.setAlpha(0.5);
        this.time.delayedCall(1000, () => glider.setAlpha(1));
    }

    handleCollectibleCollision (_, star) {
        if (!star.active) return;
        this.score += star.getData('points');
        this.events.emit('updateScore', this.score);
        star.destroy();
    }

    handleWindZoneCollision (_, zone) {
        this.glider.body.velocity.y += zone.getData('forceY') * 0.1;
    }

    /* ───────────────── HOUSEKEEPING */
    cleanupObjects () {
        const cutoff = this.cameras.main.scrollX - 100;
        [...this.obstacles.getChildren(),
            ...this.collectibles.getChildren(),
            ...this.windZones.getChildren()]
            .forEach(obj => { if (obj.x + obj.displayWidth < cutoff) obj.destroy(); });
    }

    /* ───────────────── GAME OVER */
    gameOver () {
        this.gameState = 'gameOver';
        this.events.emit('gameOver', this.score, this.distance);
    }
}
