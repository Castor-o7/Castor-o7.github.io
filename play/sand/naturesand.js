const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const SPAWN_PER_FRAME = 5;
const SPAWN_SPREAD_X = 10;
const SPAWN_SPREAD_Y = 5;
const MAX_PARTICLES = 8000;

const GRAVITY = 0.2;
const AIR_DRAG = 0.99;
const FRICTION = 0.8;
const FLOOR_BOUNCE = 0.3;
const WALL_BOUNCE = 0.5;

const MIN_RADIUS = 2;
const MAX_RADIUS = 4;

// A grain is supported when it sits on the floor or in the cradle between a
// neighbour below-left and one below-right; balanced on a single grain it
// rolls off instead. A supported grain settles once it is slower than this.
const SETTLE_SPEED = 0.3;
// Backstops for grains pinned in place some other way (wedged against a wall,
// say): one that has spent this many frames in a row slow and in contact with
// the pile, or that has not got anywhere in this many frames, is at rest.
const STALL_FRAMES = 30;
const STALL_DISTANCE = MIN_RADIUS;

// Settled grains are bucketed in a grid whose cells are one maximum diameter
// wide, so anything a grain can touch is in its own cell or the eight around it.
const CELL_SIZE = MAX_RADIUS * 2;
const GRID_COLS = Math.ceil(CANVAS_WIDTH / CELL_SIZE);
const GRID_ROWS = Math.ceil(CANVAS_HEIGHT / CELL_SIZE);

let fallingParticles = [];
let settledGrid = [];
let settledCount = 0;
// Settled grains never move again, so they are painted once into this buffer
// instead of being redrawn every frame.
let settledLayer;

let gravity;
let pouring = false;
let pourPointerId = null;
let pourX = 0;
let pourY = 0;

let countLabel;
let shownCount = -1;

function setup() {
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  settledLayer = createGraphics(CANVAS_WIDTH, CANVAS_HEIGHT);
  noStroke();
  settledLayer.noStroke();

  gravity = createVector(0, GRAVITY);
  clearSand();
  bindPointer(canvas.elt);

  countLabel = document.getElementById('grain-count');
  const clearButton = document.getElementById('clear');
  if (clearButton) clearButton.addEventListener('click', clearSand);
}

function draw() {
  background(14, 14, 16);
  image(settledLayer, 0, 0);

  if (pouring) spawnSand();

  // Backwards so a grain that settles can be swapped out of the list in place.
  for (let i = fallingParticles.length - 1; i >= 0; i--) {
    const particle = fallingParticles[i];
    particle.applyForce(gravity);
    particle.update();

    if (particle.settled) {
      fallingParticles[i] = fallingParticles[fallingParticles.length - 1];
      fallingParticles.pop();
      settle(particle);
    } else {
      particle.display();
    }
  }

  updateCount();
}

function keyPressed(event) {
  // Leave Cmd/Ctrl+C (copy) alone.
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if (key === 'c' || key === 'C') clearSand();
}

function spawnSand() {
  if (pourX < 0 || pourX > width || pourY < 0 || pourY > height) return;

  for (let i = 0; i < SPAWN_PER_FRAME; i++) {
    if (particleCount() >= MAX_PARTICLES) return;
    const x = constrain(pourX + random(-SPAWN_SPREAD_X, SPAWN_SPREAD_X), 0, width);
    const y = constrain(pourY + random(-SPAWN_SPREAD_Y, SPAWN_SPREAD_Y), 0, height);
    // Nothing comes out of a spout that is already buried in the pile.
    if (isBuried(x, y)) continue;
    fallingParticles.push(new SandParticle(x, y));
  }
}

function settle(particle) {
  settledGrid[cellIndex(particle.position.x, particle.position.y)].push(particle);
  settledCount++;
  particle.display(settledLayer);
}

function clearSand() {
  fallingParticles = [];
  settledGrid = Array.from({ length: GRID_COLS * GRID_ROWS }, () => []);
  settledCount = 0;
  settledLayer.clear();
}

function particleCount() {
  return fallingParticles.length + settledCount;
}

function updateCount() {
  const count = particleCount();
  if (!countLabel || count === shownCount) return;
  shownCount = count;
  countLabel.textContent = `${count} / ${MAX_PARTICLES}`;
}

function cellIndex(x, y) {
  const col = constrain(floor(x / CELL_SIZE), 0, GRID_COLS - 1);
  const row = constrain(floor(y / CELL_SIZE), 0, GRID_ROWS - 1);
  return row * GRID_COLS + col;
}

function isBuried(x, y) {
  for (const other of settledGrid[cellIndex(x, y)]) {
    const dx = x - other.position.x;
    const dy = y - other.position.y;
    if (dx * dx + dy * dy < other.radius * other.radius) return true;
  }
  return false;
}

// Pouring is driven by pointer events on the canvas itself rather than p5's
// window-wide mousePressed, so clicks elsewhere on the page, right-clicks and
// cancelled touches cannot start a pour or leave one stuck on.
function bindPointer(element) {
  const track = (event) => {
    const rect = element.getBoundingClientRect();
    pourX = (event.clientX - rect.left - element.clientLeft) * (width / element.clientWidth);
    pourY = (event.clientY - rect.top - element.clientTop) * (height / element.clientHeight);
  };
  const stop = (event) => {
    if (event.pointerId !== pourPointerId) return;
    pouring = false;
    pourPointerId = null;
  };

  element.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || pouring) return;
    track(event);
    pouring = true;
    pourPointerId = event.pointerId;
    element.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  element.addEventListener('pointermove', (event) => {
    if (event.pointerId === pourPointerId) track(event);
  });
  element.addEventListener('pointerup', stop);
  element.addEventListener('pointercancel', stop);
  element.addEventListener('contextmenu', (event) => event.preventDefault());
  window.addEventListener('blur', () => {
    pouring = false;
    pourPointerId = null;
  });
}

class SandParticle {
  constructor(x, y) {
    this.position = createVector(x, y);
    this.velocity = createVector(random(-1, 1), random(-1, 1));
    this.acceleration = createVector(0, 0);
    this.radius = random(MIN_RADIUS, MAX_RADIUS);

    const r = random(200, 255);
    const g = random(180, 220);
    const b = random(100, 150);
    this.color = color(r, g, b);
    this.highlight = color(r + 30, g + 30, b + 30, 100);

    this.supported = false;
    this.touching = false;
    this.restFrames = 0;
    this.settled = false;
    this.stallOrigin = createVector(x, y);
    this.stallFrames = 0;
  }

  applyForce(force) {
    this.acceleration.add(force);
  }

  update() {
    this.velocity.add(this.acceleration);
    this.velocity.mult(AIR_DRAG);
    this.acceleration.set(0, 0);

    // A falling grain can cover several times its own width in one frame, so
    // the move is split into steps no longer than the smallest grain's radius.
    // Otherwise fast grains skip over the pile or end up buried inside it.
    const steps = max(1, ceil(this.velocity.mag() / MIN_RADIUS));
    for (let i = 0; i < steps; i++) {
      this.supported = false;
      this.position.add(this.velocity.x / steps, this.velocity.y / steps);
      this.checkCollisions();
      this.checkBoundaries();
    }

    const slow = this.velocity.magSq() < SETTLE_SPEED * SETTLE_SPEED;
    this.restFrames = this.touching && slow ? this.restFrames + 1 : 0;
    if ((this.supported && slow) || this.restFrames >= STALL_FRAMES || this.isStalled()) {
      this.settled = true;
      this.velocity.set(0, 0);
    }
  }

  isStalled() {
    if (++this.stallFrames < STALL_FRAMES) return false;
    const dx = this.position.x - this.stallOrigin.x;
    const dy = this.position.y - this.stallOrigin.y;
    this.stallOrigin.set(this.position);
    this.stallFrames = 0;
    return dx * dx + dy * dy < STALL_DISTANCE * STALL_DISTANCE;
  }

  // Runs after checkCollisions so the floor and walls have the final say on
  // where a grain ends up.
  checkBoundaries() {
    if (this.position.y >= height - this.radius) {
      this.position.y = height - this.radius;
      if (this.velocity.y > 0) this.velocity.y *= -FLOOR_BOUNCE;
      this.velocity.x *= FRICTION;
      this.supported = true;
    }

    if (this.position.x < this.radius) {
      this.position.x = this.radius;
      if (this.velocity.x < 0) this.velocity.x *= -WALL_BOUNCE;
    } else if (this.position.x > width - this.radius) {
      this.position.x = width - this.radius;
      if (this.velocity.x > 0) this.velocity.x *= -WALL_BOUNCE;
    }
  }

  // Pushes the grain out of any settled grain it overlaps and cancels the
  // velocity going into the contact, so it slides off a neighbour's side
  // instead of sticking to it.
  checkCollisions() {
    const col = floor(this.position.x / CELL_SIZE);
    const row = floor(this.position.y / CELL_SIZE);
    let touched = false;
    let heldFromLeft = false;
    let heldFromRight = false;

    for (let r = max(row - 1, 0); r <= min(row + 1, GRID_ROWS - 1); r++) {
      for (let c = max(col - 1, 0); c <= min(col + 1, GRID_COLS - 1); c++) {
        for (const other of settledGrid[r * GRID_COLS + c]) {
          const dx = this.position.x - other.position.x;
          const dy = this.position.y - other.position.y;
          const minDistance = this.radius + other.radius;
          const distanceSq = dx * dx + dy * dy;
          if (distanceSq >= minDistance * minDistance) continue;

          const distance = sqrt(distanceSq);
          const nx = distance > 0 ? dx / distance : 0;
          const ny = distance > 0 ? dy / distance : -1;
          this.position.set(other.position.x + nx * minDistance, other.position.y + ny * minDistance);

          const inward = this.velocity.x * nx + this.velocity.y * ny;
          if (inward < 0) this.velocity.sub(nx * inward, ny * inward);

          touched = true;
          if (ny < 0) {
            if (nx >= 0) heldFromLeft = true;
            if (nx <= 0) heldFromRight = true;
          }
        }
      }
    }

    this.touching = touched;
    if (touched) this.velocity.mult(FRICTION);
    if (heldFromLeft && heldFromRight) this.supported = true;
  }

  display(target = window) {
    const { x, y } = this.position;
    target.fill(this.color);
    target.circle(x, y, this.radius * 2);
    target.fill(this.highlight);
    target.circle(x - this.radius * 0.3, y - this.radius * 0.3, this.radius);
  }
}
