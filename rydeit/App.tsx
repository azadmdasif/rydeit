
import React, { useState, createContext, useContext, useCallback } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { About } from './components/About';
import { BikeCollection } from './components/BikeCollection';
import { Rates } from './components/Rates';
import { Contact } from './components/Contact';
import { BookingForm } from './components/BookingForm';
import { MyBookings } from './components/MyBookings';
import { Footer } from './components/Footer';
import { WhatsAppButton } from './components/WhatsAppButton';
import { Modal } from './components/Modal';
import { Testimonials } from './components/Testimonials';
import { Auth } from './components/Auth';
import { Toast, ToastType } from './components/Toast';
import { BIKES, ADDITIONAL_CHARGES, TESTIMONIALS } from './constants';
import type { LegalContent } from './types';

const { HashRouter, Routes, Route, Navigate, useNavigate } = ReactRouterDOM;

// Global Toast Context
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
  <>
    <Hero />
    <About />
    <Testimonials testimonials={TESTIMONIALS} />
    <Contact />
  </>
);

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const handleAuthSuccess = () => {
    const pendingBooking = localStorage.getItem('rydeit_pending_id');
    const currentStep = localStorage.getItem('rydeit_current_step');
    
    showToast('Welcome to Rydeit!', 'success');
    
    if (pendingBooking && currentStep === 'payment') {
      navigate('/my-bookings');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="py-24 bg-brand-black min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <Auth onSuccess={handleAuthSuccess} />
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const [modalContent, setModalContent] = useState<LegalContent | null>(null);

  const handleShowPolicy = (policy: LegalContent) => {
    setModalContent(policy);
  };

  const handleCloseModal = () => {
    setModalContent(null);
  };

  return (
    <div className="min-h-screen bg-brand-black overflow-x-hidden flex flex-col">
      <Header />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/bikes" element={<BikeCollection bikes={BIKES} />} />
          <Route path="/rates" element={<Rates 
            bikes={BIKES}
            additionalCharges={ADDITIONAL_CHARGES}
          />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/book" element={<BookingForm bikes={BIKES} additionalCharges={ADDITIONAL_CHARGES} onShowPolicy={handleShowPolicy} />} />
          <Route path="/my-bookings" element={<MyBookings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer onShowPolicy={handleShowPolicy} />
      <WhatsAppButton />
      {modalContent && (
        <Modal 
          isOpen={!!modalContent}
          onClose={handleCloseModal}
          title={modalContent.title}
        >
          <div dangerouslySetInnerHTML={{ __html: modalContent.content }} />
        </Modal>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      <HashRouter>
        <AppContent />
        {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
      </HashRouter>
    </ToastContext.Provider>
  );
};

export default App;
