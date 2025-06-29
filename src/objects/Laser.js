import Phaser from 'phaser';

export default class Laser {
    constructor(scene, x, y) {
        this.scene = scene;
        this.sprite = scene.physics.add.sprite(x, y, 'laser');
        this.sprite.setImmovable(true);
        this.sprite.setData('timer', 0);
        this.sprite.setData('active', true);
        this.sprite.setAlpha(1);
    }
    get x() { return this.sprite.x; }
    get y() { return this.sprite.y; }
    set x(val) { this.sprite.x = val; }
    set y(val) { this.sprite.y = val; }
    get body() { return this.sprite.body; }
    destroy() { this.sprite.destroy(); }
} 