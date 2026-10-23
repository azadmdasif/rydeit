import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SEOHead } from './SEOHead';
import { Wrench, ShieldCheck, Clock, Award, Users, CheckCircle2, MapPin, Phone, Mail } from 'lucide-react';
import { GARAGE_ADDRESS } from '../constants';

export const About: React.FC = () => {
  const location = useLocation();
  const isStandalonePage = location.pathname === '/about';

  return (
    <section className="py-20 bg-brand-gray-dark overflow-hidden">
      {isStandalonePage && (
        <SEOHead
          title="About Rydeit - Self-Drive Bike & Scooter Rentals in Kolkata"
          description="Learn about Rydeit Kolkata: founded in 2023, our 28-point mechanical servicing, commercial insurance, 90-minute breakdown guarantee, and central Kidderpore garage."
          canonicalPath="/about"
          image="/images/hero-xtreme-125r.jpg"
        />
      )}

      <div className="container mx-auto px-4 max-w-6xl">
        {isStandalonePage && (
          <nav aria-label="Breadcrumb" className="mb-8 text-xs uppercase tracking-widest text-neutral-400">
            <ol className="flex items-center gap-2">
              <li>
                <Link to="/" className="hover:text-brand-orange transition-colors">Home</Link>
              </li>
              <li>/</li>
              <li className="text-brand-orange font-bold">About Rydeit</li>
            </ol>
          </nav>
        )}

        {/* Header Title */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-brand-teal text-xs font-black uppercase tracking-[0.4em] block">
            Our Story &amp; Standards
          </span>
          <h1 className="text-4xl md:text-5xl font-heading uppercase text-white tracking-tight leading-tight">
            Kolkata’s Premier Destination for <br />
            <span className="text-brand-orange">Two-Wheeler Freedom</span>
          </h1>
          <p className="text-sm md:text-base text-brand-gray-light leading-relaxed font-sans opacity-90">
            Founded in 2023 by motorcycle enthusiasts and mobility specialists, Rydeit was born out of a simple frustration: renting a reliable two-wheeler in Kolkata was plagued by hidden fees, worn-out tyres, and unreliable bikes. We set out to build Kolkata's cleanest, most transparent self-drive rental service.
          </p>
        </div>

        {/* Founding & Operations Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch mb-20">
          <div className="lg:col-span-7 bg-brand-black/50 border border-white/10 p-8 md:p-10 rounded-[2.5rem] space-y-6 shadow-2xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-brand-yellow font-heading text-lg uppercase tracking-wider">
                <Users className="w-6 h-6 text-brand-yellow" />
                <span>Who Runs Rydeit &amp; Our Roots</span>
              </div>
              <p className="text-sm text-neutral-300 leading-relaxed font-sans">
                Headquartered at <strong className="text-white">{GARAGE_ADDRESS}</strong> in Kidderpore, Rydeit is operated by an in-house team of certified automobile mechanics, dispatch logistics handlers, and customer success coordinators.
              </p>
              <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                Since our launch in 2023, we have served over 3,500 riders across West Bengal — from weekend highway tourers heading to Digha and Mandarmani, to corporate executives navigating Salt Lake Sector V, and delivery partners powering Kolkata’s gig economy. Every machine is company-owned, rigorously inspected, and commercially licensed.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5 text-center">
              <div>
                <span className="block text-2xl font-heading text-brand-teal font-black">2023</span>
                <span className="text-[10px] text-neutral-400 uppercase tracking-widest">Operating Since</span>
              </div>
              <div>
                <span className="block text-2xl font-heading text-brand-yellow font-black">3,500+</span>
                <span className="text-[10px] text-neutral-400 uppercase tracking-widest">Happy Riders</span>
              </div>
              <div>
                <span className="block text-2xl font-heading text-brand-orange font-black">100%</span>
                <span className="text-[10px] text-neutral-400 uppercase tracking-widest">Transparent</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-brand-black/50 border border-white/10 p-8 md:p-10 rounded-[2.5rem] space-y-6 shadow-2xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-brand-teal font-heading text-lg uppercase tracking-wider">
                <MapPin className="w-6 h-6 text-brand-teal" />
                <span>Our Garage &amp; Dispatch Facility</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                Our central service garage is located at <strong>6C, Mohammadan Burial Ground Lane, Kolkata - 700023</strong>. Situated just 10 minutes from Vidyasagar Setu (Second Hooghly Bridge), our facility allows rapid dispatch to South Kolkata, Central Kolkata, Howrah, and Salt Lake.
              </p>
              <div className="space-y-2 text-xs text-neutral-300 pt-2 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-brand-orange shrink-0" />
                  <span>Operating Hours: <strong>06:00 AM - 10:00 PM</strong> (All 7 Days)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-brand-teal shrink-0" />
                  <span>Direct Hotline: <a href="tel:+917686022245" className="hover:text-white underline">+91 7686022245</a></span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-brand-yellow shrink-0" />
                  <span>Support: <a href="mailto:hi.rydeit@gmail.com" className="hover:text-white underline">hi.rydeit@gmail.com</a></span>
                </div>
              </div>
            </div>

            <a
              href="https://maps.app.goo.gl/qam5mMjonF66ZHkr6?g_st=ic"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center bg-white/10 hover:bg-white/20 text-white font-heading text-xs uppercase tracking-widest py-3 rounded-xl transition-all border border-white/10"
            >
              Open Garage in Google Maps →
            </a>
          </div>
        </div>

        {/* 3 Core Pillars: Servicing, Insurance, Breakdown Policy */}
        <div className="space-y-8 mb-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-heading text-white uppercase tracking-tight">
              Operational Standards &amp; Policies
            </h2>
            <p className="text-xs uppercase tracking-widest text-neutral-400 mt-1">
              Rigorous Engineering • Comprehensive Coverage • Immediate Roadside Support
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* 1. Servicing Process */}
            <div className="bg-brand-black/60 border border-white/10 rounded-3xl p-8 space-y-4 hover:border-brand-teal/40 transition-all shadow-xl">
              <div className="p-3 bg-brand-teal/10 rounded-2xl border border-brand-teal/20 w-fit">
                <Wrench className="w-7 h-7 text-brand-teal" />
              </div>
              <h3 className="text-xl font-heading text-white uppercase tracking-wide">
                28-Point Mechanical Inspection
              </h3>
              <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                Every bike and scooter undergoes our rigorous 28-point pre-delivery inspection before handover.
              </p>
              <ul className="space-y-2 text-xs text-neutral-300 pt-2 border-t border-white/5">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-teal shrink-0 mt-0.5" />
                  <span><strong>Fluids:</strong> Motul synthetic engine oil, fresh brake fluid, and coolant levels.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-teal shrink-0 mt-0.5" />
                  <span><strong>Tyres:</strong> Tread depth gauge verification (&gt;3mm) and digital pressure check.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-teal shrink-0 mt-0.5" />
                  <span><strong>Brakes &amp; Chain:</strong> Disc pad caliper tolerances, CBS/ABS diagnostics, and chain lubing.</span>
                </li>
              </ul>
            </div>

            {/* 2. Insurance Coverage */}
            <div className="bg-brand-black/60 border border-white/10 rounded-3xl p-8 space-y-4 hover:border-brand-orange/40 transition-all shadow-xl">
              <div className="p-3 bg-brand-orange/10 rounded-2xl border border-brand-orange/20 w-fit">
                <ShieldCheck className="w-7 h-7 text-brand-orange" />
              </div>
              <h3 className="text-xl font-heading text-white uppercase tracking-wide">
                Commercial Motor Insurance
              </h3>
              <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                We believe in total peace of mind. Every vehicle in our fleet is covered by valid commercial motor insurance.
              </p>
              <ul className="space-y-2 text-xs text-neutral-300 pt-2 border-t border-white/5">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-orange shrink-0 mt-0.5" />
                  <span><strong>Third-Party Liability:</strong> 100% compliant with Motor Vehicles Act mandates.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-orange shrink-0 mt-0.5" />
                  <span><strong>Zero Mechanical Liability:</strong> Riders are never charged for genuine mechanical breakdowns or component wear.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-orange shrink-0 mt-0.5" />
                  <span><strong>Valid Documents:</strong> Digital copy of RC, Insurance, and PUC provided on booking confirmation.</span>
                </li>
              </ul>
            </div>

            {/* 3. Breakdown Policy */}
            <div className="bg-brand-black/60 border border-white/10 rounded-3xl p-8 space-y-4 hover:border-brand-yellow/40 transition-all shadow-xl">
              <div className="p-3 bg-brand-yellow/10 rounded-2xl border border-brand-yellow/20 w-fit">
                <Clock className="w-7 h-7 text-brand-yellow" />
              </div>
              <h3 className="text-xl font-heading text-white uppercase tracking-wide">
                90-Minute Breakdown Guarantee
              </h3>
              <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                In the rare event of a mechanical failure within Kolkata metropolitan limits, you are never stranded.
              </p>
              <ul className="space-y-2 text-xs text-neutral-300 pt-2 border-t border-white/5">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-yellow shrink-0 mt-0.5" />
                  <span><strong>Mobile Mechanic Van:</strong> Dispatched immediately upon receiving your SOS call.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-yellow shrink-0 mt-0.5" />
                  <span><strong>Vehicle Replacement:</strong> If on-site repair exceeds 30 minutes, we provide a replacement bike within 90 minutes.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-yellow shrink-0 mt-0.5" />
                  <span><strong>Refund / Extension:</strong> Downtime hours are automatically credited or refunded to your account.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Call to Action Bar */}
        <div className="bg-gradient-to-r from-brand-orange via-brand-teal to-brand-yellow p-1 rounded-3xl text-center">
          <div className="bg-brand-black p-8 md:p-12 rounded-[1.4rem] space-y-6">
            <span className="text-xs font-black uppercase tracking-[0.3em] text-brand-yellow">
              Rental Bikes. Delivered in minutes.
            </span>
            <h2 className="text-3xl md:text-5xl font-heading text-white uppercase tracking-tight">
              Ready to Experience the Difference?
            </h2>
            <p className="text-xs md:text-sm text-neutral-300 max-w-xl mx-auto leading-relaxed">
              Explore our fleet of scooters, commuter motorcycles, cruisers, and sportbikes. Rates start at ₹599/day with a flat ₹1,000 refundable deposit.
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-2">
              <Link
                to="/bikes"
                className="bg-brand-orange hover:bg-brand-yellow hover:text-brand-black text-white py-4 px-10 rounded-full font-heading text-xs tracking-widest uppercase font-bold transition-all shadow-xl"
              >
                Explore Full Fleet (14 Models)
              </Link>
              <Link
                to="/book"
                className="bg-white/10 hover:bg-white/20 text-white py-4 px-8 rounded-full font-heading text-xs tracking-widest uppercase font-bold transition-all border border-white/10"
              >
                Book Online Now
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
