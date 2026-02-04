
import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../App';

const { Link, useLocation } = ReactRouterDOM;

const NavLink: React.FC<{to: string, children: React.ReactNode}> = ({ to, children }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link 
      to={to} 
      className={`transition-colors duration-300 font-semibold tracking-wider text-sm lg:text-base ${isActive ? 'text-brand-yellow border-b-2 border-brand-yellow' : 'text-white hover:text-brand-yellow'}`}
    >
      {children}
    </Link>
  );
};

export const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isAdmin } = useAuth();
  const location = useLocation();

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const menuItems = [
    { label: 'Home', to: '/' },
    { label: 'Fleet', to: '/bikes' },
    { label: 'Rates', to: '/rates' },
    { label: 'About', to: '/about' },
    { label: 'Contact', to: '/contact' },
  ];

  return (
    <>
      <header className="bg-brand-black/95 backdrop-blur-md sticky top-0 z-40 py-4 px-4 md:px-8 border-b border-white/5 shadow-xl">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="md:hidden p-2 mr-3 rounded-md text-white hover:text-brand-yellow transition-colors"
              aria-label="Open menu"
            >
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <Link to="/" className="flex items-center gap-3 group">
              <div className="flex flex-col leading-none">
                <span className="font-heading text-2xl md:text-3xl text-white tracking-tighter group-hover:text-brand-yellow transition-colors uppercase">
                  RYDE<span className="text-brand-orange">IT</span>
                </span>
                <span className="text-[9px] font-bold tracking-[0.2em] text-brand-teal uppercase">Premium Rentals</span>
              </div>
            </Link>
          </div>

          <nav className="hidden md:flex items-center space-x-6 lg:space-x-10">
            {menuItems.map(item => (
                <NavLink key={item.to} to={item.to}>{item.label}</NavLink>
            ))}
            
            {isAdmin && (
               <Link 
                to="/admin"
                className={`text-brand-teal font-black text-[11px] tracking-widest hover:text-white transition-all uppercase border px-4 py-1.5 rounded-full animate-pulse shadow-[0_0_15px_rgba(0,194,199,0.2)] ${location.pathname.startsWith('/admin') ? 'border-brand-yellow text-brand-yellow' : 'border-brand-teal/30'}`}
               >
                 Admin Panel
               </Link>
            )}

            <Link 
                to="/book"
                className="bg-brand-orange text-white font-heading text-[10px] tracking-widest py-2.5 px-6 rounded-full hover:bg-brand-yellow hover:text-brand-black transition-all shadow-lg hidden lg:block"
            >
                BOOK NOW
            </Link>

            <div className="flex items-center gap-4 ml-4 pl-4 border-l border-white/10">
              {!user ? (
                <Link
                  to="/login"
                  className="bg-brand-teal text-brand-black font-heading text-[10px] tracking-widest py-2 px-6 rounded-full hover:bg-brand-yellow transition-all shadow-lg"
                >
                  SIGN IN / UP
                </Link>
              ) : (
                <div className="flex items-center gap-4">
                  <Link 
                    to="/my-bookings" 
                    className="flex items-center gap-2 bg-brand-teal/10 border border-brand-teal/30 px-5 py-2.5 rounded-full hover:bg-brand-teal/20 transition-all group"
                  >
                    <div className="w-6 h-6 rounded-full bg-brand-teal/20 flex items-center justify-center text-brand-teal group-hover:bg-brand-teal group-hover:text-white transition-all">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                    <span className="text-[10px] text-brand-teal font-black uppercase tracking-widest">Dashboard</span>
                  </Link>
                  <button 
                    onClick={() => supabase.auth.signOut()}
                    className="text-white/40 hover:text-red-500 transition-colors"
                    title="Sign Out"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>
      </header>
      
      <div
        className={`fixed inset-0 z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="absolute inset-0 bg-brand-black/95" onClick={() => setIsMenuOpen(false)}></div>
        <div className="relative w-4/5 max-w-xs h-full bg-brand-gray-dark p-8 flex flex-col shadow-2xl">
            <div className="flex justify-between items-center mb-12">
                <span className="font-heading text-2xl text-brand-yellow uppercase">RYDEIT</span>
                <button onClick={() => setIsMenuOpen(false)} className="p-2 text-white">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <nav className="flex flex-col space-y-6">
                {menuItems.map(item => (
                    <Link key={item.to} to={item.to} className="text-xl text-white font-bold uppercase tracking-widest">{item.label}</Link>
                ))}
                {isAdmin && <Link to="/admin" className="text-xl text-brand-teal font-bold uppercase tracking-widest">Admin Panel</Link>}
            </nav>
        </div>
      </div>
    </>
  );
};
