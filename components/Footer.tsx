import React from 'react';
import { Link } from 'react-router-dom';
import type { LegalContent } from '../types';
import { PRIVACY_POLICY, REFUND_POLICY, TERMS_AND_CONDITIONS } from '../legal';
import { GARAGE_ADDRESS } from '../constants';

interface FooterProps {
  onShowPolicy: (policy: LegalContent) => void;
}

export const Footer: React.FC<FooterProps> = ({ onShowPolicy }) => {
  return (
    <footer className="bg-brand-gray-dark py-14 border-t border-white/5 text-brand-gray-light">
      <div className="container mx-auto px-4 text-center space-y-8">
        <div className="flex flex-col items-center">
          <Link to="/" className="font-heading text-4xl text-white mb-2 uppercase group">
            RYDE<span className="text-brand-orange">IT</span>
          </Link>
          <p className="text-xs font-bold tracking-[0.4em] text-brand-teal uppercase">
            Kolkata's Premier Bike &amp; Scooter Rental Hub
          </p>
        </div>

        {/* Clean Internal SEO Links */}
        <nav aria-label="Footer Navigation" className="flex justify-center flex-wrap gap-4 sm:gap-6 text-xs font-bold uppercase tracking-widest text-neutral-300">
          <Link to="/" className="hover:text-brand-orange transition-colors">Home</Link>
          <Link to="/bikes" className="hover:text-brand-orange transition-colors">All Fleet</Link>
          <Link to="/scooters" className="hover:text-brand-orange transition-colors">Scooters</Link>
          <Link to="/motorcycles" className="hover:text-brand-orange transition-colors">Motorcycles</Link>
          <Link to="/pickup-kolkata" className="hover:text-brand-orange transition-colors text-brand-teal">Airport/Station</Link>
          <Link to="/outstation-bike-rentals" className="hover:text-brand-orange transition-colors text-brand-yellow">Outstation</Link>
          <Link to="/delivery-bike-rentals" className="hover:text-brand-orange transition-colors text-brand-orange">Gig Delivery</Link>
          <Link to="/rates" className="hover:text-brand-orange transition-colors">Rates</Link>
          <Link to="/faqs" className="hover:text-brand-orange transition-colors">FAQs</Link>
          <Link to="/about" className="hover:text-brand-orange transition-colors">About Us</Link>
          <Link to="/contact" className="hover:text-brand-orange transition-colors">Contact</Link>
        </nav>

        {/* Legal Policies */}
        <div className="flex justify-center flex-wrap gap-6 text-xs text-neutral-400">
          <button 
            type="button" 
            onClick={() => onShowPolicy(PRIVACY_POLICY)} 
            className="hover:text-brand-yellow uppercase tracking-wider transition-colors cursor-pointer"
          >
            Privacy Policy
          </button>
          <span>•</span>
          <button 
            type="button" 
            onClick={() => onShowPolicy(REFUND_POLICY)} 
            className="hover:text-brand-yellow uppercase tracking-wider transition-colors cursor-pointer"
          >
            Refund Policy
          </button>
          <span>•</span>
          <button 
            type="button" 
            onClick={() => onShowPolicy(TERMS_AND_CONDITIONS)} 
            className="hover:text-brand-yellow uppercase tracking-wider transition-colors cursor-pointer"
          >
            Terms &amp; Conditions
          </button>
        </div>

        {/* WhatsApp & Phone Support */}
        <div>
          <a 
            href="https://wa.me/917686022245"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-neutral-300 hover:text-white transition-colors duration-200 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Need help or outstation advice? Chat with us on WhatsApp (+91 7686022245)</span>
          </a>
        </div>

        {/* NAP & Copyright */}
        <div className="pt-8 border-t border-white/5 text-neutral-500 text-xs space-y-1.5">
          <p>© {new Date().getFullYear()} Rydeit Rentals. All rights reserved.</p>
          <address className="not-italic text-[11px] text-neutral-400">
            {GARAGE_ADDRESS} • Daily 06:00 AM - 10:00 PM
          </address>
        </div>
      </div>
    </footer>
  );
};
