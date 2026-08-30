const COLS = 30;
const ROWS = 20;
let grid = [];
let isPlaying = false;
let intervalId = null;
let speed = 400; // Turtle speed (ms)
const FAST_SPEED = 100; // Rabbit speed

let isDrawing = false; // For click-and-drag drawing
let drawingState = 1; // 1 to draw alive, 0 to draw dead

const gridContainer = document.getElementById('grid-container');
const btnPlay = document.getElementById('btn-play');
const btnPause = document.getElementById('btn-pause');
const btnStep = document.getElementById('btn-step');
const btnClear = document.getElementById('btn-clear');
const btnSpeed = document.getElementById('btn-speed');

// Pre-canned shapes (coordinates relative to top-left of shape)
const SHAPES = {
    'glider': [
        [0, 1],
        [1, 2],
        [2, 0], [2, 1], [2, 2]
    ],
    'blinker': [
        [0, 0], [0, 1], [0, 2]
    ],
    'toad': [
        [0, 1], [0, 2], [0, 3],
        [1, 0], [1, 1], [1, 2]
    ],
    'spaceship': [
        [0, 1], [0, 4],
        [1, 0],
        [2, 0], [2, 4],
        [3, 0], [3, 1], [3, 2], [3, 3]
    ]
};


// 1. Initialize Grid
function initGrid() {
    gridContainer.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
    gridContainer.innerHTML = '';
    grid = new Array(ROWS).fill(null).map(() => new Array(COLS).fill(0));

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = r;
            cell.dataset.col = c;

            // Touch/Mouse interactions
            cell.addEventListener('mousedown', handlePointerDown);
            cell.addEventListener('mouseenter', handlePointerEnter);
            cell.addEventListener('touchstart', handleTouchStart, {passive: false});

            gridContainer.appendChild(cell);
        }
    }

    // Global up to stop drawing
    document.addEventListener('mouseup', () => isDrawing = false);
    document.addEventListener('touchend', () => isDrawing = false);

    // Handle touch move for swiping across cells
    gridContainer.addEventListener('touchmove', handleTouchMove, {passive: false});

    // Setup shape buttons
    document.querySelectorAll('.shape-btn').forEach(btn => {
        btn.addEventListener('click', (e) => placeShape(e.target.dataset.shape));
    });

    // Setup Save/Load buttons
    document.querySelectorAll('.save-btn').forEach(btn => {
        btn.addEventListener('click', (e) => saveSlot(e.target.dataset.slot));
    });
    document.querySelectorAll('.load-btn').forEach(btn => {
        btn.addEventListener('click', (e) => loadSlot(e.target.dataset.slot));
    });

    // Check initial slot states
    updateSlotButtons();
}

function toggleCell(r, c, forceState = null) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;

    if (forceState !== null) {
        grid[r][c] = forceState;
    } else {
        grid[r][c] = grid[r][c] ? 0 : 1;
    }

    const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
    if (grid[r][c]) {
        cell.classList.add('alive');
    } else {
        cell.classList.remove('alive');
    }
}

// Interaction Handlers
function handlePointerDown(e) {
    isDrawing = true;
    const r = parseInt(e.target.dataset.row);
    const c = parseInt(e.target.dataset.col);
    drawingState = grid[r][c] ? 0 : 1;
    toggleCell(r, c, drawingState);
}

function handlePointerEnter(e) {
    if (isDrawing) {
        const r = parseInt(e.target.dataset.row);
        const c = parseInt(e.target.dataset.col);
        toggleCell(r, c, drawingState);
    }
}

function handleTouchStart(e) {
    e.preventDefault();
    isDrawing = true;
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);

    if (target && target.classList.contains('cell')) {
        const r = parseInt(target.dataset.row);
        const c = parseInt(target.dataset.col);
        drawingState = grid[r][c] ? 0 : 1;
        toggleCell(r, c, drawingState);
    }
}

function handleTouchMove(e) {
    e.preventDefault();
    if (!isDrawing) return;

    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);

    if (target && target.classList.contains('cell')) {
        const r = parseInt(target.dataset.row);
        const c = parseInt(target.dataset.col);
        toggleCell(r, c, drawingState);
    }
}


// Update DOM based on grid array
function updateGridDisplay() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        const r = parseInt(cell.dataset.row);
        const c = parseInt(cell.dataset.col);
        if (grid[r][c] === 1) {
            cell.classList.add('alive');
        } else {
            cell.classList.remove('alive');
        }
    });
}

// 2. Core Logic: Next Generation
function nextGeneration() {
    const nextGrid = new Array(ROWS).fill(null).map(() => new Array(COLS).fill(0));

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const aliveNeighbors = countAliveNeighbors(r, c);
            const isAlive = grid[r][c] === 1;

            if (isAlive && (aliveNeighbors === 2 || aliveNeighbors === 3)) {
                nextGrid[r][c] = 1; // Survive
            } else if (!isAlive && aliveNeighbors === 3) {
                nextGrid[r][c] = 1; // Reproduction
            } else {
                nextGrid[r][c] = 0; // Underpopulation or Overpopulation
            }
        }
    }

    grid = nextGrid;
    updateGridDisplay();
}

function countAliveNeighbors(row, col) {
    let count = 0;
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            if (i === 0 && j === 0) continue; // Skip self

            // Wrapping logic (toroidal array)
            const r = (row + i + ROWS) % ROWS;
            const c = (col + j + COLS) % COLS;

            count += grid[r][c];
        }
    }
    return count;
}

// 3. Playback Controls
function play() {
    isPlaying = true;
    btnPlay.classList.add('hidden');
    btnPause.classList.remove('hidden');
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(nextGeneration, speed);
}

function pause() {
    isPlaying = false;
    btnPause.classList.add('hidden');
    btnPlay.classList.remove('hidden');
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
}

function clearGrid() {
    pause();
    grid = new Array(ROWS).fill(null).map(() => new Array(COLS).fill(0));
    updateGridDisplay();
}

function toggleSpeed() {
    if (speed === 400) {
        speed = FAST_SPEED;
        btnSpeed.textContent = '🐇 Fast';
    } else {
        speed = 400;
        btnSpeed.textContent = '🐢 Slow';
    }

    if (isPlaying) {
        play();
    }
}

// 4. Magic Shapes
function placeShape(shapeName) {
    pause();
    const coords = SHAPES[shapeName];
    if (!coords) return;

    // Find roughly the center of the grid
    const centerRow = Math.floor(ROWS / 2);
    const centerCol = Math.floor(COLS / 2);

    // Place shape offset by center
    coords.forEach(([rOffset, cOffset]) => {
        const r = centerRow + rOffset - 1; // -1 to visually center better
        const c = centerCol + cOffset - 1;
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
            grid[r][c] = 1;
        }
    });

    updateGridDisplay();
}

// 5. Save and Load
function saveSlot(slotId) {
    // Convert grid to a flat string or JSON for easy storage
    const gridData = JSON.stringify(grid);
    localStorage.setItem(`magicShapesSlot_${slotId}`, gridData);

    // Visual feedback
    const btn = document.querySelector(`.save-btn[data-slot="${slotId}"]`);
    const originalText = btn.textContent;
    btn.textContent = '✅ Saved!';
    btn.style.backgroundColor = '#4CAF50';

    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.backgroundColor = ''; // Revert to CSS default
    }, 1000);

    updateSlotButtons();
}

function loadSlot(slotId) {
    pause();
    const gridData = localStorage.getItem(`magicShapesSlot_${slotId}`);
    if (gridData) {
        try {
            grid = JSON.parse(gridData);
            updateGridDisplay();

            // Visual feedback
            const btn = document.querySelector(`.load-btn[data-slot="${slotId}"]`);
            const originalText = btn.textContent;
            btn.textContent = '✅ Loaded!';
            setTimeout(() => btn.textContent = originalText, 1000);
        } catch(e) {
            console.error("Error loading slot", e);
        }
    }
}

function updateSlotButtons() {
    // Grey out load buttons if slot is empty
    document.querySelectorAll('.load-btn').forEach(btn => {
        const slotId = btn.dataset.slot;
        if (localStorage.getItem(`magicShapesSlot_${slotId}`)) {
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        } else {
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        }
    });
}

// Event Listeners for Controls
btnPlay.addEventListener('click', play);
btnPause.addEventListener('click', pause);
btnStep.addEventListener('click', () => {
    pause();
    nextGeneration();
});
btnClear.addEventListener('click', clearGrid);
btnSpeed.addEventListener('click', toggleSpeed);

// Initialize on load
initGrid();