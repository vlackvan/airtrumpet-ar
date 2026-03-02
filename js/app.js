/**
 * AirTrumpet — Main Application
 */

import { initHandDetector, detectHands } from './handDetector.js';
import { initFaceDetector, detectFace } from './faceDetector.js';
import { valveClassification, airflowClassification, distFaceToScreen, toneClassification } from './classifier.js';
import { initAudio, resumeAudio, playNote, stopNote } from './audioEngine.js';
import { drawFrame, updateHUD, updateFPS } from './renderer.js';
import { initMission, checkMission } from './mission.js';

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
let prevNote = 'Not Detected';
let isRunning = false;
let animFrameId = null;

let lastFrameTime = 0;
let frameCount = 0;
let fpsAccumulator = 0;
let displayFPS = 0;

const DETECTION_INTERVAL_MS = 33;
let lastDetectionTime = 0;

let cachedHandLandmarks = null;
let cachedFaceLandmarks = null;
let cachedValveState = 'Not Detected';
let cachedLipState = 'Not Detected';
let cachedNoteString = 'Not Detected';

// ── Initialization ──

async function initialize() {
    console.log('[AirTrumpet] 초기화 시작...');
    let progress = 0;

    const updateProgress = (pct, msg) => {
        progress = pct;
        if (progressBar) progressBar.style.width = `${pct}%`;
        if (statusText) statusText.textContent = msg;
    };

    try {
        updateProgress(5, '손동작 감지 모델 로딩 중…');
        await initHandDetector((msg) => updateProgress(20, '손동작 감지 모델 준비 중…'));
        updateProgress(40, '손동작 감지 모델 완료');

        updateProgress(45, '얼굴 감지 모델 로딩 중…');
        await initFaceDetector((msg) => updateProgress(60, '얼굴 감지 모델 준비 중…'));
        updateProgress(80, '얼굴 감지 모델 완료');

        updateProgress(85, '오디오 샘플 로딩 중…');
        await initAudio((msg) => updateProgress(90, '오디오 설정 중…'));
        updateProgress(100, '준비 완료!');

        // Initialize Mission System
        initMission();

        setTimeout(() => {
            if (loadingScreen) loadingScreen.classList.add('hidden');
            if (startScreen) startScreen.classList.remove('hidden');
        }, 500);
    } catch (err) {
        console.error('[AirTrumpet] 초기화 실패:', err);
        updateProgress(0, `오류 발생: ${err.message}`);
    }
}

// ── Camera ──

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false,
        });
        videoEl.srcObject = stream;
        return new Promise((resolve) => {
            videoEl.onloadedmetadata = () => {
                canvasEl.width = videoEl.videoWidth;
                canvasEl.height = videoEl.videoHeight;
                resolve();
            };
        });
    } catch (err) {
        throw new Error('카메라 액세스 거부 또는 장치 없음');
    }
}

function stopCamera() {
    if (videoEl && videoEl.srcObject) {
        const tracks = videoEl.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
        videoEl.srcObject = null;
    }
}

// ── Render Loop ──

function renderLoop(timestamp) {
    if (!isRunning) return;

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

    const timeSinceLastDetection = timestamp - lastDetectionTime;
    if (timeSinceLastDetection >= DETECTION_INTERVAL_MS) {
        lastDetectionTime = timestamp;
        runDetection(timestamp);
    }

    const w = canvasEl.width;
    const h = canvasEl.height;
    drawFrame(ctx, w, h, videoEl, cachedHandLandmarks, cachedFaceLandmarks, cachedValveState, cachedLipState, cachedNoteString);
    updateHUD(cachedValveState, cachedLipState, cachedNoteString);

    // Update Mission Progress
    checkMission(cachedNoteString);

    animFrameId = requestAnimationFrame(renderLoop);
}

function runDetection(timestamp) {
    const timestampMs = Math.round(timestamp);
    cachedHandLandmarks = detectHands(videoEl, timestampMs);
    cachedFaceLandmarks = detectFace(videoEl, timestampMs);

    if (cachedHandLandmarks) {
        cachedValveState = valveClassification(cachedHandLandmarks);
    } else {
        cachedValveState = 'Not Detected';
    }

    if (cachedFaceLandmarks) {
        const dist = distFaceToScreen(cachedFaceLandmarks[473], cachedFaceLandmarks[468]);
        cachedLipState = airflowClassification(cachedFaceLandmarks, dist);
    } else {
        cachedLipState = 'Not Detected';
    }

    if (cachedHandLandmarks && cachedFaceLandmarks) {
        cachedNoteString = toneClassification(cachedValveState, cachedLipState);
        if (cachedNoteString !== prevNote) playNote(cachedNoteString);
        prevNote = cachedNoteString;
    } else {
        stopNote();
        cachedNoteString = 'Not Detected';
        prevNote = 'Not Detected';
    }
}

// ── Controls ──

async function handleStart() {
    try {
        startScreen.classList.add('hidden');
        mainContainer.classList.remove('hidden');
        await startCamera();
        await resumeAudio();
        isRunning = true;
        lastFrameTime = 0; frameCount = 0; fpsAccumulator = 0; lastDetectionTime = 0;
        prevNote = 'Not Detected';
        animFrameId = requestAnimationFrame(renderLoop);
    } catch (err) {
        console.error('[AirTrumpet] 시작 실패:', err);
        alert(err.message);
        mainContainer.classList.add('hidden');
        startScreen.classList.remove('hidden');
    }
}

function handleStop() {
    isRunning = false;
    if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
    stopNote(); stopCamera();
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    cachedValveState = 'Not Detected'; cachedLipState = 'Not Detected'; cachedNoteString = 'Not Detected'; prevNote = 'Not Detected';
    updateHUD(cachedValveState, cachedLipState, cachedNoteString);
    updateFPS(0);
    mainContainer.classList.add('hidden');
    startScreen.classList.remove('hidden');
}

// ── Event Listeners ──
if (startBtn) startBtn.addEventListener('click', handleStart);
if (stopBtn) stopBtn.addEventListener('click', handleStop);

initialize();
