export interface Event {
  type: 'wasm-module' | 'init',
  wasmBytes?: ArrayBuffer,
  broadcast?: (buffer: Float32Array) => void
}

export default class LevelNode extends AudioWorkletNode {
  _broadcast = (_samples: Float32Array) => {};

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
      console.log('WASM loaded');
      this.postMessage({
        type: 'init'
      });
    } else {
      this._broadcast(event);
    }
  }

  // types message interface
  postMessage(message: Event) {
    this.port.postMessage(message);
  }
}