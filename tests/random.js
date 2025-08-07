// XorShift32 – deterministic, avoids Math.random() global state.
export function makeRng(seed = 0xA11C0DE) {
  let x = seed >>> 0;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return (x >>> 0) / 0xFFFFFFFF;
  };
}

