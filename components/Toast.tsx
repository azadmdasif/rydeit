
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
    success: 'border-brand-teal text-brand-teal bg-brand-teal/10',
    error: 'border-brand-orange text-brand-orange bg-brand-orange/10',
    warning: 'border-brand-yellow text-brand-yellow bg-brand-yellow/10',
    info: 'border-white/20 text-white bg-white/5',
  };

  const icons = {
    success: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div
      className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 transform ${
        isVisible ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-8 opacity-0 scale-95'
      }`}
    >
      <div className={`px-6 py-4 rounded-2xl border-2 backdrop-blur-xl shadow-2xl flex items-center gap-4 min-w-[320px] max-w-[90vw] ${typeStyles[type]}`}>
        <div className="flex-shrink-0">{icons[type]}</div>
        <p className="font-sans font-bold text-xs uppercase tracking-widest leading-tight flex-grow">{message}</p>
        <button onClick={() => { setIsVisible(false); setTimeout(onClose, 300); }} className="text-white/40 hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  );
};
