// dB levels for bold and medium marks
export const BOLD_MARKERS = [-60, -48, -36, -24, -12, 0];
export const MEDIUM_MAKERS = [-66, -54, -42, -30, -18, -6, 6];

// min and max dB values
export const MIN_DB = -72;
export const MAX_DB = 6;

// Normalize dB value to a range of 0 to 1
export const dbNormal = (dbValue:  number) => {
  return easeInSine((dbValue - MIN_DB) / (MAX_DB - MIN_DB))
};

// with a soft start and a "linearish" finish.
// this was chosen to decrease very low levels visibility
// while trying to have a more linear response in the higher levels
function easeInSine(x: number): number {
  return 1 - Math.cos((x * Math.PI) / 2);
}

// Scale a normalized db value to a given size and round it
export const scaleNormal = (normal: number, factor: number) => {
  return Math.round(normal * factor);
}