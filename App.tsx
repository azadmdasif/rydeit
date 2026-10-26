import React, { useState, createContext, useContext, useCallback, useEffect } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate, 
  useNavigate,
  useLocation
} from 'react-router-dom';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { About } from './components/About';
import { BikeCollection } from './components/BikeCollection';
import { ScootersPage } from './components/ScootersPage';
import { MotorcyclesPage } from './components/MotorcyclesPage';
import { FAQsPage } from './components/FAQsPage';
import { Rates } from './components/Rates';
import { Contact } from './components/Contact';
import { BookingForm } from './components/BookingForm';
import { AvailabilityCalendar } from './components/AvailabilityCalendar';
import { MyBookings } from './components/MyBookings';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { Footer } from './components/Footer';
import { WhatsAppButton } from './components/WhatsAppButton';
import { Modal } from './components/Modal';
import { Testimonials } from './components/Testimonials';
import { Auth } from './components/Auth';
import { Toast, ToastType } from './components/Toast';
import { SEOHead } from './components/SEOHead';
import { BikeDetailPage } from './components/BikeDetailPage';
import { TransitPickupPage } from './components/TransitPickupPage';
import { OutstationGuidesPage } from './components/OutstationGuidesPage';
import { GigDeliveryPage } from './components/GigDeliveryPage';
import { ADDITIONAL_CHARGES, TESTIMONIALS } from './constants';
import { useFleetBikes } from './fleetStorage';
import { supabase } from './supabase';
import type { LegalContent } from './types';

// Global Context for Auth/Admin
interface AuthContextType {
  isAdmin: boolean;
  user: any;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ isAdmin: false, user: null, loading: true });
export const useAuth = () => useContext(AuthContext);

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

// Legacy Hash Redirector: smoothly redirects legacy /#/book or /#/bikes links to clean URLs
const LegacyHashRedirect: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#/')) {
      const cleanPath = hash.slice(1);
      window.history.replaceState(null, '', cleanPath);
      navigate(cleanPath, { replace: true });
    }
  }, [navigate, location]);

  return null;
};

const homeSchema = {
  '@context': 'https://schema.org',
  '@type': 'AutoRental',
  'name': 'Rydeit - Bike & Scooter Rentals in Kolkata',
  'image': 'https://rydeit.in/images/re-hunter-350.jpg',
  '@id': 'https://rydeit.in/#autorental',
  'url': 'https://rydeit.in',
  'telephone': '+917980869336',
  'email': 'hi.rydeit@gmail.com',
  'priceRange': '₹₹',
  'address': {
    '@type': 'PostalAddress',
    'streetAddress': '6C, Mohammadan Burial Ground Lane',
    'addressLocality': 'Kolkata',
    'addressRegion': 'West Bengal',
    'postalCode': '700023',
    'addressCountry': 'IN'
  },
  'geo': {
    '@type': 'GeoCoordinates',
    'latitude': 22.5329,
    'longitude': 88.3193
  },
  'openingHoursSpecification': [{
    '@type': 'OpeningHoursSpecification',
    'dayOfWeek': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    'opens': '06:00',
    'closes': '22:00'
  }],
  'areaServed': ['Kolkata', 'Salt Lake', 'New Town', 'Howrah', 'Sealdah', 'Park Street', 'Ballygunge'],
  'paymentAccepted': ['Cash', 'UPI', 'Credit Card', 'Debit Card'],
  'currenciesAccepted': 'INR'
};

const Home: React.FC = () => (
  <div className="animate-fade-in bg-brand-black w-full min-h-screen">
    <SEOHead
      title="Rydeit | Bike & Scooter Rentals in Kolkata - Starting ₹599/day"
      description="Rental Bikes. Delivered in minutes. Kolkata's most reliable bike and scooter rental service. Activa, Burgman, Royal Enfield Classic 350 & Duke 390. Doorstep delivery across Kolkata. Free ISI helmet."
      canonicalPath="/"
      image="/images/re-hunter-350.jpg"
      schema={homeSchema}
    />
    <Hero />
    <About />
    <Testimonials testimonials={TESTIMONIALS} />
    <Contact />
  </div>
);

const BookingPageWrapper: React.FC<{
  bikes: any[];
  additionalCharges: any[];
  onShowPolicy: (policy: LegalContent) => void;
}> = ({ bikes, additionalCharges, onShowPolicy }) => {
  return (
    <>
      <SEOHead
        title="Book a Bike or Scooter Online - Instant Confirmation | Rydeit"
        description="Reserve your two-wheeler online in Kolkata with Rydeit. Real-time availability, instant price calculation, paperless KYC, and doorstep delivery options."
        canonicalPath="/book"
        robots="noindex, follow"
      />
      <BookingForm bikes={bikes} additionalCharges={additionalCharges} onShowPolicy={onShowPolicy} />
    </>
  );
};

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const handleAuthSuccess = () => {
    showToast('Welcome back!', 'success');
    navigate('/my-bookings');
  };

  return (
    <div className="py-24 bg-brand-black min-h-[80vh] flex items-center justify-center px-4">
      <SEOHead
        title="Sign In - Customer Account | Rydeit"
        description="Sign in to your Rydeit customer account to manage your active bookings, rental invoices, and KYC documents."
        canonicalPath="/login"
        robots="noindex, follow"
      />
      <div className="max-w-md w-full">
        <Auth onSuccess={handleAuthSuccess} />
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const [modalContent, setModalContent] = useState<LegalContent | null>(null);
  const { isAdmin, loading } = useAuth();
  const { bikes: fleetBikes } = useFleetBikes();
  const location = useLocation();

  const isAdminRoute = location.pathname.startsWith('/admin');

  useEffect(() => {
    if (isAdminRoute) {
      document.body.classList.add('admin-panel-white');
    } else {
      document.body.classList.remove('admin-panel-white');
    }
    return () => {
      document.body.classList.remove('admin-panel-white');
    };
  }, [isAdminRoute]);

  if (loading) return (
    <div className="min-h-screen bg-brand-black flex flex-col items-center justify-center gap-6">
      <div className="w-12 h-12 border-4 border-brand-teal/20 border-t-brand-teal rounded-full animate-spin"></div>
      <p className="text-white/20 font-black text-[10px] uppercase tracking-[0.5em] animate-pulse">Initializing Engine</p>
    </div>
  );

  return (
    <div className={`min-h-screen flex flex-col w-full ${isAdminRoute ? 'bg-slate-50 text-slate-800' : 'bg-brand-black text-brand-gray-light'}`}>
      <LegacyHashRedirect />
      {!isAdminRoute && <Header />}
      <main className={`flex-grow w-full ${isAdminRoute ? 'bg-slate-50 text-slate-800' : 'bg-brand-black'}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/bikes" element={<BikeCollection bikes={fleetBikes} />} />
          <Route path="/bikes/:slug" element={<BikeDetailPage />} />
          <Route path="/scooters" element={<ScootersPage bikes={fleetBikes} />} />
          <Route path="/motorcycles" element={<MotorcyclesPage bikes={fleetBikes} />} />
          <Route path="/pickup-kolkata" element={<TransitPickupPage />} />
          <Route path="/outstation-bike-rentals" element={<OutstationGuidesPage />} />
          <Route path="/delivery-bike-rentals" element={<GigDeliveryPage />} />
          <Route path="/rates" element={<Rates bikes={fleetBikes} additionalCharges={ADDITIONAL_CHARGES || []} />} />
          <Route path="/faqs" element={<FAQsPage />} />
          <Route path="/availability" element={isAdmin ? <AvailabilityCalendar bikes={fleetBikes} isAdminMode={true} /> : <Navigate to="/" replace />} />
          <Route path="/calendar" element={<Navigate to={isAdmin ? "/availability" : "/"} replace />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/book" element={<BookingPageWrapper bikes={fleetBikes} additionalCharges={ADDITIONAL_CHARGES} onShowPolicy={setModalContent} />} />
          <Route path="/my-bookings" element={<MyBookings />} />
          <Route path="/admin/*" element={isAdmin ? <AdminDashboard /> : <Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!isAdminRoute && <Footer onShowPolicy={setModalContent} />}
      {!isAdminRoute && <WhatsAppButton />}
      {modalContent && (
        <Modal isOpen={!!modalContent} onClose={() => setModalContent(null)} title={modalContent.title}>
          <div dangerouslySetInnerHTML={{ __html: modalContent.content }} />
        </Modal>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('rydeit_is_admin') === 'true');
  const [loading, setLoading] = useState(true);

  const checkAdminStatus = async (userId: string) => {
    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500));
      const fetchPromise = supabase.from('profiles').select('is_admin').eq('id', userId).maybeSingle();
      const result: any = await Promise.race([fetchPromise, timeout]);
      
      const status = !!result?.data?.is_admin;
      localStorage.setItem('rydeit_is_admin', status.toString());
      return status;
    } catch (err) {
      return localStorage.getItem('rydeit_is_admin') === 'true';
    }
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        const adminStatus = await checkAdminStatus(session.user.id);
        setIsAdmin(adminStatus);
      } else {
        setIsAdmin(false);
        localStorage.removeItem('rydeit_is_admin');
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const adminStatus = await checkAdminStatus(session.user.id);
        setIsAdmin(adminStatus);
      } else {
        setIsAdmin(false);
        localStorage.removeItem('rydeit_is_admin');
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ message, type });
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      <AuthContext.Provider value={{ isAdmin, user, loading }}>
        <Router>
          <AppContent />
          {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </Router>
      </AuthContext.Provider>
    </ToastContext.Provider>
  );
};

export default App;
