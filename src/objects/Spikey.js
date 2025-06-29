import Phaser from 'phaser';

export default class Spikey {
    constructor(scene, x, y) {
        this.scene = scene;
        this.sprite = scene.physics.add.sprite(x, y, 'spikey');
        this.sprite.setCircle(24).setBounce(1, 1).setCollideWorldBounds(false);
        this.sprite.setData('spin', Phaser.Math.Between(-4, 4) || 2);
        this.sprite.setData('vy', Phaser.Math.Between(-60, 60) || 40);
    }
    get x() { return this.sprite.x; }
    get y() { return this.sprite.y; }
    set x(val) { this.sprite.x = val; }
    set y(val) { this.sprite.y = val; }
    get body() { return this.sprite.body; }
    destroy() { this.sprite.destroy(); }
} 