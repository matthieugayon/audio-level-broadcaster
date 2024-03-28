import { create } from 'zustand';
import { BOLD_MARKERS, MEDIUM_MAKERS, MIN_DB, dbNormal, scaleNormal } from './helpers/decibel';

const TWO_FRAMES = 3000/60;

interface VizualizerApiState {
  lastLevelReception: number | null;
  levels: Float32Array;
  levelsCtx: CanvasRenderingContext2D | null;
  markersCtx: CanvasRenderingContext2D | null;
  unityNormal: number;

  initSharedWorker: () => void;
  setLevelsCanvasContext: (ctx: CanvasRenderingContext2D) => void,
  resetLevelsIfNeeded: (now: number) => void,
  drawLevels: () => void,
  setMarkersCanvasContext: (ctx: CanvasRenderingContext2D) => void,
  drawMarkers: () => void
}

export const useVizualizerApi = create<VizualizerApiState>((set, get) => ({
  lastLevelReception: null,
  levels: new Float32Array([MIN_DB, MIN_DB, MIN_DB]),
  levelsCtx: null,
  markersCtx: null,
  unityNormal: dbNormal(0),

  initSharedWorker: () => {
    const workerUrl = new URL('./workers/shared-worker.ts', import.meta.url);
    const sharedWorker = new SharedWorker(workerUrl);

    sharedWorker.port.start();

    sharedWorker.port.onmessage = (event) => {
      if (event?.data instanceof ArrayBuffer) {
        const levels = new Float32Array(event.data as ArrayBuffer);
        const now = performance.now();

        set({ levels, lastLevelReception: now });
      }
    };
  },
  resetLevelsIfNeeded: (now: number) => {
    const { lastLevelReception } = get();
    if (lastLevelReception && now - lastLevelReception > TWO_FRAMES) {
      set({ levels: new Float32Array([MIN_DB, MIN_DB, MIN_DB]) });
    }
  },
  drawLevels: () => {

    const draw = () => {
      const { levelsCtx, levels, unityNormal, resetLevelsIfNeeded } = get();
      resetLevelsIfNeeded(performance.now());

      if (levelsCtx) {
        const { width, height } = levelsCtx.canvas;
        const availableHeight = height - 1;
        const unityYposition = 401 - scaleNormal(unityNormal, availableHeight);

        // Background
        levelsCtx.fillStyle = '#111111';
        levelsCtx.fillRect(0, 0.5, width, availableHeight);

        // Level
        const levelHeight = scaleNormal(dbNormal(levels[0]), availableHeight);
        const levelGradient = levelsCtx.createLinearGradient(0, 1, 0, height);
        levelGradient.addColorStop(0, '#F42542'); // color at 6db
        levelGradient.addColorStop(1 - unityNormal - 0.001, '#FFB227'); // color just above 0db
        levelGradient.addColorStop(1 - unityNormal, '#53BE00');
        levelGradient.addColorStop(1, '#00905D');
        levelsCtx.fillStyle = levelGradient;
        levelsCtx.fillRect(0, height - levelHeight, width, levelHeight);
        levelsCtx.fill();

        // Rms
        const rmsHeight = scaleNormal(dbNormal(levels[1]), availableHeight);
        const rmsGradient = levelsCtx.createLinearGradient(0, 1, 0, height);
        rmsGradient.addColorStop(0, '#F42542'); // color at 6db
        rmsGradient.addColorStop(1 - unityNormal - 0.001, '#FFB227'); // color just above 0db
        rmsGradient.addColorStop(1 - unityNormal, '#89FA32'); // color at 0db // dark 53BE00
        rmsGradient.addColorStop(1, '#30F0AC'); // color at -inf db // dark 00905D
        levelsCtx.fillStyle = rmsGradient;
        levelsCtx.fillRect(0, height - rmsHeight, width, rmsHeight);
        levelsCtx.fill();

        // Hold peak, if not at unity
        const holdPeakHeight = scaleNormal(dbNormal(levels[2]), availableHeight);
        if (Math.round(holdPeakHeight) !== unityYposition && Math.ceil(holdPeakHeight) !== unityYposition) {
          levelsCtx.fillStyle = rmsGradient; // same as rms
          levelsCtx.fillRect(0, height - holdPeakHeight, width, 1);
          levelsCtx.fill();
        }

        // Static lines
        levelsCtx.strokeStyle = '#fff'; // same as app background
        // 0 db horizontal line
        levelsCtx.beginPath();
        levelsCtx.moveTo(0, unityYposition - 0.5);
        levelsCtx.lineTo(width, unityYposition - 0.5);
        levelsCtx.stroke();
        // vertical line in the middle
        levelsCtx.beginPath();
        levelsCtx.moveTo(width * 0.5 - 0.5, 0.5);
        levelsCtx.lineTo(width * 0.5 - 0.5, height);
        levelsCtx.stroke();
      }

      requestAnimationFrame(draw);
    }

    draw();
  },
  setLevelsCanvasContext: (ctx: CanvasRenderingContext2D) => set({ levelsCtx: ctx }),
  setMarkersCanvasContext: (ctx: CanvasRenderingContext2D) => set({ markersCtx: ctx }),
  drawMarkers: () => {
    const { markersCtx } = get();
    if (markersCtx) {
      const { width, height } = markersCtx.canvas;
      const availableHeight = height - 1;
      markersCtx.clearRect(0, 0, width, height);
      markersCtx.strokeStyle = 'black';

      BOLD_MARKERS.forEach((dbValue) => {
        // straddle pixels with 0.5 for lines
        const yPosition = height - scaleNormal(dbNormal(dbValue), availableHeight) - 0.5;
        markersCtx.beginPath();
        markersCtx.moveTo(0, yPosition);
        markersCtx.lineTo(width, yPosition);
        markersCtx.stroke();
      });

      markersCtx.strokeStyle = '#888';

      MEDIUM_MAKERS.forEach((dbValue) => {
        // straddle pixels with 0.5 for lines
        const yPosition = height - scaleNormal(dbNormal(dbValue), availableHeight) - 0.5;
        markersCtx.beginPath();
        markersCtx.moveTo(0, yPosition);
        markersCtx.lineTo(width, yPosition);
        markersCtx.stroke();
      });
    }
  }
}));
