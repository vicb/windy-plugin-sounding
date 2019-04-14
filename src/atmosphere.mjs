// Gas constant for dry air at the surface of the Earth
const Rd = 287;
// Specific heat at constant pressure for dry air
const Cpd = 1005;
// Molecular weight ratio
const epsilon = 18.01528 / 28.9644;
// Heat of vaporization of water
const Lv = 2501000;
// Ratio of the specific gas constant of dry air to the specific gas constant for water vapour
const satPressure0c = 6.112;
// C + celsiusToK -> K
const celsiusToK = 273.15;
const L = -6.5e-3;
const g = 9.80665;

/**
 * Computes the temperature at the given pressure assuming dry processes.
 *
 * t0 is the starting temperature at p0 (degree Celsius).
 */
function dryLapse(p, tK0, p0) {
  return tK0 * Math.pow(p / p0, Rd / Cpd);
}

// Computes the mixing ration of a gas.
function mixingRatio(partialPressure, totalPressure, molecularWeightRatio = epsilon) {
  return (molecularWeightRatio * partialPressure) / (totalPressure - partialPressure);
}

// Computes the saturation mixing ratio of water vapor.
function saturationMixingRatio(p, tK) {
  return mixingRatio(saturationVaporPressure(tK), p);
}

// Computes the saturation water vapor (partial) pressure
function saturationVaporPressure(tK) {
  const tC = tK - celsiusToK;
  return satPressure0c * Math.exp((17.67 * tC) / (tC + 243.5));
}

// Computes the temperature gradient assuming liquid saturation process.
function moistGradientT(p, tK) {
  const rs = saturationMixingRatio(p, tK);
  const n = Rd * tK + Lv * rs;
  const d = Cpd + (Math.pow(Lv, 2) * rs * epsilon) / (Rd * Math.pow(tK, 2));
  return (1 / p) * (n / d);
}

// Computes water vapor (partial) pressure.
function vaporPressure(p, mixing) {
  return (p * mixing) / (epsilon + mixing);
}

// Computes the ambient dewpoint given the vapor (partial) pressure.
function dewpoint(p) {
  const val = Math.log(p / satPressure0c);
  return celsiusToK + (243.5 * val) / (17.67 - val);
}

function getElevation(p) {
  const t0 = 288.15;
  const p0 = 1013.25;
  return (t0 / L) * (Math.pow(p / p0, (-L * Rd) / g) - 1);
}

export default {
  dryLapse,
  moistGradientT,
  dewpoint,
  vaporPressure,
  getElevation,
  saturationVaporPressure,
  mixingRatio,
  celsiusToK,
};
