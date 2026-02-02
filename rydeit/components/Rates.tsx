
import React, { useState, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import type { Bike, BikeCategory, AdditionalCharge } from '../types';

const { useNavigate } = ReactRouterDOM;

interface RatesProps {
  bikes: Bike[];
  additionalCharges: AdditionalCharge[];
}

const RateBikeCard: React.FC<{ bike: Bike, onBook: (id: number) => void }> = ({ bike, onBook }) => {
  const isBooked = bike.status === 'Booked';
  
  return (
    <div className="bg-brand-gray-dark rounded-2xl overflow-hidden border border-white/5 transition-all duration-300 hover:border-brand-teal/50 group relative">
      <div className="relative h-48 overflow-hidden">
        <img src={bike.imageUrl} alt={bike.name} className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${isBooked ? 'grayscale opacity-50' : ''}`} />
        <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest z-10 ${!isBooked ? 'bg-brand-teal text-brand-black' : 'bg-brand-orange text-white'}`}>
          {bike.status}
        </div>
      </div>
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-start">
          <h3 className="text-xl font-bold text-white uppercase tracking-tight">{bike.name}</h3>
          <div className="text-right">
            <p className="text-brand-yellow font-heading text-xl">₹{bike.dailyRate}</p>
            <p className="text-[10px] text-brand-gray-light opacity-50 uppercase font-black tracking-widest">/ day</p>
          </div>
        </div>
        <button 
          onClick={() => onBook(bike.id)}
          disabled={isBooked}
          className={`w-full font-heading tracking-widest py-3 rounded-xl transition-all ${!isBooked ? 'bg-brand-teal text-brand-black hover:bg-brand-yellow' : 'bg-brand-gray-dark border border-white/10 text-brand-gray-light cursor-not-allowed opacity-30'}`}
        >
          {!isBooked ? 'BOOK NOW' : 'NOT AVAILABLE'}
        </button>
      </div>
    </div>
  );
};

export const Rates: React.FC<RatesProps> = ({ bikes, additionalCharges }) => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<BikeCategory | 'All'>('All');
  const [selectedBikeId, setSelectedBikeId] = useState<string>('');

  const categories: (BikeCategory | 'All')[] = ['All', 'Scooter', 'Bikes', 'Royal Enfield', 'Sports'];

  const filteredBikes = useMemo(() => {
    if (selectedCategory === 'All') return bikes;
    return bikes.filter(b => b.category === selectedCategory);
  }, [selectedCategory, bikes]);

  const displayedBike = useMemo(() => {
    if (!selectedBikeId) return null;
    return bikes.find(b => b.id.toString() === selectedBikeId);
  }, [selectedBikeId, bikes]);

  const handleBook = (id: number) => {
    navigate(`/book?bikeId=${id}`);
  };

  return (
    <section className="py-20 bg-brand-black min-h-screen">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-heading mb-4 uppercase text-brand-teal tracking-tighter">Fleet & Rates</h2>
          <p className="text-brand-gray-light font-sans opacity-60 max-w-2xl mx-auto uppercase text-xs tracking-[0.4em]">
            Transparent Pricing • Verified Availability
          </p>
        </div>

        {/* Selection Tool */}
        <div className="max-w-4xl mx-auto bg-brand-gray-dark p-8 rounded-[2.5rem] border border-white/5 shadow-2xl mb-20">
          <h3 className="text-brand-yellow font-heading text-xl mb-6 uppercase tracking-widest text-center">Quick Rate Finder</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-brand-gray-light uppercase tracking-widest opacity-60">1. Select Category</label>
              <select 
                value={selectedCategory} 
                onChange={(e) => {
                  setSelectedCategory(e.target.value as BikeCategory | 'All');
                  setSelectedBikeId('');
                }}
                className="w-full bg-brand-black border border-white/10 rounded-xl p-4 text-white focus:ring-2 focus:ring-brand-teal outline-none transition-all"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-brand-gray-light uppercase tracking-widest opacity-60">2. Select Model</label>
              <select 
                value={selectedBikeId} 
                onChange={(e) => setSelectedBikeId(e.target.value)}
                disabled={selectedCategory === 'All' && !selectedBikeId}
                className="w-full bg-brand-black border border-white/10 rounded-xl p-4 text-white focus:ring-2 focus:ring-brand-teal outline-none transition-all disabled:opacity-30"
              >
                <option value="">-- Choose a Vehicle --</option>
                {filteredBikes.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          {displayedBike && (
            <div className="mt-10 p-6 bg-brand-black/50 rounded-2xl border border-brand-teal/20 animate-fade-in">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="relative">
                  <img src={displayedBike.imageUrl} alt={displayedBike.name} className={`w-32 h-32 object-cover rounded-xl shadow-lg ${displayedBike.status === 'Booked' ? 'grayscale opacity-50' : ''}`} />
                  <div className={`absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest ${displayedBike.status === 'Available' ? 'bg-brand-teal text-brand-black' : 'bg-brand-orange text-white'}`}>
                    {displayedBike.status}
                  </div>
                </div>
                <div className="flex-grow text-center md:text-left">
                  <h4 className="text-2xl font-bold text-white mb-1 uppercase tracking-tight">{displayedBike.name}</h4>
                  <p className="text-brand-teal font-heading text-3xl">₹{displayedBike.dailyRate} <span className="text-xs text-brand-gray-light font-sans opacity-50 uppercase tracking-widest">/ Day</span></p>
                </div>
                <button 
                   onClick={() => handleBook(displayedBike.id)}
                   disabled={displayedBike.status === 'Booked'}
                   className={`px-10 py-4 font-heading tracking-widest rounded-full transition-all shadow-xl ${displayedBike.status === 'Available' ? 'bg-brand-orange text-white hover:bg-brand-yellow hover:text-brand-black shadow-brand-orange/20' : 'bg-brand-gray-dark text-brand-gray-light opacity-30 cursor-not-allowed'}`}
                >
                  {displayedBike.status === 'Available' ? 'BOOK THIS BIKE' : 'BOOKED OUT'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Full Fleet Gallery */}
        <div className="space-y-12 mb-20">
          <h3 className="text-3xl font-heading text-brand-teal uppercase tracking-widest border-b border-white/5 pb-4">Browse All Models</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {bikes.map(bike => (
              <RateBikeCard key={bike.id} bike={bike} onBook={handleBook} />
            ))}
          </div>
        </div>

        {/* Highlighted Additional Fees */}
        <div className="pt-20 border-t border-white/5">
          <h3 className="text-3xl font-heading text-brand-orange mb-10 text-center uppercase tracking-widest">Service Fee Highlights</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {additionalCharges.map((charge) => (
              <div key={charge.name} className="bg-brand-gray-dark p-8 rounded-[2rem] border-2 border-brand-orange/20 relative group overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand-orange/5 rounded-full -mr-12 -mt-12 blur-2xl"></div>
                <h4 className="text-white font-bold text-lg mb-2 relative z-10">{charge.name}</h4>
                <div className="text-brand-yellow font-heading text-3xl mb-4 relative z-10">₹{charge.cost}</div>
                <p className="text-brand-gray-light text-xs opacity-60 italic leading-relaxed relative z-10">{charge.description}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-16 bg-gradient-to-br from-brand-teal/10 to-transparent p-12 rounded-[3rem] border border-brand-teal/20 max-w-5xl mx-auto text-center">
              <h4 className="text-brand-teal font-heading text-2xl mb-6 uppercase tracking-widest">The Rydeit Advantage</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  <div className="space-y-3">
                      <div className="text-brand-teal flex justify-center"><svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg></div>
                      <p className="font-bold text-white uppercase text-sm tracking-wider">Safety First</p>
                      <p className="text-xs text-brand-gray-light opacity-70">Sanitized helmets & robust breakdown support included.</p>
                  </div>
                  <div className="space-y-3">
                      <div className="text-brand-teal flex justify-center"><svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                      <p className="font-bold text-white uppercase text-sm tracking-wider">Fast Delivery</p>
                      <p className="text-xs text-brand-gray-light opacity-70">Doorstep delivery within Kolkata city limits.</p>
                  </div>
                  <div className="space-y-3">
                      <div className="text-brand-teal flex justify-center"><svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg></div>
                      <p className="font-bold text-white uppercase text-sm tracking-wider">Best Rates</p>
                      <p className="text-xs text-brand-gray-light opacity-70">Premium machines starting as low as ₹99/day.</p>
                  </div>
              </div>
          </div>
        </div>
      </div>
    </section>
  );
};
