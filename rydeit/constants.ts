
import type { Bike, Testimonial, AdditionalCharge } from './types';

export const WEB3FORMS_ACCESS_KEY = 'b9f95d5b-8f90-477b-a068-55293c654708';
export const UPI_ID = '9831846183@ybl';
export const SECURITY_DEPOSIT_AMOUNT = 1000;
export const HANDLING_CHARGE = 100;
export const EARLY_LATE_FEE = 99; 
export const OUTSTATION_DAILY_SURCHARGE = 99;
export const DELIVERY_PICKUP_FEE = 199;

export const BIKES: Bike[] = [
  // Scooters
  { id: 15, name: 'Suzuki Burgman', description: 'Powerful, premium 125cc scooter', imageUrl: '/images/suzuki-burgman.jpg', color: 'yellow', category: 'Scooter', dailyRate: 700, status: 'Available' },
  { id: 16, name: 'Honda Activa 125', description: 'India’s most-sold 125cc scooter', imageUrl: '/images/honda-activa-125.jpg', color: 'black', category: 'Scooter', dailyRate: 700, status: 'Available' },
  { id: 17, name: 'TVS Jupiter 125', description: 'Comfortable, full-features family scooter', imageUrl: '/images/tvs-jupiter-125.jpg', color: 'orange', category: 'Scooter', dailyRate: 700, status: 'Available' },
  { id: 18, name: 'Honda Dio 125', description: 'Sporty 125cc youth scooter', imageUrl: '/images/honda-dio-125.jpg', color: 'teal', category: 'Scooter', dailyRate: 700, status: 'Available' },
  { id: 19, name: 'Ather 450X', description: 'Tech-packed premium electric scooter', imageUrl: '/images/ather-450x.jpg', color: 'teal', category: 'Scooter', dailyRate: 900, status: 'Available' },
  
  // Bikes
  { id: 1, name: 'Hero Xtreme 125r', description: 'Sport-commuter staple', imageUrl: '/images/hero-xtreme-125r.jpg', color: 'black', category: 'Bikes', dailyRate: 700, status: 'Available' },
  { id: 3, name: 'Honda Shine 125', description: 'Smooth 125cc refined engine', imageUrl: '/images/honda-shine-125.jpg', color: 'orange', category: 'Bikes', dailyRate: 700, status: 'Available' },
  { id: 5, name: 'Bajaj Pulsar 150', description: 'Sport-commuter staple', imageUrl: '/images/bajaj-pulsar-150.jpg', color: 'black', category: 'Bikes', dailyRate: 700, status: 'Available' },
  { id: 6, name: 'TVS Apache RTR 160 4V', description: 'Sharp handling streetfighter', imageUrl: '/images/tvs-apache-rtr-160.jpg', color: 'orange', category: 'Bikes', dailyRate: 900, status: 'Available' },

  // Royal Enfield
  { id: 8, name: 'RE Hunter 350', description: 'Compact urban cruiser (349cc)', imageUrl: '/images/re-hunter-350.jpg', color: 'teal', category: 'Royal Enfield', dailyRate: 1500, status: 'Available' },
  { id: 12, name: 'RE Classic 350', description: 'Retro-styled cruiser', imageUrl: '/images/re-classic-350.jpg', color: 'black', category: 'Royal Enfield', dailyRate: 1600, status: 'Available' },

  // Sports
  { id: 9, name: 'Bajaj Pulsar NS200', description: 'Fiery naked sport-commuter', imageUrl: '/images/bajaj-pulsar-ns200.jpg', color: 'orange', category: 'Sports', dailyRate: 1200, status: 'Available' },
  { id: 10, name: 'Yamaha R15 V4', description: 'Supersport mini-bike, track DNA', imageUrl: '/images/yamaha-r15-v4.jpg', color: 'teal', category: 'Sports', dailyRate: 1800, status: 'Available' },
  { id: 11, name: 'KTM Duke 390', description: 'High-performance naked streetfighter', imageUrl: '/images/ktm-duke-390.jpg', color: 'orange', category: 'Sports', dailyRate: 2200, status: 'Available' },
];

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
