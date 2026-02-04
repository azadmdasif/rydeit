
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useToast } from '../../App';
import { BIKES } from '../../constants';
import { Modal } from '../Modal';

interface AdminBookingsProps {
  initialFilter?: string;
}

export const AdminBookings: React.FC<AdminBookingsProps> = ({ initialFilter = 'all' }) => {
  const { showToast } = useToast();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [filter, setFilter] = useState(initialFilter);
  
  const [adjustment, setAdjustment] = useState({ amount: 0, reason: '', type: 'fee' });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, [filter]);

  const fetchBookings = async () => {
    setLoading(true);
    let query = supabase.from('bookings').select('*').order('created_at', { ascending: false });
    
    if (filter === 'pending') query = query.eq('status', 'verifying_payment');
    if (filter === 'running') query = query.eq('status', 'ongoing');
    if (filter === 'completed') query = query.eq('status', 'completed');

    const { data } = await query;
    if (data) {
      if (filter === 'overdue') {
        const now = new Date();
        const overdue = data.filter(b => {
          if (b.status !== 'ongoing') return false;
          const returnDate = new Date(`${b.return_date}T${b.return_time}`);
          return returnDate < now;
        });
        setBookings(overdue);
      } else {
        setBookings(data);
      }
    }
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string, reason?: string) => {
    const updates: any = { status };
    if (reason) updates.admin_notes = reason;

    const { error } = await supabase.from('bookings').update(updates).eq('id', id);
    if (error) showToast(error.message, 'error');
    else {
      showToast(`Status updated: ${status}`, 'success');
      fetchBookings();
      if (selectedBooking?.id === id) {
          const { data } = await supabase.from('bookings').select('*').eq('id', id).single();
          setSelectedBooking(data);
      }
    }
  };

  const handleAdjustment = async () => {
    if (!selectedBooking || !adjustment.reason) {
        showToast("Reason is required for adjustment", "warning");
        return;
    }
    const currentAdjust = selectedBooking.adjustment_amount || 0;
    const finalAdjust = (adjustment.type === 'fee' || adjustment.type === 'damage' || adjustment.type === 'revenue') 
      ? currentAdjust + adjustment.amount 
      : currentAdjust - adjustment.amount;
    
    const { error } = await supabase.from('bookings').update({ 
      adjustment_amount: finalAdjust,
      adjustment_reason: adjustment.reason 
    }).eq('id', selectedBooking.id);

    if (error) showToast(error.message, 'error');
    else {
      showToast('Adjustment applied.', 'success');
      fetchBookings();
      const { data } = await supabase.from('bookings').select('*').eq('id', selectedBooking.id).single();
      setSelectedBooking(data);
      setAdjustment({ amount: 0, reason: '', type: 'fee' });
    }
  };

  const handlePhotoUpload = async (file: File) => {
    if (!selectedBooking) return;
    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `handover_${selectedBooking.readable_id}_${Date.now()}.${fileExt}`;
      const filePath = `handover-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('booking-docs').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('booking-docs').getPublicUrl(filePath);

      await supabase.from('bookings').update({ customer_photo_url: publicUrl }).eq('id', selectedBooking.id);
      
      showToast('Handover photo successfully logged.', 'success');
      const { data } = await supabase.from('bookings').select('*').eq('id', selectedBooking.id).single();
      setSelectedBooking(data);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-12 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-4xl font-heading text-white uppercase tracking-tighter">Ride Ledger</h2>
          <p className="text-brand-teal text-[9px] font-black uppercase tracking-[0.4em] mt-2">Operational Log</p>
        </div>
        
        <div className="flex flex-wrap gap-2 p-1 bg-brand-gray-dark border border-white/5 rounded-2xl">
          {['all', 'pending', 'running', 'overdue', 'completed'].map(f => (
            <button 
                key={f} 
                onClick={() => setFilter(f)} 
                className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filter === f ? (f === 'overdue' ? 'bg-red-500 text-white' : 'bg-brand-orange text-white') : 'text-white/40 hover:text-white'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-brand-gray-dark/40 rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-brand-black/60 text-[9px] font-black uppercase tracking-widest text-white/30">
              <tr>
                <th className="px-10 py-8">Rider & Vehicle</th>
                <th className="px-10 py-8">Status</th>
                <th className="px-10 py-8">Schedule</th>
                <th className="px-10 py-8">Financials</th>
                <th className="px-10 py-8 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {bookings.map(booking => {
                const bike = BIKES.find(b => b.id === booking.bike_id);
                const isOverdue = booking.status === 'ongoing' && new Date(`${booking.return_date}T${booking.return_time}`) < new Date();
                
                return (
                  <tr key={booking.id} className="hover:bg-brand-teal/[0.02] transition-colors group">
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                            <div className="text-brand-orange text-[9px] font-black uppercase mb-1">{booking.readable_id}</div>
                            <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10">
                                <img src={bike?.imageUrl} className="w-full h-full object-cover" />
                            </div>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white uppercase tracking-tight">{booking.customer_name}</div>
                          <div className="text-[10px] text-brand-teal font-black uppercase tracking-widest mt-1">{bike?.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <span className={`inline-block px-4 py-2 rounded-xl text-[9px] font-black uppercase border tracking-widest ${
                        booking.status === 'completed' ? 'border-green-500/30 text-green-500' :
                        booking.status === 'ongoing' ? (isOverdue ? 'border-red-500/50 text-red-500 animate-pulse' : 'border-brand-teal/30 text-brand-teal') :
                        booking.status === 'verifying_payment' ? 'border-brand-yellow/30 text-brand-yellow' :
                        'border-white/10 text-white/40'
                      }`}>
                        {isOverdue ? 'OVERDUE' : booking.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-10 py-8">
                      <div className="text-[10px] text-white/60 font-bold uppercase">{booking.pickup_date} @ {booking.pickup_time}</div>
                      <div className={`text-[10px] mt-1 uppercase font-bold ${isOverdue ? 'text-red-500' : 'text-white/30'}`}>Return {booking.return_date}</div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="text-sm font-heading text-white">₹{booking.total_rent + (booking.adjustment_amount || 0)}</div>
                    </td>
                    <td className="px-10 py-8 text-right">
                      <button 
                        onClick={() => setSelectedBooking(booking)} 
                        className="text-[9px] font-black text-brand-teal uppercase tracking-widest border border-brand-teal/20 px-6 py-3 rounded-xl hover:bg-brand-teal hover:text-black transition-all shadow-lg"
                      >
                        Operate
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedBooking && (
        <Modal isOpen={!!selectedBooking} onClose={() => setSelectedBooking(null)} title={`OPERATIONS: ${selectedBooking.readable_id}`}>
          <div className="space-y-10 py-6 px-2 max-h-[75vh] overflow-y-auto no-scrollbar">
            
            {/* RIDER INFO SECTION */}
            <div className="bg-brand-black/40 p-10 rounded-[3rem] border border-white/5 space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-center gap-10">
                <div className="text-center md:text-left flex-grow">
                  <div className="flex items-center gap-3 mb-2 justify-center md:justify-start">
                    <h4 className="text-brand-teal font-heading text-[10px] uppercase tracking-[0.3em]">Active Rider Identity</h4>
                    {selectedBooking.payment_method && (
                      <span className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] ${selectedBooking.payment_method === 'cash' ? 'bg-green-500/20 text-green-500 border border-green-500/30' : 'bg-brand-teal/20 text-brand-teal border border-brand-teal/30'}`}>
                        {selectedBooking.payment_method} Received
                      </span>
                    )}
                  </div>
                  <p className="text-white font-bold text-3xl uppercase tracking-tighter">{selectedBooking.customer_name}</p>
                  <a 
                    href={`tel:${selectedBooking.customer_phone}`} 
                    className="inline-flex items-center gap-3 bg-brand-teal/10 border border-brand-teal/20 px-6 py-3 rounded-xl text-brand-teal text-sm font-black mt-4 hover:bg-brand-teal hover:text-black transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    {selectedBooking.customer_phone}
                  </a>
                </div>

                <div className="relative w-full md:w-80 aspect-[4/3] bg-brand-black rounded-[2rem] border-2 border-dashed border-white/10 overflow-hidden flex flex-col items-center justify-center group transition-all hover:border-brand-orange">
                   {uploadingPhoto ? (
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-2 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-[8px] font-black text-brand-orange uppercase">Processing...</span>
                      </div>
                   ) : selectedBooking.customer_photo_url ? (
                      <img src={selectedBooking.customer_photo_url} className="w-full h-full object-cover" />
                   ) : (
                      <div className="text-center p-6">
                        <svg className="w-10 h-10 text-white/10 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        <p className="text-[9px] text-white/30 font-black uppercase tracking-widest">Upload Handover Photo</p>
                      </div>
                   )}
                   {!uploadingPhoto && (
                      <div className="absolute inset-0 bg-brand-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                        <span className="bg-brand-orange text-white text-[9px] font-black px-6 py-2 rounded-full uppercase">Choose Photo</span>
                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])} />
                      </div>
                   )}
                </div>
              </div>
            </div>

            {/* PAYMENT PROOF SECTION */}
            {selectedBooking.payment_screenshot_url && (
              <div className="bg-brand-black/40 p-10 rounded-[3rem] border-2 border-brand-yellow/30 space-y-6">
                <div className="flex justify-between items-center">
                  <h4 className="text-brand-yellow font-heading text-sm uppercase tracking-widest flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Payment Verification Needed ({selectedBooking.payment_method?.toUpperCase() || 'UPI'})
                  </h4>
                  <a href={selectedBooking.payment_screenshot_url} target="_blank" rel="noreferrer" className="text-[9px] font-black text-brand-teal uppercase tracking-widest hover:underline">View Full Size</a>
                </div>
                <div className="relative w-full h-80 bg-brand-black rounded-3xl overflow-hidden border border-white/5 shadow-inner">
                  <img src={selectedBooking.payment_screenshot_url} className="w-full h-full object-contain" alt="Payment Proof" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-brand-black/40 p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                <h4 className="text-brand-yellow font-heading text-sm uppercase tracking-widest">Financial Operations</h4>
                <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => updateStatus(selectedBooking.id, 'booking_confirmed')} 
                      disabled={selectedBooking.status === 'booking_confirmed'}
                      className={`py-4 bg-green-500 text-white text-[9px] font-black uppercase rounded-xl hover:bg-green-600 transition-all ${selectedBooking.status === 'booking_confirmed' ? 'opacity-30 cursor-not-allowed shadow-none' : 'shadow-lg shadow-green-500/20'}`}
                    >
                      {selectedBooking.status === 'booking_confirmed' ? 'Payment Confirmed ✓' : 'Confirm Payment'}
                    </button>
                    <button onClick={() => updateStatus(selectedBooking.id, 'pending_payment', 'Rejected')} className="py-4 bg-white/5 text-red-500 border border-red-500/20 text-[9px] font-black uppercase rounded-xl hover:bg-red-500/10 transition-colors">Reject Verification</button>
                </div>
              </div>

              <div className="bg-brand-black/40 p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                <h4 className="text-brand-teal font-heading text-sm uppercase tracking-widest">Fleet Operations</h4>
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => updateStatus(selectedBooking.id, 'ongoing')} className="py-4 bg-brand-teal text-black text-[9px] font-black uppercase rounded-xl hover:bg-brand-teal/80 transition-colors">Dispatch / Start</button>
                    <button onClick={() => updateStatus(selectedBooking.id, 'completed')} className="py-4 bg-brand-orange text-white text-[9px] font-black uppercase rounded-xl hover:bg-brand-orange/80 transition-colors">Receive / Finish</button>
                </div>
              </div>
            </div>

            <div className="bg-brand-black/40 p-10 rounded-[3rem] border border-white/5 space-y-10">
                <div className="flex justify-between items-center">
                  <h4 className="text-brand-yellow font-heading text-sm uppercase tracking-widest">Custom Adjustments</h4>
                  <div className="text-[10px] text-white/20 font-black uppercase tracking-widest">Current Net: ₹{selectedBooking.total_rent + (selectedBooking.adjustment_amount || 0)}</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <select 
                      value={adjustment.type} 
                      onChange={(e) => setAdjustment(a => ({...a, type: e.target.value}))} 
                      className="bg-brand-black border border-white/10 rounded-xl p-5 text-xs text-white outline-none focus:border-brand-yellow"
                    >
                        <option value="damage">Damage Charges (+)</option>
                        <option value="refund">Trip Refund (-)</option>
                        <option value="discount">Discounts (-)</option>
                        <option value="revenue">Other Revenue (+)</option>
                        <option value="expenditure">Other Expenditure (-)</option>
                    </select>
                    <input type="number" placeholder="₹ Amount" value={adjustment.amount} onChange={(e) => setAdjustment(a => ({...a, amount: parseFloat(e.target.value)}))} className="bg-brand-black border border-white/10 rounded-xl p-5 text-sm text-white outline-none focus:border-brand-yellow" />
                    <textarea placeholder="Reason for adjustment..." value={adjustment.reason} onChange={(e) => setAdjustment(a => ({...a, reason: e.target.value}))} className="bg-brand-black border border-white/10 rounded-xl p-4 text-xs text-white resize-none outline-none focus:border-brand-yellow" />
                </div>
                <button onClick={handleAdjustment} className="w-full py-5 bg-brand-yellow text-brand-black font-black uppercase text-[11px] rounded-2xl shadow-xl hover:scale-[1.01] transition-all">Apply Financial Settlement</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
