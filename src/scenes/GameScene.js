import Phaser from 'phaser';

/* ──────────────────────────
   TUNABLE LAYOUT CONSTANTS
   ────────────────────────── */
const MIN_VERTICAL_GAP   = 160;   // smallest hole between two pillars
const MIN_HORIZONTAL_GAP = 400;   // min. distance between pillar pairs

const GRAVITY_PER_FRAME = 0.42   // ↑ increased for a harder, faster sink

export default class GameScene extends Phaser.Scene {
    constructor () { super('GameScene'); }

    /* ═════════════════════════ PRELOAD ═════════════════════════ */
    preload () {
        /* minimal textures so the demo runs without external assets */
        // All textures are now loaded in BootScene from PNGs.
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
        this.spikeys = this.physics.add.group();
        this.lasers  = this.physics.add.group();
        this.birds   = this.physics.add.group();

        /* — world pieces — */
        this.createGround();
        this.createGlider();

        /* — collisions — */
        this.physics.add.collider(this.glider, this.obstacles, this.handleObstacleCollision, null, this);
        this.physics.add.collider(this.glider, this.ground,     this.handleGroundCollision,   null, this);
        this.physics.add.overlap(this.glider, this.spikeys, this.handleSpikeyCollision, null, this);
        this.physics.add.overlap(this.glider, this.lasers,  this.handleLaserCollision,  null, this);
        this.physics.add.overlap(this.glider, this.birds,   this.handleBirdCollision,   null, this);

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
            .setData('points', 1);

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

        /* Add spikey ball (spins, moves up/down) */
        if (Phaser.Math.Between(0, 2) === 0) {
            const spikeyY = Phaser.Math.Between(100, groundTop - 60);
            const spikey = this.spikeys.create(spawnX + Phaser.Math.Between(100, 250), spikeyY, 'spikey');
            spikey.setCircle(24).setBounce(1, 1).setCollideWorldBounds(false);
            spikey.setData('spin', Phaser.Math.Between(-4, 4) || 2);
            spikey.setData('vy', Phaser.Math.Between(-60, 60) || 40);
        }
        /* Add laser (horizontal, can move up/down, animates on/off) */
        if (Phaser.Math.Between(0, 2) === 0) {
            const laserY = Phaser.Math.Between(120, groundTop - 40);
            const laser = this.lasers.create(spawnX + Phaser.Math.Between(150, 300), laserY, 'laser');
            laser.setImmovable(true);
            laser.setData('timer', 0);
            laser.setData('active', true);
            laser.setAlpha(1);
        }
        /* Add bird (flies left, can be at any height) */
        if (Phaser.Math.Between(0, 2) === 0) {
            const birdY = Phaser.Math.Between(80, groundTop - 40);
            const bird = this.birds.create(spawnX + Phaser.Math.Between(200, 400), birdY, 'bird');
            bird.setVelocityX(-Phaser.Math.Between(120, 200));
            bird.setData('flap', 0);
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

        /* Spikey balls: spin and bounce up/down */
        this.spikeys.getChildren().forEach(spikey => {
            spikey.angle += spikey.getData('spin');
            spikey.y += spikey.getData('vy') * (this.game.loop.delta / 1000);
            /* Bounce off top/bottom */
            if (spikey.y < 60) spikey.setData('vy', Math.abs(spikey.getData('vy')));
            if (spikey.y > this.ground.y - 24) spikey.setData('vy', -Math.abs(spikey.getData('vy')));
        });
        /* Lasers: animate on/off */
        this.lasers.getChildren().forEach(laser => {
            let t = laser.getData('timer') + this.game.loop.delta;
            laser.setData('timer', t);
            /* 1.5s on, 1s off */
            if (t % 2500 < 1500) {
                laser.setAlpha(1);
                laser.setData('active', true);
            } else {
                laser.setAlpha(0.3);
                laser.setData('active', false);
            }
        });
        /* Birds: flap and move left */
        this.birds.getChildren().forEach(bird => {
            let flap = bird.getData('flap') + this.game.loop.delta;
            bird.setData('flap', flap);
            bird.y += Math.sin(flap / 200) * 0.7;
            /* Remove if off screen */
            if (bird.x < this.cameras.main.scrollX - 100) bird.destroy();
        });
    }

    /* ───────────────── PHYSICS HELPERS */
    updateGliderPhysics () {
        const body = this.glider.body
        const v    = body.velocity

        /* 1. Never let airflow stall completely */
        if (v.x < 90) v.x = 90

        /* 2. Gravity vs. a touch of lift
              • gravity is the constant GRAVITY_PER_FRAME downward
              • lift grows linearly with forward speed after 120 px/s
           At ~200 px/s you're roughly level; slower sinks, faster climbs a bit. */
        const lift = Phaser.Math.Clamp((v.x - 120) * 0.0013, 0, 0.12)
        v.y += GRAVITY_PER_FRAME - lift

        /* 3. Same quadratic drag idea you had, but a hair softer */
        const dragFactor = Math.pow(v.length() / 300, 2) * 0.92
        body.drag = Math.max(0.985, 1 - dragFactor)

        /* 4. Keep vertical speed reasonable so it never becomes a rocket */
        v.y = Phaser.Math.Clamp(v.y, -250, 350)

        /* 5. Tilt sprite toward real flight path (purely visual) */
        const target = Phaser.Math.RadToDeg(Math.atan2(v.y, v.x))
        this.glider.angle = Phaser.Math.Linear(this.glider.angle, target, 0.08)
    }

    applyWindForces (dtMs) {
        const w  = this.windController;
        const v  = this.glider.body.velocity;

        // convert milliseconds to "60 fps–frames"
        const dt = dtMs / 16.67;                 // 1 ≈ one frame at 60 FPS
        const accel = 0.12 * dt;                 // original feel

        // push glider in wind direction
        v.x += Math.cos(w.direction) * w.strength * accel;
        v.y += Math.sin(w.direction) * w.strength * accel;

        /* optional: slight torque so the nose turns into the gust */
        if (w.strength > 20) {
            const a = Phaser.Math.Angle.ShortestBetween(
                this.glider.angle,
                Phaser.Math.RadToDeg(w.direction)
            );
            this.glider.body.angularVelocity += (a / 180) * (w.strength / 250);
        }

        // exponential decay of the gust
        w.strength *= Math.pow(0.92, dt);
        if (w.strength < 1) w.strength = 0;      // stop tiny residual jitters
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

    handleSpikeyCollision (glider, spikey) {
        spikey.destroy();
        this.lives--;
        this.events.emit('updateLives', this.lives);
        if (this.lives <= 0) { this.gameOver(); return; }
        glider.body.velocity.x = Math.max(50, glider.body.velocity.x * 0.3);
        glider.body.velocity.y = -Math.abs(glider.body.velocity.y) * 0.7;
        glider.x -= 15;
        glider.setAlpha(0.5);
        this.time.delayedCall(1000, () => glider.setAlpha(1));
    }

    handleLaserCollision (glider, laser) {
        if (!laser.getData('active')) return;
        this.lives--;
        this.events.emit('updateLives', this.lives);
        if (this.lives <= 0) { this.gameOver(); return; }
        glider.body.velocity.x = Math.max(50, glider.body.velocity.x * 0.3);
        glider.body.velocity.y = -Math.abs(glider.body.velocity.y) * 0.7;
        glider.x -= 15;
        glider.setAlpha(0.5);
        this.time.delayedCall(1000, () => glider.setAlpha(1));
    }

    handleBirdCollision (glider, bird) {
        bird.destroy();
        this.lives--;
        this.events.emit('updateLives', this.lives);
        if (this.lives <= 0) { this.gameOver(); return; }
        glider.body.velocity.x = Math.max(50, glider.body.velocity.x * 0.3);
        glider.body.velocity.y = -Math.abs(glider.body.velocity.y) * 0.7;
        glider.x -= 15;
        glider.setAlpha(0.5);
        this.time.delayedCall(1000, () => glider.setAlpha(1));
    }

    /* ───────────────── HOUSEKEEPING */
    cleanupObjects () {
        const cutoff = this.cameras.main.scrollX - 100;
        [...this.obstacles.getChildren(),
            ...this.collectibles.getChildren(),
            ...this.windZones.getChildren(),
            ...this.spikeys.getChildren(),
            ...this.lasers.getChildren(),
            ...this.birds.getChildren()]
            .forEach(obj => { if (obj.x + obj.displayWidth < cutoff) obj.destroy(); });
    }

    /* ───────────────── GAME OVER */
    gameOver () {
        this.gameState = 'gameOver';
        this.events.emit('gameOver', this.score, this.distance);
    }
}
