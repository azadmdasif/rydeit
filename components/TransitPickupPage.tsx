import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SEOHead } from './SEOHead';
import { Plane, Train, MapPin, Clock, ShieldCheck, CheckCircle2, Phone, Zap, ArrowRight, Luggage, Navigation } from 'lucide-react';

export const TransitPickupPage: React.FC = () => {
  const navigate = useNavigate();

  const hubs = [
    {
      id: 'airport',
      name: 'Kolkata Airport (CCU)',
      fullName: 'Netaji Subhash Chandra Bose International Airport',
      icon: <Plane className="w-8 h-8 text-brand-teal" />,
      tag: 'Terminal 2 Gate 1 Handover',
      desc: 'Arriving by flight? Skip taxi queues and surge pricing. We deliver your chosen scooter or motorcycle directly to the Terminal 2 arrival departure ramp or nearby airport parking.',
      timing: 'Handover in 10-15 minutes after baggage collection',
      transitTips: 'Direct access to Major Arterial Road (New Town / Rajarhat) and VIP Road to Salt Lake & Central Kolkata.',
      suggestedBikes: ['Suzuki Burgman (Wide footboard for trolley bag)', 'Honda Activa 125', 'RE Hunter 350']
    },
    {
      id: 'howrah',
      name: 'Howrah Railway Station (HWH)',
      fullName: 'Eastern & South Eastern Railway Mega Terminus',
      icon: <Train className="w-8 h-8 text-brand-orange" />,
      tag: 'Cab Road / Platform 23 Zone',
      desc: 'Arriving via Rajdhani, Vande Bharat, or long-distance trains? Avoid the notorious prepaid taxi wait. Your bike is handed over outside the station complex ready to roll over the iconic Howrah Bridge.',
      timing: 'Coordinated with your train arrival time via live WhatsApp tracking',
      transitTips: 'Fast passage across Vidyasagar Setu (Second Hooghly Bridge) or Strand Road into Central & South Kolkata.',
      suggestedBikes: ['TVS Jupiter 125 (33L under-seat storage)', 'Bajaj Pulsar 150', 'RE Classic 350']
    },
    {
      id: 'sealdah',
      name: 'Sealdah Railway Station (SDAH)',
      fullName: 'North & South Terminal Hub',
      icon: <Train className="w-8 h-8 text-brand-yellow" />,
      tag: 'Main Station Forecourt Handover',
      desc: 'Stepping off the train at Sealdah? We coordinate smooth drop-off near the station premises so you can head straight to your hotel or work without haggling with local auto stands.',
      timing: 'Pre-arranged 15 minutes before your train pulls onto the platform',
      transitTips: 'Centrally located with immediate connectivity to MG Road, Bowbazar, Park Circus, and the EM Bypass.',
      suggestedBikes: ['Honda Activa 125', 'Hero Xtreme 125R', 'Honda Shine 125']
    }
  ];

  return (
    <div className="min-h-screen bg-brand-black text-brand-gray-light py-12">
      <SEOHead
        title="Kolkata Airport & Railway Station Bike Rentals - CCU, Howrah, Sealdah | Rydeit"
        description="Rent self-drive bikes & scooters delivered directly to Netaji Subhash Chandra Bose Airport (CCU), Howrah Station, or Sealdah Station. ₹199 doorstep handover, zero waiting."
        canonicalPath="/pickup-kolkata"
        image="/images/re-hunter-350.jpg"
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
            <li className="text-brand-orange font-bold">Airport &amp; Station Delivery</li>
          </ol>
        </nav>

        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-16 space-y-6">
          <span className="text-brand-teal text-xs font-black uppercase tracking-[0.4em] block">
            Seamless Inbound Transit in Kolkata
          </span>
          <h1 className="text-4xl md:text-6xl font-heading text-white uppercase tracking-tight">
            Airport &amp; Railway Station <br />
            <span className="text-brand-orange">Bike &amp; Scooter Handover</span>
          </h1>
          <p className="text-sm md:text-base text-neutral-300 leading-relaxed font-sans max-w-2xl mx-auto">
            Landing at CCU Airport or arriving at Howrah / Sealdah? Don’t waste an hour negotiating taxi fares. We deliver your sanitized, fully-fueled two-wheeler right to the terminal exit.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <button
              onClick={() => navigate('/book?delivery=true')}
              className="bg-brand-orange hover:bg-brand-yellow hover:text-brand-black text-white font-heading text-xs uppercase tracking-widest font-bold py-4 px-10 rounded-full transition-all shadow-[0_0_25px_rgba(255,95,31,0.35)] cursor-pointer"
            >
              Book Airport / Station Delivery (₹199) →
            </button>
            <a
              href="tel:+917686022245"
              className="bg-white/10 hover:bg-white/20 text-white font-heading text-xs uppercase tracking-widest font-bold py-4 px-8 rounded-full transition-all border border-white/10"
            >
              Call Logistics: +91 7686022245
            </a>
          </div>
        </div>

        {/* 3 Main Transit Hubs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {hubs.map(hub => (
            <div
              key={hub.id}
              className="bg-brand-gray-dark/50 border border-white/10 rounded-3xl p-8 flex flex-col justify-between hover:border-brand-teal/40 transition-all shadow-xl group"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-black/60 rounded-2xl border border-white/10">
                    {hub.icon}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-brand-yellow bg-brand-yellow/10 border border-brand-yellow/20 px-3 py-1 rounded-full">
                    {hub.tag}
                  </span>
                </div>

                <div>
                  <h2 className="text-2xl font-heading text-white uppercase tracking-wide">
                    {hub.name}
                  </h2>
                  <p className="text-xs text-brand-teal font-semibold mt-1">
                    {hub.fullName}
                  </p>
                </div>

                <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                  {hub.desc}
                </p>

                <div className="space-y-2 pt-2 border-t border-white/5 text-xs text-neutral-300">
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-brand-orange shrink-0 mt-0.5" />
                    <span>{hub.timing}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Navigation className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
                    <span>{hub.transitTips}</span>
                  </div>
                </div>

                <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 block">
                    Recommended Vehicles:
                  </span>
                  <ul className="space-y-1 text-xs text-neutral-200">
                    {hub.suggestedBikes.map((sb, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{sb}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-6">
                <button
                  onClick={() => navigate('/book?delivery=true')}
                  className="w-full bg-white/10 hover:bg-brand-orange hover:text-white text-white py-3 rounded-xl font-heading text-xs tracking-wider uppercase font-bold transition-all"
                >
                  Book Handover Here
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* How Arrival Handover Works */}
        <section className="bg-brand-gray-dark/30 border border-white/5 p-8 md:p-12 rounded-[2.5rem] mb-20">
          <div className="text-center mb-12">
            <span className="text-brand-orange text-xs font-black uppercase tracking-[0.3em] block mb-2">
              Simple 4-Step Process
            </span>
            <h2 className="text-3xl font-heading text-white uppercase tracking-tight">
              How Transit Delivery Works
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-black/50 p-6 rounded-2xl border border-white/5 space-y-3">
              <span className="text-3xl font-heading text-brand-teal font-black">01</span>
              <h3 className="font-heading text-sm text-white uppercase">Reserve Online</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Choose your scooter or bike, select "Doorstep Delivery", and provide your flight or train number.
              </p>
            </div>

            <div className="bg-black/50 p-6 rounded-2xl border border-white/5 space-y-3">
              <span className="text-3xl font-heading text-brand-yellow font-black">02</span>
              <h3 className="font-heading text-sm text-white uppercase">Live WhatsApp Ping</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Our logistics rider connects on WhatsApp 1 hour before arrival with the bike RC number and exact meet point.
              </p>
            </div>

            <div className="bg-black/50 p-6 rounded-2xl border border-white/5 space-y-3">
              <span className="text-3xl font-heading text-brand-orange font-black">03</span>
              <h3 className="font-heading text-sm text-white uppercase">2-Minute Handover</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Quick digital inspection, helmet handover, ₹1,000 refundable deposit collection, and you take off immediately.
              </p>
            </div>

            <div className="bg-black/50 p-6 rounded-2xl border border-white/5 space-y-3">
              <span className="text-3xl font-heading text-white font-black">04</span>
              <h3 className="font-heading text-sm text-white uppercase">Departure Return</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                When heading back home, drop the vehicle right back at the departure terminal. Instant deposit refund.
              </p>
            </div>
          </div>
        </section>

        {/* Luggage Guidelines */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20 items-center">
          <div className="bg-brand-gray-dark/50 border border-white/10 p-8 rounded-3xl space-y-4">
            <div className="flex items-center gap-3">
              <Luggage className="w-6 h-6 text-brand-teal" />
              <h3 className="text-xl font-heading text-white uppercase tracking-wide">
                Luggage Handling Guidelines
              </h3>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Travelling with bags? Here is our practical recommendation for comfortable two-wheeler riding from the station or airport:
            </p>
            <ul className="space-y-2 text-xs text-neutral-300">
              <li className="flex items-start gap-2">
                <span className="text-brand-orange font-bold">•</span>
                <span><strong>Suzuki Burgman / Activa 125:</strong> Flat front footboard accommodates standard cabin-sized trolley bags (up to 22 inches) securely.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-orange font-bold">•</span>
                <span><strong>TVS Jupiter 125:</strong> 33-litre underseat storage effortlessly swallows overnight duffle bags and large backpacks.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-orange font-bold">•</span>
                <span><strong>Motorcycles:</strong> We provide complimentary bungee cords and luggage tie-down straps upon request.</span>
              </li>
            </ul>
          </div>

          <div className="bg-brand-gray-dark/50 border border-white/10 p-8 rounded-3xl space-y-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-brand-yellow" />
              <h3 className="text-xl font-heading text-white uppercase tracking-wide">
                Pricing &amp; Transparent Terms
              </h3>
            </div>
            <div className="space-y-3 text-xs text-neutral-300">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span>Airport / Station Delivery Fee</span>
                <span className="font-bold text-white">₹199 per trip</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span>Refundable Security Deposit</span>
                <span className="font-bold text-brand-yellow">₹1,000 Flat</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span>Safety Helmet</span>
                <span className="font-bold text-emerald-400">1x Included Free</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span>Advance to Lock Booking</span>
                <span className="font-bold text-white">₹500 (Adjusted in bill)</span>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Bar */}
        <div className="text-center bg-gradient-to-r from-brand-orange via-brand-yellow to-brand-teal p-1 rounded-3xl">
          <div className="bg-brand-black p-8 md:p-12 rounded-[1.4rem] space-y-6">
            <h2 className="text-3xl md:text-5xl font-heading text-white uppercase tracking-tight">
              Book Your Inbound Ride in Kolkata
            </h2>
            <p className="text-xs md:text-sm text-neutral-300 max-w-xl mx-auto">
              Tell us your train or flight schedule and we will have your machine waiting at the gates.
            </p>
            <button
              onClick={() => navigate('/book?delivery=true')}
              className="bg-brand-orange hover:bg-brand-yellow hover:text-brand-black text-white py-4 px-10 rounded-full font-heading text-xs tracking-widest uppercase font-bold transition-all shadow-xl"
            >
              Schedule Transit Delivery Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
