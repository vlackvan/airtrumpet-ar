/**
 * AirTrumpet — Canvas Renderer
 *
 * Draws webcam frame, MediaPipe landmark overlays, and HUD text
 * onto the <canvas> element. The canvas has CSS transform: scaleX(-1)
 * for a natural selfie view — landmark coordinates stay un-mirrored.
 *
 * Hand landmarks drawn: 5–16 (INDEX_MCP through RING_TIP).
 * Excluded: Wrist(0), Thumb(1–4), Pinky(17–20).
 *
 * Face mesh: lips-only contour (intentional simplification
 * from the Python full tesselation for web performance).
 */

// Hand connection pairs (only between landmarks 5–16)
// Derived from MediaPipe HAND_CONNECTIONS minus excluded landmarks
const HAND_CONNECTIONS = [
    [5, 6], [6, 7], [7, 8],     // Index finger
    [5, 9],                      // MCP bridge: index → middle
    [9, 10], [10, 11], [11, 12], // Middle finger
    [9, 13],                     // MCP bridge: middle → ring
    [13, 14], [14, 15], [15, 16], // Ring finger
];

// Lip contour landmark indices for face mesh
// Outer lip loop
const LIP_OUTER = [
    61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291,
    409, 270, 269, 267, 0, 37, 39, 40, 185, 61,
];

// Inner lip loop
const LIP_INNER = [
    78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308,
    415, 310, 311, 312, 13, 82, 81, 80, 191, 78,
];

/** Colors */
const HAND_COLOR = 'rgba(108, 99, 255, 0.9)';
const HAND_POINT_COLOR = '#8b7cff';
const LIP_COLOR = 'rgba(255, 120, 150, 0.7)';
const LIP_FILL = 'rgba(255, 120, 150, 0.1)';

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w - Canvas width
 * @param {number} h - Canvas height
 * @param {HTMLVideoElement} video
 * @param {Array|null} handLandmarks - 21 hand landmarks or null
 * @param {Array|null} faceLandmarks - 478 face landmarks or null
 * @param {string} valveState
 * @param {string} lipState
 * @param {string} noteString
 */
export function drawFrame(ctx, w, h, video, handLandmarks, faceLandmarks, valveState, lipState, noteString) {
    // Clear canvas
    ctx.clearRect(0, 0, w, h);

    // Draw video frame
    ctx.drawImage(video, 0, 0, w, h);

    // Draw hand landmarks
    if (handLandmarks) {
        drawHandLandmarks(ctx, w, h, handLandmarks);
    }

    // Draw lip contour
    if (faceLandmarks) {
        drawLipContour(ctx, w, h, faceLandmarks);
    }
}

/**
 * Draws hand landmarks (indices 5–16) and their connections.
 */
function drawHandLandmarks(ctx, w, h, lm) {
    // Draw connections
    ctx.strokeStyle = HAND_COLOR;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    for (const [a, b] of HAND_CONNECTIONS) {
        if (!lm[a] || !lm[b]) continue;
        ctx.beginPath();
        ctx.moveTo(lm[a].x * w, lm[a].y * h);
        ctx.lineTo(lm[b].x * w, lm[b].y * h);
        ctx.stroke();
    }

    // Draw landmark points (5–16 only)
    for (let i = 5; i <= 16; i++) {
        if (!lm[i]) continue;
        const x = lm[i].x * w;
        const y = lm[i].y * h;

        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = HAND_POINT_COLOR;
        ctx.fill();

        // Highlight PIP/TIP pairs used for valve detection (6/8, 10/12, 14/16)
        if (i === 6 || i === 8 || i === 10 || i === 12 || i === 14 || i === 16) {
            ctx.beginPath();
            ctx.arc(x, y, 7, 0, 2 * Math.PI);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    }
}

/**
 * Draws the lip contour (outer + inner loops).
 */
function drawLipContour(ctx, w, h, lm) {
    drawLipLoop(ctx, w, h, lm, LIP_OUTER, true);
    drawLipLoop(ctx, w, h, lm, LIP_INNER, false);
}

/**
 * Draws a single lip loop (array of landmark indices forming a closed path).
 */
function drawLipLoop(ctx, w, h, lm, indices, fill) {
    if (!lm[indices[0]]) return;

    ctx.beginPath();
    ctx.moveTo(lm[indices[0]].x * w, lm[indices[0]].y * h);

    for (let i = 1; i < indices.length; i++) {
        const idx = indices[i];
        if (!lm[idx]) continue;
        ctx.lineTo(lm[idx].x * w, lm[idx].y * h);
    }

    ctx.closePath();
    ctx.strokeStyle = LIP_COLOR;
    ctx.lineWidth = 2;
    ctx.stroke();

    if (fill) {
        ctx.fillStyle = LIP_FILL;
        ctx.fill();
    }
}

/**
 * Updates the HUD elements in the DOM (faster than drawing text on canvas).
 *
 * @param {string} valveState
 * @param {string} lipState
 * @param {string} noteString
 */
export function updateHUD(valveState, lipState, noteString) {
    // Valve indicators
    const backEl = document.getElementById('valve-back');
    const midEl = document.getElementById('valve-middle');
    const frontEl = document.getElementById('valve-front');

    if (backEl) backEl.classList.toggle('pressed', valveState.includes('Front'));
    if (midEl) midEl.classList.toggle('pressed', valveState.includes('Middle'));
    if (frontEl) frontEl.classList.toggle('pressed', valveState.includes('Back'));

    // Lip state badge
    const lipBadge = document.getElementById('lip-badge');
    if (lipBadge) {
        const lipTranslations = {
            'Open': '열림 (Open)',
            'Closed': '닫힘 (Closed)',
            'Strained': '조임 (Strained)',
            'Not Detected': '감지되지 않음'
        };
        lipBadge.textContent = lipTranslations[lipState] || lipState;
        lipBadge.setAttribute('data-state', lipState);
    }

    // Note display
    const noteDisplay = document.getElementById('note-display');
    if (noteDisplay) {
        const isPlaying = noteString && noteString !== 'None' && noteString !== 'Not Detected';
        noteDisplay.textContent = isPlaying ? noteString : '—';
        noteDisplay.classList.toggle('active', isPlaying);
    }
}

/**
 * Updates the FPS counter element.
 * @param {number} fps
 */
export function updateFPS(fps) {
    const el = document.getElementById('fps-counter');
    if (el) {
        el.textContent = `${Math.round(fps)} FPS`;
    }
}
