/**
 * Deadline Heavyweight - Visual Weight Impact Dynamics
 * Implements non-linear mathematical curves for Screen Shake and Floor Crater Deformation.
 */

class VisualWeightImpactManager {
  constructor(floorMesh, cameraController, audioController) {
    this.floorMesh = floorMesh;
    this.cameraController = cameraController;
    this.audioController = audioController;

    // Mathematical curve constants
    this.A_base = 0.45;       // Base shake amplitude
    this.D_base = 0.35;       // Base crater depth
    this.sigma = 1.2;         // Gaussian radius dispersion
    this.maxCraterDepth = 0.85;

    // Keep initial reference heights of floor vertices
    this.initialYCoords = null;
    this.captureInitialFloor();
  }

  captureInitialFloor() {
    if (!this.floorMesh || !this.floorMesh.geometry) return;
    const pos = this.floorMesh.geometry.attributes.position;
    this.initialYCoords = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      this.initialYCoords[i] = pos.getY(i);
    }
  }

  resetFloor() {
    if (!this.floorMesh || !this.floorMesh.geometry || !this.initialYCoords) return;
    const pos = this.floorMesh.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, this.initialYCoords[i]);
    }
    pos.needsUpdate = true;
    this.floorMesh.geometry.computeVertexNormals();
  }

  /**
   * Screen Shake Amplitude:
   * A_shake = A_base * (urgency / 10)^1.8 * sqrt(duration_hours)
   */
  calculateShakeAmplitude(urgencyScore, durationHours) {
    const u = Math.max(1.0, Math.min(10.0, urgencyScore || 5.0));
    const d = Math.max(0.5, Math.min(48.0, durationHours || 2.0));
    const shake = this.A_base * Math.pow(u / 10.0, 1.8) * Math.sqrt(d);
    return Math.min(1.2, shake);
  }

  /**
   * Floor Crater Depth:
   * D_crater = D_base * log2(1 + weight_score / 25)
   */
  calculateCraterDepth(weightScore) {
    const w = Math.max(1, Math.min(100, weightScore || 50));
    const depth = this.D_base * (Math.log2(1 + w / 25.0));
    return Math.min(this.maxCraterDepth, depth);
  }

  /**
   * Handles collision impact event:
   * 1. Applies dynamic Gaussian vertex displacement on floor
   * 2. Triggers camera screen shake
   * 3. Triggers procedural sub-bass impact audio
   */
  onImpact(x, z, task, impactSpeed = 10.0) {
    const urgency = task ? (task.urgency_score || 5.0) : 5.0;
    const duration = task ? (task.duration_hours || task.estimated_duration || 2.0) : 2.0;
    const weight = task ? (task.weight_score || 50) : 50;
    const stressLevel = task ? (task.stress_level || 'elevated') : 'elevated';

    // 1. Camera Shake
    const shakeAmp = this.calculateShakeAmplitude(urgency, duration);
    if (this.cameraController) {
      this.cameraController.addTrauma(shakeAmp);
    }

    // 2. Procedural Web Audio
    if (this.audioController) {
      const mass = task ? (task.mass || weight) : 20.0;
      this.audioController.playImpact(impactSpeed, mass, stressLevel);
    }

    // 3. Gaussian Floor Crater Deformation
    if (this.floorMesh && this.floorMesh.geometry) {
      const craterDepth = this.calculateCraterDepth(weight);
      this.applyGaussianCrater(x, z, craterDepth);
    }
  }

  applyGaussianCrater(cx, cz, depth) {
    const pos = this.floorMesh.geometry.attributes.position;
    const twoSigmaSq = 2.0 * this.sigma * this.sigma;
    let modified = false;

    // Convert world (cx, cz) to local coords if floor is moved/rotated
    const localCenter = this.floorMesh.worldToLocal(new THREE.Vector3(cx, 0, cz));

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      const distSq = (vx - localCenter.x) * (vx - localCenter.x) + (vz - localCenter.z) * (vz - localCenter.z);

      // Only affect vertices within 3 sigma radius
      if (distSq < (3.0 * this.sigma) * (3.0 * this.sigma)) {
        const falloff = Math.exp(-distSq / twoSigmaSq);
        const currentY = pos.getY(i);
        const newY = Math.max(-this.maxCraterDepth, currentY - depth * falloff * 0.7);
        if (newY !== currentY) {
          pos.setY(i, newY);
          modified = true;
        }
      }
    }

    if (modified) {
      pos.needsUpdate = true;
      this.floorMesh.geometry.computeVertexNormals();
    }
  }
}

// Export to window
window.VisualWeightImpactManager = VisualWeightImpactManager;
