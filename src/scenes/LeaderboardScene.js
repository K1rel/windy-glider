import Phaser from 'phaser';
import { getLeaderboard, saveLeaderboard, MAX_ENTRIES } from '../utils/leaderboard';

export default class LeaderboardScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LeaderboardScene' });
    }

    init(data = {}) {
        this.finalScore = (data && typeof data.score === 'number') ? data.score : 0;
        this.finalDistance = (data && typeof data.distance === 'number') ? Math.floor(data.distance) : 0;
    }

    create() {
        const { width, height } = this.scale;
        const uiDepth = 10000;
        // Add text shadow for all text elements
        const textStyle = {
            fontSize: '36px',
            color: '#fff',
            fontFamily: 'sans-serif',
            stroke: '#222',
            strokeThickness: 6,
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#000',
                blur: 4,
                fill: true
            }
        };
        this.add.text(width/2, 80, '🏆 Leaderboard', textStyle).setOrigin(0.5).setDepth(uiDepth);

        // Subtle shadow for smaller text
        const smallTextStyle = {
            fontSize: '22px',
            color: '#fff',
            fontFamily: 'sans-serif',
            stroke: '#222',
            strokeThickness: 4,
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#000',
                blur: 4,
                fill: true
            }
        };
        this.scoreText = this.add.text(width/2, 130, `Your Score: ${this.finalScore}   Distance: ${this.finalDistance}m`, smallTextStyle).setOrigin(0.5).setDepth(uiDepth);

        // Style for DOM elements: glassy/blurred background
        const domStyle = [
            'font-size: 24px;',
            'width: 220px;',
            'padding: 8px;',
            'border-radius: 8px;',
            'border: none;',
            'background: rgba(255,255,255,0.65);',
            'backdrop-filter: blur(4px);',
            'box-shadow: 0 2px 12px rgba(0,0,0,0.12);',
            'outline: none;',
            'margin-bottom: 8px;',
            'color: #222;',
            'text-align: center;'
        ].join(' ');
        this.nameInput = this.add.dom(width/2, 170, 'input', domStyle, '').setOrigin(0.5).setDepth(uiDepth);
        this.nameInput.node.placeholder = 'Enter your name';
        const btnStyle = [
            'font-size: 22px;',
            'padding: 8px 24px;',
            'border-radius: 8px;',
            'border: none;',
            'background: rgba(255,255,255,0.75);',
            'backdrop-filter: blur(4px);',
            'box-shadow: 0 2px 12px rgba(0,0,0,0.12);',
            'cursor:pointer;',
            'color: #222;',
            'font-weight: bold;',
            'margin-bottom: 8px;'
        ].join(' ');
        this.submitBtn = this.add.dom(width/2, 220, 'button', btnStyle, 'Submit').setOrigin(0.5).setDepth(uiDepth);

        this.submitBtn.addListener('click');
        this.submitBtn.on('click', () => this.submitScore());

        // Leaderboard text with shadow
        const monoTextStyle = {
            fontSize: '22px',
            color: '#fff',
            fontFamily: 'monospace',
            align: 'center',
            stroke: '#222',
            strokeThickness: 4,
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#000',
                blur: 4,
                fill: true
            }
        };
        this.leaderboardText = this.add.text(width/2, 270, '', monoTextStyle).setOrigin(0.5, 0).setDepth(uiDepth);
        this.playAgainBtn = this.add.dom(width/2, height - 60, 'button', btnStyle + ' display:none;', 'Play Again').setOrigin(0.5).setDepth(uiDepth);
        this.playAgainBtn.addListener('click');
        this.playAgainBtn.on('click', () => {
            this.scene.start('GameScene');
        });

        this.showLeaderboard();
    }

    submitScore() {
        const name = this.nameInput.node.value.trim().substring(0, 16) || 'Anonymous';
        let leaderboard = getLeaderboard();
        leaderboard.push({ name, score: this.finalScore, distance: this.finalDistance });
        leaderboard = leaderboard.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return b.distance - a.distance;
        }).slice(0, MAX_ENTRIES);
        saveLeaderboard(leaderboard);
        this.showLeaderboard(true);
    }

    showLeaderboard(submitted = false) {
        const leaderboard = getLeaderboard();
        let text = 'Rank   Name               Score   Distance\n';
        text += '---------------------------------------------\n';
        leaderboard.forEach((entry, i) => {
            const rank = (i+1).toString().padEnd(5);
            const name = entry.name.padEnd(18);
            const score = entry.score.toString().padStart(5);
            const dist = (entry.distance !== undefined ? entry.distance : 0).toString().padStart(7) + 'm';
            text += `${rank}${name}${score}   ${dist}\n`;
        });
        if (leaderboard.length === 0) text += '\nNo scores yet!';
        this.leaderboardText.setText(text);

        if (submitted) {
            this.nameInput.setVisible(false);
            this.submitBtn.setVisible(false);
            this.playAgainBtn.node.style.display = '';
        } else {
            this.nameInput.setVisible(true);
            this.submitBtn.setVisible(true);
            this.playAgainBtn.node.style.display = 'none';
        }
    }
} 