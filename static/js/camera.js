/**
 * Deadline Heavyweight - Camera Controller & Screen Shake
 * Calibrated exponential falloff e^(-lambda * t) for visceral yet non-dizzying visual weight feedback.
 */

class CameraShakeController {
  constructor(camera, controls) {
    this.camera = camera;
    this.controls = controls;

    this.basePosition = new THREE.Vector3(0, 10.0, 16.0);
    this.baseTarget = new THREE.Vector3(0, 2.0, 0);

    this.trauma = 0.0;
    this.maxAngle = 0.025;   // Angular shake in radians
    this.maxOffset = 0.22;   // Translational shake in units
    this.decayRate = 3.5;    // Exponential falloff factor lambda

    this.criticalInstability = false;
    this.time = 0;
  }

  reset() {
    this.trauma = 0.0;
    this.camera.position.copy(this.basePosition);
    if (this.controls) {
      this.controls.target.copy(this.baseTarget);
      this.controls.update();
    }
  }

  /**
   * Adds collision trauma based on Screen Shake Amplitude formula.
   */
  addTrauma(amount) {
    const scaled = Math.min(0.65, amount * 0.7);
    this.trauma = Math.min(1.0, this.trauma + scaled);
  }

  setCriticalInstability(isCritical) {
    this.criticalInstability = isCritical;
  }

  update(dt) {
    this.time += dt;

    // Decay trauma via exponential falloff e^(-lambda * dt)
    if (this.trauma > 0) {
      this.trauma *= Math.exp(-this.decayRate * dt);
      if (this.trauma < 0.001) this.trauma = 0;
    }

    // Shake intensity is quadratic with trauma
    let shake = this.trauma * this.trauma;

    // Subtle micro-tremor when high stress is present
    if (this.criticalInstability) {
      shake += Math.abs(Math.sin(this.time * 20.0) * 0.003);
    }

    if (shake > 0.0001) {
      const yaw = (Math.random() * 2 - 1) * this.maxAngle * shake;
      const pitch = (Math.random() * 2 - 1) * this.maxAngle * shake;
      const roll = (Math.random() * 2 - 1) * this.maxAngle * shake;

      const offsetX = (Math.random() * 2 - 1) * this.maxOffset * shake;
      const offsetY = (Math.random() * 2 - 1) * this.maxOffset * shake;
      const offsetZ = (Math.random() * 2 - 1) * this.maxOffset * shake;

      this.camera.position.x += offsetX;
      this.camera.position.y += offsetY;
      this.camera.position.z += offsetZ;

      this.camera.rotation.x += pitch;
      this.camera.rotation.y += yaw;
      this.camera.rotation.z += roll;
    }
  }
}

window.CameraShakeController = CameraShakeController;
