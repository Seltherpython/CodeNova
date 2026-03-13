import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
    stroke="currentColor" 
    strokeWidth="1.5"
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    {/* Outer Box */}
    <path d="M4 8l8-4 8 4v8l-8 4-8-4V8z" />
    <path d="M4 8l8 4 8-4" />
    <path d="M12 12v8" />
    {/* Two Inner Diamonds (filled or stroked) */}
    <path d="M9 13l2 2-2 2-2-2 2-2z" fill="currentColor" stroke="none" />
    <path d="M15 13l2 2-2 2-2-2 2-2z" fill="currentColor" stroke="none" />
  </svg>
);
