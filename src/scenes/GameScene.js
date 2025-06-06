import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    create() {
        // Game state
        this.score = 0;
        this.lives = 3;
        this.distance = 0;
        this.gameTime = 0;
        this.difficultyLevel = 1;
        this.gameState = 'playing';

        // Create background
        this.createBackground();

        // Create ground
        this.createGround();

        // Create glider
        this.createGlider();

        // Create groups for game objects
        this.obstacles = this.physics.add.group();
        this.collectibles = this.physics.add.group();
        this.windZones = this.physics.add.group();
        this.particles = this.physics.add.group();

        // Wind system
        this.windController = {
            strength: 0,
            direction: 0,
            cooldown: 0,
            maxCooldown: 1000,
            canCreateWind: true
        };

        // Input handling
        this.input.on('pointerdown', this.handleClick, this);

        // Start UI scene
        this.scene.launch('UIScene');

        // Generate initial level
        this.generateLevel();

        // Start game loop
        this.time.addEvent({
            delay: 1000,
            callback: this.updateDifficulty,
            callbackScope: this,
            loop: true
        });
    }

    createBackground() {
        // Create sky gradient
        const sky = this.add.graphics();
        const gradient = sky.createLinearGradient(0, 0, 0, this.cameras.main.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(0.5, '#E0F6FF');
        gradient.addColorStop(1, '#87CEEB');
        sky.fillStyle(gradient);
        sky.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);

        // Add clouds
        for (let i = 0; i < 10; i++) {
            const cloud = this.add.image(
                Phaser.Math.Between(0, this.cameras.main.width),
                Phaser.Math.Between(0, this.cameras.main.height / 2),
                'cloud'
            );
            cloud.setAlpha(0.3);
            cloud.setScale(Phaser.Math.FloatBetween(0.5, 1.5));
            this.tweens.add({
                targets: cloud,
                x: this.cameras.main.width + cloud.width,
                duration: Phaser.Math.Between(20000, 40000),
                ease: 'Linear',
                repeat: -1
            });
        }
    }

    createGround() {
        this.ground = this.add.tileSprite(
            0,
            this.cameras.main.height - 50,
            this.cameras.main.width,
            50,
            'ground'
        );
        this.ground.setOrigin(0, 0);
        this.physics.add.existing(this.ground, true);
    }

    createGlider() {
        this.glider = this.physics.add.sprite(200, this.cameras.main.height / 2, 'glider');
        this.glider.setScale(0.5);
        this.glider.setCollideWorldBounds(true);
        this.glider.body.setBounce(0.2);
        this.glider.body.setDrag(0.98);
        this.glider.body.setMaxVelocity(8);
    }

    handleClick(pointer) {
        if (!this.windController.canCreateWind || this.gameState !== 'playing') return;

        const dx = pointer.x - this.glider.x;
        const dy = pointer.y - this.glider.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        this.windController.direction = Math.atan2(dy, dx);
        this.windController.strength = Math.min(15, distance * 0.03);
        this.windController.canCreateWind = false;
        this.windController.cooldown = this.windController.maxCooldown;

        // Create wind particles
        for (let i = 0; i < 10; i++) {
            const particle = this.particles.create(
                this.glider.x + Phaser.Math.Between(-20, 20),
                this.glider.y + Phaser.Math.Between(-20, 20),
                'wind'
            );
            particle.setScale(Phaser.Math.FloatBetween(0.2, 0.5));
            particle.setAlpha(0.5);
            particle.setVelocity(
                Math.cos(this.windController.direction) * (Phaser.Math.Between(2, 5)),
                Math.sin(this.windController.direction) * (Phaser.Math.Between(2, 5))
            );
            this.time.delayedCall(1000, () => particle.destroy());
        }

        // Emit wind update event
        this.events.emit('updateWind', this.windController.strength / 15);
    }

    generateLevel() {
        const startX = this.cameras.main.scrollX + this.cameras.main.width;

        // Generate obstacles
        if (Phaser.Math.Between(0, 1) === 1) {
            const gapSize = Math.max(120, 200 - this.difficultyLevel * 10);
            const centerY = Phaser.Math.Between(100, this.cameras.main.height - 100);

            // Upper obstacle
            const upperObstacle = this.obstacles.create(startX, 0, 'obstacle');
            upperObstacle.setSize(60, centerY - gapSize / 2);
            upperObstacle.setOrigin(0, 0);

            // Lower obstacle
            const lowerObstacle = this.obstacles.create(startX, centerY + gapSize / 2, 'obstacle');
            lowerObstacle.setSize(60, this.cameras.main.height - (centerY + gapSize / 2));
            lowerObstacle.setOrigin(0, 0);

            // Add collectible in gap
            if (Phaser.Math.Between(0, 1) === 1) {
                const star = this.collectibles.create(startX + 30, centerY, 'star');
                star.setScale(0.3);
                star.setData('points', 10);
            }
        }

        // Generate wind zones
        if (Phaser.Math.Between(0, 1) === 1) {
            const zoneX = startX + 100;
            const zoneY = Phaser.Math.Between(50, this.cameras.main.height - 150);
            const zoneType = Phaser.Math.Between(0, 1) === 0 ? 'updraft' : 'downdraft';
            const forceY = zoneType === 'updraft' ? -2 : 2;

            const windZone = this.windZones.create(zoneX, zoneY, 'wind');
            windZone.setSize(80, 100);
            windZone.setData('forceY', forceY);
            windZone.setAlpha(0.3);
        }

        // Generate random collectibles
        if (Phaser.Math.Between(0, 1) === 1) {
            const collectX = startX + Phaser.Math.Between(0, 200);
            const collectY = Phaser.Math.Between(50, this.cameras.main.height - 50);
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

        // Update game time and distance
        this.gameTime += deltaTime;
        this.distance = this.glider.x * 0.05;
        this.events.emit('updateDistance', this.distance);

        // Update wind controller
        if (this.windController.cooldown > 0) {
            this.windController.cooldown -= deltaTime;
            if (this.windController.cooldown <= 0) {
                this.windController.canCreateWind = true;
            }
        }

        // Apply wind force to glider
        if (this.windController.strength > 0) {
            const windForceX = Math.cos(this.windController.direction) * this.windController.strength * deltaTime * 0.001;
            const windForceY = Math.sin(this.windController.direction) * this.windController.strength * deltaTime * 0.001;

            this.glider.body.velocity.x += windForceX;
            this.glider.body.velocity.y += windForceY;

            this.windController.strength *= 0.95;
        }

        // Apply gravity
        this.glider.body.velocity.y += 0.3 * deltaTime * 0.001;

        // Update glider rotation based on velocity
        this.glider.angle = Phaser.Math.RadToDeg(Math.atan2(this.glider.body.velocity.y, this.glider.body.velocity.x));

        // Check collisions
        this.physics.collide(this.glider, this.ground, this.handleGroundCollision, null, this);
        this.physics.collide(this.glider, this.obstacles, this.handleObstacleCollision, null, this);
        this.physics.overlap(this.glider, this.collectibles, this.handleCollectibleCollision, null, this);
        this.physics.overlap(this.glider, this.windZones, this.handleWindZoneCollision, null, this);

        // Generate new level content
        if (this.glider.x > this.cameras.main.scrollX + this.cameras.main.width * 0.5) {
            this.generateLevel();
        }

        // Update camera
        this.cameras.main.scrollX = this.glider.x - this.cameras.main.width * 0.3;

        // Clean up off-screen objects
        this.cleanupObjects();
    }

    handleGroundCollision() {
        this.gameOver();
    }

    handleObstacleCollision() {
        this.lives--;
        this.events.emit('updateLives', this.lives);

        if (this.lives <= 0) {
            this.gameOver();
        } else {
            // Bounce back
            this.glider.body.velocity.x = -Math.abs(this.glider.body.velocity.x) * 0.5;
            this.glider.body.velocity.y = -this.glider.body.velocity.y * 0.5;
            this.glider.x -= 20;
        }
    }

    handleCollectibleCollision(glider, collectible) {
        const points = collectible.getData('points');
        this.score += points;
        this.events.emit('updateScore', this.score);

        // Create collection particles
        const particles = this.add.particles('star');
        const emitter = particles.createEmitter({
            x: collectible.x,
            y: collectible.y,
            speed: { min: 50, max: 100 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.3, end: 0 },
            lifespan: 1000,
            quantity: 10
        });

        // Destroy the collectible first
        collectible.destroy();

        // Clean up particles after animation
        this.time.delayedCall(1000, () => {
            emitter.stop();
            particles.destroy();
        });
    }

    handleWindZoneCollision(glider, zone) {
        const forceY = zone.getData('forceY');
        glider.body.velocity.y += forceY * 0.1;
    }

    cleanupObjects() {
        this.obstacles.getChildren().forEach(obstacle => {
            if (obstacle.x + obstacle.width < this.cameras.main.scrollX - 100) {
                obstacle.destroy();
            }
        });

        this.collectibles.getChildren().forEach(collectible => {
            if (collectible.x < this.cameras.main.scrollX - 100) {
                collectible.destroy();
            }
        });

        this.windZones.getChildren().forEach(zone => {
            if (zone.x + zone.width < this.cameras.main.scrollX - 100) {
                zone.destroy();
            }
        });
    }

    gameOver() {
        this.gameState = 'gameOver';
        this.events.emit('gameOver', this.score, this.distance);
    }
} 