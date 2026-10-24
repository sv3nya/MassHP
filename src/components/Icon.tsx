/**
 * Inline icon set for the screening flow. Icons are authored as SVG paths
 * that inherit `currentColor`, so color is controlled by Tailwind text
 * utilities (e.g. `text-brand`). No external icon package is used.
 */

export type IconName =
  | 'home'
  | 'globe'
  | 'person'
  | 'shield'
  | 'phone'
  | 'chevron-down'
  | 'arrow-right'
  | 'arrow-left'
  | 'dollar'
  | 'check'

type IconProps = {
  name: IconName
  className?: string
}

const PATHS: Record<IconName, React.ReactNode> = {
  home: (
    <path
      d="M3 10.5 12 3l9 7.5M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  globe: (
    <>
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </>
  ),
  person: (
    <>
      <circle
        cx="12"
        cy="8"
        r="3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </>
  ),
  shield: (
    <path
      d="M12 3 5 5.5v5c0 4.5 3 7.8 7 9 4-1.2 7-4.5 7-9v-5L12 3Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  ),
  phone: (
    <path
      d="M6.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16 16 0 0 1 4.5 6.2 2 2 0 0 1 6.5 4Z"
      fill="currentColor"
    />
  ),
  'chevron-down': (
    <path
      d="m6 9 6 6 6-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  'arrow-right': (
    <path
      d="M4 12h15m0 0-6-6m6 6-6 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  'arrow-left': (
    <path
      d="M20 12H5m0 0 6-6m-6 6 6 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  dollar: (
    <path
      d="M12 3v18M16 7.5C16 5.6 14.2 4 12 4S8 5.6 8 7.5 9.8 11 12 11s4 1.6 4 3.5S14.2 20 12 20s-4-1.6-4-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  check: (
    <path
      d="m5 12 5 5 9-10"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
}

export function Icon({ name, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      role="presentation"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  )
}
