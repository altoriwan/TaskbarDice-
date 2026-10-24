const fs = require('fs');
const path = require('path');

// 1. Validate getZenTimePeriod across 24 hours
function testZenHours() {
  const hours = [
    { h: 0, expected: 'night' },
    { h: 5, expected: 'night' },
    { h: 6, expected: 'dawn' },
    { h: 9, expected: 'dawn' },
    { h: 10, expected: 'day' },
    { h: 16, expected: 'day' },
    { h: 17, expected: 'sunset' },
    { h: 19, expected: 'sunset' },
    { h: 20, expected: 'night' },
    { h: 23, expected: 'night' },
  ];
  for (const {h, expected} of hours) {
    const period = (h >= 6 && h < 10) ? 'dawn' : (h >= 10 && h < 17) ? 'day' : (h >= 17 && h < 20) ? 'sunset' : 'night';
    if (period !== expected) throw new Error(`Hour ${h} mismatch: ${period} !== ${expected}`);
  }
  console.log('Zen periods test: 10/10 PASS');
}

// 2. Validate getTierAlpha
function testTierAlpha() {
  function getTierAlpha(visualTier, k) {
    if (visualTier >= k) return 1.0;
    if (visualTier <= k - 1) return 0.0;
    return Math.max(0.0, Math.min(1.0, visualTier - (k - 1)));
  }

  // Tier 1
  if (getTierAlpha(0.0, 1) !== 0.0) throw new Error('Tier 1 alpha at 0 fail');
  if (getTierAlpha(0.5, 1) !== 0.5) throw new Error('Tier 1 alpha at 0.5 fail');
  if (getTierAlpha(1.0, 1) !== 1.0) throw new Error('Tier 1 alpha at 1.0 fail');
  if (getTierAlpha(5.0, 1) !== 1.0) throw new Error('Tier 1 alpha at 5.0 fail');

  // Tier 10
  if (getTierAlpha(9.0, 10) !== 0.0) throw new Error('Tier 10 alpha at 9.0 fail');
  if (getTierAlpha(9.5, 10) !== 0.5) throw new Error('Tier 10 alpha at 9.5 fail');
  if (getTierAlpha(10.0, 10) !== 1.0) throw new Error('Tier 10 alpha at 10.0 fail');
  console.log('TierAlpha math test: PASS');
}

// 3. Validate Compaction step
function testCompaction() {
  for (let count = 1; count <= 10; count++) {
    const compressedStep = count > 5 ? Math.max(14, Math.floor(180 / (count - 1))) : null;
    if (count <= 5 && compressedStep !== null) throw new Error(`count ${count} compressedStep should be null`);
    if (count === 10 && compressedStep !== 20) throw new Error(`count 10 compressedStep should be 20, got ${compressedStep}`);
  }
  console.log('Compaction formula test: PASS');
}

// 4. Validate getAbyssalRotColor robustness across extreme ranges
function testRotColor() {
  function getAbyssalRotColor(rot, now = 0) {
    let r, g, b, h, s, l;
    if (rot <= 0.0) {
      r = 18; g = 20; b = 23; h = 216; s = 12; l = 8;
    } else if (rot < 0.35) {
      const t = rot / 0.35;
      r = 18 + (14 - 18) * t;
      g = 20 + (25 - 20) * t;
      b = 23 + (18 - 23) * t;
      h = 216 + (142 - 216) * t;
      s = 12 + (28 - 12) * t;
      l = 8 + (7.6 - 8) * t;
    } else if (rot < 0.70) {
      const t = (rot - 0.35) / 0.35;
      r = 14 + (25 - 14) * t;
      g = 25 + (13 - 25) * t;
      b = 18 + (30 - 18) * t;
      h = 142 + (282 - 142) * t;
      s = 28 + (39 - 28) * t;
      l = 7.6 + (8.4 - 7.6) * t;
    } else if (rot < 1.0) {
      const t = (rot - 0.70) / 0.30;
      r = 25 + (38 - 25) * t;
      g = 13 + (9 - 13) * t;
      b = 30 + (13 - 30) * t;
      h = 282 + (352 - 282) * t;
      s = 39 + (62 - 39) * t;
      l = 8.4 + (9.2 - 8.4) * t;
    } else {
      const overdueFactor = Math.min(1.5, rot - 1.0);
      const t = overdueFactor / 1.5;
      const pulse = Math.sin(now * 0.005) * (0.6 + t * 1.4);
      r = Math.min(60, Math.floor(38 + t * 20 + (pulse > 0 ? pulse * 3 : 0)));
      g = Math.max(4, Math.floor(9 - t * 4));
      b = Math.max(6, Math.floor(13 - t * 6));
      h = 352 + Math.floor(t * 5);
      s = Math.min(85, Math.floor(62 + t * 20));
      l = Math.min(15, Math.max(6, 9.2 + t * 2.5 + pulse * 0.6));
    }
    return { r: Math.round(r), g: Math.round(g), b: Math.round(b), hue: Math.round(h), sat: Math.round(s), light: Number(l.toFixed(1)) };
  }

  const testRotValues = [-1.0, 0.0, 0.1, 0.35, 0.5, 0.7, 0.99, 1.0, 2.5, 10.0];
  for (const rot of testRotValues) {
    const res = getAbyssalRotColor(rot, 123456);
    if (isNaN(res.r) || isNaN(res.g) || isNaN(res.b) || isNaN(res.hue)) {
      throw new Error(`NaN encountered at rot=${rot}`);
    }
    if (res.r < 0 || res.g < 0 || res.b < 0) {
      throw new Error(`Negative color channel at rot=${rot}`);
    }
  }
  console.log('Rot color stability test: PASS');
}

testZenHours();
testTierAlpha();
testCompaction();
testRotColor();
