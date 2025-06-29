import Phaser from 'phaser';

export default class Glider {
    constructor(scene, x, y) {
        this.scene = scene;
        this.sprite = scene.physics.add.sprite(x, y, 'glider');
        this.sprite.setDisplaySize(96, 48).setOrigin(0.5);
        this.sprite.clearTint();
        const body = this.sprite.body;
        body.setBounce(0.1)
            .setDrag(0.985)
            .setMaxVelocity(400, 300)
            .setAngularDrag(0.8);
        body.velocity.x = 100;
    }

    get x() { return this.sprite.x; }
    get y() { return this.sprite.y; }
    set x(val) { this.sprite.x = val; }
    set y(val) { this.sprite.y = val; }
    get body() { return this.sprite.body; }
    setTint(color) { this.sprite.setTint(color); }
    clearTint() { this.sprite.clearTint(); }
    set angle(a) { this.sprite.angle = a; }
    get angle() { return this.sprite.angle; }
    setAlpha(a) { this.sprite.setAlpha(a); }
    setDepth(d) { this.sprite.setDepth(d); }
    destroy() { this.sprite.destroy(); }
} 