/**
 * 5-Stage Isometric Die Rot Engine Visual Rendering
 * Designed by teamwork_preview_explorer_m3_1 for Milestone 3 (R3)
 * Target File: static/index.html
 */

/**
 * Draws a 2.5D Isometric Die with 5-Stage Rot Engine Textures
 * 
 * Stage mapping:
 * - Stage 1 (0-20%): Pristine ivory (#fdfbf7, #e5dec9) + specular shine highlight streak across top face.
 * - Stage 2 (20-40%): Fading sandy yellow (#eae0c8, #c5b89a) + subtle corner scratches on isometric edges.
 * - Stage 3 (40-60%): Cracked stone (#8a8d8f, #5a5c5e) + 3-4 dark jagged fissures across die faces.
 * - Stage 4 (60-80%): Mossy decay (#4a5d4e, #2d3a30) + purple/green fungus dots + creeping roots wrapping around sides.
 * - Stage 5 (80-100%+ / Overdue): Toxic necrotic purple/green (#2e1f3d, #1a2e22) + blinking red label when overdue (rot >= 1.0).
 */
function drawRotIsometricDice(c, cx, cy, width, height, weight, label, rot) {
  const rx = width / 2;
  const ry = width / 4;

  c.save();
  c.lineWidth = 2;
  c.lineJoin = 'miter';
  c.strokeStyle = '#000000';

  let leftColor, rightColor, topColor, pipColor;
  let stage = 1;

  if (rot < 0.20) {
    // Stage 1 (0-20%): Pristine ivory
    stage = 1;
    topColor = '#fdfbf7';
    leftColor = '#f1ecdc';
    rightColor = '#e5dec9';
    pipColor = '#18181b';
  } else if (rot < 0.40) {
    // Stage 2 (20-40%): Fading sandy yellow
    stage = 2;
    topColor = '#eae0c8';
    leftColor = '#d7cbb0';
    rightColor = '#c5b89a';
    pipColor = '#3c352a';
  } else if (rot < 0.60) {
    // Stage 3 (40-60%): Cracked stone
    stage = 3;
    topColor = '#8a8d8f';
    leftColor = '#727577';
    rightColor = '#5a5c5e';
    pipColor = '#222426';
  } else if (rot < 0.80) {
    // Stage 4 (60-80%): Mossy decay
    stage = 4;
    topColor = '#4a5d4e';
    leftColor = '#3a4b3e';
    rightColor = '#2d3a30';
    pipColor = '#18221b';
  } else {
    // Stage 5 (80-100%+ / Overdue): Toxic necrotic purple/green
    stage = 5;
    topColor = '#2e1f3d';
    leftColor = '#22162e';
    rightColor = '#1a2e22';
    pipColor = '#a3e635'; // Luminescent radioactive lime

    // Slime drip spawn hook (coordinated with m3_2)
    if (Math.random() < 0.08) {
      const spawnSide = Math.random() > 0.5 ? 1 : -1;
      slimeParticles.push({
        x: cx + (Math.random() * rx * 0.7 * spawnSide),
        y: cy + ry + height,
        vy: 0.6 + Math.random() * 0.6,
        color: Math.random() > 0.5 ? '#84cc16' : '#c084fc'
      });
    }
  }

  // 1. LEFT FACE
  c.fillStyle = leftColor;
  c.beginPath();
  c.moveTo(cx - rx, cy);
  c.lineTo(cx, cy + ry);
  c.lineTo(cx, cy + ry + height);
  c.lineTo(cx - rx, cy + height);
  c.closePath();
  c.fill();
  c.stroke();

  // 2. RIGHT FACE
  c.fillStyle = rightColor;
  c.beginPath();
  c.moveTo(cx, cy + ry);
  c.lineTo(cx + rx, cy);
  c.lineTo(cx + rx, cy + height);
  c.lineTo(cx, cy + ry + height);
  c.closePath();
  c.fill();
  c.stroke();

  // 3. TOP FACE
  c.fillStyle = topColor;
  c.beginPath();
  c.moveTo(cx, cy - ry);
  c.lineTo(cx + rx, cy);
  c.lineTo(cx, cy + ry);
  c.lineTo(cx - rx, cy);
  c.closePath();
  c.fill();
  c.stroke();

  // 4. STAGE-SPECIFIC TEXTURE DETAILS & OVERLAYS
  if (stage === 1) {
    // Stage 1: Specular shine highlight streak across top face
    c.save();
    c.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(cx - rx * 0.65, cy - ry * 0.1);
    c.lineTo(cx - rx * 0.15, cy - ry * 0.6);
    c.stroke();

    // Accent sparkle glint
    c.fillStyle = '#ffffff';
    c.fillRect(cx - rx * 0.35, cy - ry * 0.4 - 1, 2, 2);
    c.restore();
  } else if (stage === 2) {
    // Stage 2: Subtle corner scratches on isometric edges
    c.save();
    c.strokeStyle = '#9c8f76';
    c.lineWidth = 1;
    // Scratch 1: top-left corner
    c.beginPath();
    c.moveTo(cx - rx + 3, cy - 1);
    c.lineTo(cx - rx + 9, cy - ry * 0.3);
    c.stroke();
    // Scratch 2: center vertical edge
    c.beginPath();
    c.moveTo(cx - 2, cy + ry + 3);
    c.lineTo(cx + 4, cy + ry + 7);
    c.stroke();
    // Scratch 3: left face edge
    c.beginPath();
    c.moveTo(cx - rx + 2, cy + height * 0.3);
    c.lineTo(cx - rx + 7, cy + height * 0.35 + 2);
    c.stroke();
    // Scratch 4: right face ridge
    c.beginPath();
    c.moveTo(cx + rx * 0.45, cy + ry * 0.35);
    c.lineTo(cx + rx * 0.65, cy + ry * 0.15 + 3);
    c.stroke();
    c.restore();
  } else if (stage === 3) {
    // Stage 3: Cracked stone + 3-4 dark jagged fissures across die faces
    c.save();
    c.strokeStyle = '#1c1d1f';
    c.lineWidth = 1.5;
    // Fissure 1: Top face cutting down across left face
    c.beginPath();
    c.moveTo(cx - rx * 0.2, cy - ry * 0.3);
    c.lineTo(cx - rx * 0.45, cy + ry * 0.1);
    c.lineTo(cx - rx * 0.35, cy + ry * 0.5 + 4);
    c.lineTo(cx - rx * 0.5, cy + height * 0.6);
    c.lineTo(cx - rx * 0.4, cy + height * 0.85);
    c.stroke();

    // Fissure 2: Center-top fracture branching into right face
    c.beginPath();
    c.moveTo(cx + 3, cy - ry * 0.2);
    c.lineTo(cx + rx * 0.2, cy + ry * 0.2);
    c.lineTo(cx + 2, cy + ry + 5);
    c.lineTo(cx + rx * 0.25, cy + ry + 12);
    c.lineTo(cx + rx * 0.15, cy + height * 0.7);
    c.stroke();

    // Fissure 3: Top face cross fracture
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(cx - rx * 0.45, cy + ry * 0.1);
    c.lineTo(cx + rx * 0.1, cy - ry * 0.1);
    c.lineTo(cx + rx * 0.35, cy + ry * 0.2);
    c.stroke();

    // Fissure 4: Right face lateral fracture
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(cx + rx * 0.6, cy + 2);
    c.lineTo(cx + rx * 0.45, cy + ry * 0.4 + 5);
    c.lineTo(cx + rx * 0.55, cy + height * 0.55);
    c.stroke();
    c.restore();
  } else if (stage === 4) {
    // Stage 4: Mossy decay + purple/green fungus dots + creeping roots wrapping around sides
    c.save();
    // 1. Creeping roots
    c.strokeStyle = '#142217';
    c.lineWidth = 1.5;
    // Root 1 (left side wrap)
    c.beginPath();
    c.moveTo(cx - rx, cy + height * 0.7);
    c.lineTo(cx - rx * 0.6, cy + height * 0.5);
    c.lineTo(cx - rx * 0.35, cy + ry * 0.7 + 6);
    c.lineTo(cx - rx * 0.5, cy + ry * 0.3);
    c.stroke();
    // Root 2 (right side wrap)
    c.beginPath();
    c.moveTo(cx, cy + ry + height - 2);
    c.lineTo(cx + rx * 0.2, cy + ry + height * 0.5);
    c.lineTo(cx + rx * 0.45, cy + ry * 0.8 + 8);
    c.lineTo(cx + rx * 0.7, cy + height * 0.4);
    c.lineTo(cx + rx, cy + height * 0.25);
    c.stroke();
    // Root 3 (top ridge creep)
    c.beginPath();
    c.moveTo(cx, cy + ry);
    c.lineTo(cx + rx * 0.15, cy + ry * 0.3);
    c.lineTo(cx + rx * 0.3, cy - ry * 0.1);
    c.stroke();

    // 2. Purple/green fungus dots
    // Top face cluster
    c.fillStyle = '#84cc16';
    c.fillRect(cx - rx * 0.35, cy - ry * 0.25, 2, 2);
    c.fillRect(cx - rx * 0.25, cy - ry * 0.15, 3, 2);
    c.fillStyle = '#c084fc';
    c.fillRect(cx - rx * 0.3, cy - ry * 0.1, 2, 2);
    c.fillRect(cx + rx * 0.35, cy + ry * 0.1, 3, 3);
    c.fillStyle = '#4ade80';
    c.fillRect(cx + rx * 0.25, cy + ry * 0.2, 2, 2);
    // Left face cluster
    c.fillStyle = '#7e22ce';
    c.fillRect(cx - rx * 0.65, cy + height * 0.4, 3, 3);
    c.fillStyle = '#84cc16';
    c.fillRect(cx - rx * 0.55, cy + height * 0.45, 2, 2);
    // Right face cluster
    c.fillStyle = '#c084fc';
    c.fillRect(cx + rx * 0.3, cy + ry + 10, 2, 2);
    c.fillStyle = '#84cc16';
    c.fillRect(cx + rx * 0.4, cy + ry + 14, 3, 2);
    c.fillRect(cx + rx * 0.6, cy + height * 0.6, 2, 2);
    c.restore();
  } else {
    // Stage 5: Toxic necrotic purple/green + deep corruption veins & pustules
    c.save();
    c.strokeStyle = '#022c22';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(cx - rx * 0.5, cy + 2);
    c.lineTo(cx - rx * 0.3, cy + ry * 0.6 + 6);
    c.lineTo(cx - rx * 0.4, cy + height * 0.8);
    c.stroke();

    c.strokeStyle = '#581c87';
    c.beginPath();
    c.moveTo(cx + rx * 0.15, cy + ry * 0.7 + 3);
    c.lineTo(cx + rx * 0.4, cy + ry * 0.3 + 9);
    c.lineTo(cx + rx * 0.35, cy + height * 0.85);
    c.stroke();

    // Radioactive necrotic pustules
    c.fillStyle = '#a3e635';
    c.fillRect(cx - rx * 0.25, cy + ry * 0.5 + 4, 3, 3);
    c.fillStyle = '#c084fc';
    c.fillRect(cx + rx * 0.35, cy + height * 0.5, 3, 3);
    c.restore();
  }

  // 5. DRAW PIPS
  drawDicePips(c, cx, cy, rx, ry, weight, pipColor);

  // 6. DRAW TASK LABEL (WITH BLINKING RED OVERDUE STATE)
  drawDiceLabel(c, cx, cy + ry, rx, height, label, rot);

  c.restore();
}

/**
 * Draws truncated task label with robust Unicode / Vietnamese support
 * Blinking red label when overdue (rot >= 1.0)
 */
function drawDiceLabel(c, cx, cy, rx, height, title, rot) {
  if (!title) return;
  // Strip unprintable control codes but keep Unicode characters & spaces
  let clean = title.toUpperCase().replace(/[\u0000-\u001f\u007f]/g, '').trim();
  if (!clean) return;

  c.save();
  c.font = '6px "Press Start 2P"';
  const maxTextWidth = rx * 1.5;

  // Truncate dynamically using font metrics
  if (c.measureText(clean).width > maxTextWidth) {
    while (clean.length > 1 && c.measureText(clean + '..').width > maxTextWidth) {
      clean = clean.slice(0, -1);
    }
    clean = clean + '..';
  }

  // Color mapping & overdue blinking
  if (rot >= 1.0) {
    // Blinking red label when overdue (rot >= 1.0)
    const isBlinkRed = (Math.floor(Date.now() / 350) % 2 === 0);
    c.fillStyle = isBlinkRed ? '#ef4444' : '#ffffff';
  } else if (rot >= 0.80) {
    c.fillStyle = '#a3e635'; // Stage 5 non-overdue: toxic lime
  } else if (rot >= 0.60) {
    c.fillStyle = '#a3e635'; // Stage 4: moss spore lime
  } else if (rot >= 0.40) {
    c.fillStyle = '#f8fafc'; // Stage 3: crisp white text on cracked granite
  } else if (rot >= 0.20) {
    c.fillStyle = '#2b291d'; // Stage 2: dark sepia on sandy yellow
  } else {
    c.fillStyle = '#111827'; // Stage 1: obsidian on pristine ivory
  }

  c.textAlign = 'center';
  c.fillText(clean, cx, cy + (height * 0.65));
  c.restore();
}
