
import type { Bike, Testimonial, AdditionalCharge } from './types';

export const WEB3FORMS_ACCESS_KEY = 'b9f95d5b-8f90-477b-a068-55293c654708';
export const UPI_ID = '9831846183@ybl';
export const SECURITY_DEPOSIT_AMOUNT = 1000;
export const HANDLING_CHARGE = 100;
export const EARLY_LATE_FEE = 99; 
export const OUTSTATION_DAILY_SURCHARGE = 99;
export const DELIVERY_PICKUP_FEE = 199;
export const GOOGLE_MAPS_REVIEW_LINK = 'https://g.page/r/CTu6seBNVsLqEBM/review';
export const GARAGE_MAPS_LINK = 'https://maps.app.goo.gl/qam5mMjonF66ZHkr6?g_st=ic';
export const GARAGE_ADDRESS = '6C, Mohammadan Burial Ground Lane, Kolkata - 700023';
export const BUSINESS_PHONE = '+91 7980869336';
export const BUSINESS_PHONE_RAW = '+917980869336';
export const BUSINESS_WHATSAPP_NUMBER = '917980869336';

// All fleet entries are dynamically managed in Supabase backend (public.bikes table)
export const BIKES: Bike[] = [];


export const ADDITIONAL_CHARGES: AdditionalCharge[] = [
    { name: 'Refundable Security Deposit', cost: SECURITY_DEPOSIT_AMOUNT, description: 'Payable at pickup', highlight: true },
    { name: 'Home Delivery (Kolkata)', cost: DELIVERY_PICKUP_FEE, description: 'Optional convenience', highlight: false },
    { name: 'Home Pickup (After Ride)', cost: DELIVERY_PICKUP_FEE, description: 'Optional convenience', highlight: false },
    { name: 'Outstation Charge', cost: OUTSTATION_DAILY_SURCHARGE, description: 'per day (outside city)', highlight: false },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 1,
    quote: "The best bike rental experience in Kolkata. The Hunter 350 was in pristine condition. Rydeit is a game changer.",
    name: 'Aarav Sharma',
    location: 'Salt Lake',
    avatarUrl: 'https://images.unsplash.com/photo-1615109398623-88346a601842?q=80&w=400&auto=format&fit=crop',
  },
  {
    id: 2,
    quote: "Rented an Activa for city chores. Fast delivery and zero hassle. Love the Rydeit team!",
    name: 'Priya Patel',
    location: 'Ballygunge',
    avatarUrl: 'https://images.unsplash.com/photo-1598137203923-421cb85042bd?q=80&w=400&auto=format&fit=crop',
  },
];
