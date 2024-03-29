/**
 * Level Node
 * the audio worklet node that will be used to process the audio data
 * main thread interface with the underlying audio processor
 */

export interface Event {
  type: 'wasm-module' | 'init',
  wasmBytes?: ArrayBuffer,
  broadcast?: (buffer: Float32Array) => void
}

export default class LevelNode extends AudioWorkletNode {
  _broadcast: ((buffer: Float32Array) => void) | null = null;

  init(wasmBytes: ArrayBuffer, broadcast: (buffer: Float32Array) => void) {
    // Listen to messages sent from the audio processor.
    this.port.onmessage = (event) => this.onmessage(event.data);
    this._broadcast = broadcast;

    this.postMessage({
      type: 'wasm-module',
      wasmBytes
    });
  }

  onmessage(event: any) {
    if (event?.type === 'wasm-loaded') {
      this.postMessage({
        type: 'init'
      });
    } else if (this._broadcast) {
      this._broadcast(event);
    }
  }

  // types message interface
  postMessage(message: Event) {
    this.port.postMessage(message);
  }
}