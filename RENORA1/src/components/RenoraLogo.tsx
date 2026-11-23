import React from 'react';

interface RenoraLogoProps {
  variant?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
}

export function RenoraLogo({ variant = 'dark', size = 'md' }: RenoraLogoProps) {
  const textColor = variant === 'light' ? 'text-white' : 'text-[#0B192C]';
  const iconSize = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8';
  const wordSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg';

  return (
    <span className={`inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 select-none ${textColor}`}>
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${iconSize} shrink-0`}
        aria-hidden="true"
      >
        <rect
          x="1"
          y="1"
          width="38"
          height="38"
          rx="8"
          fill={variant === 'light' ? '#132642' : '#0B192C'}
          stroke="#C69736"
          strokeWidth="1.5"
        />
        <path
          d="M12.5 29V11H21.2C24.8 11 27.2 13.1 27.2 16.4C27.2 19.1 25.4 21.1 22.6 21.7L28 29H23.7L18.8 22H16V29H12.5ZM16 19.1H20.8C22.6 19.1 23.7 18.1 23.7 16.5C23.7 14.9 22.6 14 20.8 14H16V19.1Z"
          fill="#FFFFFF"
        />
        <path d="M12.5 9.5H27.5" stroke="#C69736" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span className={`font-editorial font-bold tracking-[0.14em] ${wordSize}`}>RENORA</span>
    </span>
  );
}
