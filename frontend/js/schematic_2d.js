/**
 * MoveAssist 2D Biomechanical Kinematics & Actuator Engineering Schematic
 * SIH 2026 | PS SIH26113 | Team: BERSERK TECHIES | Team ID: TEAM-147
 * 
 * High-precision CAD / orthographic biomechanical canvas visualization
 * synchronized at 60 Hz in lockstep with the 3D Digital Twin and closed-loop telemetry.
 */

// Canvas roundRect polyfill for full browser compatibility
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii) {
    if (!radii) radii = 0;
    const r = Array.isArray(radii) ? radii[0] : (typeof radii === 'number' ? radii : 0);
    const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    this.moveTo(x + radius, y);
    this.arcTo(x + w, y, x + w, y + h, radius);
    this.arcTo(x + w, y + h, x, y + h, radius);
    this.arcTo(x, y + h, x, y, radius);
    this.arcTo(x, y, x + w, y, radius);
    this.closePath();
    return this;
  };
}

class MoveAssist2DSchematic {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    // Bilateral Joint Kinematics (100% frame-synchronized with 3D Digital Twin)
    this.right_knee_deg = 0.0;
    this.right_thigh_deg = 0.0;
    this.right_ankle_deg = 0.0;
    this.right_shoulder_deg = 0.0;
    this.right_elbow_deg = 0.0;

    this.left_knee_deg = 0.0;
    this.left_thigh_deg = 0.0;
    this.left_ankle_deg = 0.0;
    this.left_shoulder_deg = 0.0;
    this.left_elbow_deg = 0.0;

    this.right_foot_angle_deg = 0.0;
    this.left_foot_angle_deg = 0.0;

    this.thigh_pitch_deg = 0.0;
    this.shank_pitch_deg = 0.0;
    this.omega_knee_deg_s = 0.0;

    // Torques & Dynamics
    this.tau_cmd_nm = 0.0;
    this.tau_req_nm = 0.0;
    this.tau_user_nm = 0.0;

    // Ground forces & sensors
    this.vgrf_n = 0.0;
    this.fsr_heel = 0.0;
    this.fsr_meta = 0.0;
    this.fsr_toe = 0.0;
    this.emg_env = 0.05;

    // Gait FSM
    this.gait_phase = "STANCE";
    this.gait_pct = 0.0;

    // Safety supervisor
    this.soft_stop_active = false;
    this.soft_stop_rem_s = 0.0;
    this.soft_stop_seriousness = "NORMAL";
    this.safety_mode = "NORMAL_AAN";
    this.kin_mode = "WALK";

    // Layout metrics
    this.width = 0;
    this.height = 0;
    this.dpr = window.devicePixelRatio || 1;
    this.smoothedHipY = null;

    // Interactive Manual Jog Joint Angles
    this.hip_jog_angle_deg = 0.0;
    this.arm_jog_angle_deg = 0.0;
    this.shoulder_jog_angle_deg = 0.0;
    this.ankle_jog_angle_deg = 0.0;

    // Arm Biomechanical Dynamics & Sensors
    this.shoulder_angle_deg = 0.0;
    this.shoulder_vel_deg_s = 0.0;
    this.elbow_angle_deg = 15.0;
    this.elbow_vel_deg_s = 0.0;
    this.shoulder_tau_nm = 0.0;
    this.elbow_tau_nm = 0.0;
    this.arm_watts = 0.0;
    this.arm_emg_rms = 0.08;

    this.onResize();
    window.addEventListener('resize', () => this.onResize());

    // 60 Hz Render loop
    this.render();
  }

  setHipJogAngle(deg) {
    this.hip_jog_angle_deg = Math.max(-15.0, Math.min(90.0, parseFloat(deg) || 0.0));
  }

  setArmJogAngle(deg) {
    this.arm_jog_angle_deg = Math.max(0.0, Math.min(90.0, parseFloat(deg) || 0.0));
  }

  setShoulderJogAngle(deg) {
    this.shoulder_jog_angle_deg = Math.max(-45.0, Math.min(110.0, parseFloat(deg) || 0.0));
  }

  setAnkleJogAngle(deg) {
    this.ankle_jog_angle_deg = Math.max(-30.0, Math.min(30.0, parseFloat(deg) || 0.0));
  }

  onResize() {
    if (!this.canvas || !this.canvas.parentElement) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.width = rect.width || 400;
    this.height = rect.height || 480;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  /**
   * Winter's Clinical Human Locomotion Biomechanics
   * Exactly matches MoveAssist3DViewer.calculateGaitAngles for perfect 2D/3D lockstep.
   */
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
      thighRad: (thighDeg * Math.PI) / 180.0,
      kneeRad: (kneeDeg * Math.PI) / 180.0,
      ankleRad: (ankleDeg * Math.PI) / 180.0
    };
  }

  /**
   * Calculates natural foot ground orientation angle (relative to horizontal floor).
   */
  computeFootWorldAngleDeg(p, isRun = false) {
    p = ((p % 100) + 100) % 100;
    if (isRun) {
      if (p < 18.0) {
        return 0.0;
      } else if (p < 38.0) {
        const sub = (p - 18.0) / 20.0;
        return 18.0 * Math.sin(sub * (Math.PI / 2.0));
      } else if (p < 68.0) {
        const sub = (p - 38.0) / 30.0;
        const blend = 0.5 * (1.0 - Math.cos(sub * Math.PI));
        return 18.0 * (1.0 - blend) - 4.0 * blend;
      } else {
        return -4.0;
      }
    } else {
      if (p < 10.0) {
        const sub = p / 10.0;
        return -8.0 * (1.0 - sub);
      } else if (p < 40.0) {
        return 0.0;
      } else if (p < 55.0) {
        const sub = (p - 40.0) / 15.0;
        const blend = 0.5 * (1.0 - Math.cos(sub * Math.PI));
        return 14.0 * blend;
      } else if (p < 72.0) {
        const sub = (p - 55.0) / 17.0;
        const blend = 0.5 * (1.0 - Math.cos(sub * Math.PI));
        return 14.0 * (1.0 - blend) - 5.0 * blend;
      } else if (p < 90.0) {
        return -5.0;
      } else {
        const sub = (p - 90.0) / 10.0;
        return -5.0 - 3.0 * sub;
      }
    }
  }

  update(telemetry) {
    if (!telemetry) return;

    // Kinematics mode & telemetry speed
    const kin = telemetry.kinematics || {};
    this.kin_mode = (kin.mode || 'WALK').toUpperCase().replace('-', '_');
    this.omega_knee_deg_s = kin.knee_velocity_deg_s || 0.0;
    if (kin.ankle_jog_deg !== undefined) this.ankle_jog_angle_deg = kin.ankle_jog_deg;
    if (kin.shoulder_jog_deg !== undefined) this.shoulder_jog_angle_deg = kin.shoulder_jog_deg;
    if (kin.elbow_jog_deg !== undefined) this.arm_jog_angle_deg = kin.elbow_jog_deg;

    // Torques
    const torques = telemetry.torques || {};
    this.tau_req_nm = torques.required_nm || 0.0;
    this.tau_user_nm = torques.user_estimated_nm || 0.0;
    this.tau_cmd_nm = torques.commanded_nm ?? torques.actuator_cmd_nm ?? 0.0;

    // Sensors
    const sensors = telemetry.sensors || {};
    const fsr = sensors.foot_pressure || {};
    this.fsr_heel = fsr.heel_n || 0.0;
    this.fsr_meta = fsr.metatarsal_n || 0.0;
    this.fsr_toe = fsr.toe_n || 0.0;
    this.vgrf_n = fsr.total_grf_n || 0.0;
    this.emg_env = sensors.emg?.envelope_norm || 0.05;

    // Gait FSM from simulation loop
    if (this.kin_mode === 'REHAB_REACH' || this.kin_mode === 'ARM_REHAB') {
      this.gait_phase = "BALANCED STANCE";
    } else {
      this.gait_phase = telemetry.gait?.phase || (fsr.is_stance ? "STANCE" : "SWING");
    }
    this.gait_pct = telemetry.gait?.cycle_percent ?? 0.0;

    // Safety & Soft Stop
    const safety = telemetry.safety || {};
    this.safety_mode = safety.mode || "NORMAL_AAN";
    const css = safety.controlled_soft_stop || {};
    this.soft_stop_active = !!css.active;
    this.soft_stop_rem_s = css.remaining_s || 0.0;
    this.soft_stop_seriousness = css.fall_seriousness || safety.fall_seriousness || "NORMAL";

    // Synchronize Joint Kinematics directly with 3D model equations (ZERO LAG)
    if (this.kin_mode === 'SIT_STAND') {
      const kneeDeg = kin.knee_angle_deg || 0.0;
      const thighDeg = kin.thigh_angle_deg || 0.0;
      const ankleDeg = -(kneeDeg - thighDeg); // Dynamically maintains foot 100% flat on floor

      this.right_knee_deg = kneeDeg;
      this.right_thigh_deg = thighDeg;
      this.right_ankle_deg = ankleDeg;
      this.right_foot_angle_deg = 0.0;

      this.left_knee_deg = kneeDeg;
      this.left_thigh_deg = thighDeg;
      this.left_ankle_deg = ankleDeg;
      this.left_foot_angle_deg = 0.0;
    } else if (this.kin_mode === 'STANDBY' || this.kin_mode === 'REHAB_REACH' || this.kin_mode === 'ARM_REHAB') {
      this.right_knee_deg = 10.0;
      this.right_thigh_deg = 0.0;
      this.right_ankle_deg = -5.0;
      this.right_foot_angle_deg = 0.0;

      this.left_knee_deg = 10.0;
      this.left_thigh_deg = 0.0;
      this.left_ankle_deg = -5.0;
      this.left_foot_angle_deg = 0.0;
    } else if (this.kin_mode === 'MANUAL_JOG') {
      const jogKnee = kin.jog_angle_deg ?? kin.knee_angle_deg ?? 0.0;
      const jogHip = kin.hip_jog_deg ?? kin.thigh_angle_deg ?? this.hip_jog_angle_deg ?? 0.0;
      const jogAnkle = this.ankle_jog_angle_deg;

      this.right_knee_deg = jogKnee;
      this.right_thigh_deg = jogHip;
      // Ankle joint remains still / locked at manual ankle jog setting (default 0.0 deg)
      this.right_ankle_deg = jogAnkle;
      this.right_foot_angle_deg = (jogKnee - jogHip) + jogAnkle;

      this.left_knee_deg = 8.0;
      this.left_thigh_deg = 0.0;
      this.left_ankle_deg = -4.0;
      this.left_foot_angle_deg = 0.0;
    } else {
      // WALK / RUN: Alternating Bipedal Locomotion
      const isRun = this.kin_mode === 'RUN';
      const rightAngles = this.calculateGaitAngles(this.gait_pct, isRun);
      const leftAngles = this.calculateGaitAngles((this.gait_pct + 50.0) % 100.0, isRun);

      this.right_knee_deg = Math.max(0.0, Math.min(120.0, rightAngles.kneeDeg));
      this.right_thigh_deg = rightAngles.thighDeg;
      this.right_ankle_deg = rightAngles.ankleDeg;
      this.right_foot_angle_deg = this.computeFootWorldAngleDeg(this.gait_pct, isRun);

      this.left_knee_deg = Math.max(0.0, Math.min(120.0, leftAngles.kneeDeg));
      this.left_thigh_deg = leftAngles.thighDeg;
      this.left_ankle_deg = leftAngles.ankleDeg;
      this.left_foot_angle_deg = this.computeFootWorldAngleDeg((this.gait_pct + 50.0) % 100.0, isRun);
    }

    this.thigh_pitch_deg = sensors.imu_thigh?.pitch_deg || this.right_thigh_deg;
    this.shank_pitch_deg = sensors.imu_shank?.pitch_deg || (this.right_thigh_deg - this.right_knee_deg);

    // Live Arm Biomechanics, Joint Angles & Sensor Extraction
    this.shoulder_angle_deg = kin.shoulder_angle_deg ?? this.shoulder_jog_angle_deg ?? 0.0;
    this.shoulder_vel_deg_s = kin.shoulder_velocity_deg_s ?? 0.0;
    this.elbow_angle_deg = kin.elbow_angle_deg ?? this.arm_jog_angle_deg ?? 15.0;
    this.elbow_vel_deg_s = kin.elbow_velocity_deg_s ?? 0.0;

    const armData = telemetry.arm || {};
    this.shoulder_tau_nm = armData.shoulder_torque_nm ?? (Math.sin((this.shoulder_angle_deg * Math.PI) / 180.0) * 12.0);
    this.elbow_tau_nm = armData.elbow_torque_nm ?? (Math.sin((this.elbow_angle_deg * Math.PI) / 180.0) * 6.0);
    this.arm_watts = armData.mechanical_watts ?? 0.0;
    this.arm_emg_rms = sensors.emg_arm?.envelope_rms ?? armData.biceps_emg_rms ?? 0.12;
  }

  render() {
    requestAnimationFrame(() => this.render());

    if (!this.ctx || !this.width || !this.height) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    // =========================================================================
    // 1. Engineering Blueprint Canvas Grid Background
    // =========================================================================
    ctx.save();
    ctx.fillStyle = '#070f1e';
    ctx.fillRect(0, 0, w, h);

    // Subtle 20px Grid
    ctx.strokeStyle = 'rgba(30, 58, 102, 0.22)';
    ctx.lineWidth = 0.6;
    for (let x = 0; x < w; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Top Header Banner
    ctx.font = '700 8.5px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('2D SAGITTAL KINEMATIC & ACTUATOR ENGINEERING SCHEMATIC', 12, 18);

    ctx.font = '500 7.5px monospace';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'right';
    ctx.fillText('SCALE: 1:4 • ISO 13482 COMPLIANT', w - 12, 18);
    ctx.textAlign = 'left';

    // =========================================================================
    // 2. Anatomically Balanced Kinematic Proportions (1:1 Upper/Lower Balance)
    // =========================================================================
    // Prevents legs from appearing excessively long; expands upper body space
    const scale = Math.min(w / 430, h / 470);
    const groundY = h - 34;

    // Harmonized segment lengths:
    // Upper body (torso + neck + head) = 122 + 16 + 38 = 176 * scale
    // Lower body (thigh + shank + foot) = 78 + 78 + 18.5 = 174.5 * scale (perfect 1:1 anatomical balance)
    const thighLen = 78 * scale;
    const shankLen = 78 * scale;
    const footLen = 46 * scale;
    const footHeight = 18.5 * scale;

    const torsoLen = 122 * scale;  // Generous vertical room for all thoracic components
    const upperArmLen = 54 * scale;
    const forearmLen = 48 * scale;
    const handLen = 20 * scale;

    const neckLen = 16 * scale;
    const headR = 19 * scale;

    let hipX = w * 0.44;
    let hipY = 0;

    // Radians for Right Leg (Instrumented Forefront)
    const rightThighRad = (this.right_thigh_deg * Math.PI) / 180.0;
    const rightKneeRad = (this.right_knee_deg * Math.PI) / 180.0;
    const rightShankRad = rightThighRad - rightKneeRad;
    const rightAnkleRad = (this.right_ankle_deg * Math.PI) / 180.0;
    const rightFootAngleRad = (this.right_foot_angle_deg * Math.PI) / 180.0;

    // Radians for Left Leg (Contralateral Background)
    const leftThighRad = (this.left_thigh_deg * Math.PI) / 180.0;
    const leftKneeRad = (this.left_knee_deg * Math.PI) / 180.0;
    const leftShankRad = leftThighRad - leftKneeRad;
    const leftAnkleRad = (this.left_ankle_deg * Math.PI) / 180.0;

    // Precise biomechanical foot world orientation angles (zero glitch / zero disjointed tilt)
    let rightFootRot = 0;
    let leftFootRot = 0;

    if (this.kin_mode === 'SIT_STAND' || this.kin_mode === 'STANDBY') {
      rightFootRot = 0.0;
      leftFootRot = 0.0;
    } else if (this.kin_mode === 'MANUAL_JOG') {
      const jogAnkRad = (this.ankle_jog_angle_deg * Math.PI) / 180.0;
      // Ankle joint is STILL (0 deg): foot rotates solidly with shank as knee flexes and hip elevates
      // In canvas (+X right, +Y down), clockwise shank rotation is (rightKneeRad - rightThighRad).
      rightFootRot = (rightKneeRad - rightThighRad) + jogAnkRad;
      leftFootRot = 0.0;
    } else {
      // Locomotion (WALK / RUN): Seamlessly continuous foot orientation from clinical gait engine
      rightFootRot = ((this.right_foot_angle_deg || 0.0) * Math.PI) / 180.0;
      leftFootRot = ((this.left_foot_angle_deg || 0.0) * Math.PI) / 180.0;
    }

    let trunkLean = 0.04;
    let sitRatio = 0.0;

    // Leg extension deltas (vertical drop from hip to ankle)
    const rightLegDeltaY = thighLen * Math.cos(rightThighRad) + shankLen * Math.cos(rightShankRad);
    const leftLegDeltaY = thighLen * Math.cos(leftThighRad) + shankLen * Math.cos(leftShankRad);

    // Exact foot bottom drops below ankle center under world rotation (heel vs toe)
    const rightFootDrop = Math.max(
      (-18 * scale) * Math.sin(rightFootRot) + footHeight * Math.cos(rightFootRot),
      (46 * scale) * Math.sin(rightFootRot) + footHeight * Math.cos(rightFootRot)
    );
    const leftFootDrop = Math.max(
      (-18 * scale) * Math.sin(leftFootRot) + footHeight * Math.cos(leftFootRot),
      (46 * scale) * Math.sin(leftFootRot) + footHeight * Math.cos(leftFootRot)
    );

    if (this.kin_mode === 'SIT_STAND') {
      // Anchored grounded feet at footPlantedX so feet stay perfectly grounded on floor
      const footPlantedX = w * 0.46;
      const legDeltaX = thighLen * Math.sin(rightThighRad) + shankLen * Math.sin(rightShankRad);
      hipX = footPlantedX - legDeltaX;
      hipY = groundY - footHeight - rightLegDeltaY;

      sitRatio = Math.min(1.0, Math.max(0.0, this.right_knee_deg / 85.0));
      // Natural forward trunk lean (facing right => +lean tilts forward over knees)
      trunkLean = sitRatio * 0.20;
    } else if (this.kin_mode === 'STANDBY' || this.kin_mode === 'REHAB_REACH' || this.kin_mode === 'ARM_REHAB') {
      const maxDrop = Math.max(rightLegDeltaY + footHeight, leftLegDeltaY + footHeight);
      hipY = groundY - maxDrop;
      hipX = w * 0.44;
      trunkLean = 0.02;
    } else if (this.kin_mode === 'MANUAL_JOG') {
      // Left leg provides grounded stance support; right leg is jogged cleanly in the air
      const supportDrop = leftLegDeltaY + footHeight;
      hipY = groundY - supportDrop;
      const rightTotalDrop = rightLegDeltaY + rightFootDrop;
      if (rightTotalDrop > supportDrop) {
        hipY = groundY - rightTotalDrop;
      }
      hipX = w * 0.44;
      trunkLean = 0.02;
    } else {
      // Locomotion (WALK & RUN): Natural inverted-pendulum pelvic trajectory (zero jumping/snapping)
      const isRun = this.kin_mode === 'RUN';
      const bounceAmp = (isRun ? 3.0 : 2.0) * scale;
      const baseHipHeight = (isRun ? 170.0 : 172.3) * scale;
      const pelvicBounce = -Math.cos((this.gait_pct / 100.0) * Math.PI * 4.0) * bounceAmp;
      const sway = Math.sin((this.gait_pct / 100.0) * Math.PI * 2.0) * (4.5 * scale);

      hipY = groundY - baseHipHeight - pelvicBounce;
      hipX = w * 0.44 + sway;
    }

    // Smooth hipY to guarantee zero jitter, pops, or discrete mode switching snaps
    if (this.smoothedHipY === null || isNaN(this.smoothedHipY)) {
      this.smoothedHipY = hipY;
    } else {
      this.smoothedHipY = this.smoothedHipY * 0.75 + hipY * 0.25;
    }
    hipY = this.smoothedHipY;

    // Upper Body Landmark Points (Spine, Neck, Head, Shoulder)
    // Positive trunkLean rotates torso forward (+X, to the right)
    const spineTopX = hipX + torsoLen * Math.sin(trunkLean);
    const spineTopY = hipY - torsoLen * Math.cos(trunkLean);

    const shoulderX = spineTopX + 2 * scale;
    const shoulderY = spineTopY + 12 * scale;

    const neckBaseX = spineTopX;
    const neckBaseY = spineTopY;
    const headX = neckBaseX + neckLen * Math.sin(trunkLean);
    const headY = neckBaseY - neckLen * Math.cos(trunkLean) - headR;

    // Arm Kinematics in Sagittal Plane (Synchronized with 3D MoveAssist3DViewer)
    let rightArmRad = 0;
    let rightElbowRad = -0.18;
    let leftArmRad = 0;
    let leftElbowRad = -0.18;

    if (this.kin_mode === 'MANUAL_JOG') {
      const shoulderRad = -(this.shoulder_jog_angle_deg * Math.PI) / 180.0;
      const elbowRad = -(this.arm_jog_angle_deg * Math.PI) / 180.0;
      rightArmRad = shoulderRad;
      rightElbowRad = elbowRad;
      leftArmRad = shoulderRad;
      leftElbowRad = elbowRad;
    } else if (this.kin_mode === 'REHAB_REACH' || this.kin_mode === 'ARM_REHAB') {
      const reachTime = Date.now() * 0.0024;
      const reachCycle = (Math.sin(reachTime) + 1.0) * 0.5;
      rightArmRad = -(0.25 + reachCycle * 1.10);
      rightElbowRad = -(0.45 + reachCycle * 0.70);
      leftArmRad = rightArmRad;
      leftElbowRad = rightElbowRad;
    } else if (this.kin_mode === 'SIT_STAND') {
      // Bilateral forward reach for dynamic center-of-mass balance during chair transfer (matches 3D)
      rightArmRad = -sitRatio * 0.55;
      rightElbowRad = -(sitRatio * 0.35 + 0.15);
      leftArmRad = rightArmRad;
      leftElbowRad = rightElbowRad;
    } else if (this.kin_mode === 'STANDBY') {
      rightArmRad = -0.04;
      rightElbowRad = -0.16;
      leftArmRad = -0.04;
      leftElbowRad = -0.16;
    } else {
      // Contralateral Arm Swing matching human locomotion (WALK & RUN)
      // When Right Leg (foreground) swings forward (dThigh > 0):
      //   Right Arm (foreground) swings BACKWARD (+rightArmRad)
      //   Left Arm (background) swings FORWARD (-leftArmRad)
      // When Right Leg swings backward (dThigh < 0):
      //   Right Arm swings FORWARD (-rightArmRad)
      //   Left Arm swings BACKWARD (+leftArmRad)
      const isRun = this.kin_mode === 'RUN';
      const dThigh = rightThighRad - 0.07;
      const swingGain = isRun ? 0.75 : 0.45;
      rightArmRad = +dThigh * swingGain;
      leftArmRad = -dThigh * swingGain;
      const rForwardFlex = Math.max(0, -rightArmRad);
      const lForwardFlex = Math.max(0, -leftArmRad);
      if (isRun) {
        // Athletic running arm posture: constant bent elbow (55° to 92° flexion)
        rightElbowRad = -(0.95 + 0.65 * rForwardFlex);
        leftElbowRad = -(0.95 + 0.65 * lForwardFlex);
      } else {
        // Natural walking arm posture: relaxed compliance (10° to 25° flexion)
        rightElbowRad = -(0.18 + 0.52 * rForwardFlex);
        leftElbowRad = -(0.18 + 0.52 * lForwardFlex);
      }
    }

    // Update live visual arm telemetry angles for callout HUDs & charts
    this.shoulder_angle_deg = (this.kin_mode === 'MANUAL_JOG')
      ? this.shoulder_jog_angle_deg
      : Math.round((-rightArmRad * 180.0) / Math.PI * 10) / 10;
    this.elbow_angle_deg = (this.kin_mode === 'MANUAL_JOG')
      ? this.arm_jog_angle_deg
      : Math.round((-rightElbowRad * 180.0) / Math.PI * 10) / 10;

    // Right Arm (Forefront) Joints
    const rightElbowX = shoulderX - upperArmLen * Math.sin(rightArmRad);
    const rightElbowY = shoulderY + upperArmLen * Math.cos(rightArmRad);

    const rightForearmAngle = rightArmRad + rightElbowRad;
    const rightWristX = rightElbowX - forearmLen * Math.sin(rightForearmAngle);
    const rightWristY = rightElbowY + forearmLen * Math.cos(rightForearmAngle);

    const rightHandX = rightWristX - handLen * Math.sin(rightForearmAngle);
    const rightHandY = rightWristY + handLen * Math.cos(rightForearmAngle);

    // Left Arm (Contralateral Background) Joints
    const leftElbowX = shoulderX - upperArmLen * Math.sin(leftArmRad);
    const leftElbowY = shoulderY + upperArmLen * Math.cos(leftArmRad);

    const leftForearmAngle = leftArmRad + leftElbowRad;
    const leftWristX = leftElbowX - forearmLen * Math.sin(leftForearmAngle);
    const leftWristY = leftElbowY + forearmLen * Math.cos(leftForearmAngle);

    // Right Leg Joint Centers
    const rightKneeX = hipX + thighLen * Math.sin(rightThighRad);
    const rightKneeY = hipY + thighLen * Math.cos(rightThighRad);

    const rightAnkleX = rightKneeX + shankLen * Math.sin(rightShankRad);
    const rightAnkleY = rightKneeY + shankLen * Math.cos(rightShankRad);

    // Left Leg Joint Centers
    const leftKneeX = hipX + thighLen * Math.sin(leftThighRad);
    const leftKneeY = hipY + thighLen * Math.cos(leftThighRad);

    const leftAnkleX = leftKneeX + shankLen * Math.sin(leftShankRad);
    const leftAnkleY = leftKneeY + shankLen * Math.cos(leftShankRad);

    // 3. Ground Plane & Rehab Chair
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(15, groundY);
    ctx.lineTo(w - 15, groundY);
    ctx.stroke();

    // Ground hatch lines
    ctx.strokeStyle = 'rgba(30, 41, 69, 0.6)';
    ctx.lineWidth = 1;
    for (let gx = 20; gx < w - 20; gx += 12) {
      ctx.beginPath();
      ctx.moveTo(gx, groundY);
      ctx.lineTo(gx - 8, groundY + 8);
      ctx.stroke();
    }

    // Rehab Chair (Rendered in SIT_STAND mode)
    if (this.kin_mode === 'SIT_STAND') {
      const footPlantedX = w * 0.46;
      const sitMaxThighRad = (75.0 * Math.PI) / 180.0;
      const sitMaxShankRad = (-10.0 * Math.PI) / 180.0;
      const seatedLegDeltaX = (78 * Math.sin(sitMaxThighRad) + 78 * Math.sin(sitMaxShankRad)) * scale;
      const seatedLegDeltaY = (78 * Math.cos(sitMaxThighRad) + 78 * Math.cos(sitMaxShankRad)) * scale;
      const seatedHipX = footPlantedX - seatedLegDeltaX;
      const seatedHipY = groundY - footHeight - seatedLegDeltaY;

      const chairSeatY = seatedHipY + 13 * scale;
      const chairRearX = seatedHipX - 14 * scale;
      const chairFrontX = seatedHipX + 44 * scale;

      // Chair backrest and seat
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      // Slanted ergonomic backrest behind torso/backpack
      ctx.moveTo(chairRearX - 8 * scale, chairSeatY - 60 * scale);
      ctx.lineTo(chairRearX, chairSeatY);
      // Horizontal seat surface supporting pelvis and thighs
      ctx.lineTo(chairFrontX, chairSeatY);
      ctx.stroke();

      // Chair frame & ground legs
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.6)';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      // Rear leg
      ctx.moveTo(chairRearX, chairSeatY);
      ctx.lineTo(chairRearX, groundY);
      // Front leg (clears shank and foot)
      ctx.moveTo(chairFrontX - 2 * scale, chairSeatY);
      ctx.lineTo(chairFrontX - 2 * scale, groundY);
      // Under-seat structural cross brace
      ctx.moveTo(chairRearX, chairSeatY + 14 * scale);
      ctx.lineTo(chairFrontX - 2 * scale, chairSeatY + 14 * scale);
      ctx.stroke();
    }
    ctx.restore();

    // =========================================================================
    // 4. Contralateral Left Arm (Background Sagittal View)
    // =========================================================================
    ctx.save();
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
    ctx.lineWidth = 4 * scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(shoulderX, shoulderY);
    ctx.lineTo(leftElbowX, leftElbowY);
    ctx.lineTo(leftWristX, leftWristY);
    ctx.stroke();

    ctx.fillStyle = '#070f1e';
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(leftElbowX, leftElbowY, 4.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // =========================================================================
    // Helper: Draw Anatomical Human Foot & Articulated Exoskeleton Ankle
    // =========================================================================
    const drawAnkleAndFoot = (ankleX, ankleY, footRot, isForeground = true) => {
      ctx.save();
      ctx.translate(ankleX, ankleY);
      ctx.rotate(footRot);

      const skinFill = isForeground ? 'rgba(15, 23, 42, 0.92)' : 'rgba(15, 23, 42, 0.65)';
      const skinStroke = isForeground ? '#38bdf8' : 'rgba(100, 116, 139, 0.5)';
      const plateFill = '#070f1e';
      const plateStroke = isForeground ? '#06b6d4' : 'rgba(71, 85, 105, 0.5)';
      const accentCyan = isForeground ? '#00e5ff' : 'rgba(6, 182, 212, 0.4)';
      const soleY = 12 * scale;

      // 1. ANATOMICAL HUMAN FOOT SILHOUETTE
      ctx.beginPath();
      ctx.moveTo(3 * scale, -2 * scale);
      ctx.quadraticCurveTo(14 * scale, 3 * scale, 28 * scale, 6 * scale);
      ctx.quadraticCurveTo(38 * scale, 7 * scale, 42 * scale, 9 * scale);
      ctx.quadraticCurveTo(45 * scale, 10.5 * scale, 42 * scale, soleY);
      ctx.lineTo(-12 * scale, soleY);
      ctx.quadraticCurveTo(-16 * scale, soleY, -16 * scale, 7 * scale);
      ctx.quadraticCurveTo(-14 * scale, 2 * scale, -3 * scale, -2 * scale);
      ctx.closePath();

      ctx.fillStyle = skinFill;
      ctx.fill();
      ctx.strokeStyle = skinStroke;
      ctx.lineWidth = isForeground ? 1.6 : 1.2;
      ctx.stroke();

      // Biomechanical internal arch beam
      if (isForeground) {
        ctx.strokeStyle = 'rgba(226, 232, 240, 0.22)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-10 * scale, 8 * scale);
        ctx.lineTo(12 * scale, 7 * scale);
        ctx.lineTo(34 * scale, 9 * scale);
        ctx.stroke();
      }

      // 2. CARBON-FIBER EXOSKELETON FOOTPLATE ORTHOSIS
      ctx.fillStyle = plateFill;
      ctx.strokeStyle = plateStroke;
      ctx.lineWidth = isForeground ? 2.0 : 1.4;
      ctx.beginPath();
      ctx.roundRect(-18 * scale, soleY, 64 * scale, 5 * scale, [1, 2, 2, 1]);
      ctx.fill();
      ctx.stroke();

      // Rubber traction tread cleats under footplate
      ctx.fillStyle = isForeground ? 'rgba(56, 189, 248, 0.4)' : 'rgba(100, 116, 139, 0.3)';
      for (let tx = -14 * scale; tx <= 40 * scale; tx += 8 * scale) {
        ctx.fillRect(tx, soleY + 4.5 * scale, 4.5 * scale, 1.8 * scale);
      }

      // Posterior Calcaneal Heel Retaining Cup
      ctx.strokeStyle = plateStroke;
      ctx.lineWidth = 1.8 * scale;
      ctx.beginPath();
      ctx.moveTo(-18 * scale, soleY);
      ctx.lineTo(-18 * scale, 5 * scale);
      ctx.lineTo(-14 * scale, 5 * scale);
      ctx.stroke();

      // Forefoot Metatarsal Security Strap
      ctx.fillStyle = isForeground ? 'rgba(6, 182, 212, 0.35)' : 'rgba(51, 65, 85, 0.3)';
      ctx.fillRect(18 * scale, 5 * scale, 5 * scale, 7 * scale);
      ctx.strokeStyle = accentCyan;
      ctx.lineWidth = 1;
      ctx.strokeRect(18 * scale, 5 * scale, 5 * scale, 7 * scale);

      // 3. MECHANICAL STIRRUP HINGE BRACKET (Ankle Actuator Hub -> Footplate)
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = isForeground ? '#06b6d4' : 'rgba(71, 85, 105, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-3.5 * scale, -1 * scale, 7 * scale, soleY + 2 * scale, 2);
      ctx.fill();
      ctx.stroke();

      // Pivot pin bolt at footplate anchor
      ctx.fillStyle = accentCyan;
      ctx.beginPath();
      ctx.arc(0, soleY, 1.8 * scale, 0, Math.PI * 2);
      ctx.fill();

      // 4. ROTARY ANKLE BLDC ACTUATOR HUB (Concentric at 0, 0)
      const actR = 8.5 * scale;
      ctx.fillStyle = '#070f1e';
      ctx.strokeStyle = isForeground ? (this.soft_stop_active ? '#fbbf24' : '#06b6d4') : '#334155';
      ctx.lineWidth = isForeground ? 2.0 : 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, actR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Halo accent ring
      ctx.strokeStyle = accentCyan;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, actR * 0.68, 0, Math.PI * 2);
      ctx.stroke();

      // 6 Radial stator bolt dots
      if (isForeground) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        for (let b = 0; b < 6; b++) {
          const bRad = (b * Math.PI) / 3;
          ctx.beginPath();
          ctx.arc((actR - 2.2) * Math.cos(bRad), (actR - 2.2) * Math.sin(bRad), 0.9, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Hardened bearing central spindle
      ctx.fillStyle = isForeground ? '#38bdf8' : '#64748b';
      ctx.beginPath();
      ctx.arc(0, 0, 2.5 * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    // =========================================================================
    // 5. Contralateral Left Leg (Background Sagittal View)
    // =========================================================================
    ctx.save();
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.45)';
    ctx.lineWidth = 7 * scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(leftKneeX, leftKneeY);
    ctx.lineTo(leftAnkleX, leftAnkleY);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
    ctx.lineWidth = 1.8 * scale;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(hipX - 2, hipY + 6);
    ctx.lineTo(leftKneeX - 2, leftKneeY);
    ctx.lineTo(leftAnkleX - 2, leftAnkleY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#070f1e';
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(leftKneeX, leftKneeY, 6 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Left Foot & Articulated Exoskeleton Ankle
    drawAnkleAndFoot(leftAnkleX, leftAnkleY, leftFootRot, false);
    ctx.restore();

    // =========================================================================
    // 6. Biological Body Anatomy (Torso Column, Neck, Head)
    // =========================================================================
    ctx.save();
    // Torso biological column - cleanly rendered with cyber-medical styling
    const torsoGrad = ctx.createLinearGradient(hipX, hipY, spineTopX, spineTopY);
    torsoGrad.addColorStop(0, 'rgba(56, 189, 248, 0.18)');
    torsoGrad.addColorStop(0.5, 'rgba(15, 23, 42, 0.85)');
    torsoGrad.addColorStop(1, 'rgba(56, 189, 248, 0.22)');

    ctx.strokeStyle = torsoGrad;
    ctx.lineWidth = 26 * scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(spineTopX, spineTopY);
    ctx.stroke();

    // Torso core inner column
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = 18 * scale;
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(spineTopX, spineTopY);
    ctx.stroke();

    // Neck
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 9 * scale;
    ctx.beginPath();
    ctx.moveTo(neckBaseX, neckBaseY);
    ctx.lineTo(headX, headY);
    ctx.stroke();

    // Head Mannequin Circle
    ctx.fillStyle = 'rgba(11, 19, 36, 0.92)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(headX, headY, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Visor / Face Direction Slit
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.arc(headX + headR * 0.65, headY - 2 * scale, 3.5 * scale, -0.4, 0.4);
    ctx.stroke();

    // Cranial Neuro-Telemetry Brow Band
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(headX, headY, headR + 2 * scale, -0.4, 0.4);
    ctx.stroke();

    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.arc(headX + (headR + 2 * scale) * Math.cos(0), headY + (headR + 2 * scale) * Math.sin(0), 2.2 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // =========================================================================
    // 7. Articulated Spine & LiFePO4 Backpack Battery Unit
    // =========================================================================
    ctx.save();
    const spineNormX = Math.cos(trunkLean);
    const spineNormY = Math.sin(trunkLean);

    // Spinal load-bearing titanium rail (posterior back)
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2.0 * scale;
    ctx.beginPath();
    ctx.moveTo(hipX - 10 * scale * spineNormX, hipY - 10 * scale * spineNormY);
    ctx.lineTo(spineTopX - 10 * scale * spineNormX, spineTopY - 10 * scale * spineNormY);
    ctx.stroke();

    // 5 Segmented Vertebrae Blocks spaced evenly along the 122px spine
    for (let v = 0; v <= 4; v++) {
      const vT = 0.12 + (v / 4.0) * 0.78;
      const vx = hipX + (spineTopX - hipX) * vT - 10 * scale * spineNormX;
      const vy = hipY + (spineTopY - hipY) * vT - 10 * scale * spineNormY;

      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.roundRect(vx - 7 * scale, vy - 4.5 * scale, 14 * scale, 9 * scale, 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#00e5ff';
      ctx.beginPath();
      ctx.arc(vx, vy, 1.8 * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    // Slim Ergonomic LiFePO4 Battery Backpack (Mounted at mid-thoracic back)
    const bpCenterX = hipX + (spineTopX - hipX) * 0.58 - 18 * scale * spineNormX;
    const bpCenterY = hipY + (spineTopY - hipY) * 0.58 - 18 * scale * spineNormY;

    ctx.fillStyle = '#0b1329';
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(bpCenterX - 10 * scale, bpCenterY - 24 * scale, 20 * scale, 48 * scale, 4);
    ctx.fill();
    ctx.stroke();

    // Dual micro-cooling turbine vents
    ctx.fillStyle = '#070f1e';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(bpCenterX, bpCenterY - 12 * scale, 4.5 * scale, 0, Math.PI * 2);
    ctx.arc(bpCenterX, bpCenterY + 12 * scale, 4.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 4 Green Battery Level Indicator LEDs
    for (let lb = 0; lb < 4; lb++) {
      ctx.fillStyle = '#10b981';
      ctx.fillRect(bpCenterX - 5 * scale, bpCenterY - 5 * scale + lb * 3.5 * scale, 10 * scale, 1.8 * scale);
    }
    ctx.restore();

    // =========================================================================
    // 8. Thoracic Chest Harness & Glenohumeral Shoulder Actuator
    // =========================================================================
    ctx.save();
    // Anterior chest armor plate
    const chestX = spineTopX + 11 * scale * spineNormX;
    const chestY = spineTopY + 11 * scale * spineNormY;
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(chestX - 5 * scale, chestY - 4 * scale, 10 * scale, 32 * scale, 3);
    ctx.fill();
    ctx.stroke();

    // Glenohumeral Shoulder Rotary BLDC Actuator Pod
    ctx.fillStyle = '#0b1329';
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(shoulderX, shoulderY, 9 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.arc(shoulderX, shoulderY, 3.2 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Deltoid Armor Cowling Arc
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(shoulderX, shoulderY, 12 * scale, -Math.PI * 0.75, Math.PI * 0.25);
    ctx.stroke();
    ctx.restore();

    // =========================================================================
    // 9. Foreground Right Arm Exoskeleton (Shoulder -> Elbow -> Hand)
    // =========================================================================
    ctx.save();
    // Upper arm bone outline
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.25)';
    ctx.lineWidth = 6 * scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(shoulderX, shoulderY);
    ctx.lineTo(rightElbowX, rightElbowY);
    ctx.stroke();

    // Upper arm carbon-fiber spar
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2.2 * scale;
    ctx.beginPath();
    ctx.moveTo(shoulderX + 1, shoulderY);
    ctx.lineTo(rightElbowX + 1, rightElbowY);
    ctx.stroke();

    // Rotary Elbow BLDC Actuator
    ctx.fillStyle = '#0b1329';
    ctx.strokeStyle = this.soft_stop_active ? '#fbbf24' : '#06b6d4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(rightElbowX, rightElbowY, 8 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.arc(rightElbowX, rightElbowY, 2.8 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Forearm Bone & Linkage
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.25)';
    ctx.lineWidth = 5 * scale;
    ctx.beginPath();
    ctx.moveTo(rightElbowX, rightElbowY);
    ctx.lineTo(rightWristX, rightWristY);
    ctx.stroke();

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.8 * scale;
    ctx.beginPath();
    ctx.moveTo(rightElbowX + 1, rightElbowY);
    ctx.lineTo(rightWristX + 1, rightWristY);
    ctx.stroke();

    // Wrist Joint & Hand Splints
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(rightWristX, rightWristY, 3.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1.8 * scale;
    ctx.beginPath();
    ctx.moveTo(rightWristX, rightWristY);
    ctx.lineTo(rightHandX, rightHandY);
    ctx.stroke();

    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.arc(rightHandX, rightHandY, 2 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // =========================================================================
    // 10. Biological Muscle Action Lines (Biolink overlay on Right Leg)
    // =========================================================================
    ctx.save();
    const emgAlpha = Math.min(1.0, 0.25 + this.emg_env * 1.5);
    const activeMuscleColor = this.soft_stop_active
      ? `rgba(251, 191, 36, ${emgAlpha})`
      : `rgba(244, 63, 94, ${emgAlpha})`;

    // Anterior: Quadriceps / Patellar Tendon line
    ctx.strokeStyle = activeMuscleColor;
    ctx.lineWidth = 2.2 + this.emg_env * 3.0;
    ctx.beginPath();
    ctx.moveTo(hipX + 10 * Math.cos(rightThighRad), hipY + 10 * Math.sin(rightThighRad));
    const patellaX = rightKneeX + 14 * Math.cos(rightThighRad - Math.PI / 2);
    const patellaY = rightKneeY + 14 * Math.sin(rightThighRad - Math.PI / 2);
    ctx.lineTo(patellaX, patellaY);
    ctx.lineTo(rightKneeX + 18 * Math.sin(rightShankRad), rightKneeY + 24 * Math.cos(rightShankRad));
    ctx.stroke();

    // Posterior: Hamstrings tendon line
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.35)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(hipX - 9 * Math.cos(rightThighRad), hipY - 9 * Math.sin(rightThighRad));
    ctx.lineTo(rightKneeX - 12 * Math.cos(rightThighRad - Math.PI / 2), rightKneeY - 12 * Math.sin(rightThighRad - Math.PI / 2));
    ctx.lineTo(rightKneeX - 10 * Math.sin(rightShankRad), rightKneeY + 24 * Math.cos(rightShankRad));
    ctx.stroke();
    ctx.restore();

    // =========================================================================
    // 11. Biological Bones & Exoskeleton Linkages (Right Leg)
    // =========================================================================
    ctx.save();
    // Femur
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.25)';
    ctx.lineWidth = 9 * scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(rightKneeX, rightKneeY);
    ctx.stroke();

    // Tibia
    ctx.beginPath();
    ctx.moveTo(rightKneeX, rightKneeY);
    ctx.lineTo(rightAnkleX, rightAnkleY);
    ctx.stroke();

    // Thigh Exoskeleton Cuff & Strut
    ctx.lineWidth = 5 * scale;
    ctx.strokeStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(hipX + 3, hipY + 8);
    ctx.lineTo(rightKneeX + 3, rightKneeY);
    ctx.stroke();

    ctx.lineWidth = 1.8 * scale;
    ctx.strokeStyle = '#06b6d4';
    ctx.beginPath();
    ctx.moveTo(hipX + 3, hipY + 8);
    ctx.lineTo(rightKneeX + 3, rightKneeY);
    ctx.stroke();

    // Shank Brace & Telescopic Strut
    ctx.lineWidth = 5 * scale;
    ctx.strokeStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(rightKneeX + 2, rightKneeY);
    ctx.lineTo(rightAnkleX + 2, rightAnkleY);
    ctx.stroke();

    ctx.lineWidth = 1.8 * scale;
    ctx.strokeStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(rightKneeX + 2, rightKneeY);
    ctx.lineTo(rightAnkleX + 2, rightAnkleY);
    ctx.stroke();

    // Telescopic graduation ticks on shank
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    for (let t = 0.25; t <= 0.75; t += 0.1) {
      const tx = rightKneeX + (rightAnkleX - rightKneeX) * t;
      const ty = rightKneeY + (rightAnkleY - rightKneeY) * t;
      const perpX = Math.cos(rightShankRad);
      const perpY = -Math.sin(rightShankRad);
      ctx.beginPath();
      ctx.moveTo(tx - 2.5 * perpX, ty - 2.5 * perpY);
      ctx.lineTo(tx + 2.5 * perpX, ty + 2.5 * perpY);
      ctx.stroke();
    }
    ctx.restore();

    // =========================================================================
    // 12. Pelvis & Hip Pivot Assembly
    // =========================================================================
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(hipX, hipY, 10 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(hipX, hipY, 3.5 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Pelvic Crest Bracket
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(hipX - 16 * scale, hipY - 14 * scale);
    ctx.lineTo(hipX + 14 * scale, hipY - 14 * scale);
    ctx.lineTo(hipX, hipY);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // =========================================================================
    // 13. Rotary Knee BLDC Actuator (Detailed Module)
    // =========================================================================
    ctx.save();
    const actR = 19 * scale;

    ctx.fillStyle = '#0b1329';
    ctx.strokeStyle = this.soft_stop_active ? '#fbbf24' : '#06b6d4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(rightKneeX, rightKneeY, actR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Actuator Radial Bolt Circle
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    for (let i = 0; i < 8; i++) {
      const bAng = (i * Math.PI) / 4;
      const bx = rightKneeX + (actR - 3.2) * Math.cos(bAng);
      const by = rightKneeY + (actR - 3.2) * Math.sin(bAng);
      ctx.beginPath();
      ctx.arc(bx, by, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Encoder Ring
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(rightKneeX, rightKneeY, actR - 6 * scale, 0, Math.PI * 2);
    ctx.stroke();

    // Knee Physiological ROM Sector (0 to 120 deg)
    const refExtAng = rightThighRad + Math.PI / 2;
    const maxFlexAng = refExtAng - (120 * Math.PI) / 180.0;

    ctx.save();
    ctx.fillStyle = 'rgba(6, 182, 212, 0.12)';
    ctx.beginPath();
    ctx.moveTo(rightKneeX, rightKneeY);
    ctx.arc(rightKneeX, rightKneeY, actR + 6 * scale, Math.min(refExtAng, maxFlexAng), Math.max(refExtAng, maxFlexAng));
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Actuator Core & Torque Ring
    const tauPct = Math.min(1.0, Math.abs(this.tau_cmd_nm) / 35.0);
    const glowColor = this.soft_stop_active
      ? '#fbbf24'
      : (this.tau_cmd_nm > 0 ? '#10b981' : '#a855f7');

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 1.5 + tauPct * 2.5;
    ctx.beginPath();
    ctx.arc(rightKneeX, rightKneeY, actR * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Center shaft
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(rightKneeX, rightKneeY, 2.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // =========================================================================
    // 14. Perfect Anatomical Foot & Articulated Rotary Ankle Actuator
    // =========================================================================
    drawAnkleAndFoot(rightAnkleX, rightAnkleY, rightFootRot, true);

    // =========================================================================
    // 15. Dynamic Ground Reaction Force (vGRF) Vectors & FSR Markers
    // =========================================================================
    ctx.save();
    const isStance = (this.kin_mode === 'MANUAL_JOG') ? (this.right_knee_deg < 5.0) : (this.kin_mode === 'SIT_STAND' || this.kin_mode === 'STANDBY' || (this.gait_pct < 55.0));
    const maxGrfH = 38 * scale;
    const cosFoot = Math.cos(rightFootRot);
    const sinFoot = Math.sin(rightFootRot);
    const soleDist = 12 * scale;

    const heelSensorX = rightAnkleX + (-10 * scale) * cosFoot - soleDist * sinFoot;
    const heelSensorY = rightAnkleY + (-10 * scale) * sinFoot + soleDist * cosFoot;

    const metaSensorX = rightAnkleX + (18 * scale) * cosFoot - soleDist * sinFoot;
    const metaSensorY = rightAnkleY + (18 * scale) * sinFoot + soleDist * cosFoot;

    const toeSensorX = rightAnkleX + (38 * scale) * cosFoot - soleDist * sinFoot;
    const toeSensorY = rightAnkleY + (38 * scale) * sinFoot + soleDist * cosFoot;

    const drawGrfVector = (x, y, forceN, label, color) => {
      if (!isStance) return;
      const arrowH = Math.min(maxGrfH, (forceN / 400.0) * maxGrfH);
      if (arrowH > 2) {
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y - arrowH);
        ctx.stroke();
        // Arrowhead
        ctx.beginPath();
        ctx.moveTo(x, y - arrowH - 2);
        ctx.lineTo(x - 2.5, y - arrowH + 2);
        ctx.lineTo(x + 2.5, y - arrowH + 2);
        ctx.closePath();
        ctx.fill();

        ctx.font = '600 6.5px monospace';
        ctx.fillText(`${Math.round(forceN)}N`, x - 7, y - arrowH - 4);
      }
      ctx.fillStyle = forceN > 15 ? color : '#334155';
      ctx.beginPath();
      ctx.arc(x, y, 2.5 * scale, 0, Math.PI * 2);
      ctx.fill();
    };

    drawGrfVector(heelSensorX, heelSensorY, this.fsr_heel, 'HEEL', '#10b981');
    drawGrfVector(metaSensorX, metaSensorY, this.fsr_meta, 'META', '#06b6d4');
    drawGrfVector(toeSensorX, toeSensorY, this.fsr_toe, 'TOE', '#38bdf8');
    ctx.restore();

    // =========================================================================
    // 16. Center of Mass (COM) Markers
    // =========================================================================
    ctx.save();
    const drawCom = (x, y) => {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 3.5 * scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 4 * scale, y);
      ctx.lineTo(x + 4 * scale, y);
      ctx.moveTo(x, y - 4 * scale);
      ctx.lineTo(x, y + 4 * scale);
      ctx.stroke();
    };

    const comThighX = hipX + (rightKneeX - hipX) * 0.433;
    const comThighY = hipY + (rightKneeY - hipY) * 0.433;
    drawCom(comThighX, comThighY);

    const comShankX = rightKneeX + (rightAnkleX - rightKneeX) * 0.433;
    const comShankY = rightKneeY + (rightAnkleY - rightKneeY) * 0.433;
    drawCom(comShankX, comShankY);
    ctx.restore();

    // =========================================================================
    // 17. REARRANGED HORIZONTAL ENGINEERING CALLOUTS & CLEAN LEADER LINES
    // =========================================================================
    // Callouts are vertically distributed to match their target joints horizontally.
    // Eliminates crossed diagonal lines, clutter, and "mix" in the upper body!
    ctx.save();
    const leftW = Math.min(125, Math.max(98, w * 0.25));
    const rightW = Math.min(150, Math.max(120, w * 0.30));
    const rightX = w - rightW - 10;

    const drawCallout = (x, y, width, height, title, rows, targetX, targetY, isLeft) => {
      // Box Background
      ctx.fillStyle = 'rgba(11, 19, 36, 0.94)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.32)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, 4);
      ctx.fill();
      ctx.stroke();

      // Header Bar
      ctx.fillStyle = 'rgba(6, 182, 212, 0.12)';
      ctx.fillRect(x, y, width, 13);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.beginPath();
      ctx.moveTo(x, y + 13);
      ctx.lineTo(x + width, y + 13);
      ctx.stroke();

      // Title Text
      ctx.font = '700 7.5px monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(title, x + 5, y + 9.5);

      // Rows Text
      let rowY = y + 22;
      rows.forEach(r => {
        ctx.font = r.bold ? '700 7px monospace' : '500 6.5px monospace';
        ctx.fillStyle = r.color || '#94a3b8';
        ctx.fillText(r.text, x + 5, rowY);
        rowY += 9.5;
      });

      // Horizontal Leader Line directly to Target
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();

      const startX = isLeft ? (x + width) : x;
      const startY = y + height * 0.5;
      const elbowX = isLeft ? (startX + 8) : (startX - 8);

      ctx.moveTo(startX, startY);
      ctx.lineTo(elbowX, startY);
      ctx.lineTo(targetX, targetY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Anchor Dot
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(targetX, targetY, 2.2, 0, Math.PI * 2);
      ctx.fill();
    };

    // --- LEFT COLUMN CALLOUTS (Anatomical & Dorsal Chain) ---

    // 1. Spine & Battery Unit (Top Left)
    drawCallout(10, 26, leftW, 36, 'SPINE & POWER PACK', [
      { text: 'Vertebrae: 5 Segments', color: '#38bdf8', bold: true },
      { text: 'Batt: 4-Cell LiFePO4', color: '#10b981' }
    ], bpCenterX, bpCenterY, true);

    // 2. Hip / Pelvis Harness (Upper-Mid Left)
    drawCallout(10, 74, leftW, 36, 'HIP / PELVIS', [
      { text: `θ_hip: ${(this.right_thigh_deg || 0).toFixed(1)}°`, color: '#38bdf8', bold: true },
      { text: `Phase: ${this.gait_pct.toFixed(0)}%`, color: '#64748b' }
    ], hipX, hipY, true);

    // 3. Thigh Segment & Femur (Mid Left)
    drawCallout(10, 122, leftW, 44, 'THIGH SEGMENT', [
      { text: 'COM: 4.4kg (43%)', color: '#fbbf24' },
      { text: `IMU: ${(this.thigh_pitch_deg || 0).toFixed(1)}° pitch`, color: '#38bdf8' },
      { text: 'Femur 42cm', color: '#64748b' }
    ], comThighX, comThighY, true);

    // 4. Shank Segment & Tibia (Mid-Lower Left)
    drawCallout(10, 178, leftW, 44, 'SHANK SEGMENT', [
      { text: 'COM: 3.3kg (43%)', color: '#fbbf24' },
      { text: `IMU: ${(this.shank_pitch_deg || 0).toFixed(1)}° pitch`, color: '#38bdf8' },
      { text: 'Tibia 42cm', color: '#64748b' }
    ], comShankX, comShankY, true);

    // 5. Ankle & Footplate (Lower Left)
    const ankleJointDeg = (this.right_ankle_deg || 0).toFixed(1);
    const ankleState = (this.kin_mode === 'MANUAL_JOG')
      ? 'Ankle Still (Hold)'
      : (this.kin_mode === 'SIT_STAND' || this.kin_mode === 'STANDBY')
      ? 'Level Grounded Stance'
      : (this.gait_pct >= 55.0 ? 'Level Swing Clearance' : (this.right_foot_angle_deg < -2.0 ? 'Heel Strike Landing' : (this.right_foot_angle_deg > 3.0 ? 'Toe Push-Off' : 'Foot Flat Stance')));

    drawCallout(10, 234, leftW, 44, 'ANKLE & FOOTPLATE', [
      { text: `Ankle Joint: ${ankleJointDeg}°`, color: '#38bdf8', bold: true },
      { text: `Foot Pitch: ${(this.right_foot_angle_deg || 0).toFixed(1)}°`, color: '#06b6d4' },
      { text: ankleState, color: '#10b981' }
    ], rightAnkleX, rightAnkleY, true);

    // 6. Tri-Zone vGRF Sensor Array (Bottom Left)
    drawCallout(10, 288, leftW, 36, 'TRI-ZONE vGRF ARRAY', [
      { text: `Total GRF: ${Math.round(this.vgrf_n)} N`, color: '#10b981', bold: true },
      { text: 'Heel/Meta/Toe FSR', color: '#64748b' }
    ], metaSensorX, metaSensorY, true);

    // --- RIGHT COLUMN CALLOUTS (Actuator & Engineering Drive) ---

    // 1. Glenohumeral Shoulder Actuator (Top Right - Horizontal to Shoulder)
    const shoulderAngleStr = (this.shoulder_angle_deg || 0).toFixed(1);
    const shoulderVelStr = (this.shoulder_vel_deg_s || 0).toFixed(1);
    const shoulderTauStr = `${(this.shoulder_tau_nm || 0) >= 0 ? '+' : ''}${(this.shoulder_tau_nm || 0).toFixed(1)} N·m`;
    const shoulderTauColor = (this.shoulder_tau_nm || 0) >= 0 ? '#10b981' : '#a855f7';
    const armPowerW = (this.arm_watts || 0).toFixed(1);

    drawCallout(rightX, 18, rightW, 58, 'SHOULDER ACTUATOR & ARM', [
      { text: `Elevation: ${shoulderAngleStr}°`, color: '#38bdf8', bold: true },
      { text: `Velocity: ${shoulderVelStr}°/s`, color: '#94a3b8' },
      { text: `τ_shoulder: ${shoulderTauStr}`, color: shoulderTauColor, bold: true },
      { text: `Arm Power: ${armPowerW} W`, color: '#06b6d4' }
    ], shoulderX, shoulderY, false);

    // 2. Elbow Actuator & Forearm (Upper-Mid Right - Horizontal to Elbow)
    const elbowAngleStr = (this.elbow_angle_deg || 0).toFixed(1);
    const elbowVelStr = (this.elbow_vel_deg_s || 0).toFixed(1);
    const elbowTauStr = `${(this.elbow_tau_nm || 0) >= 0 ? '+' : ''}${(this.elbow_tau_nm || 0).toFixed(1)} N·m`;
    const elbowTauColor = (this.elbow_tau_nm || 0) >= 0 ? '#10b981' : '#a855f7';
    const elbowCounts = Math.round((Math.abs(this.elbow_angle_deg || 0) % 360) * 4096 / 360);

    drawCallout(rightX, 80, rightW, 58, 'ELBOW ACTUATOR & FOREARM', [
      { text: `Flexion: ${elbowAngleStr}°`, color: '#38bdf8', bold: true },
      { text: `Velocity: ${elbowVelStr}°/s`, color: '#94a3b8' },
      { text: `τ_elbow: ${elbowTauStr}`, color: elbowTauColor, bold: true },
      { text: `Encoder: 12-bit (${elbowCounts} cts)`, color: '#06b6d4' }
    ], rightElbowX, rightElbowY, false);

    // 3. Biomechanical Muscle Drive (Mid Right - Horizontal to Thigh Muscle)
    const legEmgVal = (this.emg_env || 0).toFixed(2);
    const armEmgVal = (this.arm_emg_rms || 0).toFixed(2);

    drawCallout(rightX, 142, rightW, 50, 'BIOMECHANICAL DRIVE', [
      { text: `Leg (Quad): ${legEmgVal} RMS`, color: '#10b981', bold: true },
      { text: `Arm (Biceps): ${armEmgVal} RMS`, color: '#38bdf8', bold: true },
      { text: `Mode: ${this.kin_mode || 'WALK'}`, color: '#fbbf24' }
    ], patellaX, patellaY, false);

    // 4. Rotary Knee Actuator & Encoder (Mid-Lower Right - DIRECTLY HORIZONTAL TO KNEE!)
    const kneeAngleSingleSource = (this.right_knee_deg || 0).toFixed(1);
    const torqueStr = `${(this.tau_cmd_nm || 0) >= 0 ? '+' : ''}${(this.tau_cmd_nm || 0).toFixed(1)} N·m`;
    const torqueColor = (this.tau_cmd_nm || 0) >= 0 ? '#10b981' : '#a855f7';

    drawCallout(rightX, 196, rightW, 72, 'KNEE ACTUATOR & JOINT', [
      { text: `Flexion: ${kneeAngleSingleSource}°`, color: '#38bdf8', bold: true },
      { text: `Velocity: ${(this.omega_knee_deg_s || 0).toFixed(1)}°/s`, color: '#94a3b8' },
      { text: `τ_exo: ${torqueStr}`, color: torqueColor, bold: true },
      { text: 'Encoder: 12-bit (0.088°)', color: '#06b6d4' },
      { text: 'Safe ROM: 0° - 120° (Strict Lock)', color: '#64748b' }
    ], rightKneeX, rightKneeY, false);

    // 5. Rotary Ankle Actuator & Stance Lock (Bottom Right - Horizontal to Ankle)
    if (this.soft_stop_active) {
      drawCallout(rightX, 280, rightW, 44, 'ANTI-FALL STANCE LOCK', [
        { text: '+18.0 N·m STANCE HOLD', color: '#fbbf24', bold: true },
        { text: `${Math.round(this.soft_stop_rem_s)}s Decel Ramp`, color: '#fbbf24' },
        { text: 'Safe Stance Enforced', color: '#10b981' }
      ], rightAnkleX, rightAnkleY, false);
    } else {
      drawCallout(rightX, 280, rightW, 44, 'ANKLE ACTUATOR & HINGE', [
        { text: `Joint Angle: ${(this.right_ankle_deg || 0).toFixed(1)}°`, color: '#38bdf8', bold: true },
        { text: 'Articulated Carbon Footplate', color: '#10b981' },
        { text: 'Anti-Buckle Support Ready', color: '#64748b' }
      ], rightAnkleX, rightAnkleY, false);
    }

    // Gait Status Pill at bottom right
    const pillX = w - 120;
    const pillY = h - 24;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, 110, 18, 4);
    ctx.fill();
    ctx.stroke();

    ctx.font = '700 7px monospace';
    ctx.fillStyle = this.gait_phase === 'SWING' ? '#a855f7' : '#10b981';
    ctx.fillText(`GAIT: ${this.gait_phase} (${this.gait_pct.toFixed(0)}%)`, pillX + 6, pillY + 11.5);
    ctx.restore();
  }
}

window.MoveAssist2DSchematic = MoveAssist2DSchematic;
