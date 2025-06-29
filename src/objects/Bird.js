import Phaser from 'phaser';

export default class Bird {
    constructor(scene, x, y) {
        this.scene = scene;
        this.sprite = scene.physics.add.sprite(x, y, 'bird');
        this.sprite.setVelocityX(-Phaser.Math.Between(120, 200));
        this.sprite.setData('flap', 0);
    }
    get x() { return this.sprite.x; }
    get y() { return this.sprite.y; }
    set x(val) { this.sprite.x = val; }
    set y(val) { this.sprite.y = val; }
    get body() { return this.sprite.body; }
    destroy() { this.sprite.destroy(); }
} 