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
        // Generate a green bonus star texture for 10-point stars
        if (!this.textures.exists('star_green')) {
            const g = this.add.graphics();
            g.fillStyle(0x33ff33);
            g.lineStyle(4, 0xffffff);
            g.beginPath();
            for (let i = 0; i < 5; i++) {
                const angle = Phaser.Math.DegToRad(i * 72 - 90);
                const x = 25 + Math.cos(angle) * 22;
                const y = 25 + Math.sin(angle) * 22;
                if (i === 0) g.moveTo(x, y);
                else g.lineTo(x, y);
                const innerAngle = Phaser.Math.DegToRad(i * 72 + 36 - 90);
                const ix = 25 + Math.cos(innerAngle) * 10;
                const iy = 25 + Math.sin(innerAngle) * 10;
                g.lineTo(ix, iy);
            }
            g.closePath();
            g.fillPath();
            g.strokePath();
            g.generateTexture('star_green', 50, 50);
            g.destroy();
        }
        // Generate a red bonus star texture for 50-point stars
        if (!this.textures.exists('star_red')) {
            const g = this.add.graphics();
            g.fillStyle(0xff3333);
            g.lineStyle(4, 0xffffff);
            g.beginPath();
            for (let i = 0; i < 5; i++) {
                const angle = Phaser.Math.DegToRad(i * 72 - 90);
                const x = 25 + Math.cos(angle) * 22;
                const y = 25 + Math.sin(angle) * 22;
                if (i === 0) g.moveTo(x, y);
                else g.lineTo(x, y);
                const innerAngle = Phaser.Math.DegToRad(i * 72 + 36 - 90);
                const ix = 25 + Math.cos(innerAngle) * 10;
                const iy = 25 + Math.sin(innerAngle) * 10;
                g.lineTo(ix, iy);
            }
            g.closePath();
            g.fillPath();
            g.strokePath();
            g.generateTexture('star_red', 50, 50);
            g.destroy();
        }
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
        this.strengthActive = false;
        this.coinActive = false;
        this.boostActive = false;
        this._boostFlashTimer = 0;

        /* — sky — */
        this.cameras.main.setBackgroundColor(0x87ceeb);

        /* — groups — */
        this.obstacles    = this.physics.add.staticGroup();
        this.collectibles = this.physics.add.group();
        this.windZones    = this.physics.add.group();
        this.spikeys = this.physics.add.group();
        this.lasers  = this.physics.add.group();
        this.birds   = this.physics.add.group();
        this.hearts = this.physics.add.group();

        /* — world pieces — */
        this.createGround();
        this.createGlider();

        /* — collisions — */
        this.physics.add.collider(this.glider, this.obstacles, this.handleObstacleCollision, null, this);
        this.physics.add.collider(this.glider, this.ground,     this.handleGroundCollision,   null, this);
        this.physics.add.overlap(this.glider, this.spikeys, this.handleSpikeyCollision, null, this);
        this.physics.add.overlap(this.glider, this.lasers,  this.handleLaserCollision,  null, this);
        this.physics.add.overlap(this.glider, this.birds,   this.handleBirdCollision,   null, this);
        this.physics.add.overlap(this.glider, this.collectibles, this.handleCollectibleCollision, null, this);
        this.physics.add.overlap(this.glider, this.hearts, this.handleHeartCollision, null, this);

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
        this.generateLevel();

        /* — difficulty timer — */
        this.time.addEvent({ delay: 1000, loop: true, callback: () => { this.difficultyLevel++; } });

        // Show wind control instructions at the start
        this.instructionText = this.add.text(
            cam.width / 2,
            cam.height / 2 - 80,
            'Swipe or drag with your mouse to create wind\nGuide the glider through the obstacles!',
            {
                font: '28px Arial',
                fill: '#fff',
                stroke: '#000',
                strokeThickness: 6,
                align: 'center',
                padding: { x: 20, y: 10 },
                backgroundColor: 'rgba(0,0,0,0.3)'
            }
        ).setOrigin(0.5).setDepth(1000);
        this.tweens.add({
            targets: this.instructionText,
            alpha: 0,
            delay: 3500,
            duration: 1200,
            onComplete: () => this.instructionText.destroy()
        });
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
                    const bonusType = Phaser.Math.Between(0, 9);
                    let points, key;
                    if (bonusType === 0) { // 10% chance, red 50pt
                        points = 50;
                        key = 'star_red';
                    } else if (bonusType <= 2) { // 20% chance, green 10pt
                        points = 10;
                        key = 'star_green';
                    } else { // 70% chance, normal star
                        points = 1;
                        key = 'star';
                    }
                    this.collectibles.create(sx, sy, key)
                        .setScale(0.5)
                        .setData('points', points);
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

        /* Add heart (extra life) with low probability */
        if (Phaser.Math.Between(0, 14) === 0) { // ~1 in 15 chance
            const heartY = Phaser.Math.Between(80, this.ground.y - 40);
            const heart = this.hearts.create(spawnX + Phaser.Math.Between(100, 300), heartY, 'heart');
            heart.setScale(0.7);
        }

        // Add powerups with higher probability
        if (Phaser.Math.Between(0, 4) === 0) { // ~1 in 5 chance
            const powerupY = Phaser.Math.Between(80, this.ground.y - 40);
            const type = Phaser.Math.RND.pick(['boost', 'strength', 'coin']);
            const powerup = this.collectibles.create(spawnX + Phaser.Math.Between(120, 320), powerupY, type);
            powerup.setScale(0.7);
            powerup.setData('powerup', type);
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

        // Star power boost: keep high speed and flash
        if (this.boostActive) {
            this.glider.body.velocity.x = 1600;
            // Rainbow flash effect
            this._boostFlashTimer += this.game.loop.delta;
            if (this._boostFlashTimer > 60) {
                this._boostFlashTimer = 0;
                const colors = [0xff4444, 0xffe100, 0x44ff44, 0x44e1ff, 0x4444ff, 0xe144ff];
                this.glider.setTint(Phaser.Utils.Array.GetRandom(colors));
            }
        } else {
            this.glider.clearTint();
        }
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
        const lift = Phaser.Math.Clamp((v.x - 120) * 0.0008, 0, 0.10); // much less lift
        v.y += GRAVITY_PER_FRAME - lift + 0.04; // always a net downward force

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
        if (this.strengthActive || this.boostActive) {
            pillar.destroy();
            if (this.boostActive) this.showPowerupText('STAR SMASH!', 0xffe100);
            else this.showPowerupText('SMASH!', 0xff4444);
            return;
        }
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

    handleCollectibleCollision (_, item) {
        if (!item.active) return;
        if (item.getData('powerup')) {
            const type = item.getData('powerup');
            if (type === 'boost') {
                // Star power: invincible, fast, break everything for 7s
                this.boostActive = true;
                this._boostFlashTimer = 0;
                this.showPowerupText('STAR POWER!');
                this.glider.body.velocity.x = 1600;
                this.time.delayedCall(7000, () => { this.boostActive = false; });
            } else if (type === 'strength') {
                // Break obstacles for 6 seconds
                this.strengthActive = true;
                this.showPowerupText('STRENGTH!');
                this.time.delayedCall(6000, () => { this.strengthActive = false; });
            } else if (type === 'coin') {
                // Double star points for 8 seconds
                this.coinActive = true;
                this.showPowerupText('DOUBLE STARS!');
                this.time.delayedCall(8000, () => { this.coinActive = false; });
            }
            item.destroy();
            return;
        }
        // Normal collectible (star)
        let points = item.getData('points') || 0;
        if (this.coinActive) points *= 2;
        this.score += points;
        this.events.emit('updateScore', this.score);
        item.destroy();
    }

    handleWindZoneCollision (_, zone) {
        this.glider.body.velocity.y += zone.getData('forceY') * 0.1;
    }

    handleSpikeyCollision (glider, spikey) {
        if (this.boostActive) {
            spikey.destroy();
            this.showPowerupText('STAR SMASH!', 0xffe100);
            return;
        }
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
        if (this.boostActive) {
            laser.destroy();
            this.showPowerupText('STAR SMASH!', 0xffe100);
            return;
        }
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
        if (this.boostActive) {
            bird.destroy();
            this.showPowerupText('STAR SMASH!', 0xffe100);
            return;
        }
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

    handleHeartCollision (glider, heart) {
        heart.destroy();
        this.lives++;
        this.events.emit('updateLives', this.lives);
    }

    /* ───────────────── HOUSEKEEPING */
    cleanupObjects () {
        const cutoff = this.cameras.main.scrollX - 100;
        [...this.obstacles.getChildren(),
            ...this.collectibles.getChildren(),
            ...this.windZones.getChildren(),
            ...this.spikeys.getChildren(),
            ...this.lasers.getChildren(),
            ...this.birds.getChildren(),
            ...this.hearts.getChildren()]
            .forEach(obj => { if (obj.x + obj.displayWidth < cutoff) obj.destroy(); });
    }

    /* ───────────────── GAME OVER */
    gameOver () {
        this.gameState = 'gameOver';
        this.events.emit('gameOver', this.score, this.distance);
    }

    showPowerupText(text, color = 0x4caf50) {
        if (this.powerupText) this.powerupText.destroy();
        this.powerupText = this.add.text(this.glider.x, this.glider.y - 60, text, {
            font: 'bold 28px Arial',
            fill: '#fff',
            stroke: Phaser.Display.Color.IntegerToColor(color).rgba,
            strokeThickness: 6,
            align: 'center',
            backgroundColor: 'rgba(0,0,0,0.3)'
        }).setOrigin(0.5).setDepth(1000);
        this.tweens.add({
            targets: this.powerupText,
            y: this.glider.y - 100,
            alpha: 0,
            duration: 900,
            onComplete: () => this.powerupText && this.powerupText.destroy()
        });
    }
}
