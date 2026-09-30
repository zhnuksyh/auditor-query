/**
 * A "CASE CLOSED" rubber-stamp badge, rotated, distressed-ink look. Used on
 * solved level cards (bottom-right, `sm`) and slammed across the whole report
 * card once a case is closed (`board`). Sizing/positioning via the wrapper
 * `className`.
 */
const SIZES = {
  sm: {
    box: 'rounded-md border-[3px] px-3 py-1.5',
    top: 'text-sm tracking-[0.2em]',
    bottom: 'text-lg tracking-[0.15em]',
  },
  board: {
    box: 'rounded-2xl border-[6px] px-12 py-7',
    top: 'text-4xl tracking-[0.5em] sm:text-5xl',
    bottom: 'text-6xl tracking-[0.22em] sm:text-8xl',
  },
}

export default function CaseStamp({ className = '', rotate = -14, size = 'sm' }) {
  const s = SIZES[size] || SIZES.sm
  return (
    <div
      className={`pointer-events-none select-none ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden
    >
      <div className={`border-crimson/80 text-center opacity-90 mix-blend-screen ${s.box}`}>
        <div className={`font-display font-black uppercase leading-none text-crimson/90 ${s.top}`}>
          Case
        </div>
        <div
          className={`font-display font-black uppercase leading-none text-crimson/90 ${s.bottom}`}
        >
          Closed
        </div>
      </div>
    </div>
  )
}
