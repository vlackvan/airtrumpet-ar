/**
 * AirTrumpet — Global Constants
 *
 * All thresholds ported from main.py lines 16–22.
 * Values are in MediaPipe normalized coordinate space (0.0–1.0),
 * scaled at runtime by STANDARD_DISTANCE / distToScreen.
 */

/** Calibration distance (cm) — MacBook Pro 16" 2023 at arm's length */
export const STANDARD_DISTANCE = 40;

/** Empirical multiplier: SCREEN_TO_IRL_CONST / iris_pixel_dist ≈ real cm distance */
export const SCREEN_TO_IRL_CONST = 5;

/** Max normalized commissure gap to register "Pursed" or "Forced" */
export const PURSED_LIPS_THRESHOLD_X = 0.08;

/** Min normalized commissure gap to register "Strained" (vs. "Tensed") */
export const STRAINED_LIPS_THRESHOLD_X = 0.1;

/** Max normalized outer lip vertical gap to enter Strained/Tensed branch */
export const STRAINED_LIPS_THRESHOLD_Y = 0.05;
