# 🎺 AirTrumpet Web

A gesture-controlled virtual trumpet that runs entirely in the browser — no installs, no servers, no plugins. Use your webcam to play 29 real trumpet notes with hand gestures and lip movements.

> **Ported from** [CS7990-Thesis-AirTrumpet-Python](../CS7990-Thesis-AirTrumpet-Python/) — a Python/OpenCV desktop app by Triet Ngo (Northeastern University, CS 7990 Master's Thesis).

---

## Prerequisites

- **Node.js** ≥ 18 ([download](https://nodejs.org/))
- **npm** (included with Node.js)
- A modern browser with webcam support (Chrome or Edge recommended)

## Installation

```bash
# 1. Clone the repo (if you haven't already)
git clone <repo-url>
cd airtrumpet-ar

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

Open the URL printed in your terminal (typically `http://localhost:5173`) in Chrome or Edge.

## Usage

1. Click **Start Playing**
2. Grant camera permission when prompted
3. Hold one hand in view and position your face in frame
4. **Valves** — curl your index, middle, or ring finger to "press" a valve
5. **Embouchure** — shape your lips (closed, tensed, pursed, etc.) to control airflow
6. The detected note plays automatically through your speakers

> **Tip:** Sit about 40 cm (arm's length) from your webcam for the best lip detection accuracy.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with hot reload |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run classifier unit tests (Vitest) |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Build | [Vite](https://vite.dev/) (vanilla JS) |
| Hand tracking | [@mediapipe/tasks-vision](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker) — `HandLandmarker` |
| Face tracking | [@mediapipe/tasks-vision](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker) — `FaceLandmarker` |
| Audio | Web Audio API (`AudioBufferSourceNode` + `GainNode`) |
| Rendering | HTML5 `<canvas>` + CSS |

## Project Structure

```
airtrumpet-ar/
├── index.html              # App shell
├── css/style.css           # Dark theme, glassmorphism HUD
├── js/
│   ├── app.js              # Main loop (requestAnimationFrame)
│   ├── constants.js        # Detection thresholds
│   ├── noteMap.js          # Note name → WAV path
│   ├── classifier.js       # Valve, airflow, tone classification
│   ├── classifier.test.js  # 34 unit tests
│   ├── handDetector.js     # MediaPipe hand wrapper
│   ├── faceDetector.js     # MediaPipe face wrapper
│   ├── audioEngine.js      # Audio playback engine
│   └── renderer.js         # Canvas overlays + HUD
└── public/sounds/          # 29 trumpet WAV samples
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Camera not detected | Check browser permissions (Settings → Privacy → Camera) |
| No audio on first click | Browsers block autoplay — the Start button handles `AudioContext.resume()` |
| Laggy detection | Close other tabs; detection runs at ~30fps to preserve performance |
| Lip detection inaccurate | Adjust your distance to ~40 cm; ensure good lighting on your face |

## License

See [LICENSE](../LICENSE).

## Credits

- **Audio samples**: [Music Technology Group (MTG)](https://freesound.org/people/MTG/packs/20232/), Universitat Pompeu Fabra
- **Original thesis**: Triet Ngo, Northeastern University
