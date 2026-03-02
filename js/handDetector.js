/**
 * AirTrumpet — Hand Detector
 *
 * Wraps @mediapipe/tasks-vision HandLandmarker with synchronous
 * detectForVideo() API for use in the requestAnimationFrame loop.
 *
 * numHands is set to 1 as an intentional optimization — the Python
 * original defaults to 2 but overwrites valve_state with the last
 * detected hand in a for-loop, effectively using only one.
 */

import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

let handLandmarker = null;

/**
 * Initializes the HandLandmarker model.
 * Must be called once before detect().
 * @param {(msg: string) => void} [onStatus] - Optional status callback for loading UI
 */
export async function initHandDetector(onStatus) {
    onStatus?.('Loading hand detection model…');

    const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
    );

    handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task',
            delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
    });

    onStatus?.('Hand detection ready');
}

/**
 * Detects hand landmarks in the current video frame.
 *
 * @param {HTMLVideoElement} videoEl - The webcam video element
 * @param {number} timestampMs - Current frame timestamp in ms (performance.now())
 * @returns {Array<{ x: number, y: number, z: number }>|null} 21 landmarks or null
 */
export function detectHands(videoEl, timestampMs) {
    if (!handLandmarker) return null;

    const result = handLandmarker.detectForVideo(videoEl, timestampMs);

    if (!result.landmarks || result.landmarks.length === 0) {
        return null;
    }

    // Return the first (and only) detected hand's 21 landmarks
    return result.landmarks[0];
}
