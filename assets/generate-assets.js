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

console.log('Assets generated successfully!'); 