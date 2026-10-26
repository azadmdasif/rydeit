import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { BIKE_DETAILS, getBikeSlugById, createBikeSlug } from '../bikeDetailsData';
import { useFleetBikes } from '../fleetStorage';
import { SEOHead } from './SEOHead';
import { ShieldCheck, Clock, Zap, MapPin, Phone, HelpCircle, CheckCircle2, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';

export const BikeDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { bikes: fleetBikes } = useFleetBikes();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Match requested bike against active Supabase fleet
  const dbBike = useMemo(() => {
    if (!slug) return null;
    return fleetBikes.find(b => {
      const s1 = getBikeSlugById(b.id, b.name);
      const s2 = createBikeSlug(b.name, b.id);
      return s1 === slug || s2 === slug || String(b.id) === slug;
    }) || null;
  }, [slug, fleetBikes]);

  const staticDetail = slug ? BIKE_DETAILS[slug] : null;

  // Build complete model using Supabase as source of truth
  const bike = useMemo(() => {
    if (!dbBike) return null;

    const currentSlug = getBikeSlugById(dbBike.id, dbBike.name);
    const customDescription = dbBike.description || '';

    if (staticDetail) {
      return {
        ...staticDetail,
        id: dbBike.id,
        slug: currentSlug,
        name: dbBike.name,
        tagline: customDescription || staticDetail.tagline,
        dailyRate: dbBike.dailyRate,
        imageUrl: dbBike.imageUrl || staticDetail.imageUrl,
        category: dbBike.category,
        status: dbBike.status,
        overview: customDescription 
          ? `${customDescription} ${staticDetail.overview}`
          : staticDetail.overview,
        metaTitle: `${dbBike.name} on Rent in Kolkata - ₹${dbBike.dailyRate}/day | Rydeit`,
        metaDescription: customDescription || staticDetail.metaDescription
      };
    }

    // Dynamic model generator for custom bikes added in Supabase
    return {
      id: dbBike.id,
      slug: currentSlug,
      name: dbBike.name,
      tagline: customDescription || `Premium self-drive ${dbBike.name} rental in Kolkata with instant delivery`,
      category: dbBike.category,
      dailyRate: dbBike.dailyRate,
      imageUrl: dbBike.imageUrl,
      color: dbBike.color || 'black',
      specs: {
        displacement: dbBike.category === 'Scooter' ? '125 cc Automatic' : 'Refined 4-Stroke Engine',
        maxPower: dbBike.category === 'Sports' ? 'High Performance Output' : 'Smooth & Responsive',
        maxTorque: 'Punchy City & Highway Torque',
        mileage: dbBike.category === 'Scooter' ? '45 - 50 km/L' : '40 - 55 km/L',
        fuelTank: 'Standard Capacity Tank',
        transmission: dbBike.category === 'Scooter' ? 'Automatic CVT' : 'Multi-Speed Manual',
        kerbWeight: 'Lightweight & Agile Chassis',
        seatHeight: 'Ergonomic Comfortable Saddle',
        braking: 'Disc / Drum Safety Brake System'
      },
      overview: customDescription || `Rent the ${dbBike.name} in Kolkata with Rydeit. Thoroughly serviced, sanitized, and ready for your city commute, weekend getaway, or outstation journey. Comes with complimentary ISI helmet and 24/7 road assistance.`,
      whyRent: [
        `Well-maintained machine in top mechanical condition.`,
        `Includes 1x complimentary ISI-certified safety helmet.`,
        `Paperless KYC verification and flat ₹1,000 security deposit.`,
        `Optional doorstep delivery across Kolkata for ₹199.`
      ],
      faqs: [
        {
          question: `Can I rent the ${dbBike.name} with doorstep delivery in Kolkata?`,
          answer: `Yes! We provide express doorstep delivery anywhere in Kolkata (Salt Lake, New Town, Howrah, Airport, etc.) for a flat ₹199 delivery fee.`
        },
        {
          question: `What documents are required to rent the ${dbBike.name}?`,
          answer: `A valid original Driving License and government ID (Aadhaar, Voter ID, or Passport). Both are verified digitally in minutes.`
        },
        {
          question: `What is the security deposit for the ${dbBike.name}?`,
          answer: `We charge a flat ₹1,000 refundable security deposit, returned immediately when the vehicle is checked back at return.`
        }
      ],
      idealFor: ['Daily Commutes', 'Weekend City Tours', 'Expressway Rides'],
      metaTitle: `${dbBike.name} on Rent in Kolkata - ₹${dbBike.dailyRate}/day | Rydeit`,
      metaDescription: `Rent ${dbBike.name} in Kolkata starting at ₹${dbBike.dailyRate}/day. Clean machine, zero hidden charges, instant booking with Rydeit.`
    };
  }, [dbBike, staticDetail]);

  // If bike is not found in active Supabase fleet
  if (!bike) {
    if (fleetBikes.length === 0) {
      return (
        <div className="py-24 bg-brand-black min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
          <div className="w-10 h-10 border-4 border-brand-teal/20 border-t-brand-teal rounded-full animate-spin mb-4"></div>
          <p className="text-white/60 font-mono text-xs uppercase tracking-widest">Checking active fleet...</p>
        </div>
      );
    }

    return (
      <div className="py-24 bg-brand-black min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
        <span className="text-brand-orange text-xs font-bold uppercase tracking-widest mb-3">Rydeit Fleet</span>
        <h1 className="text-3xl font-heading text-white uppercase mb-4">Vehicle Model Not Found</h1>
        <p className="text-neutral-400 text-sm max-w-md mb-8">
          This vehicle model is currently not available in our active rental fleet in Kolkata or has been removed from inventory.
        </p>
        <Link to="/bikes" className="bg-brand-orange hover:bg-brand-yellow hover:text-brand-black text-white font-heading px-8 py-3.5 rounded-full text-xs uppercase tracking-widest transition-all">
          Browse All Fleet
        </Link>
      </div>
    );
  }

  // Related machines in same category from live Supabase fleet
  const relatedBikes = fleetBikes
    .filter(b => b.id !== bike.id && b.category === bike.category)
    .slice(0, 3)
    .map(b => ({
      id: b.id,
      name: b.name,
      slug: getBikeSlugById(b.id, b.name),
      imageUrl: b.imageUrl,
      dailyRate: b.dailyRate,
      tagline: b.description || `${b.category} self-drive rental in Kolkata`
    }));

  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    'name': `${bike.name} on Rent in Kolkata`,
    'image': `https://rydeit.in${bike.imageUrl}`,
    'description': bike.overview,
    'brand': {
      '@type': 'Brand',
      'name': 'Rydeit'
    },
    'offers': {
      '@type': 'Offer',
      'url': `https://rydeit.in/bikes/${bike.slug}`,
      'priceCurrency': 'INR',
      'price': bike.dailyRate.toString(),
      'availability': 'https://schema.org/InStock',
      'seller': {
        '@type': 'AutoRental',
        'name': 'Rydeit - Bike & Scooter Rentals in Kolkata'
      }
    }
  };

  return (
    <div className="min-h-screen bg-brand-black text-brand-gray-light py-12">
      <SEOHead
        title={bike.metaTitle}
        description={bike.metaDescription}
        canonicalPath={`/bikes/${bike.slug}`}
        image={bike.imageUrl}
        schema={schemaData}
      />

      <div className="container mx-auto px-4 max-w-6xl">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-8 text-xs uppercase tracking-widest text-neutral-400">
          <ol className="flex items-center gap-2 flex-wrap">
            <li>
              <Link to="/" className="hover:text-brand-orange transition-colors">Home</Link>
            </li>
            <li>/</li>
            <li>
              <Link to="/bikes" className="hover:text-brand-orange transition-colors">Fleet</Link>
            </li>
            <li>/</li>
            <li>
              <Link 
                to={bike.category === 'Scooter' ? '/scooters' : '/motorcycles'} 
                className="hover:text-brand-orange transition-colors"
              >
                {bike.category}
              </Link>
            </li>
            <li>/</li>
            <li className="text-brand-orange font-bold">{bike.name}</li>
          </ol>
        </nav>

        {/* Hero Product Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start mb-16">
          {/* Left Column: Big Visual Image Card */}
          <div className="lg:col-span-6 bg-brand-gray-dark/40 border border-white/10 rounded-3xl overflow-hidden p-6 relative group shadow-2xl">
            <div className="relative h-80 sm:h-96 w-full rounded-2xl overflow-hidden bg-black/40 flex items-center justify-center">
              <img
                src={bike.imageUrl}
                alt={`${bike.name} on rent in Kolkata`}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <span className="absolute top-4 left-4 bg-brand-teal/90 text-brand-black text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                Available in Kolkata
              </span>
              <span className="absolute top-4 right-4 bg-black/80 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-white/10">
                {bike.category}
              </span>
            </div>

            {/* Quick Badges below image */}
            <div className="grid grid-cols-3 gap-3 mt-4 text-center">
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="block text-[10px] text-neutral-400 uppercase tracking-widest">Security Deposit</span>
                <span className="font-heading text-sm text-brand-yellow font-bold">₹1,000 Flat</span>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="block text-[10px] text-neutral-400 uppercase tracking-widest">Free Helmet</span>
                <span className="font-heading text-sm text-brand-teal font-bold">1x ISI Helmet</span>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="block text-[10px] text-neutral-400 uppercase tracking-widest">Delivery</span>
                <span className="font-heading text-sm text-brand-orange font-bold">In Minutes</span>
              </div>
            </div>
          </div>

          {/* Right Column: Pricing & Booking Actions */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              <span className="text-brand-orange text-xs font-black uppercase tracking-[0.3em] block mb-2">
                Self-Drive Rental in Kolkata
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading text-white uppercase tracking-tight leading-tight">
                {bike.name}
              </h1>
              <p className="text-sm text-neutral-300 mt-3 font-sans leading-relaxed">
                {bike.tagline}
              </p>
            </div>

            {/* Pricing Tile */}
            <div className="bg-brand-gray-dark/60 border border-white/10 p-6 rounded-2xl flex items-baseline justify-between shadow-xl">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 block mb-1">
                  Starting Daily Rate
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-heading text-brand-yellow">₹{bike.dailyRate}</span>
                  <span className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">/ 24 Hours</span>
                </div>
              </div>
              <div className="text-right space-y-1 text-xs">
                <span className="block text-emerald-400 font-bold">✓ 15% Off for 7+ Days</span>
                <span className="block text-neutral-400">Zero Hidden Booking Surcharges</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                onClick={() => navigate(`/book?bikeId=${bike.id}`)}
                className="w-full bg-brand-orange hover:bg-brand-yellow hover:text-brand-black text-white py-4 px-8 rounded-full font-heading text-sm tracking-widest uppercase font-bold transition-all transform hover:scale-[1.02] shadow-[0_0_25px_rgba(255,95,31,0.35)] cursor-pointer"
              >
                Book This Machine Online →
              </button>

              <div className="grid grid-cols-2 gap-3">
                <a
                  href="tel:+917980869336"
                  className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border border-white/10"
                >
                  <Phone className="w-4 h-4 text-brand-teal" />
                  Call: +91 7980869336
                </a>
                <a
                  href={`https://wa.me/917980869336?text=${encodeURIComponent(`Hi Rydeit, I want to rent the ${bike.name} in Kolkata.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border border-emerald-500/20"
                >
                  <Zap className="w-4 h-4 text-emerald-400" />
                  Chat on WhatsApp
                </a>
              </div>
            </div>

            {/* Highlights List */}
            <div className="border-t border-white/10 pt-4 space-y-2">
              {bike.whyRent.map((point, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-neutral-300">
                  <CheckCircle2 className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Specifications Table */}
        <section className="mb-16 bg-brand-gray-dark/30 border border-white/5 p-8 rounded-3xl">
          <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-4">
            <h2 className="text-2xl font-heading text-white uppercase tracking-wide">
              Technical Specifications &amp; Performance
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-black/40 p-4 rounded-xl border border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 block mb-1">
                Displacement / Engine
              </span>
              <span className="text-sm font-semibold text-white">{bike.specs.displacement}</span>
            </div>

            <div className="bg-black/40 p-4 rounded-xl border border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 block mb-1">
                Maximum Power Output
              </span>
              <span className="text-sm font-semibold text-white">{bike.specs.maxPower}</span>
            </div>

            <div className="bg-black/40 p-4 rounded-xl border border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 block mb-1">
                Peak Torque
              </span>
              <span className="text-sm font-semibold text-white">{bike.specs.maxTorque}</span>
            </div>

            <div className="bg-black/40 p-4 rounded-xl border border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 block mb-1">
                Tested Mileage / Range
              </span>
              <span className="text-sm font-semibold text-brand-yellow font-bold">{bike.specs.mileage}</span>
            </div>

            <div className="bg-black/40 p-4 rounded-xl border border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 block mb-1">
                Fuel Tank Capacity
              </span>
              <span className="text-sm font-semibold text-white">{bike.specs.fuelTank}</span>
            </div>

            <div className="bg-black/40 p-4 rounded-xl border border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 block mb-1">
                Transmission System
              </span>
              <span className="text-sm font-semibold text-white">{bike.specs.transmission}</span>
            </div>

            <div className="bg-black/40 p-4 rounded-xl border border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 block mb-1">
                Kerb Weight
              </span>
              <span className="text-sm font-semibold text-white">{bike.specs.kerbWeight}</span>
            </div>

            <div className="bg-black/40 p-4 rounded-xl border border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 block mb-1">
                Saddle / Seat Height
              </span>
              <span className="text-sm font-semibold text-white">{bike.specs.seatHeight}</span>
            </div>

            <div className="bg-black/40 p-4 rounded-xl border border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 block mb-1">
                Braking Technology
              </span>
              <span className="text-sm font-semibold text-brand-teal font-bold">{bike.specs.braking}</span>
            </div>
          </div>
        </section>

        {/* Detailed Vehicle Narrative */}
        <section className="mb-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-8 bg-brand-gray-dark/30 border border-white/5 p-8 rounded-3xl space-y-4">
            <h2 className="text-2xl font-heading text-white uppercase tracking-wide">
              About the {bike.name} in Kolkata
            </h2>
            <p className="text-sm text-neutral-300 leading-relaxed font-sans">
              {bike.overview}
            </p>
            <p className="text-xs text-neutral-400 leading-relaxed pt-2">
              Every unit in the Rydeit Kolkata fleet undergoes an extensive 28-point mechanical and safety inspection before delivery. We test tyre tread depth, brake pad caliper clearances, engine oil viscosity (Motul 100% synthetic/semi-synthetic lubricants), and electrical signals to ensure zero road breakdown surprises.
            </p>
          </div>

          <div className="lg:col-span-4 bg-brand-gray-dark/50 border border-white/5 p-8 rounded-3xl flex flex-col justify-between space-y-6">
            <div>
              <h3 className="text-lg font-heading text-brand-orange uppercase mb-4 tracking-wide">
                Ideal Rider Profiles
              </h3>
              <ul className="space-y-3">
                {bike.idealFor.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-neutral-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-teal"></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-black/50 border border-white/5 text-[11px] text-neutral-400 space-y-1">
              <p className="font-bold text-white">📍 Garage Address</p>
              <p>6C, Mohammadan Burial Ground Lane, Kidderpore, Kolkata - 700023</p>
            </div>
          </div>
        </section>

        {/* Frequently Asked Questions */}
        <section className="mb-16">
          <div className="text-center mb-10">
            <span className="text-brand-teal text-[10px] font-black uppercase tracking-[0.3em] block mb-2">
              Got Questions?
            </span>
            <h2 className="text-3xl font-heading text-white uppercase tracking-tight">
              FAQs About Renting the {bike.name}
            </h2>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {bike.faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="bg-brand-gray-dark/40 border border-white/5 rounded-2xl overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    <span className="text-sm font-bold text-white tracking-wide">
                      {faq.question}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-brand-orange shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs text-neutral-300 leading-relaxed border-t border-white/5 bg-black/20">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Bottom Booking CTA Banner */}
        <div className="bg-gradient-to-r from-brand-orange/20 via-brand-teal/20 to-brand-yellow/20 p-8 md:p-12 rounded-[2.5rem] border border-white/10 text-center space-y-6 mb-16">
          <span className="text-xs font-black uppercase tracking-[0.3em] text-brand-yellow">
            Rental Bikes. Delivered in minutes.
          </span>
          <h2 className="text-3xl md:text-5xl font-heading text-white uppercase tracking-tight">
            Ready to Ride the {bike.name}?
          </h2>
          <p className="text-xs md:text-sm text-neutral-300 max-w-xl mx-auto">
            Reserve online with a nominal ₹500 advance payment. Complimentary ISI helmet, paperless KYC, and flat ₹1,000 security deposit included.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <button
              onClick={() => navigate(`/book?bikeId=${bike.id}`)}
              className="bg-brand-orange hover:bg-brand-yellow hover:text-brand-black text-white py-4 px-10 rounded-full font-heading text-xs tracking-widest uppercase font-bold shadow-xl transition-all"
            >
              Book Now at ₹{bike.dailyRate}/day
            </button>
            <Link
              to="/bikes"
              className="bg-white/10 hover:bg-white/20 text-white py-4 px-8 rounded-full font-heading text-xs tracking-widest uppercase font-bold transition-all border border-white/10 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> View Other Fleet Models
            </Link>
          </div>
        </div>

        {/* Related Bikes Section */}
        {relatedBikes.length > 0 && (
          <section className="space-y-6">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <h3 className="text-xl font-heading text-white uppercase tracking-wider">
                More {bike.category} Rentals in Kolkata
              </h3>
              <Link to="/bikes" className="text-xs font-bold text-brand-orange hover:text-brand-yellow uppercase tracking-wider">
                View All →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedBikes.map(rel => (
                <div
                  key={rel.slug}
                  className="bg-brand-gray-dark/40 border border-white/5 rounded-2xl overflow-hidden p-5 flex flex-col justify-between hover:border-brand-teal/40 transition-all group"
                >
                  <div>
                    <img
                      src={rel.imageUrl}
                      alt={rel.name}
                      className="w-full h-40 object-cover rounded-xl mb-4 group-hover:scale-105 transition-transform"
                    />
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-heading text-base font-bold text-white uppercase">{rel.name}</h4>
                      <span className="text-brand-yellow font-heading text-sm">₹{rel.dailyRate}/day</span>
                    </div>
                    <p className="text-xs text-neutral-400 line-clamp-2">{rel.tagline}</p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/5 flex gap-2">
                    <Link
                      to={`/bikes/${rel.slug}`}
                      className="flex-1 text-center bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                    >
                      View Specs
                    </Link>
                    <button
                      onClick={() => navigate(`/book?bikeId=${rel.id}`)}
                      className="flex-1 bg-brand-orange hover:bg-brand-yellow hover:text-brand-black text-white py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                    >
                      Rent
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
