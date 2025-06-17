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
        this.lastSpawnX = 0; // Track last spawn position

        // Set world bounds first
        this.physics.world.setBounds(0, 0, 10000, this.cameras.main.height);

        // Create background
        this.createBackground();

        // Create ground
        this.createGround();

        // Create glider
        this.createGlider();

        // Create groups for game objects
        this.obstacles = this.physics.add.group();
        this.collectibles = this.add.group();
        this.windZones = this.physics.add.group();
        this.particles = this.physics.add.group();

        // Set up camera to follow glider
        this.cameras.main.setBounds(0, 0, 10000, this.cameras.main.height);
        this.cameras.main.startFollow(this.glider, true, 0.1, 0.1);
        this.cameras.main.setFollowOffset(-this.cameras.main.width / 4, 0);

        // Wind system - reduced direct control
        this.windController = {
            strength: 0,
            direction: 0,
            isSwiping: false,
            startX: 0,
            startY: 0,
            startTime: 0
        };

        // Input handling for swipe
        this.input.on('pointerdown', this.startSwipe, this);
        this.input.on('pointermove', this.updateSwipe, this);
        this.input.on('pointerup', this.endSwipe, this);

        // Start UI scene
        this.scene.launch('UIScene');

        // Generate initial level
        this.generateLevel();
        this.generateLevel(); // Generate second set for smoother start

        // Start game loop
        this.time.addEvent({
            delay: 1000,
            callback: this.updateDifficulty,
            callbackScope: this,
            loop: true
        });
    }

    createBackground() {
        // Create sky background that extends with the camera bounds
        const worldWidth = 10000; // Match camera bounds width
        const sky = this.add.graphics();
        sky.fillStyle(0x87ceeb, 1); // Sky blue
        sky.fillRect(0, 0, worldWidth, this.cameras.main.height);

        // Add clouds with proper world bounds
        for (let i = 0; i < 20; i++) { // Increased number of clouds
            const cloud = this.add.image(
                Phaser.Math.Between(0, worldWidth),
                Phaser.Math.Between(0, this.cameras.main.height / 2),
                'cloud'
            );
            cloud.setAlpha(0.3);
            cloud.setScale(Phaser.Math.FloatBetween(0.5, 1.5));
            this.tweens.add({
                targets: cloud,
                x: worldWidth + cloud.width,
                duration: Phaser.Math.Between(20000, 40000),
                ease: 'Linear',
                repeat: -1,
                yoyo: false
            });
        }
    }

    createGround() {
        // Create ground that extends with the camera bounds
        const worldWidth = 10000; // Match camera bounds width
        this.ground = this.add.tileSprite(
            0,
            this.cameras.main.height - 50,
            worldWidth,
            50,
            'ground'
        );
        this.ground.setOrigin(0, 0);
        this.physics.add.existing(this.ground, true);

        // Set world bounds to match the ground
        this.physics.world.setBounds(0, 0, worldWidth, this.cameras.main.height);
    }

    createGlider() {
        this.glider = this.physics.add.sprite(200, this.cameras.main.height / 2, 'glider');
        this.glider.setScale(0.5);
        this.glider.setCollideWorldBounds(true);
        
        // Improved glider physics for more realistic gliding
        this.glider.body.setBounce(0.1); // Reduced bounce for smoother feel
        this.glider.body.setDrag(0.985); // Slight air resistance
        this.glider.body.setMaxVelocity(400, 300); // Separate X and Y max velocities
        this.glider.body.setAngularDrag(0.8); // More angular resistance for stability
        
        // Initialize glider with forward momentum
        this.glider.body.velocity.x = 100;
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
        // Calculate spawn position based on last spawn
        const spawnX = Math.max(this.lastSpawnX, this.glider.x + this.cameras.main.width);
        this.lastSpawnX = spawnX + 400; // Set next spawn point

        // Generate obstacles
        if (Phaser.Math.Between(0, 1) === 1) {
            const gapSize = Math.max(120, 200 - this.difficultyLevel * 10);
            const centerY = Phaser.Math.Between(100, this.cameras.main.height - 100);

            // Upper obstacle
            const upperObstacle = this.obstacles.create(spawnX, 0, 'obstacle');
            upperObstacle.setSize(60, centerY - gapSize / 2);
            upperObstacle.setOrigin(0, 0);

            // Lower obstacle
            const lowerObstacle = this.obstacles.create(spawnX, centerY + gapSize / 2, 'obstacle');
            lowerObstacle.setSize(60, this.cameras.main.height - (centerY + gapSize / 2));
            lowerObstacle.setOrigin(0, 0);

            // Add collectible in gap
            if (Phaser.Math.Between(0, 1) === 1) {
                const star = this.collectibles.create(spawnX + 30, centerY, 'star');
                star.setScale(0.3);
                star.setData('points', 10);
            }
        }

        // Generate wind zones
        if (Phaser.Math.Between(0, 1) === 1) {
            const zoneX = spawnX + 100;
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
            const collectX = spawnX + Phaser.Math.Between(0, 200);
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

        this.gameTime += deltaTime;
        this.distance = this.glider.x * 0.05;
        this.events.emit('updateDistance', this.distance);

        // Improved glider physics
        this.updateGliderPhysics(deltaTime);

        // Apply wind effects more subtly
        if (this.windController.strength > 0) {
            this.applyWindForces(deltaTime);
        }

        // Check collisions
        this.physics.collide(this.glider, this.ground, this.handleGroundCollision, null, this);
        this.physics.collide(this.glider, this.obstacles, this.handleObstacleCollision, null, this);
        this.physics.overlap(this.glider, this.windZones, this.handleWindZoneCollision, null, this);

        // Check star collection using distance
        const stars = this.collectibles.getChildren();
        for (let i = 0; i < stars.length; i++) {
            const star = stars[i];
            if (star.active) {
                const distance = Phaser.Math.Distance.Between(
                    this.glider.x, this.glider.y,
                    star.x, star.y
                );
                if (distance < 30) {  // Collection radius
                    this.handleCollectibleCollision(this.glider, star);
                    break;
                }
            }
        }

        // Generate new level content when glider approaches the last spawn point
        if (this.glider.x > this.lastSpawnX - this.cameras.main.width) {
            this.generateLevel();
        }

        // Clean up off-screen objects
        this.cleanupObjects();
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
        console.log('Starting cleanup');
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
        console.log('Cleanup complete');
    }

    gameOver() {
        this.gameState = 'gameOver';
        this.events.emit('gameOver', this.score, this.distance);
    }
}