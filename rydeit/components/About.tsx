
import React from 'react';

export const About: React.FC = () => {
  return (
    <section className="py-24 bg-brand-gray-dark overflow-hidden">
      <div className="container mx-auto px-4 flex flex-col lg:flex-row items-center gap-16">
        <div className="lg:w-1/2 space-y-8">
            <div className="space-y-4">
              <span className="text-brand-teal text-[10px] font-black uppercase tracking-[0.4em] block">The Rydeit Mission</span>
              <h2 className="text-4xl md:text-5xl font-heading uppercase text-white tracking-tighter leading-tight">
                Kolkata's Hub for <br />
                <span className="text-brand-yellow">Unlimited Freedom</span>
              </h2>
            </div>
            
            <div className="space-y-6 text-brand-gray-light font-sans leading-relaxed opacity-90">
              <p className="text-lg">
                Looking for a reliable ride in the City of Joy? <span className="text-white font-bold">Rydeit</span> is Kolkata's premier destination for bike and scooter rentals, catering to everyone from adventurous travellers to hard-working delivery professionals.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                <div className="bg-brand-black/40 p-6 rounded-2xl border border-white/5">
                  <h4 className="text-brand-teal font-heading text-sm mb-2 uppercase">Daily Commute</h4>
                  <p className="text-xs opacity-70">Perfect for short daily needs and city exploration. Agile scooties and bikes available instantly.</p>
                </div>
                <div className="bg-brand-black/40 p-6 rounded-2xl border border-white/5">
                  <h4 className="text-brand-orange font-heading text-sm mb-2 uppercase">Delivery Partners</h4>
                  <p className="text-xs opacity-70">Empowering Swiggy, Zomato, Rapido, and Zepto riders with fuel-efficient, well-maintained fleets.</p>
                </div>
              </div>

              <p>
                Whether you're a tourist exploring heritage sites or a gig-economy professional needing a fuel-efficient machine, we've got you covered. We specialize in both <span className="text-brand-yellow font-bold">short-term daily rentals</span> and competitive <span className="text-brand-teal font-bold">long-term rental plans</span> designed for maximum affordability.
              </p>
              
              <p className="border-l-4 border-brand-orange pl-6 italic text-white/60">
                "Our diverse fleet features everything from agile Honda Dios and Activas to heavy-duty Royal Enfields like the Hunter 350 and Classic 350 for the long road."
              </p>
            </div>
        </div>
        <div className="lg:w-1/2 relative">
            <div className="absolute -inset-4 bg-brand-teal/20 blur-3xl rounded-full"></div>
            <img 
              src="https://images.unsplash.com/photo-1599819097435-a63e4cb459c3?q=80&w=1974&auto=format&fit=crop" 
              alt="Rydeit Group Adventure" 
              className="rounded-[3rem] shadow-2xl w-full border border-white/10 relative z-10 grayscale hover:grayscale-0 transition-all duration-700" 
            />
            <div className="absolute bottom-8 -left-8 bg-brand-orange text-white p-8 rounded-3xl shadow-2xl z-20 font-heading text-xl uppercase tracking-widest hidden md:block">
              Ride The <br /> Future
            </div>
        </div>
      </div>
    </section>
  );
};
