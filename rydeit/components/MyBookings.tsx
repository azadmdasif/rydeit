
import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '../App';
import { supabase } from '../supabase';
import { 
  BIKES, 
  SECURITY_DEPOSIT_AMOUNT, 
  UPI_ID 
} from '../constants';
import { Auth } from './Auth';
import { Modal } from './Modal';
import type { UserProfile, BookingStatus } from '../types';

const { Link } = ReactRouterDOM;

type DashboardTab = 'rides' | 'identity' | 'profile';

export const MyBookings: React.FC = () => {
  const { showToast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DashboardTab>('rides');
  const [isUpdating, setIsUpdating] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<'dl' | 'aadhaar' | 'payment' | null>(null);
  const [showCashConfirmation, setShowCashConfirmation] = useState(false);
  const [signedAgreementIds, setSignedAgreementIds] = useState<Set<string>>(new Set());
  
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editDlNumber, setEditDlNumber] = useState('');
  const [editAadhaarNumber, setEditAadhaarNumber] = useState('');

  const REVIEW_LINK = "https://g.page/r/CTu6seBNVsLqEBM/review";
  const LOGO_PATH = '/images/logo.png';

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchAll(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchAll(session.user.id);
      else setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchAll = async (userId: string) => {
    setLoading(true);
    try {
      const { data: pData } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      const { data: bData } = await supabase.from('bookings').select('*').eq('user_id', userId).order('created_at', { ascending: false });

      if (pData) {
        setProfile(pData);
        setEditName(pData.full_name || '');
        setEditPhone(pData.phone || '');
        setEditWhatsapp(pData.whatsapp || '');
        setEditDlNumber(pData.dl_number || '');
        setEditAadhaarNumber(pData.aadhaar_number || '');
      }
      if (bData) setBookings(bData);
    } catch (err) {
      console.error("Dashboard Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getLogoBase64 = (): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve('');
      img.src = LOGO_PATH;
    });
  };

  const generateRentalAgreement = async (booking: any, autoDownload = true) => {
    if (!profile || !profile.dl_number || !profile.aadhaar_number) {
        showToast("Complete your Identity details before signing.", "warning");
        setActiveTab("identity");
        return;
    }

    const bike = BIKES.find(b => b.id === booking.bike_id);
    const doc = new jsPDF();
    const margin = 25;
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 45;

    const logoBase64 = await getLogoBase64();
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', pageWidth / 2 - 15, 10, 30, 30);
    }

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('RENTAL AGREEMENT & CUSTOMER DECLARATION', pageWidth / 2, y, { align: 'center' });
    
    y += 15;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const today = new Date();
    const introText = `This Agreement is made on this ${today.getDate()} day of ${today.toLocaleString('default', { month: 'long' })} ${today.getFullYear()} between:`;
    doc.text(introText, margin, y);
    
    y += 8;
    const lessorText = `Rydeit a proprietor business under the ownership of Abdul Razzak, having its registered address at 6C, Mohammadan Burial Ground Lane, Kolkata - 700023, hereinafter referred to as the "Lessor",`;
    const splitLessor = doc.splitTextToSize(lessorText, pageWidth - (margin * 2));
    doc.text(splitLessor, margin, y);
    
    y += (splitLessor.length * 6) + 5;
    doc.setFont('helvetica', 'bold');
    doc.text('AND', pageWidth / 2, y, { align: 'center' });
    
    y += 10;
    doc.setFont('helvetica', 'normal');
    const lesseeText = `${profile.full_name}, customer willing to take two wheeler on rent after examining the vehicle's condition, with driving license number [${profile.dl_number}], Aadhaar No.: [${profile.aadhaar_number}], Contact No.: [${profile.whatsapp}], hereinafter referred to as the "Lessee".`;
    const splitLessee = doc.splitTextToSize(lesseeText, pageWidth - (margin * 2));
    doc.text(splitLessee, margin, y);

    y += (splitLessee.length * 6) + 15;
    doc.setFont('helvetica', 'bold');
    doc.text('1. Vehicle and Booking Details', margin, y);
    
    y += 10;
    doc.setFont('helvetica', 'normal');
    doc.text(`• Vehicle Name: ${bike?.name || 'N/A'}`, margin + 5, y);
    y += 8;
    doc.text(`• Booking Schedule: ${booking.pickup_date} ${booking.pickup_time} to ${booking.return_date} ${booking.return_time}`, margin + 5, y);
    y += 8;
    doc.text(`• Total rent: INR ${booking.total_rent}`, margin + 5, y);
    y += 8;
    doc.text(`• Security Deposit: INR ${booking.security_deposit || SECURITY_DEPOSIT_AMOUNT}`, margin + 5, y);

    y += 15;
    doc.setFont('helvetica', 'bold');
    doc.text('2. Declaration and Terms of Use', margin, y);
    
    y += 10;
    doc.setFont('helvetica', 'normal');
    const term1 = `1. Responsibility: The Lessee assumes full responsibility for the bike/Scooty from the time of handover until its return. Any damage, loss, theft, or violation of law during this period shall be borne entirely by the Lessee.`;
    const splitTerm1 = doc.splitTextToSize(term1, pageWidth - (margin * 2));
    doc.text(splitTerm1, margin, y);

    // Page 2
    doc.addPage();
    y = 25;
    
    const terms = [
        `2. Condition of the Vehicle: The Lessee confirms having received the vehicle in good and working condition and agrees to return it in the same condition.`,
        `3. Usage Restrictions: The vehicle shall not be used for racing, stunts, illegal transport, or unlawful purposes. The Lessee shall not sublet, lend, or transfer possession to any third party. The Lessee shall always wear a helmet and obey all traffic rules.`,
        `4. Extension of Rental Period: The Lessee may extend the booking only by informing the Lessor at least 12 hours prior to the expiry of the rental period and by paying the full rental amount for the extended duration in advance. Failure to comply shall result in late return penalties and possible forfeiture of the security deposit.`,
        `5. Return of Vehicle: The bike must be returned on or before the agreed date and time. Late return shall attract a charge of 120 per hour. Non-return within 24 hours after expiry without intimation shall be treated as unauthorized possession, and the Lessor reserves the right to initiate police and legal action.`,
        `6. Security Deposit & Forfeiture Conditions: The refundable security deposit may be partially or fully forfeited under any of the following circumstances:\n\n• Damage, scratches, or missing parts/accessories.\n- Loss/damage of helmet, keys, or vehicle documents.\n- Traffic fines or police challans incurred during the rental period.\n- Late return or overstay without permission.\n- Use of the vehicle by any person other than the registered Lessee.\n- Drunken driving, reckless use, or evidence of misuse.\n- Failure to return vehicle in clean condition or at agreed location.`,
        `7. Insurance and Liability: The Lessee understands that damages or scratches may not be covered by insurance. Any deductible or uninsured loss shall be payable by the Lessee in full.`,
        `8. Accidents or Theft: In case of accident, theft, or loss, the Lessee must immediately inform Rydeit and the nearest police station, and cooperate fully in filing an FIR and appear when called upon by authorities in relation to the theft/accident. The Lessee will bear all liabilities, including downtime losses and medical burden.`,
        `9. Indemnity: The Lessee agrees to indemnify and hold harmless Rydeit and any of its employee, representatives, associates from any claims, costs, damages, accident or legal liabilities arising from the use of the rented vehicle.`,
        `10. Termination and Seizure Rights: The Lessor reserves the right to terminate the rental and seize the vehicle at any time if terms are violated, without refund of rent or deposit.`
    ];

    terms.forEach(term => {
        const splitTerm = doc.splitTextToSize(term, pageWidth - (margin * 2));
        if (y + (splitTerm.length * 6) > 270) {
            doc.addPage();
            y = 25;
        }
        doc.text(splitTerm, margin, y);
        y += (splitTerm.length * 6) + 8;
    });

    // Page 3
    if (y > 200) { doc.addPage(); y = 25; }
    
    const term11 = `11. Jurisdiction: All disputes shall be subject to the exclusive jurisdiction of the courts at Kolkata, and governed by the laws of India.`;
    doc.text(doc.splitTextToSize(term11, pageWidth - (margin * 2)), margin, y);
    
    y += 20;
    doc.setFont('helvetica', 'bold');
    doc.text('3. Declaration', margin, y);
    
    y += 10;
    doc.setFont('helvetica', 'normal');
    const declaration = `1. I, the undersigned, have read, understood, and agreed to all the above terms and conditions. I declare that the information provided by me is true and correct. I accept full responsibility for the vehicle during the rental period. I am fully aware about the risk of accident and any other form of damages arising out of two wheeler, I do hereby declare to take sole of responsibilities for such accident and damages.`;
    const splitDec = doc.splitTextToSize(declaration, pageWidth - (margin * 2));
    doc.text(splitDec, margin, y);
    
    y += (splitDec.length * 6) + 30;
    
    // Digital Signature Area
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, y - 5, pageWidth - (margin * 2), 60, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.text('Digital Signature of Lessee (Customer)', margin + 10, y + 5);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(14);
    doc.setTextColor(0, 194, 199);
    doc.text(`${profile.full_name}`, margin + 10, y + 15);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'normal');
    doc.text(`Digitally Signed on ${today.toLocaleString()}`, margin + 10, y + 22);
    doc.text(`Aadhaar verified: [${profile.aadhaar_number}]`, margin + 10, y + 28);
    
    y += 40;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Signature of Lessor (Rydeit Representative)', margin + 10, y + 5);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(14);
    doc.setTextColor(255, 95, 31);
    doc.text('ABDUL RAZZAK', margin + 10, y + 15);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'normal');
    doc.text('Rydeit Authorized Signatory', margin + 10, y + 22);

    y += 35;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150);
    const signatureNote = "This document is an electronic record in terms of the Information Technology Act, 2000 and rules there under as applicable and the amended provisions pertaining to electronic records in various statutes as amended by the Information Technology Act, 2000. This electronic record is generated by a computer system and does not require any physical or facial signatures.";
    const splitNote = doc.splitTextToSize(signatureNote, pageWidth - (margin * 2));
    doc.text(splitNote, margin, y);

    if (autoDownload) {
      doc.save(`Rydeit_Agreement_${booking.readable_id}.pdf`);
    }
    
    setSignedAgreementIds(prev => new Set(prev).add(booking.id));
    if (autoDownload) showToast("Agreement Signed Successfully.", "success");
  };

  const handlePaidCash = async (bookingId: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase.from('bookings').update({
        status: 'verifying_payment',
        payment_method: 'cash'
      }).eq('readable_id', bookingId);
      
      if (error) {
          if (error.message.includes('payment_method')) {
              showToast("Database error: payment_method column missing.", "error");
          } else {
              throw error;
          }
      } else {
          setShowCashConfirmation(true);
          if (user) fetchAll(user.id);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const downloadReceipt = async (booking: any) => {
    const bike = BIKES.find(b => b.id === booking.bike_id);
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const logoBase64 = await getLogoBase64();
    
    // Header Bar
    doc.setFillColor(18, 18, 18);
    doc.rect(0, 0, 210, 45, 'F');
    
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', 15, 7, 30, 30);
    }

    doc.setTextColor(255, 95, 31);
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.text('RYDEIT', 55, 23);
    doc.setFontSize(9);
    doc.setTextColor(0, 194, 199);
    doc.setFont('helvetica', 'normal');
    doc.text('PREMIUM BIKE RENTALS KOLKATA', 55, 30);

    // Metadata
    doc.setTextColor(100);
    doc.setFontSize(10);
    doc.text(`Receipt ID: ${booking.readable_id}`, 145, 20);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 145, 26);

    doc.setTextColor(0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT RECEIPT', 20, 60);
    
    doc.setDrawColor(230);
    doc.line(20, 65, 190, 65);

    autoTable(doc, {
      startY: 75,
      head: [['Particulars', 'Description']],
      body: [
        ['Customer Name', booking.customer_name || 'N/A'],
        ['Email', booking.customer_email || 'N/A'],
        ['Phone', booking.customer_phone || 'N/A'],
        ['Machine Model', bike?.name || 'N/A'],
        ['Pickup', `${booking.pickup_date} @ ${booking.pickup_time}`],
        ['Return', `${booking.return_date} @ ${booking.return_time}`],
        ['Advance Paid', `INR ${booking.advance_amount || 0}`],
        ['Security Deposit', `INR ${booking.security_deposit || SECURITY_DEPOSIT_AMOUNT}`],
        ['Total Rent (Final)', `INR ${booking.total_rent || 0}`],
        ['Ride Status', booking.status.toUpperCase().replace('_', ' ')],
      ],
      theme: 'grid',
      headStyles: { fillColor: [255, 95, 31], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 5 },
      columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' } }
    });

    // Signature/Footer
    const finalY = (doc as any).lastAutoTable.finalY + 30;
    doc.setFontSize(10);
    doc.text('Digitally Authorized by Rydeit Management', pageWidth / 2, finalY, { align: 'center' });
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Note: This receipt is automatically generated based on the successful transaction logged in the Rydeit portal.', pageWidth / 2, finalY + 10, { align: 'center' });

    doc.save(`Rydeit_Receipt_${booking.readable_id}.pdf`);
  };

  const handleUpdateProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;
    setIsUpdating(true);
    
    const updates: any = { 
      full_name: editName, 
      phone: editPhone,
      whatsapp: editWhatsapp,
      dl_number: editDlNumber,
      aadhaar_number: editAadhaarNumber
    };

    try {
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (error) throw error;
      showToast('Profile updated.', 'success');
      fetchAll(user.id);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFileUpload = async (type: 'dl' | 'aadhaar' | 'payment', file: File, bookingId?: string) => {
    if (!user) return;
    setUploadingDoc(type);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}_${Date.now()}.${fileExt}`;
      const bucket = type === 'payment' ? 'booking-docs' : 'identity-docs';
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);

      if (type === 'payment' && bookingId) {
        await supabase.from('bookings').update({ payment_screenshot_url: publicUrl, status: 'verifying_payment' }).eq('readable_id', bookingId);
      } else {
        const updateData = type === 'dl' ? { dl_url: publicUrl } : { aadhaar_url: publicUrl };
        await supabase.from('profiles').update(updateData).eq('id', user.id);
      }
      
      showToast('Uploaded Successfully.', 'success');
      fetchAll(user.id);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleStartRide = async (booking: any) => {
    if (!profile?.dl_url || !profile?.aadhaar_url || !profile?.dl_number || !profile?.aadhaar_number) {
      showToast("Identity verification is mandatory.", 'warning');
      setActiveTab('identity');
      return;
    }

    if (!signedAgreementIds.has(booking.id)) {
        showToast("Agreement must be signed.", "warning");
        return;
    }

    setIsUpdating(true);
    try {
      await supabase.from('bookings').update({ status: 'ongoing', start_timestamp: new Date().toISOString() }).eq('id', booking.id);
      showToast('Ride active!', 'success');
      fetchAll(user.id);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFinishRide = async (booking: any) => {
    setIsUpdating(true);
    try {
      await supabase.from('bookings').update({ status: 'completed', end_timestamp: new Date().toISOString() }).eq('id', booking.id);
      window.open(REVIEW_LINK, '_blank');
      showToast('Ride finished.', 'success');
      fetchAll(user.id);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!user) return (
    <section className="py-24 bg-brand-black min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full"><Auth onSuccess={() => {}} /></div>
    </section>
  );

  return (
    <section className="py-16 bg-brand-black min-h-screen font-sans">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-8 bg-brand-gray-dark/40 p-10 rounded-[3rem] border border-white/5 shadow-2xl">
          <div className="animate-fade-in">
            <span className="text-brand-orange text-[10px] font-black uppercase tracking-[0.4em]">Rider Hub</span>
            <h2 className="text-4xl md:text-5xl font-heading uppercase text-white tracking-tighter mt-2">{profile?.full_name || 'My Dashboard'}</h2>
            <div className="flex items-center gap-3 mt-4">
              <div className={`w-2 h-2 rounded-full ${profile?.dl_url && profile?.aadhaar_url && profile?.dl_number && profile?.aadhaar_number ? 'bg-brand-teal' : 'bg-brand-orange animate-pulse'}`}></div>
              <p className="text-brand-gray-light text-[9px] font-black uppercase tracking-widest opacity-60">
                {profile?.dl_url && profile?.aadhaar_url && profile?.dl_number && profile?.aadhaar_number ? 'Identity Verified' : 'Action Required: Complete Identity'}
              </p>
            </div>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="px-8 py-3 bg-white/5 text-white/40 font-black uppercase text-[10px] tracking-widest rounded-full border border-white/10 hover:text-red-500 transition-all">Sign Out</button>
        </div>

        <div className="flex gap-2 p-2 bg-brand-gray-dark border border-white/5 rounded-full mb-12 w-fit mx-auto lg:mx-0 overflow-x-auto no-scrollbar">
          <button onClick={() => setActiveTab('rides')} className={`px-10 py-4 rounded-full text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === 'rides' ? 'bg-brand-orange text-white' : 'text-white/40'}`}>My Rides</button>
          <button onClick={() => setActiveTab('identity')} className={`px-10 py-4 rounded-full text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === 'identity' ? 'bg-brand-orange text-white' : 'text-white/40'}`}>Identity</button>
          <button onClick={() => setActiveTab('profile')} className={`px-10 py-4 rounded-full text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === 'profile' ? 'bg-brand-orange text-white' : 'text-white/40'}`}>Profile</button>
        </div>

        {loading ? (
          <div className="py-32 flex flex-col items-center justify-center">
             <div className="w-16 h-16 border-4 border-brand-teal/20 border-t-brand-teal rounded-full animate-spin"></div>
          </div>
        ) : activeTab === 'rides' ? (
          <div className="space-y-8 animate-fade-in">
            {bookings.length === 0 ? (
               <div className="text-center py-40 bg-brand-gray-dark/20 border-2 border-dashed border-white/5 rounded-[3.5rem]">
                  <p className="text-white/20 font-heading text-6xl mb-8">EMPTY ROAD</p>
                  <Link to="/bikes" className="bg-brand-teal text-brand-black font-heading px-12 py-5 rounded-full uppercase tracking-widest text-xs">Start Adventure</Link>
               </div>
            ) : (
              bookings.map(booking => {
                const bike = BIKES.find(b => b.id === booking.bike_id);
                const status = booking.status as BookingStatus;
                const isSigned = signedAgreementIds.has(booking.id) || status === 'ongoing' || status === 'completed';
                
                return (
                  <div key={booking.id} className="bg-brand-gray-dark/40 border border-white/5 rounded-[2.5rem] overflow-hidden group hover:border-brand-teal/40 transition-all duration-500">
                    <div className="p-8 flex flex-col lg:flex-row justify-between items-center gap-10">
                      <div className="flex flex-col md:flex-row gap-8 items-center w-full lg:w-auto">
                        <img src={bike?.imageUrl} className="w-40 h-28 object-cover rounded-2xl shadow-xl" alt="" />
                        <div className="text-center md:text-left">
                          <p className="text-brand-orange text-[9px] font-black uppercase tracking-widest">{booking.readable_id}</p>
                          <h3 className="text-white font-bold uppercase text-2xl tracking-tight mt-1">{bike?.name}</h3>
                          <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mt-2">
                            {new Date(booking.pickup_date).toLocaleDateString()} @ {booking.pickup_time}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-center lg:items-end gap-6 w-full lg:w-auto">
                        <div className="text-center lg:text-right">
                          <span className={`inline-block px-4 py-1.5 rounded-full text-[9px] font-black uppercase mb-4 border ${
                              status === 'completed' ? 'bg-green-500/10 text-green-500' : 
                              status === 'ongoing' ? 'bg-brand-teal/10 text-brand-teal' : 
                              status === 'booking_confirmed' ? 'bg-brand-teal/20 text-brand-teal animate-pulse' :
                              status === 'verifying_payment' ? 'bg-brand-yellow/10 text-brand-yellow' :
                              'bg-brand-orange/10 text-brand-orange'
                          }`}>
                              {status.replace('_', ' ')}
                          </span>
                          <p className="text-3xl font-heading text-white">₹{booking.total_rent}</p>
                        </div>

                        <div className="flex flex-wrap justify-center lg:justify-end gap-3 w-full">
                          {status === 'pending_payment' && (
                            <div className="bg-brand-black/60 p-6 rounded-3xl border border-brand-orange/30 w-full flex flex-col md:flex-row items-center gap-6">
                              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=upi://pay?pa=${UPI_ID}%26pn=RydeIt%26am=${booking.advance_amount}`} className="w-20 h-20 rounded-lg shadow-xl" alt="UPI" />
                              <div className="flex-grow text-center md:text-left">
                                <p className="text-[10px] font-black text-brand-orange uppercase mb-1 tracking-widest">Pay Advance via UPI</p>
                                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                                  <div className="relative">
                                    <input type="file" className="hidden" id={`pay-${booking.id}`} onChange={(e) => e.target.files?.[0] && handleFileUpload('payment', e.target.files[0], booking.readable_id)} />
                                    <label htmlFor={`pay-${booking.id}`} className="bg-brand-teal text-black px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest cursor-pointer block text-center min-w-[140px]">
                                      {uploadingDoc === 'payment' ? 'UPLOADING...' : 'UPLOAD SCREENSHOT'}
                                    </label>
                                  </div>
                                  <button onClick={() => handlePaidCash(booking.readable_id)} className="bg-brand-black border border-brand-teal/40 text-brand-teal px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest min-w-[140px]">PAID CASH</button>
                                </div>
                              </div>
                            </div>
                          )}

                          {status === 'booking_confirmed' && (
                            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                              {!isSigned ? (
                                <button 
                                  onClick={() => generateRentalAgreement(booking)} 
                                  className="bg-brand-yellow text-brand-black font-black px-8 py-4 rounded-xl text-[10px] uppercase tracking-widest flex items-center gap-2 justify-center"
                                >
                                  SIGN RENTAL AGREEMENT
                                </button>
                              ) : (
                                <button onClick={() => handleStartRide(booking)} className="bg-brand-teal text-black font-black px-10 py-4 rounded-xl text-[10px] uppercase tracking-widest">START RIDE</button>
                              )}
                            </div>
                          )}

                          {status === 'ongoing' && (
                            <button onClick={() => handleFinishRide(booking)} className="bg-brand-orange text-white font-black px-10 py-4 rounded-xl text-[10px] uppercase tracking-widest">FINISH RIDE</button>
                          )}

                          {(status === 'completed' || status === 'ongoing' || isSigned) && (
                            <div className="flex flex-col sm:flex-row gap-3">
                              <button 
                                onClick={() => generateRentalAgreement(booking)} 
                                className="bg-brand-teal/10 border border-brand-teal/20 text-brand-teal font-black px-8 py-4 rounded-xl text-[9px] uppercase tracking-widest flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                Agreement
                              </button>
                              <button 
                                onClick={() => downloadReceipt(booking)} 
                                className="bg-white/5 border border-white/10 text-white font-black px-8 py-4 rounded-xl text-[9px] uppercase tracking-widest flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Receipt
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : activeTab === 'identity' ? (
          <div className="animate-fade-in space-y-10">
             <div className="bg-brand-gray-dark/30 p-10 rounded-[3rem] border border-white/5 shadow-inner">
                <h3 className="text-white font-heading text-xl uppercase tracking-widest mb-8">Identity Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">DL Number</label>
                        <input type="text" value={editDlNumber} onChange={(e) => setEditDlNumber(e.target.value)} placeholder="DL Number" className="w-full bg-brand-black/60 border border-white/10 rounded-2xl p-5 text-white font-bold" />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Aadhaar Number</label>
                        <input type="text" value={editAadhaarNumber} onChange={(e) => setEditAadhaarNumber(e.target.value)} placeholder="Aadhaar Number" className="w-full bg-brand-black/60 border border-white/10 rounded-2xl p-5 text-white font-bold" />
                    </div>
                </div>
                <button onClick={() => handleUpdateProfile()} className="mt-8 px-12 py-5 bg-brand-teal text-brand-black font-heading uppercase text-[10px] tracking-widest rounded-2xl">SAVE DETAILS</button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {[
                  { id: 'dl', label: 'Driving License Photo' },
                  { id: 'aadhaar', label: 'Aadhaar Card Photo' }
                ].map((doc) => {
                  const url = doc.id === 'dl' ? profile?.dl_url : profile?.aadhaar_url;
                  const isUploading = uploadingDoc === doc.id;
                  return (
                    <div key={doc.id} className="bg-brand-gray-dark/30 p-10 rounded-[3rem] border border-white/5 flex flex-col relative overflow-hidden group">
                        <h3 className="text-white font-heading text-xl uppercase tracking-widest mb-6">{doc.label}</h3>
                        <div className="relative w-full aspect-[16/10] bg-brand-black/40 rounded-[2rem] border-2 border-dashed border-white/10 overflow-hidden flex items-center justify-center group transition-all hover:border-brand-teal/50 shadow-2xl">
                          {isUploading ? (
                            <div className="w-10 h-10 border-2 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
                          ) : url ? (
                            <>
                              <img src={url} className="w-full h-full object-cover opacity-60" alt="" />
                              <div className="absolute inset-0 bg-brand-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-brand-teal font-black text-[10px] uppercase tracking-[0.5em] bg-brand-black/80 px-6 py-3 rounded-full border border-brand-teal/20">REPLACE PHOTO</span>
                              </div>
                            </>
                          ) : (
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Upload Image</p>
                          )}
                          {!isUploading && (
                            <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFileUpload(doc.id as any, e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
                          )}
                        </div>
                    </div>
                  );
                })}
             </div>
          </div>
        ) : (
          <form onSubmit={handleUpdateProfile} className="animate-fade-in max-w-2xl bg-brand-gray-dark/30 p-12 rounded-[3rem] border border-white/5 space-y-10 mx-auto lg:mx-0">
            <h3 className="text-xl font-heading text-brand-yellow uppercase tracking-widest">Profile</h3>
            <div className="space-y-6">
              <input type="text" value={user.email} disabled className="w-full bg-brand-black/20 border border-white/5 rounded-2xl p-5 text-white/20 font-bold outline-none cursor-not-allowed text-sm" />
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Full Name" className="w-full bg-brand-black/60 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-brand-orange transition-all text-sm" required />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">WhatsApp Number</label>
                  <input type="tel" value={editWhatsapp} onChange={(e) => setEditWhatsapp(e.target.value)} placeholder="WhatsApp Number" className="w-full bg-brand-black/60 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-brand-orange transition-all text-sm" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">Alt Number (Pillion/Family)</label>
                  <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Alternate Number" className="w-full bg-brand-black/60 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-brand-orange transition-all text-sm" required />
                </div>
              </div>
            </div>
            <button type="submit" disabled={isUpdating} className="w-full py-5 bg-brand-teal text-brand-black font-heading uppercase text-xs tracking-widest rounded-2xl shadow-xl">SAVE PROFILE</button>
          </form>
        )}

        {showCashConfirmation && (
          <Modal isOpen={showCashConfirmation} onClose={() => setShowCashConfirmation(false)} title="PAYMENT IN PROGRESS">
              <div className="py-8 text-center space-y-8 animate-fade-in">
                  <h3 className="text-2xl font-heading text-white uppercase tracking-tighter">CASH PAYMENT LOGGED</h3>
                  <p className="text-brand-gray-light font-sans text-sm leading-relaxed opacity-80 px-4">Our executives are currently checking your payment reception. Confirmation will be sent soon.</p>
                  <button onClick={() => setShowCashConfirmation(false)} className="w-full bg-brand-orange text-white py-5 rounded-2xl font-heading uppercase tracking-widest text-sm">GOT IT</button>
              </div>
          </Modal>
        )}
      </div>
    </section>
  );
};
