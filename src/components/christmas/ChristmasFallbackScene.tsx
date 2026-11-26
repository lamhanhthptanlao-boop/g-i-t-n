import React, { useMemo, useState } from 'react';
import { ChristmasMiniGameId, Student } from '../../types';

interface ChristmasFallbackSceneProps {
  miniGame: ChristmasMiniGameId;
  students: Student[];
  isPicking: boolean;
  selectedStudents: Student[];
  isGiftOpened: boolean;
  starBurstKey: number;
}

const ORNAMENT_COLORS = [
  'from-rose-500 to-red-700 border-amber-300',
  'from-emerald-400 to-green-700 border-amber-200',
  'from-sky-400 to-blue-700 border-amber-200',
  'from-amber-400 to-orange-600 border-yellow-200',
  'from-fuchsia-500 to-purple-700 border-pink-200',
];

const LifelikeChristmasTreeArt: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 360 440"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="xmasPineLight" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#2e8b57" />
        <stop offset="100%" stopColor="#0e4a2b" />
      </linearGradient>
      <linearGradient id="xmasPineDark" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#1b6b41" />
        <stop offset="100%" stopColor="#09301b" />
      </linearGradient>
      <linearGradient id="xmasGoldRibbon" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#d97706" />
        <stop offset="50%" stopColor="#fde047" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>
    </defs>

    {/* Trunk & Snow Mound */}
    <ellipse cx="180" cy="402" rx="135" ry="26" fill="#e2e8f0" opacity="0.92" />
    <rect x="160" y="340" width="40" height="58" rx="6" fill="#5c3a21" />

    {/* Layered Feathered Pine Boughs (bottom to top) */}
    <path
      d="M180 218 L44 352 Q72 344 88 358 Q115 344 134 360 Q162 346 180 362 Q198 346 226 360 Q245 344 272 358 Q288 344 316 352 Z"
      fill="url(#xmasPineDark)"
    />
    <path
      d="M180 176 L64 306 Q92 298 106 312 Q132 298 148 312 Q168 300 180 314 Q192 300 212 312 Q228 298 254 312 Q268 298 296 306 Z"
      fill="url(#xmasPineLight)"
    />
    <path
      d="M180 134 L82 256 Q106 248 122 260 Q144 248 160 260 Q174 250 180 262 Q186 250 200 260 Q216 248 238 260 Q254 248 278 256 Z"
      fill="url(#xmasPineDark)"
    />
    <path
      d="M180 96 L104 206 Q124 200 138 210 Q158 198 180 210 Q202 198 222 210 Q236 200 256 206 Z"
      fill="url(#xmasPineLight)"
    />
    <path
      d="M180 60 L126 156 Q144 150 156 160 Q170 150 180 160 Q190 150 204 160 Q216 150 234 156 Z"
      fill="url(#xmasPineDark)"
    />
    <path
      d="M180 32 L148 108 Q164 102 180 112 Q196 102 212 108 Z"
      fill="url(#xmasPineLight)"
    />

    {/* Soft Snow Dusting on Pine Tips */}
    <path d="M56 348 Q80 338 98 348" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
    <path d="M262 348 Q282 338 304 348" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
    <path d="M90 250 Q112 242 128 252" stroke="#f8fafc" strokeWidth="3.5" strokeLinecap="round" opacity="0.75" />
    <path d="M232 252 Q250 242 270 250" stroke="#f8fafc" strokeWidth="3.5" strokeLinecap="round" opacity="0.75" />

    {/* Sweeping Golden Silk Ribbon Garlands */}
    <path d="M142 128 Q182 152 218 122" stroke="url(#xmasGoldRibbon)" strokeWidth="7" strokeLinecap="round" />
    <path d="M116 184 Q180 222 244 176" stroke="url(#xmasGoldRibbon)" strokeWidth="8.5" strokeLinecap="round" />
    <path d="M94 244 Q180 292 266 236" stroke="url(#xmasGoldRibbon)" strokeWidth="10" strokeLinecap="round" />
    <path d="M70 306 Q180 364 290 296" stroke="url(#xmasGoldRibbon)" strokeWidth="11" strokeLinecap="round" />

    {/* Twinkling Fairy Lights */}
    {[
      [164, 96, '#fde047'],
      [198, 108, '#f43f5e'],
      [142, 156, '#38bdf8'],
      [212, 162, '#fde047'],
      [178, 178, '#4ade80'],
      [118, 224, '#f43f5e'],
      [238, 222, '#38bdf8'],
      [158, 242, '#fde047'],
      [204, 248, '#f472b6'],
      [96, 294, '#fde047'],
      [256, 292, '#4ade80'],
      [142, 316, '#f43f5e'],
      [216, 318, '#fde047'],
    ].map(([cx, cy, col], idx) => (
      <circle key={idx} cx={cx as number} cy={cy as number} r="5.5" fill={col as string} />
    ))}

    {/* Golden 5-Point Star Topper */}
    <polygon
      points="180,4 188,24 210,25 192,38 198,58 180,46 162,58 168,38 150,25 172,24"
      fill="#fde047"
      stroke="#f59e0b"
      strokeWidth="2.5"
    />

    {/* Colorful Wrapped Gifts Under the Tree */}
    <rect x="86" y="366" width="44" height="36" rx="4" fill="#dc2626" />
    <rect x="104" y="366" width="8" height="36" fill="#fde047" />
    <rect x="134" y="372" width="38" height="30" rx="4" fill="#2563eb" />
    <rect x="149" y="372" width="8" height="30" fill="#fde047" />
    <rect x="192" y="364" width="48" height="38" rx="4" fill="#f59e0b" />
    <rect x="212" y="364" width="8" height="38" fill="#be185d" />
    <rect x="244" y="374" width="34" height="28" rx="4" fill="#16a34a" />
    <rect x="257" y="374" width="7" height="28" fill="#fde047" />
  </svg>
);

export const ChristmasFallbackScene: React.FC<ChristmasFallbackSceneProps> = ({
  miniGame,
  students,
  isPicking,
  selectedStudents,
  isGiftOpened,
  starBurstKey,
}) => {
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const selectedIds = useMemo(
    () => new Set(selectedStudents.map((s) => s.id)),
    [selectedStudents]
  );

  const snowflakes = useMemo(
    () =>
      Array.from({ length: 42 }, (_, idx) => ({
        id: idx,
        left: `${(idx * 23) % 100}%`,
        size: 6 + (idx % 4) * 3,
        duration: `${7 + (idx % 6) * 2.1}s`,
        delay: `${-((idx * 1.3) % 11)}s`,
        opacity: 0.45 + (idx % 4) * 0.14,
      })),
    []
  );

  const skyStars = useMemo(
    () =>
      Array.from({ length: 34 }, (_, idx) => ({
        id: idx,
        left: `${(idx * 37 + 11) % 98}%`,
        top: `${(idx * 19 + 4) % 44}%`,
        delay: `${(idx % 5) * 0.45}s`,
        size: idx % 3 === 0 ? 4 : 2.5,
      })),
    []
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const nx = (e.clientX / window.innerWidth - 0.5) * 2;
    const ny = (e.clientY / window.innerHeight - 0.5) * 2;
    setParallax({ x: nx, y: ny });
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className="absolute inset-0 overflow-hidden select-none bg-[#07112b]"
    >
      {/* Cozy Snowy Christmas Village Street Depth Layer */}
      <img
        src="/assets/aistudio/image_736fc4b4.png"
        alt="Snowy Christmas Village"
        referrerPolicy="no-referrer"
        style={{
          transform: `translate3d(${parallax.x * -10}px, ${parallax.y * -6}px, 0) scale(1.06)`,
        }}
        className="absolute inset-0 w-full h-full object-cover opacity-55 transition-transform duration-200 pointer-events-none"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#07112b]/88 via-[#0e2047]/62 to-[#09152e]/85 pointer-events-none" />

      {/* Twinkling Starry Sky */}
      {skyStars.map((st) => (
        <span
          key={st.id}
          style={{
            left: st.left,
            top: st.top,
            width: st.size,
            height: st.size,
            animationDelay: st.delay,
          }}
          className="absolute rounded-full bg-amber-100 animate-xmas-twinkle pointer-events-none"
        />
      ))}

      {/* Moon */}
      <div
        style={{
          transform: `translate3d(${parallax.x * -10}px, ${parallax.y * -6}px, 0)`,
        }}
        className="absolute top-14 left-10 sm:left-24 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-amber-100 via-yellow-200 to-amber-300 shadow-[0_0_55px_rgba(254,240,138,0.65)] transition-transform duration-200"
      />

      {/* Central Mini-Game Stage Visuals */}
      <div className="relative z-10 w-full h-full flex items-center justify-center px-4 pt-16 pb-28">
        {/* GAME 1: SANTA'S VILLAGE */}
        {miniGame === 'village' && (
          <div className="w-full max-w-5xl flex flex-col items-center">
            <LifelikeChristmasTreeArt className="w-32 sm:w-40 h-auto mb-2 drop-shadow-[0_12px_24px_rgba(0,0,0,0.65)] animate-xmas-bob" />
            <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 max-h-[48vh] overflow-y-auto px-2 py-2">
              {students.map((st, idx) => {
                const isSelected = selectedIds.has(st.id);
                return (
                  <div
                    key={st.id}
                    style={{ animationDelay: `${(idx % 6) * 0.15}s` }}
                    className={`relative flex flex-col items-center px-3 py-2 rounded-2xl border-2 transition-all duration-300 ${
                      isSelected
                        ? 'bg-rose-700 border-yellow-300 scale-115 shadow-[0_0_32px_rgba(253,224,71,0.85)] z-20'
                        : st.called
                        ? 'bg-emerald-950/92 border-emerald-400/75'
                        : 'bg-slate-900/92 border-slate-400/55'
                    } ${isPicking ? 'animate-xmas-bob' : ''}`}
                  >
                    {isSelected && !isPicking && (
                      <div className="absolute -top-12 w-16 h-12 bg-gradient-to-b from-amber-200/60 to-transparent pointer-events-none" />
                    )}
                    <span className="text-2xl sm:text-3xl mb-0.5">
                      {idx % 3 === 0 ? '🧝' : idx % 3 === 1 ? '☃️' : '🏠'}
                    </span>
                    <span
                      className={`text-xs sm:text-sm font-extrabold whitespace-nowrap ${
                        isSelected ? 'text-yellow-200' : 'text-white'
                      }`}
                    >
                      {st.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* GAME 2: CHRISTMAS TREE */}
        {miniGame === 'tree' && (
          <div className="w-full max-w-5xl flex flex-col md:flex-row items-center justify-center gap-4 sm:gap-6">
            <LifelikeChristmasTreeArt className="w-44 sm:w-56 md:w-64 h-auto shrink-0 drop-shadow-[0_16px_32px_rgba(0,0,0,0.7)]" />
            <div className="flex flex-wrap items-center justify-center gap-2.5 max-h-[48vh] overflow-y-auto p-4 rounded-3xl bg-slate-950/78 border-2 border-amber-300/35 shadow-2xl">
              {students.map((st, idx) => {
                const isSelected = selectedIds.has(st.id);
                const palette = ORNAMENT_COLORS[idx % ORNAMENT_COLORS.length];
                return (
                  <div
                    key={st.id}
                    className={`flex flex-col items-center transition-all duration-300 ${
                      isSelected ? 'scale-125 z-20' : isPicking ? 'animate-xmas-bob' : ''
                    }`}
                  >
                    <div
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br ${palette} border-2 flex items-center justify-center shadow-lg ${
                        isSelected
                          ? 'ring-4 ring-yellow-300 shadow-[0_0_28px_rgba(253,224,71,0.9)]'
                          : ''
                      }`}
                    >
                      <span className="text-base">✨</span>
                    </div>
                    <span
                      className={`mt-1 px-2.5 py-0.5 rounded-lg text-xs font-extrabold whitespace-nowrap border ${
                        isSelected
                          ? 'bg-rose-700 border-yellow-300 text-yellow-200'
                          : st.called
                          ? 'bg-emerald-950/95 border-emerald-400 text-emerald-100'
                          : 'bg-slate-950/92 border-slate-500 text-white'
                      }`}
                    >
                      {st.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* GAME 3: SANTA'S GIFT */}
        {miniGame === 'santa_gift' && (
          <div className="flex flex-col items-center justify-center">
            <div
              className={`relative w-44 h-40 sm:w-56 sm:h-48 rounded-2xl bg-gradient-to-br from-rose-600 to-red-800 border-4 border-amber-300 shadow-[0_20px_50px_rgba(220,38,38,0.55)] flex items-center justify-center transition-transform duration-500 ${
                isPicking ? 'animate-suspense-shake' : isGiftOpened ? 'scale-105' : 'animate-xmas-bob'
              }`}
            >
              {/* Gold Ribbons */}
              <div className="absolute inset-y-0 w-7 bg-amber-300/95" />
              <div className="absolute inset-x-0 h-7 bg-amber-300/95" />
              {/* Lid */}
              <div
                className={`absolute -top-6 inset-x-[-8px] h-10 rounded-xl bg-gradient-to-r from-red-600 via-rose-500 to-red-600 border-4 border-amber-300 transition-transform duration-500 origin-bottom ${
                  isGiftOpened ? '-translate-y-8 -rotate-12' : ''
                }`}
              >
                <div className="absolute left-1/2 -translate-x-1/2 -top-5 text-3xl">🎀</div>
              </div>
              <span className="relative z-10 text-5xl sm:text-6xl">
                {isGiftOpened ? '🌟' : '🎁'}
              </span>
            </div>
          </div>
        )}

        {/* Star Burst Overlay for Game 5 */}
        {starBurstKey > 0 && (
          <div
            key={starBurstKey}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
          >
            <div className="text-7xl animate-xmas-star-pop">🌟✨⭐✨🌟</div>
          </div>
        )}
      </div>

      {/* Continuous Snowfall Foreground */}
      {snowflakes.map((flake) => (
        <div
          key={flake.id}
          style={{
            left: flake.left,
            width: flake.size,
            height: flake.size,
            opacity: flake.opacity,
            animationDuration: flake.duration,
            animationDelay: flake.delay,
          }}
          className="absolute top-0 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)] animate-xmas-snow pointer-events-none z-20"
        />
      ))}
    </div>
  );
};
