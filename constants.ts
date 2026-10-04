
import type { Bike, Testimonial, AdditionalCharge } from './types';

export const WEB3FORMS_ACCESS_KEY = 'b9f95d5b-8f90-477b-a068-55293c654708';
export const UPI_ID = '9831846183@ybl';
export const SECURITY_DEPOSIT_AMOUNT = 1000;
export const HANDLING_CHARGE = 100;
export const EARLY_LATE_FEE = 99; 
export const OUTSTATION_DAILY_SURCHARGE = 99;
export const DELIVERY_PICKUP_FEE = 199;
export const GOOGLE_MAPS_REVIEW_LINK = 'https://g.page/r/CTu6seBNVsLqEBM/review';

export const BIKES: Bike[] = [
  // Scooters
  { id: 15, name: 'Suzuki Burgman', description: 'Powerful, premium 125cc scooter', imageUrl: '/images/suziki-burgman.jpg', color: 'yellow', category: 'Scooter', dailyRate: 700, status: 'Available', rc_number: 'WB-02-AH-1515', purchase_date: '2024-01-10', purchase_cost: 98000, odometer_reading: 12450 },
  { id: 16, name: 'Honda Activa 125', description: 'India’s most-sold 125cc scooter', imageUrl: '/images/honda-activa-125.jpg', color: 'black', category: 'Scooter', dailyRate: 700, status: 'Available', rc_number: 'WB-02-AK-1616', purchase_date: '2024-02-15', purchase_cost: 92000, odometer_reading: 14820 },
  { id: 17, name: 'TVS Jupiter 125', description: 'Comfortable, full-features family scooter', imageUrl: '/images/tvs-jupiter-125.jpg', color: 'orange', category: 'Scooter', dailyRate: 700, status: 'Available', rc_number: 'WB-02-AM-1717', purchase_date: '2024-03-20', purchase_cost: 89000, odometer_reading: 9600 },
  { id: 18, name: 'Honda Dio 125', description: 'Sporty 125cc youth scooter', imageUrl: '/images/honda-dio-125.jpg', color: 'teal', category: 'Scooter', dailyRate: 700, status: 'Available', rc_number: 'WB-02-AN-1818', purchase_date: '2024-04-05', purchase_cost: 88000, odometer_reading: 8200 },
  { id: 19, name: 'Ather 450X', description: 'Tech-packed premium electric scooter', imageUrl: '/images/ather-450x.jpg', color: 'teal', category: 'Scooter', dailyRate: 900, status: 'Available', rc_number: 'WB-02-EV-1919', purchase_date: '2024-05-12', purchase_cost: 145000, odometer_reading: 6400 },
  
  // Bikes
  { id: 1, name: 'Hero Xtreme 125r', description: 'Sport-commuter staple', imageUrl: '/images/hero-xtreme-125r.jpg', color: 'black', category: 'Bikes', dailyRate: 700, status: 'Available', rc_number: 'WB-02-AX-1001', purchase_date: '2024-02-18', purchase_cost: 95000, odometer_reading: 11200 },
  { id: 3, name: 'Honda Shine 125', description: 'Smooth 125cc refined engine', imageUrl: '/images/honda-shine-125.jpg', color: 'orange', category: 'Bikes', dailyRate: 700, status: 'Available', rc_number: 'WB-02-AY-1003', purchase_date: '2023-11-22', purchase_cost: 88000, odometer_reading: 18500 },
  { id: 5, name: 'Bajaj Pulsar 150', description: 'Sport-commuter staple', imageUrl: '/images/bajaj-pulsar-150.jpg', color: 'black', category: 'Bikes', dailyRate: 700, status: 'Available', rc_number: 'WB-02-AZ-1005', purchase_date: '2023-10-15', purchase_cost: 115000, odometer_reading: 21400 },
  { id: 6, name: 'TVS Apache RTR 160 4V', description: 'Sharp handling streetfighter', imageUrl: '/images/tvs-apache-rtr-160.jpg', color: 'orange', category: 'Bikes', dailyRate: 900, status: 'Available', rc_number: 'WB-02-BA-1006', purchase_date: '2024-01-25', purchase_cost: 132000, odometer_reading: 13900 },

  // Royal Enfield
  { id: 8, name: 'RE Hunter 350', description: 'Compact urban cruiser (349cc)', imageUrl: '/images/re-hunter-350.jpg', color: 'teal', category: 'Royal Enfield', dailyRate: 1500, status: 'Available', rc_number: 'WB-02-BB-1008', purchase_date: '2023-12-05', purchase_cost: 185000, odometer_reading: 16800 },
  { id: 12, name: 'RE Classic 350', description: 'Retro-styled cruiser', imageUrl: '/images/re-classic-350.jpg', color: 'black', category: 'Royal Enfield', dailyRate: 1600, status: 'Available', rc_number: 'WB-02-BC-1012', purchase_date: '2023-09-10', purchase_cost: 215000, odometer_reading: 24500 },

  // Sports
  { id: 9, name: 'Bajaj Pulsar NS200', description: 'Fiery naked sport-commuter', imageUrl: '/images/bajaj-pulsar-ns200.jpg', color: 'orange', category: 'Sports', dailyRate: 1200, status: 'Available', rc_number: 'WB-02-BD-1009', purchase_date: '2024-03-01', purchase_cost: 160000, odometer_reading: 10400 },
  { id: 10, name: 'Yamaha R15 V4', description: 'Supersport mini-bike, track DNA', imageUrl: '/images/yamaha-r15-v4.jpg', color: 'teal', category: 'Sports', dailyRate: 1800, status: 'Available', rc_number: 'WB-02-BE-1010', purchase_date: '2024-04-18', purchase_cost: 210000, odometer_reading: 7800 },
  { id: 11, name: 'KTM Duke 390', description: 'High-performance naked streetfighter', imageUrl: '/images/ktm-duke-390.jpg', color: 'orange', category: 'Sports', dailyRate: 2200, status: 'Available', rc_number: 'WB-02-BF-1011', purchase_date: '2024-05-30', purchase_cost: 320000, odometer_reading: 5900 },
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
