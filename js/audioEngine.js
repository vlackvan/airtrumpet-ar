/**
 * AirTrumpet — Audio Engine
 */

import NOTE_MAP from './noteMap.js';

/** @type {AudioContext|null} */
let audioCtx = null;

/** @type {GainNode|null} */
let gainNode = null;

/** @type {AudioBufferSourceNode|null} */
let currentSource = null;

/** @type {string|null} Current playing note name */
let currentNote = null;

/** @type {Map<string, AudioBuffer>} Pre-loaded audio buffers */
const buffers = new Map();

/** Envelope ramp duration in seconds */
const RAMP_DURATION = 0.02; // 20ms

/** @type {boolean} Global mute state */
let isMuted = false;

/**
 * Initializes the audio engine: creates AudioContext, GainNode,
 * and pre-loads all 29 WAV files.
 */
export async function initAudio(onStatus) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    gainNode = audioCtx.createGain();
    gainNode.gain.value = 0;
    gainNode.connect(audioCtx.destination);

    // Pre-load all WAV files
    const entries = Object.entries(NOTE_MAP).filter(([, path]) => path !== null);
    const total = entries.length;
    let loaded = 0;

    onStatus?.(`Loading audio samples (0/${total})…`);

    await Promise.all(
        entries.map(async ([note, path]) => {
            try {
                const response = await fetch(path);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                buffers.set(note, audioBuffer);
            } catch (err) {
                console.warn(`[AudioEngine] Failed to load ${note}: ${err.message}`);
            }
            loaded++;
            onStatus?.(`Loading audio samples (${loaded}/${total})…`);
        })
    );

    onStatus?.('Audio engine ready');
}

/**
 * Resumes AudioContext (must be called from a user gesture handler).
 */
export async function resumeAudio() {
    if (audioCtx && audioCtx.state === 'suspended') {
        await audioCtx.resume();
    }
}

/**
 * Toggles the global mute state and stops any currently playing note if muted.
 * @returns {boolean} New mute state (true if muted)
 */
export function toggleMute() {
    isMuted = !isMuted;
    if (isMuted) {
        stopNote();
    }
    return isMuted;
}

/**
 * Plays a note in a loop, or stops playback for "None".
 */
export function playNote(noteName) {
    if (noteName === currentNote) return;
    stopCurrentSource();

    if (isMuted || noteName === 'None' || !buffers.has(noteName)) {
        currentNote = noteName;
        return;
    }

    const source = audioCtx.createBufferSource();
    source.buffer = buffers.get(noteName);
    source.loop = true;
    source.connect(gainNode);

    const now = audioCtx.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(1, now + RAMP_DURATION);

    source.start(0);
    currentSource = source;
    currentNote = noteName;
}

/**
 * Stops all audio playback with a ramp-down envelope.
 */
export function stopNote() {
    stopCurrentSource();
    currentNote = null;
}

function stopCurrentSource() {
    if (!currentSource || !audioCtx) return;

    const now = audioCtx.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.linearRampToValueAtTime(0, now + RAMP_DURATION);

    const sourceToStop = currentSource;
    setTimeout(() => {
        try {
            sourceToStop.stop();
            sourceToStop.disconnect();
        } catch {
            // Already stopped
        }
    }, RAMP_DURATION * 1000 + 10);

    currentSource = null;
}
