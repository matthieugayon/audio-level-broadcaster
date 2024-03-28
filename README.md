# Audio meter broadcaster

This project is my solution for the Holoplot Front-end developer task.

This solution, a react application, is structured around two routes each using their own isolated store, which I call APIs.

These stores, using the zustand library, are exposed as hooks and can therefore be used to manage the components state, but they also hold audio and canvas logic.

## Audio API

The audio store, hooked up to the Microphone component, exposes functions to set up the communication channel with the shared worker and to init an audio graph. For analysing the audio samples, we opted toward a more low level approach using the AudioWorkletProcessor API and a custom rust based wasm module.

Our Rust library analyse the audio input samples and produces 3 streams of data :
- a peak level with a slight decay, based on the max value of the rectified input samples
- a rms level based on the processing of a ring buffer storing 1024 samples, with a slight decay
- a peak hold signal, holding the peaks for approximatively 1 second before decaying with the same velocity as the other signals

Every block size (currently fixed at 128, but my implementation accommodates any 2n size),
we run our wasm function to compute these 3 floats, we store them in a Float32Array, which we send over, each 512 samples, through the postMessage channel of the audio worklet, making sure we transfer the ownership of the array for optimal performance. On reception of the message, in the audio worklet node on the main thread, we transfer that array to the shared worker, again making sure we transfer ownership of the array as previously done.

With an increased data transfer rate of 86 FPS at 44.1khz, or 93 FPS at 48kHz, and most of the data analysis done with wasm computation, it is possible we avoid frame mismatch bewteen the two browsing contexts both pushing and reading data with RequestAnimationFrame, therefore reducing latency. At the very least, it is a nice solution and enables more extensive processing of the audio signal at a reduced cost.

## Vizualizer API

The vizualizer store, hooked up to the LevelMeter react component, exposes functions to set up the communication channel with the shared worker, and for continuously vizualizing the received Float32Array using the canvas API.

Special care is given to the interpollation of the DB values in order to decrease low levels visibility and achieve "close" to linear response above -48db.

Text marks are displayed with html / css to avoid text drawing overhead with the canvas API. We use two canvases, one for the continuously rerendered level data, the other for displaying static primitives (the scale marks).

