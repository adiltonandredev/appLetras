'use client';

interface SacredBackgroundProps {
  variant?: 'dark' | 'light';
  opacity?: number;
}

export function SacredBackground({ variant = 'light', opacity = 0.05 }: SacredBackgroundProps) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity }}
      viewBox="0 0 400 400"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern id="sacred-cross" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
          {/* Cruz estilizada - símbolo cristão */}
          <g transform="translate(100, 100)">
            <rect x="-4" y="-40" width="8" height="80" fill={variant === 'dark' ? '#C9A84C' : '#0D2347'} />
            <rect x="-30" y="-8" width="60" height="16" fill={variant === 'dark' ? '#C9A84C' : '#0D2347'} />
          </g>

          {/* Notas musicais - símbolo musical */}
          <g transform="translate(50, 50)">
            <circle cx="0" cy="0" r="3" fill={variant === 'dark' ? '#C9A84C' : '#0D2347'} />
            <rect x="2" y="-15" width="2" height="15" fill={variant === 'dark' ? '#C9A84C' : '#0D2347'} />
            <circle cx="10" cy="5" r="3" fill={variant === 'dark' ? '#C9A84C' : '#0D2347'} />
            <rect x="12" y="-10" width="2" height="15" fill={variant === 'dark' ? '#C9A84C' : '#0D2347'} />
          </g>

          {/* Pomba - símbolo do Espírito Santo */}
          <g transform="translate(150, 150)">
            <circle cx="0" cy="0" r="4" fill={variant === 'dark' ? '#C9A84C' : '#0D2347'} opacity="0.6" />
            <path
              d="M-6 0 L-2 -2 L0 -4 L2 -2 L6 0"
              stroke={variant === 'dark' ? '#C9A84C' : '#0D2347'}
              strokeWidth="1"
              fill="none"
              opacity="0.6"
            />
          </g>
        </pattern>
      </defs>

      <rect width="400" height="400" fill="none" />
      <rect width="400" height="400" fill={`url(#sacred-cross)`} />
    </svg>
  );
}
