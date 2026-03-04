import { toKoreanNote, toKoreanState } from './noteMap.js';
import { TONE_TABLE } from './classifier.js';

// --- Global Renderer State ---
let showOctave = true;

document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('toggle-octave-btn');
    const toggleBtnMobile = document.getElementById('toggle-octave-btn-mobile');
    
    const updateOctaveUI = () => {
        const text = showOctave ? '옥타브 숨기기' : '옥타브 표시';
        if (toggleBtn) {
            toggleBtn.textContent = text;
            toggleBtn.classList.toggle('active', !showOctave);
        }
        if (toggleBtnMobile) {
            toggleBtnMobile.textContent = text;
            toggleBtnMobile.classList.toggle('active', !showOctave);
        }
    };

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            showOctave = !showOctave;
            updateOctaveUI();
        });
    }
    if (toggleBtnMobile) {
        toggleBtnMobile.addEventListener('click', () => {
            showOctave = !showOctave;
            updateOctaveUI();
        });
    }
});

/**
 * Converts a note string (e.g., 'C4', 'F#3') to a numeric pitch value for sorting.
 */
function getNotePitch(noteStr) {
    if (!noteStr || noteStr === 'None') return 0;
    const noteOrder = { 'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11 };
    
    const match = noteStr.match(/([A-G]#?)(\d)/);
    if (!match) return 0;
    
    const name = match[1];
    const octave = parseInt(match[2]);
    return octave * 12 + noteOrder[name];
}

function processNoteDisplay(noteStr) {
    if (!showOctave && noteStr) {
        return noteStr.replace(/\d+$/, '');
    }
    return noteStr;
}

const HAND_CONNECTIONS = [
    [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16],
];
const LIP_OUTER = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185, 61];
const LIP_INNER = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191, 78];

const HAND_COLOR = 'rgba(228, 195, 122, 0.8)';
const HAND_POINT_COLOR = '#ffffff';
const LIP_COLOR = 'rgba(255, 255, 255, 0.4)';
const LIP_FILL = 'rgba(228, 195, 122, 0.1)';

export function drawFrame(ctx, w, h, video, handLandmarks, faceLandmarks, valveState, lipState, noteString) {
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(video, 0, 0, w, h);
    if (handLandmarks) drawHandLandmarks(ctx, w, h, handLandmarks);
    if (faceLandmarks) drawLipContour(ctx, w, h, faceLandmarks);
}

function drawHandLandmarks(ctx, w, h, lm) {
    ctx.strokeStyle = HAND_COLOR; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (const [a, b] of HAND_CONNECTIONS) {
        if (!lm[a] || !lm[b]) continue;
        ctx.beginPath(); ctx.moveTo(lm[a].x * w, lm[a].y * h); ctx.lineTo(lm[b].x * w, lm[b].y * h); ctx.stroke();
    }
    for (let i = 5; i <= 16; i++) {
        if (!lm[i]) continue;
        const x = lm[i].x * w; const y = lm[i].y * h;
        ctx.beginPath(); ctx.arc(x, y, 3, 0, 2 * Math.PI); ctx.fillStyle = HAND_POINT_COLOR; ctx.fill();
    }
}

function drawLipContour(ctx, w, h, lm) {
    drawLipLoop(ctx, w, h, lm, LIP_OUTER, true);
    drawLipLoop(ctx, w, h, lm, LIP_INNER, false);
}

function drawLipLoop(ctx, w, h, lm, indices, fill) {
    if (!lm[indices[0]]) return;
    ctx.beginPath();
    ctx.moveTo(lm[indices[0]].x * w, lm[indices[0]].y * h);
    for (let i = 1; i < indices.length; i++) {
        const idx = indices[i];
        if (lm[idx]) ctx.lineTo(lm[idx].x * w, lm[idx].y * h);
    }
    ctx.closePath(); 
    ctx.strokeStyle = LIP_COLOR; 
    ctx.lineWidth = 1.5; 
    ctx.stroke();
    if (fill) { ctx.fillStyle = LIP_FILL; ctx.fill(); }
}

export function updateHUD(valveState, lipState, noteString) {
    const isPlaying = noteString && noteString !== 'None' && noteString !== 'Not Detected';
    const rawNote = toKoreanNote(noteString);
    const processedNote = isPlaying ? processNoteDisplay(rawNote) : '—';

    // PC HUD
    const noteDisplay = document.getElementById('note-display');
    if (noteDisplay) {
        noteDisplay.textContent = processedNote;
        noteDisplay.classList.toggle('active', isPlaying);
    }
    const miniStatus = document.getElementById('mini-lip-state');
    if (miniStatus) miniStatus.textContent = toKoreanState(lipState);

    // Mobile HUD
    const noteMobile = document.getElementById('note-display-mobile');
    if (noteMobile) noteMobile.textContent = processedNote;

    const valveMobile = document.getElementById('valve-display-mobile');
    if (valveMobile) {
        const formatValve = (vs) => {
            if (vs === 'None' || vs === 'Not Detected') return '0';
            let res = [];
            if (vs.includes('Back')) res.push('1');
            if (vs.includes('Middle')) res.push('2');
            if (vs.includes('Front')) res.push('3');
            return res.join('-');
        };
        valveMobile.textContent = formatValve(valveState);
    }

    const lipMobile = document.getElementById('lip-display-mobile');
    if (lipMobile) lipMobile.textContent = toKoreanState(lipState);

    updateAllFingeringLists(valveState, lipState);
}

function updateAllFingeringLists(currentValveState, currentLipState) {
    updateList('list-closed', 'group-closed', ['Closed'], currentValveState, currentLipState);
    updateList('list-tense', 'group-tense', ['Tensed', 'Strained'], currentValveState, currentLipState);
    updateList('list-pursed', 'group-pursed', ['Pursed', 'Forced'], currentValveState, currentLipState);
}

function updateList(listId, groupId, lipStates, currentValveState, currentLipState) {
    const container = document.getElementById(listId);
    const group = document.getElementById(groupId);
    if (!container || !group) return;

    const isGroupActive = lipStates.includes(currentLipState);
    group.classList.toggle('active', isGroupActive);

    const formatValve = (vs) => {
        if (vs === 'None') return '0';
        let res = [];
        if (vs.includes('Back')) res.push('1');
        if (vs.includes('Middle')) res.push('2');
        if (vs.includes('Front')) res.push('3');
        return res.join('-');
    };

    let html = '';
    const combinedNotes = {};
    lipStates.forEach(ls => {
        const notes = TONE_TABLE[ls];
        if (notes) Object.assign(combinedNotes, notes);
    });

    // Sort valve states by musical pitch (Ascending: Do, Re, Mi...)
    const valveStates = Object.keys(combinedNotes).sort((a, b) => {
        return getNotePitch(combinedNotes[a]) - getNotePitch(combinedNotes[b]);
    });

    for (const vs of valveStates) {
        const note = combinedNotes[vs];
        const isItemActive = isGroupActive && (vs === currentValveState);
        const displayNote = processNoteDisplay(toKoreanNote(note));
        
        html += `
            <div class="fingering-item ${isItemActive ? 'active' : ''}">
                <span class="valves">${formatValve(vs)}</span>
                <span class="note">${displayNote}</span>
            </div>
        `;
    }
    container.innerHTML = html;
}

export function updateFPS(fps) {
    const el = document.getElementById('fps-counter');
    if (el) el.textContent = `${Math.round(fps)} FPS`;
}
