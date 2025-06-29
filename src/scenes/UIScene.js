import Phaser from 'phaser';

export default class UIScene extends Phaser.Scene {
    constructor() {
        super('UIScene');
    }

    create() {
        // Create UI elements
        this.scoreText = this.add.text(20, 20, 'Score: 0', {
            fontSize: '24px',
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 4
        });

        this.distanceText = this.add.text(20, 50, 'Distance: 0m', {
            fontSize: '24px',
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 4
        });

        this.livesText = this.add.text(20, 80, 'Lives: 3', {
            fontSize: '24px',
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 4
        });

        // Create game over screen
        this.gameOverScreen = this.add.container(0, 0);
        this.gameOverScreen.setVisible(false);

        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.8);
        bg.fillRect(
            this.cameras.main.width / 2 - 200,
            this.cameras.main.height / 2 - 150,
            400,
            300
        );

        const gameOverText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 - 100,
            'Game Over!',
            {
                fontSize: '32px',
                fill: '#fff'
            }
        ).setOrigin(0.5);

        this.finalScoreText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 - 50,
            'Final Score: 0',
            {
                fontSize: '24px',
                fill: '#fff'
            }
        ).setOrigin(0.5);

        this.finalDistanceText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            'Distance Traveled: 0m',
            {
                fontSize: '24px',
                fill: '#fff'
            }
        ).setOrigin(0.5);

        const restartButton = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 + 50,
            'Play Again',
            {
                fontSize: '24px',
                fill: '#fff',
                backgroundColor: '#4CAF50',
                padding: {
                    x: 20,
                    y: 10
                }
            }
        )
        .setOrigin(0.5)
        .setInteractive();

        restartButton.on('pointerdown', () => {
            this.scene.start('GameScene');
        });

        this.gameOverScreen.add([bg, gameOverText, this.finalScoreText, this.finalDistanceText, restartButton]);

        // Listen for game events
        this.gameScene = this.scene.get('GameScene');
        this.gameScene.events.on('updateScore', this.updateScore, this);
        this.gameScene.events.on('updateDistance', this.updateDistance, this);
        this.gameScene.events.on('updateLives', this.updateLives, this);
        this.gameScene.events.on('gameOver', this.handleGameOver, this);
    }

    updateScore(score) {
        this.scoreText.setText(`Score: ${score}`);
    }

    updateDistance(distance) {
        this.distanceText.setText(`Distance: ${Math.floor(distance)}m`);
    }

    updateLives(lives) {
        this.livesText.setText(`Lives: ${lives}`);
    }

    handleGameOver(score, distance) {
        // Show leaderboard as overlay and pause game, do not stop GameScene
        this.scene.launch('LeaderboardScene', { score, distance });
        this.scene.bringToTop('LeaderboardScene');
        this.scene.pause('GameScene');
    }
} 