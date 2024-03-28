/**
 * Types for the AudioWorkletProcessor web API
 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/AudioWorkletProcessor)
 * @types/audioworklet conflicts when using DOM types
 * So we are declaring our own types here
 * based on https://github.com/microsoft/TypeScript/issues/28308
 */

/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/AudioWorkletGlobalScope/currentFrame) */
declare const currentFrame: number;
/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/AudioWorkletGlobalScope/currentTime) */
declare const currentTime: number;
/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/AudioWorkletGlobalScope/sampleRate) */
declare const sampleRate: number;
/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/AudioWorkletGlobalScope/registerProcessor) */

interface AudioWorkletProcessor {
  readonly port: MessagePort;
  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean;
}

declare const AudioWorkletProcessor: {
  prototype: AudioWorkletProcessor;
  new(options?: AudioWorkletNodeOptions): AudioWorkletProcessor;
}

type AudioParamDescriptor = {
  name: string,
  automationRate?: AutomationRate,
  minValue?: number,
  maxValue?: number,
  defaultValue?: number
}

declare function registerProcessor(
  name: string,
  processorCtor: (new (
    options?: AudioWorkletNodeOptions
  ) => AudioWorkletProcessor) & {
    parameterDescriptors?: AudioParamDescriptor[];
  }
):undefined;