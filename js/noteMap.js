/**
 * AirTrumpet — Note → WAV Path Lookup
 */

const NOTE_MAP = {
    'F#3': '/sounds/357378__mtg__trumpet-fsharp3-truncated.wav',
    'G3': '/sounds/357568__mtg__trumpet-g3-truncated.wav',
    'G#3': '/sounds/357566__mtg__trumpet-gsharp3-truncated.wav',
    'A3': '/sounds/357380__mtg__trumpet-a3-truncated.wav',
    'A#3': '/sounds/357589__mtg__trumpet-asharp3-truncated.wav',
    'B3': '/sounds/357381__mtg__trumpet-b3-truncated.wav',
    'C4': '/sounds/357382__mtg__trumpet-c4-truncated.wav',
    'C#4': '/sounds/357478__mtg__trumpet-csharp4-truncated.wav',
    'D4': '/sounds/357542__mtg__trumpet-d4-truncated.wav',
    'D#4': '/sounds/357388__mtg__trumpet-dsharp4-truncated.wav',
    'E4': '/sounds/357544__mtg__trumpet-e4-truncated.wav',
    'F4': '/sounds/357384__mtg__trumpet-f4-truncated.wav',
    'F#4': '/sounds/357323__mtg__trumpet-fsharp4-truncated.wav',
    'G4': '/sounds/357360__mtg__trumpet-g4-truncated.wav',
    'G#4': '/sounds/357363__mtg__trumpet-gsharp4-truncated.wav',
    'A4': '/sounds/357370__mtg__trumpet-a4-truncated.wav',
    'A#4': '/sounds/357457__mtg__trumpet-asharp4-truncated.wav',
    'B4': '/sounds/247067__mtg__overall-quality-of-single-note-trumpet-b4-truncated.wav',
    'C5': '/sounds/357432__mtg__trumpet-c5-truncated.wav',
    'C#5': '/sounds/357385__mtg__trumpet-csharp5-truncated.wav',
    'D5': '/sounds/357336__mtg__trumpet-d5-truncated.wav',
    'D#5': '/sounds/357386__mtg__trumpet-dsharp5-truncated.wav',
    'E5': '/sounds/357351__mtg__trumpet-e5-truncated.wav',
    'F5': '/sounds/357546__mtg__trumpet-f5-truncated.wav',
    'F#5': '/sounds/357361__mtg__trumpet-fsharp5-truncated.wav',
    'G5': '/sounds/357364__mtg__trumpet-g5-truncated.wav',
    'G#5': '/sounds/357433__mtg__trumpet-gsharp5-truncated.wav',
    'A5': '/sounds/357328__mtg__trumpet-a5-truncated.wav',
    'A#5': '/sounds/357469__mtg__trumpet-asharp5-truncated.wav',
    'B5': null,
    'C6': null,
};

/**
 * Converts English note names (C, D, E...) to Korean names (도, 레, 미...).
 * @param {string} noteStr - e.g. "F#4", "C5"
 * @returns {string} - e.g. "파#4", "도5"
 */
export function toKoreanNote(noteStr) {
    if (!noteStr || noteStr === 'None' || noteStr === 'Not Detected') return '—';
    
    const map = {
        'C': '도',
        'D': '레',
        'E': '미',
        'F': '파',
        'G': '솔',
        'A': '라',
        'B': '시'
    };
    
    const note = noteStr[0];
    const suffix = noteStr.slice(1); // #4, 5 etc.
    return (map[note] || note) + suffix;
}

/**
 * Converts English lip/valve states to Korean.
 */
export function toKoreanState(state) {
    const map = {
        'Open': '열림',
        'Closed': '닫힘',
        'Tensed': '긴장',
        'Strained': '강한 긴장',
        'Pursed': '오므림',
        'Forced': '압박',
        'Not Detected': '감지 안 됨',
        'None': '없음',
        'Back': '1번',
        'Middle': '2번',
        'Front': '3번',
        'BackMiddle': '1-2번',
        'BackFront': '1-3번',
        'MiddleFront': '2-3번',
        'BackMiddleFront': '1-2-3번'
    };
    return map[state] || state;
}

export default NOTE_MAP;
