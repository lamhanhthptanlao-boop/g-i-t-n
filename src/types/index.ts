export type GameMode =
  // 10 Live Professional Gameshow Modes
  | 'gameshow_live'    // 1. Gameshow truyền hình trực tiếp
  | 'lottery_drum'     // 2. Máy rút thăm điện tử 3D
  | 'wheel_3d'         // 3. Vòng quay vật lý mô phỏng 3D
  | 'sealed_envelope'  // 4. Phong bì niêm phong bí mật
  | 'high_speed_reel'  // 5. Bảng tên cuộn tốc độ cao
  | 'countdown_stage'  // 6. Đếm ngược sân khấu 3-2-1
  | 'hologram_card'    // 7. Thẻ tên hologram 3D
  | 'virtual_mc'       // 8. MC ảo công bố kết quả
  | 'gashapon_machine' // 9. Máy viên nang bí mật
  | 'camera_gesture'   // 10. Điều khiển bằng cử chỉ camera
  // 5 Folk Games (Trò chơi dân gian 3D)
  | 'catch_duck'
  | 'catch_chicken'
  | 'steal_egg'
  | 'blind_goat'
  | 'xoc_dia'
  // Legacy alias
  | 'wheel'
  | 'gift'
  | 'gameshow'
  | 'rocket'
  | 'magic_hat'
  | 'bubbles'
  | 'treasure'
  | 'robot';

export type FireworksSpeed = 'slow' | 'normal' | 'fast' | 'super';

export interface GameshowSettings {
  duration: number; // 2, 4, 6 seconds
  dramaLevel: 'quick' | 'standard' | 'dramatic';
  enableTTS: boolean; // Voice reading of student name
  reducedMotion: boolean;
  fireworksSpeed: FireworksSpeed; // 'slow' (0.7x), 'normal' (1.0x), 'fast' (1.4x), 'super' (2.0x)
  fireworksDuration: number; // 3, 5, 8, 12 seconds
  voiceURI?: string; // Selected Vietnamese voice URI
  voiceRate?: number; // 0.85, 1.0, 1.15
  voicePitch?: number; // 0.9, 1.0, 1.1
}

export type CallMode = 'no_repeat' | 'allow_repeat';

export type ThemeMode = 'cute' | 'gameshow';

export interface Student {
  id: string;
  name: string;
  called: boolean;
  callCount: number;
  lastCalledAt?: number;
  seatRow?: number;
  seatCol?: number;
}

export interface CallHistoryItem {
  id: string;
  studentId: string;
  studentName: string;
  timestamp: number;
  order: number;
  mode: GameMode;
}

export interface GestureEvent {
  gesture: 'wave' | 'thumbs_up' | 'open_palm' | 'peace' | 'fist' | 'none';
  label: string;
  confidence: number;
}
