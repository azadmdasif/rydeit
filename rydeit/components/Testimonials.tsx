import React from 'react';
import type { Testimonial } from '../types';

interface TestimonialsProps {
  testimonials: Testimonial[];
}

const StarIcon = () => (
    <svg className="w-5 h-5 text-brand-yellow" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
    </svg>
);

const TestimonialCard: React.FC<{ testimonial: Testimonial }> = ({ testimonial }) => (
    <div className="bg-brand-gray-dark p-8 rounded-xl shadow-lg flex flex-col items-center text-center transform transition-all duration-300 hover:-translate-y-2 hover:shadow-brand-teal/20">
        <img className="w-24 h-24 rounded-full mb-4 object-cover border-4 border-brand-teal" src={testimonial.avatarUrl} alt={`${testimonial.name}'s avatar`} />
        <div className="flex mb-4">
            {[...Array(5)].map((_, i) => <StarIcon key={i} />)}
        </div>
        <blockquote className="text-brand-gray-light font-sans italic text-lg mb-4 flex-grow">
            <p>"{testimonial.quote}"</p>
        </blockquote>
        <footer className="font-bold text-white text-lg">{testimonial.name}</footer>
        <p className="text-sm text-brand-teal">{testimonial.location}</p>
    </div>
);


export const Testimonials: React.FC<TestimonialsProps> = ({ testimonials }) => {
    return (
        <section className="py-20 bg-brand-black">
            <div className="container mx-auto px-4">
                <h2 className="text-5xl font-heading text-center mb-4 uppercase text-brand-yellow">Rider Testimonials</h2>
                <p className="text-center max-w-2xl mx-auto mb-16 text-brand-gray-light font-sans">
                    Don't just take our word for it. Hear from adventurers who chose BikeBros.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {testimonials.map(testimonial => (
                        <TestimonialCard key={testimonial.id} testimonial={testimonial} />
                    ))}
                </div>
            </div>
        </section>
    );
};