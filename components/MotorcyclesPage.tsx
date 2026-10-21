import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Bike, BikeCategory } from '../types';
import { SEOHead } from './SEOHead';
import { getBikeSlugById } from '../bikeDetailsData';

interface MotorcyclesPageProps {
  bikes: Bike[];
}

export const MotorcyclesPage: React.FC<MotorcyclesPageProps> = ({ bikes }) => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Filter out scooters; only keep bikes, royal enfield, sports
  const allMotorcycles = bikes.filter(b => b.category !== 'Scooter');
  const filteredBikes = selectedCategory === 'all'
    ? allMotorcycles
    : allMotorcycles.filter(b => b.category.toLowerCase() === selectedCategory.toLowerCase());

  const motorcycleSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': 'Motorcycle Rentals in Kolkata - Royal Enfield, KTM, Yamaha | Rydeit',
    'description': 'Rent motorcycles and sports bikes in Kolkata. Royal Enfield Classic 350, Hunter 350, KTM Duke 390, Yamaha R15 V4 with full maintenance and outstation permission.',
    'itemListElement': allMotorcycles.map((b, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'item': {
        '@type': 'Vehicle',
        'name': b.name,
        'description': b.description,
        'image': `https://rydeit.in${b.imageUrl}`,
        'vehicleConfiguration': b.category,
        'offers': {
          '@type': 'Offer',
          'price': b.dailyRate,
          'priceCurrency': 'INR',
          'availability': b.status === 'Available' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          'priceSpecification': {
            '@type': 'UnitPriceSpecification',
            'price': b.dailyRate,
            'priceCurrency': 'INR',
            'unitText': 'DAY'
          }
        }
      }
    }))
  };

  return (
    <div className="bg-brand-black min-h-screen text-brand-gray-light py-12 md:py-20">
      <SEOHead
        title="Motorcycle Rentals in Kolkata - Royal Enfield, KTM, Yamaha | Rydeit"
        description="Rent self-drive motorcycles in Kolkata. Royal Enfield Classic 350, Hunter 350, KTM Duke 390 & Yamaha R15 V4. Complimentary helmet, outstation permitted & doorstep delivery."
        canonicalPath="/motorcycles"
        image="/images/ktm-duke-390.jpg"
        schema={motorcycleSchema}
      />

      <div className="container mx-auto px-4 max-w-7xl">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-8 text-xs uppercase tracking-widest text-neutral-400">
          <ol className="flex items-center gap-2">
            <li>
              <Link to="/" className="hover:text-brand-orange transition-colors">Home</Link>
            </li>
            <li>/</li>
            <li>
              <Link to="/bikes" className="hover:text-brand-orange transition-colors">Fleet</Link>
            </li>
            <li>/</li>
            <li className="text-brand-orange font-bold">Motorcycles</li>
          </ol>
        </nav>

        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-brand-orange text-xs font-black uppercase tracking-[0.4em] block">
            Highway Touring &amp; Street Performance
          </span>
          <h1 className="text-4xl md:text-6xl font-heading uppercase text-white tracking-tight">
            Motorcycle Rentals in <span className="text-brand-orange">Kolkata</span>
          </h1>
          <p className="text-sm md:text-base text-neutral-300 font-sans leading-relaxed">
            From the legendary thump of Royal Enfield cruisers to precision cornering on the Yamaha R15 and explosive acceleration on the KTM Duke 390.
            Rydeit delivers pure riding freedom across West Bengal. Perfect for weekend getaways to Digha, Mandarmani, Mayapur, or Shantiniketan.
          </p>

          {/* Filter Pills */}
          <div className="flex flex-wrap justify-center gap-2 pt-6">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/30'
                  : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
              }`}
            >
              All Motorcycles ({allMotorcycles.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('royal enfield')}
              className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                selectedCategory === 'royal enfield'
                  ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/30'
                  : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
              }`}
            >
              Royal Enfield (Cruisers)
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('sports')}
              className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                selectedCategory === 'sports'
                  ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/30'
                  : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
              }`}
            >
              Sports &amp; Performance
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('bikes')}
              className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                selectedCategory === 'bikes'
                  ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/30'
                  : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
              }`}
            >
              Street &amp; Commuter
            </button>
          </div>
        </div>

        {/* Motorcycle Grid */}
        <section aria-label="Available Motorcycles" className="mb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredBikes.map(bike => {
              const isMaintenance = bike.status === 'Maintenance';
              return (
                <article
                  key={bike.id}
                  className="bg-brand-gray-dark rounded-2xl overflow-hidden border border-white/10 hover:border-brand-orange/50 transition-all duration-300 flex flex-col group shadow-xl"
                >
                  {(() => {
                    const slug = getBikeSlugById(bike.id, bike.name);
                    return (
                      <>
                        <Link to={`/bikes/${slug}`} className="relative h-60 overflow-hidden bg-neutral-900 block">
                          <img
                            src={bike.imageUrl}
                            alt={`${bike.name} motorcycle rental in Kolkata`}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-brand-teal text-neutral-950 shadow-md">
                            {!isMaintenance ? 'Available' : 'Under Service'}
                          </div>
                          <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md text-[11px] font-mono font-bold text-brand-orange">
                            {bike.category}
                          </div>
                        </Link>

                        <div className="p-6 flex flex-col flex-grow space-y-4">
                          <div>
                            <Link to={`/bikes/${slug}`} className="hover:text-brand-orange transition-colors">
                              <h3 className="text-xl font-heading uppercase text-white font-bold">{bike.name}</h3>
                            </Link>
                            <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{bike.description}</p>
                          </div>

                          <div className="flex items-baseline gap-2 py-2 border-y border-white/5">
                            <span className="text-2xl font-heading text-brand-yellow font-extrabold">₹{bike.dailyRate}</span>
                            <span className="text-xs text-neutral-400 uppercase font-semibold">/ 24 Hours</span>
                          </div>

                          <ul className="text-xs text-neutral-300 space-y-1.5 font-sans">
                            <li className="flex items-center gap-2">
                              <span className="text-emerald-400">✓</span> Front &amp; rear disc brakes / ABS
                            </li>
                            <li className="flex items-center gap-2">
                              <span className="text-emerald-400">✓</span> Highway &amp; outstation permitted
                            </li>
                            <li className="flex items-center gap-2">
                              <span className="text-emerald-400">✓</span> Fully serviced with fresh engine oil
                            </li>
                          </ul>

                          <div className="pt-2 mt-auto grid grid-cols-2 gap-2">
                            <Link
                              to={`/bikes/${slug}`}
                              className="text-center py-3 rounded-xl font-heading text-xs tracking-wider uppercase font-bold bg-white/10 hover:bg-white/20 text-white transition-all"
                            >
                              Specs &amp; FAQs
                            </Link>
                            <button
                              type="button"
                              onClick={() => navigate(`/book?bikeId=${bike.id}`)}
                              disabled={isMaintenance}
                              className={`py-3 rounded-xl font-heading text-xs tracking-widest uppercase transition-all duration-200 cursor-pointer shadow-lg ${
                                !isMaintenance
                                  ? 'bg-brand-orange hover:bg-brand-yellow hover:text-neutral-950 text-white font-bold shadow-brand-orange/20 active:scale-[0.98]'
                                  : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                              }`}
                            >
                              {!isMaintenance ? 'Rent' : 'Service'}
                            </button>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </article>
              );
            })}
          </div>
        </section>

        {/* Popular Outstation Road Trips from Kolkata */}
        <section className="bg-brand-gray-dark/60 rounded-3xl p-8 md:p-12 border border-white/5 mb-20 space-y-8">
          <div className="max-w-2xl">
            <span className="text-brand-orange text-xs font-black uppercase tracking-[0.3em] block mb-2">Weekend Adventures</span>
            <h2 className="text-2xl md:text-4xl font-heading uppercase text-white">
              Top Highway Trips from Kolkata on a Rydeit Bike
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-brand-black/50 p-6 rounded-2xl border border-white/5 space-y-3">
              <span className="text-xs font-mono font-bold text-brand-teal">185 KM • ~4 Hours</span>
              <h3 className="text-lg font-heading uppercase text-white font-bold">Kolkata to Digha &amp; Mandarmani</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Cruise along NH16 and the scenic seaside highway. The Royal Enfield Classic 350 or Hunter 350 provides the ultimate highway stability for coastal beach trips.
              </p>
            </div>

            <div className="bg-brand-black/50 p-6 rounded-2xl border border-white/5 space-y-3">
              <span className="text-xs font-mono font-bold text-brand-teal">160 KM • ~3.5 Hours</span>
              <h3 className="text-lg font-heading uppercase text-white font-bold">Kolkata to Shantiniketan</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Take the Durgapur Expressway (NH19) through Bardhaman to Bolpur. The smooth tarmac makes the TVS Apache 160 4V or Pulsar NS200 a sheer joy to ride.
              </p>
            </div>

            <div className="bg-brand-black/50 p-6 rounded-2xl border border-white/5 space-y-3">
              <span className="text-xs font-mono font-bold text-brand-teal">130 KM • ~3 Hours</span>
              <h3 className="text-lg font-heading uppercase text-white font-bold">Kolkata to Mayapur / Nabadwip</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Ride along NH12 towards the peaceful banks of the Hooghly River. Enjoy the open highway breeze and scenic rural Bengal landscapes.
              </p>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <div className="text-center max-w-xl mx-auto space-y-4">
          <h2 className="text-2xl font-heading uppercase text-white">Ready for the Open Road?</h2>
          <p className="text-xs text-neutral-400">
            Check live vehicle availability, reserve in 60 seconds with ₹500 advance, and ride away with zero security friction.
          </p>
          <div className="pt-2">
            <Link
              to="/book"
              className="inline-block bg-brand-orange hover:bg-brand-yellow hover:text-neutral-950 text-white font-heading text-xs tracking-widest uppercase py-4 px-10 rounded-full font-bold shadow-xl shadow-brand-orange/20 transition-all"
            >
              Reserve Your Motorcycle Online
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
