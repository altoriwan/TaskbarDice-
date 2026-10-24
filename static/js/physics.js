/**
 * Deadline Heavyweight - Rapier 3D WASM Physics Simulator
 * Deterministic multi-body collision solver, zero-jitter stacking, and impact impulse dispatching.
 */

class PhysicsSimulator {
  constructor(RAPIER) {
    this.RAPIER = RAPIER;
    this.world = null;
    this.groundCollider = null;
    this.cubePairs = []; // Array of { mesh, rigidBody, collider, task, hasLanded, lastImpactY }
    this.dropTimeouts = [];
    this.impactManager = null;

    this.init();
  }

  setImpactManager(manager) {
    this.impactManager = manager;
  }

  init() {
    if (!this.RAPIER) {
      console.error('[PHYSICS] Rapier runtime not provided.');
      return;
    }

    // Heavy downward visceral gravity (-26.0 m/s^2)
    const gravity = { x: 0.0, y: -26.0, z: 0.0 };
    this.world = new this.RAPIER.World(gravity);

    // 1. Thick Ground Collision Platform (prevents any tunnelling)
    const floorHalfWidth = 9.0;
    const floorHalfDepth = 9.0;
    const floorHalfHeight = 2.0;

    const groundDesc = this.RAPIER.ColliderDesc.cuboid(floorHalfWidth, floorHalfHeight, floorHalfDepth)
      .setTranslation(0.0, -floorHalfHeight, 0.0)
      .setFriction(0.7)
      .setRestitution(0.12);
    this.groundCollider = this.world.createCollider(groundDesc);

    // 2. Invisible Safety Containment Perimeter
    const wallThickness = 1.0;
    const wallHeight = 12.0;
    const arenaBound = 9.5;

    this.world.createCollider(this.RAPIER.ColliderDesc.cuboid(arenaBound, wallHeight, wallThickness).setTranslation(0, wallHeight, -arenaBound));
    this.world.createCollider(this.RAPIER.ColliderDesc.cuboid(arenaBound, wallHeight, wallThickness).setTranslation(0, wallHeight, arenaBound));
    this.world.createCollider(this.RAPIER.ColliderDesc.cuboid(wallThickness, wallHeight, arenaBound).setTranslation(-arenaBound, wallHeight, 0));
    this.world.createCollider(this.RAPIER.ColliderDesc.cuboid(wallThickness, wallHeight, arenaBound).setTranslation(arenaBound, wallHeight, 0));
  }

  /**
   * Spawns a series of tasks with sequential visceral drop timings.
   */
  dropTasks(tasks, scene, materialFactory, onCubeLandedCallback) {
    this.clear(scene);

    if (!tasks || tasks.length === 0) return;

    let currentDelay = 150;
    tasks.forEach((task, index) => {
      const timeout = setTimeout(() => {
        this.spawnTaskCube(task, scene, materialFactory, onCubeLandedCallback, index);
      }, currentDelay);

      this.dropTimeouts.push(timeout);
      currentDelay += 380; // 380ms stagger between drops
    });
  }

  spawnTaskCube(task, scene, materialFactory, onCubeLandedCallback, index = 0) {
    if (!this.world || !this.RAPIER) return;

    // 1. Scale & Dimensions proportional to estimated duration
    const duration = task.duration_hours || task.estimated_duration || 2.0;
    // Base unit 1.4, scaling between 1.1 to 2.4 units
    const scaleFactor = Math.min(2.4, Math.max(1.1, 1.1 + (Math.sqrt(duration) * 0.28)));
    const w = scaleFactor;
    const h = scaleFactor;
    const d = scaleFactor;

    // 2. Mass proportional to composite weight & urgency
    const weightScore = task.weight_score || 50;
    const urgency = task.urgency_score || 5.0;
    const mass = Math.max(5.0, (weightScore * 1.8) + (urgency * 4.0));
    task.mass = mass;

    // 3. Create Three.js Visual Mesh with 3-tier shader
    const geometry = new THREE.BoxGeometry(w, h, d);
    const materials = materialFactory.createCubeMaterials(task);
    const mesh = new THREE.Mesh(geometry, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { task: task };

    // Initial drop position (slight random X/Z scatter for dynamic stacking)
    const spawnX = (Math.random() - 0.5) * 4.2;
    const spawnZ = (Math.random() - 0.5) * 4.2;
    const spawnY = 12.0 + (index * 1.2);

    mesh.position.set(spawnX, spawnY, spawnZ);
    scene.add(mesh);

    // 4. Create Rapier RigidBody
    const rigidBodyDesc = this.RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(spawnX, spawnY, spawnZ)
      .setLinvel(0, -3.0, 0)
      .setAngvel({
        x: (Math.random() - 0.5) * 1.5,
        y: (Math.random() - 0.5) * 1.2,
        z: (Math.random() - 0.5) * 1.5
      })
      .setAdditionalMass(mass);

    const rigidBody = this.world.createRigidBody(rigidBodyDesc);

    // 5. Create Rapier Collider
    const colliderDesc = this.RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2)
      .setFriction(0.65)
      .setRestitution(0.12);

    const collider = this.world.createCollider(colliderDesc, rigidBody);

    this.cubePairs.push({
      mesh: mesh,
      rigidBody: rigidBody,
      collider: collider,
      task: task,
      hasLanded: false,
      lastVelocityY: -3.0,
      dimensions: [w, h, d]
    });
  }

  step(dt) {
    if (!this.world) return;

    this.world.step();

    // Synchronize Three.js visual meshes with Rapier rigid bodies
    for (const pair of this.cubePairs) {
      if (!pair.rigidBody) continue;

      const pos = pair.rigidBody.translation();
      const rot = pair.rigidBody.rotation();
      const linvel = pair.rigidBody.linvel();

      pair.mesh.position.set(pos.x, pos.y, pos.z);
      pair.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);

      // Detect landing impact: either nearing floor or experiencing abrupt deceleration from stacking collision
      const halfH = pair.dimensions[1] / 2;
      const isNearFloor = pos.y <= (halfH + 0.35);
      const verticalDecel = (pair.lastVelocityY !== undefined) ? (pair.lastVelocityY - linvel.y) : 0;
      const isStackCollision = !pair.hasLanded && verticalDecel < -2.5 && pos.y < 11.0;

      if (!pair.hasLanded && (isNearFloor || isStackCollision)) {
        pair.hasLanded = true;
        const impactSpeed = Math.abs(pair.lastVelocityY || linvel.y);

        if (this.impactManager && impactSpeed > 1.2) {
          this.impactManager.onImpact(pos.x, pos.z, pair.task, impactSpeed);
        }
      }

      pair.lastVelocityY = linvel.y;
    }
  }

  clear(scene) {
    this.dropTimeouts.forEach(t => clearTimeout(t));
    this.dropTimeouts = [];

    for (const pair of this.cubePairs) {
      if (pair.rigidBody && this.world) {
        this.world.removeRigidBody(pair.rigidBody);
      }
      if (pair.mesh) {
        scene.remove(pair.mesh);
        if (pair.mesh.geometry) pair.mesh.geometry.dispose();
        if (Array.isArray(pair.mesh.material)) {
          pair.mesh.material.forEach(m => {
            if (m.map) m.map.dispose();
            m.dispose();
          });
        } else if (pair.mesh.material) {
          if (pair.mesh.material.map) pair.mesh.material.map.dispose();
          pair.mesh.material.dispose();
        }
      }
    }

    this.cubePairs = [];
  }
}

window.PhysicsSimulator = PhysicsSimulator;
