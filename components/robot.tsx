'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * iRobot-style wireframe humanoid. SVG-rendered, animated via React state +
 * sine-wave drives so motion never repeats noticeably.
 *
 * Aesthetic notes:
 * - Sleek panel-and-joint silhouette (head pod, chest plate, articulated arms)
 * - Subtle line-art rendering (1.2–1.6px strokes) with white panels at low opacity
 * - Eye line scans left-right; head micro-tilts; one arm gestures; chest plate has
 *   a slow-pulsing inner ring
 * - Designed to read at hero scale (480–700px tall)
 */

interface RobotProps {
  className?: string
  /** scrollT 0..1 — slight pose shift as page scrolls */
  scrollT?: number
}

export function Robot({ className, scrollT = 0 }: RobotProps) {
  const [t, setT] = useState(0)
  const rafRef = useRef(0)

  useEffect(() => {
    const start = performance.now()
    const tick = (now: number) => {
      setT(now - start)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // Animation drives — slow Apple-pace
  const T = t * 0.4
  const s = (f: number, p = 0) => Math.sin(T * f + p)

  const headTilt = s(0.0011) * 5 // deg
  const headBob = s(0.0008) * 3
  const eyeShift = s(0.0024) * 8 // px in eye-line travel
  const breathe = s(0.0007) * 1
  const chestPulse = (s(0.0014) + 1) / 2 // 0..1
  const armRaise = (s(0.0006, 1.2) + 1) / 2 // 0..1, slow gesture
  const handRotate = s(0.0009) * 8
  const ringRotate = T * 0.05

  // Subtle scroll-driven pose shift — robot slightly looks down + retreats
  const lookDown = scrollT * 6
  const armDrop = scrollT * 12

  return (
    <div className={`relative ${className ?? ''}`}>
      <svg
        viewBox="0 0 600 800"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        className="w-full h-auto"
        aria-hidden
      >
        <defs>
          {/* Soft white panel gradient */}
          <linearGradient id="panel" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.96 0.002 240)" stopOpacity="0.06" />
            <stop offset="100%" stopColor="oklch(0.96 0.002 240)" stopOpacity="0.015" />
          </linearGradient>

          {/* Edge-light gradient — top of panels glow whitest */}
          <linearGradient id="edge" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.98 0.005 240)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="oklch(0.98 0.005 240)" stopOpacity="0.4" />
          </linearGradient>

          {/* Glow halo */}
          <radialGradient id="halo">
            <stop offset="0%" stopColor="oklch(0.95 0.01 240)" stopOpacity="0.15" />
            <stop offset="60%" stopColor="oklch(0.95 0.01 240)" stopOpacity="0.04" />
            <stop offset="100%" stopColor="oklch(0.95 0.01 240)" stopOpacity="0" />
          </radialGradient>

          {/* Eye glow */}
          <radialGradient id="eyeGlow">
            <stop offset="0%" stopColor="oklch(0.98 0.005 240)" stopOpacity="1" />
            <stop offset="60%" stopColor="oklch(0.95 0.01 240)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="oklch(0.95 0.01 240)" stopOpacity="0" />
          </radialGradient>

          {/* Diagonal hatch for inner panel detail */}
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="oklch(0.95 0.005 240)" strokeWidth="0.5" strokeOpacity="0.15" />
          </pattern>

          {/* Joint dot gradient */}
          <radialGradient id="joint">
            <stop offset="0%" stopColor="oklch(0.98 0.005 240)" stopOpacity="1" />
            <stop offset="100%" stopColor="oklch(0.7 0.015 240)" stopOpacity="0.8" />
          </radialGradient>
        </defs>

        {/* Background halo behind robot */}
        <circle cx="300" cy="380" r="340" fill="url(#halo)" />

        {/* === BASE / FEET === */}
        <g
          stroke="oklch(0.92 0.005 240)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        >
          {/* Floor reflection oval */}
          <ellipse cx="300" cy="745" rx="120" ry="6" stroke="oklch(0.85 0 0)" strokeOpacity="0.15" />

          {/* === LEGS === */}
          {/* left leg */}
          <g>
            {/* thigh */}
            <path d="M 268 510 L 256 620" />
            <path d="M 248 510 L 234 620" stroke="oklch(0.95 0.005 240)" strokeOpacity="0.5" />
            {/* knee joint */}
            <circle cx="245" cy="620" r="9" fill="url(#panel)" />
            <circle cx="245" cy="620" r="9" />
            <circle cx="245" cy="620" r="3" fill="url(#joint)" stroke="none" />
            {/* shin */}
            <path d="M 252 628 L 244 730" />
            <path d="M 238 628 L 228 730" stroke="oklch(0.95 0.005 240)" strokeOpacity="0.5" />
            {/* foot */}
            <path d="M 224 730 L 268 730 L 272 740 L 220 740 Z" fill="url(#panel)" />
            <path d="M 224 730 L 268 730 L 272 740 L 220 740 Z" />
          </g>

          {/* right leg */}
          <g>
            <path d="M 332 510 L 344 620" />
            <path d="M 352 510 L 366 620" stroke="oklch(0.95 0.005 240)" strokeOpacity="0.5" />
            <circle cx="355" cy="620" r="9" fill="url(#panel)" />
            <circle cx="355" cy="620" r="9" />
            <circle cx="355" cy="620" r="3" fill="url(#joint)" stroke="none" />
            <path d="M 348 628 L 356 730" />
            <path d="M 362 628 L 372 730" stroke="oklch(0.95 0.005 240)" strokeOpacity="0.5" />
            <path d="M 332 730 L 376 730 L 380 740 L 328 740 Z" fill="url(#panel)" />
            <path d="M 332 730 L 376 730 L 380 740 L 328 740 Z" />
          </g>
        </g>

        {/* === HIPS / WAIST === */}
        <g
          stroke="oklch(0.92 0.005 240)"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* hip plate */}
          <path d="M 240 480 L 360 480 L 370 510 L 230 510 Z" fill="url(#panel)" />
          <path d="M 240 480 L 360 480 L 370 510 L 230 510 Z" />
          {/* center seam */}
          <line x1="300" y1="480" x2="300" y2="510" strokeOpacity="0.5" />
          {/* hatch fill detail */}
          <path d="M 245 484 L 355 484 L 363 506 L 237 506 Z" fill="url(#hatch)" stroke="none" />
        </g>

        {/* === TORSO === */}
        <g
          transform={`translate(0 ${breathe})`}
        >
          <g
            stroke="oklch(0.92 0.005 240)"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Main torso shell */}
            <path
              d="M 230 320 Q 230 290 260 285 L 340 285 Q 370 290 370 320 L 372 480 L 228 480 Z"
              fill="url(#panel)"
            />
            <path
              d="M 230 320 Q 230 290 260 285 L 340 285 Q 370 290 370 320 L 372 480 L 228 480 Z"
            />

            {/* Top edge highlight */}
            <path
              d="M 232 320 Q 232 292 261 287 L 339 287 Q 368 292 368 320"
              stroke="url(#edge)"
              strokeWidth="2"
            />

            {/* Center seam line */}
            <line x1="300" y1="285" x2="300" y2="480" strokeOpacity="0.4" />

            {/* Side panel cuts */}
            <line x1="252" y1="340" x2="252" y2="470" strokeOpacity="0.4" />
            <line x1="348" y1="340" x2="348" y2="470" strokeOpacity="0.4" />

            {/* Chest plate inner panel */}
            <rect x="265" y="330" width="70" height="100" rx="6" fill="oklch(0.13 0.005 240)" />
            <rect x="265" y="330" width="70" height="100" rx="6" />
          </g>

          {/* Animated chest core ring */}
          <g transform="translate(300 380)">
            <circle r="22" stroke="oklch(0.92 0.005 240)" strokeWidth="1.2" fill="none" opacity={0.7 + chestPulse * 0.3} />
            <circle r={14 + chestPulse * 4} stroke="oklch(0.95 0.005 240)" strokeWidth="1" fill="none" opacity={0.4 + chestPulse * 0.5} />
            <circle r={6 + chestPulse * 2} fill="oklch(0.95 0.005 240)" opacity={0.6 + chestPulse * 0.4} />
            {/* Rotating ring detail */}
            <g transform={`rotate(${ringRotate * 30})`}>
              <circle r="22" stroke="oklch(0.95 0.005 240)" strokeWidth="0.8" fill="none" strokeDasharray="3 6" opacity="0.4" />
            </g>
          </g>

          {/* Detail labels */}
          <g
            stroke="oklch(0.7 0 0)"
            strokeWidth="0.6"
            opacity="0.4"
          >
            <line x1="240" y1="350" x2="258" y2="350" />
            <line x1="342" y1="350" x2="360" y2="350" />
          </g>
        </g>

        {/* === ARMS === */}
        {/* Left arm — relaxed */}
        <g
          stroke="oklch(0.92 0.005 240)"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          transform={`translate(0 ${breathe + armDrop * 0.5})`}
        >
          {/* shoulder */}
          <circle cx="232" cy="305" r="14" fill="url(#panel)" />
          <circle cx="232" cy="305" r="14" />
          <circle cx="232" cy="305" r="4" fill="url(#joint)" stroke="none" />

          {/* upper arm */}
          <path d="M 222 315 L 210 415" />
          <path d="M 240 318 L 232 415" strokeOpacity="0.5" />

          {/* elbow */}
          <circle cx="220" cy="420" r="9" fill="url(#panel)" />
          <circle cx="220" cy="420" r="9" />
          <circle cx="220" cy="420" r="3" fill="url(#joint)" stroke="none" />

          {/* forearm */}
          <path d="M 215 428 L 210 530" />
          <path d="M 230 428 L 230 530" strokeOpacity="0.5" />

          {/* hand */}
          <path d="M 206 530 L 234 530 L 232 555 L 208 555 Z" fill="url(#panel)" />
          <path d="M 206 530 L 234 530 L 232 555 L 208 555 Z" />
        </g>

        {/* Right arm — gesturing (animated raise) */}
        <g
          stroke="oklch(0.92 0.005 240)"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          transform={`translate(0 ${breathe})`}
          style={{
            transformOrigin: '370px 305px',
            transform: `translateY(${breathe}px) rotate(${-armRaise * 18 + armDrop * 0.4}deg)`,
          }}
        >
          {/* shoulder */}
          <circle cx="368" cy="305" r="14" fill="url(#panel)" />
          <circle cx="368" cy="305" r="14" />
          <circle cx="368" cy="305" r="4" fill="url(#joint)" stroke="none" />

          {/* upper arm */}
          <path d="M 378 315 L 390 415" />
          <path d="M 360 318 L 368 415" strokeOpacity="0.5" />

          {/* elbow */}
          <g style={{ transformOrigin: '380px 420px', transform: `rotate(${armRaise * 12}deg)` }}>
            <circle cx="380" cy="420" r="9" fill="url(#panel)" />
            <circle cx="380" cy="420" r="9" />
            <circle cx="380" cy="420" r="3" fill="url(#joint)" stroke="none" />

            {/* forearm */}
            <path d="M 385 428 L 395 525" />
            <path d="M 370 428 L 372 525" strokeOpacity="0.5" />

            {/* hand */}
            <g style={{ transformOrigin: '383px 530px', transform: `rotate(${handRotate}deg)` }}>
              <path d="M 366 530 L 394 530 L 396 555 L 368 555 Z" fill="url(#panel)" />
              <path d="M 366 530 L 394 530 L 396 555 L 368 555 Z" />
              {/* finger lines */}
              <line x1="376" y1="555" x2="376" y2="565" />
              <line x1="386" y1="555" x2="386" y2="565" />
            </g>
          </g>
        </g>

        {/* === NECK === */}
        <g
          stroke="oklch(0.92 0.005 240)"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          transform={`translate(0 ${breathe})`}
        >
          <path d="M 285 285 L 285 260 L 315 260 L 315 285" fill="url(#panel)" />
          <path d="M 285 285 L 285 260 L 315 260 L 315 285" />
        </g>

        {/* === HEAD === */}
        <g
          style={{
            transformOrigin: '300px 240px',
            transform: `translateY(${breathe + headBob}px) rotate(${headTilt}deg) translateY(${lookDown}px)`,
          }}
        >
          <g
            stroke="oklch(0.92 0.005 240)"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Head shell — rounded pod with slight back-tilt */}
            <path
              d="M 264 200 Q 260 158 300 152 Q 340 158 336 200 L 338 250 Q 320 260 300 260 Q 280 260 262 250 Z"
              fill="oklch(0.13 0.005 240)"
            />
            <path
              d="M 264 200 Q 260 158 300 152 Q 340 158 336 200 L 338 250 Q 320 260 300 260 Q 280 260 262 250 Z"
            />

            {/* Top highlight curve */}
            <path
              d="M 270 175 Q 280 160 300 156 Q 320 160 330 175"
              stroke="url(#edge)"
              strokeWidth="2"
            />

            {/* Eye visor — dark inset band */}
            <rect x="270" y="195" width="60" height="22" rx="11" fill="oklch(0.08 0.005 240)" />
            <rect x="270" y="195" width="60" height="22" rx="11" />

            {/* Eye line scan glow — moves left-right */}
            <g transform={`translate(${eyeShift} 0)`}>
              <ellipse cx="300" cy="206" rx="40" ry="14" fill="url(#eyeGlow)" opacity="0.4" />
              <circle cx="288" cy="206" r="3.5" fill="oklch(0.98 0.005 240)" />
              <circle cx="312" cy="206" r="3.5" fill="oklch(0.98 0.005 240)" />
              {/* scan line */}
              <line
                x1="276"
                y1="206"
                x2="324"
                y2="206"
                stroke="oklch(0.98 0.005 240)"
                strokeOpacity="0.3"
                strokeWidth="0.6"
              />
            </g>

            {/* Mouth slit */}
            <line x1="290" y1="240" x2="310" y2="240" strokeOpacity="0.5" />

            {/* Side audio receivers */}
            <circle cx="266" cy="220" r="3" fill="url(#joint)" stroke="none" />
            <circle cx="334" cy="220" r="3" fill="url(#joint)" stroke="none" />

            {/* Antenna nub */}
            <line x1="300" y1="152" x2="300" y2="142" />
            <circle cx="300" cy="140" r="2" fill="oklch(0.95 0.005 240)" stroke="none" />
          </g>
        </g>

        {/* === DETAIL LABELS === */}
        <g
          stroke="oklch(0.6 0 0)"
          strokeOpacity="0.4"
          strokeWidth="0.6"
          fill="oklch(0.7 0 0)"
          fontSize="8"
          fontFamily="monospace"
          letterSpacing="2"
          opacity="0.55"
        >
          {/* Right callout: shoulder */}
          <line x1="382" y1="305" x2="430" y2="305" />
          <line x1="430" y1="305" x2="450" y2="285" />
          <text x="455" y="288" fill="oklch(0.7 0 0)" stroke="none">SHOULDER · 6DOF</text>

          {/* Bottom-right callout: hip */}
          <line x1="370" y1="490" x2="430" y2="490" />
          <text x="435" y="493" fill="oklch(0.7 0 0)" stroke="none">HIP / 02</text>

          {/* Left callout: optical */}
          <line x1="270" y1="206" x2="180" y2="206" />
          <line x1="180" y1="206" x2="160" y2="186" />
          <text x="80" y="189" fill="oklch(0.7 0 0)" stroke="none">OPTICAL ARRAY</text>

          {/* Left callout: chest core */}
          <line x1="278" y1="380" x2="180" y2="380" />
          <text x="100" y="383" fill="oklch(0.7 0 0)" stroke="none">CORE / RT</text>

          {/* Bottom callout */}
          <line x1="300" y1="745" x2="300" y2="775" />
          <text x="270" y="788" fill="oklch(0.7 0 0)" stroke="none">UNIT · 014</text>
        </g>
      </svg>
    </div>
  )
}
