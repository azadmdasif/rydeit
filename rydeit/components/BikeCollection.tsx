
import React from 'react';
// Fix: Use namespace import for react-router-dom to resolve "no exported member" errors
import * as ReactRouterDOM from 'react-router-dom';
import type { Bike, BikeCategory } from '../types';

const { useNavigate } = ReactRouterDOM;

interface BikeCollectionProps {
  bikes: Bike[];
}

interface BikeCardProps {
  bike: Bike;
  onBook: (id: number) => void;
}

const BikeCard: React.FC<BikeCardProps> = ({ bike, onBook }) => {
  const colorClasses = {
    orange: 'border-brand-orange hover:shadow-brand-orange/30',
    yellow: 'border-brand-yellow hover:shadow-brand-yellow/30',
    black: 'border-brand-gray-dark hover:shadow-brand-gray-light/20',
    teal: 'border-brand-teal hover:shadow-brand-teal/30',
  };

  const isBooked = bike.status === 'Booked';

  return (
    <div className={`bg-brand-gray-dark rounded-lg overflow-hidden border-b-4 ${colorClasses[bike.color]} transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl flex flex-col relative group`}>
      {/* Availability Badge */}
      <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest z-10 shadow-lg ${!isBooked ? 'bg-brand-teal text-brand-black' : 'bg-brand-orange text-white'}`}>
        {bike.status}
      </div>
      
      <div className="relative h-60 overflow-hidden">
        <img src={bike.imageUrl} alt={bike.name} className={`w-full h-full object-cover transition-transform duration-500 ${!isBooked ? 'group-hover:scale-110' : 'grayscale opacity-60'}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
           <span className="text-white text-xs font-bold uppercase tracking-widest">View Details</span>
        </div>
      </div>

      <div className="p-6 flex flex-col flex-grow">
        <h3 className="text-2xl font-bold text-white mb-2 uppercase tracking-tight">{bike.name}</h3>
        <div className="flex items-center gap-2 mb-2">
            <p className="text-brand-yellow font-heading text-lg">₹{bike.dailyRate}</p>
            <span className="text-[10px] text-brand-gray-light opacity-50 uppercase font-bold tracking-widest">/ day</span>
        </div>
        <p className="text-brand-gray-light font-sans text-xs flex-grow mb-6 opacity-70 leading-relaxed uppercase tracking-wider">{bike.description}</p>
        
        <button 
          onClick={() => onBook(bike.id)}
          disabled={isBooked}
          className={`mt-auto font-heading tracking-widest py-3 px-4 rounded-xl transition-all duration-300 w-full ${!isBooked ? 'bg-brand-orange text-white hover:bg-brand-yellow hover:text-brand-black shadow-lg shadow-brand-orange/20' : 'bg-brand-gray-dark border border-white/10 text-brand-gray-light cursor-not-allowed opacity-30'}`}
        >
          {!isBooked ? 'BOOK THIS BIKE' : 'CURRENTLY BOOKED'}
        </button>
      </div>
    </div>
  );
};

export const BikeCollection: React.FC<BikeCollectionProps> = ({ bikes }) => {
  const navigate = useNavigate();
  const orderedCategories: BikeCategory[] = ['Bikes', 'Scooter', 'Royal Enfield', 'Sports'];
  
  const bikesByCategory = (category: BikeCategory) => {
    return bikes.filter(bike => bike.category === category);
  }

  const handleBook = (id: number) => {
    navigate(`/book?bikeId=${id}`);
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 100;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  // Icons for categories
  const categoryIcons = {
    'Bikes': (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18l-1.5-1.5a3 3 0 114.5 0L13.5 18H12zm0 0v-2m-6 2l1.5-1.5a3 3 0 114.5 0L10.5 18H6zm12 0l-1.5-1.5a3 3 0 114.5 0L19.5 18H18zM9 9a3 3 0 116 0 3 3 0 01-6 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9V5l3-1m-6 1l3-1" />
      </svg>
    ),
    'Scooter': (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 17a2 2 0 100 4 2 2 0 000-4zm8 0a2 2 0 100 4 2 2 0 000-4zM6 18h12M7 17l1-8h8l1 8M9 9l1-5h4l1 5" />
      </svg>
    ),
    'Royal Enfield': (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 17a3 3 0 106 0 3 3 0 00-6 0zm10 0a3 3 0 106 0 3 3 0 00-6 0zM7 17h10M5 14c0-2 1-4 3-4h8c2 0 3 2 3 4M9 10l1-4h4l1 4" />
      </svg>
    ),
    'Sports': (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )
  };

  return (
    <section className="py-20 bg-brand-black">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-heading mb-4 uppercase text-brand-yellow tracking-tighter">Our Fleet</h2>
          <div className="w-24 h-1 bg-brand-orange mx-auto mb-6"></div>
          <p className="text-brand-gray-light font-sans uppercase text-xs tracking-[0.3em] opacity-60">
            Select Your Machine & Conquer the Roads
          </p>
        </div>

        {/* Enhanced Jump Buttons Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-24 max-w-5xl mx-auto">
          <button 
            onClick={() => scrollToSection('category-Bikes')}
            className="group relative bg-brand-gray-dark/50 border border-brand-teal/20 p-6 rounded-3xl flex flex-col items-center gap-4 transition-all duration-500 hover:bg-brand-teal hover:border-brand-teal hover:shadow-[0_0_30px_rgba(0,194,199,0.3)] hover:-translate-y-2"
          >
            <div className="text-brand-teal group-hover:text-brand-black transition-colors duration-300">
              {categoryIcons['Bikes']}
            </div>
            <span className="font-heading text-sm md:text-base tracking-[0.2em] text-white group-hover:text-brand-black transition-colors">BIKES</span>
            <div className="absolute inset-0 bg-brand-teal opacity-0 group-active:opacity-20 rounded-3xl transition-opacity"></div>
          </button>

          <button 
            onClick={() => scrollToSection('category-Scooter')}
            className="group relative bg-brand-gray-dark/50 border border-brand-yellow/20 p-6 rounded-3xl flex flex-col items-center gap-4 transition-all duration-500 hover:bg-brand-yellow hover:border-brand-yellow hover:shadow-[0_0_30px_rgba(255,199,0,0.3)] hover:-translate-y-2"
          >
            <div className="text-brand-yellow group-hover:text-brand-black transition-colors duration-300">
              {categoryIcons['Scooter']}
            </div>
            <span className="font-heading text-sm md:text-base tracking-[0.2em] text-white group-hover:text-brand-black transition-colors">SCOOTY</span>
            <div className="absolute inset-0 bg-brand-yellow opacity-0 group-active:opacity-20 rounded-3xl transition-opacity"></div>
          </button>

          <button 
            onClick={() => scrollToSection('category-Royal Enfield')}
            className="group relative bg-brand-gray-dark/50 border border-brand-orange/20 p-6 rounded-3xl flex flex-col items-center gap-4 transition-all duration-500 hover:bg-brand-orange hover:border-brand-orange hover:shadow-[0_0_30px_rgba(255,95,31,0.3)] hover:-translate-y-2"
          >
            <div className="text-brand-orange group-hover:text-white transition-colors duration-300">
              {categoryIcons['Royal Enfield']}
            </div>
            <span className="font-heading text-sm md:text-base tracking-[0.2em] text-white group-hover:text-white transition-colors">ENFIELD</span>
            <div className="absolute inset-0 bg-brand-orange opacity-0 group-active:opacity-20 rounded-3xl transition-opacity"></div>
          </button>

          <button 
            onClick={() => scrollToSection('category-Sports')}
            className="group relative bg-brand-gray-dark/50 border border-white/10 p-6 rounded-3xl flex flex-col items-center gap-4 transition-all duration-500 hover:bg-white hover:border-white hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:-translate-y-2"
          >
            <div className="text-white group-hover:text-brand-black transition-colors duration-300">
              {categoryIcons['Sports']}
            </div>
            <span className="font-heading text-sm md:text-base tracking-[0.2em] text-white group-hover:text-brand-black transition-colors">SPORTS</span>
            <div className="absolute inset-0 bg-white opacity-0 group-active:opacity-20 rounded-3xl transition-opacity"></div>
          </button>
        </div>

        {orderedCategories.map(category => {
          const catBikes = bikesByCategory(category);
          if (catBikes.length === 0) return null;
          
          return (
            <div key={category} id={`category-${category}`} className="mb-24 scroll-mt-24">
              <div className="flex items-center gap-6 mb-12">
                <h3 className="text-3xl font-heading text-brand-teal tracking-widest uppercase flex-shrink-0">
                  {category === 'Scooter' ? 'Scooters' : category}
                </h3>
                <div className="h-px bg-gradient-to-r from-brand-teal/30 to-transparent flex-grow"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {catBikes.map(bike => (
                  <BikeCard key={bike.id} bike={bike} onBook={handleBook} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
