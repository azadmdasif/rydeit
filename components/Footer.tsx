
import React from 'react';
import type { LegalContent } from '../types';
import { PRIVACY_POLICY, REFUND_POLICY, TERMS_AND_CONDITIONS } from '../legal';

interface FooterProps {
  onShowPolicy: (policy: LegalContent) => void;
}

export const Footer: React.FC<FooterProps> = ({ onShowPolicy }) => {
  return (
    <footer className="bg-brand-gray-dark py-12 border-t border-white/5">
      <div className="container mx-auto px-4 text-center text-brand-gray-light">
        <div className="flex flex-col items-center mb-10">
          <div className="font-heading text-4xl text-white mb-2 uppercase">
            RYDE<span className="text-brand-orange">IT</span>
          </div>
          <p className="text-xs font-bold tracking-[0.5em] text-brand-teal uppercase">Ride The Wild. Live Free.</p>
        </div>

        <div className="flex justify-center flex-wrap gap-6 md:gap-12 mb-8">
            <button onClick={() => onShowPolicy(PRIVACY_POLICY)} className="text-sm font-bold uppercase tracking-widest hover:text-brand-yellow transition-colors">Privacy Policy</button>
            <button onClick={() => onShowPolicy(REFUND_POLICY)} className="text-sm font-bold uppercase tracking-widest hover:text-brand-yellow transition-colors">Refund Policy</button>
            <button onClick={() => onShowPolicy(TERMS_AND_CONDITIONS)} className="text-sm font-bold uppercase tracking-widest hover:text-brand-yellow transition-colors">Terms & Conditions</button>
        </div>

        <div className="mb-8">
          <a 
            href="https://wa.me/917686022245"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors duration-200"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span>Need help? Chat with us on WhatsApp</span>
          </a>
        </div>

        <div className="pt-10 border-t border-white/5 opacity-50 space-y-2">
          <p className="text-sm">© {new Date().getFullYear()} Rydeit Rentals. Adventure starts here.</p>
          <p className="text-[10px] uppercase tracking-widest">Kolkata, West Bengal</p>
        </div>
      </div>
    </footer>
  );
};
