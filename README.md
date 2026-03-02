# 🎺 에어트럼펫 (AirTrumpet) 웹버전
airtrumpet-ar-skku.vercel.app

브라우저에서 완벽하게 실행되는 제스처 기반 가상 트럼펫입니다. 설치, 서버, 플러그인이 전혀 필요하지 않습니다. 웹캠을 사용해 손 움직임과 입모양으로 29가지 실제 트럼펫 음계를 연주해 보세요.

> **포팅 출처:** [CS7990-Thesis-AirTrumpet-Python](../CS7990-Thesis-AirTrumpet-Python/) — Triet Ngo (Northeastern University, CS 7990 석사 논문)가 개발한 Python/OpenCV 데스크톱 앱입니다.

---

## 사전 필수 항목

- **Node.js** ≥ 18 ([다운로드](https://nodejs.org/))
- **npm** (Node.js에 포함)
- 웹캠을 지원하는 최신 브라우저 (Chrome 또는 Edge 권장)

## 설치 방법

```bash
# 1. 저장소 클론 (아직 진행하지 않은 경우)
git clone <repo-url>
cd airtrumpet-ar

# 2. 의존성 패키지 설치
npm install

# 3. 개발 서버 실행
npm run dev
```

터미널에 출력된 URL(일반적으로 `http://localhost:5173`)을 Chrome이나 Edge에서 엽니다.

## 사용 방법

1. **연주 시작하기(Start Playing)** 버튼을 클릭합니다.
2. 카메라 접근 권한 요청 시 허용합니다.
3. 한 손을 화면 안에 올리고 얼굴이 프레임 안에 잘 들어오도록 위치시킵니다.
4. **밸브(Valves)** — 약지(1번/앞), 중지(2번/중간), 검지(3번/뒤)를 구부려 밸브를 누를 수 있습니다.
5. **앙부쉬르(Embouchure, 입술 모양)** — 입술 모양을 달리하여 음역대를 변경합니다:

| 입술 상태 | 만드는 방법 | 효과 |
|-----------|---------------|--------|
| **열림 (Open)** | 자연스럽게 입을 벌린 상태 | 소리 없음 (묵음) |
| **닫힘 (Closed)** | 입술을 가볍게 다문 상태 | 낮은 음역 (C4–F#4) |
| **조임 (Strained)** | 입술을 다물고 수직 간격을 좁게 한 상태 | 중간 음역 (F#4–B4) |
| **오므림 (Pursed)** | 입을 살짝 벌리고 좁게 오므린 상태 | 높은 음역 (A#4–D#5) |

6. 인식된 음표가 스피커를 통해 자동으로 재생됩니다.

### 음표 맵

| 입술 상태 \ 밸브 | 없음 | 앞 (1번) | 중간 (2번) | 뒤 (3번) | 중간+앞 | 뒤+앞 | 뒤+중간 | 전체 |
|---|---|---|---|---|---|---|---|---|
| **닫힘 (Closed)** | C4 | E4 | F#4 | F4 | D#4 | D4 | E4 | C#4 |
| **조임 (Strained)** | G4 | A4 | B4 | A#4 | G#4 | G4 | A4 | F#4 |
| **오므림 (Pursed)** | C5 | C#5 | D#5 | D5 | C5 | B4 | C#5 | A#4 |

> **팁:** 입술을 가장 정확하게 인식하려면 웹캠에서 약 40cm(팔 길이 정도) 떨어져 앉으세요.

## 스크립트

| 명령어 | 설명 |
|---------|-------------|
| `npm run dev` | 핫 리로드(hot reload) 기능이 있는 Vite 개발 서버 시작 |
| `npm run build` | `dist/` 폴더에 프로덕션 빌드 생성 |
| `npm run preview` | 프로덕션 빌드 로컬에서 미리보기 |
| `npm test` | 분류기 유닛 테스트 실행 (Vitest) |

## 기술 스택

| 레이어 | 기술 |
|-------|-----------|
| 빌드 | [Vite](https://vite.dev/) (vanilla JS) |
| 손 인식 | [@mediapipe/tasks-vision](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker) — `HandLandmarker` |
| 얼굴 인식 | [@mediapipe/tasks-vision](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker) — `FaceLandmarker` |
| 오디오 | Web Audio API (`AudioBufferSourceNode` + `GainNode`) |
| 렌더링 | HTML5 `<canvas>` + CSS |

## 프로젝트 구조

```
airtrumpet-ar/
├── index.html              # 앱 셸(App shell)
├── css/style.css           # 다크 테마, 글래스모피즘 HUD
├── js/
│   ├── app.js              # 메인 루프 (requestAnimationFrame)
│   ├── constants.js        # 인식 임계값 (thresholds)
│   ├── noteMap.js          # 음표 이름 → WAV 경로 매핑
│   ├── classifier.js       # 밸브, 공기 흐름, 음표 분류
│   ├── classifier.test.js  # 34개의 유닛 테스트
│   ├── handDetector.js     # MediaPipe Hand 래퍼(wrapper)
│   ├── faceDetector.js     # MediaPipe Face 래퍼
│   ├── audioEngine.js      # 오디오 재생 엔진
│   └── renderer.js         # 캔버스 오버레이 + HUD
└── public/sounds/          # 29개의 트럼펫 WAV 샘플 파일
```

## 문제 해결 (Troubleshooting)

| 문제 | 해결책 |
|---------|----------|
| 카메라를 찾을 수 없음 | 브라우저 권한 설정을 확인하세요 (설정 → 개인정보 및 보안 → 카메라) |
| 처음 클릭 시 오디오가 나오지 않음 | 브라우저의 자동 재생 차단 기능 때문입니다. '연주 시작하기' 버튼이 `AudioContext.resume()`을 처리합니다. |
| 인식 시 렉이 걸림 | 다른 탭을 닫으세요. 성능 유지를 위해 인식은 약 30fps로 작동합니다. |
| 입술 인식이 부정확함 | 거리를 약 40cm로 조절하고 얼굴 밝기가 충분한지 확인하세요. |

## 라이선스

[LICENSE](../LICENSE) 파일을 참고하세요.

## 크레딧 (Credits)

- **오디오 샘플**: [Music Technology Group (MTG)](https://freesound.org/people/MTG/packs/20232/), Universitat Pompeu Fabra
- **원 논문**: Triet Ngo, Northeastern University
