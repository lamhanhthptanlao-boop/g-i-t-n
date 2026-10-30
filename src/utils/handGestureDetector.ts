/**
 * Real-time AI Hand Gesture Recognition Engine
 * Powered by Google MediaPipe Hands with Fallback Computer Vision,
 * 6-State Machine, 8-10 Frame Hold Confirmation, and Mandatory Hand-Lowering Reset.
 */

export type CameraHandState =
  | 'no_hand'              // Không phát hiện bàn tay
  | 'waiting_gesture'      // Đang chờ cử chỉ bàn tay (chưa xòe ngón)
  | 'detecting_hand'       // Đang nhận diện bàn tay
  | 'confirming_gesture'   // Đang xác nhận cử chỉ (X ngón)... Giữ yên 8-10 frame
  | 'confirmed'            // Đã nhận diện thành công: Giơ X ngón!
  | 'locked_cooldown'      // Đang khóa chống nhận diện lặp (2-3 giây)
  | 'waiting_hand_lowered'; // Chờ hạ tay xuống để sẵn sàng cho lượt tiếp theo

export type RecognizedGesture =
  | 'finger_1'
  | 'finger_2'
  | 'finger_3'
  | 'finger_4'
  | 'finger_5'
  | 'wave'
  | 'none';

export interface HandLandmark {
  x: number;
  y: number;
  z?: number;
}

export interface GestureDetectionResult {
  state: CameraHandState;
  gesture: RecognizedGesture;
  fingerCount?: number;       // ONLY defined when confirmed and ready to trigger
  previewCount: number;       // Currently stabilized tentative finger count
  isHandRaised: boolean;      // True ONLY when a hand is genuinely raised in camera view
  consecutiveFrames: number;  // Current consecutive stable frames (0 to REQUIRED_FRAMES)
  requiredFrames: number;     // 8 to 10 frames
  confirmProgress: number;    // 0 to 1 progress of holding steady before confirming
  cooldownRemainingMs: number;// Milliseconds remaining in cooldown
  confidence: number;         // 0 to 100% confidence
  label: string;              // Descriptive Vietnamese status
  landmarks?: HandLandmark[]; // 21 3D landmarks for augmented reality skeleton
  box?: { x: number; y: number; width: number; height: number };
}

export class HandGestureDetector {
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private stream: MediaStream | null = null;
  private animationId: number | null = null;
  private isRunning: boolean = false;
  private facingMode: 'user' | 'environment' = 'user';

  // MediaPipe Hands instance
  private mediaPipeHands: any = null;
  private isMediaPipeReady: boolean = false;
  private isMediaPipeProcessing: boolean = false;

  // Throttling to 20 FPS (50ms) for high stability & low CPU
  private lastProcessTime: number = 0;
  private processIntervalMs: number = 50;

  // 1. Frame verification & Temporal Smoothing (8-10 consecutive frames requirement)
  private readonly REQUIRED_CONSECUTIVE_FRAMES = 8; // 8 consecutive frames (~400ms at 20fps)
  private candidateFingerCount: number = 0;
  private consecutiveFrameCount: number = 0;
  private jitterToleranceCount: number = 0; // tolerance for 1 momentary frame glitch

  // 2. State Machine & Anti-repeat Cooldown
  private currentState: CameraHandState = 'no_hand';
  private lastTriggerTime: number = 0;
  private readonly COOLDOWN_DURATION_MS = 2500; // 2.5 seconds lock after trigger
  private mustLowerHandToReset: boolean = false;
  private framesWithNoHand: number = 0;

  private onGestureCallback: ((result: GestureDetectionResult) => void) | null = null;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 320;
    this.canvas.height = 240;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.initMediaPipe();
  }

  /**
   * Initialize MediaPipe Hands if loaded from CDN
   */
  private initMediaPipe() {
    if (typeof window === 'undefined') return;

    const checkMediaPipe = () => {
      const win = window as any;
      if (win.Hands) {
        try {
          this.mediaPipeHands = new win.Hands({
            locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
          });

          this.mediaPipeHands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.75,
            minTrackingConfidence: 0.75,
          });

          this.mediaPipeHands.onResults((results: any) => {
            this.handleMediaPipeResults(results);
            this.isMediaPipeProcessing = false;
          });

          this.isMediaPipeReady = true;
        } catch (e) {
          console.warn('MediaPipe Hands init deferred:', e);
        }
      } else {
        setTimeout(checkMediaPipe, 250);
      }
    };

    checkMediaPipe();
  }

  public setOnGesture(cb: (result: GestureDetectionResult) => void) {
    this.onGestureCallback = cb;
  }

  public async startCamera(videoElement: HTMLVideoElement, facing: 'user' | 'environment' = 'user'): Promise<boolean> {
    this.stopCamera();
    this.facingMode = facing;
    this.video = videoElement;

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: this.facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = this.stream;
      await this.video.play();
      this.isRunning = true;
      this.resetState();
      this.loop();
      return true;
    } catch (err) {
      console.error('Camera access failed:', err);
      return false;
    }
  }

  public stopCamera() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
      this.video = null;
    }
    this.resetState();
  }

  public resetState() {
    this.currentState = 'no_hand';
    this.candidateFingerCount = 0;
    this.consecutiveFrameCount = 0;
    this.jitterToleranceCount = 0;
    this.mustLowerHandToReset = false;
    this.framesWithNoHand = 0;
    this.isMediaPipeProcessing = false;
  }

  public toggleFacingMode(videoElement: HTMLVideoElement): Promise<boolean> {
    const nextFacing = this.facingMode === 'user' ? 'environment' : 'user';
    return this.startCamera(videoElement, nextFacing);
  }

  public getFacingMode() {
    return this.facingMode;
  }

  public isActive() {
    return this.isRunning;
  }

  private loop = () => {
    if (!this.isRunning || !this.video) return;

    const now = performance.now();
    if (now - this.lastProcessTime >= this.processIntervalMs && this.video.readyState >= 2) {
      this.lastProcessTime = now;

      // Primary: Use MediaPipe Hands if ready
      if (this.isMediaPipeReady && this.mediaPipeHands && !this.isMediaPipeProcessing) {
        this.isMediaPipeProcessing = true;
        this.mediaPipeHands.send({ image: this.video }).catch(() => {
          this.isMediaPipeProcessing = false;
        });
      } else if (!this.isMediaPipeReady && this.ctx && this.canvas) {
        // Fallback: fast pixel segmentation while MediaPipe loads
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        const frameData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const detection = this.processFallbackFrame(frameData, now);

        if (this.onGestureCallback) {
          this.onGestureCallback(detection);
        }
      }
    }

    this.animationId = requestAnimationFrame(this.loop);
  };

  /**
   * Process results from Google MediaPipe Hands Neural Network (21 3D Landmarks)
   */
  private handleMediaPipeResults(results: any) {
    if (!this.isRunning || !this.onGestureCallback) return;
    const now = performance.now();

    const landmarksList = results.multiHandLandmarks;

    // 1. Hand Absent / Lowered Check
    if (!landmarksList || landmarksList.length === 0) {
      this.framesWithNoHand++;
      // If hand has been absent for at least 4 frames (~200ms), unlock mustLowerHandToReset
      if (this.framesWithNoHand >= 4) {
        this.mustLowerHandToReset = false;
      }

      this.consecutiveFrameCount = 0;
      this.candidateFingerCount = 0;
      this.currentState = 'no_hand';

      this.onGestureCallback({
        state: 'no_hand',
        gesture: 'none',
        previewCount: 1,
        isHandRaised: false,
        consecutiveFrames: 0,
        requiredFrames: this.REQUIRED_CONSECUTIVE_FRAMES,
        confirmProgress: 0,
        cooldownRemainingMs: 0,
        confidence: 0,
        label: '✋ Không phát hiện bàn tay – Hãy giơ tay trước camera',
      });
      return;
    }

    // Hand detected!
    this.framesWithNoHand = 0;
    const landmarks: HandLandmark[] = landmarksList[0];

    // 2. Anti-repeat cooldown & Mandatory Hand Lowering
    const timeSinceLastTrigger = now - this.lastTriggerTime;
    if (timeSinceLastTrigger < this.COOLDOWN_DURATION_MS) {
      const cooldownRemaining = Math.max(0, this.COOLDOWN_DURATION_MS - timeSinceLastTrigger);
      this.currentState = 'locked_cooldown';
      this.onGestureCallback({
        state: 'locked_cooldown',
        gesture: 'none',
        previewCount: this.candidateFingerCount || 1,
        isHandRaised: true,
        consecutiveFrames: 0,
        requiredFrames: this.REQUIRED_CONSECUTIVE_FRAMES,
        confirmProgress: 0,
        cooldownRemainingMs: Math.round(cooldownRemaining),
        confidence: 95,
        label: `🔒 Đang khóa chống lặp (${(cooldownRemaining / 1000).toFixed(1)}s)...`,
        landmarks,
      });
      return;
    }

    if (this.mustLowerHandToReset) {
      this.currentState = 'waiting_hand_lowered';
      this.onGestureCallback({
        state: 'waiting_hand_lowered',
        gesture: 'none',
        previewCount: this.candidateFingerCount || 1,
        isHandRaised: true,
        consecutiveFrames: 0,
        requiredFrames: this.REQUIRED_CONSECUTIVE_FRAMES,
        confirmProgress: 0,
        cooldownRemainingMs: 0,
        confidence: 92,
        label: '⬇️ Vui lòng hạ tay xuống để sẵn sàng cho lượt tiếp theo!',
        landmarks,
      });
      return;
    }

    // 3. Hand Elevation Check (Wrist or fingers must be elevated)
    const wrist = landmarks[0];
    const middleTip = landmarks[12];
    const isHandElevated = middleTip.y < 0.75 || wrist.y < 0.85;

    if (!isHandElevated) {
      this.consecutiveFrameCount = 0;
      this.currentState = 'waiting_gesture';
      this.onGestureCallback({
        state: 'waiting_gesture',
        gesture: 'none',
        previewCount: 1,
        isHandRaised: false,
        consecutiveFrames: 0,
        requiredFrames: this.REQUIRED_CONSECUTIVE_FRAMES,
        confirmProgress: 0,
        cooldownRemainingMs: 0,
        confidence: 60,
        label: '✋ Hãy giơ tay lên cao trước camera để bắt đầu',
        landmarks,
      });
      return;
    }

    // 4. Mathematical Finger Extension Recognition using 3D Vectors
    // Distance from wrist to tip vs wrist to PIP (invariant to rotation and angle)
    const isExtended = (tipIdx: number, pipIdx: number): boolean => {
      const tip = landmarks[tipIdx];
      const pip = landmarks[pipIdx];
      const distTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
      const distPip = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
      return distTip > distPip * 1.15;
    };

    const isIndex = isExtended(8, 6);
    const isMiddle = isExtended(12, 10);
    const isRing = isExtended(16, 14);
    const isPinky = isExtended(20, 18);

    // Thumb Abduction Check: Distance from Thumb Tip (4) to Pinky MCP (17) vs Thumb IP (3) to Pinky MCP (17)
    const thumbTip = landmarks[4];
    const thumbIP = landmarks[3];
    const pinkyMCP = landmarks[17];
    const distThumbTip = Math.hypot(thumbTip.x - pinkyMCP.x, thumbTip.y - pinkyMCP.y);
    const distThumbIP = Math.hypot(thumbIP.x - pinkyMCP.x, thumbIP.y - pinkyMCP.y);
    const isThumb = distThumbTip > distThumbIP * 1.25;

    // Count extended fingers
    let fingerCount =
      (isIndex ? 1 : 0) +
      (isMiddle ? 1 : 0) +
      (isRing ? 1 : 0) +
      (isPinky ? 1 : 0) +
      (isThumb ? 1 : 0);

    // Bounding Box calculation
    let minX = 1;
    let maxX = 0;
    let minY = 1;
    let maxY = 0;
    for (const pt of landmarks) {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }

    const box = {
      x: Math.round(minX * (this.video?.videoWidth || 640)),
      y: Math.round(minY * (this.video?.videoHeight || 480)),
      width: Math.round((maxX - minX) * (this.video?.videoWidth || 640)),
      height: Math.round((maxY - minY) * (this.video?.videoHeight || 480)),
    };

    // If 0 fingers extended (fist or resting)
    if (fingerCount === 0) {
      this.consecutiveFrameCount = 0;
      this.currentState = 'waiting_gesture';
      this.onGestureCallback({
        state: 'waiting_gesture',
        gesture: 'none',
        previewCount: 1,
        isHandRaised: true,
        consecutiveFrames: 0,
        requiredFrames: this.REQUIRED_CONSECUTIVE_FRAMES,
        confirmProgress: 0,
        cooldownRemainingMs: 0,
        confidence: 85,
        label: '✋ Đang chờ cử chỉ – Hãy xòe từ 1 đến 5 ngón tay',
        landmarks,
        box,
      });
      return;
    }

    // 5. Temporal Smoothing & Consecutive Frame Counter (8-10 Frames Hold)
    if (this.candidateFingerCount === fingerCount) {
      this.consecutiveFrameCount++;
      this.jitterToleranceCount = 0;
    } else {
      // 1-frame jitter tolerance
      if (this.consecutiveFrameCount >= 3 && this.jitterToleranceCount === 0) {
        this.jitterToleranceCount++;
      } else {
        this.candidateFingerCount = fingerCount;
        this.consecutiveFrameCount = 1;
        this.jitterToleranceCount = 0;
      }
    }

    const confirmProgress = Math.min(1, this.consecutiveFrameCount / this.REQUIRED_CONSECUTIVE_FRAMES);
    const iconMap = ['☝️', '✌️', '🤟', '🖖', '🖐️'];
    const currentIcon = iconMap[fingerCount - 1] || '🖐️';

    // 6. Holding verification
    if (this.consecutiveFrameCount < this.REQUIRED_CONSECUTIVE_FRAMES) {
      this.currentState = 'confirming_gesture';
      this.onGestureCallback({
        state: 'confirming_gesture',
        gesture: 'none',
        previewCount: fingerCount,
        isHandRaised: true,
        consecutiveFrames: this.consecutiveFrameCount,
        requiredFrames: this.REQUIRED_CONSECUTIVE_FRAMES,
        confirmProgress,
        cooldownRemainingMs: 0,
        confidence: 96,
        label: `${currentIcon} Đang xác nhận giơ ${fingerCount} ngón (${this.consecutiveFrameCount}/${this.REQUIRED_CONSECUTIVE_FRAMES} frame)... Giữ yên tay!`,
        landmarks,
        box,
      });
      return;
    }

    // --- TRIGGER CONFIRMED EVENT ---
    this.currentState = 'confirmed';
    this.lastTriggerTime = now;
    this.mustLowerHandToReset = true; // MUST LOWER HAND BEFORE NEXT ROUND
    this.consecutiveFrameCount = 0;

    const gestureType: RecognizedGesture =
      fingerCount === 1
        ? 'finger_1'
        : fingerCount === 2
        ? 'finger_2'
        : fingerCount === 3
        ? 'finger_3'
        : fingerCount === 4
        ? 'finger_4'
        : 'finger_5';

    this.onGestureCallback({
      state: 'confirmed',
      gesture: gestureType,
      fingerCount,
      previewCount: fingerCount,
      isHandRaised: true,
      consecutiveFrames: this.REQUIRED_CONSECUTIVE_FRAMES,
      requiredFrames: this.REQUIRED_CONSECUTIVE_FRAMES,
      confirmProgress: 1,
      cooldownRemainingMs: this.COOLDOWN_DURATION_MS,
      confidence: 99,
      label: `🎉 ${currentIcon} ĐÃ XÁC NHẬN: Chọn chính xác ${fingerCount} học sinh!`,
      landmarks,
      box,
    });
  }

  /**
   * Fallback pixel segmentation (active only while MediaPipe loads from CDN)
   */
  private processFallbackFrame(imageData: ImageData, now: number): GestureDetectionResult {
    const { width, height, data } = imageData;

    let skinPixelCount = 0;
    let sumX = 0;
    let sumY = 0;
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;

    for (let y = 10; y < height - 10; y += 3) {
      for (let x = 10; x < width - 10; x += 3) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Broad, lighting-adaptive skin condition
        const isSkin =
          r > 70 &&
          g > 40 &&
          b > 25 &&
          r > g &&
          r > b &&
          r - g >= 8 &&
          r - b >= 8;

        if (isSkin) {
          skinPixelCount++;
          sumX += x;
          sumY += y;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (skinPixelCount < 120) {
      this.consecutiveFrameCount = 0;
      return {
        state: 'no_hand',
        gesture: 'none',
        previewCount: 1,
        isHandRaised: false,
        consecutiveFrames: 0,
        requiredFrames: this.REQUIRED_CONSECUTIVE_FRAMES,
        confirmProgress: 0,
        cooldownRemainingMs: 0,
        confidence: 0,
        label: '✋ Đang kết nối AI MediaPipe Hands...',
      };
    }

    return {
      state: 'detecting_hand',
      gesture: 'none',
      previewCount: this.candidateFingerCount || 1,
      isHandRaised: true,
      consecutiveFrames: 0,
      requiredFrames: this.REQUIRED_CONSECUTIVE_FRAMES,
      confirmProgress: 0,
      cooldownRemainingMs: 0,
      confidence: 70,
      label: '⏳ Đang khởi tạo AI nhận diện bàn tay MediaPipe...',
      box: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
    };
  }
}

export const gestureDetector = new HandGestureDetector();
