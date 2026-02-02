
import type { Bike, Testimonial, AdditionalCharge } from './types';

export const WEB3FORMS_ACCESS_KEY = 'b9f95d5b-8f90-477b-a068-55293c654708';
export const UPI_ID = '9831846183@ybl';
export const SECURITY_DEPOSIT_AMOUNT = 1000;
export const HANDLING_CHARGE = 100;
export const EARLY_LATE_FEE = 99; // Configurable early/late pickup/drop fee
export const OUTSTATION_DAILY_SURCHARGE = 99;
export const DELIVERY_PICKUP_FEE = 199;

export const BIKES: Bike[] = [
  // Scooters
  { id: 15, name: 'Suzuki Access 125', description: 'Powerful, premium 125cc scooter', imageUrl: 'https://images.unsplash.com/photo-1610444641680-e37bc90223e7?q=80&w=800&auto=format&fit=crop', color: 'yellow', category: 'Scooter', dailyRate: 700, status: 'Available' },
  { id: 16, name: 'Honda Activa 125', description: 'India’s most-sold 125cc scooter', imageUrl: 'https://images.unsplash.com/photo-1610444641680-e37bc90223e7?q=80&w=800&auto=format&fit=crop', color: 'black', category: 'Scooter', dailyRate: 700, status: 'Available' },
  { id: 17, name: 'TVS Jupiter 125', description: 'Comfortable, full-features family scooter', imageUrl: 'https://images.unsplash.com/photo-1610444641680-e37bc90223e7?q=80&w=800&auto=format&fit=crop', color: 'orange', category: 'Scooter', dailyRate: 700, status: 'Booked' },
  { id: 18, name: 'Honda Dio 125', description: 'Sporty 125cc youth scooter', imageUrl: 'https://images.unsplash.com/photo-1610444641680-e37bc90223e7?q=80&w=800&auto=format&fit=crop', color: 'teal', category: 'Scooter', dailyRate: 700, status: 'Available' },
  { id: 19, name: 'Ather 450X', description: 'Tech-packed premium electric scooter', imageUrl: 'https://images.unsplash.com/photo-1610444641680-e37bc90223e7?q=80&w=800&auto=format&fit=crop', color: 'teal', category: 'Scooter', dailyRate: 900, status: 'Available' },
  
  // Bikes
  { id: 1, name: 'Hero Splendor Plus', description: 'Reliable 97cc commuter (~70 kmpl)', imageUrl: 'https://images.unsplash.com/photo-1622185135505-2d795003994a?q=80&w=800&auto=format&fit=crop', color: 'black', category: 'Bikes', dailyRate: 700, status: 'Available' },
  { id: 3, name: 'Honda Shine 125', description: 'Smooth 125cc refined engine', imageUrl: 'https://images.unsplash.com/photo-1622185135505-2d795003994a?q=80&w=800&auto=format&fit=crop', color: 'orange', category: 'Bikes', dailyRate: 800, status: 'Available' },
  { id: 5, name: 'Bajaj Pulsar 150', description: 'Sport-commuter staple', imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=800&auto=format&fit=crop', color: 'black', category: 'Bikes', dailyRate: 900, status: 'Booked' },
  { id: 6, name: 'TVS Apache RTR 160 4V', description: 'Sharp handling streetfighter', imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=800&auto=format&fit=crop', color: 'orange', category: 'Bikes', dailyRate: 1000, status: 'Available' },

  // Royal Enfield
  { id: 8, name: 'RE Hunter 350', description: 'Compact urban cruiser (349cc)', imageUrl: 'https://images.unsplash.com/photo-1635073908681-698e6459f972?q=80&w=800&auto=format&fit=crop', color: 'teal', category: 'Royal Enfield', dailyRate: 1500, status: 'Available' },
  { id: 12, name: 'RE Classic 350', description: 'Retro-styled cruiser', imageUrl: 'https://images.unsplash.com/photo-1635073908681-698e6459f972?q=80&w=800&auto=format&fit=crop', color: 'black', category: 'Royal Enfield', dailyRate: 1600, status: 'Available' },

  // Sports
  { id: 9, name: 'Bajaj Pulsar NS200', description: 'Fiery naked sport-commuter', imageUrl: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?q=80&w=800&auto=format&fit=crop', color: 'orange', category: 'Sports', dailyRate: 1200, status: 'Available' },
  { id: 10, name: 'Yamaha R15 V4', description: 'Supersport mini-bike, track DNA', imageUrl: 'https://images.unsplash.com/photo-1614165933026-0750f93f938a?q=80&w=800&auto=format&fit=crop', color: 'teal', category: 'Sports', dailyRate: 1800, status: 'Booked' },
  { id: 11, name: 'KTM Duke 390', description: 'High-performance naked streetfighter', imageUrl: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?q=80&w=800&auto=format&fit=crop', color: 'orange', category: 'Sports', dailyRate: 2200, status: 'Available' },
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
