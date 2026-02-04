import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';

const { Link } = ReactRouterDOM;

export const Hero: React.FC = () => {
  return (
    <section className="relative min-h-[70vh] flex items-center bg-brand-black overflow-hidden w-full">
      <div className="absolute inset-0 z-0 bg-brand-black">
        <img 
          src="https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=2070&auto=format&fit=crop" 
          alt="Modern Motorcycle" 
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-black via-brand-black/70 to-transparent"></div>
      </div>

      <div className="container mx-auto px-4 md:px-12 relative z-10 py-12">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
          
          <div className="w-full lg:w-1/2 text-left space-y-6">
            <div className="space-y-4">
              <span className="block text-brand-teal text-[10px] md:text-xs font-black tracking-[0.4em] uppercase">
                BIKE & SCOOTER RENTALS IN KOLKATA
              </span>
              <h1 className="text-4xl md:text-6xl font-heading leading-tight text-white uppercase tracking-tighter">
                Rentals starting <br />
                at <span className="text-brand-yellow">₹99/hr</span> <br />
                <span className="text-brand-orange">Home Delivery</span>
              </h1>
            </div>
            
            <p className="text-brand-gray-light text-sm md:text-lg font-sans opacity-80 max-w-md tracking-wide">
              Fast delivery • Best prices • 1000+ happy riders. Explore the city on your terms.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <Link 
                to="/book"
                className="bg-brand-yellow text-brand-black font-heading tracking-widest text-base py-4 px-10 rounded-full hover:bg-brand-orange hover:text-white transition-all duration-300 transform hover:scale-105 shadow-[0_0_20px_rgba(255,199,0,0.3)]"
              >
                Book Now
              </Link>
              <a 
                href="tel:+917686022245"
                className="bg-white/10 border border-white/20 text-white font-heading tracking-widest text-base py-4 px-10 rounded-full hover:bg-white hover:text-brand-black transition-all duration-300 transform hover:scale-105"
              >
                Call Us
              </a>
            </div>
          </div>

          <div className="hidden lg:flex w-full lg:w-1/2 justify-center lg:justify-end">
            <div className="text-right font-heading leading-[0.85] select-none">
              <div className="text-5xl md:text-[110px] text-brand-orange uppercase transform -rotate-2">
                Ride
              </div>
              <div className="text-5xl md:text-[110px] text-white uppercase transform translate-x-4">
                The
              </div>
              <div className="text-5xl md:text-[110px] text-brand-teal uppercase transform -rotate-1 -translate-x-6">
                Wild.
              </div>
            </div>
          </div>

        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-brand-black to-transparent z-10"></div>
    </section>
  );
};