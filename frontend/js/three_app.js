/**
 * MoveAssist 3D Virtual Human & Articulated Exoskeleton Digital Twin (Three.js)
 * SIH 2026 | PS SIH26113 | Team: BERSERK TECHIES | Team ID: TEAM-147
 * High-Fidelity Cyber-Medical Digital Twin with Unilateral Telemetry Precision
 */

class MoveAssist3DViewer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.width = this.container.clientWidth || 800;
    this.height = this.container.clientHeight || 480;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;

    // Component tracking
    this.humanGroup = null;
    this.exoGroup = null;
    this.sensorGroup = null;

    // Layer collections
    this.humanMeshes = [];
    this.exoMeshes = [];
    this.sensorMeshes = [];

    // Articulated joint references - Lower Body
    this.pelvis = null;
    this.torsoGroup = null;
    this.headMesh = null;

    // Right Leg (Instrumented side)
    this.rightHip = null;
    this.rightThigh = null;
    this.rightKnee = null;
    this.rightShank = null;
    this.rightAnkle = null;
    this.rightFoot = null;

    // Left Leg (Contralateral Grounded Stance Leg)
    this.leftHip = null;
    this.leftThigh = null;
    this.leftKnee = null;
    this.leftShank = null;
    this.leftAnkle = null;
    this.leftFoot = null;

    // Articulated joint references - Upper Body
    this.rightShoulder = null;
    this.rightUpperArm = null;
    this.rightElbow = null;
    this.rightForearm = null;
    this.rightWrist = null;
    this.rightHand = null;

    this.leftShoulder = null;
    this.leftUpperArm = null;
    this.leftElbow = null;
    this.leftForearm = null;
    this.leftWrist = null;
    this.leftHand = null;

    // Exoskeleton components - Lower Limbs
    this.waistHalo = null;
    this.actuatorCoreMesh = null;
    this.actuatorGlowLight = null;
    this.leftActuatorCoreMesh = null;
    this.leftActuatorGlowLight = null;
    this.thighCuff = null;
    this.shankBrace = null;
    this.footPlate = null;
    this.torqueIndicatorGroup = null;
    this.torqueArcMat = null;
    this.torqueConeMat = null;

    // Exoskeleton components - Spine, Upper Body & Arms
    this.spineExo = null;
    this.backpackUnit = null;
    this.chestHarness = null;
    this.cranialBand = null;
    this.rightShoulderCoreMesh = null;
    this.leftShoulderCoreMesh = null;
    this.rightElbowCoreMesh = null;
    this.leftElbowCoreMesh = null;
    this.rightElbowLight = null;

    // Virtual Sensors (Lower & Upper Body)
    this.fsrHeelMesh = null;
    this.fsrMetaMesh = null;
    this.fsrToeMesh = null;
    this.emgPatchMesh = null;
    this.thighImuMesh = null;
    this.shankImuMesh = null;
    this.armImuMesh = null;
    this.armEmgMesh = null;
    this.spineImuMesh = null;

    // Layer visibility
    this.showExo = true;
    this.showAnatomy = true;
    this.showSensors = true;

    // Custom 3D Model Pipeline (.GLB / .GLTF)
    this.customModel = null;
    this.customBones = {};
    this.hasCustomModel = false;
    this.customModelName = '';

    // Upper-Limb & Lower-Limb Joint Jog States
    this.hipJogAngleDeg = 0.0;
    this.armJogAngleDeg = 0.0;
    this.shoulderJogAngleDeg = 0.0;
    this.ankleJogAngleDeg = 0.0;

    this.init();
  }

  setHipJogAngle(deg) {
    this.hipJogAngleDeg = Math.max(-15.0, Math.min(90.0, parseFloat(deg) || 0.0));
  }

  setArmJogAngle(deg) {
    this.armJogAngleDeg = Math.max(0.0, Math.min(90.0, parseFloat(deg) || 0.0));
  }

  setShoulderJogAngle(deg) {
    this.shoulderJogAngleDeg = Math.max(-45.0, Math.min(110.0, parseFloat(deg) || 0.0));
  }

  setAnkleJogAngle(deg) {
    this.ankleJogAngleDeg = Math.max(-30.0, Math.min(30.0, parseFloat(deg) || 0.0));
  }

  init() {
    // 1. Scene Setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070c18);
    this.scene.fog = new THREE.FogExp2(0x070c18, 0.05);

    // 2. Camera Setup (Elevated 3/4 Perspective matching reference image)
    this.camera = new THREE.PerspectiveCamera(38, this.width / this.height, 0.1, 50.0);
    this.camera.position.set(1.9, 1.35, 2.6);

    // 3. Renderer Setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    // 4. Orbit Controls
    if (typeof THREE.OrbitControls !== 'undefined') {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.06;
      this.controls.target.set(0, 0.88, 0);
      this.controls.maxPolarAngle = Math.PI / 2 + 0.05;
      this.controls.minDistance = 1.0;
      this.controls.maxDistance = 5.5;
    }

    // 5. Studio Lighting
    this.setupLighting();

    // 6. Clinical Platform & Concentric Radar Grid
    this.setupEnvironment();

    // 7. PBR Materials
    this.initMaterials();

    // 8. Build 3D Models
    this.buildVirtualHuman();
    this.buildExoskeleton();
    this.buildSensorMarkers();

    // 9. Custom GLTF Loading & Drag-and-Drop Pipeline
    this.setupGLTFPipeline();

    // Window resize
    window.addEventListener('resize', () => this.onResize());

    // Main render loop
    this.animate();
  }

  setupLighting() {
    const ambient = new THREE.AmbientLight(0x0f172a, 1.0);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(3.2, 5.0, 3.0);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    this.scene.add(keyLight);

    const cyanRim = new THREE.DirectionalLight(0x00d2f0, 1.8);
    cyanRim.position.set(-3.2, 2.8, -2.4);
    this.scene.add(cyanRim);

    const fillLight = new THREE.PointLight(0x60a5fa, 0.6, 10);
    fillLight.position.set(0.5, 2.0, 2.8);
    this.scene.add(fillLight);

    const groundBounce = new THREE.PointLight(0x0284c7, 0.4, 6);
    groundBounce.position.set(0, 0.2, 0);
    this.scene.add(groundBounce);
  }

  setupEnvironment() {
    const floorGeo = new THREE.CircleGeometry(4.2, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x060a14,
      roughness: 0.55,
      metalness: 0.35
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.005;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const grid = new THREE.GridHelper(8, 20, 0x00b4d8, 0x132238);
    grid.position.y = 0.0;
    this.scene.add(grid);

    const ringRadii = [0.8, 1.6, 2.4, 3.2];
    ringRadii.forEach((r, idx) => {
      const ringGeo = new THREE.RingGeometry(r - 0.004, r + 0.004, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: idx === 1 ? 0x00e5ff : 0x0284c7,
        transparent: true,
        opacity: idx === 1 ? 0.65 : 0.35,
        side: THREE.DoubleSide
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.y = 0.001;
      this.scene.add(ringMesh);
    });
  }

  initMaterials() {
    // 1. Translucent Polished Mannequin Aesthetic (Reference Image 1: Clear/Frosted acrylic mannequin)
    this.skinMat = new THREE.MeshPhysicalMaterial({
      color: 0xc4ebf8,
      roughness: 0.18,
      metalness: 0.06,
      transmission: 0.38,
      opacity: 0.90,
      transparent: true,
      clearcoat: 0.85,
      clearcoatRoughness: 0.12,
      ior: 1.44
    });

    this.skinJointMat = new THREE.MeshPhysicalMaterial({
      color: 0x86d8f0,
      roughness: 0.22,
      metalness: 0.12,
      transmission: 0.25,
      opacity: 0.94,
      transparent: true,
      clearcoat: 0.70
    });

    // 2. High-Tech Carbon Composite & Structural Titanium Frame
    this.exoFrameMat = new THREE.MeshStandardMaterial({
      color: 0x121722,
      roughness: 0.26,
      metalness: 0.88
    });

    this.exoMetalMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.18,
      metalness: 0.95
    });

    // 3. Ergonomic Dark Padded Fabric & Webbing Harness (Reference Image 1 & 3)
    this.fabricMat = new THREE.MeshStandardMaterial({
      color: 0x151821,
      roughness: 0.85,
      metalness: 0.10
    });

    // 4. Multi-Conductor Bowden Cable & Wiring Harness (Reference Image 3 C & D)
    this.cablePurpleMat = new THREE.MeshStandardMaterial({
      color: 0x9333ea,
      roughness: 0.24,
      metalness: 0.40
    });

    this.cableBlackMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.35,
      metalness: 0.50
    });

    // 5. Emergency Stop / Power Switch (Reference Image 3 D: Red actuator button on rear unit)
    this.redButtonMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xb91c1c,
      emissiveIntensity: 0.75,
      roughness: 0.18,
      metalness: 0.60
    });

    // 6. Dual-Rotor Stator Copper Electromagnetic Coils (Reference Image 2: Multi-rotor shoulder joint)
    this.copperCoilMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.22,
      metalness: 0.92
    });

    // 7. Padded Bicep Sleeve "Ekso" Emblem Badge (Reference Image 1: Cyan shoulder sleeve badge)
    this.eksoBadgeMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x00e5ff,
      emissiveIntensity: 0.65,
      roughness: 0.25,
      metalness: 0.75
    });

    // 8. Forearm Twist Detection Sensor (Reference Image 2 c(iii): Green/Cyan encoder markings)
    this.twistingRingMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.60,
      roughness: 0.20,
      metalness: 0.80
    });

    // 9. Luminous Electric Cyan Accent Rings & Dynamic Actuator Core
    this.exoCyanRingMat = new THREE.MeshStandardMaterial({
      color: 0x00d8f6,
      emissive: 0x0088aa,
      emissiveIntensity: 0.50,
      roughness: 0.15,
      metalness: 0.85
    });

    this.actuatorCoreMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00e5ff,
      emissiveIntensity: 0.85,
      roughness: 0.22,
      metalness: 0.70
    });

    // 10. Gold Telemetry Contacts & Battery Pack Status LEDs
    this.exoGoldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.25,
      metalness: 0.90
    });

    this.batteryLedMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 0.80,
      roughness: 0.20,
      metalness: 0.50
    });

    // 11. Cranial Visor Cyber-Glass HUD
    this.visorMat = new THREE.MeshStandardMaterial({
      color: 0x00d8f6,
      emissive: 0x006688,
      emissiveIntensity: 0.50,
      roughness: 0.12,
      metalness: 0.85,
      transparent: true,
      opacity: 0.85
    });
  }

  registerHumanMesh(mesh) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.humanMeshes.push(mesh);
    return mesh;
  }

  registerExoMesh(mesh) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.exoMeshes.push(mesh);
    return mesh;
  }

  registerSensorMesh(mesh) {
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    this.sensorMeshes.push(mesh);
    return mesh;
  }


  buildVirtualHuman() {
    this.humanGroup = new THREE.Group();
    this.humanGroup.name = "Human_Anatomy";

    // 1. Pelvis Root Node (Hip center: y = 0.95m)
    this.pelvis = new THREE.Group();
    this.pelvis.position.set(0, 0.95, 0);

    // Anatomical Pelvic Saddle Block
    const pelvisGeo = new THREE.CylinderGeometry(0.125, 0.095, 0.15, 24);
    const pelvisMesh = new THREE.Mesh(pelvisGeo, this.skinJointMat);
    pelvisMesh.position.y = 0.01;
    this.pelvis.add(this.registerHumanMesh(pelvisMesh));

    // Lateral Hip Sockets
    const hipSocketGeo = new THREE.SphereGeometry(0.052, 20, 20);
    const rightSocket = new THREE.Mesh(hipSocketGeo, this.skinJointMat);
    rightSocket.position.set(0.125, -0.03, 0);
    this.pelvis.add(this.registerHumanMesh(rightSocket));

    const leftSocket = new THREE.Mesh(hipSocketGeo, this.skinJointMat);
    leftSocket.position.set(-0.125, -0.03, 0);
    this.pelvis.add(this.registerHumanMesh(leftSocket));

    // 2. Torso & Head (Mannequin aesthetic from reference image)
    this.torsoGroup = new THREE.Group();

    // Abdomen / Lower Torso (tapered column)
    const lowerTorsoGeo = new THREE.CylinderGeometry(0.13, 0.115, 0.16, 24);
    const lowerTorso = new THREE.Mesh(lowerTorsoGeo, this.skinMat);
    lowerTorso.position.y = 0.15;
    this.torsoGroup.add(this.registerHumanMesh(lowerTorso));

    // Chest / Upper Torso (tapered trunk, widening gently to shoulders)
    const upperTorsoGeo = new THREE.CylinderGeometry(0.155, 0.13, 0.28, 28);
    const upperTorso = new THREE.Mesh(upperTorsoGeo, this.skinMat);
    upperTorso.position.y = 0.36;
    this.torsoGroup.add(this.registerHumanMesh(upperTorso));

    // Neck
    const neckGeo = new THREE.CylinderGeometry(0.045, 0.052, 0.08, 20);
    const neckMesh = new THREE.Mesh(neckGeo, this.skinJointMat);
    neckMesh.position.y = 0.53;
    this.torsoGroup.add(this.registerHumanMesh(neckMesh));

    // Ergonomic Cervical Collar Cushion (Reference Picture 1: Padded neck support cushion for overhead rehabilitation)
    const collarGeo = new THREE.CylinderGeometry(0.068, 0.076, 0.065, 24);
    this.cervicalCollar = new THREE.Mesh(collarGeo, this.fabricMat);
    this.cervicalCollar.position.set(0, 0.525, -0.015);
    this.torsoGroup.add(this.registerHumanMesh(this.cervicalCollar));

    // Head (Smooth spherical head from reference image)
    const headGeo = new THREE.SphereGeometry(0.115, 32, 32);
    this.headMesh = new THREE.Mesh(headGeo, this.skinMat);
    this.headMesh.position.y = 0.69;
    this.torsoGroup.add(this.registerHumanMesh(this.headMesh));

    // -----------------------------------------------------------------------
    // Upper Limbs: Bilateral Articulated Arms, Shoulders, Elbows & Hands
    // -----------------------------------------------------------------------
    const clavicleGeo = new THREE.CylinderGeometry(0.020, 0.024, 0.16, 16);
    const shoulderBallGeo = new THREE.SphereGeometry(0.046, 20, 20);
    const upperArmGeo = new THREE.CylinderGeometry(0.040, 0.033, 0.26, 20);
    const elbowBallGeo = new THREE.SphereGeometry(0.034, 20, 20);
    const forearmGeo = new THREE.CylinderGeometry(0.032, 0.026, 0.24, 20);
    const wristBallGeo = new THREE.SphereGeometry(0.024, 16, 16);
    const palmGeo = new THREE.BoxGeometry(0.024, 0.065, 0.048);
    const fingerGeo = new THREE.CylinderGeometry(0.006, 0.005, 0.036, 12);
    const thumbGeo = new THREE.CylinderGeometry(0.007, 0.006, 0.032, 12);

    // Right Arm (Instrumented Limb - Positioned laterally x=0.235 for clean waist-halo clearance)
    this.rightShoulder = new THREE.Group();
    this.rightShoulder.position.set(0.235, 0.44, 0);

    const rightClavicle = new THREE.Mesh(clavicleGeo, this.skinMat);
    rightClavicle.rotation.z = -Math.PI / 2;
    rightClavicle.position.set(-0.08, 0, 0);
    this.rightShoulder.add(this.registerHumanMesh(rightClavicle));

    const rightShoulderBall = new THREE.Mesh(shoulderBallGeo, this.skinJointMat);
    this.rightShoulder.add(this.registerHumanMesh(rightShoulderBall));

    this.rightUpperArm = new THREE.Group();
    const rightUpperArmMesh = new THREE.Mesh(upperArmGeo, this.skinMat);
    rightUpperArmMesh.position.y = -0.13;
    this.rightUpperArm.add(this.registerHumanMesh(rightUpperArmMesh));
    this.rightShoulder.add(this.rightUpperArm);

    this.rightElbow = new THREE.Group();
    this.rightElbow.position.set(0, -0.26, 0);
    const rightElbowBall = new THREE.Mesh(elbowBallGeo, this.skinJointMat);
    this.rightElbow.add(this.registerHumanMesh(rightElbowBall));
    this.rightUpperArm.add(this.rightElbow);

    this.rightForearm = new THREE.Group();
    const rightForearmMesh = new THREE.Mesh(forearmGeo, this.skinMat);
    rightForearmMesh.position.y = -0.12;
    this.rightForearm.add(this.registerHumanMesh(rightForearmMesh));
    this.rightElbow.add(this.rightForearm);

    this.rightWrist = new THREE.Group();
    this.rightWrist.position.set(0, -0.24, 0);
    const rightWristBall = new THREE.Mesh(wristBallGeo, this.skinJointMat);
    this.rightWrist.add(this.registerHumanMesh(rightWristBall));

    // Right Hand (Natural mid-pronation: palm facing inward toward thigh, thumb pointing forward)
    this.rightHand = new THREE.Group();
    const rightPalm = new THREE.Mesh(palmGeo, this.skinJointMat);
    rightPalm.position.set(0, -0.034, 0);
    this.rightHand.add(this.registerHumanMesh(rightPalm));

    // Relaxed fingers (4 digits aligned along Z, curling gently forward/inward)
    for (let f = 0; f < 4; f++) {
      const fingerMesh = new THREE.Mesh(fingerGeo, this.skinMat);
      fingerMesh.position.set(0, -0.062, 0.016 - f * 0.011);
      fingerMesh.rotation.x = -0.18; // anatomical resting curl
      this.rightHand.add(this.registerHumanMesh(fingerMesh));
    }
    // Thumb: Anterior (+Z), oriented forward and slightly medially
    const rightThumbMesh = new THREE.Mesh(thumbGeo, this.skinMat);
    rightThumbMesh.rotation.x = -Math.PI / 4;
    rightThumbMesh.rotation.z = -Math.PI / 6;
    rightThumbMesh.position.set(-0.010, -0.030, 0.022);
    this.rightHand.add(this.registerHumanMesh(rightThumbMesh));

    this.rightWrist.add(this.rightHand);
    this.rightForearm.add(this.rightWrist);
    this.torsoGroup.add(this.rightShoulder);

    // Left Arm (Contralateral Symmetrical Match - Positioned laterally x=-0.235)
    this.leftShoulder = new THREE.Group();
    this.leftShoulder.position.set(-0.235, 0.44, 0);

    const leftClavicle = new THREE.Mesh(clavicleGeo, this.skinMat);
    leftClavicle.rotation.z = Math.PI / 2;
    leftClavicle.position.set(0.08, 0, 0);
    this.leftShoulder.add(this.registerHumanMesh(leftClavicle));

    const leftShoulderBall = new THREE.Mesh(shoulderBallGeo, this.skinJointMat);
    this.leftShoulder.add(this.registerHumanMesh(leftShoulderBall));

    this.leftUpperArm = new THREE.Group();
    const leftUpperArmMesh = new THREE.Mesh(upperArmGeo, this.skinMat);
    leftUpperArmMesh.position.y = -0.13;
    this.leftUpperArm.add(this.registerHumanMesh(leftUpperArmMesh));
    this.leftShoulder.add(this.leftUpperArm);

    this.leftElbow = new THREE.Group();
    this.leftElbow.position.set(0, -0.26, 0);
    const leftElbowBall = new THREE.Mesh(elbowBallGeo, this.skinJointMat);
    this.leftElbow.add(this.registerHumanMesh(leftElbowBall));
    this.leftUpperArm.add(this.leftElbow);

    this.leftForearm = new THREE.Group();
    const leftForearmMesh = new THREE.Mesh(forearmGeo, this.skinMat);
    leftForearmMesh.position.y = -0.12;
    this.leftForearm.add(this.registerHumanMesh(leftForearmMesh));
    this.leftElbow.add(this.leftForearm);

    this.leftWrist = new THREE.Group();
    this.leftWrist.position.set(0, -0.24, 0);
    const leftWristBall = new THREE.Mesh(wristBallGeo, this.skinJointMat);
    this.leftWrist.add(this.registerHumanMesh(leftWristBall));

    // Left Hand (Mid-pronation)
    this.leftHand = new THREE.Group();
    const leftPalm = new THREE.Mesh(palmGeo, this.skinJointMat);
    leftPalm.position.set(0, -0.034, 0);
    this.leftHand.add(this.registerHumanMesh(leftPalm));

    for (let f = 0; f < 4; f++) {
      const fingerMesh = new THREE.Mesh(fingerGeo, this.skinMat);
      fingerMesh.position.set(0, -0.062, 0.016 - f * 0.011);
      fingerMesh.rotation.x = -0.18;
      this.leftHand.add(this.registerHumanMesh(fingerMesh));
    }
    const leftThumbMesh = new THREE.Mesh(thumbGeo, this.skinMat);
    leftThumbMesh.rotation.x = -Math.PI / 4;
    leftThumbMesh.rotation.z = Math.PI / 6;
    leftThumbMesh.position.set(0.010, -0.030, 0.022);
    this.leftHand.add(this.registerHumanMesh(leftThumbMesh));

    this.leftWrist.add(this.leftHand);
    this.leftForearm.add(this.leftWrist);
    this.torsoGroup.add(this.leftShoulder);

    this.pelvis.add(this.torsoGroup);

    // 3. Right Leg (Instrumented Exoskeleton Limb)
    this.rightHip = new THREE.Group();
    this.rightHip.position.set(0.125, -0.04, 0);

    this.rightThigh = new THREE.Group();
    const thighGeo = new THREE.CylinderGeometry(0.062, 0.050, 0.42, 24);
    const rightThighMesh = new THREE.Mesh(thighGeo, this.skinMat);
    rightThighMesh.position.y = -0.21;
    this.rightThigh.add(this.registerHumanMesh(rightThighMesh));
    this.rightHip.add(this.rightThigh);

    this.rightKnee = new THREE.Group();
    this.rightKnee.position.set(0, -0.42, 0);
    const kneeJointMesh = new THREE.Mesh(new THREE.SphereGeometry(0.046, 24, 24), this.skinJointMat);
    this.rightKnee.add(this.registerHumanMesh(kneeJointMesh));
    this.rightThigh.add(this.rightKnee);

    this.rightShank = new THREE.Group();
    const shankGeo = new THREE.CylinderGeometry(0.048, 0.038, 0.42, 24);
    const rightShankMesh = new THREE.Mesh(shankGeo, this.skinMat);
    rightShankMesh.position.y = -0.21;
    this.rightShank.add(this.registerHumanMesh(rightShankMesh));
    this.rightKnee.add(this.rightShank);

    this.rightAnkle = new THREE.Group();
    this.rightAnkle.position.set(0, -0.42, 0);
    const rightAnkleMesh = new THREE.Mesh(new THREE.SphereGeometry(0.036, 20, 20), this.skinJointMat);
    this.rightAnkle.add(this.registerHumanMesh(rightAnkleMesh));

    this.rightFoot = new THREE.Group();
    const footGeo = new THREE.BoxGeometry(0.082, 0.046, 0.22);
    const rightFootMesh = new THREE.Mesh(footGeo, this.skinJointMat);
    rightFootMesh.position.set(0, -0.024, 0.06);
    this.rightFoot.add(this.registerHumanMesh(rightFootMesh));
    this.rightAnkle.add(this.rightFoot);
    this.rightShank.add(this.rightAnkle);

    // 4. Left Leg (Contralateral Grounded Stance Leg)
    this.leftHip = new THREE.Group();
    this.leftHip.position.set(-0.125, -0.04, 0);

    this.leftThigh = new THREE.Group();
    const leftThighMesh = new THREE.Mesh(thighGeo, this.skinMat);
    leftThighMesh.position.y = -0.21;
    this.leftThigh.add(this.registerHumanMesh(leftThighMesh));
    this.leftHip.add(this.leftThigh);

    this.leftKnee = new THREE.Group();
    this.leftKnee.position.set(0, -0.42, 0);
    const leftKneeJointMesh = new THREE.Mesh(new THREE.SphereGeometry(0.046, 24, 24), this.skinJointMat);
    this.leftKnee.add(this.registerHumanMesh(leftKneeJointMesh));
    this.leftThigh.add(this.leftKnee);

    this.leftShank = new THREE.Group();
    const leftShankMesh = new THREE.Mesh(shankGeo, this.skinMat);
    leftShankMesh.position.y = -0.21;
    this.leftShank.add(this.registerHumanMesh(leftShankMesh));
    this.leftKnee.add(this.leftShank);

    this.leftAnkle = new THREE.Group();
    this.leftAnkle.position.set(0, -0.42, 0);
    const leftAnkleMesh = new THREE.Mesh(new THREE.SphereGeometry(0.036, 20, 20), this.skinJointMat);
    this.leftAnkle.add(this.registerHumanMesh(leftAnkleMesh));

    this.leftFoot = new THREE.Group();
    const leftFootMesh = new THREE.Mesh(footGeo, this.skinJointMat);
    leftFootMesh.position.set(0, -0.024, 0.06);
    this.leftFoot.add(this.registerHumanMesh(leftFootMesh));
    this.leftAnkle.add(this.leftFoot);
    this.leftShank.add(this.leftAnkle);

    // Ground the left leg firmly into realistic upright stance
    this.leftHip.rotation.x = 0;
    this.leftKnee.rotation.x = THREE.MathUtils.degToRad(8.0);
    this.leftAnkle.rotation.x = -THREE.MathUtils.degToRad(8.0);

    this.pelvis.add(this.rightHip);
    this.pelvis.add(this.leftHip);
    this.humanGroup.add(this.pelvis);
    this.scene.add(this.humanGroup);
  }

  buildExoskeleton() {
    this.exoGroup = new THREE.Group();
    this.exoGroup.name = "Mechanical_Exoskeleton";

    // =========================================================================
    // 1. Pelvic Harness & Bilateral Hip Rotary BLDC Actuators
    // =========================================================================
    this.waistHalo = new THREE.Group();
    this.waistHalo.position.set(0, 0.04, 0);

    // Circumferential titanium/cyan halo ring encircling pelvis
    const haloTorusGeo = new THREE.TorusGeometry(0.195, 0.016, 18, 48);
    const haloTorus = new THREE.Mesh(haloTorusGeo, this.exoCyanRingMat);
    haloTorus.rotation.x = Math.PI / 2;
    this.waistHalo.add(this.registerExoMesh(haloTorus));

    // Ergonomic Padded Lumbar Waistband & Quick-Release Buckle (Reference Image 1 & 3 D)
    const lumbarBeltGeo = new THREE.TorusGeometry(0.185, 0.022, 16, 40);
    const lumbarBelt = new THREE.Mesh(lumbarBeltGeo, this.fabricMat);
    lumbarBelt.rotation.x = Math.PI / 2;
    this.waistHalo.add(this.registerExoMesh(lumbarBelt));

    const waistBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.038, 0.020), this.exoMetalMat);
    waistBuckle.position.set(0, 0, 0.198);
    this.waistHalo.add(this.registerExoMesh(waistBuckle));

    // Lumbar dorsal foundation block
    const lumbarGeo = new THREE.BoxGeometry(0.10, 0.18, 0.028);
    const lumbarMesh = new THREE.Mesh(lumbarGeo, this.exoFrameMat);
    lumbarMesh.position.set(0, 0.09, -0.19);
    this.waistHalo.add(this.registerExoMesh(lumbarMesh));

    // Right Hip Rotary Actuator Pod
    const hipActuatorGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.035, 24);
    const rightHipActuator = new THREE.Mesh(hipActuatorGeo, this.exoFrameMat);
    rightHipActuator.rotation.z = Math.PI / 2;
    rightHipActuator.position.set(0.195, -0.02, 0);
    this.waistHalo.add(this.registerExoMesh(rightHipActuator));

    const rightHipRing = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.005, 14, 28), this.exoCyanRingMat);
    rightHipRing.rotation.y = Math.PI / 2;
    rightHipRing.position.set(0.215, -0.02, 0);
    this.waistHalo.add(this.registerExoMesh(rightHipRing));

    // Left Hip Rotary Actuator Pod
    const leftHipActuator = new THREE.Mesh(hipActuatorGeo, this.exoFrameMat);
    leftHipActuator.rotation.z = Math.PI / 2;
    leftHipActuator.position.set(-0.195, -0.02, 0);
    this.waistHalo.add(this.registerExoMesh(leftHipActuator));

    const leftHipRing = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.005, 14, 28), this.exoCyanRingMat);
    leftHipRing.rotation.y = Math.PI / 2;
    leftHipRing.position.set(-0.215, -0.02, 0);
    this.waistHalo.add(this.registerExoMesh(leftHipRing));

    this.pelvis.add(this.waistHalo);

    // =========================================================================
    // 2. Articulated Dorsal Vertebral Spine Column Exoskeleton
    // =========================================================================
    this.spineExo = new THREE.Group();

    // Dual vertical titanium load-bearing rails running along the spine
    const spineRailGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.44, 16);
    const rightSpineRail = new THREE.Mesh(spineRailGeo, this.exoMetalMat);
    rightSpineRail.position.set(0.032, 0.28, -0.155);
    this.spineExo.add(this.registerExoMesh(rightSpineRail));

    const leftSpineRail = new THREE.Mesh(spineRailGeo, this.exoMetalMat);
    leftSpineRail.position.set(-0.032, 0.28, -0.155);
    this.spineExo.add(this.registerExoMesh(leftSpineRail));

    // 5 Segmented titanium vertebrae blocks along midline
    const vertYOffsets = [0.10, 0.18, 0.26, 0.35, 0.44];
    vertYOffsets.forEach((yPos, idx) => {
      const vertWidth = 0.075 - idx * 0.004;
      const vertMesh = new THREE.Mesh(new THREE.BoxGeometry(vertWidth, 0.045, 0.022), this.exoFrameMat);
      vertMesh.position.set(0, yPos, -0.160);
      this.spineExo.add(this.registerExoMesh(vertMesh));

      // Luminous cyan spinal telemetry node in center of each vertebra
      const dotMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.024, 12), this.exoCyanRingMat);
      dotMesh.rotation.x = Math.PI / 2;
      dotMesh.position.set(0, yPos, -0.162);
      this.spineExo.add(this.registerExoMesh(dotMesh));

      // Lateral rib cage exoskeleton harness bands connecting to rails
      if (idx === 1 || idx === 3) {
        const ribBand = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.006, 12, 32, Math.PI * 0.9), this.exoFrameMat);
        ribBand.rotation.x = Math.PI / 2;
        ribBand.rotation.z = Math.PI * 0.55;
        ribBand.position.set(0, yPos, 0);
        this.spineExo.add(this.registerExoMesh(ribBand));
      }
    });

    this.torsoGroup.add(this.spineExo);

    // =========================================================================
    // 3. Rear Battery & Telemetry Backpack Unit
    // =========================================================================
    this.backpackUnit = new THREE.Group();
    this.backpackUnit.position.set(0, 0.27, -0.185);

    // Beveled main battery enclosure
    const packBody = new THREE.Mesh(new THREE.BoxGeometry(0.175, 0.23, 0.070), this.exoFrameMat);
    this.backpackUnit.add(this.registerExoMesh(packBody));

    // Outer reinforced bezel frame
    const packBezel = new THREE.Mesh(new THREE.BoxGeometry(0.185, 0.24, 0.020), this.exoMetalMat);
    packBezel.position.set(0, 0, -0.030);
    this.backpackUnit.add(this.registerExoMesh(packBezel));

    // Dual active micro-cooling intake fans with concentric cyan rim rings
    const fanGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.008, 20);
    const leftFan = new THREE.Mesh(fanGeo, this.exoFrameMat);
    leftFan.rotation.x = Math.PI / 2;
    leftFan.position.set(-0.046, 0.04, -0.038);
    this.backpackUnit.add(this.registerExoMesh(leftFan));

    const leftFanRing = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.0035, 12, 24), this.exoCyanRingMat);
    leftFanRing.position.set(-0.046, 0.04, -0.043);
    this.backpackUnit.add(this.registerExoMesh(leftFanRing));

    const rightFan = new THREE.Mesh(fanGeo, this.exoFrameMat);
    rightFan.rotation.x = Math.PI / 2;
    rightFan.position.set(0.046, 0.04, -0.038);
    this.backpackUnit.add(this.registerExoMesh(rightFan));

    const rightFanRing = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.0035, 12, 24), this.exoCyanRingMat);
    rightFanRing.position.set(0.046, 0.04, -0.043);
    this.backpackUnit.add(this.registerExoMesh(rightFanRing));

    // 5 Segmented Illuminated Battery Level Bar Indicators
    for (let b = 0; b < 5; b++) {
      const barMesh = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.005, 0.006), this.batteryLedMat);
      barMesh.position.set(-0.036 + b * 0.018, -0.065, -0.038);
      this.backpackUnit.add(this.registerExoMesh(barMesh));
    }

    // Prominent Red Emergency Stop Button with Silver Metallic Bezel (Reference Image 3 D)
    const eStopPod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.014, 20), this.exoFrameMat);
    eStopPod.rotation.x = Math.PI / 2;
    eStopPod.position.set(0.052, -0.062, -0.038);
    this.backpackUnit.add(this.registerExoMesh(eStopPod));

    const eStopBezel = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.0028, 12, 24), this.exoMetalMat);
    eStopBezel.position.set(0.052, -0.062, -0.044);
    this.backpackUnit.add(this.registerExoMesh(eStopBezel));

    const eStopBtnMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.016, 20), this.redButtonMat);
    eStopBtnMesh.rotation.x = Math.PI / 2;
    eStopBtnMesh.position.set(0.052, -0.062, -0.045);
    this.backpackUnit.add(this.registerExoMesh(eStopBtnMesh));

    // Top Telemetry Antenna & Beacon Node
    const antBase = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.010, 0.025, 12), this.exoMetalMat);
    antBase.position.set(0.065, 0.125, -0.020);
    this.backpackUnit.add(this.registerExoMesh(antBase));

    const antTip = new THREE.Mesh(new THREE.SphereGeometry(0.007, 12, 12), this.exoCyanRingMat);
    antTip.position.set(0.065, 0.142, -0.020);
    this.backpackUnit.add(this.registerExoMesh(antTip));

    this.torsoGroup.add(this.backpackUnit);

    // =========================================================================
    // 4. Thoracic Chest Armor & Shoulder Yoke Harness
    // =========================================================================
    this.chestHarness = new THREE.Group();
    this.chestHarness.position.set(0, 0.36, 0.145);

    // Anatomical Pectoral Chest Plate
    const chestPlateGeo = new THREE.BoxGeometry(0.185, 0.160, 0.024);
    const chestPlate = new THREE.Mesh(chestPlateGeo, this.exoFrameMat);
    this.chestHarness.add(this.registerExoMesh(chestPlate));

    // Central MoveAssist SIH 2026 glowing telemetry badge
    const badgeGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.012, 6);
    const badgeMesh = new THREE.Mesh(badgeGeo, this.exoFrameMat);
    badgeMesh.rotation.x = Math.PI / 2;
    badgeMesh.position.set(0, 0.012, 0.012);
    this.chestHarness.add(this.registerExoMesh(badgeMesh));

    const badgeRing = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.004, 12, 24), this.exoCyanRingMat);
    badgeRing.position.set(0, 0.012, 0.018);
    this.chestHarness.add(this.registerExoMesh(badgeRing));

    // Clavicular load-bearing arches reaching from chest over shoulders to the spine
    const yokeArchGeo = new THREE.TorusGeometry(0.115, 0.009, 12, 32, Math.PI * 0.7);
    const rightYoke = new THREE.Mesh(yokeArchGeo, this.exoFrameMat);
    rightYoke.rotation.y = Math.PI / 2;
    rightYoke.rotation.z = Math.PI * 0.15;
    rightYoke.position.set(0.14, 0.06, -0.145);
    this.chestHarness.add(this.registerExoMesh(rightYoke));

    const leftYoke = new THREE.Mesh(yokeArchGeo, this.exoFrameMat);
    leftYoke.rotation.y = -Math.PI / 2;
    leftYoke.rotation.z = Math.PI * 0.15;
    leftYoke.position.set(-0.14, 0.06, -0.145);
    this.chestHarness.add(this.registerExoMesh(leftYoke));

    this.torsoGroup.add(this.chestHarness);

    // =========================================================================
    // 5. Cranial Neuro-Telemetry Headband & Visor HUD
    // =========================================================================
    this.cranialBand = new THREE.Group();
    this.cranialBand.position.set(0, 0.03, 0);

    // Titanium Brow Halo Band
    const browBandGeo = new THREE.TorusGeometry(0.120, 0.009, 14, 40);
    const browBand = new THREE.Mesh(browBandGeo, this.exoFrameMat);
    browBand.rotation.x = Math.PI / 2;
    this.cranialBand.add(this.registerExoMesh(browBand));

    // Frontal Neuro-Telemetry Sensor Node
    const frontVisorPod = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.024, 0.018), this.exoFrameMat);
    frontVisorPod.position.set(0, 0, 0.122);
    this.cranialBand.add(this.registerExoMesh(frontVisorPod));

    const visorLens = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.014, 0.008), this.visorMat);
    visorLens.position.set(0, 0, 0.131);
    this.cranialBand.add(this.registerExoMesh(visorLens));

    // Bilateral Temple Nodes with Cyan Accent Rings
    const templeNodeGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.012, 16);
    const rightTemple = new THREE.Mesh(templeNodeGeo, this.exoCyanRingMat);
    rightTemple.rotation.z = Math.PI / 2;
    rightTemple.position.set(0.122, 0, 0);
    this.cranialBand.add(this.registerExoMesh(rightTemple));

    const leftTemple = new THREE.Mesh(templeNodeGeo, this.exoCyanRingMat);
    leftTemple.rotation.z = Math.PI / 2;
    leftTemple.position.set(-0.122, 0, 0);
    this.cranialBand.add(this.registerExoMesh(leftTemple));

    this.headMesh.add(this.cranialBand);

    // =========================================================================
    // 6. Bilateral Arm & Shoulder Exoskeleton Assemblies
    // =========================================================================
    // --- Right Arm Exoskeleton ---
    // 2-DOF Dual-Rotor Shoulder Actuator Assembly (Reference Image 2 c(ii))
    // Stator 1 (Flexion/Extension): Sagittal axis rotor pod
    const shoulderActGeo = new THREE.CylinderGeometry(0.046, 0.046, 0.034, 24);
    const rightShoulderAct = new THREE.Mesh(shoulderActGeo, this.exoFrameMat);
    rightShoulderAct.rotation.z = Math.PI / 2;
    rightShoulderAct.position.set(0.044, 0, 0);
    this.rightShoulder.add(this.registerExoMesh(rightShoulderAct));

    const rightShoulderRing = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.0055, 14, 28), this.exoCyanRingMat);
    rightShoulderRing.rotation.y = Math.PI / 2;
    rightShoulderRing.position.set(0.062, 0, 0);
    this.rightShoulder.add(this.registerExoMesh(rightShoulderRing));

    this.rightShoulderCoreMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.036, 18), this.actuatorCoreMat.clone());
    this.rightShoulderCoreMesh.rotation.z = Math.PI / 2;
    this.rightShoulderCoreMesh.position.set(0.046, 0, 0);
    this.rightShoulder.add(this.registerExoMesh(this.rightShoulderCoreMesh));

    // Stator 2 (Abduction/Adduction): Orthogonal rotor with visible copper coils (Reference Image 2 c(ii))
    const rightRotor2 = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.022, 20), this.exoFrameMat);
    rightRotor2.rotation.x = Math.PI / 2;
    rightRotor2.position.set(0.038, 0.032, -0.028);
    this.rightShoulder.add(this.registerExoMesh(rightRotor2));

    // Exposed stator copper coils
    for (let c = 0; c < 6; c++) {
      const angle = (c / 6.0) * Math.PI * 2;
      const coilMesh = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.008, 0.018), this.copperCoilMat);
      coilMesh.position.set(0.038 + 0.022 * Math.cos(angle), 0.032 + 0.022 * Math.sin(angle), -0.028);
      coilMesh.rotation.z = angle;
      this.rightShoulder.add(this.registerExoMesh(coilMesh));
    }

    // Acromion deltoid protective armor cowling shell (Reference Image 1)
    const deltoidCowling = new THREE.Mesh(new THREE.SphereGeometry(0.058, 16, 16, 0, Math.PI), this.exoFrameMat);
    deltoidCowling.rotation.x = -Math.PI / 2;
    deltoidCowling.position.set(0.015, 0.018, 0);
    this.rightShoulder.add(this.registerExoMesh(deltoidCowling));

    // Right Upper Arm Carbon-Fiber Strut
    const rightArmStrut = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.25, 0.026), this.exoFrameMat);
    rightArmStrut.position.set(0.050, -0.13, 0);
    this.rightUpperArm.add(this.registerExoMesh(rightArmStrut));

    // Padded Bicep Ergonomic Fabric Wrap & Cyan Emblem Badge (Reference Image 1)
    const bicepWrapGeo = new THREE.CylinderGeometry(0.046, 0.044, 0.095, 24);
    const rightBicepWrap = new THREE.Mesh(bicepWrapGeo, this.fabricMat);
    rightBicepWrap.position.set(0, -0.12, 0);
    this.rightUpperArm.add(this.registerExoMesh(rightBicepWrap));

    // Raised Cyan "MoveAssist/Ekso" Rehabilitation Emblem Badge
    const bicepBadgeGeo = new THREE.BoxGeometry(0.026, 0.044, 0.008);
    const rightBicepBadge = new THREE.Mesh(bicepBadgeGeo, this.eksoBadgeMat);
    rightBicepBadge.position.set(0.044, -0.12, 0.022);
    rightBicepBadge.rotation.y = Math.PI / 4;
    this.rightUpperArm.add(this.registerExoMesh(rightBicepBadge));

    const rightBicepCuffUpper = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.007, 14, 28), this.exoCyanRingMat);
    rightBicepCuffUpper.rotation.x = Math.PI / 2;
    rightBicepCuffUpper.position.set(0, -0.06, 0);
    this.rightUpperArm.add(this.registerExoMesh(rightBicepCuffUpper));

    const rightBicepCuffLower = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.007, 14, 28), this.exoCyanRingMat);
    rightBicepCuffLower.rotation.x = Math.PI / 2;
    rightBicepCuffLower.position.set(0, -0.20, 0);
    this.rightUpperArm.add(this.registerExoMesh(rightBicepCuffLower));

    // Right Powered Rotary Elbow BLDC Actuator
    const elbowActGeo = new THREE.CylinderGeometry(0.040, 0.040, 0.026, 24);
    const rightElbowAct = new THREE.Mesh(elbowActGeo, this.exoFrameMat);
    rightElbowAct.rotation.z = Math.PI / 2;
    rightElbowAct.position.set(0.048, 0, 0);
    this.rightElbow.add(this.registerExoMesh(rightElbowAct));

    const rightElbowRing = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.005, 14, 28), this.exoCyanRingMat);
    rightElbowRing.rotation.y = Math.PI / 2;
    rightElbowRing.position.set(0.062, 0, 0);
    this.rightElbow.add(this.registerExoMesh(rightElbowRing));

    this.rightElbowCoreMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.028, 18), this.actuatorCoreMat.clone());
    this.rightElbowCoreMesh.rotation.z = Math.PI / 2;
    this.rightElbowCoreMesh.position.set(0.050, 0, 0);
    this.rightElbow.add(this.registerExoMesh(this.rightElbowCoreMesh));

    this.rightElbowLight = new THREE.PointLight(0x00e5ff, 1.0, 0.8);
    this.rightElbowLight.position.set(0.075, 0, 0);
    this.rightElbow.add(this.rightElbowLight);

    // Right Forearm Telescopic Struts & Wrist Orthosis
    const rightForearmStrut = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.23, 0.022), this.exoFrameMat);
    rightForearmStrut.position.set(0.044, -0.115, 0);
    this.rightForearm.add(this.registerExoMesh(rightForearmStrut));

    // Forearm Twisting Detection Optical Sensor Ring (Reference Image 2 c(iii))
    const twistRingOuter = new THREE.Mesh(new THREE.TorusGeometry(0.040, 0.006, 14, 28), this.twistingRingMat);
    twistRingOuter.rotation.x = Math.PI / 2;
    twistRingOuter.position.set(0, -0.11, 0);
    this.rightForearm.add(this.registerExoMesh(twistRingOuter));

    const twistRingRotor = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.018, 20), this.exoFrameMat);
    twistRingRotor.position.set(0, -0.11, 0);
    this.rightForearm.add(this.registerExoMesh(twistRingRotor));

    const rightWristRing = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.005, 12, 24), this.exoCyanRingMat);
    rightWristRing.rotation.x = Math.PI / 2;
    rightWristRing.position.set(0, -0.22, 0);
    this.rightForearm.add(this.registerExoMesh(rightWristRing));

    // Right Motorized Hand Power Glove with Dorsal Linear Slide Sensor (Reference Image 2 c(iv))
    const rightGlovePlate = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.055, 0.044), this.exoFrameMat);
    rightGlovePlate.position.set(0.015, -0.032, 0);
    this.rightHand.add(this.registerExoMesh(rightGlovePlate));

    // Linear motion detection slider track (Reference Image 2 c(iv))
    const slideTrack = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.040, 0.010), this.exoMetalMat);
    slideTrack.position.set(0.020, -0.032, 0);
    this.rightHand.add(this.registerExoMesh(slideTrack));

    const slideCarriage = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.012, 0.012), this.exoGoldMat);
    slideCarriage.position.set(0.022, -0.030, 0);
    this.rightHand.add(this.registerExoMesh(slideCarriage));

    // Exoskeletal finger linkage rods (lateral along fingers)
    const linkRodGeo = new THREE.CylinderGeometry(0.0025, 0.0025, 0.038, 8);
    for (let f = 0; f < 4; f++) {
      const rod = new THREE.Mesh(linkRodGeo, this.exoMetalMat);
      rod.position.set(0.014, -0.060, 0.016 - f * 0.011);
      rod.rotation.x = -0.18;
      this.rightHand.add(this.registerExoMesh(rod));
    }

    // --- Left Arm Exoskeleton (Contralateral Symmetrical Match) ---
    // Left 2-DOF Dual-Rotor Shoulder Actuator Pod (Reference Image 2 c(ii))
    const leftShoulderAct = new THREE.Mesh(shoulderActGeo, this.exoFrameMat);
    leftShoulderAct.rotation.z = -Math.PI / 2;
    leftShoulderAct.position.set(-0.044, 0, 0);
    this.leftShoulder.add(this.registerExoMesh(leftShoulderAct));

    const leftShoulderRing = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.0055, 14, 28), this.exoCyanRingMat);
    leftShoulderRing.rotation.y = -Math.PI / 2;
    leftShoulderRing.position.set(-0.062, 0, 0);
    this.leftShoulder.add(this.registerExoMesh(leftShoulderRing));

    this.leftShoulderCoreMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.036, 18), this.actuatorCoreMat.clone());
    this.leftShoulderCoreMesh.rotation.z = -Math.PI / 2;
    this.leftShoulderCoreMesh.position.set(-0.046, 0, 0);
    this.leftShoulder.add(this.registerExoMesh(this.leftShoulderCoreMesh));

    // Stator 2 (Abduction/Adduction): Orthogonal rotor with copper coils
    const leftRotor2 = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.022, 20), this.exoFrameMat);
    leftRotor2.rotation.x = Math.PI / 2;
    leftRotor2.position.set(-0.038, 0.032, -0.028);
    this.leftShoulder.add(this.registerExoMesh(leftRotor2));

    for (let c = 0; c < 6; c++) {
      const angle = (c / 6.0) * Math.PI * 2;
      const coilMesh = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.008, 0.018), this.copperCoilMat);
      coilMesh.position.set(-0.038 - 0.022 * Math.cos(angle), 0.032 + 0.022 * Math.sin(angle), -0.028);
      coilMesh.rotation.z = angle;
      this.leftShoulder.add(this.registerExoMesh(coilMesh));
    }

    const leftDeltoidCowling = new THREE.Mesh(new THREE.SphereGeometry(0.058, 16, 16, 0, Math.PI), this.exoFrameMat);
    leftDeltoidCowling.rotation.x = -Math.PI / 2;
    leftDeltoidCowling.position.set(-0.015, 0.018, 0);
    this.leftShoulder.add(this.registerExoMesh(leftDeltoidCowling));

    // Left Upper Arm Carbon-Fiber Strut
    const leftArmStrut = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.25, 0.026), this.exoFrameMat);
    leftArmStrut.position.set(-0.050, -0.13, 0);
    this.leftUpperArm.add(this.registerExoMesh(leftArmStrut));

    // Left Padded Bicep Wrap & Cyan Badge
    const leftBicepWrap = new THREE.Mesh(bicepWrapGeo, this.fabricMat);
    leftBicepWrap.position.set(0, -0.12, 0);
    this.leftUpperArm.add(this.registerExoMesh(leftBicepWrap));

    const leftBicepBadge = new THREE.Mesh(bicepBadgeGeo, this.eksoBadgeMat);
    leftBicepBadge.position.set(-0.044, -0.12, 0.022);
    leftBicepBadge.rotation.y = -Math.PI / 4;
    this.leftUpperArm.add(this.registerExoMesh(leftBicepBadge));

    const leftBicepCuffUpper = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.007, 14, 28), this.exoCyanRingMat);
    leftBicepCuffUpper.rotation.x = Math.PI / 2;
    leftBicepCuffUpper.position.set(0, -0.06, 0);
    this.leftUpperArm.add(this.registerExoMesh(leftBicepCuffUpper));

    const leftBicepCuffLower = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.007, 14, 28), this.exoCyanRingMat);
    leftBicepCuffLower.rotation.x = Math.PI / 2;
    leftBicepCuffLower.position.set(0, -0.20, 0);
    this.leftUpperArm.add(this.registerExoMesh(leftBicepCuffLower));

    // Left Powered Rotary Elbow BLDC Actuator
    const leftElbowAct = new THREE.Mesh(elbowActGeo, this.exoFrameMat);
    leftElbowAct.rotation.z = -Math.PI / 2;
    leftElbowAct.position.set(-0.048, 0, 0);
    this.leftElbow.add(this.registerExoMesh(leftElbowAct));

    const leftElbowRing = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.005, 14, 28), this.exoCyanRingMat);
    leftElbowRing.rotation.y = -Math.PI / 2;
    leftElbowRing.position.set(-0.062, 0, 0);
    this.leftElbow.add(this.registerExoMesh(leftElbowRing));

    this.leftElbowCoreMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.028, 18), this.actuatorCoreMat.clone());
    this.leftElbowCoreMesh.rotation.z = -Math.PI / 2;
    this.leftElbowCoreMesh.position.set(-0.050, 0, 0);
    this.leftElbow.add(this.registerExoMesh(this.leftElbowCoreMesh));

    // Left Forearm Telescopic Struts & Wrist Orthosis
    const leftForearmStrut = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.23, 0.022), this.exoFrameMat);
    leftForearmStrut.position.set(-0.044, -0.115, 0);
    this.leftForearm.add(this.registerExoMesh(leftForearmStrut));

    // Forearm Twisting Detection Optical Sensor Ring
    const leftTwistRingOuter = new THREE.Mesh(new THREE.TorusGeometry(0.040, 0.006, 14, 28), this.twistingRingMat);
    leftTwistRingOuter.rotation.x = Math.PI / 2;
    leftTwistRingOuter.position.set(0, -0.11, 0);
    this.leftForearm.add(this.registerExoMesh(leftTwistRingOuter));

    const leftTwistRingRotor = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.018, 20), this.exoFrameMat);
    leftTwistRingRotor.position.set(0, -0.11, 0);
    this.leftForearm.add(this.registerExoMesh(leftTwistRingRotor));

    const leftWristRing = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.005, 12, 24), this.exoCyanRingMat);
    leftWristRing.rotation.x = Math.PI / 2;
    leftWristRing.position.set(0, -0.22, 0);
    this.leftForearm.add(this.registerExoMesh(leftWristRing));

    // Left Motorized Hand Power Glove with Dorsal Slider
    const leftGlovePlate = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.055, 0.044), this.exoFrameMat);
    leftGlovePlate.position.set(-0.015, -0.032, 0);
    this.leftHand.add(this.registerExoMesh(leftGlovePlate));

    const leftSlideTrack = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.040, 0.010), this.exoMetalMat);
    leftSlideTrack.position.set(-0.020, -0.032, 0);
    this.leftHand.add(this.registerExoMesh(leftSlideTrack));

    const leftSlideCarriage = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.012, 0.012), this.exoGoldMat);
    leftSlideCarriage.position.set(-0.022, -0.030, 0);
    this.leftHand.add(this.registerExoMesh(leftSlideCarriage));

    for (let f = 0; f < 4; f++) {
      const rod = new THREE.Mesh(linkRodGeo, this.exoMetalMat);
      rod.position.set(-0.014, -0.060, 0.016 - f * 0.011);
      rod.rotation.x = -0.18;
      this.leftHand.add(this.registerExoMesh(rod));
    }

    // =========================================================================
    // Bowden Cable & Wiring Harness Routing (Reference Image 3 C & D)
    // Purple & Black flexible conduits connecting backpack unit to limbs
    // =========================================================================
    // Cable conduits from backpack up to Right Shoulder / Upper Arm
    const rShoulderCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.045, 0.32, -0.21),
      new THREE.Vector3(0.12, 0.42, -0.17),
      new THREE.Vector3(0.20, 0.44, -0.08),
      new THREE.Vector3(0.23, 0.40, 0.01)
    ]);
    const rShoulderCableGeo = new THREE.TubeGeometry(rShoulderCurve, 20, 0.0045, 8, false);
    const rShoulderCableMesh = new THREE.Mesh(rShoulderCableGeo, this.cablePurpleMat);
    this.torsoGroup.add(this.registerExoMesh(rShoulderCableMesh));

    const rShoulderCable2Geo = new THREE.TubeGeometry(rShoulderCurve, 20, 0.0035, 8, false);
    const rShoulderCable2Mesh = new THREE.Mesh(rShoulderCable2Geo, this.cableBlackMat);
    rShoulderCable2Mesh.position.set(0.008, -0.010, 0.005);
    this.torsoGroup.add(this.registerExoMesh(rShoulderCable2Mesh));

    // Cable conduits from backpack up to Left Shoulder / Upper Arm
    const lShoulderCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.045, 0.32, -0.21),
      new THREE.Vector3(-0.12, 0.42, -0.17),
      new THREE.Vector3(-0.20, 0.44, -0.08),
      new THREE.Vector3(-0.23, 0.40, 0.01)
    ]);
    const lShoulderCableGeo = new THREE.TubeGeometry(lShoulderCurve, 20, 0.0045, 8, false);
    const lShoulderCableMesh = new THREE.Mesh(lShoulderCableGeo, this.cablePurpleMat);
    this.torsoGroup.add(this.registerExoMesh(lShoulderCableMesh));

    const lShoulderCable2Mesh = new THREE.Mesh(lShoulderCableGeo, this.cableBlackMat);
    lShoulderCable2Mesh.position.set(-0.008, -0.010, 0.005);
    this.torsoGroup.add(this.registerExoMesh(lShoulderCable2Mesh));

    // Cable conduits from lower backpack unit down to Right Hip / Thigh
    const rHipCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.045, 0.16, -0.21),
      new THREE.Vector3(0.12, 0.06, -0.18),
      new THREE.Vector3(0.18, -0.04, -0.10),
      new THREE.Vector3(0.20, -0.12, -0.02)
    ]);
    const rHipCableGeo = new THREE.TubeGeometry(rHipCurve, 20, 0.0050, 8, false);
    const rHipCableMesh = new THREE.Mesh(rHipCableGeo, this.cablePurpleMat);
    this.torsoGroup.add(this.registerExoMesh(rHipCableMesh));

    const rHipCable2Mesh = new THREE.Mesh(rHipCableGeo, this.cableBlackMat);
    rHipCable2Mesh.position.set(0.006, -0.008, 0.006);
    this.torsoGroup.add(this.registerExoMesh(rHipCable2Mesh));

    // Cable conduits from lower backpack unit down to Left Hip / Thigh
    const lHipCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.045, 0.16, -0.21),
      new THREE.Vector3(-0.12, 0.06, -0.18),
      new THREE.Vector3(-0.18, -0.04, -0.10),
      new THREE.Vector3(-0.20, -0.12, -0.02)
    ]);
    const lHipCableGeo = new THREE.TubeGeometry(lHipCurve, 20, 0.0050, 8, false);
    const lHipCableMesh = new THREE.Mesh(lHipCableGeo, this.cablePurpleMat);
    this.torsoGroup.add(this.registerExoMesh(lHipCableMesh));

    const lHipCable2Mesh = new THREE.Mesh(lHipCableGeo, this.cableBlackMat);
    lHipCable2Mesh.position.set(-0.006, -0.008, 0.006);
    this.torsoGroup.add(this.registerExoMesh(lHipCable2Mesh));

    // =========================================================================
    // 7. Right Leg Instrumented Exoskeleton
    // =========================================================================
    // Lateral Thigh Strut
    this.thighCuff = new THREE.Group();
    const rightThighStrut = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.40, 0.032), this.exoFrameMat);
    rightThighStrut.position.set(0.088, -0.21, 0);
    this.thighCuff.add(this.registerExoMesh(rightThighStrut));

    // Upper Thigh Cyan Ring
    const upperCuff = new THREE.Mesh(new THREE.TorusGeometry(0.070, 0.009, 16, 36), this.exoCyanRingMat);
    upperCuff.rotation.x = Math.PI / 2;
    upperCuff.position.set(0, -0.09, 0);
    this.thighCuff.add(this.registerExoMesh(upperCuff));

    const upperClamp = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.022, 0.038), this.exoFrameMat);
    upperClamp.position.set(0.088, -0.09, 0);
    this.thighCuff.add(this.registerExoMesh(upperClamp));

    // Lower Thigh Cyan Ring
    const lowerCuff = new THREE.Mesh(new THREE.TorusGeometry(0.060, 0.009, 16, 36), this.exoCyanRingMat);
    lowerCuff.rotation.x = Math.PI / 2;
    lowerCuff.position.set(0, -0.33, 0);
    this.thighCuff.add(this.registerExoMesh(lowerCuff));

    const lowerClamp = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.022, 0.036), this.exoFrameMat);
    lowerClamp.position.set(0.088, -0.33, 0);
    this.thighCuff.add(this.registerExoMesh(lowerClamp));

    this.rightThigh.add(this.thighCuff);

    // Rotary Knee Actuator Assembly (Right Instrumented Leg)
    const actuatorGroup = new THREE.Group();
    actuatorGroup.position.set(0.092, 0, 0);
    actuatorGroup.rotation.y = Math.PI / 2;

    const rimGeo = new THREE.CylinderGeometry(0.058, 0.058, 0.026, 32);
    const rimMesh = new THREE.Mesh(rimGeo, this.exoFrameMat);
    rimMesh.rotation.x = Math.PI / 2;
    actuatorGroup.add(this.registerExoMesh(rimMesh));

    // Concentric Luminous Electric Cyan Accent Ring
    const accentRingGeo = new THREE.TorusGeometry(0.051, 0.0065, 16, 36);
    const accentRing = new THREE.Mesh(accentRingGeo, this.exoCyanRingMat);
    accentRing.position.set(0, 0, 0.014);
    actuatorGroup.add(this.registerExoMesh(accentRing));

    // Glowing Central Motor Core
    const coreGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.028, 24);
    this.actuatorCoreMesh = new THREE.Mesh(coreGeo, this.actuatorCoreMat.clone());
    this.actuatorCoreMesh.rotation.x = Math.PI / 2;
    this.actuatorCoreMesh.position.set(0, 0, 0.002);
    actuatorGroup.add(this.registerExoMesh(this.actuatorCoreMesh));

    const capMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.031, 20), this.exoMetalMat);
    capMesh.rotation.x = Math.PI / 2;
    actuatorGroup.add(this.registerExoMesh(capMesh));

    this.actuatorGlowLight = new THREE.PointLight(0x00e5ff, 1.6, 1.4);
    actuatorGroup.add(this.actuatorGlowLight);

    this.rightKnee.add(actuatorGroup);

    // Shank Exoskeleton
    this.shankBrace = new THREE.Group();
    const rightShankStrut = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.40, 0.028), this.exoFrameMat);
    rightShankStrut.position.set(0.088, -0.21, 0);
    this.shankBrace.add(this.registerExoMesh(rightShankStrut));

    const calfCuff = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.008, 16, 36), this.exoCyanRingMat);
    calfCuff.rotation.x = Math.PI / 2;
    calfCuff.position.set(0, -0.20, 0);
    this.shankBrace.add(this.registerExoMesh(calfCuff));

    const calfClamp = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.020, 0.034), this.exoFrameMat);
    calfClamp.position.set(0.088, -0.20, 0);
    this.shankBrace.add(this.registerExoMesh(calfClamp));

    const ankleRing = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.007, 16, 32), this.exoCyanRingMat);
    ankleRing.rotation.x = Math.PI / 2;
    ankleRing.position.set(0, -0.38, 0);
    this.shankBrace.add(this.registerExoMesh(ankleRing));

    this.rightShank.add(this.shankBrace);

    // Articulated Footplate Orthosis
    this.footPlate = new THREE.Group();
    const plateMesh = new THREE.Mesh(new THREE.BoxGeometry(0.096, 0.014, 0.24), this.exoFrameMat);
    plateMesh.position.set(0, -0.052, 0.06);
    this.footPlate.add(this.registerExoMesh(plateMesh));

    const stirrupMesh = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.06, 0.025), this.exoMetalMat);
    stirrupMesh.position.set(0.048, -0.022, 0);
    this.footPlate.add(this.registerExoMesh(stirrupMesh));

    this.rightFoot.add(this.footPlate);

    // Lateral Rotary Ankle Actuator & Hinge Joint (Right)
    const rightAnkleActuator = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.024, 20), this.exoFrameMat);
    rightAnkleActuator.rotation.z = Math.PI / 2;
    rightAnkleActuator.position.set(0.052, 0, 0);
    this.rightAnkle.add(this.registerExoMesh(rightAnkleActuator));

    const rightAnkleCyanRing = new THREE.Mesh(new THREE.TorusGeometry(0.030, 0.0045, 14, 24), this.exoCyanRingMat);
    rightAnkleCyanRing.rotation.y = Math.PI / 2;
    rightAnkleCyanRing.position.set(0.065, 0, 0);
    this.rightAnkle.add(this.registerExoMesh(rightAnkleCyanRing));

    const rightAnkleCore = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.026, 16), this.actuatorCoreMat.clone());
    rightAnkleCore.rotation.z = Math.PI / 2;
    rightAnkleCore.position.set(0.053, 0, 0);
    this.rightAnkle.add(this.registerExoMesh(rightAnkleCore));

    // =========================================================================
    // 8. Contralateral Left Leg Exoskeleton (Complete Bilateral Assembly)
    // =========================================================================
    const leftThighExo = new THREE.Group();
    const leftUpperCuff = new THREE.Mesh(new THREE.TorusGeometry(0.070, 0.009, 16, 36), this.exoCyanRingMat);
    leftUpperCuff.rotation.x = Math.PI / 2;
    leftUpperCuff.position.set(0, -0.09, 0);
    leftThighExo.add(this.registerExoMesh(leftUpperCuff));

    const leftLowerCuff = new THREE.Mesh(new THREE.TorusGeometry(0.060, 0.009, 16, 36), this.exoCyanRingMat);
    leftLowerCuff.rotation.x = Math.PI / 2;
    leftLowerCuff.position.set(0, -0.33, 0);
    leftThighExo.add(this.registerExoMesh(leftLowerCuff));

    const leftThighStrut = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.40, 0.032), this.exoFrameMat);
    leftThighStrut.position.set(-0.088, -0.21, 0);
    leftThighExo.add(this.registerExoMesh(leftThighStrut));
    this.leftThigh.add(leftThighExo);

    // Left Rotary Knee BLDC Actuator Assembly
    const leftActuatorGroup = new THREE.Group();
    leftActuatorGroup.position.set(-0.092, 0, 0);
    leftActuatorGroup.rotation.y = -Math.PI / 2;

    const leftRimMesh = new THREE.Mesh(rimGeo, this.exoFrameMat);
    leftRimMesh.rotation.x = Math.PI / 2;
    leftActuatorGroup.add(this.registerExoMesh(leftRimMesh));

    const leftAccentRing = new THREE.Mesh(accentRingGeo, this.exoCyanRingMat);
    leftAccentRing.position.set(0, 0, 0.014);
    leftActuatorGroup.add(this.registerExoMesh(leftAccentRing));

    this.leftActuatorCoreMesh = new THREE.Mesh(coreGeo, this.actuatorCoreMat.clone());
    this.leftActuatorCoreMesh.rotation.x = Math.PI / 2;
    this.leftActuatorCoreMesh.position.set(0, 0, 0.002);
    leftActuatorGroup.add(this.registerExoMesh(this.leftActuatorCoreMesh));

    const leftCapMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.031, 20), this.exoMetalMat);
    leftCapMesh.rotation.x = Math.PI / 2;
    leftActuatorGroup.add(this.registerExoMesh(leftCapMesh));

    this.leftActuatorGlowLight = new THREE.PointLight(0x00e5ff, 1.4, 1.2);
    leftActuatorGroup.add(this.leftActuatorGlowLight);

    // 3D Rotational Torque Arc & Cone Indicator (Mounted on Anatomical Right Knee, screen-left)
    this.torqueIndicatorGroup = new THREE.Group();
    this.torqueIndicatorGroup.position.set(0, 0, 0.025);

    const arcGeo = new THREE.TorusGeometry(0.068, 0.0035, 8, 32, Math.PI * 0.7);
    this.torqueArcMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    this.torqueIndicatorGroup.add(this.registerExoMesh(new THREE.Mesh(arcGeo, this.torqueArcMat)));

    const coneGeo = new THREE.ConeGeometry(0.011, 0.024, 8);
    this.torqueConeMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    const coneMesh = new THREE.Mesh(coneGeo, this.torqueConeMat);
    coneMesh.position.set(0.068 * Math.cos(Math.PI * 0.7), 0.068 * Math.sin(Math.PI * 0.7), 0);
    coneMesh.rotation.z = Math.PI * 0.7 + Math.PI / 2;
    this.torqueIndicatorGroup.add(this.registerExoMesh(coneMesh));

    leftActuatorGroup.add(this.torqueIndicatorGroup);

    this.leftKnee.add(leftActuatorGroup);

    // Left Shank Exoskeleton
    const leftShankExo = new THREE.Group();
    const leftShankStrut = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.40, 0.028), this.exoFrameMat);
    leftShankStrut.position.set(-0.088, -0.21, 0);
    leftShankExo.add(this.registerExoMesh(leftShankStrut));

    const leftCalfCuff = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.008, 16, 36), this.exoCyanRingMat);
    leftCalfCuff.rotation.x = Math.PI / 2;
    leftCalfCuff.position.set(0, -0.20, 0);
    leftShankExo.add(this.registerExoMesh(leftCalfCuff));

    const leftAnkleRing = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.007, 16, 32), this.exoCyanRingMat);
    leftAnkleRing.rotation.x = Math.PI / 2;
    leftAnkleRing.position.set(0, -0.38, 0);
    leftShankExo.add(this.registerExoMesh(leftAnkleRing));

    this.leftShank.add(leftShankExo);

    // Left Articulated Footplate Orthosis
    const leftFootPlate = new THREE.Mesh(new THREE.BoxGeometry(0.096, 0.014, 0.24), this.exoFrameMat);
    leftFootPlate.position.set(0, -0.052, 0.06);
    this.leftFoot.add(this.registerExoMesh(leftFootPlate));

    const leftStirrupMesh = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.06, 0.025), this.exoMetalMat);
    leftStirrupMesh.position.set(-0.048, -0.022, 0);
    this.leftFoot.add(this.registerExoMesh(leftStirrupMesh));

    // Lateral Rotary Ankle Actuator & Hinge Joint (Left)
    const leftAnkleActuator = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.024, 20), this.exoFrameMat);
    leftAnkleActuator.rotation.z = Math.PI / 2;
    leftAnkleActuator.position.set(-0.052, 0, 0);
    this.leftAnkle.add(this.registerExoMesh(leftAnkleActuator));

    const leftAnkleCyanRing = new THREE.Mesh(new THREE.TorusGeometry(0.030, 0.0045, 14, 24), this.exoCyanRingMat);
    leftAnkleCyanRing.rotation.y = Math.PI / 2;
    leftAnkleCyanRing.position.set(-0.065, 0, 0);
    this.leftAnkle.add(this.registerExoMesh(leftAnkleCyanRing));

    const leftAnkleCore = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.026, 16), this.actuatorCoreMat.clone());
    leftAnkleCore.rotation.z = Math.PI / 2;
    leftAnkleCore.position.set(-0.053, 0, 0);
    this.leftAnkle.add(this.registerExoMesh(leftAnkleCore));

    this.scene.add(this.exoGroup);
  }

  buildSensorMarkers() {
    this.sensorGroup = new THREE.Group();
    this.sensorGroup.name = "Virtual_Sensors";

    // 1. Thigh 6-Axis IMU
    const imuGeo = new THREE.BoxGeometry(0.022, 0.012, 0.022);
    const imuMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85, roughness: 0.20 });
    this.thighImuMesh = new THREE.Mesh(imuGeo, imuMat);
    this.thighImuMesh.position.set(0, -0.16, 0.065);
    this.rightThigh.add(this.registerSensorMesh(this.thighImuMesh));

    // 2. Shank 6-Axis IMU
    this.shankImuMesh = new THREE.Mesh(imuGeo, imuMat);
    this.shankImuMesh.position.set(0, -0.18, 0.052);
    this.rightShank.add(this.registerSensorMesh(this.shankImuMesh));

    // 3. Rectus Femoris sEMG Electrode Patch
    const emgGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.005, 20);
    const emgMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 0.6,
      roughness: 0.25
    });
    this.emgPatchMesh = new THREE.Mesh(emgGeo, emgMat);
    this.emgPatchMesh.rotation.x = Math.PI / 2;
    this.emgPatchMesh.position.set(0, -0.10, 0.065);
    this.rightThigh.add(this.registerSensorMesh(this.emgPatchMesh));

    // 4. Upper Limbs: Right Forearm 6-Axis IMU
    this.armImuMesh = new THREE.Mesh(imuGeo, imuMat);
    this.armImuMesh.position.set(0, -0.10, 0.042);
    this.rightForearm.add(this.registerSensorMesh(this.armImuMesh));

    // 5. Upper Limbs: Right Bicep sEMG Electrode Patch
    this.armEmgMesh = new THREE.Mesh(emgGeo, emgMat);
    this.armEmgMesh.rotation.x = Math.PI / 2;
    this.armEmgMesh.position.set(0, -0.09, 0.052);
    this.rightUpperArm.add(this.registerSensorMesh(this.armEmgMesh));

    // 6. Thoracic Spine Central IMU & Telemetry Node
    this.spineImuMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.008, 16), emgMat);
    this.spineImuMesh.rotation.x = Math.PI / 2;
    this.spineImuMesh.position.set(0, 0.38, 0.165);
    this.torsoGroup.add(this.registerSensorMesh(this.spineImuMesh));

    // 7. Tri-Zone FSR Foot Pressure Discs
    const fsrGeo = new THREE.CylinderGeometry(0.021, 0.021, 0.006, 20);
    const makeFsrMat = () => new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00b4d8,
      emissiveIntensity: 0.35,
      roughness: 0.3
    });

    this.fsrHeelMesh = new THREE.Mesh(fsrGeo, makeFsrMat());
    this.fsrHeelMesh.position.set(0, -0.062, -0.02);
    this.leftFoot.add(this.registerSensorMesh(this.fsrHeelMesh));

    this.fsrMetaMesh = new THREE.Mesh(fsrGeo, makeFsrMat());
    this.fsrMetaMesh.position.set(0, -0.062, 0.07);
    this.leftFoot.add(this.registerSensorMesh(this.fsrMetaMesh));

    this.fsrToeMesh = new THREE.Mesh(fsrGeo, makeFsrMat());
    this.fsrToeMesh.position.set(0, -0.062, 0.14);
    this.leftFoot.add(this.registerSensorMesh(this.fsrToeMesh));

    this.scene.add(this.sensorGroup);
  }

  updateTelemetry(telemetry) {
    if (!telemetry || !telemetry.kinematics) return;

    const k = telemetry.kinematics;
    const kneeRad = THREE.MathUtils.degToRad(k.knee_angle_deg || 0);
    const thighRad = THREE.MathUtils.degToRad(k.thigh_angle_deg || 0);
    const km = (k.mode || "WALK").toUpperCase().replace("-", "_");
    if (k.hip_jog_deg !== undefined) this.hipJogAngleDeg = k.hip_jog_deg;
    if (k.ankle_jog_deg !== undefined) this.ankleJogAngleDeg = k.ankle_jog_deg;
    if (k.shoulder_jog_deg !== undefined) this.shoulderJogAngleDeg = k.shoulder_jog_deg;
    if (k.elbow_jog_deg !== undefined) this.armJogAngleDeg = k.elbow_jog_deg;

    // =========================================================================
    // 1. Biomechanical Kinematic Articulation
    // Rectified:
    // A. SIT_STAND: Feet remain flat on ground at y=0, ZERO ground penetration.
    // B. WALK & RUN: True alternating bipedal locomotion (Right step -> Left step).
    // C. MANUAL_JOG: Right leg articulates with jog angle; Left leg provides stable support.
    // D. STANDBY: Balanced upright posture.
    // =========================================================================
    if (km === "SIT_STAND") {
      // Exact Forward Kinematics solver to guarantee feet NEVER penetrate the floor:
      // Y_pelvis = HipOffset + ThighLen * cos(thigh) + ShankLen * cos(knee - thigh) + FootHeight
      const computedPelvisY = 0.04 + 0.42 * Math.cos(thighRad) + 0.42 * Math.cos(kneeRad - thighRad) + 0.052;
      const sitRatio = Math.min(1.0, Math.max(0.0, (k.knee_angle_deg || 0) / 85.0));

      if (this.pelvis) {
        this.pelvis.position.y = Math.max(0.58, computedPelvisY);
        // Ergonomic posterior shift into chair
        this.pelvis.position.z = -(sitRatio * 0.14);
        this.pelvis.position.x = 0;
      }
      if (this.torsoGroup) {
        // Natural forward trunk lean during transfer
        this.torsoGroup.rotation.x = sitRatio * 0.20;
      }

      // Synchronous bilateral joint flexion
      if (this.rightHip) this.rightHip.rotation.x = -thighRad;
      if (this.rightKnee) this.rightKnee.rotation.x = kneeRad;
      if (this.leftHip) this.leftHip.rotation.x = -thighRad;
      if (this.leftKnee) this.leftKnee.rotation.x = kneeRad;

      // Ankle angles dynamically maintain the foot soles 100% flat on the floor
      const ankleGroundAlign = -(kneeRad - thighRad);
      if (this.rightAnkle) this.rightAnkle.rotation.x = ankleGroundAlign;
      if (this.leftAnkle) this.leftAnkle.rotation.x = ankleGroundAlign;

    } else if (km === "STANDBY" || km === "REHAB_REACH" || km === "ARM_REHAB") {
      // Upright locked stance on both limbs
      if (this.pelvis) this.pelvis.position.set(0, 0.95, 0);
      if (this.torsoGroup) this.torsoGroup.rotation.x = 0;

      const kneeLock = THREE.MathUtils.degToRad(10.0);
      if (this.rightHip) this.rightHip.rotation.x = 0;
      if (this.rightKnee) this.rightKnee.rotation.x = kneeLock;
      if (this.leftHip) this.leftHip.rotation.x = 0;
      if (this.leftKnee) this.leftKnee.rotation.x = kneeLock;

      if (this.rightAnkle) this.rightAnkle.rotation.x = -kneeLock * 0.5;
      if (this.leftAnkle) this.leftAnkle.rotation.x = -kneeLock * 0.5;

    } else if (km === "MANUAL_JOG") {
      // Manual Jog mode: Anatomical Right leg (screen-left) articulates with hip, knee, and ankle jog; Left leg provides stable support
      const jogClearance = (kneeRad > 0.08 && kneeRad < 1.0) ? Math.sin(kneeRad * Math.PI / 1.0) * 0.035 : 0;
      if (this.pelvis) this.pelvis.position.set(0, 0.95 + jogClearance, 0);
      if (this.torsoGroup) this.torsoGroup.rotation.x = 0;

      const hipRad = (k.thigh_angle_deg !== undefined) ? THREE.MathUtils.degToRad(k.thigh_angle_deg) : THREE.MathUtils.degToRad(this.hipJogAngleDeg);
      if (this.leftHip) this.leftHip.rotation.x = -hipRad;
      if (this.leftKnee) this.leftKnee.rotation.x = kneeRad;
      // Ankle remains still / locked at manual ankle jog angle (default 0.0 deg neutral)
      if (this.leftAnkle) this.leftAnkle.rotation.x = THREE.MathUtils.degToRad(this.ankleJogAngleDeg);

      const standKnee = Math.max(0, THREE.MathUtils.degToRad(8.0) - jogClearance * 1.5);
      if (this.rightHip) this.rightHip.rotation.x = 0;
      if (this.rightKnee) this.rightKnee.rotation.x = standKnee;
      if (this.rightAnkle) this.rightAnkle.rotation.x = -standKnee;

    } else {
      // =======================================================================
      // Alternating Bipedal Locomotion (WALK & RUN)
      // True Human Locomotion: Right step -> Left step with 50% alternating phase shift!
      // Forward swing lands heel-first, stance supports and rolls onto toes, zero backward donkey kicks!
      // =======================================================================
      const isRun = km === "RUN";
      const cyclePercent = telemetry.gait?.cycle_percent ?? 0.0;

      // Active Right Leg Kinematics (Human Gait Profile)
      const rightAngles = this.calculateGaitAngles(cyclePercent, isRun);
      const rightFootAngleDeg = this.computeFootWorldAngleDeg(cyclePercent, isRun);
      const rightFootWorldRad = THREE.MathUtils.degToRad(rightFootAngleDeg);

      // Enforce strict anatomical knee limits: 0° (full extension) to 120° (flexion), zero hyperextension/recurvatum
      const rightKneeSafe = Math.max(0.0, Math.min(THREE.MathUtils.degToRad(120.0), rightAngles.kneeRad));

      if (this.leftHip) this.leftHip.rotation.x = -rightAngles.thighRad;
      if (this.leftKnee) this.leftKnee.rotation.x = rightKneeSafe;
      
      // Ankle rotation keeps foot flat on ground during stance and level during swing
      const rightLegPitch = -rightAngles.thighRad + rightKneeSafe;
      let rightAnkleLocal = rightFootWorldRad - rightLegPitch;
      rightAnkleLocal = Math.max(-0.61, Math.min(0.44, rightAnkleLocal));
      if (this.leftAnkle) this.leftAnkle.rotation.x = rightAnkleLocal;

      // Alternate Movement for Left Leg (50% phase shift: 180° out-of-phase step)
      const leftCyclePercent = (cyclePercent + 50.0) % 100.0;
      const leftAngles = this.calculateGaitAngles(leftCyclePercent, isRun);
      const leftFootAngleDeg = this.computeFootWorldAngleDeg(leftCyclePercent, isRun);
      const leftFootWorldRad = THREE.MathUtils.degToRad(leftFootAngleDeg);

      const leftKneeSafe = Math.max(0.0, Math.min(THREE.MathUtils.degToRad(120.0), leftAngles.kneeRad));

      if (this.rightHip) this.rightHip.rotation.x = -leftAngles.thighRad;
      if (this.rightKnee) this.rightKnee.rotation.x = leftKneeSafe;
      
      const leftLegPitch = -leftAngles.thighRad + leftKneeSafe;
      let leftAnkleLocal = leftFootWorldRad - leftLegPitch;
      leftAnkleLocal = Math.max(-0.61, Math.min(0.44, leftAnkleLocal));
      if (this.rightAnkle) this.rightAnkle.rotation.x = leftAnkleLocal;

      // Pelvis natural sinusoidal vertical bounce & lateral weight shift
      // Minima at double-support (p=0%, 50%), maxima at single-support midstance (p=25%, 75%)
      if (this.pelvis) {
        const bounce = -Math.cos((cyclePercent / 100.0) * Math.PI * 4.0) * 0.014;
        const sway = Math.sin((cyclePercent / 100.0) * Math.PI * 2.0) * 0.012;
        this.pelvis.position.set(sway, 0.945 + bounce, 0);
      }
      if (this.torsoGroup) {
        // Natural slight forward posture and subtle counter-twist
        const twist = Math.sin((cyclePercent / 100.0) * Math.PI * 2.0) * 0.035;
        this.torsoGroup.rotation.set(0.044, -twist, 0);
      }
    }

    // =========================================================================
    // Dynamic Upper Body & Arm Exoskeleton Kinematics (Coordinated Locomotion)
    // =========================================================================
    if (this.rightShoulder && this.leftShoulder) {
      if (km === "REHAB_REACH" || km === "ARM_REHAB") {
        // Clinical Upper-Limb Rehabilitation Reach & Overhead Workout (Images 1 & 3)
        const reachTime = Date.now() * 0.0024;
        const reachCycle = (Math.sin(reachTime) + 1.0) * 0.5; // 0.0 to 1.0

        // Forward/Upward Elevation (up to 78 degrees)
        const elevationAngle = -(0.25 + reachCycle * 1.10);
        const abductionAngle = 0.22 + reachCycle * 0.14;

        this.rightShoulder.rotation.x = elevationAngle;
        this.rightShoulder.rotation.z = abductionAngle;
        this.rightShoulder.rotation.y = -0.12 * reachCycle;

        this.leftShoulder.rotation.x = elevationAngle;
        this.leftShoulder.rotation.z = -abductionAngle;
        this.leftShoulder.rotation.y = 0.12 * reachCycle;

        // Elbow flexion into reach posture
        const elbowFlex = -(0.45 + reachCycle * 0.70);
        if (this.rightElbow) this.rightElbow.rotation.x = elbowFlex;
        if (this.leftElbow) this.leftElbow.rotation.x = elbowFlex;

        // Forearm twisting (pronation / supination from Image 2)
        if (this.rightForearm) this.rightForearm.rotation.y = 0.40 * reachCycle;
        if (this.leftForearm) this.leftForearm.rotation.y = -0.40 * reachCycle;

        if (this.rightWrist) this.rightWrist.rotation.x = 0.15 * reachCycle;
        if (this.leftWrist) this.leftWrist.rotation.x = 0.15 * reachCycle;

      } else if (km === "SIT_STAND") {
        const sitRatio = Math.min(1.0, Math.max(0.0, (k.knee_angle_deg || 0) / 85.0));
        // Bilateral forward reaching for dynamic center-of-mass balance during chair transfer
        this.rightShoulder.rotation.x = -sitRatio * 0.55;
        this.rightShoulder.rotation.z = 0.14;
        this.rightShoulder.rotation.y = -0.05;
        // Negative rotation around X hinges elbows forward (+Z)
        if (this.rightElbow) this.rightElbow.rotation.x = -(sitRatio * 0.35 + 0.15);
        if (this.rightWrist) this.rightWrist.rotation.x = -sitRatio * 0.10;

        this.leftShoulder.rotation.x = -sitRatio * 0.55;
        this.leftShoulder.rotation.z = -0.14;
        this.leftShoulder.rotation.y = 0.05;
        if (this.leftElbow) this.leftElbow.rotation.x = -(sitRatio * 0.35 + 0.15);
        if (this.leftWrist) this.leftWrist.rotation.x = -sitRatio * 0.10;

      } else if (km === "STANDBY") {
        // Natural resting upright ready posture with carrying angle (abduction z=±0.12)
        this.rightShoulder.rotation.set(-0.04, 0, 0.12);
        if (this.rightElbow) this.rightElbow.rotation.x = -0.16;
        if (this.rightWrist) this.rightWrist.rotation.x = 0;

        this.leftShoulder.rotation.set(-0.04, 0, -0.12);
        if (this.leftElbow) this.leftElbow.rotation.x = -0.16;
        if (this.leftWrist) this.leftWrist.rotation.x = 0;

      } else if (km === "MANUAL_JOG") {
        // Interactive Independent Shoulder & Elbow Jog Controls
        const shoulderRad = -THREE.MathUtils.degToRad(this.shoulderJogAngleDeg);
        const elbowRad = -THREE.MathUtils.degToRad(this.armJogAngleDeg);
        this.rightShoulder.rotation.set(shoulderRad, 0, 0.14 + (Math.max(0, this.shoulderJogAngleDeg) / 110.0) * 0.12);
        this.leftShoulder.rotation.set(shoulderRad, 0, -(0.14 + (Math.max(0, this.shoulderJogAngleDeg) / 110.0) * 0.12));
        if (this.rightElbow) this.rightElbow.rotation.x = elbowRad;
        if (this.leftElbow) this.leftElbow.rotation.x = elbowRad;
        if (this.rightWrist) this.rightWrist.rotation.x = -0.06;
        if (this.leftWrist) this.leftWrist.rotation.x = -0.06;

      } else {
        // True Contralateral Arm Swing matching human bipedal locomotion (WALK & RUN)
        // When Right Leg swings forward (+Z, -thighRad < 0):
        //   Right Arm swings BACKWARD (-Z, +rArmPitch)
        //   Left Arm swings FORWARD (+Z, -lArmPitch)
        // When Right Leg swings backward (-Z, -thighRad > 0):
        //   Right Arm swings FORWARD (+Z, -rArmPitch)
        //   Left Arm swings BACKWARD (-Z, +lArmPitch)
        const isRun = km === "RUN";
        const cyclePercent = telemetry.gait?.cycle_percent ?? 0.0;
        const rightAngles = this.calculateGaitAngles(cyclePercent, isRun);

        const dThigh = rightAngles.thighRad - 0.07;
        const swingGain = isRun ? 0.75 : 0.45;

        // In Three.js: +pitch = backward swing; -pitch = forward swing!
        const rArmPitch = +dThigh * swingGain;
        const lArmPitch = -dThigh * swingGain;

        const abdAngle = isRun ? 0.15 : 0.12;

        // Right arm kinematics (screen-left, anatomical Right arm)
        this.leftShoulder.rotation.x = rArmPitch;
        this.leftShoulder.rotation.z = -abdAngle;
        this.leftShoulder.rotation.y = -0.08 * rArmPitch;

        // Left arm kinematics (screen-right, anatomical Left arm)
        this.rightShoulder.rotation.x = lArmPitch;
        this.rightShoulder.rotation.z = abdAngle;
        this.rightShoulder.rotation.y = 0.08 * lArmPitch;

        // Elbows: CAN ONLY FLEX FORWARD (+Z), which in Three.js requires a NEGATIVE rotation around X!
        // When swinging forward (pitch < 0), forwardFlex > 0, so elbow bends forward more.
        const rForwardFlex = Math.max(0, -rArmPitch);
        const lForwardFlex = Math.max(0, -lArmPitch);

        if (isRun) {
          if (this.leftElbow) this.leftElbow.rotation.x = -(0.95 + 0.65 * rForwardFlex);
          if (this.rightElbow) this.rightElbow.rotation.x = -(0.95 + 0.65 * lForwardFlex);
        } else {
          if (this.leftElbow) this.leftElbow.rotation.x = -(0.18 + 0.52 * rForwardFlex);
          if (this.rightElbow) this.rightElbow.rotation.x = -(0.18 + 0.52 * lForwardFlex);
        }

        // Wrists: Natural relaxed compliance
        if (this.leftWrist) this.leftWrist.rotation.x = -0.10 * rForwardFlex;
        if (this.rightWrist) this.rightWrist.rotation.x = -0.10 * lForwardFlex;
      }
    }

    // Animate custom 3D model if active
    if (this.hasCustomModel && this.customBones) {
      if (km === "SIT_STAND") {
        if (this.customBones.pelvis) {
          const computedPelvisY = 0.04 + 0.42 * Math.cos(thighRad) + 0.42 * Math.cos(kneeRad - thighRad) + 0.052;
          this.customBones.pelvis.position.y = Math.max(0.58, computedPelvisY);
        }
        if (this.customBones.rightHip) this.customBones.rightHip.rotation.x = -thighRad;
        if (this.customBones.rightKnee) this.customBones.rightKnee.rotation.x = kneeRad;
        if (this.customBones.leftHip) this.customBones.leftHip.rotation.x = -thighRad;
        if (this.customBones.leftKnee) this.customBones.leftKnee.rotation.x = kneeRad;
        const sitAnkle = -(kneeRad - thighRad);
        if (this.customBones.rightAnkle) this.customBones.rightAnkle.rotation.x = sitAnkle;
        if (this.customBones.leftAnkle) this.customBones.leftAnkle.rotation.x = sitAnkle;
      } else if (km === "STANDBY" || km === "MANUAL_JOG") {
        const kRad = (km === "STANDBY") ? THREE.MathUtils.degToRad(10.0) : kneeRad;
        const tRad = (km === "STANDBY") ? 0 : thighRad;
        const jogClearance = (km === "MANUAL_JOG" && kneeRad > 0.08 && kneeRad < 1.0) ? Math.sin(kneeRad * Math.PI / 1.0) * 0.035 : 0;
        if (this.customBones.pelvis) {
          this.customBones.pelvis.position.y = (this.customBones.pelvisBaseY || 0.95) + jogClearance;
        }
        if (this.customBones.rightHip) this.customBones.rightHip.rotation.x = -tRad;
        if (this.customBones.rightKnee) this.customBones.rightKnee.rotation.x = kRad;
        const standKnee = (km === "STANDBY") ? THREE.MathUtils.degToRad(8.0) : Math.max(0, THREE.MathUtils.degToRad(8.0) - jogClearance * 1.5);
        if (this.customBones.leftHip) this.customBones.leftHip.rotation.x = 0;
        if (this.customBones.leftKnee) this.customBones.leftKnee.rotation.x = standKnee;
        const rAnk = (km === "STANDBY") ? -kRad * 0.5 : THREE.MathUtils.degToRad(this.ankleJogAngleDeg);
        const lAnk = -standKnee;
        if (this.customBones.rightAnkle) this.customBones.rightAnkle.rotation.x = rAnk;
        if (this.customBones.leftAnkle) this.customBones.leftAnkle.rotation.x = lAnk;
      } else {
        const cyclePercent = telemetry.gait?.cycle_percent ?? 0.0;
        const isRun = km === "RUN";
        const rightAngles = this.calculateGaitAngles(cyclePercent, isRun);
        const rightFootAngleDeg = this.computeFootWorldAngleDeg(cyclePercent, isRun);
        const rightFootWorldRad = THREE.MathUtils.degToRad(rightFootAngleDeg);

        const leftCyclePercent = (cyclePercent + 50.0) % 100.0;
        const leftAngles = this.calculateGaitAngles(leftCyclePercent, isRun);
        const leftFootAngleDeg = this.computeFootWorldAngleDeg(leftCyclePercent, isRun);
        const leftFootWorldRad = THREE.MathUtils.degToRad(leftFootAngleDeg);

        const rightKneeSafe = Math.max(0.0, Math.min(THREE.MathUtils.degToRad(120.0), rightAngles.kneeRad));
        const leftKneeSafe = Math.max(0.0, Math.min(THREE.MathUtils.degToRad(120.0), leftAngles.kneeRad));

        const rightLegPitch = -rightAngles.thighRad + rightKneeSafe;
        let rightAnkleLocal = rightFootWorldRad - rightLegPitch;
        rightAnkleLocal = Math.max(-0.61, Math.min(0.44, rightAnkleLocal));

        const leftLegPitch = -leftAngles.thighRad + leftKneeSafe;
        let leftAnkleLocal = leftFootWorldRad - leftLegPitch;
        leftAnkleLocal = Math.max(-0.61, Math.min(0.44, leftAnkleLocal));

        if (this.customBones.rightHip) this.customBones.rightHip.rotation.x = -rightAngles.thighRad;
        if (this.customBones.rightKnee) this.customBones.rightKnee.rotation.x = rightKneeSafe;
        if (this.customBones.rightAnkle) this.customBones.rightAnkle.rotation.x = rightAnkleLocal;

        if (this.customBones.leftHip) this.customBones.leftHip.rotation.x = -leftAngles.thighRad;
        if (this.customBones.leftKnee) this.customBones.leftKnee.rotation.x = leftKneeSafe;
        if (this.customBones.leftAnkle) this.customBones.leftAnkle.rotation.x = leftAnkleLocal;

        if (this.customBones.pelvis) {
          const bounce = -Math.cos((cyclePercent / 100.0) * Math.PI * 4.0) * 0.014;
          this.customBones.pelvis.position.y = (this.customBones.pelvisBaseY || 0.95) + bounce;
        }
      }

      // Synchronize custom 3D model arms across ALL modes (WALK, RUN, SIT_STAND, STANDBY, REHAB_REACH, MANUAL_JOG)
      if (this.customBones.leftShoulder && this.leftShoulder) this.customBones.leftShoulder.rotation.copy(this.leftShoulder.rotation);
      if (this.customBones.rightShoulder && this.rightShoulder) this.customBones.rightShoulder.rotation.copy(this.rightShoulder.rotation);
      if (this.customBones.leftElbow && this.leftElbow) this.customBones.leftElbow.rotation.copy(this.leftElbow.rotation);
      if (this.customBones.rightElbow && this.rightElbow) this.customBones.rightElbow.rotation.copy(this.rightElbow.rotation);
    }

    // =========================================================================
    // 2. Actuator Dynamic Glow & Torque Arc Indicator (Full Body Synchronization)
    // =========================================================================
    const torque = Math.abs(telemetry.torques?.commanded_nm || 0);
    const mode = telemetry.safety?.mode || "NORMAL_AAN";

    let glowColor = 0x00e5ff;
    let intensity = 0.5 + (torque / 35.0) * 1.8;

    if (mode === "EMERGENCY_STOP") {
      glowColor = 0xf43f5e;
      intensity = (Date.now() % 360 < 180) ? 2.8 : 0.2;
    } else if (mode === "PROTECTIVE_MODE") {
      glowColor = 0xa855f7;
      intensity = 2.0;
    } else if (mode === "CONTROLLED_SOFT_STOP") {
      glowColor = 0xf59e0b;
      intensity = 1.6 + 0.5 * Math.sin(Date.now() * 0.008);
    } else if (mode === "SAFE_FALLBACK") {
      glowColor = 0xf59e0b;
      intensity = 1.3;
    } else {
      if (torque < 8.0) {
        glowColor = 0x10b981;
      } else if (torque < 18.0) {
        glowColor = 0x00e5ff;
      } else if (torque < 28.0) {
        glowColor = 0xf59e0b;
      } else {
        glowColor = 0xf43f5e;
      }
    }

    const allActuatorCores = [
      this.actuatorCoreMesh,
      this.leftActuatorCoreMesh,
      this.rightElbowCoreMesh,
      this.leftElbowCoreMesh,
      this.rightShoulderCoreMesh,
      this.leftShoulderCoreMesh
    ];
    allActuatorCores.forEach(mesh => {
      if (mesh && mesh.material) {
        mesh.material.color.setHex(glowColor);
        mesh.material.emissive.setHex(glowColor);
        mesh.material.emissiveIntensity = intensity;
      }
    });

    if (this.actuatorGlowLight) {
      this.actuatorGlowLight.color.setHex(glowColor);
      this.actuatorGlowLight.intensity = intensity * 1.8;
    }
    if (this.leftActuatorGlowLight) {
      this.leftActuatorGlowLight.color.setHex(glowColor);
      this.leftActuatorGlowLight.intensity = intensity * 1.5;
    }
    if (this.rightElbowLight) {
      this.rightElbowLight.color.setHex(glowColor);
      this.rightElbowLight.intensity = intensity * 1.2;
    }

    if (this.torqueIndicatorGroup) {
      const rawCmdTorque = telemetry.torques?.commanded_nm ?? 0.0;
      const absTorque = Math.abs(rawCmdTorque);
      if (absTorque < 0.25 || mode === "EMERGENCY_STOP") {
        this.torqueIndicatorGroup.visible = false;
      } else {
        this.torqueIndicatorGroup.visible = true;
        const isExtension = rawCmdTorque >= 0;
        const indColor = mode === "CONTROLLED_SOFT_STOP" ? 0xfbbf24 : (isExtension ? 0x10b981 : 0xa855f7);
        if (this.torqueArcMat) this.torqueArcMat.color.setHex(indColor);
        if (this.torqueConeMat) this.torqueConeMat.color.setHex(indColor);
        this.torqueIndicatorGroup.rotation.z = isExtension ? 0 : Math.PI;
        const scaleVal = Math.min(1.4, 0.85 + (absTorque / 35.0) * 0.55);
        this.torqueIndicatorGroup.scale.set(scaleVal, scaleVal, scaleVal);
      }
    }

    // =========================================================================
    // 3. FSR Foot Pressure Discs
    // =========================================================================
    const fsr = telemetry.sensors?.foot_pressure;
    if (fsr && this.fsrHeelMesh) {
      const hVal = fsr.heel_n || 0;
      const hScale = 1.0 + Math.min(1.5, hVal / 280.0);
      this.fsrHeelMesh.scale.set(hScale, 1.0, hScale);
      this.fsrHeelMesh.material.emissiveIntensity = 0.2 + Math.min(2.2, hVal / 160.0);

      const mVal = fsr.metatarsal_n || 0;
      const mScale = 1.0 + Math.min(1.5, mVal / 280.0);
      this.fsrMetaMesh.scale.set(mScale, 1.0, mScale);
      this.fsrMetaMesh.material.emissiveIntensity = 0.2 + Math.min(2.2, mVal / 160.0);

      const tVal = fsr.toe_n || 0;
      const tScale = 1.0 + Math.min(1.5, tVal / 280.0);
      this.fsrToeMesh.scale.set(tScale, 1.0, tScale);
      this.fsrToeMesh.material.emissiveIntensity = 0.2 + Math.min(2.2, tVal / 160.0);
    }

    // =========================================================================
    // 4. sEMG Envelope Glow
    // =========================================================================
    const emgEnv = telemetry.sensors?.emg?.envelope_norm || 0;
    if (this.emgPatchMesh) {
      this.emgPatchMesh.material.emissiveIntensity = 0.35 + (emgEnv * 2.2);
    }
  }

  toggleLayer(layerName, visible) {
    if (layerName === 'exo') {
      this.showExo = visible;
      this.exoMeshes.forEach(m => { m.visible = visible; });
      if (this.hasCustomModel && this.customModel) {
        this.customModel.visible = visible;
      }
      if (this.actuatorGlowLight) this.actuatorGlowLight.visible = visible;
      if (this.leftActuatorGlowLight) this.leftActuatorGlowLight.visible = visible;
      if (this.rightElbowLight) this.rightElbowLight.visible = visible;
      if (this.torqueIndicatorGroup) this.torqueIndicatorGroup.visible = visible;
    } else if (layerName === 'anatomy') {
      this.showAnatomy = visible;
      this.humanMeshes.forEach(m => { m.visible = visible; });
    } else if (layerName === 'sensors') {
      this.showSensors = visible;
      this.sensorMeshes.forEach(m => { m.visible = visible; });
    }
  }

  resetCamera() {
    if (this.camera && this.controls) {
      this.camera.position.set(1.9, 1.35, 2.6);
      this.controls.target.set(0, 0.88, 0);
      this.controls.update();
    }
  }

  onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    this.width = this.container.clientWidth || 800;
    this.height = this.container.clientHeight || 480;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    if (this.controls) this.controls.update();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  // =========================================================================
  // Custom 3D Model Pipeline (.GLB / .GLTF)
  // =========================================================================
  setupGLTFPipeline() {
    if (this.container) {
      this.container.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.container.style.outline = '2px dashed #00e5ff';
        this.container.style.outlineOffset = '-4px';
      });

      this.container.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.container.style.outline = 'none';
      });

      this.container.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.container.style.outline = 'none';
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
          const file = files[0];
          if (file.name.toLowerCase().endsWith('.glb') || file.name.toLowerCase().endsWith('.gltf')) {
            this.loadGLTFFromFile(file);
          } else {
            this.showToast('Please drop a .glb or .gltf file', true);
          }
        }
      });
    }

    const btnLoad = document.getElementById('btn-load-glb');
    const inputLoad = document.getElementById('input-load-glb');
    if (btnLoad && inputLoad) {
      btnLoad.addEventListener('click', () => inputLoad.click());
      inputLoad.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.loadGLTFFromFile(e.target.files[0]);
        }
      });
    }

    this.checkAndLoadDefaultModel();
  }

  checkAndLoadDefaultModel() {
    const candidatePaths = [
      '/assets/models/exoskeleton.glb',
      '/assets/models/model.glb'
    ];
    const tryCandidate = (idx) => {
      if (idx >= candidatePaths.length) return;
      const path = candidatePaths[idx];
      fetch(path, { method: 'HEAD' })
        .then((res) => {
          if (res.ok && res.headers.get('content-type') !== 'text/html') {
            this.loadGLTFFromURL(path, path.split('/').pop());
          } else {
            tryCandidate(idx + 1);
          }
        })
        .catch(() => tryCandidate(idx + 1));
    };
    tryCandidate(0);
  }

  loadGLTFFromFile(file) {
    if (typeof THREE.GLTFLoader === 'undefined') {
      this.showToast('GLTFLoader not available', true);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target.result;
      const loader = new THREE.GLTFLoader();
      loader.parse(
        buffer,
        '',
        (gltf) => {
          this.mountCustomGLTF(gltf, file.name);
        },
        (err) => {
          console.error('[MoveAssist 3D] Failed to parse GLTF file:', err);
          this.showToast('Failed to parse 3D file: ' + err.message, true);
        }
      );
    };
    reader.readAsArrayBuffer(file);
  }

  loadGLTFFromURL(url, label) {
    if (typeof THREE.GLTFLoader === 'undefined') return;
    const loader = new THREE.GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        this.mountCustomGLTF(gltf, label || url.split('/').pop());
      },
      undefined,
      (err) => {
        console.info('[MoveAssist 3D] No custom model found at ' + url + '; procedural twin active.');
      }
    );
  }

  mountCustomGLTF(gltf, label) {
    if (this.customModel) {
      this.scene.remove(this.customModel);
      this.customModel = null;
    }

    const model = gltf.scene;
    model.name = "Custom_Exoskeleton_Model";

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    if (maxDim > 0) {
      const targetHeight = 1.75;
      const scaleFactor = targetHeight / (size.y > 0.1 ? size.y : maxDim);
      model.scale.set(scaleFactor, scaleFactor, scaleFactor);

      box.setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.x = -center.x;
      model.position.z = -center.z;
      model.position.y = -box.min.y;
    }

    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material.side = THREE.DoubleSide;
        }
      }
    });

    this.customBones = this.resolveBonesFuzzy(model);

    this.scene.add(model);
    this.customModel = model;
    this.hasCustomModel = true;
    this.customModelName = label || 'Custom Model';

    if (this.humanGroup) this.humanGroup.visible = false;
    if (this.exoGroup) this.exoGroup.visible = false;

    this.showToast(`✓ Custom 3D Model Loaded: ${this.customModelName}`);
    console.log(`[MoveAssist 3D] Mounted '${this.customModelName}' with bones:`, Object.keys(this.customBones));
  }

  resolveBonesFuzzy(rootNode) {
    const bones = {};
    rootNode.traverse((obj) => {
      const name = (obj.name || '').toLowerCase().replace(/[-_.]/g, '');
      if (!name) return;

      if (!bones.rightHip && (name.includes('righthip') || name.includes('rightthigh') || name.includes('rightfemur') || name.includes('thighr') || name.includes('upperlegr') || name.includes('uplegr') || name.includes('rightleg') || name.includes('femurr'))) {
        bones.rightHip = obj;
      } else if (!bones.rightKnee && (name.includes('rightknee') || name.includes('kneer') || name.includes('rightkneejoint') || name.includes('shankr') || name.includes('lowerlegr') || name.includes('rightshank') || name.includes('legr'))) {
        bones.rightKnee = obj;
      } else if (!bones.rightShank && (name.includes('rightshank') || name.includes('righttibia') || name.includes('shankr') || name.includes('lowerlegr') || name.includes('rightcalf'))) {
        bones.rightShank = obj;
      } else if (!bones.rightAnkle && (name.includes('rightankle') || name.includes('ankler') || name.includes('footr') || name.includes('rightfoot') || name.includes('footplater'))) {
        bones.rightAnkle = obj;
      } else if (!bones.rightFoot && (name.includes('rightfoot') || name.includes('footr'))) {
        bones.rightFoot = obj;
      } else if (!bones.leftHip && (name.includes('lefthip') || name.includes('leftthigh') || name.includes('leftfemur') || name.includes('thighl') || name.includes('upperlegl') || name.includes('uplegl') || name.includes('leftleg') || name.includes('femurl'))) {
        bones.leftHip = obj;
      } else if (!bones.leftKnee && (name.includes('leftknee') || name.includes('kneel') || name.includes('leftkneejoint') || name.includes('shankl') || name.includes('lowerlegl') || name.includes('leftshank') || name.includes('legl'))) {
        bones.leftKnee = obj;
      } else if (!bones.leftAnkle && (name.includes('leftankle') || name.includes('anklel') || name.includes('footl') || name.includes('leftfoot') || name.includes('footplatel'))) {
        bones.leftAnkle = obj;
      } else if (!bones.leftFoot && (name.includes('leftfoot') || name.includes('footl'))) {
        bones.leftFoot = obj;
      } else if (!bones.pelvis && (name.includes('pelvis') || name.includes('hips') || name.includes('root') || name.includes('hipcenter'))) {
        bones.pelvis = obj;
        bones.pelvisBaseY = obj.position.y;
      }
    });
    return bones;
  }

  calculateGaitAngles(p, isRun = false) {
    p = ((p % 100) + 100) % 100;
    let thighDeg = 0;
    let kneeDeg = 0;
    let ankleDeg = 0;

    if (isRun) {
      // Physiological running profile
      thighDeg = 5.0 + 24.0 * Math.cos(2.0 * Math.PI * (p / 100.0));

      if (p < 20.0) {
        const sub = p / 20.0;
        kneeDeg = 12.0 + 16.0 * Math.sin(sub * (Math.PI / 2.0));
      } else if (p < 38.0) {
        const sub = (p - 20.0) / 18.0;
        kneeDeg = 28.0 - 18.0 * sub;
      } else if (p < 68.0) {
        const sub = (p - 38.0) / 30.0;
        kneeDeg = 10.0 + 58.0 * Math.sin(sub * (Math.PI / 2.0));
      } else {
        const sub = (p - 68.0) / 32.0;
        const blend = 0.5 * (1.0 + Math.cos(sub * Math.PI));
        kneeDeg = 12.0 + 56.0 * blend;
      }

      if (p < 38.0) {
        const sub = p / 38.0;
        ankleDeg = -6.0 - 16.0 * sub;
      } else {
        const sub = (p - 38.0) / 62.0;
        ankleDeg = -22.0 + 30.0 * Math.sin(sub * (Math.PI / 2.0));
      }
    } else {
      // Winter's Clinical Human Walking Biomechanics
      // 1. Hip/Thigh flexion: Peaks in forward flexion (+24.5°) at heel strike (p=0%), extends to -11.5° at toe-off (p=50%)
      thighDeg = 4.0 + 18.0 * Math.cos(2.0 * Math.PI * (p / 100.0)) + 2.5 * Math.cos(4.0 * Math.PI * (p / 100.0));

      // 2. Knee flexion: Double wave
      // - Stance shock absorption: 4° -> 16° (p=0..15%) -> 4° (p=15..40%)
      // - Terminal push-off into swing: 4° -> 32° (p=40..60%) -> peak clearance 58° (p=60..73%)
      // - Terminal swing forward reach: Knee rapidly extends forward 58° -> 4° (p=73..100%) so foot lands heel-first
      if (p < 15.0) {
        const sub = p / 15.0;
        kneeDeg = 4.0 + 12.0 * Math.sin(sub * (Math.PI / 2.0));
      } else if (p < 40.0) {
        const sub = (p - 15.0) / 25.0;
        kneeDeg = 16.0 - 12.0 * sub;
      } else if (p < 60.0) {
        const sub = (p - 40.0) / 20.0;
        kneeDeg = 4.0 + 28.0 * Math.sin(sub * (Math.PI / 2.0));
      } else if (p < 73.0) {
        const sub = (p - 60.0) / 13.0;
        kneeDeg = 32.0 + 26.0 * Math.sin(sub * (Math.PI / 2.0));
      } else {
        const sub = (p - 73.0) / 27.0;
        const blend = 0.5 * (1.0 + Math.cos(sub * Math.PI));
        kneeDeg = 4.0 + 54.0 * blend;
      }

      // 3. Ankle dorsiflexion / plantarflexion:
      // - Heel strike (+6° dorsiflexed), foot flat (-2°), midstance (+8°), push-off (-16° plantarflexed), swing clearance (+6°)
      if (p < 10.0) {
        const sub = p / 10.0;
        ankleDeg = 6.0 - 8.0 * sub;
      } else if (p < 40.0) {
        const sub = (p - 10.0) / 30.0;
        ankleDeg = -2.0 + 10.0 * sub;
      } else if (p < 55.0) {
        const sub = (p - 40.0) / 15.0;
        const blend = 0.5 * (1.0 - Math.cos(sub * Math.PI));
        ankleDeg = 8.0 - 24.0 * blend;
      } else if (p < 75.0) {
        const sub = (p - 55.0) / 20.0;
        const blend = 0.5 * (1.0 - Math.cos(sub * Math.PI));
        ankleDeg = -16.0 + 22.0 * blend;
      } else {
        ankleDeg = 6.0;
      }
    }

    // Strict physiological range of motion clamping (0° full extension to 120° deep flexion)
    kneeDeg = Math.max(0.0, Math.min(120.0, kneeDeg));

    return {
      thighDeg,
      kneeDeg,
      ankleDeg,
      thighRad: THREE.MathUtils.degToRad(thighDeg),
      kneeRad: THREE.MathUtils.degToRad(kneeDeg),
      ankleRad: THREE.MathUtils.degToRad(ankleDeg)
    };
  }

  /**
   * Calculates natural foot world orientation angle (relative to horizontal floor).
   * Ensures foot sole is flat during stance (0°) and level during swing (-4°), preventing toe over-stretching.
   */
  computeFootWorldAngleDeg(p, isRun = false) {
    p = ((p % 100) + 100) % 100;
    if (isRun) {
      if (p < 18.0) {
        // Stance initial contact & foot-flat: planted flat on platform
        return 0.0;
      } else if (p < 38.0) {
        // Push-off: heel lifts, rolls onto ball of foot (plantarflexion up to +18°)
        const sub = (p - 18.0) / 20.0;
        return 18.0 * Math.sin(sub * (Math.PI / 2.0));
      } else if (p < 68.0) {
        // Flight / swing limb clearance: foot leveled parallel to floor (-4°)
        const sub = (p - 38.0) / 30.0;
        const blend = 0.5 * (1.0 - Math.cos(sub * Math.PI));
        return 18.0 * (1.0 - blend) - 4.0 * blend;
      } else {
        // Terminal swing: foot oriented level to land flat on platform
        return -4.0;
      }
    } else {
      if (p < 10.0) {
        // Heel strike landing: toes descend from -8° to flat (0°)
        const sub = p / 10.0;
        return -8.0 * (1.0 - sub);
      } else if (p < 40.0) {
        // Foot flat / midstance: strictly 0° level with floor
        return 0.0;
      } else if (p < 55.0) {
        // Terminal stance push-off: heel lifts, foot rotates up to +18°
        const sub = (p - 40.0) / 15.0;
        const blend = 0.5 * (1.0 - Math.cos(sub * Math.PI));
        return 18.0 * blend;
      } else if (p < 72.0) {
        // Initial swing: smoothly transitions from +18° to -5° for level ground clearance
        const sub = (p - 55.0) / 17.0;
        const blend = 0.5 * (1.0 - Math.cos(sub * Math.PI));
        return 18.0 * (1.0 - blend) - 5.0 * blend;
      } else if (p < 90.0) {
        // Mid-swing clearance: held stable at -5° (parallel to ground, zero over-stretching!)
        return -5.0;
      } else {
        // Terminal swing: prepares for heel strike, smooth descent from -5° to -8°
        const sub = (p - 90.0) / 10.0;
        return -5.0 - 3.0 * sub;
      }
    }
  }

  showToast(message, isError = false) {
    let toast = document.getElementById('three-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'three-toast';
      toast.style.cssText = `
        position: absolute;
        bottom: 16px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(15, 23, 42, 0.94);
        color: #00e5ff;
        border: 1px solid rgba(6, 182, 212, 0.5);
        padding: 8px 16px;
        border-radius: 8px;
        font-family: 'Inter', sans-serif;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.3px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.6);
        pointer-events: none;
        transition: opacity 0.3s ease;
        z-index: 20;
      `;
      this.container.appendChild(toast);
    }
    toast.style.color = isError ? '#f43f5e' : '#00e5ff';
    toast.style.borderColor = isError ? 'rgba(244, 63, 94, 0.4)' : 'rgba(6, 182, 212, 0.4)';
    toast.textContent = message;
    toast.style.opacity = '1';
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.style.opacity = '0';
    }, 3500);
  }
}

window.MoveAssist3DViewer = MoveAssist3DViewer;
