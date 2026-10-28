/**
 * Real-time Hand Gesture Recognition Engine
 * Runs completely client-side in the browser via WebCam and Canvas Computer Vision.
 */

export type RecognizedGesture =
  | 'finger_1'
  | 'finger_2'
  | 'finger_3'
  | 'finger_4'
  | 'finger_5'
  | 'wave'
  | 'thumbs_up'
  | 'open_palm'
  | 'peace'
  | 'fist'
  | 'none';

export interface GestureDetectionResult {
  gesture: RecognizedGesture;
  fingerCount?: number;
  label: string;
  confidence: number;
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

  // Tracking history for wave and gesture stabilization
  private centroidHistory: Array<{ x: number; y: number; time: number }> = [];
  private lastTriggeredTime: number = 0;
  private cooldownMs: number = 1800; // prevent rapid re-trigger
  private candidateGesture: RecognizedGesture = 'none';
  private candidateStartTime: number = 0;
  private stableHoldRequiredMs: number = 400; // hold gesture for 400ms to confirm

  private onGestureCallback: ((result: GestureDetectionResult) => void) | null = null;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 160;
    this.canvas.height = 120;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
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
    if (!this.isRunning || !this.video || !this.ctx || !this.canvas) return;

    if (this.video.readyState >= 2) {
      this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
      const frameData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      const detection = this.processFrame(frameData);

      if (this.onGestureCallback) {
        this.onGestureCallback(detection);
      }
    }

    this.animationId = requestAnimationFrame(this.loop);
  };

  /**
   * Fast real-time skin & motion segmentation for gesture detection
   */
  private processFrame(imageData: ImageData): GestureDetectionResult {
    const { width, height, data } = imageData;
    const now = performance.now();

    let skinPixelCount = 0;
    let sumX = 0;
    let sumY = 0;
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;

    // Scan central 75% interactive region to avoid edge background noise
    const startX = Math.floor(width * 0.12);
    const endX = Math.floor(width * 0.88);
    const startY = Math.floor(height * 0.1);
    const endY = Math.floor(height * 0.9);

    // Grid step for performance
    const step = 2;
    for (let y = startY; y < endY; y += step) {
      for (let x = startX; x < endX; x += step) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Normalized RGB skin color heuristic (works across various lighting & skin tones)
        const isSkin =
          r > 75 &&
          g > 40 &&
          b > 25 &&
          r > g &&
          r > b &&
          r - g > 15 &&
          Math.abs(r - g) > 15 &&
          r - b > 15;

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

    const minRequiredPixels = 120;
    if (skinPixelCount < minRequiredPixels) {
      return { gesture: 'none', label: 'Không thấy tay', confidence: 0 };
    }

    const centerX = sumX / skinPixelCount;
    const centerY = sumY / skinPixelCount;
    const boxW = Math.max(10, maxX - minX);
    const boxH = Math.max(10, maxY - minY);
    const aspectRatio = boxW / boxH; // width / height
    const density = skinPixelCount / ((boxW * boxH) / (step * step));

    // Update centroid trajectory history (keep last 12 frames ~ 400ms)
    this.centroidHistory.push({ x: centerX, y: centerY, time: now });
    if (this.centroidHistory.length > 15) {
      this.centroidHistory.shift();
    }

    // 1. WAVE DETECTION (Vẫy tay)
    // Check horizontal oscillatory motion
    let isWave = false;
    if (this.centroidHistory.length >= 8) {
      let dirChanges = 0;
      let lastDir = 0;
      let maxDx = 0;
      for (let i = 1; i < this.centroidHistory.length; i++) {
        const dx = this.centroidHistory[i].x - this.centroidHistory[i - 1].x;
        maxDx = Math.max(maxDx, Math.abs(dx));
        const dir = dx > 1.2 ? 1 : dx < -1.2 ? -1 : 0;
        if (dir !== 0 && dir !== lastDir) {
          dirChanges++;
          lastDir = dir;
        }
      }
      if (dirChanges >= 3 && maxDx > 3) {
        isWave = true;
      }
    }

    // 2. FINGER TOP ANALYSIS (Vertical profile of top 35% of bounding box)
    const topBandHeight = Math.floor(boxH * 0.35);
    const colProfiles: number[] = [];

    for (let x = minX; x <= maxX; x += step) {
      let columnSkinCount = 0;
      for (let y = minY; y <= minY + topBandHeight; y += step) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        if (r > 75 && g > 40 && b > 25 && r > g && r > b) {
          columnSkinCount++;
        }
      }
      colProfiles.push(columnSkinCount);
    }

    // Smooth column profile with a 3-tap moving average
    const smoothedProfiles: number[] = [];
    for (let i = 0; i < colProfiles.length; i++) {
      const prev = colProfiles[Math.max(0, i - 1)];
      const curr = colProfiles[i];
      const next = colProfiles[Math.min(colProfiles.length - 1, i + 1)];
      smoothedProfiles.push((prev + curr + next) / 3);
    }

    // Detect distinct peaks with minimum valley separation
    const minPeakHeight = Math.max(2, Math.floor((topBandHeight / step) * 0.25));
    const minSeparationCols = Math.max(2, Math.floor(colProfiles.length * 0.12));
    let detectedPeakIndices: number[] = [];

    for (let i = 1; i < smoothedProfiles.length - 1; i++) {
      if (
        smoothedProfiles[i] >= minPeakHeight &&
        smoothedProfiles[i] >= smoothedProfiles[i - 1] &&
        smoothedProfiles[i] >= smoothedProfiles[i + 1]
      ) {
        // Check distance to previous peak
        if (
          detectedPeakIndices.length === 0 ||
          i - detectedPeakIndices[detectedPeakIndices.length - 1] >= minSeparationCols
        ) {
          detectedPeakIndices.push(i);
        }
      }
    }

    const numFingers = detectedPeakIndices.length;

    let detected: RecognizedGesture = 'none';
    let fingerCount: number | undefined = undefined;
    let label = 'Đang nhận diện cử chỉ...';
    let confidence = 0.5;

    if (isWave) {
      detected = 'wave';
      fingerCount = 1;
      label = '👋 Vẫy tay (Chọn 1 bạn)';
      confidence = 0.88;
    } else if (numFingers === 1 || (aspectRatio < 0.65 && boxH > 30 && density < 0.65)) {
      // 1 single upright finger (index finger or tall shape)
      detected = 'finger_1';
      fingerCount = 1;
      label = '☝️ Giơ 1 ngón -> Chọn 1 bạn';
      confidence = 0.85;
    } else if (numFingers === 2 || (aspectRatio >= 0.55 && aspectRatio <= 1.05 && numFingers === 2)) {
      // 2 fingers (peace / victory / 2 fingers)
      detected = 'finger_2';
      fingerCount = 2;
      label = '✌️ Giơ 2 ngón -> Chọn 2 bạn';
      confidence = 0.85;
    } else if (numFingers === 3) {
      // 3 fingers
      detected = 'finger_3';
      fingerCount = 3;
      label = '🤟 Giơ 3 ngón -> Chọn 3 bạn';
      confidence = 0.84;
    } else if (numFingers === 4) {
      // 4 fingers
      detected = 'finger_4';
      fingerCount = 4;
      label = '🖖 Giơ 4 ngón -> Chọn 4 bạn';
      confidence = 0.83;
    } else if (numFingers >= 5 || (aspectRatio >= 0.75 && numFingers >= 4 && density < 0.58)) {
      // 5 fingers / Open palm
      detected = 'finger_5';
      fingerCount = 5;
      label = '🖐️ Giơ 5 ngón -> Chọn 5 bạn';
      confidence = 0.85;
    } else if (density > 0.65 && numFingers <= 1 && aspectRatio > 0.7 && aspectRatio < 1.3) {
      // High density compact blob -> Fist
      detected = 'fist';
      fingerCount = 1;
      label = '✊ Nắm tay (Đếm ngược 3-2-1)';
      confidence = 0.8;
    } else if (centerY < minY + boxH * 0.45 && aspectRatio < 0.75) {
      // Thumb pointing up
      detected = 'thumbs_up';
      fingerCount = 1;
      label = '👍 Giơ ngón cái -> Chọn 1 bạn';
      confidence = 0.8;
    }

    // Stabilization filter to prevent flicker & auto-cooldown
    if (detected !== 'none') {
      if (this.candidateGesture !== detected) {
        this.candidateGesture = detected;
        this.candidateStartTime = now;
      } else {
        const holdDuration = now - this.candidateStartTime;
        if (holdDuration >= this.stableHoldRequiredMs) {
          // Gesture is stable! Check cooldown
          if (now - this.lastTriggeredTime > this.cooldownMs) {
            this.lastTriggeredTime = now;
            return {
              gesture: detected,
              fingerCount,
              label,
              confidence,
              box: { x: minX, y: minY, width: boxW, height: boxH },
            };
          }
        }
      }
    } else {
      this.candidateGesture = 'none';
    }

    return {
      gesture: 'none',
      fingerCount,
      label: detected !== 'none' ? `Giữ nguyên (${label})` : 'Sẵn sàng nhận diện',
      confidence: 0.3,
      box: { x: minX, y: minY, width: boxW, height: boxH },
    };
  }
}

export const gestureDetector = new HandGestureDetector();
