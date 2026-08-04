import React from "react";

export function TisLogo({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 120 120" 
      className={className} 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Sun Rays - Yellow */}
      <path 
        d="M60 22 L60 10 M34 32 L25 22 M86 32 L95 22 M22 60 L10 60 M98 60 L110 60" 
        stroke="#FFC107" 
        strokeWidth="6" 
        strokeLinecap="round" 
      />
      
      {/* Sun Core - Yellow */}
      <path 
        d="M38 56 A 22 22 0 0 1 82 56" 
        fill="#FFC107" 
      />
      
      {/* T Left Arm (Orange) */}
      <path 
        d="M24 56 Q 24 68 42 68 L 54 68 L 54 56 Z" 
        fill="#FF7A00" 
      />
      
      {/* T Right Arm & Stem (Navy in light mode, White in dark mode) */}
      <path 
        d="M54 56 L 96 56 Q 96 68 78 68 L 66 68 L 66 110 Q 66 116 54 116 L 54 68 Z" 
        className="fill-[#183153] dark:fill-white" 
      />
      
      {/* Battery segments inside stem */}
      <rect x="56" y="80" width="8" height="5" fill="currentColor" className="text-white dark:text-[#183153]" />
      <rect x="56" y="90" width="8" height="5" fill="currentColor" className="text-white dark:text-[#183153]" />
      <rect x="56" y="100" width="8" height="5" fill="currentColor" className="text-white dark:text-[#183153]" />
    </svg>
  );
}
