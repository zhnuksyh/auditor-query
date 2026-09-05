/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './trailer/index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Active accents. `crimson` keeps its name because ~56 usages across the
        // UI mean "alert / exception / wrong answer" — the semantic the audit
        // theme wants too. Only the value moved: rose red to a register amber,
        // which reads as an exception raised rather than blood spilled.
        crimson: {
          DEFAULT: '#f2b25c',
          dim: '#a86f21',
        },
        teal: {
          DEFAULT: '#2dd4bf',
          dim: '#0f766e',
        },
        // Semantic aliases. Prefer these in new code; they say what the colour
        // means instead of what it looks like.
        exception: {
          DEFAULT: '#f2b25c',
          dim: '#a86f21',
        },
        compliant: {
          DEFAULT: '#2dd4bf',
          dim: '#0f766e',
        },
        // Folder tones for the filing-cabinet engagement select, one per audit
        // domain. Keys are the `folderTheme` values a case may declare.
        paper: {
          DEFAULT: '#e8e3d5',
          access: '#b8bec6',
          change: '#c9a56b',
          finance: '#3d4a3a',
          vendor: '#8a7f6d',
          privacy: '#6b5b73',
          continuity: '#1a1a1a',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['"Poppins"', 'system-ui', 'sans-serif'],
        display: ['"Poppins"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        // Screen/tab content easing in from just below with a soft fade.
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        // Toast for a verified clue: rise up from the bottom edge.
        'toast-up': {
          '0%': { opacity: '0', transform: 'translate(-50%, 12px)' },
          '100%': { opacity: '1', transform: 'translate(-50%, 0)' },
        },
        // Result banner / dropdown popup pop.
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        // Rubber-stamp slam: overshoot large, then settle. Only scale/opacity
        // here — the stamp's own element owns the rotation, so they compose
        // without fighting over the transform property.
        'stamp-in': {
          '0%': { opacity: '0', transform: 'scale(2.4)' },
          '60%': { opacity: '1', transform: 'scale(1.4)' },
          '100%': { opacity: '1', transform: 'scale(1.5)' },
        },
        // Full-board stamp slam: falls from way above the page (blurred while
        // in the air), hits with a hard squash, then rebounds and settles.
        // Scale/opacity/blur only — the rotation lives on the stamp element
        // inside, so the two transforms compose.
        'stamp-slam': {
          '0%': { opacity: '0', transform: 'scale(6)', filter: 'blur(14px)' },
          '38%': { opacity: '0.7', transform: 'scale(2.6)', filter: 'blur(6px)' },
          '50%': { opacity: '1', transform: 'scale(0.82)', filter: 'blur(0)' },
          '64%': { transform: 'scale(1.14)' },
          '78%': { transform: 'scale(0.94)' },
          '90%': { transform: 'scale(1.03)' },
          '100%': { opacity: '1', transform: 'scale(1)', filter: 'blur(0)' },
        },
        // Toast dismissal: sink back toward the bottom edge and fade.
        'toast-down': {
          '0%': { opacity: '1', transform: 'translate(-50%, 0)' },
          '100%': { opacity: '0', transform: 'translate(-50%, 12px)' },
        },
        // Marching-ants: scroll the dash pattern along the ERD connectors so
        // they visibly flow toward the referenced column. One full cycle equals
        // the dash+gap length (2 + 4 = 6) so the loop is seamless.
        'dash-flow': {
          to: { strokeDashoffset: '-6' },
        },
        // Quick horizontal shake for wrong-answer feedback.
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '15%': { transform: 'translateX(-8px)' },
          '30%': { transform: 'translateX(7px)' },
          '45%': { transform: 'translateX(-6px)' },
          '60%': { transform: 'translateX(4px)' },
          '75%': { transform: 'translateX(-2px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.4s ease-out both',
        'toast-up': 'toast-up 0.32s cubic-bezier(0.22, 1, 0.36, 1) both',
        'toast-down': 'toast-down 0.3s cubic-bezier(0.55, 0, 0.55, 0.2) both',
        'pop-in': 'pop-in 0.22s cubic-bezier(0.22, 1, 0.36, 1) both',
        'stamp-in': 'stamp-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'stamp-slam': 'stamp-slam 0.65s cubic-bezier(0.5, 0, 0.15, 1) both',        'dash-flow': 'dash-flow 0.9s linear infinite',
        shake: 'shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both',
      },
    },
  },
  plugins: [],
}
