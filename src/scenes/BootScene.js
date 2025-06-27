import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // Create loading bar
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);
        
        const loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - 50,
            text: 'Loading...',
            style: {
                font: '20px monospace',
                fill: '#ffffff'
            }
        });
        loadingText.setOrigin(0.5, 0.5);
        
        // Loading progress events
        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
        });
        
        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
        });
        
        // Load game assets
        this.load.image('glider', 'assets/paper_plane.png');
        this.load.image('obstacle', 'assets/obstacle.png');
        this.load.image('star', 'assets/star.png');
        this.load.image('wind', 'assets/wind.png');
        this.load.image('ground', 'assets/ground.png');
        this.load.image('cloud', 'assets/cloud.png');
        this.load.image('spikey', 'assets/spikey.png');
        this.load.image('laser', 'assets/laser.png');
        this.load.image('bird', 'assets/bird.png');
        this.load.image('heart', 'assets/heart.png');
        this.load.image('boost', 'assets/boost.png');
        this.load.image('strength', 'assets/strength.png');
        this.load.image('coin', 'assets/coin.png');
    }

    create() {
        this.scene.start('GameScene');
    }
} 