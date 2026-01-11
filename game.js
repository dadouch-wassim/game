class Ben10HeroicRun {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Éléments d'interface
        this.startScreen = document.getElementById('start-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.pauseScreen = document.getElementById('pause-screen');
        this.gameOverScreen = document.getElementById('game-over-screen');
        
        // Boutons
        this.startBtn = document.getElementById('start-btn');
        this.jumpBtn = document.getElementById('jump-btn');
        this.transformBtn = document.getElementById('transform-btn');
        this.pauseBtn = null; // Géré par clavier
        this.resumeBtn = document.getElementById('resume-btn');
        this.restartBtn = document.getElementById('restart-btn');
        this.quitBtn = document.getElementById('quit-btn');
        this.playAgainBtn = document.getElementById('play-again-btn');
        this.menuBtn = document.getElementById('menu-btn');
        
        // Éléments de score
        this.scoreElement = document.getElementById('score');
        this.coinsElement = document.getElementById('coins');
        this.distanceElement = document.getElementById('distance');
        this.highScoreElement = document.getElementById('high-score-value');
        
        // Sons
        this.sounds = {
            jump: document.getElementById('jump-sound'),
            transform: document.getElementById('transform-sound'),
            coin: document.getElementById('coin-sound'),
            gameOver: document.getElementById('game-over-sound'),
            background: document.getElementById('background-music')
        };
        
        // Variables de jeu
        this.gameState = 'menu'; // menu, playing, paused, gameover
        this.score = 0;
        this.coins = 0;
        this.distance = 0;
        this.highScore = localStorage.getItem('ben10_highscore') || 0;
        this.gameSpeed = 5;
        this.gameTime = 0;
        
        // Joueur
        this.player = {
            x: 100,
            y: 300,
            width: 80,
            height: 120,
            velocityY: 0,
            isJumping: false,
            currentAlien: 'heatblast',
            aliens: {
                heatblast: { unlocked: true, color: '#ff6b35', ability: 'fire' },
                xlr8: { unlocked: true, color: '#4287f5', ability: 'speed' },
                diamondhead: { unlocked: false, color: '#00ff88', ability: 'crystal' },
                fourarms: { unlocked: false, color: '#ff0000', ability: 'strength' },
                wildmutt: { unlocked: false, color: '#ff8800', ability: 'claws' },
                ghostfreak: { unlocked: false, color: '#9d4edd', ability: 'phase' }
            },
            energy: 100,
            cooldowns: {
                transform: 0,
                special: 0
            }
        };
        
        // Game objects
        this.obstacles = [];
        this.coinsList = [];
        this.background = {
            x: 0,
            speed: 2
        };
        
        // Initialisation
        this.init();
    }
    
    init() {
        // Configuration du canvas
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Événements
        this.startBtn.addEventListener('click', () => this.startGame());
        this.jumpBtn.addEventListener('click', () => this.jump());
        this.transformBtn.addEventListener('click', () => this.transform());
        this.resumeBtn.addEventListener('click', () => this.resumeGame());
        this.restartBtn.addEventListener('click', () => this.restartGame());
        this.quitBtn.addEventListener('click', () => this.quitToMenu());
        this.playAgainBtn.addEventListener('click', () => this.restartGame());
        this.menuBtn.addEventListener('click', () => this.quitToMenu());
        
        // Événements clavier
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Gestionnaire pour mobile
        document.getElementById('jump-btn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.jump();
        });
        
        document.getElementById('transform-mobile-btn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.transform();
        });
        
        // Instructions
        document.getElementById('instructions-btn').addEventListener('click', () => {
            document.getElementById('instructions-modal').classList.remove('hidden');
        });
        
        document.getElementById('close-instructions-btn').addEventListener('click', () => {
            document.getElementById('instructions-modal').classList.add('hidden');
        });
        
        // Initialisation des sons (fichiers seront ajoutés plus tard)
        this.initSounds();
        
        // Affichage du meilleur score
        this.highScoreElement.textContent = this.highScore;
        
        // Démarrage de la boucle de jeu
        this.gameLoop();
    }
    
    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight * 0.7;
    }
    
    initSounds() {
        // Les fichiers audio seront ajoutés dans le dossier assets/sounds/
        // Pour l'instant, on crée des audio objects par défaut
        Object.keys(this.sounds).forEach(key => {
            if (this.sounds[key]) {
                this.sounds[key].volume = 0.3;
            }
        });
    }
    
    startGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.coins = 0;
        this.distance = 0;
        this.gameSpeed = 5;
        this.gameTime = 0;
        this.obstacles = [];
        this.coinsList = [];
        
        // Réinitialiser le joueur
        this.player.x = 100;
        this.player.y = this.canvas.height - 150;
        this.player.velocityY = 0;
        this.player.isJumping = false;
        this.player.energy = 100;
        this.player.cooldowns.transform = 0;
        this.player.cooldowns.special = 0;
        
        // Cacher/montrer les écrans
        this.startScreen.classList.add('hidden');
        this.gameScreen.classList.remove('hidden');
        this.pauseScreen.classList.add('hidden');
        this.gameOverScreen.classList.add('hidden');
        
        // Démarrer la musique
        if (this.sounds.background) {
            this.sounds.background.play().catch(e => console.log('Audio autoplay blocked'));
        }
    }
    
    gameLoop() {
        // Effacer le canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Mettre à jour et dessiner selon l'état du jeu
        switch(this.gameState) {
            case 'playing':
                this.updateGame();
                this.drawGame();
                break;
            case 'paused':
                this.drawGame(); // Dessiner l'état actuel
                break;
            case 'gameover':
                this.drawGameOver();
                break;
        }
        
        // Demander la prochaine frame
        requestAnimationFrame(() => this.gameLoop());
    }
    
    updateGame() {
        // Mettre à jour le temps
        this.gameTime += 1/60;
        
        // Augmenter la difficulté avec le temps
        this.gameSpeed = 5 + Math.floor(this.gameTime / 30);
        
        // Mettre à jour la distance
        this.distance += this.gameSpeed / 10;
        
        // Mettre à jour le joueur
        this.updatePlayer();
        
        // Mettre à jour les obstacles
        this.updateObstacles();
        
        // Mettre à jour les pièces
        this.updateCoins();
        
        // Générer de nouveaux obstacles et pièces
        this.generateObjects();
        
        // Gérer les collisions
        this.checkCollisions();
        
        // Mettre à jour l'interface
        this.updateUI();
        
        // Refroidissement des capacités
        if (this.player.cooldowns.transform > 0) {
            this.player.cooldowns.transform -= 1/60;
        }
        if (this.player.cooldowns.special > 0) {
            this.player.cooldowns.special -= 1/60;
        }
    }
    
    updatePlayer() {
        // Gravité
        const gravity = 0.8;
        this.player.velocityY += gravity;
        
        // Mettre à jour la position Y
        this.player.y += this.player.velocityY;
        
        // Limites du sol
        const groundLevel = this.canvas.height - 150;
        if (this.player.y > groundLevel) {
            this.player.y = groundLevel;
            this.player.velocityY = 0;
            this.player.isJumping = false;
        }
        
        // Rechargement d'énergie
        if (!this.player.isJumping && this.player.energy < 100) {
            this.player.energy += 0.5;
        }
    }
    
    updateObstacles() {
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            obstacle.x -= this.gameSpeed;
            
            // Supprimer les obstacles hors écran
            if (obstacle.x + obstacle.width < 0) {
                this.obstacles.splice(i, 1);
                this.score += 10;
            }
        }
    }
    
    updateCoins() {
        for (let i = this.coinsList.length - 1; i >= 0; i--) {
            const coin = this.coinsList[i];
            coin.x -= this.gameSpeed;
            
            // Animation de rotation
            coin.rotation += 0.1;
            
            // Supprimer les pièces hors écran
            if (coin.x + coin.size < 0) {
                this.coinsList.splice(i, 1);
            }
        }
    }
    
    generateObjects() {
        // Générer des obstacles aléatoirement
        if (Math.random() < 0.02) { // 2% de chance par frame
            const types = ['rock', 'robot', 'laser'];
            const type = types[Math.floor(Math.random() * types.length)];
            
            const obstacle = {
                x: this.canvas.width,
                y: this.canvas.height - 150,
                width: 50 + Math.random() * 50,
                height: 50 + Math.random() * 100,
                type: type,
                color: this.getObstacleColor(type)
            };
            
            this.obstacles.push(obstacle);
        }
        
        // Générer des pièces
        if (Math.random() < 0.01) { // 1% de chance par frame
            const coin = {
                x: this.canvas.width,
                y: this.canvas.height - 250 - Math.random() * 200,
                size: 30,
                rotation: 0,
                value: 1
            };
            
            this.coinsList.push(coin);
        }
    }
    
    checkCollisions() {
        // Vérifier les collisions avec les obstacles
        for (const obstacle of this.obstacles) {
            if (this.collisionDetected(this.player, obstacle)) {
                this.gameOver();
                return;
            }
        }
        
        // Vérifier les collisions avec les pièces
        for (let i = this.coinsList.length - 1; i >= 0; i--) {
            const coin = this.coinsList[i];
            if (this.collisionDetected(this.player, coin)) {
                this.coins += coin.value;
                this.coinsList.splice(i, 1);
                
                // Jouer le son de pièce
                if (this.sounds.coin) {
                    this.sounds.coin.currentTime = 0;
                    this.sounds.coin.play();
                }
                
                // Débloquer des aliens selon les pièces
                this.checkUnlocks();
            }
        }
    }
    
    collisionDetected(obj1, obj2) {
        return obj1.x < obj2.x + obj2.width &&
               obj1.x + obj1.width > obj2.x &&
               obj1.y < obj2.y + (obj2.height || obj2.size) &&
               obj1.y + obj1.height > obj2.y;
    }
    
    drawGame() {
        // Dessiner le fond
        this.drawBackground();
        
        // Dessiner les pièces
        this.drawCoins();
        
        // Dessiner les obstacles
        this.drawObstacles();
        
        // Dessiner le joueur
        this.drawPlayer();
        
        // Dessiner l'interface
        this.drawHUD();
    }
    
    drawBackground() {
        // Fond dégradé
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(0.5, '#16213e');
        gradient.addColorStop(1, '#0f3460');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Étoiles
        this.ctx.fillStyle = 'white';
        for (let i = 0; i < 50; i++) {
            const x = (i * 100 + this.background.x) % (this.canvas.width + 100);
            const y = (i * 37) % this.canvas.height;
            const size = Math.random() * 3;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Sol
        this.ctx.fillStyle = '#2a2a2a';
        this.ctx.fillRect(0, this.canvas.height - 150, this.canvas.width, 150);
        
        // Détails du sol
        this.ctx.fillStyle = '#333';
        for (let i = 0; i < this.canvas.width; i += 50) {
            const x = (i + this.background.x * 2) % (this.canvas.width + 50);
            this.ctx.fillRect(x, this.canvas.height - 150, 40, 10);
        }
    }
    
    drawPlayer() {
        const alien = this.player.aliens[this.player.currentAlien];
        
        // Corps
        this.ctx.fillStyle = alien.color;
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        
        // Tête (à remplacer par l'image)
        this.ctx.fillStyle = this.lightenColor(alien.color, 20);
        this.ctx.beginPath();
        this.ctx.arc(this.player.x + this.player.width/2, this.player.y + 30, 35, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Yeux
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(this.player.x + this.player.width/2 - 15, this.player.y + 25, 8, 0, Math.PI * 2);
        this.ctx.arc(this.player.x + this.player.width/2 + 15, this.player.y + 25, 8, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Pupilles
        this.ctx.fillStyle = alien.color;
        this.ctx.beginPath();
        this.ctx.arc(this.player.x + this.player.width/2 - 15, this.player.y + 25, 4, 0, Math.PI * 2);
        this.ctx.arc(this.player.x + this.player.width/2 + 15, this.player.y + 25, 4, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Omnitrix sur la poitrine
        this.ctx.fillStyle = '#00ff88';
        this.ctx.beginPath();
        this.ctx.arc(this.player.x + this.player.width/2, this.player.y + 80, 15, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Effet spécial selon l'alien
        this.drawAlienEffect(alien);
    }
    
    drawAlienEffect(alien) {
        switch(alien.ability) {
            case 'fire':
                // Flammes
                this.ctx.fillStyle = '#ff9900';
                this.ctx.beginPath();
                this.ctx.moveTo(this.player.x + this.player.width, this.player.y + 80);
                for (let i = 0; i < 5; i++) {
                    const x = this.player.x + this.player.width + Math.random() * 20;
                    const y = this.player.y + 70 + Math.random() * 20;
                    this.ctx.lineTo(x, y);
                }
                this.ctx.closePath();
                this.ctx.fill();
                break;
                
            case 'speed':
                // Traînée de vitesse
                this.ctx.globalAlpha = 0.3;
                this.ctx.fillStyle = alien.color;
                this.ctx.fillRect(this.player.x - 30, this.player.y, 30, this.player.height);
                this.ctx.globalAlpha = 1.0;
                break;
        }
    }
    
    drawObstacles() {
        for (const obstacle of this.obstacles) {
            // Corps de l'obstacle
            this.ctx.fillStyle = obstacle.color;
            this.ctx.fillRect(obstacle.x, obstacle.y - obstacle.height, obstacle.width, obstacle.height);
            
            // Détails selon le type
            this.ctx.fillStyle = '#333';
            switch(obstacle.type) {
                case 'robot':
                    // Yeux du robot
                    this.ctx.beginPath();
                    this.ctx.arc(obstacle.x + obstacle.width/2, obstacle.y - obstacle.height + 20, 10, 0, Math.PI * 2);
                    this.ctx.fill();
                    break;
                    
                case 'laser':
                    // Énergie laser
                    this.ctx.fillStyle = '#ff0000';
                    this.ctx.fillRect(obstacle.x, obstacle.y - obstacle.height, 10, obstacle.height);
                    break;
            }
        }
    }
    
    drawCoins() {
        for (const coin of this.coinsList) {
            this.ctx.save();
            this.ctx.translate(coin.x + coin.size/2, coin.y + coin.size/2);
            this.ctx.rotate(coin.rotation);
            
            // Pièce jaune avec reflet
            this.ctx.fillStyle = '#ffd700';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, coin.size/2, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = '#ffed4e';
            this.ctx.beginPath();
            this.ctx.arc(-coin.size/4, -coin.size/4, coin.size/4, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.restore();
        }
    }
    
    drawHUD() {
        // Temps de jeu
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = Math.floor(this.gameTime % 60);
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Mettre à jour les éléments UI
        document.querySelector('.omnitrix-time').textContent = timeString;
        document.querySelector('.alien-name').textContent = this.player.currentAlien.toUpperCase();
        
        // Barre d'énergie
        const energyFill = document.querySelector('.energy-fill');
        if (energyFill) {
            energyFill.style.width = `${this.player.energy}%`;
        }
    }
    
    drawGameOver() {
        // Dessiner le jeu en arrière-plan
        this.drawGame();
        
        // Superposer un effet de fondu
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Texte Game Over
        this.ctx.fillStyle = '#ff0000';
        this.ctx.font = 'bold 60px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('MISSION ÉCHOUÉE!', this.canvas.width/2, this.canvas.height/2);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = '30px Arial';
        this.ctx.fillText(`Score: ${this.score}`, this.canvas.width/2, this.canvas.height/2 + 60);
    }
    
    updateUI() {
        this.scoreElement.textContent = this.score;
        this.coinsElement.textContent = this.coins;
        this.distanceElement.textContent = `${Math.floor(this.distance)}m`;
        
        // Mettre à jour les scores dans les écrans
        document.getElementById('pause-score').textContent = this.score;
        document.getElementById('pause-distance').textContent = `${Math.floor(this.distance)}m`;
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-distance').textContent = `${Math.floor(this.distance)}m`;
        document.getElementById('final-coins').textContent = this.coins;
    }
    
    jump() {
        if (!this.player.isJumping && this.player.energy >= 20) {
            this.player.velocityY = -20;
            this.player.isJumping = true;
            this.player.energy -= 20;
            
            // Son de saut
            if (this.sounds.jump) {
                this.sounds.jump.currentTime = 0;
                this.sounds.jump.play();
            }
        }
    }
    
    transform() {
        if (this.player.cooldowns.transform > 0) return;
        
        const aliens = Object.keys(this.player.aliens);
        const currentIndex = aliens.indexOf(this.player.currentAlien);
        
        // Trouver le prochain alien débloqué
        let nextIndex = currentIndex;
        do {
            nextIndex = (nextIndex + 1) % aliens.length;
        } while (!this.player.aliens[aliens[nextIndex]].unlocked && nextIndex !== currentIndex);
        
        if (this.player.currentAlien !== aliens[nextIndex]) {
            this.player.currentAlien = aliens[nextIndex];
            this.player.cooldowns.transform = 2; // 2 secondes de recharge
            
            // Son de transformation
            if (this.sounds.transform) {
                this.sounds.transform.currentTime = 0;
                this.sounds.transform.play();
            }
        }
    }
    
    getObstacleColor(type) {
        switch(type) {
            case 'rock': return '#666';
            case 'robot': return '#444';
            case 'laser': return '#ff4444';
            default: return '#555';
        }
    }
    
    lightenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        
        return `#${(0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1)}`;
    }
    
    checkUnlocks() {
        // Débloquer Diamondhead à 50 pièces
        if (this.coins >= 50 && !this.player.aliens.diamondhead.unlocked) {
            this.player.aliens.diamondhead.unlocked = true;
            this.showUnlockNotification('Diamondhead débloqué!');
        }
        
        // Débloquer FourArms à 100 pièces
        if (this.coins >= 100 && !this.player.aliens.fourarms.unlocked) {
            this.player.aliens.fourarms.unlocked = true;
            this.showUnlockNotification('FourArms débloqué!');
        }
    }
    
    showUnlockNotification(message) {
        // Créer une notification temporaire
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20%;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(45deg, #00ff88, #008844);
            color: black;
            padding: 15px 30px;
            border-radius: 10px;
            font-weight: bold;
            font-size: 1.2rem;
            z-index: 1000;
            animation: slideIn 0.5s ease-out;
        `;
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.5s ease-in';
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }
    
    gameOver() {
        this.gameState = 'gameover';
        
        // Mettre à jour le meilleur score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('ben10_highscore', this.highScore);
            this.highScoreElement.textContent = this.highScore;
        }
        
        // Son game over
        if (this.sounds.gameOver) {
            this.sounds.gameOver.currentTime = 0;
            this.sounds.gameOver.play();
        }
        
        // Arrêter la musique
        if (this.sounds.background) {
            this.sounds.background.pause();
            this.sounds.background.currentTime = 0;
        }
        
        // Calculer les nouveaux aliens débloqués
        let newAliens = 0;
        Object.values(this.player.aliens).forEach(alien => {
            if (alien.unlocked) newAliens++;
        });
        document.getElementById('new-aliens').textContent = newAliens;
        
        // Mettre à jour la liste des aliens
        this.updateAliensList();
        
        // Changer d'écran
        this.gameScreen.classList.add('hidden');
        this.gameOverScreen.classList.remove('hidden');
    }
    
    updateAliensList() {
        const aliensList = document.getElementById('aliens-list');
        aliensList.innerHTML = '';
        
        Object.entries(this.player.aliens).forEach(([name, alien]) => {
            const alienElement = document.createElement('div');
            alienElement.className = `alien-mini ${alien.unlocked ? 'unlocked' : 'locked'}`;
            alienElement.style.setProperty('--color1', alien.color);
            alienElement.style.setProperty('--color2', this.lightenColor(alien.color, 30));
            alienElement.title = name;
            
            aliensList.appendChild(alienElement);
        });
    }
    
    handleKeyDown(e) {
        switch(e.code) {
            case 'Space':
                e.preventDefault();
                this.jump();
                break;
                
            case 'KeyS':
                e.preventDefault();
                this.transform();
                break;
                
            case 'KeyP':
                e.preventDefault();
                this.togglePause();
                break;
                
            case 'Escape':
                e.preventDefault();
                this.togglePause();
                break;
        }
    }
    
    handleKeyUp(e) {
        // Gérer les relâchements de touches si nécessaire
    }
    
    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.gameScreen.classList.add('hidden');
            this.pauseScreen.classList.remove('hidden');
            
            if (this.sounds.background) {
                this.sounds.background.pause();
            }
        } else if (this.gameState === 'paused') {
            this.resumeGame();
        }
    }
    
    resumeGame() {
        this.gameState = 'playing';
        this.pauseScreen.classList.add('hidden');
        this.gameScreen.classList.remove('hidden');
        
        if (this.sounds.background) {
            this.sounds.background.play().catch(e => console.log('Audio resume blocked'));
        }
    }
    
    restartGame() {
        this.startGame();
    }
    
    quitToMenu() {
        this.gameState = 'menu';
        this.gameScreen.classList.add('hidden');
        this.pauseScreen.classList.add('hidden');
        this.gameOverScreen.classList.add('hidden');
        this.startScreen.classList.remove('hidden');
        
        if (this.sounds.background) {
            this.sounds.background.pause();
            this.sounds.background.currentTime = 0;
        }
    }
}

// Démarrer le jeu quand la page est chargée
window.addEventListener('DOMContentLoaded', () => {
    const game = new Ben10HeroicRun();
});
