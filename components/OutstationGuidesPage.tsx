import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SEOHead } from './SEOHead';
import { Compass, MapPin, Fuel, ShieldAlert, CheckCircle2, ChevronDown, ChevronUp, ArrowRight, Sun, Award } from 'lucide-react';

export const OutstationGuidesPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTrip, setActiveTrip] = useState<string>('digha');

  const roadTrips = [
    {
      id: 'digha',
      title: 'Kolkata to Digha',
      distance: '185 km',
      duration: '4.5 Hours',
      highway: 'NH-16 & NH-116B',
      heroImage: '/images/re-classic-350.jpg',
      tagline: 'Bengal’s most popular coastal ride with 4-lane expressway and seaside sunrise',
      routeSummary: 'Kolkata → Vidyasagar Setu → Kona Expressway → NH-16 (Kolaghat) → Nandakumar (turn off) → Contai (Kanthi) → Digha Beach.',
      keyStops: [
        { name: 'Kolaghat Breakfast Stop (55 km)', detail: 'Iconic highway fuel & breakfast hub. Stop at Sher-e-Punjab or Express Food Plaza for hot tandoori parathas and chai.' },
        { name: 'Nandakumar Junction (95 km)', detail: 'Take the smooth 2-lane NH-116B bypass towards Contai with lush green paddy views.' },
        { name: 'Old Digha vs New Digha', detail: 'New Digha has wider paved parking promenades; Old Digha offers rugged sea walls and fish markets.' }
      ],
      ridingTips: 'Two-wheelers are 100% exempt from toll tax on NH-16 and NH-116B. Keep tyre pressures checked at 32 psi rear before departing.',
      recommendedBike: 'Royal Enfield Classic 350 or Hunter 350'
    },
    {
      id: 'mandarmani',
      title: 'Kolkata to Mandarmani',
      distance: '170 km',
      duration: '4 Hours',
      highway: 'NH-16 & Coastal State Highway',
      heroImage: '/images/re-hunter-350.jpg',
      tagline: 'Secluded luxury beach resorts, red crab beaches & sea breezes',
      routeSummary: 'Kolkata → NH-16 → Kolaghat → Nandakumar → Contai → Chawalkhola turnoff → Mandarmani.',
      keyStops: [
        { name: 'Chawalkhola Crossing (150 km)', detail: 'Exit NH-116B and take the scenic rural road lined with coconut palms leading directly to the coastline.' },
        { name: 'Mandarmani Beachfront', detail: 'Park at resort premises. Note: Driving directly on the beach sand is strictly banned by local maritime authorities to protect ecology and prevent salt-corrosion.' }
      ],
      ridingTips: 'Rinse your motorcycle with fresh tap water at the resort to wash off salt spray and prevent chain corrosion before riding back.',
      recommendedBike: 'Royal Enfield Hunter 350 or TVS Apache RTR 160 4V'
    },
    {
      id: 'bakkhali',
      title: 'Kolkata to Bakkhali & Henry’s Island',
      distance: '130 km',
      duration: '3.5 Hours',
      highway: 'NH-12 (Diamond Harbour Road)',
      heroImage: '/images/ktm-duke-390.jpg',
      tagline: 'Tranquil delta scenery, mangrove forests, and the iconic Namkhana Bridge',
      routeSummary: 'Kolkata (Taratala) → Diamond Harbour → Kulpi → Kakdwip → Namkhana Bridge → Bakkhali Beach.',
      keyStops: [
        { name: 'Diamond Harbour Promenade (50 km)', detail: 'Spectacular views where the Hooghly River meets the Bay of Bengal estuary.' },
        { name: 'Hatania-Doania Bridge (Namkhana, 105 km)', detail: 'Replaced the old vessel ferry; enjoy seamless high-altitude bridge crossing over tidal rivers.' },
        { name: 'Henry’s Island Mangrove Trail', detail: 'Fisheries department watchtower offering panoramic 360-degree views of Sundarban mangroves.' }
      ],
      ridingTips: 'The initial stretch until Amtala has heavy bus traffic; start early at 5:30 AM to clear city limits briskly.',
      recommendedBike: 'Bajaj Pulsar NS200 or KTM Duke 390'
    },
    {
      id: 'shantiniketan',
      title: 'Kolkata to Shantiniketan (Bolpur)',
      distance: '165 km',
      duration: '3.5 Hours',
      highway: 'NH-19 (Durgapur Expressway)',
      heroImage: '/images/yamaha-r15-v4.jpg',
      tagline: 'Cultural pilgrimage through Bengal’s fastest expressway and serene red-soil sal forests',
      routeSummary: 'Kolkata → Dankuni → NH-19 6-lane Durgapur Expressway → Shaktigarh → Bardhaman Bypass → Panagarh / Ilambazar Forest → Bolpur.',
      keyStops: [
        { name: 'Shaktigarh Langcha Hub (80 km)', detail: 'Mandatory pit stop for Bengal’s famous sweet hot Langchas and savory kachoris.' },
        { name: 'Ilambazar Sal Forest (145 km)', detail: 'Canopy-covered winding road cutting through dense Sal forests with fresh earthy red-soil aroma.' },
        { name: 'Khowai & Sonajhurir Haat', detail: 'Saturday tribal artisan market along the banks of the Kopai River.' }
      ],
      ridingTips: 'NH-19 is a world-class 6-lane expressway. Maintain lane discipline and watch for slow-moving agricultural tractors near village exits.',
      recommendedBike: 'Royal Enfield Classic 350 or Bajaj Pulsar 150'
    }
  ];

  const current = roadTrips.find(t => t.id === activeTrip) || roadTrips[0];

  return (
    <div className="min-h-screen bg-brand-black text-brand-gray-light py-12">
      <SEOHead
        title="Outstation Bike Rental Tours from Kolkata - Digha, Mandarmani, Bakkhali | Rydeit"
        description="Plan your weekend motorcycle trip from Kolkata to Digha (185km), Mandarmani, Bakkhali & Shantiniketan. Routes, highway tips, fuel stops & ₹99/day outstation terms."
        canonicalPath="/outstation-bike-rentals"
        image="/images/re-classic-350.jpg"
      />

      <div className="container mx-auto px-4 max-w-6xl">
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
            <li className="text-brand-orange font-bold">Outstation Touring Guides</li>
          </ol>
        </nav>

        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-16 space-y-6">
          <span className="text-brand-yellow text-xs font-black uppercase tracking-[0.4em] block">
            Weekend Road Trips from Kolkata
          </span>
          <h1 className="text-4xl md:text-6xl font-heading text-white uppercase tracking-tight">
            Outstation Bike Rental <br />
            <span className="text-brand-orange">Routes &amp; Travel Guides</span>
          </h1>
          <p className="text-sm md:text-base text-neutral-300 leading-relaxed font-sans max-w-2xl mx-auto">
            Escape the concrete jungle. Rydeit provides highway-certified, touring-ready motorcycles with comprehensive paperwork for your coastal and heritage road trips across West Bengal.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <button
              onClick={() => navigate('/book?outstation=true')}
              className="bg-brand-orange hover:bg-brand-yellow hover:text-brand-black text-white font-heading text-xs uppercase tracking-widest font-bold py-4 px-10 rounded-full transition-all shadow-[0_0_25px_rgba(255,95,31,0.35)] cursor-pointer"
            >
              Book an Outstation Machine (₹99/day surcharge) →
            </button>
            <a
              href="tel:+917980869336"
              className="bg-white/10 hover:bg-white/20 text-white font-heading text-xs uppercase tracking-widest font-bold py-4 px-8 rounded-full transition-all border border-white/10"
            >
              Touring Desk: +91 7980869336
            </a>
          </div>
        </div>

        {/* Interactive Trip Tabs */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {roadTrips.map(trip => (
            <button
              key={trip.id}
              onClick={() => setActiveTrip(trip.id)}
              className={`py-3 px-6 rounded-full font-heading text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTrip === trip.id
                  ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/30'
                  : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              {trip.title}
            </button>
          ))}
        </div>

        {/* Active Route Deep Dive Card */}
        <div className="bg-brand-gray-dark/50 border border-white/10 rounded-[2.5rem] p-8 md:p-12 mb-20 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-7 space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="bg-brand-teal/20 text-brand-teal text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border border-brand-teal/30">
                  {current.highway}
                </span>
                <span className="bg-white/10 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  Distance: {current.distance}
                </span>
                <span className="bg-white/10 text-brand-yellow text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  Est. Ride Time: {current.duration}
                </span>
              </div>

              <h2 className="text-3xl md:text-4xl font-heading text-white uppercase tracking-tight">
                {current.title} Road Trip Guide
              </h2>
              <p className="text-sm text-neutral-300 font-sans leading-relaxed">
                {current.tagline}
              </p>

              <div className="bg-black/50 p-4 rounded-2xl border border-white/5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 block mb-1">
                  Turn-by-Turn Route Navigation:
                </span>
                <p className="text-xs text-brand-teal font-mono">
                  {current.routeSummary}
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <h3 className="font-heading text-base text-white uppercase tracking-wider">
                  Must-Visit Highway Stops &amp; Fuel Points
                </h3>
                <div className="space-y-3">
                  {current.keyStops.map((stop, idx) => (
                    <div key={idx} className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-1">
                      <h4 className="text-xs font-bold text-brand-yellow uppercase tracking-wide">
                        {stop.name}
                      </h4>
                      <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                        {stop.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-brand-orange/10 border border-brand-orange/20 p-4 rounded-xl flex items-start gap-3 text-xs text-neutral-300">
                <ShieldAlert className="w-5 h-5 text-brand-orange shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block mb-0.5">Rider Safety Tip:</span>
                  <span>{current.ridingTips}</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-6">
              <div className="rounded-3xl overflow-hidden border border-white/10 relative h-72">
                <img
                  src={current.heroImage}
                  alt={current.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                <div className="absolute bottom-4 left-4 right-4 text-xs font-semibold text-white">
                  Recommended machine: <span className="text-brand-yellow font-bold">{current.recommendedBike}</span>
                </div>
              </div>

              <div className="bg-black/40 border border-white/5 p-6 rounded-2xl space-y-4">
                <h3 className="font-heading text-sm text-white uppercase tracking-wider">
                  Rydeit Outstation Rental Benefits
                </h3>
                <ul className="space-y-2.5 text-xs text-neutral-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Commercial Yellow-Plate RC copy &amp; active PUC included</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Comprehensive commercial third-party insurance</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Luggage bungee cords and smartphone mounts provided free</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Flat ₹1,000 security deposit across all machines</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Nominal outstation fee: only ₹99/day outside Kolkata</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => navigate('/book?outstation=true')}
                className="w-full bg-brand-orange hover:bg-brand-yellow hover:text-brand-black text-white py-4 rounded-xl font-heading text-xs tracking-widest uppercase font-bold transition-all shadow-xl"
              >
                Book This Route Now →
              </button>
            </div>
          </div>
        </div>

        {/* Touring Checklist Grid */}
        <section className="bg-brand-gray-dark/30 border border-white/5 p-8 md:p-12 rounded-[2.5rem] mb-20">
          <div className="text-center mb-10">
            <span className="text-brand-teal text-xs font-black uppercase tracking-[0.3em] block mb-2">
              Prepare Like a Pro
            </span>
            <h2 className="text-3xl font-heading text-white uppercase tracking-tight">
              Pre-Trip Outstation Checklist
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-neutral-300">
            <div className="bg-black/50 p-6 rounded-2xl border border-white/5 space-y-3">
              <h3 className="font-heading text-sm text-brand-yellow uppercase">1. Documents Checklist</h3>
              <p>Carry your original physical Driving License and a photo ID (Aadhaar or Voter ID). The vehicle document binder (RC, Insurance, PUC) is handed over at dispatch.</p>
            </div>

            <div className="bg-black/50 p-6 rounded-2xl border border-white/5 space-y-3">
              <h3 className="font-heading text-sm text-brand-teal uppercase">2. Highway Riding Gear</h3>
              <p>One ISI helmet is included free. We strongly recommend sturdy ankle shoes, riding gloves, and a windproof jacket. Pillion riders must also wear helmets by West Bengal law.</p>
            </div>

            <div className="bg-black/50 p-6 rounded-2xl border border-white/5 space-y-3">
              <h3 className="font-heading text-sm text-brand-orange uppercase">3. Fuel &amp; Navigation</h3>
              <p>Top up on NH-16 (Kolaghat) or NH-19 (Dankuni) at company-owned petrol pumps (BPCL / IOCL Coco outlets). Smartphone mounts keep Google Maps visible hands-free.</p>
            </div>
          </div>
        </section>

        {/* Bottom Banner */}
        <div className="text-center bg-gradient-to-r from-brand-orange/20 to-brand-teal/20 p-8 md:p-12 rounded-[2.5rem] border border-white/10 space-y-4">
          <h2 className="text-3xl font-heading text-white uppercase tracking-tight">
            Ready to Conquer the Bengal Highways?
          </h2>
          <p className="text-xs md:text-sm text-neutral-300 max-w-xl mx-auto">
            Choose your companion from our Royal Enfield cruisers, sports streetfighters, or high-mileage commuters.
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate('/book?outstation=true')}
              className="bg-brand-orange hover:bg-brand-yellow hover:text-brand-black text-white py-4 px-10 rounded-full font-heading text-xs tracking-widest uppercase font-bold transition-all shadow-xl"
            >
              Book an Outstation Bike Today
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
