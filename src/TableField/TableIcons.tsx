import type { SVGProps } from 'react'

type BaseIconProps = SVGProps<SVGSVGElement> & {
  size?: number
}

type ChevronIconProps = BaseIconProps & {
  direction?: 'down' | 'left' | 'right' | 'up'
}

const chevronRotations: Record<NonNullable<ChevronIconProps['direction']>, string> = {
  down: '0deg',
  left: '90deg',
  right: '-90deg',
  up: '180deg',
}

export function ChevronIcon({ direction = 'down', size = 16, style, ...props }: ChevronIconProps) {
  return (
    <svg
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width={size}
      {...props}
      style={{ ...style, transform: `rotate(${chevronRotations[direction]})` }}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export function SearchIcon({ size = 16, ...props }: BaseIconProps) {
  return (
    <svg
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

export function XIcon({ size = 16, ...props }: BaseIconProps) {
  return (
    <svg
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

export function PlusIcon({ size = 16, ...props }: BaseIconProps) {
  return (
    <svg
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  )
}

export function CheckIcon({ size = 16, ...props }: BaseIconProps) {
  return (
    <svg
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      <path d="m5 12 5 5L20 7" />
    </svg>
  )
}

export function PinIcon({ size = 16, ...props }: BaseIconProps) {
  return (
    <svg
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      <line x1="12" x2="12" y1="17" y2="22" />
      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
    </svg>
  )
}
