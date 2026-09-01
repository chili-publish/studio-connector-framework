import type { IconProps } from './types';

export const BoltIcon = ({ className }: IconProps) => (
  <svg
    className={className}
    width="16"
    height="16"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M13 10V3L4 14h7v7l9-11h-7z"
    />
  </svg>
);
