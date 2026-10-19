
import React, { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 4000 }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Small delay to trigger entry animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for exit animation
    }, duration);

    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimer);
    };
  }, [onClose, duration]);

  const typeStyles = {
    success: 'bg-emerald-600 text-white border-emerald-400 shadow-2xl ring-1 ring-emerald-300/40',
    error: 'bg-rose-600 text-white border-rose-400 shadow-2xl ring-1 ring-rose-300/40',
    warning: 'bg-amber-600 text-white border-amber-400 shadow-2xl ring-1 ring-amber-300/40',
    info: 'bg-slate-900 text-white border-slate-700 shadow-2xl ring-1 ring-slate-600/40',
  };

  const icons = {
    success: (
      <svg className="w-5 h-5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div
      className={`fixed top-6 left-1/2 -translate-x-1/2 z-[999999] transition-all duration-300 transform pointer-events-auto keep-white ${
        isVisible ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-8 opacity-0 scale-95'
      }`}
    >
      <div 
        className={`px-5 py-3.5 rounded-2xl border-2 shadow-2xl flex items-center gap-3.5 min-w-[340px] max-w-[92vw] ${typeStyles[type]}`}
        style={{ color: '#ffffff' }}
      >
        <div className="flex-shrink-0 text-white">{icons[type]}</div>
        <p 
          className="font-sans font-bold text-xs uppercase tracking-wider leading-relaxed flex-grow text-white drop-shadow-sm keep-white"
          style={{ color: '#ffffff' }}
        >
          {message}
        </p>
        <button 
          onClick={() => { setIsVisible(false); setTimeout(onClose, 300); }} 
          className="text-white hover:text-white/80 transition-colors p-1 rounded-lg hover:bg-white/10 cursor-pointer shrink-0"
          title="Dismiss"
          style={{ color: '#ffffff' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  );
};
