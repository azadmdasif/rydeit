import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="bg-brand-gray-dark rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-brand-gray-dark p-6 border-b border-brand-gray-dark/50 flex justify-between items-center flex-shrink-0">
          <h2 id="modal-title" className="text-2xl font-heading text-brand-teal">{title}</h2>
          <button onClick={onClose} className="text-white hover:text-brand-yellow text-4xl font-light" aria-label="Close modal">&times;</button>
        </div>
        <div className="p-6 text-brand-gray-light font-sans leading-relaxed overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
