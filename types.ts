export type BikeCategory = 'Bikes' | 'Sports' | 'Scooter' | 'Royal Enfield';

export interface Bike {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  color: 'orange' | 'yellow' | 'black' | 'teal';
  category: BikeCategory;
  dailyRate: number;
  status: 'Available' | 'Booked' | 'Running' | 'Maintenance';
  rc_number?: string;
  purchase_date?: string;
  purchase_cost?: number;
  odometer_reading?: number;
}

export type BookingStatus = 
  | 'pending_payment' 
  | 'booking_confirmed' 
  | 'ongoing' 
  | 'completed' 
  | 'cancelled';

export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  username?: string | null;
  dl_url: string | null;
  aadhaar_url: string | null;
  dl_number: string | null;
  aadhaar_number: string | null;
  is_verified: boolean;
  is_admin?: boolean;
  is_blocked?: boolean;
}

export interface MaintenanceLog {
  id: string;
  bike_id: number;
  description: string;
  cost: number;
  date: string;
  odometer_reading?: number;
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
  deliveryAddress?: string;
  pickupAddress?: string;
  sameAddressForDrop?: boolean;
  earlyPickup: boolean;
  name: string;
  phone: string;
  email: string;
  whatsapp: string;
  pickupMethod: 'garage' | 'home';
  dropMethod: 'garage' | 'home';
}

export type LeadVehiclePreference = 'scooty' | 'bike' | 'bullet' | 'sports' | 'flexible';

export type LeadStatus = 
  | 'need_follow_up' 
  | 'contacted' 
  | 'booked' 
  | 'not_interested' 
  | 'lost_to_availability' 
  | 'lost_to_price' 
  | 'postponed';

export type LeadSource = 'whatsapp' | 'call' | 'walk_in' | 'instagram' | 'website';

export type RentalPurpose = 
  | 'Weekend Trip / Outing'
  | 'Daily Commute / Office'
  | 'Local City Errands'
  | 'Long Highway Tour'
  | 'Exam / Interview / Work'
  | 'Vehicle in Service / Replacement'
  | 'Wedding / Family Function'
  | 'Joyride / Trial'
  | 'Other';

export interface FollowUpComment {
  id: string;
  timestamp: string;
  comment: string;
  next_follow_up_date?: string;
  status_after?: LeadStatus;
}

export interface Lead {
  id: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  source: LeadSource;
  vehicle_preference: LeadVehiclePreference;
  specific_vehicle_id?: number | null;
  specific_vehicle_name?: string;
  pickup_date: string;
  return_date: string;
  rental_duration_days: number;
  purpose: RentalPurpose;
  budget_expectation?: string;
  status: LeadStatus;
  follow_up_date?: string;
  notes?: string;
  follow_up_comments?: FollowUpComment[];
  converted_booking_id?: string | null;
  converted_at?: string | null;
}

