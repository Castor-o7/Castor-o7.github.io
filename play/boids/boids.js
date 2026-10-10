// Boids: a flock steered by Craig Reynolds' three rules. Each boid looks at
// the neighbours inside its perception radius and steers to match their
// heading (alignment), move toward their centre (cohesion) and keep its
// distance (separation). Drawn with p5.js.

const MAX_BOIDS = 400;
const MAX_SPEED = 3.5;
const MAX_FORCE = 0.1;
const PERCEPTION_RADIUS = 50;
const ALIGNMENT_WEIGHT = 1.0;
const COHESION_WEIGHT = 1.0;
const SEPARATION_WEIGHT = 1.5;

const BOID_SIZE = 6;
// A boid's nose reaches this far from its centre, so it wraps only once it
// is fully off-canvas instead of popping at the edge.
const WRAP_MARGIN = BOID_SIZE * 1.5;
const BACKGROUND_COLOR = [10, 10, 10];
const BOID_STROKE = [212, 175, 55];
const BOID_FILL = [212, 175, 55, 180];

const MAX_CANVAS_WIDTH = 1100;
const MIN_CANVAS_HEIGHT = 200;
// Vertical room kept for the title, controls and links around the canvas.
const PAGE_CHROME_HEIGHT = 280;
// Minimum pointer travel between boids spawned by one drag.
const DRAG_SPAWN_SPACING = 12;
const STATS_INTERVAL_FRAMES = 15;

let boids = [];
let container;
let countLabel;
let fpsLabel;
let spawning = false;
let lastSpawnX = 0;
let lastSpawnY = 0;

function setup() {
    container = document.getElementById('canvas-container');
    countLabel = document.getElementById('boid-count');
    fpsLabel = document.getElementById('fps');

    const size = canvasSize();
    createCanvas(size.w, size.h).parent(container);

    bindButton('clear', clearFlock);
    bindButton('reset', resetFlock);
    window.addEventListener('keydown', handleKey);

    resetFlock();
}

function draw() {
    background(BACKGROUND_COLOR);

    // Every boid steers from the same snapshot before any of them moves.
    for (const boid of boids) {
        boid.flock(boids);
    }

    // Steering and movement are scaled by elapsed time so the flock behaves
    // the same at any refresh rate; the cap stops a jump after the tab has
    // been hidden.
    const dt = min(deltaTime / (1000 / 60), 2);

    stroke(BOID_STROKE);
    strokeWeight(1);
    fill(BOID_FILL);
    for (const boid of boids) {
        boid.update(dt);
        boid.edges();
        boid.show();
    }

    if (frameCount % STATS_INTERVAL_FRAMES === 0) {
        fpsLabel.textContent = round(frameRate());
    }
}

function canvasSize() {
    const w = floor(min(container.clientWidth, MAX_CANVAS_WIDTH));
    // Square-ish on phones, wide on desktop, and never taller than the window.
    const ideal = round(w * (w < 600 ? 1 : 0.6));
    const h = max(MIN_CANVAS_HEIGHT, min(ideal, windowHeight - PAGE_CHROME_HEIGHT));
    return { w, h };
}

function windowResized() {
    const size = canvasSize();
    if (size.w === width && size.h === height) return;

    resizeCanvas(size.w, size.h);
    for (const boid of boids) {
        boid.position.x = ((boid.position.x % width) + width) % width;
        boid.position.y = ((boid.position.y % height) + height) % height;
    }
}

function initialBoidCount() {
    return constrain(floor((width * height) / 7000), 30, 150);
}

function resetFlock() {
    boids = [];
    const count = initialBoidCount();
    for (let i = 0; i < count; i++) {
        boids.push(new Boid(random(width), random(height)));
    }
    updateCount();
}

function clearFlock() {
    boids = [];
    updateCount();
}

function updateCount() {
    countLabel.textContent = boids.length;
}

function bindButton(id, action) {
    const button = document.getElementById(id);
    // Keep focus off the button after a mouse click so Space and R still
    // reach the flock rather than re-activating the button.
    button.addEventListener('mousedown', (event) => event.preventDefault());
    button.addEventListener('click', action);
}

function handleKey(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key === ' ') {
        // A focused button or link keeps its own Space behaviour.
        if (event.target.closest?.('button, a')) return;
        event.preventDefault();
        if (!event.repeat) clearFlock();
    } else if ((event.key === 'r' || event.key === 'R') && !event.repeat) {
        resetFlock();
    }
}

function pointerInCanvas() {
    return mouseX >= 0 && mouseX < width && mouseY >= 0 && mouseY < height;
}

function spawnAtPointer() {
    if (boids.length >= MAX_BOIDS || !pointerInCanvas()) return;

    boids.push(new Boid(mouseX, mouseY));
    lastSpawnX = mouseX;
    lastSpawnY = mouseY;
    updateCount();
}

function beginSpawning() {
    spawning = pointerInCanvas();
    if (spawning) spawnAtPointer();
}

function continueSpawning() {
    if (!spawning) return;

    const dx = mouseX - lastSpawnX;
    const dy = mouseY - lastSpawnY;
    if (dx * dx + dy * dy >= DRAG_SPAWN_SPACING * DRAG_SPAWN_SPACING) {
        spawnAtPointer();
    }
}

function mousePressed() {
    if (mouseButton === LEFT) {
        beginSpawning();
    }
}

function mouseDragged() {
    continueSpawning();
}

function mouseReleased() {
    spawning = false;
}

// Returning false from the touch handlers stops the page scrolling and the
// browser's follow-up mouse events, but only for touches that began on the
// canvas; everything else on the page behaves normally.
function touchStarted() {
    beginSpawning();
    if (spawning) return false;
}

function touchMoved() {
    continueSpawning();
    if (spawning) return false;
}

function touchEnded() {
    spawning = false;
}

class Boid {
    constructor(x, y) {
        this.position = createVector(x, y);
        this.velocity = p5.Vector.random2D().mult(random(2, MAX_SPEED));
        this.acceleration = createVector(0, 0);
    }

    // One pass over the flock gathers what all three rules need.
    flock(boids) {
        // The world wraps, so a neighbour may be nearer across an edge.
        const worldW = width + WRAP_MARGIN * 2;
        const worldH = height + WRAP_MARGIN * 2;
        const radiusSq = PERCEPTION_RADIUS * PERCEPTION_RADIUS;

        let headingX = 0, headingY = 0;
        let offsetX = 0, offsetY = 0;
        let awayX = 0, awayY = 0;
        let total = 0;

        for (const other of boids) {
            if (other === this) continue;

            let dx = other.position.x - this.position.x;
            let dy = other.position.y - this.position.y;
            if (dx > worldW / 2) dx -= worldW;
            else if (dx < -worldW / 2) dx += worldW;
            if (dy > worldH / 2) dy -= worldH;
            else if (dy < -worldH / 2) dy += worldH;

            const dSq = dx * dx + dy * dy;
            // Coincident boids have no direction to separate along.
            if (dSq === 0 || dSq >= radiusSq) continue;

            headingX += other.velocity.x;
            headingY += other.velocity.y;
            offsetX += dx;
            offsetY += dy;
            // Push away, weighted by 1/distance: closer means stronger.
            awayX -= dx / dSq;
            awayY -= dy / dSq;
            total++;
        }

        if (total === 0) return;

        this.acceleration.add(this.steer(headingX, headingY).mult(ALIGNMENT_WEIGHT));
        this.acceleration.add(this.steer(offsetX, offsetY).mult(COHESION_WEIGHT));
        this.acceleration.add(this.steer(awayX, awayY).mult(SEPARATION_WEIGHT));
    }

    // Steering force that turns this boid toward the given direction.
    steer(x, y) {
        return createVector(x, y)
            .setMag(MAX_SPEED)
            .sub(this.velocity)
            .limit(MAX_FORCE);
    }

    update(dt) {
        this.velocity.add(this.acceleration.x * dt, this.acceleration.y * dt);
        this.velocity.limit(MAX_SPEED);
        this.position.add(this.velocity.x * dt, this.velocity.y * dt);
        this.acceleration.set(0, 0);
    }

    edges() {
        if (this.position.x > width + WRAP_MARGIN) {
            this.position.x = -WRAP_MARGIN;
        } else if (this.position.x < -WRAP_MARGIN) {
            this.position.x = width + WRAP_MARGIN;
        }

        if (this.position.y > height + WRAP_MARGIN) {
            this.position.y = -WRAP_MARGIN;
        } else if (this.position.y < -WRAP_MARGIN) {
            this.position.y = height + WRAP_MARGIN;
        }
    }

    show() {
        push();
        translate(this.position.x, this.position.y);
        rotate(this.velocity.heading() + HALF_PI);
        triangle(0, -BOID_SIZE * 1.5, -BOID_SIZE, BOID_SIZE, BOID_SIZE, BOID_SIZE);
        pop();
    }
}
