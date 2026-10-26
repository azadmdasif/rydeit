import React from 'react';
import { Link } from 'react-router-dom';

export const Hero: React.FC = () => {
  return (
    <section className="relative min-h-[90vh] bg-brand-black flex items-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=2070&auto=format&fit=crop" 
          alt="Rental bikes and scooters in Kolkata" 
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-black via-brand-black/70 to-transparent"></div>
      </div>

      {/* Content Container */}
      <div className="container mx-auto px-4 md:px-12 relative z-20 py-12">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
          
          <div className="w-full lg:w-1/2 text-left space-y-6 relative z-30">
            <div className="space-y-4">
              <span className="block text-brand-teal text-[10px] md:text-xs font-black tracking-[0.4em] uppercase">
                BIKE &amp; SCOOTER RENTALS IN KOLKATA
              </span>
              <h1 className="text-4xl md:text-6xl font-heading leading-tight text-white uppercase tracking-tighter">
                Rental Bikes. <br />
                <span className="text-brand-orange">Delivered in Minutes</span>
              </h1>
            </div>
            
            <p className="text-brand-gray-light text-sm md:text-lg font-sans opacity-80 max-w-md tracking-wide">
              Fast doorstep delivery • Transparent pricing • 1000+ happy riders. Explore Kolkata on your own terms.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <Link 
                to="/book"
                className="bg-brand-yellow text-brand-black font-heading tracking-widest text-base py-4 px-10 rounded-full hover:bg-brand-orange hover:text-white transition-all duration-300 transform hover:scale-105 shadow-[0_0_20px_rgba(255,199,0,0.3)] relative z-40 font-bold"
              >
                Book Now
              </Link>
              <Link 
                to="/bikes"
                className="bg-white/10 border border-white/20 text-white font-heading tracking-widest text-base py-4 px-8 rounded-full hover:bg-white hover:text-brand-black transition-all duration-300 transform hover:scale-105 relative z-40 font-bold"
              >
                View Fleet
              </Link>
              <a 
                href="tel:+917980869336"
                className="bg-brand-teal/20 border border-brand-teal/40 text-brand-teal font-heading tracking-widest text-base py-4 px-6 rounded-full hover:bg-brand-teal hover:text-brand-black transition-all duration-300 transform hover:scale-105 relative z-40 font-bold"
              >
                Call Us
              </a>
            </div>
          </div>

          {/* Signature Decorative Text */}
          <div className="hidden lg:flex w-full lg:w-1/2 justify-center lg:justify-end pointer-events-none">
            <div className="text-right font-heading leading-[0.95] select-none">
              <div className="text-4xl md:text-[66px] text-brand-orange uppercase tracking-tight transform -rotate-1">
                Rental Bikes.
              </div>
              <div className="text-4xl md:text-[66px] text-brand-teal uppercase tracking-tight transform translate-x-1">
                Delivered in minutes
              </div>
            </div>
          </div>

        </div>
      </div>
      
      {/* Bottom Gradient Overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-brand-black to-transparent z-10 pointer-events-none"></div>
    </section>
  );
};
