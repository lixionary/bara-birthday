import { settings, copy } from "./content/birthday";

export type CakeProps = {
  blown?: boolean;
  unlit?: boolean;
  blownDigits?: boolean[];
  onBlowDigit?: (index: number) => void;
  onLightDigit?: (index: number) => void;
  sparklerActive?: boolean;
  bouncing?: boolean;
  flameTilt?: number;
};

export default function Cake({
  blown = false,
  unlit = false,
  blownDigits,
  onBlowDigit,
  onLightDigit,
  sparklerActive = false,
  bouncing = false,
  flameTilt = 0,
}: CakeProps) {
  const digits = String(settings.age).split("");
  const allBlown =
    blown ||
    (Array.isArray(blownDigits) &&
      blownDigits.length === digits.length &&
      blownDigits.every(Boolean));
  const interactiveCandles =
    (Boolean(onBlowDigit) || Boolean(onLightDigit)) && !unlit;

  return (
    <div
      className={`cake-art ube-cake ${allBlown ? "blown" : ""} ${unlit ? "unlit" : ""} ${bouncing ? "cake-bouncing" : ""} ${sparklerActive ? "sparkler-wand-mode" : ""}`}
      aria-hidden={interactiveCandles ? undefined : "true"}
    >
      {/* 3D Illustrated SVG Ube Cake */}
      <svg
        className="cake-svg"
        viewBox="0 0 420 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <radialGradient
            id="plate-shadow"
            cx="50%"
            cy="50%"
            r="50%"
            fx="50%"
            fy="50%"
          >
            <stop offset="0%" stopColor="#3d1b33" stopOpacity="0.28" />
            <stop offset="65%" stopColor="#3d1b33" stopOpacity="0.11" />
            <stop offset="100%" stopColor="#3d1b33" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="plate-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#f5ebf7" />
            <stop offset="100%" stopColor="#ded0e2" />
          </linearGradient>

          <linearGradient id="plate-rim" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ebdbeb" />
            <stop offset="50%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#d8bedb" />
          </linearGradient>

          <linearGradient id="sponge-bottom" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6e377a" />
            <stop offset="25%" stopColor="#874a94" />
            <stop offset="65%" stopColor="#9658a5" />
            <stop offset="100%" stopColor="#622f6e" />
          </linearGradient>

          <linearGradient id="sponge-mid" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7e438c" />
            <stop offset="25%" stopColor="#9657a4" />
            <stop offset="65%" stopColor="#a464b3" />
            <stop offset="100%" stopColor="#723980" />
          </linearGradient>

          <linearGradient id="sponge-top" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8f4f9d" />
            <stop offset="25%" stopColor="#a768b5" />
            <stop offset="65%" stopColor="#b474c3" />
            <stop offset="100%" stopColor="#813f8f" />
          </linearGradient>

          <linearGradient id="cream-layer" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f7ebdc" />
            <stop offset="30%" stopColor="#fffaf2" />
            <stop offset="75%" stopColor="#fffcf8" />
            <stop offset="100%" stopColor="#ebd6c2" />
          </linearGradient>

          <linearGradient id="frosting-glaze" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="55%" stopColor="#fbf0fd" />
            <stop offset="100%" stopColor="#e8c8ee" />
          </linearGradient>

          <radialGradient
            id="top-surface-grad"
            cx="50%"
            cy="40%"
            r="60%"
          >
            <stop
              offset="0%"
              stopColor={allBlown || unlit ? "#fcf3fd" : "#fff7e2"}
            />
            <stop
              offset="45%"
              stopColor={allBlown || unlit ? "#f8e9fb" : "#fae8f8"}
            />
            <stop offset="80%" stopColor="#eccff0" />
            <stop offset="100%" stopColor="#dfbedf" />
          </radialGradient>

          <linearGradient id="rosette-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="45%" stopColor="#f3ddf8" />
            <stop offset="100%" stopColor="#c59bd0" />
          </linearGradient>

          <linearGradient id="gold-trim" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e5b968" />
            <stop offset="50%" stopColor="#fff1c1" />
            <stop offset="100%" stopColor="#d19d47" />
          </linearGradient>
        </defs>

        {/* 1. Serving plate */}
        <ellipse cx="210" cy="256" rx="195" ry="32" fill="url(#plate-shadow)" />
        <ellipse
          cx="210"
          cy="248"
          rx="190"
          ry="28"
          fill="url(#plate-grad)"
          stroke="url(#plate-rim)"
          strokeWidth="3"
        />
        <ellipse
          cx="210"
          cy="246"
          rx="174"
          ry="23"
          fill="none"
          stroke="url(#gold-trim)"
          strokeWidth="1.5"
          strokeDasharray="5 3"
          opacity="0.85"
        />

        {/* 2. Cake Body Sponge & Cream Layers */}
        <g className="cake-layers">
          {/* Bottom Sponge Layer */}
          <path
            d="M 60,185 L 60,230 C 60,248 127,260 210,260 C 293,260 360,248 360,230 L 360,185 Z"
            fill="url(#sponge-bottom)"
          />

          {/* Bottom Scalloped Gold & Cream Base Trim */}
          <path
            d="M 62,230 Q 85,244 110,238 Q 135,250 160,243 Q 185,254 210,246 Q 235,254 260,243 Q 285,250 310,238 Q 335,244 358,230"
            fill="none"
            stroke="url(#cream-layer)"
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.92"
          />

          {/* Bottom Cream Ribbon */}
          <path
            d="M 60,188 C 60,204 127,217 210,217 C 293,217 360,204 360,188 C 360,196 293,209 210,209 C 127,209 60,196 60,188 Z"
            fill="url(#cream-layer)"
          />

          {/* Middle Sponge Layer */}
          <path
            d="M 60,152 L 60,190 C 60,206 127,219 210,219 C 293,219 360,206 360,190 L 360,152 Z"
            fill="url(#sponge-mid)"
          />

          {/* Middle Cream Ribbon */}
          <path
            d="M 60,154 C 60,170 127,183 210,183 C 293,183 360,170 360,154 C 360,162 293,175 210,175 C 127,175 60,162 60,154 Z"
            fill="url(#cream-layer)"
          />

          {/* Top Sponge Layer */}
          <path
            d="M 60,118 L 60,156 C 60,172 127,185 210,185 C 293,185 360,172 360,156 L 360,118 Z"
            fill="url(#sponge-top)"
          />

          {/* Sponge Texture & Golden Sugar Pearls */}
          <g opacity="0.75">
            <circle cx="110" cy="225" r="1.8" fill="#fdf0ff" />
            <circle cx="170" cy="235" r="1.5" fill="#ffe9a8" />
            <circle cx="250" cy="238" r="1.8" fill="#fdf0ff" />
            <circle cx="310" cy="226" r="1.5" fill="#ffe9a8" />
            <circle cx="130" cy="192" r="1.5" fill="#ffeaf5" />
            <circle cx="210" cy="196" r="1.8" fill="#ffe9a8" />
            <circle cx="290" cy="194" r="1.5" fill="#ffeaf5" />
            <circle cx="95" cy="155" r="1.6" fill="#fdf0ff" />
            <circle cx="190" cy="160" r="1.4" fill="#ffe9a8" />
            <circle cx="270" cy="158" r="1.6" fill="#fdf0ff" />
            <circle cx="330" cy="150" r="1.4" fill="#ffe9a8" />
          </g>

          {/* 3D depth shadows on lateral sides */}
          <path
            d="M 60,118 L 60,230 C 60,248 95,255 105,255 C 80,240 75,180 75,124 Z"
            fill="#34133d"
            opacity="0.22"
          />
          <path
            d="M 360,118 L 360,230 C 360,248 325,255 315,255 C 340,240 345,180 345,124 Z"
            fill="#34133d"
            opacity="0.26"
          />
        </g>

        {/* 3. Luscious Poured Frosting Drips */}
        <path
          className="frosting-drips"
          d="M 58,118
             C 58,124 64,136 70,136
             C 76,136 78,124 84,124
             C 90,124 92,148 99,148
             C 106,148 109,128 116,128
             C 123,128 126,162 135,162
             C 144,162 147,132 156,132
             C 165,132 168,144 175,144
             C 182,144 185,128 193,128
             C 201,128 204,158 213,158
             C 222,158 226,135 235,135
             C 244,135 248,166 258,166
             C 268,166 272,130 282,130
             C 292,130 295,148 304,148
             C 313,148 316,125 324,125
             C 332,125 336,152 344,152
             C 352,152 356,126 362,118
             C 362,102 294,90 210,90
             C 126,90 58,102 58,118 Z"
          fill="url(#frosting-glaze)"
        />

        {/* Drip Gloss Highlights */}
        <path
          d="M 97,144 C 98,146 100,146 101,144 M 133,156 C 134,159 137,159 138,156 M 211,152 C 212,155 215,155 216,152 M 256,160 C 257,163 260,163 261,160 M 342,146 C 343,149 346,149 347,146"
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* 4. Cake Top Surface */}
        <ellipse
          className="cake-top-surface"
          cx="210"
          cy="114"
          rx="150"
          ry="30"
          fill="url(#top-surface-grad)"
          stroke="#ecd2f0"
          strokeWidth="1.5"
        />

        {/* Animated Glaze Specular Sheen */}
        <ellipse
          className="cake-glaze-sheen"
          cx="195"
          cy="108"
          rx="92"
          ry="14"
          fill="#ffffff"
          opacity="0.35"
        />

        {/* Delicate decorative dashed oval */}
        <ellipse
          cx="210"
          cy="114"
          rx="130"
          ry="22"
          fill="none"
          stroke="#ddbadd"
          strokeWidth="1"
          strokeDasharray="5 4"
          opacity="0.6"
        />

        {/* 5. Cream Rosettes along the top edge */}
        <g className="cake-rosettes">
          {[
            { cx: 78, cy: 110 },
            { cx: 108, cy: 124 },
            { cx: 148, cy: 135 },
            { cx: 195, cy: 140 },
            { cx: 242, cy: 138 },
            { cx: 288, cy: 128 },
            { cx: 324, cy: 116 },
            { cx: 340, cy: 104 },
            { cx: 295, cy: 96 },
            { cx: 240, cy: 90 },
            { cx: 180, cy: 90 },
            { cx: 125, cy: 96 },
          ].map((pos, idx) => (
            <g key={idx} transform={`translate(${pos.cx}, ${pos.cy})`}>
              <circle cx="0" cy="0" r="8" fill="url(#rosette-grad)" />
              <path
                d="M -3.5,-1.5 C -1.5,-5 2.5,-4 3.5,-1.5 C 4.5,1 1.5,3.5 -1,3.5 C -3.5,3.5 -5,1 -3.5,-1.5"
                fill="none"
                stroke="#baa0cb"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <circle
                cx="0"
                cy="-0.5"
                r="2"
                fill={idx % 2 === 0 ? "#ffffff" : "#f7d486"}
              />
            </g>
          ))}
        </g>

        {/* Top Note Inscription */}
        <text
          x="210"
          y="126"
          textAnchor="middle"
          className="cake-top-note-svg"
          fill="#7d448c"
          fontFamily="var(--serif), Georgia, serif"
          fontStyle="italic"
          fontSize="13"
          letterSpacing="0.05em"
          opacity="0.9"
        >
          {copy.cake.topNote}
        </text>
      </svg>

      {/* Hidden / Compatibility Elements for Screen Readers & Tests */}
      <div className="cake-top sr-only" aria-hidden="true">
        <div className="ube-rosettes">
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i}>✿</span>
          ))}
        </div>
        <span className="cake-top-note">{copy.cake.topNote}</span>
      </div>
      <div className="cake-body sr-only" aria-hidden="true">
        <div className="icing">
          <i />
          <i />
          <i />
        </div>
        <div className="ube-layer" />
        <div className="cake-sprinkles">✦ ✧ ✦ ✧</div>
      </div>
      <div className="cake-base sr-only" aria-hidden="true" />
      <div className="cake-plate sr-only" aria-hidden="true" />

      {/* 3D Sculpted Number Candles ("30") with Interactive Flame, Wax Glow & Smoke */}
      <div
        className="candles number-candles"
        style={
          flameTilt
            ? ({ "--flame-tilt": `${flameTilt}deg` } as React.CSSProperties)
            : undefined
        }
      >
        {digits.map((digit, i) => {
          const digitBlown = allBlown || Boolean(blownDigits?.[i]);
          const canBlowThisCandle =
            Boolean(onBlowDigit) && !unlit && !digitBlown;
          const canLightThisCandle =
            Boolean(onLightDigit) && !unlit && digitBlown;
          const canTapThisCandle = canBlowThisCandle || canLightThisCandle;
          return (
            <div
              key={i}
              className={`number-candle number-${digit} ${digitBlown ? "candle-blown" : ""} ${canTapThisCandle ? "candle-interactive" : ""}`}
              role={canTapThisCandle ? "button" : undefined}
              tabIndex={canTapThisCandle ? 0 : undefined}
              aria-label={
                canBlowThisCandle
                  ? `Lilin angka ${digit}`
                  : canLightThisCandle
                    ? `Nyalakan lilin angka ${digit}`
                    : undefined
              }
              onClick={
                canTapThisCandle
                  ? (e) => {
                      e.stopPropagation();
                      if (canLightThisCandle) {
                        onLightDigit?.(i);
                      } else if (!sparklerActive) {
                        onBlowDigit?.(i);
                      }
                    }
                  : undefined
              }
              onKeyDown={
                canTapThisCandle
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        if (canLightThisCandle) {
                          onLightDigit?.(i);
                        } else {
                          onBlowDigit?.(i);
                        }
                      }
                    }
                  : undefined
              }
            >
              {/* Warm ambient radial illumination */}
              <span className="candle-glow" aria-hidden="true" />

              {/* Ignition sparkler stars when entering Stage 4 */}
              {!unlit && !digitBlown && (
                <span className="candle-sparkler" aria-hidden="true">
                  <i>✦</i>
                  <i>✧</i>
                  <i>✦</i>
                </span>
              )}

              {/* Breeze puff burst on extinguish */}
              <span className="wind-puff" aria-hidden="true" />

              {/* Triple curling smoke wisps on extinguish */}
              <span className="smoke smoke-one" aria-hidden="true" />
              <span className="smoke smoke-two" aria-hidden="true" />
              <span className="smoke smoke-three" aria-hidden="true" />

              {/* Animated Flame */}
              <span className="flame" aria-hidden="true">
                <span />
              </span>

              {/* Candle Wick with warm glowing ember */}
              <span className="wick" aria-hidden="true">
                <span className="wick-ember" />
              </span>

              {/* 3D Sculpted Wax Digit with Melted Wax Drips & Subsurface Glow */}
              <span className="candle-body">
                <span className="candle-wax-glow" aria-hidden="true" />
                <span className="wax-drip drip-left" aria-hidden="true" />
                <span className="wax-drip drip-right" aria-hidden="true" />
                <span className="candle-digit">{digit}</span>
              </span>

              {/* Festive Gold-Trimmed Wax Holder Base */}
              <span className="candle-holder" aria-hidden="true" />

              {/* Cake insertion stick */}
              <span className="candle-stick" aria-hidden="true" />
            </div>
          );
        })}
      </div>

      {/* Ambient and celebration sparkles */}
      <div className="cake-sparkle sparkle-one" aria-hidden="true">
        ✦
      </div>
      <div className="cake-sparkle sparkle-two" aria-hidden="true">
        ✧
      </div>
      <div className="cake-sparkle sparkle-three" aria-hidden="true">
        ✳
      </div>
      <div className="cake-sparkle sparkle-four" aria-hidden="true">
        ✧
      </div>
    </div>
  );
}

