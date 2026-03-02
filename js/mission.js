/**
 * AirTrumpet — Mission System with Fingering Guide & Box Progress
 */

import { toKoreanNote } from './noteMap.js';

const SCALE_MISSION = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
let missionGuides = {};

let currentStep = 0;
let isActive = false;
let holdStartTime = 0;
const REQUIRED_HOLD_MS = 1000;

/**
 * Initializes the mission UI and event listeners.
 */
export async function initMission() {
    const startBtn = document.getElementById('mission-start-btn');
    if (startBtn) {
        startBtn.addEventListener('click', startMission);
    }

    try {
        const response = await fetch('/mission_guide.json');
        missionGuides = await response.json();
    } catch (err) {
        console.error('[AirTrumpet] 미션 가이드를 불러올 수 없습니다:', err);
    }
}

function startMission() {
    isActive = true;
    currentStep = 0;
    holdStartTime = 0;

    const missionHud = document.getElementById('mission-hud');
    const startBtn = document.getElementById('mission-start-btn');
    const activePanel = document.getElementById('mission-active-panel');
    
    if (missionHud) missionHud.classList.add('enlarged');
    if (startBtn) startBtn.classList.add('hidden');
    if (activePanel) activePanel.classList.remove('hidden');

    updateMissionHUD();
}

/**
 * Checks current note and updates progress.
 */
export function checkMission(currentNote) {
    if (!isActive) return;

    const targetNote = SCALE_MISSION[currentStep];
    const statusText = document.getElementById('mission-status');

    if (currentNote === targetNote) {
        if (holdStartTime === 0) holdStartTime = Date.now();

        const elapsed = Date.now() - holdStartTime;
        const percent = Math.min(100, (elapsed / REQUIRED_HOLD_MS) * 100);
        
        if (statusText) {
            statusText.style.setProperty('--p', `${percent}%`);
            statusText.textContent = `정확합니다! ${((REQUIRED_HOLD_MS - elapsed) / 1000).toFixed(1)}초 더...`;
        }

        if (elapsed >= REQUIRED_HOLD_MS) nextStep();
    } else {
        holdStartTime = 0;
        if (statusText) {
            statusText.style.setProperty('--p', '0%');
            
            // Fix: Consistency with updateMissionHUD logic
            const guideKey = currentStep === 0 ? "start" : `${SCALE_MISSION[currentStep - 1]}-${targetNote}`;
            const customGuide = missionGuides[guideKey];
            statusText.textContent = customGuide || `${toKoreanNote(targetNote)}를 연주해 보세요!`;
        }
    }
}

function nextStep() {
    currentStep++;
    holdStartTime = 0;

    const missionTarget = document.querySelector('.mission-target');
    if (missionTarget) {
        missionTarget.classList.add('success-animate');
        setTimeout(() => missionTarget.classList.remove('success-animate'), 500);
    }

    if (currentStep >= SCALE_MISSION.length) {
        completeMission();
    } else {
        updateMissionHUD();
    }
}

function updateMissionHUD() {
    const targetNoteDisplay = document.getElementById('target-note-display');
    const targetNote = SCALE_MISSION[currentStep];
    if (targetNoteDisplay) targetNoteDisplay.textContent = toKoreanNote(targetNote);
    
    const statusText = document.getElementById('mission-status');
    if (statusText) {
        statusText.style.setProperty('--p', '0%');
        // Fix: Consistency with checkMission logic
        const guideKey = currentStep === 0 ? "start" : `${SCALE_MISSION[currentStep - 1]}-${targetNote}`;
        const customGuide = missionGuides[guideKey];
        statusText.textContent = customGuide || `${toKoreanNote(targetNote)}를 연주해 보세요!`;
    }
}

function completeMission() {
    isActive = false;
    const missionHud = document.getElementById('mission-hud');
    const statusText = document.getElementById('mission-status');
    const activePanel = document.getElementById('mission-active-panel');
    const startBtn = document.getElementById('mission-start-btn');

    if (statusText) {
        statusText.style.setProperty('--p', '100%');
        statusText.textContent = '🎉 모든 음계 정복 성공!';
    }

    setTimeout(() => {
        if (missionHud) missionHud.classList.remove('enlarged');
        if (activePanel) activePanel.classList.add('hidden');
        if (startBtn) {
            startBtn.classList.remove('hidden');
            startBtn.textContent = '미션 시작';
        }
    }, 4000);
}
