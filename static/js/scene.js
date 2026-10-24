/**
 * Deadline Heavyweight - Three.js Scene Coordinator
 * Subdivided floor pedestal for crater impacts, cinematic lighting, and interactive render loop.
 */

class SceneCoordinator {
  constructor(containerId, RAPIER) {
    this.container = document.getElementById(containerId);
    this.RAPIER = RAPIER;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;

    this.floorMesh = null;
    this.materials = null;
    this.physics = null;
    this.cameraShake = null;
    this.impactManager = null;
    this.audio = null;

    this.lastTime = performance.now();
    this.init();
  }

  init() {
    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07090e);
    this.scene.fog = new THREE.FogExp2(0x07090e, 0.025);

    // 2. Camera with defensive non-zero dimension guarding
    const width = Math.max(100, (this.container ? this.container.clientWidth : 0) || window.innerWidth);
    const height = Math.max(100, (this.container ? this.container.clientHeight : 0) || window.innerHeight);
    const aspect = width / height;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.camera.position.set(0, 10.0, 16.0);

    // 3. Renderer with shadow maps
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // 4. OrbitControls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02; // Prevent camera from dropping below floor
    this.controls.target.set(0, 2.0, 0);

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight.position.set(12, 22, 14);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 70;
    dirLight.shadow.camera.left = -14;
    dirLight.shadow.camera.right = 14;
    dirLight.shadow.camera.top = 14;
    dirLight.shadow.camera.bottom = -14;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);

    const purpleAccent = new THREE.PointLight(0x6366f1, 2.2, 35);
    purpleAccent.position.set(-10, 6, -10);
    this.scene.add(purpleAccent);

    // 6. Subdivided Floor Pedestal (64x64 vertices for smooth Gaussian crater depressions)
    const floorGeo = new THREE.PlaneGeometry(18, 18, 64, 64);
    floorGeo.rotateX(-Math.PI / 2); // Lay horizontal facing up

    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.85,
      metalness: 0.15,
      flatShading: false
    });
    this.floorMesh = new THREE.Mesh(floorGeo, floorMat);
    this.floorMesh.position.y = 0.0;
    this.floorMesh.receiveShadow = true;
    this.scene.add(this.floorMesh);

    // Visual grid overlay
    const grid = new THREE.GridHelper(18, 18, 0x4f46e5, 0x1e293b);
    grid.position.y = 0.005;
    this.scene.add(grid);

    // Visual pedestal bevel slab underneath
    const baseSlabGeo = new THREE.BoxGeometry(18.4, 1.2, 18.4);
    const baseSlabMat = new THREE.MeshStandardMaterial({ color: 0x070b14, roughness: 0.9 });
    const baseSlab = new THREE.Mesh(baseSlabGeo, baseSlabMat);
    baseSlab.position.y = -0.6;
    this.scene.add(baseSlab);

    // 7. Subsystems initialization
    this.materials = new window.StressMaterialFactory();
    this.physics = new window.PhysicsSimulator(this.RAPIER);
    this.cameraShake = new window.CameraShakeController(this.camera, this.controls);
    this.audio = new window.ProceduralImpactAudio();
    this.impactManager = new window.VisualWeightImpactManager(this.floorMesh, this.cameraShake, this.audio);
    this.physics.setImpactManager(this.impactManager);

    // 8. Event listeners
    window.addEventListener('resize', () => this.onResize());

    // Start render loop
    this.animate();
  }

  onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  dropTasks(tasks, onCubeLandedCallback) {
    if (this.materials && this.materials.clear) {
      this.materials.clear();
    }
    this.impactManager.resetFloor();
    this.physics.dropTasks(tasks, this.scene, this.materials, onCubeLandedCallback);
  }

  clear() {
    this.physics.clear(this.scene);
    this.materials.clear();
    this.impactManager.resetFloor();
    this.cameraShake.reset();
  }

  resetCamera() {
    this.cameraShake.reset();
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000.0);
    this.lastTime = now;

    // 1. Physics Step
    this.physics.step(dt);

    // 2. Animated Shaders (uTime update)
    this.materials.update(dt);

    // 3. Camera Shake Update
    this.cameraShake.update(dt);

    // 4. Controls & Render
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

window.SceneCoordinator = SceneCoordinator;
