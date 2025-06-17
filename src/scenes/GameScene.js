import Phaser from 'phaser';

const MIN_VERTICAL_GAP     = 160;   // never spawn a hole smaller than this
const MIN_HORIZONTAL_GAP   = 400;   // min X distance between two pillar pairs

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        // Load placeholder assets (solid colors) since actual images are missing.
        // In a real game, you would load actual image files here.

        // Glider (white rectangle)
        let graphicsGlider = this.add.graphics({ fillStyle: { color: 0xffffff } });
        graphicsGlider.fillRect(0, 0, 50, 20);
        graphicsGlider.generateTexture('glider', 50, 20);
        graphicsGlider.destroy();

        // Obstacle (brown rectangle)
        let graphicsObstacle = this.add.graphics({ fillStyle: { color: 0x8B4513 } });
        graphicsObstacle.fillRect(0, 0, 60, 200);
        graphicsObstacle.generateTexture('obstacle', 60, 200);
        graphicsObstacle.destroy();

        // Star (yellow circle)
        let graphicsStar = this.add.graphics({ fillStyle: { color: 0xFFFF00 } });
        graphicsStar.fillCircle(25, 25, 25); // Center X, Center Y, Radius
        graphicsStar.generateTexture('star', 50, 50);
        graphicsStar.destroy();

        // Wind (light blue transparent rectangle)
        let graphicsWind = this.add.graphics({ fillStyle: { color: 0xADD8E6, alpha: 0.5 } });
        graphicsWind.fillRect(0, 0, 80, 100);
        graphicsWind.generateTexture('wind', 80, 100);
        graphicsWind.destroy();

        // Ground (green rectangle)
        let graphicsGround = this.add.graphics({ fillStyle: { color: 0x00FF00 } });
        graphicsGround.fillRect(0, 0, 50, 50);
        graphicsGround.generateTexture('ground', 50, 50);
        graphicsGround.destroy();

        // Cloud (light gray rectangle)
        let graphicsCloud = this.add.graphics({ fillStyle: { color: 0xF0F0F0 } });
        graphicsCloud.fillRect(0, 0, 100, 50);
        graphicsCloud.generateTexture('cloud', 100, 50);
        graphicsCloud.destroy();

        // Sky background texture (single pixel blue) for infinite background tileSprite
        let graphicsSkyBg = this.add.graphics({ fillStyle: { color: 0x87CEEB } });
        graphicsSkyBg.fillRect(0, 0, 1, 1);
        graphicsSkyBg.generateTexture('sky_background_texture', 1, 1);
        graphicsSkyBg.destroy();
    }

    create() {
        /* 1️⃣  Game‑state values */
        this.score          = 0;
        this.lives          = 3;
        this.distance       = 0;
        this.gameTime       = 0;
        this.difficultyLevel = 1;
        this.gameState      = 'playing';
        this.lastSpawnX     = 0;

        /* 2️⃣  Camera background colour (sky) */
        this.cameras.main.setBackgroundColor(0x87ceeb);

        /* 3️⃣  Physics / display groups  – must EXIST before colliders */
        this.obstacles    = this.physics.add.staticGroup(); // pillars (AABB bodies)
        this.collectibles = this.add.group();                // stars
        this.windZones    = this.physics.add.group();        // updraft / downdraft areas
        this.particles    = this.add.group();                // visual only – no physics

        /* 4️⃣  World pieces */
        this.createGround();
        this.createBackground(); // currently empty – placeholder for clouds
        this.createGlider();

        /* 5️⃣  Colliders – wire AFTER both sides exist */
        this.physics.add.collider(this.glider, this.obstacles, this.handleObstacleCollision, null, this);
        this.physics.add.collider(this.glider, this.ground,     this.handleGroundCollision,   null, this);

        /* 6️⃣  Camera follow */
        this.cameras.main.setBounds(0, 0, Number.MAX_SAFE_INTEGER, this.cameras.main.height);
        this.cameras.main.startFollow(this.glider, true, 0.1, 0.1);
        this.cameras.main.setFollowOffset(-this.cameras.main.width / 4, 0);
        this.cameras.main.roundPixels = true;

        /* 7️⃣  Wind‑swipe input */
        this.windController = {
            strength: 0,
            direction: 0,
            isSwiping: false,
            startX: 0, startY: 0, startTime: 0
        };
        this.input.on('pointerdown', this.startSwipe,  this);
        this.input.on('pointermove', this.updateSwipe, this);
        this.input.on('pointerup',   this.endSwipe,    this);

        /* 8️⃣  UI overlay */
        this.scene.launch('UIScene');

        /* 9️⃣  Level bootstrap (3 chunks so the start feels full) */
        this.generateLevel();
        this.generateLevel();
        this.generateLevel();

        /* 🔟  Difficulty scaling – once per second */
        this.time.addEvent({ delay: 1000, callback: this.updateDifficulty, callbackScope: this, loop: true });
    }

    createBackground() {
        // This function is now empty. The sky background color is handled by this.cameras.main.setBackgroundColor() in create().
        // Cloud generation (if desired) can be re-added here after core background issue is resolved.
    }

    createGround() {
        // Create ground that extends with the camera. Using tileSprite for infinite scroll.
        // Its visible width will always match the camera's width, but its content will tile.
        this.ground = this.add.tileSprite(0, this.cameras.main.height - 50, this.cameras.main.width, 50, 'ground')
            .setOrigin(0, 0);
        this.ground.setScrollFactor(0);
        this.physics.add.existing(this.ground, true); // static body

        // Removed physics.world.setBounds - rely on camera bounds and manual checks for infinite runner
    }

    createGlider() {
        this.glider = this.physics.add.sprite(200, this.cameras.main.height / 2, 'glider');
        this.glider.setCollideWorldBounds(false);
        this.glider.setBounce(0.1);
        this.glider.body.setDrag(0.985);
        this.glider.body.setMaxVelocity(400, 300);
        this.glider.body.setAngularDrag(0.8);
        this.glider.body.velocity.x = 100; // initial forward motion
    }

    startSwipe(pointer) {
        if (this.gameState !== 'playing') return;
        
        this.windController.isSwiping = true;
        this.windController.startX = pointer.x;
        this.windController.startY = pointer.y;
        this.windController.startTime = this.time.now;
        
        // Add immediate wind effect on click
        this.windController.strength = 100;
        this.windController.direction = Math.atan2(
            this.glider.y - pointer.y,
            this.glider.x - pointer.x
        );
    }

    updateSwipe(pointer) {
        if (!this.windController.isSwiping) return;

        // Update wind direction during swipe
        this.windController.direction = Math.atan2(
            this.glider.y - pointer.y,
            this.glider.x - pointer.x
        );

        // Create wind particles during swipe
        const particles = this.add.particles(pointer.x, pointer.y, 'wind', {
            speed: { min: 5, max: 10 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.3, end: 0.6 },
            alpha: { start: 0.7, end: 0 },
            lifespan: 400,
            quantity: 5,
            frequency: 50
        });

        this.time.delayedCall(400, () => {
            particles.destroy();
        });
    }

    endSwipe(pointer) {
        if (!this.windController.isSwiping) return;
        
        const endX = pointer.x;
        const endY = pointer.y;
        const endTime = this.time.now;
        
        const dx = endX - this.windController.startX;
        const dy = endY - this.windController.startY;
        const swipeTime = endTime - this.windController.startTime;
        
        this.windController.direction = Math.atan2(dy, dx);
        const swipeDistance = Math.sqrt(dx * dx + dy * dy);
        const swipeSpeed = swipeDistance / swipeTime;
        
        // Increased wind strength for better control
        this.windController.strength = Math.min(400, swipeSpeed * 8 + swipeDistance * 0.4);
        
        const particles = this.add.particles(this.windController.startX, this.windController.startY, 'wind', {
            speed: { min: 40, max: 80 },
            angle: { min: this.windController.direction - 0.6, max: this.windController.direction + 0.6 },
            scale: { start: 0.8, end: 1.8 },
            alpha: { start: 1.0, end: 0 },
            lifespan: 2000,
            quantity: 60,
            frequency: 50
        });

        this.time.delayedCall(2000, () => {
            particles.destroy();
        });

        this.events.emit('updateWind', this.windController.strength / 400);
        
        this.windController.isSwiping = false;
    }



    generateLevel() {
        // Calculate spawn position relative to the camera's right edge, ensuring objects appear on screen
        // This ensures objects always spawn in the visible area, regardless of lastSpawnX being reset or camera movement.
        const currentCameraRightEdge = this.cameras.main.scrollX + this.cameras.main.width;
        const camRight = this.cameras.main.scrollX + this.cameras.main.width;
        const spawnX = Math.max(
            camRight + 300,               // keep new stuff off-screen
            this.lastSpawnX + MIN_HORIZONTAL_GAP   // respect spacing rule
        );
        const groundTop = this.ground.y;
        const safeGap = 10;
        this.lastSpawnX = spawnX; // Update lastSpawnX for the next check

        // Generate obstacles
        const gapSize = Math.max(MIN_VERTICAL_GAP, 200 - this.difficultyLevel * 10);
        const maxCenter = groundTop - safeGap - gapSize / 2;
        const centerY = Phaser.Math.Between(100, maxCenter);
        // Upper obstacle
        const upperH = centerY - gapSize / 2;           // desired visible height
        const upperObstacle = this.obstacles.create(spawnX, 0, 'obstacle')
            .setOrigin(0, 0)
            .setDisplaySize(60, upperH)   // ⬅️ scale/crop the sprite itself
            .refreshBody();               // keep body in sync

        // Lower obstacle
        const lowerY = centerY + gapSize / 2;
        const lowerH = groundTop - lowerY;              // so it stops above grass
        const lowerObstacle = this.obstacles.create(spawnX, lowerY, 'obstacle')
            .setOrigin(0, 0)
            .setDisplaySize(60, lowerH)   // ⬅️ match the sprite to the body
            .refreshBody();

        // Add collectible in gap
        if (Phaser.Math.Between(0, 1) === 1) {
            const star = this.collectibles.create(spawnX + 30, centerY, 'star');
            star.setScale(0.3);
            star.setData('points', 10);
        }


        // Generate wind zones
        if (Phaser.Math.Between(0, 1) === 1) {
            const zoneX = spawnX + 100;
            const zoneY = Phaser.Math.Between(50, groundTop - safeGap - 100);
            const zoneType = Phaser.Math.Between(0, 1) === 0 ? 'updraft' : 'downdraft';
            const forceY = zoneType === 'updraft' ? -2 : 2;

            const windZone = this.windZones.create(zoneX, zoneY, 'wind');
            windZone.setSize(80, 100);
            windZone.setData('forceY', forceY);
            windZone.setAlpha(0.3);
            windZone.setImmovable(true);
        }

        // Generate random collectibles
        if (Phaser.Math.Between(0, 1) === 1) {
            const collectX = spawnX + Phaser.Math.Between(0, 200);
            const collectY = Phaser.Math.Between(50, groundTop - safeGap);
            const star = this.collectibles.create(collectX, collectY, 'star');
            star.setScale(0.3);
            star.setData('points', Phaser.Math.Between(0, 9) === 0 ? 50 : 10);
        }
    }

    updateDifficulty() {
        this.difficultyLevel++;
    }

    update() {
        if (this.gameState !== 'playing') return;

        const deltaTime = this.game.loop.delta;

        // Keep ground width in sync with camera size and scroll position
        this.ground.width = this.cameras.main.width;
        this.ground.tilePositionX = this.cameras.main.scrollX;

        // Distance / time tracking
        this.gameTime += deltaTime;
        this.distance = this.glider.x * 0.05;
        this.events.emit('updateDistance', this.distance);

        // Physics & forces
        this.updateGliderPhysics(deltaTime);
        if (this.windController.strength > 0) {
            this.applyWindForces(deltaTime);
        }

        // NOTE: ground collisions handled by the static collider set up in create()

        // Wind‑zone overlap
        this.physics.overlap(this.glider, this.windZones, this.handleWindZoneCollision, null, this);

        // Star collection by distance check
        const stars = this.collectibles.getChildren();
        for (let i = 0; i < stars.length; i++) {
            const star = stars[i];
            if (star.active && star.x > this.cameras.main.scrollX - 100 && star.x < this.cameras.main.scrollX + this.cameras.main.width + 100) {
                const d = Phaser.Math.Distance.Between(this.glider.x, this.glider.y, star.x, star.y);
                if (d < 30) {
                    this.handleCollectibleCollision(this.glider, star);
                    break;
                }
            }
        }

        // Spawn more level ahead of the player
        if (this.glider.x > this.lastSpawnX - MIN_HORIZONTAL_GAP) {
            this.generateLevel();
        }

        // Clean‑up off‑screen objects
        this.cleanupObjects();

        // Vertical out‑of‑bounds check
        if (this.glider.y < 0 || this.glider.y > this.cameras.main.height) {
            this.gameOver();
        }
    }

    updateGliderPhysics(deltaTime) {
        // Maintain forward momentum - gliders should always move forward
        const minForwardSpeed = 80;
        if (this.glider.body.velocity.x < minForwardSpeed) {
            this.glider.body.velocity.x = minForwardSpeed;
        }

        // Apply gravity more realistically
        const gravity = 0.3 * deltaTime * 0.1;
        this.glider.body.velocity.y += gravity;

        // Calculate angle based on velocity for realistic orientation
        const velocityAngle = Math.atan2(this.glider.body.velocity.y, this.glider.body.velocity.x);
        const targetAngle = Phaser.Math.RadToDeg(velocityAngle);
        
        // Smoothly rotate to match velocity direction
        this.glider.angle = Phaser.Math.Linear(this.glider.angle, targetAngle, 0.08);

        // Add slight lift based on forward speed (glider aerodynamics)
        const forwardSpeed = this.glider.body.velocity.x;
        const liftFactor = Math.max(0, (forwardSpeed - 50) / 200); // More speed = more potential lift
        const angleRad = Phaser.Math.DegToRad(this.glider.angle);
        
        // Generate lift when glider is angled upward and has speed
        if (this.glider.angle < -5 && this.glider.angle > -45) {
            const lift = liftFactor * Math.abs(Math.sin(angleRad)) * 0.5;
            this.glider.body.velocity.y -= lift;
        }

        // Air resistance increases with speed
        const airResistance = Math.pow(this.glider.body.velocity.length() / 300, 2) * 0.98;
        this.glider.body.drag = Math.max(0.985, 1 - airResistance);
    }

    applyWindForces(deltaTime) {
        // Wind should influence the glider more directly
        const windX = Math.cos(this.windController.direction) * this.windController.strength;
        const windY = Math.sin(this.windController.direction) * this.windController.strength;
        
        // Apply wind as direct velocity change for more immediate response
        const windForce = 0.05; // Increased for more immediate effect
        this.glider.body.velocity.x += windX * windForce;
        this.glider.body.velocity.y += windY * windForce;
        
        // Wind affects rotation more directly
        const angleToWind = Phaser.Math.Angle.ShortestBetween(
            this.glider.angle,
            Phaser.Math.RadToDeg(this.windController.direction)
        );
        
        // Apply rotational force more aggressively
        if (this.windController.strength > 20) {
            const rotationalInfluence = (angleToWind / 180) * (this.windController.strength / 200) * 0.8;
            this.glider.body.angularVelocity += rotationalInfluence;
        }

        // Wind strength decays over time
        this.windController.strength *= 0.95;
    }

    handleGroundCollision() {
        this.gameOver();
    }

    handleObstacleCollision(glider, obstacle) {
        // Destroy the obstacle that was hit
        obstacle.destroy();
        
        this.lives--;
        this.events.emit('updateLives', this.lives);

        if (this.lives <= 0) {
            this.gameOver();
        } else {
            // More realistic collision response
            this.glider.body.velocity.x = Math.max(50, this.glider.body.velocity.x * 0.3);
            this.glider.body.velocity.y = -Math.abs(this.glider.body.velocity.y) * 0.7;
            this.glider.x -= 15;
            
            // Add a brief invincibility period
            this.glider.setAlpha(0.5);
            this.time.delayedCall(1000, () => {
                this.glider.setAlpha(1);
            });
        }
    }

    handleCollectibleCollision(glider, collectible) {
        if (!collectible.active) return;
        
        const points = collectible.getData('points');
        this.score += points;
        this.events.emit('updateScore', this.score);

        // Create star burst effect using the new particle system
        const particles = this.add.particles(collectible.x, collectible.y, 'star', {
            speed: { min: 50, max: 100 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.3, end: 0 },
            lifespan: 500,
            quantity: 5,
            frequency: 50
        });

        // Destroy the collectible
        collectible.destroy();

        // Clean up particles after animation
        this.time.delayedCall(500, () => {
            particles.destroy();
        });
    }

    handleWindZoneCollision(glider, zone) {
        const forceY = zone.getData('forceY');
        glider.body.velocity.y += forceY * 0.1;
    }

    cleanupObjects() {
        const cameraX = this.cameras.main.scrollX;

        this.obstacles.getChildren().forEach(obstacle => {
            if (obstacle.x + obstacle.width < cameraX - 100) { // Off-screen to the left
                obstacle.destroy();
            }
        });

        this.collectibles.getChildren().forEach(collectible => {
            if (collectible.x < cameraX - 100) { // Off-screen to the left
                collectible.destroy();
            }
        });

        this.windZones.getChildren().forEach(zone => {
            if (zone.x + zone.width < cameraX - 100) { // Off-screen to the left
                zone.destroy();
            }
        });
    }

    gameOver() {
        this.gameState = 'gameOver';
        this.events.emit('gameOver', this.score, this.distance);
    }
}