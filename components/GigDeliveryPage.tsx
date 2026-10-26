import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SEOHead } from './SEOHead';
import { Bike, ShieldCheck, Zap, DollarSign, Clock, CheckCircle2, Phone, Sparkles, Wrench, ArrowRight } from 'lucide-react';

export const GigDeliveryPage: React.FC = () => {
  const navigate = useNavigate();

  const benefits = [
    {
      icon: <Zap className="w-6 h-6 text-brand-yellow" />,
      title: 'Ultra Fuel-Efficient Machines (55-62 km/L)',
      desc: 'Our Honda Activa 125 and Shine 125 fleets run on refined eSP technology that cuts your daily petrol expenses in half, maximizing your net take-home earnings on every delivery run.'
    },
    {
      icon: <Clock className="w-6 h-6 text-brand-orange" />,
      title: '90-Minute Breakdown Replacement Guarantee',
      desc: 'Never lose incentive pay or shift ratings. If a mechanical issue occurs, our mobile mechanic van reaches you anywhere in Kolkata or provides an immediate bike exchange within 90 minutes.'
    },
    {
      icon: <Wrench className="w-6 h-6 text-brand-teal" />,
      title: '100% Free Servicing & Oil Changes Included',
      desc: 'Routine maintenance, brake adjustments, chain lubing, and Motul periodic oil replacements are completely covered by Rydeit at our central Kidderpore garage. You pay zero maintenance out of pocket.'
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-emerald-400" />,
      title: 'Flat ₹1,000 Refundable Deposit',
      desc: 'No heavy downpayments or predatory financing. Start riding today with a flat ₹1,000 refundable security deposit and simple paperless KYC.'
    }
  ];

  const vehicleOptions = [
    {
      name: 'Honda Activa 125',
      category: 'Automatic Scooter',
      daily: '₹700/day',
      weekly: '₹3,999/week',
      mileage: '50 - 55 kmpl',
      ideal: 'Food Delivery (Swiggy, Zomato) & Quick Grocery (Zepto, Blinkit)',
      perks: ['All-metal body', 'Front hook for grocery bags', 'Zero gear shifting in Kolkata traffic'],
      id: 16
    },
    {
      name: 'Honda Shine 125',
      category: '5-Speed Motorcycle',
      daily: '₹700/day',
      weekly: '₹3,999/week',
      mileage: '58 - 65 kmpl',
      ideal: 'High-Kilometer Delivery Shifts & Parcel Courier (Rapido, Shadowfax)',
      perks: ['Lowest fuel consumption in Kolkata', 'Smooth 5-speed transmission', 'Low fatigue upright posture'],
      id: 3
    },
    {
      name: 'Ather 450X Gen 3',
      category: 'Electric Smart Scooter',
      daily: '₹900/day',
      weekly: '₹4,999/week',
      mileage: 'Zero Petrol Cost (₹0.25/km electricity)',
      ideal: 'Salt Lake & New Town Tech Park Quick-Commerce',
      perks: ['Zero petrol expense', 'Free home charger included', 'Warp mode for speedy deliveries'],
      id: 19
    }
  ];

  return (
    <div className="min-h-screen bg-brand-black text-brand-gray-light py-12">
      <SEOHead
        title="Delivery Bike & Scooter Rentals in Kolkata - Swiggy, Zomato, Zepto | Rydeit"
        description="Affordable bike & scooter rentals for Swiggy, Zomato, Rapido, Zepto & Blinkit riders in Kolkata. Starting ₹599/day, 90-min bike replacement, free maintenance, ₹1,000 deposit."
        canonicalPath="/delivery-bike-rentals"
        image="/images/honda-activa-125.jpg"
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
            <li className="text-brand-orange font-bold">Delivery Partner Rentals</li>
          </ol>
        </nav>

        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-16 space-y-6">
          <span className="text-brand-orange text-xs font-black uppercase tracking-[0.4em] block">
            Kolkata’s Most Trusted Partner Fleet
          </span>
          <h1 className="text-4xl md:text-6xl font-heading text-white uppercase tracking-tight">
            Commercial Bike Rentals for <br />
            <span className="text-brand-yellow">Gig &amp; Delivery Riders</span>
          </h1>
          <p className="text-sm md:text-base text-neutral-300 leading-relaxed font-sans max-w-2xl mx-auto">
            Deliver for Swiggy, Zomato, Zepto, Blinkit, Rapido, or Shadowfax without buying a bike or getting locked into vehicle EMIs. Get a fully serviced machine delivered in minutes.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <button
              onClick={() => navigate('/book')}
              className="bg-brand-orange hover:bg-brand-yellow hover:text-brand-black text-white font-heading text-xs uppercase tracking-widest font-bold py-4 px-10 rounded-full transition-all shadow-[0_0_25px_rgba(255,95,31,0.35)] cursor-pointer"
            >
              Start Riding Today (Starting ₹599/day) →
            </button>
            <a
              href="tel:+917980869336"
              className="bg-white/10 hover:bg-white/20 text-white font-heading text-xs uppercase tracking-widest font-bold py-4 px-8 rounded-full transition-all border border-white/10"
            >
              Call Delivery Desk: +91 7980869336
            </a>
          </div>
        </div>

        {/* Key Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          {benefits.map((b, i) => (
            <div
              key={i}
              className="bg-brand-gray-dark/50 border border-white/10 rounded-3xl p-8 space-y-4 hover:border-brand-orange/40 transition-all shadow-xl"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-black/60 rounded-2xl border border-white/10">
                  {b.icon}
                </div>
                <h2 className="text-lg font-heading text-white uppercase tracking-wide">
                  {b.title}
                </h2>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                {b.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Recommended Delivery Machines */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <span className="text-brand-teal text-xs font-black uppercase tracking-[0.3em] block mb-2">
              Tested for Kolkata Shifts
            </span>
            <h2 className="text-3xl font-heading text-white uppercase tracking-tight">
              Top Vehicles for Delivery Partners
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {vehicleOptions.map((v, idx) => (
              <div
                key={idx}
                className="bg-brand-gray-dark/40 border border-white/10 rounded-3xl p-8 flex flex-col justify-between hover:border-brand-teal/40 transition-all shadow-2xl group"
              >
                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-brand-orange block mb-1">
                      {v.category}
                    </span>
                    <h3 className="text-2xl font-heading text-white uppercase tracking-wide">
                      {v.name}
                    </h3>
                    <p className="text-xs text-brand-teal font-semibold mt-1">
                      {v.ideal}
                    </p>
                  </div>

                  <div className="bg-black/50 p-4 rounded-2xl border border-white/5 space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-neutral-400">Daily Rate:</span>
                      <span className="font-heading text-lg text-white font-bold">{v.daily}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-neutral-400">Weekly Plan:</span>
                      <span className="font-heading text-lg text-brand-yellow font-bold">{v.weekly}</span>
                    </div>
                    <div className="flex justify-between items-baseline border-t border-white/5 pt-2">
                      <span className="text-xs text-neutral-400">Tested Mileage:</span>
                      <span className="text-xs font-bold text-emerald-400">{v.mileage}</span>
                    </div>
                  </div>

                  <ul className="space-y-2 text-xs text-neutral-300">
                    {v.perks.map((p, pi) => (
                      <li key={pi} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-brand-teal shrink-0" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6">
                  <button
                    onClick={() => navigate(`/book?bikeId=${v.id}`)}
                    className="w-full bg-brand-orange hover:bg-brand-yellow hover:text-brand-black text-white py-3 rounded-xl font-heading text-xs tracking-widest uppercase font-bold transition-all shadow-lg"
                  >
                    Rent {v.name} →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Delivery Partner FAQs */}
        <section className="bg-brand-gray-dark/30 border border-white/5 p-8 md:p-12 rounded-[2.5rem] mb-20 max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-heading text-white uppercase tracking-wide">
              Frequently Asked Questions by Delivery Riders
            </h2>
          </div>

          <div className="space-y-4 text-xs text-neutral-300">
            <div className="bg-black/40 p-5 rounded-2xl border border-white/5 space-y-1.5">
              <h3 className="font-bold text-white text-sm">Can I register the rental bike on my Swiggy / Zomato rider app?</h3>
              <p className="leading-relaxed">Yes! We provide the complete digital vehicle registration certificate (RC), valid third-party commercial insurance certificate, and emission PUC. You can upload these directly to your partner portal.</p>
            </div>

            <div className="bg-black/40 p-5 rounded-2xl border border-white/5 space-y-1.5">
              <h3 className="font-bold text-white text-sm">How quickly is the security deposit refunded when I stop riding?</h3>
              <p className="leading-relaxed">Your ₹1,000 deposit is refunded immediately to your UPI ID or bank account as soon as the bike is returned and inspected at our Kidderpore garage.</p>
            </div>

            <div className="bg-black/40 p-5 rounded-2xl border border-white/5 space-y-1.5">
              <h3 className="font-bold text-white text-sm">What happens if a tyre gets punctured during a late-night delivery?</h3>
              <p className="leading-relaxed">Our 24/7 roadside assistance is on call. For punctures, any roadside repair shop can fix it for ₹50, or our mobile support team will attend to you if nearby.</p>
            </div>
          </div>
        </section>

        {/* CTA Bar */}
        <div className="text-center bg-gradient-to-r from-brand-orange/20 via-brand-yellow/20 to-brand-teal/20 p-8 md:p-12 rounded-[2.5rem] border border-white/10 space-y-4">
          <h2 className="text-3xl font-heading text-white uppercase tracking-tight">
            Start Earning More in Kolkata Today
          </h2>
          <p className="text-xs md:text-sm text-neutral-300 max-w-xl mx-auto">
            Book online in under 2 minutes or visit our central garage at 6C Mohammadan Burial Ground Lane, Kidderpore.
          </p>
          <button
            onClick={() => navigate('/book')}
            className="bg-brand-orange hover:bg-brand-yellow hover:text-brand-black text-white py-4 px-10 rounded-full font-heading text-xs tracking-widest uppercase font-bold transition-all shadow-xl"
          >
            Get Your Delivery Ride Now
          </button>
        </div>
      </div>
    </div>
  );
};
