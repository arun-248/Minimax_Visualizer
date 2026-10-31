import type { ReactNode } from 'react';

/** 16×16 inline icon wrapper used inside buttons. */
export function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      className="btn-icon"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
