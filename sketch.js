let video;
let handModel;
let detections = [];
let canvasLayer, tempLayer;
let particles = [];

// App State
let currentColor = [0, 255, 200]; // Electric Teal
let currentTool = 'free'; 
let startX, startY, prevX, prevY;
let isDragging = false;
let statusMsg = "INITIALIZING AI...";

function setup() {
  let cnv = createCanvas(800, 600);
  cnv.style('display', 'block');
  
  video = createCapture(VIDEO);
  video.size(800, 600);
  video.hide();

  canvasLayer = createGraphics(800, 600);
  tempLayer = createGraphics(800, 600);
  
  handModel = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  handModel.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.8,
    minTrackingConfidence: 0.8
  });

  handModel.onResults(gotHands);

  const camInstance = new Camera(video.elt, {
    onFrame: async () => { await handModel.send({ image: video.elt }); },
    width: 800, height: 600
  });
  camInstance.start();
}

function gotHands(results) { detections = results.multiHandLandmarks; }

function draw() {
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0, width, height);
  
  // Background dimming for professional look
  fill(0, 80);
  rect(0, 0, width, height);

  drawUI();
  image(canvasLayer, 0, 0);
  image(tempLayer, 0, 0);

  if (detections && detections.length > 0) {
    let landmarks = detections[0];
    let x = landmarks[8].x * width;
    let y = landmarks[8].y * height;

    let isIndexUp = landmarks[8].y < landmarks[6].y;
    let isMiddleUp = landmarks[12].y < landmarks[10].y;
    let isRingUp = landmarks[16].y < landmarks[14].y;
    let isPinkyUp = landmarks[20].y < landmarks[18].y;

    if (isIndexUp) createSparkles(x, y);

    if (y < 80) {
      checkSelection(x);
      statusMsg = "SELECTING TOOL";
      prevX = null;
    } else if (isIndexUp && isMiddleUp && isRingUp && isPinkyUp) {
      canvasLayer.clear();
      statusMsg = "ERASING CANVAS";
    } else if (isIndexUp && !isMiddleUp) {
      runTool(x, y);
    } else {
      if (isDragging) finalizeShape(x, y);
      isDragging = false;
      prevX = null;
      statusMsg = "READY";
    }
    drawGlowSkeleton(landmarks);
  }
  updateParticles();
}

function createSparkles(x, y) {
  for (let i = 0; i < 3; i++) particles.push(new Particle(x, y, currentColor));
}

function runTool(x, y) {
  if (currentTool === 'free') {
    statusMsg = "ARTISTIC DRAW";
    canvasLayer.stroke(currentColor);
    canvasLayer.strokeWeight(6);
    if (prevX != null) canvasLayer.line(prevX, prevY, x, y);
    prevX = x; prevY = y;
  } else {
    if (!isDragging) { startX = x; startY = y; isDragging = true; }
    tempLayer.clear();
    tempLayer.noFill();
    tempLayer.stroke(currentColor);
    tempLayer.strokeWeight(4);
    if (currentTool === 'rect') tempLayer.rect(startX, startY, x - startX, y - startY);
    if (currentTool === 'circle') tempLayer.ellipse(startX, startY, dist(startX, startY, x, y)*2);
    statusMsg = "SHAPING " + currentTool.toUpperCase();
  }
}

function finalizeShape(x, y) {
  canvasLayer.noFill();
  canvasLayer.stroke(currentColor);
  canvasLayer.strokeWeight(4);
  if (currentTool === 'rect') canvasLayer.rect(startX, startY, x - startX, y - startY);
  if (currentTool === 'circle') canvasLayer.ellipse(startX, startY, dist(startX, startY, x, y)*2);
  tempLayer.clear();
}

function drawUI() {
  let colors = [[0,255,200], [255,50,50], [255,255,0], [200,50,255], [255,255,255]];
  push();
  for (let i = 0; i < colors.length; i++) {
    fill(colors[i]);
    noStroke();
    rect(i * 75 + 20, 15, 60, 45, 12);
  }
  fill(255, 40);
  rect(450, 15, 100, 45, 12);
  rect(560, 15, 100, 45, 12);
  rect(670, 15, 100, 45, 12);
  scale(-1, 1);
  fill(255);
  textAlign(CENTER);
  textSize(14);
  text("FREE", -500, 43);
  text("RECT", -610, 43);
  text("CIRCLE", -720, 43);
  textSize(20);
  fill(currentColor);
  text("● " + statusMsg, -width/2, height - 30);
  pop();
}

function checkSelection(x) {
  if (x > 20 && x < 80) currentColor = [0,255,200];
  if (x > 95 && x < 155) currentColor = [255,50,50];
  if (x > 170 && x < 230) currentColor = [255,255,0];
  if (x > 245 && x < 305) currentColor = [200,50,255];
  if (x > 320 && x < 380) currentColor = [255,255,255];
  if (x > 450 && x < 550) currentTool = 'free';
  if (x > 560 && x < 660) currentTool = 'rect';
  if (x > 670 && x < 770) currentTool = 'circle';
}

class Particle {
  constructor(x, y, col) {
    this.x = x; this.y = y;
    this.vx = random(-2, 2); this.vy = random(-2, 2);
    this.alpha = 255; this.col = col;
  }
  update() { this.x += this.vx; this.y += this.vy; this.alpha -= 10; }
  show() {
    noStroke();
    fill(this.col[0], this.col[1], this.col[2], this.alpha);
    ellipse(this.x, this.y, 4);
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].show();
    if (particles[i].alpha <= 0) particles.splice(i, 1);
  }
}

function drawGlowSkeleton(landmarks) {
  stroke(currentColor);
  strokeWeight(3);
  for (let pt of landmarks) point(pt.x * width, pt.y * height);
}