mod utils;
use std::f32::consts::E;

use wasm_bindgen::prelude::*;

const BLOCK_SIZE: usize = 1025;
const MIN_DB: f32 = -72.;
const MAX_DB: f32 = 6.;

// log utilities
#[wasm_bindgen]
extern "C" {
  #[wasm_bindgen(js_namespace = console)]
  fn log(s: &str);

  #[wasm_bindgen(js_namespace = console, js_name = log)]
  fn log_u32(n: u32);

  #[wasm_bindgen(js_namespace = console, js_name = log)]
  fn log_vec_f32(v: Vec<f32>);
}

#[wasm_bindgen]
pub struct LevelAnalyser {
  buffer: CircularBuffer,
  sample_rate: f32,
  peak_follower: EnvelopeFollower,
  rms_follower: EnvelopeFollower,
  hold_peak_follower: EnvelopeFollower,
}

#[wasm_bindgen]
impl LevelAnalyser {
  pub fn new(sample_rate: f32) -> LevelAnalyser {
    utils::set_panic_hook();

    LevelAnalyser {
      buffer: CircularBuffer::new(),
      sample_rate,
      peak_follower: EnvelopeFollower::new(0., 500., 0.),
      rms_follower: EnvelopeFollower::new(3., 500., 0.),
      hold_peak_follower: EnvelopeFollower::new(0., 500., 1000.),
    }
  }

  pub fn process(&mut self, audio_samples: Vec<f32>) -> Vec<f32> {
    self.buffer.push_samples(audio_samples.iter().cloned());
    let refresh_rate = self.sample_rate / audio_samples.len() as f32;
    let (peak, hold_peak) = self.peaks(audio_samples, refresh_rate);
    let rms = self.rms(refresh_rate);

    vec![
      clamp(peak),
      clamp(rms),
      clamp(hold_peak),
    ]
  }

  fn peaks(&mut self, audio_samples: Vec<f32>, refresh_rate: f32) -> (f32, f32) {
    let mut block_peak = 0.;
    for &sample in audio_samples.iter() {
      let abs_sample = sample.abs();
      if abs_sample > block_peak {
        block_peak = abs_sample;
      }
    }

    let peak = self.peak_follower.process(block_peak, refresh_rate);
    let hold_peak = self.hold_peak_follower.process(block_peak, refresh_rate);

    (20.0 * peak.log10(), 20.0 * hold_peak.log10())
  }

  fn rms(&mut self, refresh_rate: f32) -> f32 {
    let sum_of_squares = self.buffer.iter().map(|x| x * x).sum::<f32>();
    let mut rms = (sum_of_squares / BLOCK_SIZE as f32).sqrt();

    rms = self.rms_follower.process(rms, refresh_rate);

    20.0 * rms.log10()
  }
}

struct CircularBuffer {
  buffer: [f32; BLOCK_SIZE], // Holds the audio samples
  write_position: usize, // Current position in buffer where next sample will be written
}

impl CircularBuffer {
  /// Creates a new CircularBuffer of a fixed size
  fn new() -> Self {
    CircularBuffer {
      buffer: [0.0; BLOCK_SIZE],
      write_position: 0,
    }
  }

  /// Adds a sample to the buffer, overwriting the oldest sample if the buffer is full
  fn push(&mut self, sample: f32) {
    self.buffer[self.write_position] = sample;
    self.write_position = (self.write_position + 1) % BLOCK_SIZE;
  }

  /// Adds multiple samples from an iterator into the buffer
  fn push_samples<I>(&mut self, samples: I)
  where
    I: IntoIterator<Item = f32>,
  {
    for sample in samples {
      self.push(sample);
    }
  }

  fn iter(&self) -> std::slice::Iter<f32> {
    self.buffer.iter()
  }
}

struct EnvelopeFollower {
  attack_time: f32,
  release_time: f32,
  hold_time: f32,
  envelope: f32,
  peak_hold: f32,
  hold_count: usize,
}

impl EnvelopeFollower {
  fn new(attack_time: f32, release_time: f32, hold_time: f32) -> Self {
    EnvelopeFollower {
      attack_time,
      release_time,
      hold_time,
      envelope: 0.,
      peak_hold: 0.,
      hold_count: 0,
    }
  }

  // because we cannot know the bloc size at init time
  // we must pass the refresh rate to the process method
  // and calculate the attack and release coefficients
  fn process(&mut self, input: f32, refresh_rate: f32) -> f32 {
    let attack_coeff = 1.0 - E.powf(-1.0 / (self.attack_time / 1000.0 * refresh_rate * 0.5));
    let release_coeff = 1.0 - E.powf(-1.0 / (self.release_time / 1000.0 * refresh_rate * 0.5));
    let hold_samples = (self.hold_time / 1000.0) * refresh_rate;

    if input > self.peak_hold {
      self.peak_hold = input;
      self.hold_count = hold_samples as usize;
    } else if self.hold_count > 0 {
      self.hold_count -= 1;
    }

    if self.hold_count > 0 {
      self.envelope = self.peak_hold;
    } else {
      // self.peak_hold = 0.0;
      if input > self.envelope {
        self.envelope += (input - self.envelope) * attack_coeff;
      } else {
        self.envelope += (input - self.envelope) * release_coeff;
      }

      self.peak_hold = self.envelope;
    }

    self.envelope
  }
}

fn clamp(value: f32) -> f32 {
  value.max(MIN_DB).min(MAX_DB)
}
