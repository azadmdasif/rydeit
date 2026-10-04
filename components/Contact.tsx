
import React from 'react';

export const Contact: React.FC = () => {
    return (
        <section className="py-24 bg-brand-black relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand-teal/5 rounded-full blur-3xl -mr-48 -mt-48"></div>
            
            <div className="container mx-auto px-4 max-w-6xl relative z-10">
                <div className="text-center mb-16">
                    <span className="text-brand-orange text-[10px] font-black uppercase tracking-[0.5em] block mb-2">Connect With Us</span>
                    <h2 className="text-5xl md:text-6xl font-heading uppercase text-white tracking-tighter">Get In Touch</h2>
                    <div className="w-20 h-1 bg-brand-teal mx-auto mt-6"></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
                    <div className="lg:col-span-5 space-y-8">
                        <div className="bg-brand-gray-dark/40 p-10 rounded-[3rem] border border-white/5 shadow-2xl space-y-10">
                            <div>
                                <h3 className="text-2xl font-heading text-brand-yellow mb-4 uppercase tracking-widest">Main Garage</h3>
                                <div className="space-y-6 font-sans text-brand-gray-light">
                                    <div className="flex gap-4">
                                        <div className="text-brand-teal mt-1">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        </div>
                                        <p className="text-base leading-relaxed">
                                            6C, Mohammadan Burial Ground Lane, <br />
                                            Kolkata - 700023, West Bengal
                                        </p>
                                    </div>
                                    
                                    <div className="flex gap-4">
                                        <div className="text-brand-teal mt-1">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                        </div>
                                        <a href="tel:+917686022245" className="text-xl font-bold hover:text-brand-teal transition-colors">+91 7686022245</a>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="text-brand-teal mt-1">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                        </div>
                                        <a href="mailto:hi.rydeit@gmail.com" className="text-base hover:text-brand-teal transition-colors underline underline-offset-4 decoration-brand-teal/30">hi.rydeit@gmail.com</a>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-white/5">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Business Hours</p>
                                <p className="text-sm font-bold text-white mt-2">Daily: 06:00 AM - 10:00 PM</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="lg:col-span-7 rounded-[3rem] overflow-hidden shadow-2xl border border-white/5 relative min-h-[450px]">
                        <iframe
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3685.234097644702!2d88.31931617561203!3d22.532901834423534!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a02798825490315%3A0xeac2564de0b1ba3b!2sRydeit%20Bike%20Rentals!5e0!3m2!1sen!2sin!4v1770009032451!5m2!1sen!2sin"
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            allowFullScreen={true}
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            title="Rydeit Garage Location"
                            className="absolute inset-0"
                        ></iframe>
                    </div>
                </div>
            </div>
        </section>
    );
}
