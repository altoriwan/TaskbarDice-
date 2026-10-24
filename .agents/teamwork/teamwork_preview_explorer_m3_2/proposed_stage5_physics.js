// ===========================================================================
// Stage 5 Physics & Animation Components for static/index.html
// Designed by teamwork_preview_explorer_m3_2
// ===========================================================================

// 1. Fixed Recycling Pools (Zero-allocation at 60fps)
const MAX_SLIME_DRIPS = 80;
const slimeDripPool = [];
for (let i = 0; i < MAX_SLIME_DRIPS; i++) {
  slimeDripPool.push({
    active: false,
    x: 0,
    y: 0,
    vy: 0,
    gravity: 0.1,
    length: 2,
    color: '#84cc16',
    glowColor: 'rgba(132, 204, 22, 0.4)',
    type: 'green'
  });
}
const slimeParticles = slimeDripPool; // Backward compatibility

const MAX_SLIME_PUDDLES = 12;
const slimePuddlePool = [];
for (let i = 0; i < MAX_SLIME_PUDDLES; i++) {
  slimePuddlePool.push({
    active: false,
    x: 0,
    y: GROUND_Y,
    width: 0,
    targetWidth: 0,
    maxWidth: 55,
    height: 3,
    color: '#140428',
    rimColor: '#7e22ce',
    highlightColor: '#c084fc',
    bubbleColor: '#a855f7',
    alpha: 1.0,
    bubbles: [
      { xRel: -4, progress: 0.1, speed: 0.02, size: 2.2 },
      { xRel: 3, progress: 0.6, speed: 0.015, size: 2.6 },
      { xRel: -7, progress: 0.85, speed: 0.025, size: 1.8 }
    ]
  });
}

const MAX_SLIME_SPLASHES = 24;
const slimeSplashPool = [];
for (let i = 0; i < MAX_SLIME_SPLASHES; i++) {
  slimeSplashPool.push({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    maxLife: 12,
    color: '#84cc16'
  });
}

// 2. Twitch Vibration micro-jitter for Stage 5 (rot >= 0.8)
function calculateTwitchJitter(rot, index, timestamp) {
  if (rot < 0.8) return { dx: 0, dy: 0 };

  const isOverdue = rot >= 1.0;
  const severity = isOverdue ? Math.min(2.8, 1.2 + (rot - 1.0) * 1.6) : 1.0;
  const freq = isOverdue ? 0.055 : 0.028;
  const t = timestamp * freq + (index * 19.73);

  const spasmGate = Math.sin(t * 2.1) * Math.cos(t * 3.7);
  const inBurst = isOverdue || Math.abs(spasmGate) > 0.25;

  let dx = 0;
  let dy = 0;

  if (inBurst) {
    const harmonicX = Math.sin(t * 5.3) * 0.5 + Math.sin(t * 11.7) * 0.3;
    const harmonicY = Math.cos(t * 4.7) * 0.4 + Math.cos(t * 9.1) * 0.3;
    const noiseX = (Math.random() - 0.5) * 1.2;
    const noiseY = (Math.random() - 0.5) * 1.0;

    const baseAmp = isOverdue ? 2.4 : 1.0;
    dx = (harmonicX + noiseX) * baseAmp * severity;
    dy = (harmonicY + noiseY) * (baseAmp * 0.75) * severity;
  }

  const maxClamp = isOverdue ? 4.5 : 1.8;
  dx = Math.max(-maxClamp, Math.min(maxClamp, dx));
  dy = Math.max(-maxClamp, Math.min(maxClamp, dy));

  return { dx, dy };
}

// 3. Slime Drip Spawner
function spawnStage5SlimeDrip(renderX, renderY, rx, ry, height, rot) {
  if (rot < 0.8) return;

  const isOverdue = rot >= 1.0;
  const spawnChance = isOverdue ? 0.22 : 0.08;
  if (Math.random() > spawnChance) return;

  for (let k = 0; k < MAX_SLIME_DRIPS; k++) {
    const p = slimeDripPool[k];
    if (!p.active) {
      p.active = true;
      const side = Math.random() < 0.5 ? -1 : 1;
      const u = Math.random();
      p.x = renderX + side * u * rx * 0.85;
      p.y = renderY + ry + height - (u * ry * 0.6);
      p.vy = isOverdue ? (0.7 + Math.random() * 0.7) : (0.4 + Math.random() * 0.4);
      p.gravity = 0.08 + Math.random() * 0.04;
      p.length = 2;

      const isPurple = Math.random() < 0.45;
      if (isPurple) {
        p.color = Math.random() < 0.5 ? '#c084fc' : '#a855f7';
        p.glowColor = 'rgba(192, 132, 252, 0.4)';
        p.type = 'purple';
      } else {
        p.color = Math.random() < 0.5 ? '#84cc16' : '#a3e635';
        p.glowColor = 'rgba(132, 204, 22, 0.4)';
        p.type = 'green';
      }
      break;
    }
  }
}

// 4. Floor Impact Handler
function triggerSlimeFloorImpact(impactX, color, type) {
  let splashCount = 0;
  for (let i = 0; i < MAX_SLIME_SPLASHES && splashCount < 2; i++) {
    const s = slimeSplashPool[i];
    if (!s.active) {
      s.active = true;
      s.x = impactX;
      s.y = GROUND_Y;
      s.vx = (Math.random() - 0.5) * 1.8;
      s.vy = -0.5 - Math.random() * 0.8;
      s.life = 0;
      s.maxLife = 8 + Math.floor(Math.random() * 6);
      s.color = color;
      splashCount++;
    }
  }

  let absorbed = false;
  for (let i = 0; i < MAX_SLIME_PUDDLES; i++) {
    const p = slimePuddlePool[i];
    if (p.active && Math.abs(p.x - impactX) < (p.width * 0.6 + 10)) {
      p.targetWidth = Math.min(p.maxWidth, p.targetWidth + 3.5);
      p.alpha = Math.min(1.0, p.alpha + 0.1);
      absorbed = true;
      break;
    }
  }

  if (!absorbed) {
    for (let i = 0; i < MAX_SLIME_PUDDLES; i++) {
      const p = slimePuddlePool[i];
      if (!p.active) {
        p.active = true;
        p.x = impactX;
        p.y = GROUND_Y + (Math.random() * 3);
        p.width = 4;
        p.targetWidth = 12;
        p.maxWidth = 42 + Math.floor(Math.random() * 20);
        p.height = 3;
        p.alpha = 0.95;
        if (type === 'purple') {
          p.color = '#1e1b4b';
          p.rimColor = '#7e22ce';
          p.highlightColor = '#c084fc';
          p.bubbleColor = '#a855f7';
        } else {
          p.color = '#022c22';
          p.rimColor = '#365314';
          p.highlightColor = '#84cc16';
          p.bubbleColor = '#a3e635';
        }
        p.bubbles.forEach((b, idx) => {
          b.progress = idx * 0.33;
          b.speed = 0.012 + Math.random() * 0.012;
          b.size = 1.8 + Math.random() * 1.2;
          b.xRel = (Math.random() - 0.5) * 8;
        });
        break;
      }
    }
  }
}

// 5. Slime Simulation & Rendering (Puddles, Bubbles, Drips, Splatters)
function updateAndDrawSlime(c) {
  const isZen = (diceStack.length === 0);

  // A. Puddles & Bubbles
  for (let i = 0; i < MAX_SLIME_PUDDLES; i++) {
    const p = slimePuddlePool[i];
    if (!p.active) continue;

    if (isZen) {
      p.alpha -= 0.015;
      if (p.alpha <= 0) {
        p.active = false;
        continue;
      }
    }

    p.width += (p.targetWidth - p.width) * 0.06;
    p.height = Math.max(3, Math.min(8, p.width * 0.22));

    c.save();
    c.globalAlpha = p.alpha;

    c.fillStyle = p.rimColor;
    c.beginPath();
    c.ellipse(p.x, p.y, p.width / 2 + 1, p.height / 2 + 0.5, 0, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = p.color;
    c.beginPath();
    c.ellipse(p.x, p.y, p.width / 2, p.height / 2, 0, 0, Math.PI * 2);
    c.fill();

    c.strokeStyle = p.highlightColor;
    c.lineWidth = 1;
    c.beginPath();
    c.ellipse(p.x, p.y - 1, p.width * 0.35, p.height * 0.3, 0, Math.PI, Math.PI * 2);
    c.stroke();

    p.bubbles.forEach(b => {
      b.progress += b.speed;
      if (b.progress >= 1.0) {
        b.progress = 0;
        b.speed = 0.012 + Math.random() * 0.015;
        b.size = 1.5 + Math.random() * 1.5;
        b.xRel = (Math.random() - 0.5) * (p.width * 0.65);
      }
      const curRadius = b.size * Math.sin(b.progress * Math.PI);
      if (curRadius > 0.4) {
        const bx = p.x + b.xRel;
        const by = p.y - (curRadius * 0.5);
        c.fillStyle = p.bubbleColor;
        c.beginPath();
        c.arc(bx, by, curRadius, 0, Math.PI * 2);
        c.fill();
        if (curRadius > 1.3) {
          c.fillStyle = '#ffffff';
          c.fillRect(Math.floor(bx - 0.5), Math.floor(by - curRadius * 0.5), 1, 1);
        }
      }
    });

    c.restore();
  }

  // B. Drips
  for (let i = 0; i < MAX_SLIME_DRIPS; i++) {
    const p = slimeDripPool[i];
    if (!p.active) continue;

    p.vy += p.gravity;
    p.y += p.vy;
    p.length = Math.max(2, Math.min(6, Math.floor(p.vy * 1.8)));

    if (p.y + p.length >= GROUND_Y) {
      p.active = false;
      triggerSlimeFloorImpact(p.x, p.color, p.type);
      continue;
    }

    c.fillStyle = p.glowColor;
    c.fillRect(Math.floor(p.x) - 1, Math.floor(p.y), 3, p.length);
    c.fillStyle = p.color;
    c.fillRect(Math.floor(p.x), Math.floor(p.y), 2, p.length);
  }

  // C. Splatters
  for (let i = 0; i < MAX_SLIME_SPLASHES; i++) {
    const s = slimeSplashPool[i];
    if (!s.active) continue;

    s.x += s.vx;
    s.y += s.vy;
    s.vy += 0.2;
    s.life++;

    c.fillStyle = s.color;
    c.fillRect(Math.floor(s.x), Math.floor(s.y), 2, 2);

    if (s.life >= s.maxLife || s.y > GROUND_Y + 6) {
      s.active = false;
    }
  }
}
