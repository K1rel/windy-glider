// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

// Game variables
let game = new Phaser.Game(config);
let glider;
let obstacles;
let stars;
let windParticles;
let score = 0;
let distance = 0;
let lives = 3;
let gameOver = false;
let windPower = 0;
let windDirection = 1;
let windTimer = 0;

// Preload game assets
function preload() {
    // Load images
    this.load.image('glider', 'assets/glider.png');
    this.load.image('obstacle', 'assets/obstacle.png');
    this.load.image('star', 'assets/star.png');
    this.load.image('wind', 'assets/wind.png');
}

// Create game objects
function create() {
    // Create glider
    glider = this.physics.add.sprite(200, 300, 'glider');
    glider.setScale(0.5);
    glider.setCollideWorldBounds(true);
    
    // Create obstacle group
    obstacles = this.physics.add.group();
    
    // Create star group
    stars = this.physics.add.group();
    
    // Create wind particles
    windParticles = this.add.particles('wind');
    
    // Set up collisions
    this.physics.add.collider(glider, obstacles, hitObstacle, null, this);
    this.physics.add.overlap(glider, stars, collectStar, null, this);
    
    // Set up input
    this.input.on('pointerdown', createWindGust, this);
    
    // Start spawning obstacles and stars
    this.time.addEvent({
        delay: 2000,
        callback: spawnObstacle,
        callbackScope: this,
        loop: true
    });
    
    this.time.addEvent({
        delay: 3000,
        callback: spawnStar,
        callbackScope: this,
        loop: true
    });
}

// Update game state
function update() {
    if (gameOver) return;
    
    // Update distance
    distance += 0.1;
    document.getElementById('distance').textContent = Math.floor(distance);
    
    // Update wind power
    windTimer += 0.016;
    if (windTimer >= 0.1) {
        windPower = Math.max(0, windPower - 0.5);
        windTimer = 0;
    }
    
    // Update wind meter
    document.getElementById('windFill').style.width = (windPower / 100) * 100 + '%';
    
    // Apply wind force to glider
    if (windPower > 0) {
        glider.setVelocityY(-windPower * windDirection);
    }
    
    // Rotate glider based on velocity
    glider.angle = glider.body.velocity.y * 0.1;
    
    // Move obstacles and stars
    obstacles.getChildren().forEach(obstacle => {
        obstacle.x -= 2;
        if (obstacle.x < -50) {
            obstacle.destroy();
        }
    });
    
    stars.getChildren().forEach(star => {
        star.x -= 2;
        if (star.x < -50) {
            star.destroy();
        }
    });
}

// Create wind gust
function createWindGust(pointer) {
    if (gameOver) return;
    // Calculate wind direction based on click position relative to glider
    const clickY = pointer.y;
    const gliderY = glider.y;
    if (clickY < gliderY) {
        // Clicked above: apply upward force
        glider.body.velocity.y -= 150;
    } else {
        // Clicked below: apply downward force
        glider.body.velocity.y += 150;
    }
    // Optionally, add a small left/right nudge if clicking left/right of glider
    if (pointer.x < glider.x - 10) {
        glider.body.velocity.x -= 50;
    } else if (pointer.x > glider.x + 10) {
        glider.body.velocity.x += 50;
    }
    // Create wind particles as before
    const emitter = windParticles.createEmitter({
        x: glider.x,
        y: glider.y,
        speed: { min: 50, max: 100 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.5, end: 0 },
        lifespan: 1000,
        quantity: 10
    });
    emitter.setPosition(glider.x, glider.y);
    emitter.setSpeed(100);
    emitter.setAngle(clickY < gliderY ? 270 : 90);
    this.time.delayedCall(200, () => {
        emitter.stop();
        this.time.delayedCall(1000, () => {
            emitter.destroy();
        });
    });
}

// Spawn obstacle
function spawnObstacle() {
    if (gameOver) return;
    
    const y = Phaser.Math.Between(100, config.height - 100);
    const obstacle = obstacles.create(config.width + 50, y, 'obstacle');
    obstacle.setScale(0.5);
    obstacle.setImmovable(true);
}

// Spawn star
function spawnStar() {
    if (gameOver) return;
    
    const y = Phaser.Math.Between(100, config.height - 100);
    const star = stars.create(config.width + 50, y, 'star');
    star.setScale(0.3);
}

// Handle obstacle collision
function hitObstacle(glider, obstacle) {
    obstacle.destroy();
    lives--;
    document.getElementById('lives').textContent = lives;
    
    // Flash the glider
    this.tweens.add({
        targets: glider,
        alpha: 0.5,
        duration: 100,
        yoyo: true,
        repeat: 3
    });
    
    if (lives <= 0) {
        endGame();
    }
}

// Handle star collection
function collectStar(glider, star) {
    star.destroy();
    score += 10;
    document.getElementById('score').textContent = score;
    
    // Create collection effect
    const particles = this.add.particles('star');
    const emitter = particles.createEmitter({
        x: star.x,
        y: star.y,
        speed: { min: 50, max: 100 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.3, end: 0 },
        lifespan: 1000,
        quantity: 10
    });
    
    this.time.delayedCall(1000, () => {
        particles.destroy();
    });
}

// End game
function endGame() {
    gameOver = true;
    document.getElementById('gameOver').style.display = 'block';
    document.getElementById('finalScore').textContent = score;
    document.getElementById('finalDistance').textContent = Math.floor(distance);
    
    // Add restart button functionality
    document.getElementById('restartBtn').onclick = () => {
        location.reload();
    };
} 