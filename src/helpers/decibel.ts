// dB levels for bold and medium marks
export const BOLD_MARKERS = [-60, -48, -36, -24, -12, 0];
export const MEDIUM_MAKERS = [-66, -54, -42, -30, -18, -6, 6];
export const MARKER_WIDTH = 1;

// min and max dB values
export const MIN_DB = -72;
export const MAX_DB = 6;

// Normalize dB value to a range of 0 to 1
export const dbToNormal = (dbValue:  number) => {
  return easeInSine((dbValue - MIN_DB) / (MAX_DB - MIN_DB))
};

// with a soft start and a "linearish" finish.
// this was chosen to decrease very low levels visibility
// while trying to have a linear response in the higher levels
function easeInSine(x: number): number {
  return 1 - Math.cos((x * Math.PI) / 2);
}

// Scale a normalized db value to a given size and round it
export const scaleNormal = (normal: number, factor: number) => {
  return Math.round(normal * factor);
}

export const scaleNormalInv = (normal: number, factor: number) => {
  return factor - scaleNormal(normal, factor);
}

// get marker position based on marker width
export const getMarkerBottomPosition = (dbValue: number, size: number) => {
  const normal = dbToNormal(dbValue);
  const availableRange = size - MARKER_WIDTH;
  return scaleNormal(normal, availableRange) + MARKER_WIDTH * 0.5;
}
