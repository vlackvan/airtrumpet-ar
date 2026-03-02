/**
 * AirTrumpet — Face Detector
 *
 * Wraps @mediapipe/tasks-vision FaceLandmarker with synchronous
 * detectForVideo() API for use in the requestAnimationFrame loop.
 *
 * Tasks Vision FaceLandmarker includes iris landmarks (468–477)
 * by default — no refineLandmarks flag needed (that was a legacy
 * API parameter).
 */

import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

let faceLandmarker = null;

/**
 * Initializes the FaceLandmarker model.
 * Must be called once before detect().
 * @param {(msg: string) => void} [onStatus] - Optional status callback for loading UI
 */
export async function initFaceDetector(onStatus) {
    onStatus?.('Loading face detection model…');

    const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
    );

    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task',
            delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
    });

    onStatus?.('Face detection ready');
}

/**
 * Detects face landmarks in the current video frame.
 *
 * @param {HTMLVideoElement} videoEl - The webcam video element
 * @param {number} timestampMs - Current frame timestamp in ms (performance.now())
 * @returns {Array<{ x: number, y: number, z: number }>|null} 478 landmarks or null
 */
export function detectFace(videoEl, timestampMs) {
    if (!faceLandmarker) return null;

    const result = faceLandmarker.detectForVideo(videoEl, timestampMs);

    if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
        return null;
    }

    // Return the first detected face's 478 landmarks (includes iris)
    return result.faceLandmarks[0];
}
