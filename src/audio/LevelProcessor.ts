import './AudioWorkletProcessor.types';
import init, { LevelAnalyser } from '../../public/level_analyser';
import { Event} from './LevelNode';

/**
 * Level Processor
 * the audio worklet processor function loaded in the audio thread
 */

// at 44.1kHz, 512 samples is 11.6ms, 86 FPS
// at 48kHz, 512 samples is 10.7ms, 93 FPS
// so slightly higher to requestAnimationFrame rate (60 FPS)
// hopefully this is enough to minimize latency with vizualizer
const BROADCAST_RATE = 512;

class LevelProcessor extends AudioWorkletProcessor {
  _levelAnalyser: LevelAnalyser | null;
  _accumulatedFrameSize: number;

  constructor() {
    super();
    this._levelAnalyser = null;
    this._accumulatedFrameSize = 0;

    this.port.onmessage = (event) => this.onmessage(event.data);
  }

  onmessage(event: Event) {
    if (event.type === 'wasm-module' && event.wasmBytes) {
      init(WebAssembly.compile(event.wasmBytes)).then(() => {
        this.port.postMessage({ type: 'wasm-loaded' });
      });
    } else if (event.type === 'init') {
      this._levelAnalyser = LevelAnalyser.new(sampleRate);
    }
  }

  process(inputs: Float32Array[][]) {
    if (!this._levelAnalyser) return true;

    // This example only handles mono channel.
    const inputChannelData = inputs[0][0];
    let result = this._levelAnalyser.process(inputChannelData);

    // Broadcast only every BROADCAST_RATE frames to avoid flooding the main thread.
    // if frameSize > BROADCAST_RATE, broadcast every frame
    const frameSize = inputChannelData.length;
    if (frameSize < BROADCAST_RATE) {
      this._accumulatedFrameSize += (this._accumulatedFrameSize + frameSize) % BROADCAST_RATE;

      if (this._accumulatedFrameSize % BROADCAST_RATE !== 0) {
        // transfer the buffer to the main thread to avoid copying
        this.port.postMessage(result, [result.buffer]);
      }
    } else {
      // transfer the buffer to the main thread to avoid copying
      this.port.postMessage(result, [result.buffer]);
    }

    return true;
  }
}

registerProcessor('level-processor', LevelProcessor);
