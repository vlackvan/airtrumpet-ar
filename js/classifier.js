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

    if (!lipIsClosed) {
        if (xDiffEdge <= PURSED_LIPS_THRESHOLD_X * scale) {
            return 'Pursed';
        }
    }

    if (lipIsClosed) {
        if (xDiffEdge <= PURSED_LIPS_THRESHOLD_X * scale) {
            return 'Forced';
        }
        if (yDiffOuter <= STRAINED_LIPS_THRESHOLD_Y * scale && xDiffEdge > PURSED_LIPS_THRESHOLD_X * scale) {
            if (xDiffEdge >= STRAINED_LIPS_THRESHOLD_X * scale) {
                return 'Strained';
            }
            return 'Tensed';
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
        BackMiddleFront: 'F#3',
        BackFront: 'G3',
        MiddleFront: 'G#3',
        BackMiddle: 'A3',
        Front: 'A3',
        Back: 'A#3',
        Middle: 'B3',
        None: 'C4',
    },
    Tensed: {
        BackMiddleFront: 'C#4',
        BackFront: 'D4',
        MiddleFront: 'D#4',
        BackMiddle: 'E4',
        Front: 'E4',
        Back: 'F4',
        Middle: 'F#4',
        None: 'G4',
    },
    Strained: {
        MiddleFront: 'G#4',
        BackMiddle: 'A4',
        Front: 'A4',
        Back: 'A#4',
        Middle: 'B4',
        None: 'C5',
    },
    Pursed: {
        BackMiddle: 'C#5',
        BackFront: 'D5',
        MiddleFront: 'D#5',
        Front: 'E5',
        Back: 'F5',
        Middle: 'F#5',
        None: 'G5',
    },
    Forced: {
        MiddleFront: 'G#5',
        BackMiddle: 'A5',
        Front: 'A5',
        Back: 'A#5',
        Middle: 'B5',
        None: 'C6',
    },
};

/**
 * Returns the note string or "None".
 */
export function toneClassification(valveState, lipState) {
    return TONE_TABLE[lipState]?.[valveState] ?? 'None';
}
