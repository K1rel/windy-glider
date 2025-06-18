const fs = require('fs');
const { createCanvas } = require('canvas');

// Create assets directory if it doesn't exist
if (!fs.existsSync('./src/assets')) {
    fs.mkdirSync('./src/assets', { recursive: true });
}

// Generate glider
const gliderCanvas = createCanvas(64, 32);
const gliderCtx = gliderCanvas.getContext('2d');
gliderCtx.fillStyle = '#FFFFFF';
gliderCtx.fillRect(0, 0, 64, 32);
gliderCtx.fillStyle = '#CCCCCC';
gliderCtx.fillRect(5, 2, 54, 2);
gliderCtx.fillRect(5, 28, 54, 2);
gliderCtx.fillStyle = '#AAAAAA';
gliderCtx.fillRect(0, 0, 3, 4);
gliderCtx.fillRect(0, 28, 3, 4);
fs.writeFileSync('./src/assets/glider.png', gliderCanvas.toBuffer());

// Generate obstacle
const obstacleCanvas = createCanvas(60, 200);
const obstacleCtx = obstacleCanvas.getContext('2d');
obstacleCtx.fillStyle = '#8B4513';
obstacleCtx.fillRect(0, 0, 60, 200);
obstacleCtx.fillStyle = '#654321';
for (let i = 0; i < 200; i += 20) {
    obstacleCtx.fillRect(5, i, 50, 2);
}
fs.writeFileSync('./src/assets/obstacle.png', obstacleCanvas.toBuffer());

// Generate star
const starCanvas = createCanvas(40, 40);
const starCtx = starCanvas.getContext('2d');
starCtx.fillStyle = '#FFD700';
starCtx.beginPath();
for (let i = 0; i < 5; i++) {
    const angle = (i * 2 * Math.PI) / 5;
    const x = Math.cos(angle) * 20 + 20;
    const y = Math.sin(angle) * 20 + 20;
    if (i === 0) starCtx.moveTo(x, y);
    else starCtx.lineTo(x, y);
    
    const innerAngle = ((i + 0.5) * 2 * Math.PI) / 5;
    const innerX = Math.cos(innerAngle) * 10 + 20;
    const innerY = Math.sin(innerAngle) * 10 + 20;
    starCtx.lineTo(innerX, innerY);
}
starCtx.closePath();
starCtx.fill();
fs.writeFileSync('./src/assets/star.png', starCanvas.toBuffer());

// Generate wind
const windCanvas = createCanvas(32, 32);
const windCtx = windCanvas.getContext('2d');
windCtx.fillStyle = 'rgba(255, 255, 255, 0.5)';
windCtx.beginPath();
windCtx.moveTo(0, 16);
windCtx.lineTo(32, 16);
windCtx.lineTo(24, 8);
windCtx.lineTo(32, 16);
windCtx.lineTo(24, 24);
windCtx.closePath();
windCtx.fill();
fs.writeFileSync('./src/assets/wind.png', windCanvas.toBuffer());

// Generate ground
const groundCanvas = createCanvas(64, 50);
const groundCtx = groundCanvas.getContext('2d');
groundCtx.fillStyle = '#228B22';
groundCtx.fillRect(0, 0, 64, 50);
groundCtx.fillStyle = '#32CD32';
for (let x = 0; x < 64; x += 10) {
    groundCtx.fillRect(x, 0, 2, Math.random() * 10 + 5);
}
fs.writeFileSync('./src/assets/ground.png', groundCanvas.toBuffer());

// Generate cloud
const cloudCanvas = createCanvas(100, 50);
const cloudCtx = cloudCanvas.getContext('2d');
cloudCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
cloudCtx.beginPath();
cloudCtx.arc(25, 25, 20, 0, Math.PI * 2);
cloudCtx.arc(50, 25, 25, 0, Math.PI * 2);
cloudCtx.arc(75, 25, 20, 0, Math.PI * 2);
cloudCtx.fill();
fs.writeFileSync('./src/assets/cloud.png', cloudCanvas.toBuffer());

// Generate spikey ball (more metallic, dangerous)
const spikeyCanvas = createCanvas(48, 48);
const spikeyCtx = spikeyCanvas.getContext('2d');
spikeyCtx.save();
spikeyCtx.translate(24, 24);
spikeyCtx.strokeStyle = '#222';
spikeyCtx.lineWidth = 3;
for (let i = 0; i < 16; i++) {
    const angle = (i * 2 * Math.PI) / 16;
    spikeyCtx.beginPath();
    spikeyCtx.moveTo(Math.cos(angle) * 16, Math.sin(angle) * 16);
    spikeyCtx.lineTo(Math.cos(angle) * 23, Math.sin(angle) * 23);
    spikeyCtx.stroke();
}
spikeyCtx.restore();
// Ball body
const grad = spikeyCtx.createRadialGradient(24, 24, 4, 24, 24, 16);
grad.addColorStop(0, '#eee');
grad.addColorStop(0.5, '#aaa');
grad.addColorStop(1, '#444');
spikeyCtx.beginPath();
spikeyCtx.arc(24, 24, 15, 0, Math.PI * 2);
spikeyCtx.fillStyle = grad;
spikeyCtx.fill();
spikeyCtx.lineWidth = 2;
spikeyCtx.strokeStyle = '#333';
spikeyCtx.stroke();
// Add a few red dots for danger
spikeyCtx.fillStyle = '#f44';
spikeyCtx.beginPath();
spikeyCtx.arc(32, 18, 2, 0, Math.PI * 2);
spikeyCtx.arc(18, 30, 1.5, 0, Math.PI * 2);
spikeyCtx.arc(28, 32, 1.2, 0, Math.PI * 2);
spikeyCtx.fill();
fs.writeFileSync('./src/assets/spikey.png', spikeyCanvas.toBuffer());

// Generate laser (Jetpack Joyride style)
const laserCanvas = createCanvas(120, 32);
const laserCtx = laserCanvas.getContext('2d');
// Emitter (left)
laserCtx.save();
laserCtx.translate(16, 16);
laserCtx.beginPath();
laserCtx.arc(0, 0, 12, 0, Math.PI * 2);
laserCtx.fillStyle = '#888';
laserCtx.fill();
laserCtx.lineWidth = 3;
laserCtx.strokeStyle = '#333';
laserCtx.stroke();
// Inner emitter
laserCtx.beginPath();
laserCtx.arc(0, 0, 7, 0, Math.PI * 2);
laserCtx.fillStyle = '#222';
laserCtx.fill();
// Yellow warning ring
laserCtx.beginPath();
laserCtx.arc(0, 0, 10, 0, Math.PI * 2);
laserCtx.strokeStyle = '#ff0';
laserCtx.lineWidth = 2;
laserCtx.stroke();
laserCtx.restore();
// Laser beam (glow)
const beamGrad = laserCtx.createLinearGradient(16, 16, 120, 16);
beamGrad.addColorStop(0, 'rgba(255,0,0,0.8)');
beamGrad.addColorStop(0.2, 'rgba(255,0,0,0.5)');
beamGrad.addColorStop(1, 'rgba(255,0,0,0.1)');
laserCtx.save();
laserCtx.globalAlpha = 0.7;
laserCtx.beginPath();
laserCtx.moveTo(16, 8);
laserCtx.lineTo(120, 8);
laserCtx.lineTo(120, 24);
laserCtx.lineTo(16, 24);
laserCtx.closePath();
laserCtx.fillStyle = beamGrad;
laserCtx.fill();
laserCtx.restore();
// Laser beam (core)
laserCtx.save();
laserCtx.beginPath();
laserCtx.moveTo(16, 14);
laserCtx.lineTo(120, 14);
laserCtx.lineTo(120, 18);
laserCtx.lineTo(16, 18);
laserCtx.closePath();
laserCtx.fillStyle = '#ff2222';
laserCtx.shadowColor = '#ff2222';
laserCtx.shadowBlur = 8;
laserCtx.fill();
laserCtx.restore();
fs.writeFileSync('./src/assets/laser.png', laserCanvas.toBuffer());

// Generate cartoon bird
const birdCanvas = createCanvas(48, 32);
const birdCtx = birdCanvas.getContext('2d');
// Body
const birdGrad = birdCtx.createLinearGradient(0, 0, 48, 32);
birdGrad.addColorStop(0, '#6cf');
birdGrad.addColorStop(1, '#36a');
birdCtx.beginPath();
birdCtx.ellipse(24, 18, 14, 9, 0, 0, Math.PI * 2);
birdCtx.fillStyle = birdGrad;
birdCtx.fill();
// Wing
birdCtx.save();
birdCtx.translate(24, 18);
birdCtx.rotate(-0.3);
birdCtx.beginPath();
birdCtx.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2);
birdCtx.fillStyle = '#48a';
birdCtx.fill();
birdCtx.restore();
// Beak
birdCtx.beginPath();
birdCtx.moveTo(36, 18);
birdCtx.lineTo(44, 16);
birdCtx.lineTo(44, 20);
birdCtx.closePath();
birdCtx.fillStyle = '#fc3';
birdCtx.fill();
// Eye
birdCtx.beginPath();
birdCtx.arc(32, 15, 2, 0, Math.PI * 2);
birdCtx.fillStyle = '#fff';
birdCtx.fill();
birdCtx.beginPath();
birdCtx.arc(32, 15, 1, 0, Math.PI * 2);
birdCtx.fillStyle = '#222';
birdCtx.fill();
fs.writeFileSync('./src/assets/bird.png', birdCanvas.toBuffer());

console.log('Assets generated successfully!'); 