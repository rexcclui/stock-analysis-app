'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingState({ message = 'Loading...', className = '' }) {
  const baseClasses = 'bg-gray-800 rounded-xl shadow-xl p-6 border border-gray-700 flex items-center justify-center text-gray-300';
  const mergedClassName = [baseClasses, className].filter(Boolean).join(' ');

  return (
    <div
      className={mergedClassName}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center gap-3 text-base">
        <Loader2 className="animate-spin text-blue-400" size={20} />
        <span>{message}</span>
      </div>
    </div>
  );
}
