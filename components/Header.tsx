
import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../App';
import { getHotelSession, clearHotelSession, HotelPartner } from '../hotelStorage';

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
  const [hotelSession, setHotelSession] = useState<HotelPartner | null>(null);
  const { user, isAdmin } = useAuth();
  const location = useLocation();

  useEffect(() => {
    setIsMenuOpen(false);
    setHotelSession(getHotelSession());
  }, [location.pathname]);

  const handleHotelSignOut = () => {
    clearHotelSession();
    setHotelSession(null);
    window.location.href = '/login';
  };

  const menuItems = [
    { label: 'Home', to: '/' },
    { label: 'Fleet', to: '/bikes' },
    { label: 'Scooters', to: '/scooters' },
    { label: 'Motorcycles', to: '/motorcycles' },
    { label: 'Pickup', to: '/pickup-kolkata' },
    { label: 'Outstation', to: '/outstation-bike-rentals' },
    { label: 'Delivery', to: '/delivery-bike-rentals' },
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
                <span className="font-heading text-xl md:text-3xl text-white tracking-tighter group-hover:text-brand-yellow transition-colors uppercase">
                  RYDE<span className="text-brand-orange">IT</span>
                </span>
                <span className="text-[7px] md:text-[9px] font-bold tracking-[0.2em] text-brand-teal uppercase">Bike Rentals</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
            {/* Mobile Book Now Button - Hidden on checkout/book page */}
            {location.pathname !== '/book' && (
              <Link 
                  to="/book"
                  className="md:hidden bg-brand-orange text-white font-heading text-[10px] tracking-widest py-2 px-3.5 rounded-full shadow-lg active:scale-95 transition-all hover:bg-brand-yellow hover:text-brand-black"
              >
                  BOOK
              </Link>
            )}

            {/* Small Sign-In / Account Icon (Right of BOOK button on mobile) */}
            <div className="md:hidden flex items-center">
              {user ? (
                <Link
                  to="/my-bookings"
                  className="relative w-8 h-8 rounded-full bg-brand-teal/10 border border-brand-teal/30 hover:border-brand-teal flex items-center justify-center text-brand-teal transition-all active:scale-95"
                  title="My Dashboard & Bookings"
                  aria-label="My Account"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-brand-black"></span>
                </Link>
              ) : hotelSession ? (
                <Link
                  to="/hotel-dashboard"
                  className="relative w-8 h-8 rounded-full bg-amber-400/10 border border-amber-400/40 hover:border-amber-400 flex items-center justify-center text-amber-300 transition-all active:scale-95"
                  title={`Hotel Partner: ${hotelSession.hotel_name}`}
                  aria-label="Hotel Dashboard"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-brand-black"></span>
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="w-8 h-8 rounded-full bg-white/5 border border-white/10 hover:border-brand-teal/50 hover:bg-brand-teal/10 flex items-center justify-center text-white/80 hover:text-brand-teal transition-all active:scale-95"
                  title="Sign In"
                  aria-label="Sign In"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </Link>
              )}
            </div>

            <nav className="hidden md:flex items-center space-x-6 lg:space-x-10">
              {menuItems.map(item => (
                  <NavLink key={item.to} to={item.to}>{item.label}</NavLink>
              ))}
              
              {isAdmin && (
                 <Link 
                  to="/admin"
                  className={`text-brand-teal font-black text-[11px] tracking-widest hover:text-white transition-all uppercase border px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(0,194,199,0.2)] ${location.pathname.startsWith('/admin') ? 'border-brand-yellow text-brand-yellow' : 'border-brand-teal/30'}`}
                 >
                   Admin
                 </Link>
              )}

              {/* Desktop Book Now Button - Hidden on checkout/book page */}
              {location.pathname !== '/book' && (
                <Link 
                    to="/book"
                    className="bg-brand-orange text-white font-heading text-[10px] tracking-widest py-2.5 px-6 rounded-full hover:bg-brand-yellow hover:text-brand-black transition-all shadow-lg active:scale-[0.98]"
                >
                    BOOK NOW
                </Link>
              )}

              {/* Common Sign In Area: Single button when logged out, or active session when logged in */}
              <div className="flex items-center gap-3 ml-4 pl-4 border-l border-white/10">
                {user ? (
                  <div className="flex items-center gap-4">
                    <Link 
                      to="/my-bookings" 
                      className="flex items-center gap-2 bg-brand-teal/10 border border-brand-teal/30 px-5 py-2.5 rounded-full hover:bg-brand-teal/20 transition-all group"
                    >
                      <div className="w-6 h-6 rounded-full bg-brand-teal/20 flex items-center justify-center text-brand-teal group-hover:bg-brand-teal group-hover:text-white transition-all">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      </div>
                      <span className="hidden lg:inline text-[10px] text-brand-teal font-black uppercase tracking-widest">Dashboard</span>
                    </Link>
                    <button 
                      onClick={() => supabase.auth.signOut()}
                      className="text-white/40 hover:text-red-500 transition-colors cursor-pointer"
                      title="Sign Out"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    </button>
                  </div>
                ) : hotelSession ? (
                  <div className="flex items-center gap-3">
                    <Link 
                      to="/hotel-dashboard" 
                      className="flex items-center gap-2 bg-amber-400/10 border border-amber-400/30 px-4 py-2 rounded-full hover:bg-amber-400/20 transition-all text-amber-300 group"
                      title="Hotel Partner Dashboard"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[10px] font-bold uppercase tracking-wider truncate max-w-[140px]">{hotelSession.hotel_name}</span>
                    </Link>
                    <button 
                      onClick={handleHotelSignOut}
                      className="text-white/40 hover:text-red-500 transition-colors cursor-pointer"
                      title="Sign Out Hotel"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    </button>
                  </div>
                ) : (
                  <Link
                    to="/login"
                    className="bg-brand-teal text-brand-black font-heading text-[10px] tracking-widest py-2 px-6 rounded-full hover:bg-brand-yellow transition-all shadow-lg"
                  >
                    SIGN IN
                  </Link>
                )}
              </div>
            </nav>
          </div>
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
                {user && <Link to="/my-bookings" className="text-xl text-brand-teal font-bold uppercase tracking-widest">My Dashboard</Link>}
                {hotelSession && !user && <Link to="/hotel-dashboard" className="text-xl text-amber-400 font-bold uppercase tracking-widest">Hotel Dashboard</Link>}
                {!user && !hotelSession && <Link to="/login" className="text-xl text-brand-teal font-bold uppercase tracking-widest">Sign In</Link>}
            </nav>
        </div>
      </div>
    </>
  );
};
