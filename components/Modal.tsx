import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
}

const MAX_WIDTH_MAP: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = '2xl'
}) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClass = MAX_WIDTH_MAP[maxWidth] || 'max-w-2xl';

  const isAdmin = typeof document !== 'undefined' && document.body.classList.contains('admin-panel-white');

  const modalNode = (
    <div
      className={`fixed inset-0 z-[9999] backdrop-blur-sm flex justify-center items-center p-3 sm:p-6 overflow-y-auto ${
        isAdmin ? 'bg-slate-900/50 admin-panel-white' : 'bg-black/85'
      }`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={`${
          isAdmin 
            ? 'bg-white border border-slate-200 text-slate-800 shadow-2xl' 
            : 'bg-brand-gray-dark border border-white/10 text-brand-gray-light shadow-2xl'
        } rounded-3xl ${widthClass} w-full max-h-[92vh] flex flex-col my-auto overflow-hidden animate-fade-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`sticky top-0 px-6 py-4 sm:px-8 sm:py-5 border-b flex justify-between items-center shrink-0 z-20 ${
          isAdmin ? 'bg-white border-slate-200' : 'bg-brand-gray-dark border-white/10'
        }`}>
          <h2 id="modal-title" className={`text-xl sm:text-2xl font-bold tracking-wide uppercase truncate mr-4 ${
            isAdmin ? 'text-slate-900' : 'text-brand-teal font-heading'
          }`}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-lg font-bold transition-all cursor-pointer shrink-0 ${
              isAdmin 
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200' 
                : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white'
            }`}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        <div className={`px-6 py-6 sm:px-8 sm:py-6 font-sans overflow-y-auto flex-1 ${
          isAdmin ? 'text-slate-800' : 'text-brand-gray-light'
        }`}>
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
};
