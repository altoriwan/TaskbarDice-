/**
 * Deadline Heavyweight - 3-Tier Dynamic Stress Shaders
 * Implements:
 * 1. Cool Granite Stone (Low Stress: 0-35)
 * 2. Weathered Rusted Iron (Medium Stress: 36-70)
 * 3. Cracked Obsidian Core with Pulsing Magma Fissures (Extreme Stress: 71-100)
 */

class StressMaterialFactory {
  constructor() {
    this.animatedMaterials = [];
    this.textureCache = new Map();
  }

  update(dt) {
    for (const mat of this.animatedMaterials) {
      if (mat.uniforms && mat.uniforms.uTime) {
        mat.uniforms.uTime.value += dt;
      }
    }
  }

  /**
   * Generates a 6-face material array for a cube:
   * Front face (+Z) has the task info badge; remaining 5 faces use the stress shader/material.
   */
  createCubeMaterials(task) {
    const stress = task.weight_score || 50;
    const stressLevel = task.stress_level || (stress > 70 ? 'critical' : stress > 35 ? 'elevated' : 'calm');

    // 1. Generate base body material
    let bodyMat;
    if (stressLevel === 'critical' || stress >= 71) {
      bodyMat = this.createMagmaShaderMaterial(task);
      this.animatedMaterials.push(bodyMat);
    } else if (stressLevel === 'elevated' || stress >= 36) {
      bodyMat = this.createRustedIronMaterial(task);
    } else {
      bodyMat = this.createCoolStoneMaterial(task);
    }

    // 2. Generate front label face canvas texture
    const labelTex = this.createLabelTexture(task);
    const frontMat = new THREE.MeshStandardMaterial({
      map: labelTex,
      roughness: 0.5,
      metalness: 0.2
    });

    // BoxGeometry material index order: +X (right), -X (left), +Y (top), -Y (bottom), +Z (front), -Z (back)
    return [
      bodyMat,  // right
      bodyMat,  // left
      bodyMat,  // top
      bodyMat,  // bottom
      frontMat, // front (+Z)
      bodyMat   // back
    ];
  }

  /**
   * Cấp 1: Cool Granite Stone (0-35)
   */
  createCoolStoneMaterial(task) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Cool slate granite base
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, 128, 128);

    // Granite crystalline speckles
    for (let i = 0; i < 400; i++) {
      const x = Math.random() * 128;
      const y = Math.random() * 128;
      ctx.fillStyle = Math.random() > 0.5 ? '#64748b' : '#1e293b';
      ctx.fillRect(x, y, 2, 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;

    return new THREE.MeshStandardMaterial({
      map: tex,
      color: 0x94a3b8,
      roughness: 0.38,
      metalness: 0.15
    });
  }

  /**
   * Cấp 2: Weathered Rusted Iron (36-70)
   */
  createRustedIronMaterial(task) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Heavy oxidized iron base
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 128, 128);

    // Rust oxidation patches
    for (let i = 0; i < 24; i++) {
      const cx = Math.random() * 128;
      const cy = Math.random() * 128;
      const rad = 4 + Math.random() * 18;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      grad.addColorStop(0, '#c2410c'); // Rust orange
      grad.addColorStop(0.7, '#7c2d12'); // Dark burnt rust
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    return new THREE.MeshStandardMaterial({
      map: tex,
      color: 0xe2e8f0,
      roughness: 0.65,
      metalness: 0.8
    });
  }

  /**
   * Cấp 3: Extreme Stress - Cracked Obsidian Core with Pulsing Magma Fissures
   * Implemented via custom GLSL Fragment Shader.
   */
  createMagmaShaderMaterial(task) {
    const vertexShader = `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;

      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform float uTime;
      uniform vec3 uObsidianColor;
      uniform vec3 uMagmaHot;
      uniform vec3 uMagmaCore;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;

      // 2D pseudo-random noise generator
      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      // Voronoi-like cellular cracks
      float crackPattern(vec2 p) {
        float n = noise(p * 4.5);
        float n2 = noise(p * 9.0 + n);
        float lines = abs(sin(n2 * 6.28318));
        return smoothstep(0.12, 0.0, lines);
      }

      void main() {
        // Multi-layered animated crack fissures
        vec2 uvAnimated = vUv + vec2(sin(uTime * 0.4) * 0.02, cos(uTime * 0.3) * 0.02);
        float cracks = crackPattern(uvAnimated);

        // Pulsating glowing magma
        float pulse = 0.75 + 0.25 * sin(uTime * 3.5 + vPosition.x * 2.0);
        vec3 magma = mix(uMagmaHot, uMagmaCore, sin(uTime * 2.0) * 0.5 + 0.5);

        // Specular rim light on obsidian edge
        float rim = 1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
        vec3 obsidian = uObsidianColor + vec3(0.08) * pow(rim, 3.0);

        // Composite final surface
        vec3 finalColor = mix(obsidian, magma * (1.8 * pulse), cracks);
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    return new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: {
        uTime: { value: Math.random() * 10.0 },
        uObsidianColor: { value: new THREE.Color(0x0a0c10) },
        uMagmaHot: { value: new THREE.Color(0xff2200) },
        uMagmaCore: { value: new THREE.Color(0xffaa00) }
      }
    });
  }

  /**
   * Generates front-facing task metadata badge.
   */
  createLabelTexture(task) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const stress = task.weight_score || 50;
    const stressColor = stress > 70 ? '#ef4444' : stress > 35 ? '#f97316' : '#38bdf8';

    // Dark sleek container
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 256, 256);

    // Accent header banner
    ctx.fillStyle = stressColor;
    ctx.fillRect(0, 0, 256, 38);

    // Header text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(`STRESS: ${stress}/100`, 16, 25);

    // Deadline tag
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`${task.deadline_str || 'Hôm nay'}`, 16, 68);

    // Task Title (wrapped)
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 16px sans-serif';
    this.wrapText(ctx, task.title || 'Task', 16, 105, 224, 24);

    // Duration & Mass footer
    const duration = task.duration_hours || task.estimated_duration || 2.0;
    const mass = task.mass || (stress * 1.5);
    ctx.fillStyle = '#64748b';
    ctx.font = '12px monospace';
    ctx.fillText(`Est: ${duration}h | Mass: ${Math.round(mass)}kg`, 16, 230);

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
        if (currentY > y + lineHeight * 3) {
          ctx.fillText('...', x, currentY);
          return;
        }
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
  }

  clear() {
    this.animatedMaterials = [];
  }
}

window.StressMaterialFactory = StressMaterialFactory;
