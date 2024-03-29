import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import LevelNode from './audio/LevelNode';

/**
 * Audio store API
 * This store is used to manage the audio context and the audio graph
 * as well as communicating with the shared worker
 */

interface AudioApiState {
  id: string;
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
  id: uuid(),
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

    // audio graph pipeline
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
        // register the audio worklet processor
        await actx.audioWorklet.addModule(levelProcessorUrl);
      } catch (e: unknown) {
        throw new Error(
          `Failed to load level processor worklet at url: ${levelProcessorUrl}. Further info: ${e}`
        );
      }

      levelNode = new LevelNode(actx, 'level-processor');

      // Initialize the audio worklet with the WASM module and the broadcast function.
      levelNode.init(wasmBytes, broadcastLevels);

    } catch (e: unknown) {
      throw new Error(
        `Failed to load level processor WASM module. Further info: ${e}`
      );
    }

    // does not resume automatically in chrome
    actx.resume();

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
    const { id } = get();
    // driven from postMessage called from audio thread
    // it is fine as we call postMessage with a transferable array (which avoids serialization and copy overhead)
    // AND at a lower rate, in our case every 512 samples, which is 10.7ms at 48kHz
    const { broadcaster } = get();
    if (broadcaster) {

      // transfer the buffer to the worker thread to avoid copying
      // include the id for client to be able to track the sender
      const payload = { id, buffer: buffer.buffer };
      broadcaster.postMessage(payload, [payload.buffer]); // we specify the buffer to transfer
    }
  },
  silence: () => {
    const { broadcaster } = get();

    if (broadcaster) {
      broadcaster.postMessage("silence");
    }
  }
}));
