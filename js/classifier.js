/**
 * AirTrumpet — Classification Logic
 */

import {
    STANDARD_DISTANCE,
    SCREEN_TO_IRL_CONST,
    PURSED_LIPS_THRESHOLD_X,
    STRAINED_LIPS_THRESHOLD_X,
    STRAINED_LIPS_THRESHOLD_Y,
} from './constants.js';

/**
 * Estimates distance from face to screen.
 */
export function distFaceToScreen(leftIris, rightIris) {
    const dx = leftIris.x - rightIris.x;
    const dy = leftIris.y - rightIris.y;
    return SCREEN_TO_IRL_CONST / Math.hypot(dx, dy);
}

/**
 * Determines valve state from hand landmarks.
 */
export function valveClassification(lm) {
    const backPressed = lm[8].y >= lm[6].y;
    const middlePressed = lm[12].y >= lm[10].y;
    const frontPressed = lm[16].y >= lm[14].y;

    if (!backPressed && !middlePressed && !frontPressed) {
        return 'None';
    }

    let state = '';
    if (backPressed) state += 'Back';
    if (middlePressed) state += 'Middle';
    if (frontPressed) state += 'Front';
    return state;
}

/**
 * Classifies lip gestures.
 */
export function airflowClassification(lm, distToScreen) {
    const scale = STANDARD_DISTANCE / distToScreen;
    const xDiffEdge = Math.abs(lm[291].x - lm[61].x);
    const yDiffOuter = Math.abs(lm[0].y - lm[17].y);
    const lipIsClosed = Math.ceil(lm[13].y * 100) >= Math.floor(lm[14].y * 100);

    // Lip NOT closed → "Open" (Pursed collapsed into Open)
    if (!lipIsClosed) {
        return 'Open';
    }

    // Lip IS closed → "Strained" or "Closed"
    // Strained: tight vertical gap with moderate-to-wide commissures
    // (absorbs both Strained and Forced from the original 6-state model)
    if (lipIsClosed) {
        if (yDiffOuter <= STRAINED_LIPS_THRESHOLD_Y * scale) {
            return 'Strained';
        }
        return 'Closed';
    }

    return 'Open';
}

/**
 * 2D lookup table: lipState → valveState → note string.
 */
export const TONE_TABLE = {
    Closed: {
        BackMiddleFront: 'C#4',
        None: 'C4',
        Front: 'E4',
        Middle: 'F#4',
        Back: 'F4',
        MiddleFront: 'D#4',   // Eb4
        BackFront: 'D4',
        BackMiddle: 'E4',
    },
    Strained: {
        BackMiddleFront: 'F#4',
        None: 'G4',
        Front: 'A4',
        Middle: 'B4',
        Back: 'A#4',   // Bb4
        MiddleFront: 'G#4',   // Ab4
        BackFront: 'G4',
        BackMiddle: 'A4',
    },
};

/**
 * Returns the note string or "None".
 */
export function toneClassification(valveState, lipState) {
    return TONE_TABLE[lipState]?.[valveState] ?? 'None';
}
