import { create } from 'zustand';
import LevelNode from './audio/LevelNode';
import { MIN_DB } from './helpers/decibel';

export const LEVEL_PROCESSOR = 'level-processor';

interface AudioApiState {
  audioContext: AudioContext | null;
  broadcaster: MessagePort | null;
  gainNode: GainNode | null;
  gain: number;

  initSharedWorker: () => void;
  initGraph: () => Promise<void>;
  setGain: (gain: number) => void;
  setupLevelProcessor: (actx: AudioContext) => Promise<AudioWorkletNode>;
  broadcastLevels: (buffer: Float32Array) => void;
  silence: () => void;
}

export const useAudioApi = create<AudioApiState>((set, get) => ({
  audioContext: null,
  broadcaster: null,
  gainNode: null,
  gain: 1,

  initSharedWorker: () => {
    const workerUrl = new URL('./workers/shared-worker.ts', import.meta.url);
    const sharedWorker = new SharedWorker(workerUrl);
    sharedWorker.port.start();
    set({ broadcaster: sharedWorker.port });
  },
  initGraph: async () => {
    const { setupLevelProcessor } = get();
    const actx = new AudioContext();
    set({ audioContext: actx });
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = actx.createMediaStreamSource(stream);
    const gainNode = actx.createGain();
    set({ gainNode })
    const levelProcessorNode = await setupLevelProcessor(actx);

    // audio pipeline
    source.connect(gainNode);
    gainNode.connect(levelProcessorNode);
    levelProcessorNode.connect(actx.destination);
  },
  setupLevelProcessor: async (actx: AudioContext): Promise<AudioWorkletNode> => {
    const { broadcastLevels } = get();
    const levelProcessorUrl = new URL('./audio/LevelProcessor.ts', import.meta.url);
    let levelNode: LevelNode;

    try {
      // Fetch the WebAssembly module that performs pitch detection.
      const response = await window.fetch('level_analyser_bg.wasm');
      const wasmBytes = await response.arrayBuffer();

      try {
        await actx.audioWorklet.addModule(levelProcessorUrl);
      } catch (e: any) {
        throw new Error(
          `Failed to load level processor worklet at url: ${levelProcessorUrl}. Further info: ${e.message}`
        );
      }

      levelNode = new LevelNode(actx, 'level-processor');
      // Initialize the audio worklet with the WASM module and the broadcast function.
      levelNode.init(wasmBytes, broadcastLevels);

    } catch (e: any) {
      throw new Error(
        `Failed to load level processor WASM module. Further info: ${e.message}`
      );
    }

    return levelNode;
  },
  setGain: (gain: number) => {
    const { gainNode, audioContext } = get();
    set({ gain });

    if (gainNode && audioContext) {
      const currentTime = audioContext.currentTime;
      gainNode.gain.cancelScheduledValues(currentTime);
      gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);
      gainNode.gain.linearRampToValueAtTime(gain, currentTime + 0.03);
    }
  },
  broadcastLevels: (buffer: Float32Array) => {
    // driven from postMessage called from audio thread
    // it is fine as we call postMessage with a transferable array (which avoids serialization and copy overhead)
    // AND at a lower rate
    const { broadcaster } = get();
    if (broadcaster) {
      // transfer the buffer to the worker thread to avoid copying
      broadcaster.postMessage(buffer.buffer, [buffer.buffer]);
    }
  },
  silence: () => {
    const { broadcastLevels } = get();
    broadcastLevels(new Float32Array([MIN_DB, MIN_DB, MIN_DB]));
  }
}));
