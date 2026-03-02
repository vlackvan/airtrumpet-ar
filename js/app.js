/**
 * AirTrumpet — Main Application
 *
 * Entry point: initializes webcam, MediaPipe models, audio engine,
 * and drives the render loop via requestAnimationFrame.
 *
 * Render loop flow (30fps throttled detection):
 *   1. Draw video frame to canvas
 *   2. Run hand + face detection (throttled)
 *   3. Classify valve state + lip state
 *   4. If BOTH hand AND face detected → toneClassification → play note
 *   5. If EITHER missing → stop audio (matches Python else: mixer.music.stop())
 *   6. Render overlays + update HUD
 */

import { initHandDetector, detectHands } from './handDetector.js';
import { initFaceDetector, detectFace } from './faceDetector.js';
import { valveClassification, airflowClassification, distFaceToScreen, toneClassification } from './classifier.js';
import { initAudio, resumeAudio, playNote, stopNote } from './audioEngine.js';
import { drawFrame, updateHUD, updateFPS } from './renderer.js';

// ── DOM Elements ──
const loadingScreen = document.getElementById('loading-screen');
const startScreen = document.getElementById('start-screen');
const mainContainer = document.getElementById('main-container');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const progressBar = document.getElementById('loading-progress');
const statusText = document.getElementById('loading-status-text');
const videoEl = document.getElementById('webcam');
const canvasEl = document.getElementById('overlay-canvas');
const ctx = canvasEl.getContext('2d');

// ── State ──
let prevNote = 'Not Detected'; // Matches Python line 679 initialization
let isRunning = false;
let animFrameId = null;

// ── FPS tracking ──
let lastFrameTime = 0;
let frameCount = 0;
let fpsAccumulator = 0;
let displayFPS = 0;

// ── Detection throttle (~30fps) ──
const DETECTION_INTERVAL_MS = 33;
let lastDetectionTime = 0;

// Cached detection results (persisted between detection frames)
let cachedHandLandmarks = null;
let cachedFaceLandmarks = null;
let cachedValveState = 'Not Detected';
let cachedLipState = 'Not Detected';
let cachedNoteString = 'Not Detected';

// ── Initialization ──

/**
 * Load MediaPipe models and audio engine.
 * Shows progress on the loading screen.
 */
async function initialize() {
    let progress = 0;

    const updateProgress = (pct, msg) => {
        progress = pct;
        if (progressBar) progressBar.style.width = `${pct}%`;
        if (statusText) statusText.textContent = msg;
    };

    try {
        // Load hand detector (~40% of progress)
        updateProgress(5, 'Loading hand detection model…');
        await initHandDetector((msg) => updateProgress(20, msg));
        updateProgress(40, 'Hand detection ready');

        // Load face detector (~40% of progress)
        updateProgress(45, 'Loading face detection model…');
        await initFaceDetector((msg) => updateProgress(60, msg));
        updateProgress(80, 'Face detection ready');

        // Load audio samples (~20% of progress)
        updateProgress(85, 'Loading audio samples…');
        await initAudio((msg) => updateProgress(90, msg));
        updateProgress(100, 'Ready!');

        // Transition to start screen
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
            startScreen.classList.remove('hidden');
        }, 500);
    } catch (err) {
        console.error('[AirTrumpet] Initialization failed:', err);
        updateProgress(0, `Error: ${err.message}`);
    }
}

// ── Camera ──

/**
 * Requests webcam access and assigns the stream to the video element.
 */
async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
        },
        audio: false,
    });

    videoEl.srcObject = stream;

    return new Promise((resolve) => {
        videoEl.onloadedmetadata = () => {
            // Set canvas to match video dimensions
            canvasEl.width = videoEl.videoWidth;
            canvasEl.height = videoEl.videoHeight;
            resolve();
        };
    });
}

/**
 * Stops the webcam stream.
 */
function stopCamera() {
    if (videoEl.srcObject) {
        const tracks = videoEl.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
        videoEl.srcObject = null;
    }
}

// ── Render Loop ──

/**
 * Main render loop driven by requestAnimationFrame.
 * Detection is throttled to ~30fps; rendering runs at display refresh rate.
 */
function renderLoop(timestamp) {
    if (!isRunning) return;

    // FPS calculation
    if (lastFrameTime > 0) {
        const delta = timestamp - lastFrameTime;
        fpsAccumulator += delta;
        frameCount++;

        if (fpsAccumulator >= 1000) {
            displayFPS = (frameCount * 1000) / fpsAccumulator;
            frameCount = 0;
            fpsAccumulator = 0;
            updateFPS(displayFPS);
        }
    }
    lastFrameTime = timestamp;

    // Only run detection if enough time has passed (~30fps)
    const timeSinceLastDetection = timestamp - lastDetectionTime;
    if (timeSinceLastDetection >= DETECTION_INTERVAL_MS) {
        lastDetectionTime = timestamp;
        runDetection(timestamp);
    }

    // Draw frame with cached results (runs at display refresh rate)
    const w = canvasEl.width;
    const h = canvasEl.height;
    drawFrame(ctx, w, h, videoEl, cachedHandLandmarks, cachedFaceLandmarks, cachedValveState, cachedLipState, cachedNoteString);

    // Update HUD
    updateHUD(cachedValveState, cachedLipState, cachedNoteString);

    // Schedule next frame
    animFrameId = requestAnimationFrame(renderLoop);
}

/**
 * Runs MediaPipe detection and classification.
 * Called at ~30fps (throttled from display refresh rate).
 */
function runDetection(timestamp) {
    const timestampMs = Math.round(timestamp);

    // Detect hand and face landmarks
    cachedHandLandmarks = detectHands(videoEl, timestampMs);
    cachedFaceLandmarks = detectFace(videoEl, timestampMs);

    // Classify valve state (if hand detected)
    if (cachedHandLandmarks) {
        cachedValveState = valveClassification(cachedHandLandmarks);
    } else {
        cachedValveState = 'Not Detected';
    }

    // Classify lip state (if face detected)
    if (cachedFaceLandmarks) {
        const dist = distFaceToScreen(
            cachedFaceLandmarks[473], // left iris
            cachedFaceLandmarks[468]  // right iris
        );
        cachedLipState = airflowClassification(cachedFaceLandmarks, dist);
    } else {
        cachedLipState = 'Not Detected';
    }

    // Tone classification:
    // Audio stops when EITHER hand OR face is missing
    // (matches Python: if hands AND face → classify, else → mixer.music.stop())
    if (cachedHandLandmarks && cachedFaceLandmarks) {
        cachedNoteString = toneClassification(cachedValveState, cachedLipState);

        if (cachedNoteString !== prevNote) {
            playNote(cachedNoteString);
        }
        prevNote = cachedNoteString;
    } else {
        // Either hand or face not detected → stop audio
        stopNote();
        cachedNoteString = 'Not Detected';
        prevNote = 'Not Detected';
    }
}

// ── Controls ──

/**
 * Start button handler: requests camera, resumes audio, starts loop.
 */
async function handleStart() {
    try {
        startScreen.classList.add('hidden');
        mainContainer.classList.remove('hidden');

        await startCamera();
        await resumeAudio();

        isRunning = true;
        lastFrameTime = 0;
        frameCount = 0;
        fpsAccumulator = 0;
        lastDetectionTime = 0;
        prevNote = 'Not Detected';

        animFrameId = requestAnimationFrame(renderLoop);
    } catch (err) {
        console.error('[AirTrumpet] Start failed:', err);
        alert(`Failed to start: ${err.message}\n\nPlease ensure camera permissions are granted.`);
        mainContainer.classList.add('hidden');
        startScreen.classList.remove('hidden');
    }
}

/**
 * Stop button handler: stops loop, camera, and audio.
 */
function handleStop() {
    isRunning = false;

    if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
    }

    stopNote();
    stopCamera();

    // Clear canvas
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

    // Reset HUD
    cachedValveState = 'Not Detected';
    cachedLipState = 'Not Detected';
    cachedNoteString = 'Not Detected';
    prevNote = 'Not Detected';
    updateHUD(cachedValveState, cachedLipState, cachedNoteString);
    updateFPS(0);

    // Show start screen
    mainContainer.classList.add('hidden');
    startScreen.classList.remove('hidden');
}

// ── Event Listeners ──

startBtn.addEventListener('click', handleStart);
stopBtn.addEventListener('click', handleStop);

// ── Boot ──

initialize();
