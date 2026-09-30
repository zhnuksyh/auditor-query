/**
 * Folder-style tabs (reference image #6): each tab is a rounded-top trapezoid
 * with angled sides. Fill and outline are drawn as ONE SVG <path> per tab, so
 * they can never drift apart the way a clip-path + separate border did.
 *
 * - Active tab: black fill, white stroke on the top + sides, OPEN at the bottom
 *   so it merges into the content card below (the folder-file effect).
 * - Inactive tab: white fill, light-gray full outline, sitting lower/behind.
 *
 * Tabs have a fixed width so the SVG path geometry stays crisp and predictable.
 */

// Geometry of one tab, in SVG user units (px). W = bottom width, the top edge
// is inset by ANGLE on each side; R rounds the top corners.
const W = 150
const H = 40
const ANGLE = 22
const R = 12

// Full closed outline (used for inactive tabs): rounded top, angled sides,
// flat bottom, back up the left side.
const CLOSED_PATH = `
  M 1 ${H}
  L ${ANGLE - R * 0.4} ${R}
  Q ${ANGLE} 1 ${ANGLE + R} 1
  L ${W - ANGLE - R} 1
  Q ${W - ANGLE} 1 ${W - ANGLE + R * 0.4} ${R}
  L ${W - 1} ${H}
`.trim()

// Open outline (active tab): same top + sides but NOT closed along the bottom.
const OPEN_PATH = CLOSED_PATH

export default function TabBar({ tabs, active, onSelect }) {
  return (
    // The row carries a real 1px bottom border in the SAME colour/weight as the
    // content card's border, so the seam under the inactive tabs is literally
    // the card border rendered by CSS, guaranteed to match. `w-fit` keeps the
    // border from extending past the last tab; the ml-5 offsets the first tab
    // without adding a bare border segment to its left.
    <div className="relative z-10 ml-5 flex w-fit items-end border-b border-zinc-100">
      {tabs.map((t, i) => (
        <Tab
          key={t.key}
          tab={t}
          isActive={t.key === active}
          onSelect={onSelect}
          // Overlap neighbours slightly so the angled sides tuck together.
          style={{ marginLeft: i === 0 ? 0 : -ANGLE }}
        />
      ))}
    </div>
  )
}

function Tab({ tab, isActive, onSelect, style }) {
  return (
    <button
      onClick={() => onSelect(tab.key)}
      style={{
        width: W,
        height: H,
        ...style,
        zIndex: isActive ? 20 : 1,
        // The active tab drops 1px to sit over the row's bottom border, so its
        // open-bottomed outline replaces the shared line where it merges.
        marginBottom: isActive ? -1 : 0,
      }}
      className="relative flex items-center justify-center"
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="absolute inset-0"
        preserveAspectRatio="none"
      >
        {/* Fill: a closed shape (bottom edge included) so the interior paints.
            Active = near-black; inactive = solid grey. */}
        <path
          d={`${CLOSED_PATH} L 1 ${H} Z`}
          fill={isActive ? '#09090b' : '#71717a'}
        />
        {/* Top + side outline. Active = white and OPEN at the bottom so it flows
            into the card; inactive = darker grey (its bottom seam is the shared
            CSS border on the row, guaranteeing it matches the card exactly). */}
        <path
          d={isActive ? OPEN_PATH : CLOSED_PATH}
          fill="none"
          stroke={isActive ? '#f4f4f5' : '#52525b'}
          strokeWidth="1"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span
        className={`relative z-10 font-display text-[11px] font-semibold tracking-widest ${
          isActive ? 'text-zinc-100' : 'text-zinc-950'
        }`}
      >
        {tab.label}
      </span>
    </button>
  )
}
