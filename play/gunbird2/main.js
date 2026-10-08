// main.js
const config = {
  type: Phaser.AUTO,
  width: 480,
  height: 640,
  backgroundColor: '#222',
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: {
      debug: true
    }
  },
  scene: {
    preload,
    create,
    update
  }
};

let player;
let cursors;
let bullets;
let enemies;
let lastFired = 0;
let spaceKey;
let score = 0;
let scoreText;
let enemyTimer = 0;
let gameOver = false;
let lives = 3;
let livesDisplay = [];
let playerInvulnerable = false;

function preload() {
  // Placeholder: simple rectangle as player
  this.graphics = this.add.graphics();
}

function create() {
  // Player as a white rectangle
  player = this.add.rectangle(config.width/2, config.height-60, 32, 32, 0xffffff);
  this.physics.add.existing(player);
  player.body.setCollideWorldBounds(true);
  cursors = this.input.keyboard.createCursorKeys();

  // Bullets group with physics
  bullets = this.physics.add.group();
  
  // Enemies group with physics
  enemies = this.physics.add.group();
  
  // Add spacebar for shooting
  spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  
  // Score display
  scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '20px', fill: '#fff' });
  
  // Lives display - create small player icons in top left
  createLivesDisplay.call(this);
  
  // Collision detection
  this.physics.add.overlap(bullets, enemies, destroyEnemy, null, this);
  this.physics.add.overlap(player, enemies, playerHit, null, this);
}

function update(time, delta) {
  if (gameOver) return;
  
  // Simple invulnerability visual effect
  if (playerInvulnerable) {
    player.setFillStyle(0xff8888); // Light red tint when invulnerable
  } else {
    player.setFillStyle(0xffffff); // Normal white
  }
  
  const speed = 200;
  player.body.setVelocity(0);
  if (cursors.left.isDown) {
    player.body.setVelocityX(-speed);
  } else if (cursors.right.isDown) {
    player.body.setVelocityX(speed);
  }
  if (cursors.up.isDown) {
    player.body.setVelocityY(-speed);
  } else if (cursors.down.isDown) {
    player.body.setVelocityY(speed);
  }

  // Shooting
  if (Phaser.Input.Keyboard.JustDown(spaceKey)) {
    if (time > lastFired + 200) { // fire rate: 200ms
      fireBullet.call(this);
      lastFired = time;
    }
  }

  // Spawn enemies
  if (time > enemyTimer + 1000) { // spawn every 1 second
    spawnEnemy.call(this);
    enemyTimer = time;
  }

  // Remove off-screen bullets
  bullets.children.each(function(bullet) {
    if (bullet.y < -20) {
      bullet.destroy();
    }
  }, this);
  
  // Remove off-screen enemies
  enemies.children.each(function(enemy) {
    if (enemy.y > config.height + 20) {
      enemy.destroy();
    }
  }, this);
}

function fireBullet() {
  // Create bullet rectangle
  const bullet = this.add.rectangle(player.x, player.y - 24, 4, 16, 0x00ffff);
  
  // Add physics to the bullet
  this.physics.add.existing(bullet);
  
  // Set velocity in the next frame to ensure physics body is ready
  this.time.delayedCall(1, () => {
    if (bullet.body) {
      bullet.body.setVelocityY(-400);
    }
  });
  
  // Add to bullets group for collision detection
  bullets.add(bullet);
}

function spawnEnemy() {
  const x = Phaser.Math.Between(20, config.width - 20);
  const enemy = this.add.rectangle(x, -20, 24, 24, 0xff0000);
  this.physics.add.existing(enemy);
  
  // Set velocity in the next frame to ensure physics body is ready
  this.time.delayedCall(1, () => {
    if (enemy.body) {
      enemy.body.setVelocityY(Phaser.Math.Between(80, 150));
    }
  });
  
  enemies.add(enemy);
}

function destroyEnemy(bullet, enemy) {
  bullet.destroy();
  enemy.destroy();
  score += 10;
  scoreText.setText('Score: ' + score);
}

function playerHit(player, enemy) {
  console.log('Player hit! Lives before:', lives, 'Invulnerable:', playerInvulnerable);
  
  // Don't take damage if already invulnerable
  if (playerInvulnerable) {
    console.log('Player is invulnerable, ignoring hit');
    return;
  }
  
  console.log('Processing hit...');
  
  // Destroy the enemy that hit the player
  if (enemy && enemy.destroy) {
    enemy.destroy();
    console.log('Enemy destroyed');
  }
  
  // Lose a life
  lives--;
  console.log('Lives after hit:', lives);
  
  // Update lives display
  if (livesDisplay[lives]) {
    livesDisplay[lives].setVisible(false);
    console.log('Life icon hidden');
  }
  
  // Check if game over
  if (lives <= 0) {
    console.log('Game over!');
    gameOver = true;
    
    // Display game over text
    const gameOverText = this.add.text(config.width/2, config.height/2, 'GAME OVER\nScore: ' + score + '\nPress R to Restart', {
      fontSize: '32px',
      fill: '#fff',
      align: 'center'
    });
    gameOverText.setOrigin(0.5);
    
    // Add restart functionality
    const restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    restartKey.on('down', () => {
      this.scene.restart();
      resetGame();
    });
  } else {
    console.log('Respawning player...');
    // Simple respawn without any fancy effects
    player.x = config.width / 2;
    player.y = config.height - 60;
    playerInvulnerable = true;
    
    // Clear invulnerability after 2 seconds
    setTimeout(() => {
      playerInvulnerable = false;
      console.log('Player no longer invulnerable');
    }, 2000);
  }
  
  console.log('playerHit function completed');
}

function createLivesDisplay() {
  livesDisplay = [];
  for (let i = 0; i < lives; i++) {
    const lifeIcon = this.add.rectangle(10 + (i * 25), 50, 16, 16, 0xffffff);
    livesDisplay.push(lifeIcon);
  }
}

function updateLivesDisplay() {
  // Hide the life icon that was lost
  if (livesDisplay[lives]) {
    livesDisplay[lives].setVisible(false);
  }
}

function respawnPlayer() {
  // Move player back to starting position
  player.x = config.width / 2;
  player.y = config.height - 60;
  
  // Reset player appearance
  player.setFillStyle(0xffffff);
  player.setAlpha(1);
  
  // Make player temporarily invulnerable for 2 seconds
  playerInvulnerable = true;
  
  // Use a simple timer instead of tweens
  this.time.delayedCall(2000, () => {
    playerInvulnerable = false;
  });
}

function resetGame() {
  score = 0;
  lives = 3;
  gameOver = false;
  enemyTimer = 0;
  lastFired = 0;
  playerInvulnerable = false;
}

new Phaser.Game(config);
