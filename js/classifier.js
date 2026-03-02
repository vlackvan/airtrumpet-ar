/**
 * AirTrumpet — Classification Logic
 *
 * Direct port of four Python functions from main.py.
 * All functions are pure (no DOM/audio side effects).
 *
 * - distFaceToScreen()      (main.py:648–671)
 * - valveClassification()   (main.py:367–469)
 * - airflowClassification() (main.py:261–364)
 * - toneClassification()    (main.py:472–645)
 */

import {
    STANDARD_DISTANCE,
    SCREEN_TO_IRL_CONST,
    PURSED_LIPS_THRESHOLD_X,
    STRAINED_LIPS_THRESHOLD_X,
    STRAINED_LIPS_THRESHOLD_Y,
} from './constants.js';

// ───────────────────────────────────────────
// distFaceToScreen  (main.py:648–671)
// ───────────────────────────────────────────
/**
 * Estimates the real-world distance from the user's face to the camera
 * using the pixel separation between the two iris center landmarks.
 *
 * @param {{ x: number, y: number }} leftIris  - Landmark 473 (left iris center)
 * @param {{ x: number, y: number }} rightIris - Landmark 468 (right iris center)
 * @returns {number} Approximate distance in cm
 */
export function distFaceToScreen(leftIris, rightIris) {
    const dx = leftIris.x - rightIris.x;
    const dy = leftIris.y - rightIris.y;
    return SCREEN_TO_IRL_CONST / Math.hypot(dx, dy);
}

// ───────────────────────────────────────────
// valveClassification  (main.py:367–469)
// ───────────────────────────────────────────
/**
 * Determines which trumpet valves are "pressed" based on hand landmarks.
 * A finger is pressing its valve when its TIP y >= its PIP y
 * (image Y-axis: 0 at top, 1 at bottom — tip below PIP = curled down).
 *
 * @param {Array<{ x: number, y: number, z: number }>} lm - 21 hand landmarks
 * @returns {string} One of 8 states: "None", "Back", "Middle", "Front",
 *                   "BackMiddle", "BackFront", "MiddleFront", "BackMiddleFront"
 */
export function valveClassification(lm) {
    const backPressed = lm[8].y >= lm[6].y;   // index tip >= index PIP
    const middlePressed = lm[12].y >= lm[10].y;   // middle tip >= middle PIP
    const frontPressed = lm[16].y >= lm[14].y;   // ring tip >= ring PIP

    if (!backPressed && !middlePressed && !frontPressed) {
        return 'None';
    }

    let state = '';
    if (backPressed) state += 'Back';
    if (middlePressed) state += 'Middle';
    if (frontPressed) state += 'Front';
    return state;
}

// ───────────────────────────────────────────
// airflowClassification  (main.py:261–364)
// ───────────────────────────────────────────
/**
 * Classifies lip gestures into one of six embouchure states.
 * All thresholds are scaled by (STANDARD_DISTANCE / distToScreen)
 * to remain consistent regardless of the user's distance from the camera.
 *
 * IMPORTANT: The control flow preserves the exact fall-through behavior
 * of the Python original. When lip is NOT closed AND xDiff > PURSED_X*scale,
 * the first `if` block enters but doesn't return. Execution then reaches
 * the `if (lipIsClosed)` check which is false, dropping to the final
 * `return "Open"`.
 *
 * @param {Array<{ x: number, y: number, z: number }>} lm - 478 face landmarks
 * @param {number} distToScreen - Distance estimate from distFaceToScreen()
 * @returns {string} One of: "Open", "Closed", "Tensed", "Strained", "Pursed", "Forced"
 */
export function airflowClassification(lm, distToScreen) {
    const scale = STANDARD_DISTANCE / distToScreen;

    // Outer lip vertical gap: |landmark[0].y - landmark[17].y|
    const yDiffOuter = Math.abs(lm[0].y - lm[17].y);

    // Lip width (commissure gap): |landmark[291].x - landmark[61].x|
    const xDiffEdge = Math.abs(lm[291].x - lm[61].x);

    // Lip is closed when inner upper lip meets or overlaps inner lower lip
    const lipIsClosed =
        Math.ceil(lm[13].y * 100) >= Math.floor(lm[14].y * 100);

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

// ───────────────────────────────────────────
// toneClassification  (main.py:472–645)
// ───────────────────────────────────────────
/**
 * 2D lookup table: lipState → valveState → note string.
 *
 * All 8 valve states are included for each lip state where a mapping exists.
 * The "Front" valve state is present in Closed, Tensed, Strained, Pursed,
 * and Forced (it maps to the same note as "BackMiddle" in several cases).
 *
 * Missing combinations (e.g. Strained+BackMiddleFront) are intentionally
 * absent — the lookup returns undefined, which the ?? operator converts
 * to "None".
 */
const TONE_TABLE = {
    Closed: {
        // BackMiddleFront: no mapping (all 3 valves = no note)
        None: 'C4',
        Front: 'E4',
        Middle: 'F#4',
        Back: 'F4',
        MiddleFront: 'D#4',   // Eb4
        BackFront: 'D4',
        BackMiddle: 'E4',
    },
    Strained: {
        // BackMiddleFront: no mapping
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
 * Returns the note string for a given valve + lip state combination,
 * or "None" if no mapping exists or the lip state is "Open".
 *
 * @param {string} valveState - From valveClassification()
 * @param {string} lipState   - From airflowClassification()
 * @returns {string} Note name (e.g. "C4", "F#3") or "None"
 */
export function toneClassification(valveState, lipState) {
    return TONE_TABLE[lipState]?.[valveState] ?? 'None';
}
