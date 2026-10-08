// this program creates a flock of boids that move around the screen
// and avoid each other
// it uses the p5.js library for drawing and animation

let boids = [];
let numBoids = 100;
let maxSpeed = 3.5;
let maxForce = 0.1;
let separationDistance = 50;
let alignmentDistance = 50;
let cohesionDistance = 50;
let alignmentWeight = 1.0;
let cohesionWeight = 1.0;
let separationWeight = 1.5;
let backgroundColor = [15, 15, 25]; // Dark blue background
let boidColor = [0, 0, 0]; // Black boids
let boidSize = 15;
let boidStrokeWeight = 2;
let boidStrokeColor = [25, 205, 255]; // Cyan stroke
let boidFillColor = [25, 205, 255]; // Cyan fill
let boidStrokeAlpha = 255;
let boidFillAlpha = 180;
let boidStrokeWeightAlpha = 255;

function setup() {
    // Make canvas responsive - use window size but limit max size
    let canvasWidth = min(windowWidth * 0.95, 1920);
    let canvasHeight = min(windowHeight * 0.8, 1080);
    
    // Create canvas and attach it to the container
    let canvas = createCanvas(canvasWidth, canvasHeight);
    canvas.parent('canvas-container');
    
    for (let i = 0; i < numBoids; i++) {
        boids.push(new Boid(random(width), random(height)));
    }
}

// Handle window resize
function windowResized() {
    let canvasWidth = min(windowWidth * 0.95, 1920);
    let canvasHeight = min(windowHeight * 0.8, 1080);
    resizeCanvas(canvasWidth, canvasHeight);
}

function draw() {
    background(backgroundColor);
    fill(25, 205, 255); // Cyan text
    textSize(16);
    textAlign(LEFT);
    text('Boids: ' + boids.length, 10, 20);
    
    for (let boid of boids) {
        boid.flock(boids);
        boid.update();
        boid.edges();
        boid.show();
    }
}

function mousePressed() {
    boids.push(new Boid(mouseX, mouseY));
}

function mouseDragged() {
    boids.push(new Boid(mouseX, mouseY));
}

function keyPressed() {
    if (key === ' ') {
        boids = [];
    }
    if (key === 'r' || key === 'R') {
        boids = [];
        for (let i = 0; i < numBoids; i++) {
            boids.push(new Boid(random(width), random(height)));
        }
    }
}

class Boid {
    constructor(x, y) {
        this.position = createVector(x, y);
        this.velocity = p5.Vector.random2D();
        this.velocity.mult(random(2, 4));
        this.acceleration = createVector(0, 0);
        this.maxSpeed = maxSpeed;
        this.maxForce = maxForce;
    }

    flock(boids) {
        let alignment = this.align(boids);
        let cohesion = this.cohesion(boids);
        let separation = this.separation(boids);
        
        // Apply weights
        alignment.mult(alignmentWeight);
        cohesion.mult(cohesionWeight);
        separation.mult(separationWeight);
        
        // Add forces to acceleration
        this.applyForce(alignment);
        this.applyForce(cohesion);
        this.applyForce(separation);
    }

    applyForce(force) {
        this.acceleration.add(force);
    }

    update() {
        this.velocity.add(this.acceleration);
        this.velocity.limit(this.maxSpeed);
        this.position.add(this.velocity);
        this.acceleration.mult(0);
    }

    edges() {
        // Wrap around screen edges
        if (this.position.x > width) {
            this.position.x = 0;
        } else if (this.position.x < 0) {
            this.position.x = width;
        }
        
        if (this.position.y > height) {
            this.position.y = 0;
        } else if (this.position.y < 0) {
            this.position.y = height;
        }
    }

    align(boids) {
        let perceptionRadius = alignmentDistance;
        let steering = createVector();
        let total = 0;
        
        for (let other of boids) {
            let d = dist(
                this.position.x,
                this.position.y,
                other.position.x,
                other.position.y
            );
            
            if (other != this && d < perceptionRadius) {
                steering.add(other.velocity);
                total++;
            }
        }
        
        if (total > 0) {
            steering.div(total);
            steering.setMag(this.maxSpeed);
            steering.sub(this.velocity);
            steering.limit(this.maxForce);
        }
        
        return steering;
    }

    cohesion(boids) {
        let perceptionRadius = cohesionDistance;
        let steering = createVector();
        let total = 0;
        
        for (let other of boids) {
            let d = dist(
                this.position.x,
                this.position.y,
                other.position.x,
                other.position.y
            );
            
            if (other != this && d < perceptionRadius) {
                steering.add(other.position);
                total++;
            }
        }
        
        if (total > 0) {
            steering.div(total);
            steering.sub(this.position);
            steering.setMag(this.maxSpeed);
            steering.sub(this.velocity);
            steering.limit(this.maxForce);
        }
        
        return steering;
    }

    separation(boids) {
        let perceptionRadius = separationDistance;
        let steering = createVector();
        let total = 0;
        
        for (let other of boids) {
            let d = dist(
                this.position.x,
                this.position.y,
                other.position.x,
                other.position.y
            );
            
            if (other != this && d < perceptionRadius) {
                let diff = p5.Vector.sub(this.position, other.position);
                diff.div(d * d); // Weight by distance (closer = stronger)
                steering.add(diff);
                total++;
            }
        }
        
        if (total > 0) {
            steering.div(total);
            steering.setMag(this.maxSpeed);
            steering.sub(this.velocity);
            steering.limit(this.maxForce);
        }
        
        return steering;
    }

    show() {
        // Draw direction
        let theta = this.velocity.heading() + PI/2;
        push();
        translate(this.position.x, this.position.y);
        rotate(theta);
        
        // Draw triangular boid
        fill(boidFillColor[0], boidFillColor[1], boidFillColor[2], boidFillAlpha);
        stroke(boidStrokeColor[0], boidStrokeColor[1], boidStrokeColor[2], boidStrokeAlpha);
        strokeWeight(boidStrokeWeight);
        
        beginShape();
        vertex(0, -boidSize*1.5);
        vertex(-boidSize, boidSize);
        vertex(boidSize, boidSize);
        endShape(CLOSE);
        
        pop();
    }
}