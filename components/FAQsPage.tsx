import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { SEOHead } from './SEOHead';
import { GARAGE_ADDRESS } from '../constants';

interface FAQItem {
  question: string;
  answer: string;
  category: 'booking' | 'documents' | 'pricing' | 'riding';
}

const FAQ_DATA: FAQItem[] = [
  {
    category: 'documents',
    question: 'What documents are required to rent a two-wheeler in Kolkata?',
    answer: 'You must provide a valid original Driving License (Learner License is not permitted) and a Government ID proof (Aadhaar Card, Voter ID, or Passport). Both documents are verified online during booking or at the garage.'
  },
  {
    category: 'pricing',
    question: 'How much is the security deposit and when is it refunded?',
    answer: 'We collect a flat refundable security deposit of ₹1,000 per two-wheeler. The deposit is refunded immediately upon vehicle return and inspection at the garage via UPI or bank transfer.'
  },
  {
    category: 'riding',
    question: 'Are helmets provided with the rental?',
    answer: 'Yes, one complimentary ISI-certified safety helmet is provided free of cost with every bike and scooter rental. An extra helmet for a pillion co-rider is available upon request.'
  },
  {
    category: 'riding',
    question: 'Can I take the bike outside Kolkata for outstation trips?',
    answer: 'Yes! Outstation travel to destinations like Digha, Mandarmani, Bakkhali, Mayapur, and Shantiniketan is permitted with a nominal daily outstation surcharge of ₹99/day. Please specify your destination during booking.'
  },
  {
    category: 'booking',
    question: 'Is doorstep home delivery and pickup available in Kolkata?',
    answer: 'Yes, we offer doorstep delivery and pickup across Kolkata (including Salt Lake, New Town, Howrah Station, Sealdah Station, Ballygunge, Park Street, and Kolkata Airport) for ₹199 each way.'
  },
  {
    category: 'pricing',
    question: 'What is the fuel policy for bike and scooter rentals?',
    answer: 'Vehicles are rented without fuel. We provide sufficient fuel to reach the nearest petrol pump (at least 1-2 liters in the tank). You should return the bike with the same fuel level as provided at pickup.'
  },
  {
    category: 'booking',
    question: 'Can I add a pillion co-rider to my booking?',
    answer: 'Yes, during booking you can select whether you have a pillion rider. Once your booking is confirmed, the admin verifies pillion details and emergency contacts prior to dispatch for passenger safety and insurance compliance.'
  },
  {
    category: 'riding',
    question: 'What happens in case of a mechanical breakdown or puncture?',
    answer: 'All our vehicles are rigorously inspected and serviced with fresh engine oil. In the rare event of a mechanical breakdown within Kolkata city limits, our roadside assistance team will provide on-site support or a replacement machine promptly.'
  },
  {
    category: 'documents',
    question: 'What is the minimum age to rent a bike or scooter?',
    answer: 'The primary rider must be at least 18 years of age and legally licensed to ride gearless two-wheelers or geared motorcycles in India.'
  },
  {
    category: 'booking',
    question: 'Where is the Rydeit garage located in Kolkata?',
    answer: `Our main garage is conveniently located at ${GARAGE_ADDRESS}. We are open daily from 06:00 AM to 10:00 PM for pickups, drop-offs, and test rides.`
  }
];

export const FAQsPage: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filteredFaqs = activeCategory === 'all'
    ? FAQ_DATA
    : FAQ_DATA.filter(f => f.category === activeCategory);

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': FAQ_DATA.map(item => ({
      '@type': 'Question',
      'name': item.question,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': item.answer
      }
    }))
  };

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="bg-brand-black min-h-screen text-brand-gray-light py-12 md:py-20">
      <SEOHead
        title="Frequently Asked Questions - Bike & Scooter Rentals in Kolkata | Rydeit"
        description="Got questions about renting a two-wheeler in Kolkata? Find answers on documents required, ₹1,000 security deposit, free helmets, doorstep delivery & outstation trips."
        canonicalPath="/faqs"
        schema={faqSchema}
      />

      <div className="container mx-auto px-4 max-w-4xl">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-8 text-xs uppercase tracking-widest text-neutral-400">
          <ol className="flex items-center gap-2">
            <li>
              <Link to="/" className="hover:text-brand-orange transition-colors">Home</Link>
            </li>
            <li>/</li>
            <li className="text-brand-orange font-bold">Frequently Asked Questions</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <span className="text-brand-orange text-xs font-black uppercase tracking-[0.4em] block">
            Clear Policies • Zero Hidden Surprises
          </span>
          <h1 className="text-4xl md:text-5xl font-heading uppercase text-white tracking-tight">
            Frequently Asked <span className="text-brand-orange">Questions</span>
          </h1>
          <p className="text-sm md:text-base text-neutral-400 max-w-xl mx-auto leading-relaxed">
            Everything you need to know about renting bikes and scooters with Rydeit in Kolkata.
          </p>

          {/* Filter Categories */}
          <div className="flex flex-wrap justify-center gap-2 pt-4">
            {[
              { id: 'all', label: 'All Questions' },
              { id: 'booking', label: 'Booking & Delivery' },
              { id: 'documents', label: 'Documents & KYC' },
              { id: 'pricing', label: 'Deposit & Rates' },
              { id: 'riding', label: 'Helmets & Riding' },
            ].map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-brand-orange text-white shadow-md shadow-brand-orange/20'
                    : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-4 mb-16">
          {filteredFaqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={faq.question}
                className="bg-brand-gray-dark rounded-2xl border border-white/5 overflow-hidden transition-all shadow-md"
              >
                <button
                  type="button"
                  onClick={() => toggleAccordion(index)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none hover:bg-white/[0.02]"
                  aria-expanded={isOpen}
                >
                  <span className="font-heading text-sm md:text-base font-bold text-white uppercase tracking-wide">
                    {faq.question}
                  </span>
                  <span
                    className={`w-7 h-7 rounded-full bg-white/5 flex items-center justify-center shrink-0 text-brand-orange font-bold text-sm transition-transform duration-300 ${
                      isOpen ? 'rotate-180 bg-brand-orange text-white' : ''
                    }`}
                  >
                    ↓
                  </span>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-2 text-xs md:text-sm text-neutral-300 font-sans leading-relaxed border-t border-white/5">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Help Banner */}
        <div className="bg-brand-gray-dark/80 rounded-3xl p-8 border border-white/5 text-center space-y-4">
          <h2 className="text-xl font-heading uppercase text-white font-bold">Still have a question?</h2>
          <p className="text-xs text-neutral-400 max-w-md mx-auto">
            Our team is available daily from 06:00 AM to 10:00 PM to help you with custom itinerary bookings and route advice.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <a
              href="https://wa.me/917980869336"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-heading text-xs font-bold uppercase tracking-wider transition-all"
            >
              Chat on WhatsApp (+91 7980869336)
            </a>
            <Link
              to="/book"
              className="px-6 py-3 rounded-full bg-brand-orange hover:bg-brand-yellow hover:text-neutral-950 text-white font-heading text-xs font-bold uppercase tracking-wider transition-all"
            >
              Book a Two-Wheeler Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
