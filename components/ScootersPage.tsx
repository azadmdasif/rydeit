import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Bike } from '../types';
import { SEOHead } from './SEOHead';
import { getBikeSlugById } from '../bikeDetailsData';

interface ScootersPageProps {
  bikes: Bike[];
}

export const ScootersPage: React.FC<ScootersPageProps> = ({ bikes }) => {
  const navigate = useNavigate();
  const scooters = bikes.filter(b => b.category === 'Scooter');

  const scooterSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': 'Scooter Rentals in Kolkata - Rydeit',
    'description': 'Affordable, automatic, well-maintained scooter rentals in Kolkata with doorstep delivery and zero hassle.',
    'itemListElement': scooters.map((s, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'item': {
        '@type': 'Vehicle',
        'name': s.name,
        'description': s.description,
        'image': `https://rydeit.in${s.imageUrl}`,
        'vehicleConfiguration': 'Automatic Scooter',
        'offers': {
          '@type': 'Offer',
          'price': s.dailyRate,
          'priceCurrency': 'INR',
          'availability': s.status === 'Available' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          'priceSpecification': {
            '@type': 'UnitPriceSpecification',
            'price': s.dailyRate,
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
        title="Scooter Rentals in Kolkata - Honda Activa, Burgman, Jupiter | Rydeit"
        description="Rent self-drive scooters in Kolkata starting at ₹700/day. Honda Activa 125, Suzuki Burgman & TVS Jupiter with complimentary helmet, doorstep delivery & instant booking."
        canonicalPath="/scooters"
        image="/images/honda-activa-125.jpg"
        schema={scooterSchema}
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
            <li className="text-brand-orange font-bold">Scooters</li>
          </ol>
        </nav>

        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-brand-orange text-xs font-black uppercase tracking-[0.4em] block">
            City Commute & Daily Errands
          </span>
          <h1 className="text-4xl md:text-6xl font-heading uppercase text-white tracking-tight">
            Scooter Rentals in <span className="text-brand-orange">Kolkata</span>
          </h1>
          <p className="text-sm md:text-base text-neutral-300 font-sans leading-relaxed">
            Navigate Kolkata's vibrant streets with effortless, gearless automatic scooters.
            Perfect for office commutes in Salt Lake &amp; Sector V, college travel, city sightseeing, or local errands.
            Every rental includes a complimentary ISI helmet, transparent rates starting at ₹700/day, and optional doorstep delivery.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <span className="px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-neutral-300 font-semibold">
              ⚡ Instant Paperless KYC
            </span>
            <span className="px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-neutral-300 font-semibold">
              🛡️ ₹1,000 Refundable Deposit
            </span>
            <span className="px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-neutral-300 font-semibold">
              🪖 Free ISI Helmet
            </span>
            <span className="px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-neutral-300 font-semibold">
              🚚 Doorstep Delivery (₹199)
            </span>
          </div>
        </div>

        {/* Scooter Fleet Grid */}
        <section aria-label="Available Scooters in Kolkata" className="mb-20">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
            <h2 className="text-xl md:text-2xl font-heading uppercase tracking-wide text-white">
              Available Scooters ({scooters.length} Models)
            </h2>
            <Link to="/rates" className="text-xs font-bold text-brand-orange hover:text-brand-yellow uppercase tracking-wider transition-colors">
              View Full Rate Sheet →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {scooters.map(scooter => {
              const isMaintenance = scooter.status === 'Maintenance';
              const slug = getBikeSlugById(scooter.id, scooter.name);
              return (
                <article
                  key={scooter.id}
                  className="bg-brand-gray-dark rounded-2xl overflow-hidden border border-white/10 hover:border-brand-orange/50 transition-all duration-300 flex flex-col group shadow-xl"
                >
                  <Link to={`/bikes/${slug}`} className="relative h-56 overflow-hidden bg-neutral-900 block">
                    <img
                      src={scooter.imageUrl}
                      alt={`${scooter.name} for rent in Kolkata`}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-brand-teal text-neutral-950 shadow-md">
                      {!isMaintenance ? 'Available' : 'Under Service'}
                    </div>
                    <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md text-[11px] font-mono font-bold text-white">
                      125cc Automatic
                    </div>
                  </Link>

                  <div className="p-6 flex flex-col flex-grow space-y-4">
                    <div>
                      <Link to={`/bikes/${slug}`} className="hover:text-brand-orange transition-colors">
                        <h3 className="text-xl font-heading uppercase text-white font-bold">{scooter.name}</h3>
                      </Link>
                      <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{scooter.description}</p>
                    </div>

                    <div className="flex items-baseline gap-2 py-2 border-y border-white/5">
                      <span className="text-2xl font-heading text-brand-yellow font-extrabold">₹{scooter.dailyRate}</span>
                      <span className="text-xs text-neutral-400 uppercase font-semibold">/ 24 Hours</span>
                    </div>

                    <ul className="text-xs text-neutral-300 space-y-1.5 font-sans">
                      <li className="flex items-center gap-2">
                        <span className="text-emerald-400">✓</span> Gearless CVT transmission
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-emerald-400">✓</span> Under-seat storage for luggage
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-emerald-400">✓</span> Sanitized &amp; safety-checked
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
                        onClick={() => navigate(`/book?bikeId=${scooter.id}`)}
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
                </article>
              );
            })}
          </div>
        </section>

        {/* Why Choose Scooters in Kolkata Guide */}
        <section className="bg-brand-gray-dark/60 rounded-3xl p-8 md:p-12 border border-white/5 mb-20 space-y-8">
          <div className="max-w-2xl">
            <span className="text-brand-orange text-xs font-black uppercase tracking-[0.3em] block mb-2">Kolkata Travel Guide</span>
            <h2 className="text-2xl md:text-4xl font-heading uppercase text-white">
              Why Rent a Scooter in Kolkata?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-brand-orange/10 border border-brand-orange/30 flex items-center justify-center text-xl">
                🚦
              </div>
              <h3 className="text-lg font-heading uppercase text-white font-bold">Beat Traffic Jams</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Kolkata's central arterial roads (AJC Bose Road, Maa Flyover, Central Avenue) experience heavy rush-hour traffic.
                An automatic 125cc scooter lets you glide through narrow bylanes and reach your destination on time.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-brand-teal/10 border border-brand-teal/30 flex items-center justify-center text-xl">
                💰
              </div>
              <h3 className="text-lg font-heading uppercase text-white font-bold">Pocket-Friendly Travel</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Renting a scooter at ₹700/day costs a fraction of hailing multiple app cabs.
                With 45–55 kmpl fuel efficiency, you can explore Victoria Memorial, Howrah Bridge, Park Street, and Dakshineswar economically.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-xl">
                🎒
              </div>
              <h3 className="text-lg font-heading uppercase text-white font-bold">Storage &amp; Convenience</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                All our scooters come with roomy under-seat boot space and front bag hooks, making them ideal for carrying backpacks, laptops, and shopping bags from New Market.
              </p>
            </div>
          </div>
        </section>

        {/* Quick FAQs on Scooter Rental */}
        <section className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-2xl font-heading uppercase text-white text-center">
            Common Questions About Scooter Rentals
          </h2>

          <div className="space-y-4">
            <div className="bg-brand-gray-dark p-6 rounded-2xl border border-white/5 space-y-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                What documents do I need to rent a scooter?
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                You need a valid original Driving License (Learner License not permitted) and a Government ID (Aadhaar Card, Voter ID, or Passport).
              </p>
            </div>

            <div className="bg-brand-gray-dark p-6 rounded-2xl border border-white/5 space-y-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                Can I get the scooter delivered to my hotel or railway station?
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Yes! We offer doorstep delivery across Kolkata (including Howrah Station, Sealdah Station, Kolkata Airport CCU, Salt Lake, and New Town) for a nominal ₹199 fee.
              </p>
            </div>

            <div className="bg-brand-gray-dark p-6 rounded-2xl border border-white/5 space-y-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                Is a helmet included?
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Yes, one ISI-certified helmet is provided free of cost with every scooter. A pillion helmet is available upon request.
              </p>
            </div>
          </div>

          <div className="text-center pt-8">
            <Link
              to="/book"
              className="inline-block bg-brand-orange hover:bg-brand-yellow hover:text-neutral-950 text-white font-heading text-xs tracking-widest uppercase py-4 px-10 rounded-full font-bold shadow-xl shadow-brand-orange/20 transition-all"
            >
              Reserve Your Scooter Online Now
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};
