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

  const modalNode = (
    <div
      className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-sm flex justify-center items-center p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={`bg-brand-gray-dark border border-white/10 rounded-3xl shadow-2xl ${widthClass} w-full max-h-[92vh] flex flex-col my-auto overflow-hidden animate-fade-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-brand-gray-dark px-6 py-4 sm:px-8 sm:py-5 border-b border-white/10 flex justify-between items-center shrink-0 z-20">
          <h2 id="modal-title" className="text-xl sm:text-2xl font-heading text-brand-teal tracking-wide uppercase truncate mr-4">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center text-lg font-bold transition-all cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-6 sm:px-8 sm:py-6 text-brand-gray-light font-sans overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
};
