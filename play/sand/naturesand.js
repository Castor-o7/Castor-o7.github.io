let sandParticles = [];
let isMousePressed = false;

function setup() {
  createCanvas(800, 600);
}

function draw() {
  background(30, 30, 40); // Dark background
  
  // Spawn sand particles while mouse is pressed
  if (isMousePressed) {
    for (let i = 0; i < 5; i++) { // Spawn multiple particles per frame
      sandParticles.push(new SandParticle(mouseX + random(-10, 10), mouseY + random(-5, 5)));
    }
  }
  
  // Apply gravity and update all particles
  let gravity = createVector(0, 0.2);
  
  for (let i = sandParticles.length - 1; i >= 0; i--) {
    let particle = sandParticles[i];
    particle.applyForce(gravity);
    particle.update();
    particle.checkCollisions(sandParticles);
    particle.display();
  }
  
  // Display particle count
  fill(255);
  textSize(16);
  text(`Sand particles: ${sandParticles.length}`, 10, 25);
  text("Click and hold to spawn sand!", 10, 45);
}

function mousePressed() {
  isMousePressed = true;
}

function mouseReleased() {
  isMousePressed = false;
}

class SandParticle {
  constructor(x, y) {
    this.position = createVector(x, y);
    this.velocity = createVector(random(-1, 1), random(-1, 1));
    this.acceleration = createVector(0, 0);
    this.radius = random(2, 4);
    this.color = color(random(200, 255), random(180, 220), random(100, 150)); // Sandy colors
    this.settled = false;
    this.friction = 0.8;
  }
  
  applyForce(force) {
    let f = p5.Vector.div(force, 1); // Assuming mass = 1
    this.acceleration.add(f);
  }
  
  update() {
    if (!this.settled) {
      this.velocity.add(this.acceleration);
      this.velocity.mult(0.99); // Air resistance
      this.position.add(this.velocity);
      this.acceleration.mult(0);
      
      // Check boundaries
      this.checkBoundaries();
      
      // Settle if moving slowly and near bottom
      if (this.velocity.mag() < 0.5 && this.position.y > height - 50) {
        this.settled = true;
        this.velocity.mult(0);
      }
    }
  }
  
  checkBoundaries() {
    // Bottom boundary - settle on ground
    if (this.position.y >= height - this.radius) {
      this.position.y = height - this.radius;
      this.velocity.y *= -0.3; // Small bounce
      this.velocity.x *= this.friction;
      
      if (abs(this.velocity.y) < 0.5) {
        this.velocity.y = 0;
        this.settled = true;
      }
    }
    
    // Side boundaries
    if (this.position.x <= this.radius || this.position.x >= width - this.radius) {
      this.position.x = constrain(this.position.x, this.radius, width - this.radius);
      this.velocity.x *= -0.5;
    }
  }
  
  checkCollisions(particles) {
    if (this.settled) return;
    
    for (let other of particles) {
      if (other !== this && other.settled) {
        let distance = p5.Vector.dist(this.position, other.position);
        let minDistance = this.radius + other.radius;
        
        if (distance < minDistance) {
          // Collision detected - settle on top of other particle
          let angle = atan2(this.position.y - other.position.y, this.position.x - other.position.x);
          this.position.x = other.position.x + cos(angle) * minDistance;
          this.position.y = other.position.y + sin(angle) * minDistance;
          
          // Add some settling behavior
          this.velocity.mult(0.3);
          if (this.velocity.mag() < 1) {
            this.settled = true;
            this.velocity.mult(0);
          }
        }
      }
    }
  }
  
  display() {
    push();
    translate(this.position.x, this.position.y);
    fill(this.color);
    noStroke();
    ellipse(0, 0, this.radius * 2);
    
    // Add a slight highlight for more realistic look
    fill(red(this.color) + 30, green(this.color) + 30, blue(this.color) + 30, 100);
    ellipse(-this.radius * 0.3, -this.radius * 0.3, this.radius);
    pop();
  }
}