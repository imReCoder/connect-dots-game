import { levels } from './levels.js';
const gameBoard = document.getElementById('game-board');
const canvasContainer = document.getElementById('canvas-container');
const canvas = document.createElement('canvas');
const currentLevelDisplay = document.getElementById('current-level');
const resetBtn = document.getElementById('reset-btn');

canvas.width = 600;
canvas.height = 600;

const ctx = canvas.getContext('2d');
canvasContainer.appendChild(canvas);


let gridSize;
let cellSize;
let isDrawing = false;
const allPaths = [];
let currentPath = [];

let currentColor;

let dots;


let currentLevel = 0;

function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "gray";
    ctx.lineWidth = 1;
  
    // Vertical lines
    for (let i = 0; i <= gridSize; i++) {
      const x = i * cellSize;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
  
    // Horizontal lines
    for (let i = 0; i <= gridSize; i++) {
      const y = i * cellSize;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  }
  
  

function drawDots() {



    dots.forEach(({ row, col, color }) => {
        const centerX = col * cellSize + cellSize / 2;
        const centerY = row * cellSize + cellSize / 2;
        const radius = cellSize * 0.2;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
    });
}

let animationStart = null;
let animationDuration = 60; // ms per segment
let animatingSegment = null; // { from, to }
let animationFrameId = null;

function startSegmentAnimation(from, to, onComplete) {
    animationStart = performance.now();
    animatingSegment = { from, to, onComplete };
    
    // Draw first frame immediately
    animateSegment(animationStart); // 👈 Start now!
  }

  function animateSegment(timestamp) {
    const elapsed = timestamp - animationStart;
    const progress = Math.min(1, elapsed / animationDuration);
  
    redrawAll(); // draw full path up to the last confirmed cell
  
    if (animatingSegment && progress < 1) {
      drawPartialLine(animatingSegment.from, animatingSegment.to, progress);
      animationFrameId = requestAnimationFrame(animateSegment);
    } else {
      // Animation complete
      if (animatingSegment?.onComplete) {
        animatingSegment.onComplete(); // now push the final point
      }
      animatingSegment = null;
    }
  }
  

  
  function drawPartialLine(from, to, progress) {
    const x1 = from.col * cellSize + cellSize / 2;
    const y1 = from.row * cellSize + cellSize / 2;
    const x2 = to.col * cellSize + cellSize / 2;
    const y2 = to.row * cellSize + cellSize / 2;
  
    const dx = x2 - x1;
    const dy = y2 - y1;
    const cx = x1 + dx * progress;
    const cy = y1 + dy * progress;
  
    ctx.save();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = cellSize * 0.12;
    ctx.lineCap = "round";
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#ffffff";
  
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(cx, cy);
    ctx.stroke();
  
    ctx.restore();
  }
  

function drawPath(path, color) {
    if (path.length < 2) return;

    const outerLineWidth = cellSize * 0.2;
    const innerLineWidth = cellSize * 0.1;

    // Calculate path as canvas coordinates
    const points = path.map(cell => ({
        x: cell.col * cellSize + cellSize / 2,
        y: cell.row * cellSize + cellSize / 2
    }));

    // 🟠 1. Draw glowing outer stroke
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = outerLineWidth;
    ctx.shadowColor = color;
    ctx.shadowBlur = 17;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    ctx.restore();

    // ⚪ 2. Draw crisp inner white stroke
    ctx.save();
    ctx.strokeStyle = "#ffffff"; // white core
    ctx.lineWidth = innerLineWidth;
    ctx.shadowBlur = 0;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    ctx.restore();
}



function getCellFromCoords(x, y) {
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
        return { row, col };
    }
    return null;
}

function findDotAtCell(cell) {
    return dots.find(dot => dot.row === cell.row && dot.col === cell.col);
}

function isSameCell(a, b) {
    return a && b && a.row === b.row && a.col === b.col;
}

function isAdjacent(cellA, cellB) {
    const dr = Math.abs(cellA.row - cellB.row);
    const dc = Math.abs(cellA.col - cellB.col);
    return (dr + dc === 1); // up/down or left/right only
}


function removeOverlappingCells(cell) {
    allPaths.forEach(p => {
        const idx = p.cells.findIndex(c => isSameCell(c, cell));
        if (idx !== -1) {
            p.cells = p.cells.slice(0, idx); // keep only up to the overlapping cell
        }
    });

    // Optionally remove any empty paths
    for (let i = allPaths.length - 1; i >= 0; i--) {
        if (allPaths[i].cells.length < 2) {
            allPaths.splice(i, 1);
        }
    }
}

function getDotPairsByColor() {
    const colorMap = {};
    dots.forEach(dot => {
        if (!colorMap[dot.color]) {
            colorMap[dot.color] = [];
        }
        colorMap[dot.color].push(dot);
    });
    return colorMap;
}

function isPathConnectingDots(path, dot1, dot2) {
    return (
        path.cells.some(c => isSameCell(c, dot1)) &&
        path.cells.some(c => isSameCell(c, dot2))
    );
}

function checkIfAllDotsConnected() {
    const dotPairs = getDotPairsByColor();

    for (const color in dotPairs) {
        const pair = dotPairs[color];
        if (pair.length !== 2) return false;

        const [dot1, dot2] = pair;

        const connected = allPaths.some(path =>
            path.color === color &&
            isPathConnectingDots(path, dot1, dot2)
        );

        if (!connected) return false;
    }

    return true;
}


canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cell = getCellFromCoords(x, y);
    console.log(cell)
    const dot = findDotAtCell(cell);

    if (dot) {
        const dotColor = dot.color;

        // 1a. Remove any existing path that starts at this dot
        for (let i = allPaths.length - 1; i >= 0; i--) {
            const path = allPaths[i];
            const start = path.cells[0];
            const end = path.cells[path.cells.length - 1];
      
            if (
              path.color === dotColor &&
              (isSameCell(start, cell) || isSameCell(end, cell))
            ) {
              allPaths.splice(i, 1); // remove the line
            }
        }
        // Start drawing only if there's a dot
        isDrawing = true;
        currentColor = dot.color;
        currentPath = [cell];
        redrawAll();
    }

    for (const path of allPaths) {
        const last = path.cells[path.cells.length - 1];
        if (isSameCell(cell, last)) {
            isDrawing = true;
            currentColor = path.color;
            currentPath = [...path.cells]; // clone the path to resume
            // Remove old copy — we will replace it on mouseup
            allPaths.splice(allPaths.indexOf(path), 1);
            redrawAll();
            return;
        }
    }

});

canvas.addEventListener("mousemove", (e) => {
    if (!isDrawing) return;
    if (animatingSegment) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cell = getCellFromCoords(x, y);

    const lastCell = currentPath[currentPath.length - 1];


    if (!cell || isSameCell(cell, lastCell)) return;

    // 🟥 Block if diagonal (not adjacent)
    if (!isAdjacent(cell, lastCell)) return;

    // 🟥 Stop drawing through dot with different color
    const dot = findDotAtCell(cell);
    if (dot && dot.color !== currentColor) return;

     // 🟥 If it's a same-colored dot (not the start), stop after adding it
     if (dot && dot.color === currentColor && !isSameCell(cell, currentPath[0])) {
        currentPath.push(cell);
        allPaths.push({ color: currentColor, cells: currentPath });
        isDrawing = false;
        redrawAll();

        return;
    }
    // 🔁 Backtracking own path
    const backIndex = currentPath.findIndex(c => isSameCell(c, cell));
    if (backIndex !== -1) {
        currentPath = currentPath.slice(0, backIndex + 1);
        redrawAll();
        return;
    }

    // ❌ Remove overlaps in other paths
    removeOverlappingCells(cell);

    // ✅ Add to path
    startSegmentAnimation(lastCell, cell, () => {
        currentPath.push(cell); // ✅ Push AFTER animation finishes
        redrawAll();
      });
    redrawAll();
});

canvas.addEventListener("mouseup", () => {
    if (isDrawing && currentPath.length > 1) {
        allPaths.push({
            color: currentColor,
            cells: [...currentPath],
        });
    }

    // Reset current path state
    isDrawing = false;
    currentColor = null;
    currentPath = [];

    redrawAll();

    if (checkIfAllDotsConnected()) {
        alert("✅ Level cleared!");
        setTimeout(() => {
            loadLevel(currentLevel + 1);
        }, 300);
    }
});

resetBtn.addEventListener("click", () => {
    loadLevel(currentLevel);
});




function redrawAll() {
    drawGrid();
    drawDots();
    allPaths.forEach(p => drawPath(p.cells, p.color));
    if (isDrawing && currentPath.length > 0 && currentColor) {
        drawPath(currentPath, currentColor);
    }
}

function loadLevel(levelIndex) {
    if (levelIndex >= levels.length) {
        alert("🎉 You completed all levels!");
        currentLevel = 0; // reset to first level
        loadLevel(currentLevel);
        return;
    }
    const level  = levels[levelIndex];
    gridSize = level.gridSize;
    cellSize = canvas.width / gridSize;
    dots = JSON.parse(JSON.stringify(level.dots)); // deep copy
    currentLevel = levelIndex;
    allPaths.length = 0; // clear all paths
    currentColor = null;
    currentPath = [];
    isDrawing = false;
    currentLevelDisplay.innerText = currentLevel+1;
    redrawAll();
}

loadLevel(currentLevel);
