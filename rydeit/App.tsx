
import React, { useState, createContext, useContext, useCallback, useEffect } from 'react';
import { 
  HashRouter as Router, 
  Routes, 
  Route, 
  Navigate, 
  useNavigate 
} from 'react-router-dom';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { About } from './components/About';
import { BikeCollection } from './components/BikeCollection';
import { Rates } from './components/Rates';
import { Contact } from './components/Contact';
import { BookingForm } from './components/BookingForm';
import { MyBookings } from './components/MyBookings';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { Footer } from './components/Footer';
import { WhatsAppButton } from './components/WhatsAppButton';
import { Modal } from './components/Modal';
import { Testimonials } from './components/Testimonials';
import { Auth } from './components/Auth';
import { Toast, ToastType } from './components/Toast';
import { BIKES, ADDITIONAL_CHARGES, TESTIMONIALS } from './constants';
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

const Home: React.FC = () => (
  <div className="animate-fade-in bg-brand-black w-full min-h-screen">
    <Hero />
    <About />
    <Testimonials testimonials={TESTIMONIALS} />
    <Contact />
  </div>
);

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const handleAuthSuccess = () => {
    showToast('Welcome back!', 'success');
    navigate('/my-bookings');
  };

  return (
    <div className="py-24 bg-brand-black min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <Auth onSuccess={handleAuthSuccess} />
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const [modalContent, setModalContent] = useState<LegalContent | null>(null);
  const { isAdmin, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen bg-brand-black flex flex-col items-center justify-center gap-6">
      <div className="w-12 h-12 border-4 border-brand-teal/20 border-t-brand-teal rounded-full animate-spin"></div>
      <p className="text-white/20 font-black text-[10px] uppercase tracking-[0.5em] animate-pulse">Initializing Engine</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-black text-brand-gray-light flex flex-col w-full">
      <Header />
      <main className="flex-grow w-full bg-brand-black">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/bikes" element={<BikeCollection bikes={BIKES} />} />
          <Route path="/rates" element={<Rates bikes={BIKES} additionalCharges={ADDITIONAL_CHARGES || []} />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/book" element={<BookingForm bikes={BIKES} additionalCharges={ADDITIONAL_CHARGES} onShowPolicy={setModalContent} />} />
          <Route path="/my-bookings" element={<MyBookings />} />
          <Route path="/admin/*" element={isAdmin ? <AdminDashboard /> : <Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer onShowPolicy={setModalContent} />
      <WhatsAppButton />
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
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000));
    try {
      const fetchPromise = supabase.from('profiles').select('is_admin').eq('id', userId).maybeSingle();
      const result: any = await Promise.race([fetchPromise, timeout]);
      if (result.error) throw result.error;
      const status = !!result.data?.is_admin;
      localStorage.setItem('rydeit_is_admin', status.toString());
      return status;
    } catch (err: any) {
      console.warn("Admin check failed or timed out:", err);
      return localStorage.getItem('rydeit_is_admin') === 'true';
    }
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        const adminStatus = await checkAdminStatus(session.user.id);
        setIsAdmin(adminStatus);
      } else {
        setIsAdmin(false);
        localStorage.removeItem('rydeit_is_admin');
      }
      setLoading(false);
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
