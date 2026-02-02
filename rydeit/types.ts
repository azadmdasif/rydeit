
export type BikeCategory = 'Bikes' | 'Sports' | 'Scooter' | 'Royal Enfield';

export interface Bike {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  color: 'orange' | 'yellow' | 'black' | 'teal';
  category: BikeCategory;
  dailyRate: number;
  status: 'Available' | 'Booked';
}

export type BookingStatus = 
  | 'pending_payment' 
  | 'verifying_payment' 
  | 'booking_confirmed' 
  | 'ongoing' 
  | 'completed';

export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  dl_url: string | null;
  aadhaar_url: string | null;
  dl_number: string | null;
  aadhaar_number: string | null;
  is_verified: boolean;
}

export interface AdditionalCharge {
  name: string;
  cost: number;
  description: string;
  highlight?: boolean;
}

export interface LegalContent {
  title: string;
  content: string;
}

export interface Testimonial {
  id: number;
  quote: string;
  name: string;
  location: string;
  avatarUrl: string;
}

export interface BookingDetails {
  bikeId: string;
  fromDate: string;
  fromTime: string;
  toDate: string;
  toTime: string;
  delivery: boolean;
  homePickup: boolean;
  outstation: boolean;
  address: string;
  earlyPickup: boolean;
  name: string;
  phone: string;
  email: string;
  whatsapp: string;
  pickupMethod: 'garage' | 'home';
  dropMethod: 'garage' | 'home';
}
