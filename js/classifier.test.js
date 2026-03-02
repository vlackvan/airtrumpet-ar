/**
 * AirTrumpet — Classifier Unit Tests
 *
 * Tests all four classification functions against known values
 * from the Python original (main.py).
 */

import { describe, it, expect } from 'vitest';
import {
    distFaceToScreen,
    valveClassification,
    airflowClassification,
    toneClassification,
} from './classifier.js';
import { SCREEN_TO_IRL_CONST, STANDARD_DISTANCE } from './constants.js';

// ── Helper: create mock landmark array ──
function makeLandmarks(overrides) {
    // Create 500 landmarks with default (0,0,0) values
    const lm = Array.from({ length: 500 }, () => ({ x: 0, y: 0, z: 0 }));
    for (const [idx, coords] of Object.entries(overrides)) {
        lm[Number(idx)] = { x: 0, y: 0, z: 0, ...coords };
    }
    return lm;
}

// ════════════════════════════════════════════
// distFaceToScreen
// ════════════════════════════════════════════
describe('distFaceToScreen', () => {
    it('returns SCREEN_TO_IRL_CONST / hypot for known iris separation', () => {
        const left = { x: 0.6, y: 0.5 };
        const right = { x: 0.4, y: 0.5 };
        const dist = distFaceToScreen(left, right);
        expect(dist).toBeCloseTo(SCREEN_TO_IRL_CONST / 0.2, 5);
    });

    it('returns higher distance for closer irises (user farther away)', () => {
        const close = distFaceToScreen({ x: 0.51, y: 0.5 }, { x: 0.49, y: 0.5 });
        const far = distFaceToScreen({ x: 0.6, y: 0.5 }, { x: 0.4, y: 0.5 });
        expect(close).toBeGreaterThan(far);
    });
});

// ════════════════════════════════════════════
// valveClassification
// ════════════════════════════════════════════
describe('valveClassification', () => {
    // Helpers: tip at PIP level = pressed, tip above PIP = not pressed
    // Y-axis: 0 = top, 1 = bottom. tip.y >= pip.y means finger curled down

    const allUp = makeLandmarks({
        6: { y: 0.6 }, 8: { y: 0.4 },   // index PIP=0.6, TIP=0.4 → up
        10: { y: 0.6 }, 12: { y: 0.4 }, // middle up
        14: { y: 0.6 }, 16: { y: 0.4 }, // ring up
    });

    it('returns "None" when all fingers extended', () => {
        expect(valveClassification(allUp)).toBe('None');
    });

    it('returns "Back" when index curled', () => {
        const lm = makeLandmarks({
            6: { y: 0.4 }, 8: { y: 0.6 },   // index down (tip > pip)
            10: { y: 0.6 }, 12: { y: 0.4 }, // middle up
            14: { y: 0.6 }, 16: { y: 0.4 }, // ring up
        });
        expect(valveClassification(lm)).toBe('Back');
    });

    it('returns "Middle" when middle curled', () => {
        const lm = makeLandmarks({
            6: { y: 0.6 }, 8: { y: 0.4 },
            10: { y: 0.4 }, 12: { y: 0.6 }, // middle down
            14: { y: 0.6 }, 16: { y: 0.4 },
        });
        expect(valveClassification(lm)).toBe('Middle');
    });

    it('returns "Front" when ring curled', () => {
        const lm = makeLandmarks({
            6: { y: 0.6 }, 8: { y: 0.4 },
            10: { y: 0.6 }, 12: { y: 0.4 },
            14: { y: 0.4 }, 16: { y: 0.6 }, // ring down
        });
        expect(valveClassification(lm)).toBe('Front');
    });

    it('returns "BackMiddle" when index + middle curled', () => {
        const lm = makeLandmarks({
            6: { y: 0.4 }, 8: { y: 0.6 },
            10: { y: 0.4 }, 12: { y: 0.6 },
            14: { y: 0.6 }, 16: { y: 0.4 },
        });
        expect(valveClassification(lm)).toBe('BackMiddle');
    });

    it('returns "BackFront" when index + ring curled', () => {
        const lm = makeLandmarks({
            6: { y: 0.4 }, 8: { y: 0.6 },
            10: { y: 0.6 }, 12: { y: 0.4 },
            14: { y: 0.4 }, 16: { y: 0.6 },
        });
        expect(valveClassification(lm)).toBe('BackFront');
    });

    it('returns "MiddleFront" when middle + ring curled', () => {
        const lm = makeLandmarks({
            6: { y: 0.6 }, 8: { y: 0.4 },
            10: { y: 0.4 }, 12: { y: 0.6 },
            14: { y: 0.4 }, 16: { y: 0.6 },
        });
        expect(valveClassification(lm)).toBe('MiddleFront');
    });

    it('returns "BackMiddleFront" when all three curled', () => {
        const lm = makeLandmarks({
            6: { y: 0.4 }, 8: { y: 0.6 },
            10: { y: 0.4 }, 12: { y: 0.6 },
            14: { y: 0.4 }, 16: { y: 0.6 },
        });
        expect(valveClassification(lm)).toBe('BackMiddleFront');
    });

    it('returns pressed when tip === pip (boundary condition)', () => {
        const lm = makeLandmarks({
            6: { y: 0.5 }, 8: { y: 0.5 },   // index: tip == pip → pressed
            10: { y: 0.6 }, 12: { y: 0.4 },
            14: { y: 0.6 }, 16: { y: 0.4 },
        });
        expect(valveClassification(lm)).toBe('Back');
    });
});

// ════════════════════════════════════════════
// toneClassification
// ════════════════════════════════════════════
describe('toneClassification', () => {
    // ── Closed lip state ──
    it('Closed + None → C4', () => expect(toneClassification('None', 'Closed')).toBe('C4'));
    it('Closed + Front → E4', () => expect(toneClassification('Front', 'Closed')).toBe('E4'));
    it('Closed + Middle → F#4', () => expect(toneClassification('Middle', 'Closed')).toBe('F#4'));
    it('Closed + Back → F4', () => expect(toneClassification('Back', 'Closed')).toBe('F4'));
    it('Closed + MiddleFront → D#4', () => expect(toneClassification('MiddleFront', 'Closed')).toBe('D#4'));
    it('Closed + BackFront → D4', () => expect(toneClassification('BackFront', 'Closed')).toBe('D4'));
    it('Closed + BackMiddle → E4', () => expect(toneClassification('BackMiddle', 'Closed')).toBe('E4'));

    // ── Strained lip state ──
    it('Strained + None → G4', () => expect(toneClassification('None', 'Strained')).toBe('G4'));
    it('Strained + Front → A4', () => expect(toneClassification('Front', 'Strained')).toBe('A4'));
    it('Strained + Middle → B4', () => expect(toneClassification('Middle', 'Strained')).toBe('B4'));
    it('Strained + Back → A#4', () => expect(toneClassification('Back', 'Strained')).toBe('A#4'));
    it('Strained + MiddleFront → G#4', () => expect(toneClassification('MiddleFront', 'Strained')).toBe('G#4'));
    it('Strained + BackFront → G4', () => expect(toneClassification('BackFront', 'Strained')).toBe('G4'));
    it('Strained + BackMiddle → A4', () => expect(toneClassification('BackMiddle', 'Strained')).toBe('A4'));

    // ── Unmapped combos → "None" ──
    it('Closed + BackMiddleFront → None (unmapped)', () => {
        expect(toneClassification('BackMiddleFront', 'Closed')).toBe('None');
    });
    it('Strained + BackMiddleFront → None (unmapped)', () => {
        expect(toneClassification('BackMiddleFront', 'Strained')).toBe('None');
    });
    it('Open + any → None', () => {
        expect(toneClassification('None', 'Open')).toBe('None');
        expect(toneClassification('Back', 'Open')).toBe('None');
    });
    it('Tensed (removed) → None', () => {
        expect(toneClassification('None', 'Tensed')).toBe('None');
    });
    it('Pursed (removed) → None', () => {
        expect(toneClassification('None', 'Pursed')).toBe('None');
    });
    it('Forced (removed) → None', () => {
        expect(toneClassification('None', 'Forced')).toBe('None');
    });
    it('Unknown lip state → None', () => {
        expect(toneClassification('None', 'NotAReal')).toBe('None');
    });
});

// ════════════════════════════════════════════
// airflowClassification
// ════════════════════════════════════════════
describe('airflowClassification', () => {
    // For these tests we use distToScreen = STANDARD_DISTANCE (40)
    // so scaling_factor = 1.0, thresholds are unscaled
    const dist = STANDARD_DISTANCE;

    it('returns "Open" when lips are open and not pursed', () => {
        // Inner upper (13) clearly above inner lower (14) → lip NOT closed
        // x_diff > PURSED threshold → not pursed → falls through to "Open"
        const lm = makeLandmarks({
            0: { y: 0.45 },  // outer upper
            17: { y: 0.55 },  // outer lower → yDiff = 0.10
            13: { y: 0.48 },  // inner upper
            14: { y: 0.52 },  // inner lower → ceil(48) = 48 < floor(52) = 52 → NOT closed
            291: { x: 0.60 },  // left commissure
            61: { x: 0.40 },  // right commissure → xDiff = 0.20 > 0.08
            468: { x: 0.49, y: 0.5 },
            473: { x: 0.51, y: 0.5 },
        });
        expect(airflowClassification(lm, dist)).toBe('Open');
    });

    it('returns "Pursed" when lips open but commissures narrow', () => {
        const lm = makeLandmarks({
            0: { y: 0.45 },
            17: { y: 0.55 },
            13: { y: 0.48 },
            14: { y: 0.52 },  // NOT closed
            291: { x: 0.52 },
            61: { x: 0.46 },  // xDiff = 0.06 <= 0.08 → Pursed
            468: { x: 0.49, y: 0.5 },
            473: { x: 0.51, y: 0.5 },
        });
        expect(airflowClassification(lm, dist)).toBe('Pursed');
    });

    it('returns "Closed" when lips closed and no special thresholds met', () => {
        // Inner upper meets inner lower → closed
        // y_diff outer large, x_diff not pursed → "Closed"
        const lm = makeLandmarks({
            0: { y: 0.48 },
            17: { y: 0.55 },  // yDiff = 0.07 > 0.05
            13: { y: 0.505 },
            14: { y: 0.505 }, // ceil(50.5) = 51 >= floor(50.5) = 50 → CLOSED
            291: { x: 0.55 },
            61: { x: 0.40 },  // xDiff = 0.15 > 0.08 and > 0.10
            468: { x: 0.49, y: 0.5 },
            473: { x: 0.51, y: 0.5 },
        });
        expect(airflowClassification(lm, dist)).toBe('Closed');
    });

    it('returns "Forced" when lips closed and commissures narrow', () => {
        const lm = makeLandmarks({
            0: { y: 0.49 },
            17: { y: 0.51 },
            13: { y: 0.50 },
            14: { y: 0.50 },  // ceil(50) = 50 >= floor(50) = 50 → CLOSED
            291: { x: 0.52 },
            61: { x: 0.46 },  // xDiff = 0.06 <= 0.08 → Forced
            468: { x: 0.49, y: 0.5 },
            473: { x: 0.51, y: 0.5 },
        });
        expect(airflowClassification(lm, dist)).toBe('Forced');
    });

    it('returns "Strained" when lips closed, tight y-gap, wide x-gap', () => {
        const lm = makeLandmarks({
            0: { y: 0.49 },
            17: { y: 0.52 },  // yDiff = 0.03 <= 0.05
            13: { y: 0.505 },
            14: { y: 0.505 }, // CLOSED
            291: { x: 0.56 },
            61: { x: 0.44 },  // xDiff = 0.12 >= 0.10 → Strained
            468: { x: 0.49, y: 0.5 },
            473: { x: 0.51, y: 0.5 },
        });
        expect(airflowClassification(lm, dist)).toBe('Strained');
    });

    it('returns "Tensed" when lips closed, tight y-gap, medium x-gap', () => {
        const lm = makeLandmarks({
            0: { y: 0.49 },
            17: { y: 0.52 },  // yDiff = 0.03 <= 0.05
            13: { y: 0.505 },
            14: { y: 0.505 }, // CLOSED
            291: { x: 0.54 },
            61: { x: 0.45 },  // xDiff = 0.09 > 0.08 but < 0.10 → Tensed
            468: { x: 0.49, y: 0.5 },
            473: { x: 0.51, y: 0.5 },
        });
        expect(airflowClassification(lm, dist)).toBe('Tensed');
    });
});
