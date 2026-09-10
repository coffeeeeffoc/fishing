import type { WeaponKind } from '../game/config.ts';
export function WeaponIcon({ kind }: { kind: WeaponKind }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {kind === 'normal' ? (
        <>
          <circle cx="12" cy="12" r="6" />
          <path d="M12 2v5m0 10v5M2 12h5m10 0h5" />
        </>
      ) : kind === 'scatter' ? (
        <>
          <path d="m6 20 6-7 6 7M12 10V2M8 12 3 5m13 7 5-7" />
          <circle cx="12" cy="20" r="2" />
        </>
      ) : kind === 'laser' ? (
        <>
          <path d="M9 21V5m6 16V5M12 18V1m-6 5 6-5 6 5" />
        </>
      ) : (
        <>
          <path d="M12 2v20M3.4 7l17.2 10M3.4 17 20.6 7M9 4l3 3 3-3m-6 16 3-3 3 3M4 10l4-1-1-4m10 14-1-4 4-1M4 14l4 1-1 4m10-14-1 4 4 1" />
        </>
      )}
    </svg>
  );
}
