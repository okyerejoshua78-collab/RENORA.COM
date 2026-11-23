import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { isSafeMediaSrc } from '../utils/currency.ts';

interface ProductImageProps {
  src?: string;
  alt: string;
  className?: string;
  aspectClass?: string;
}

export function ProductImage({
  src,
  alt,
  className = 'w-full h-full object-cover',
  aspectClass = 'aspect-[4/3]',
}: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const valid = isSafeMediaSrc(src) && !failed;

  if (!valid) {
    return (
      <div
        className={`${aspectClass} w-full bg-gradient-to-br from-[#0B192C] via-[#132642] to-[#1D3557] flex flex-col items-center justify-center p-6 text-center`}
      >
        <ImageOff className="w-7 h-7 text-[#C69736] mb-2" aria-hidden="true" />
        <span className="text-xs font-medium text-white/80 line-clamp-2 max-w-[200px]">{alt}</span>
      </div>
    );
  }

  return (
    <div className={`${aspectClass} w-full overflow-hidden bg-[#F4F6F9]`}>
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={className}
      />
    </div>
  );
}
