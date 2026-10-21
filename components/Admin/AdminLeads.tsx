import React, { useState, useEffect, useMemo } from 'react';
import { Lead, LeadStatus, LeadVehiclePreference, LeadSource, RentalPurpose, FollowUpComment, RequestedVehicleItem } from '../../types';
import { 
  getStoredLeads, 
  fetchLeadsFromSupabase, 
  saveLead, 
  updateLeadStatus, 
  addFollowUpComment,
  deleteLead, 
  computeDemandAnalytics 
} from '../../leadsStorage';
import { BIKES } from '../../constants';
import { getFleetBikes } from '../../fleetStorage';
import { supabase } from '../../supabase';
import { useToast } from '../../App';
import { ensureCustomerProfile } from '../../profileSync';

interface AdminLeadsProps {
  onNavigateToBooking?: (bookingId: string) => void;
}

export const AdminLeads: React.FC<AdminLeadsProps> = ({ onNavigateToBooking }) => {
  const { showToast } = useToast();
  const [leads, setLeads] = useState<Lead[]>(getStoredLeads);
  const [loading, setLoading] = useState<boolean>(false);

  // Filters - Default to 'follow_up' tab as requested
  const [statusFilter, setStatusFilter] = useState<string>('follow_up');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);

  // Follow-up Prompt Modal (when status is changed to 'need_follow_up')
  const [schedulePromptLead, setSchedulePromptLead] = useState<Lead | null>(null);
  const [promptFollowUpDate, setPromptFollowUpDate] = useState<string>('');
  const [promptFollowUpNote, setPromptFollowUpNote] = useState<string>('');

  // Follow-Up Comments & History Modal (when followed up later)
  const [followUpModalLead, setFollowUpModalLead] = useState<Lead | null>(null);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState<string>('');
  const [statusAfterComment, setStatusAfterComment] = useState<LeadStatus>('need_follow_up');

  // Convert to booking form state (Contains ALL fields asked in manual booking)
  const [convertForm, setConvertForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    bike_id: 16,
    is_outstation: false,
    pickup_date: '',
    pickup_time: '10:00',
    return_date: '',
    return_time: '20:00',
    agreed_rent: 700,
    standard_rent: 700,
    deposit_amount: 1000,
    advance_amount: 500,
    payment_method: 'upi' as 'upi' | 'cash' | 'card' | 'bank_transfer',
    payment_note: '',
    pickup_method: 'garage' as 'garage' | 'home',
    drop_method: 'garage' as 'garage' | 'home',
    delivery_address: '',
    return_pickup_address: '',
    same_address_for_drop: true,
    aadhaar_number: '',
    dl_number: '',
    aadhaar_image: null as File | null,
    dl_image: null as File | null,
    handover_image: null as File | null,
    ride_status: 'booking_confirmed' as 'booking_confirmed' | 'ongoing',
    start_odometer: 0,
    admin_notes: ''
  });

  // Fast Add/Edit Lead Form state (Supports any number of bikes with individual preferences)
  const [leadForm, setLeadForm] = useState<{
    customer_name: string;
    customer_phone: string;
    source: LeadSource;
    vehicle_preference: LeadVehiclePreference;
    specific_vehicle_id: number | null;
    requested_vehicles: RequestedVehicleItem[];
    pickup_date: string;
    return_date: string;
    rental_duration_days: number;
    purpose: RentalPurpose;
    budget_expectation: string;
    status: LeadStatus;
    follow_up_date: string;
    notes: string;
  }>({
    customer_name: '',
    customer_phone: '',
    source: 'whatsapp',
    vehicle_preference: 'scooty',
    specific_vehicle_id: null,
    requested_vehicles: [{ preference: 'scooty', specific_vehicle_id: null }],
    pickup_date: new Date().toISOString().split('T')[0],
    return_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    rental_duration_days: 1,
    purpose: 'Weekend Trip / Outing',
    budget_expectation: 'Standard Rate',
    status: 'need_follow_up',
    follow_up_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const allFleetBikes = useMemo(() => {
    try {
      const fleet = getFleetBikes();
      return fleet.length > 0 ? fleet : BIKES;
    } catch {
      return BIKES;
    }
  }, []);

  // Filter specific vehicles based on chosen preference
  const filteredVehiclesForPreference = useMemo(() => {
    if (leadForm.vehicle_preference === 'flexible') return allFleetBikes;
    const categoryMap: Record<string, string> = {
      scooty: 'Scooter',
      bike: 'Bikes',
      bullet: 'Royal Enfield',
      sports: 'Sports'
    };
    const targetCategory = categoryMap[leadForm.vehicle_preference];
    return allFleetBikes.filter(b => b.category === targetCategory);
  }, [allFleetBikes, leadForm.vehicle_preference]);

  // Helper for multi-bike category filtering
  const getBikesForPreference = (pref: LeadVehiclePreference) => {
    if (pref === 'flexible') return allFleetBikes;
    const categoryMap: Record<string, string> = {
      scooty: 'Scooter',
      bike: 'Bikes',
      bullet: 'Royal Enfield',
      sports: 'Sports'
    };
    const targetCategory = categoryMap[pref];
    return allFleetBikes.filter(b => b.category === targetCategory);
  };

  // Multi-bike handlers for the lead form
  const handleAddBike = () => {
    setLeadForm(prev => {
      const current = prev.requested_vehicles && prev.requested_vehicles.length > 0 
        ? [...prev.requested_vehicles] 
        : [{ preference: prev.vehicle_preference, specific_vehicle_id: prev.specific_vehicle_id }];
      current.push({ preference: 'scooty', specific_vehicle_id: null });
      return { ...prev, requested_vehicles: current };
    });
  };

  const handleRemoveBike = (index: number) => {
    setLeadForm(prev => {
      const current = prev.requested_vehicles && prev.requested_vehicles.length > 0 
        ? [...prev.requested_vehicles] 
        : [{ preference: prev.vehicle_preference, specific_vehicle_id: prev.specific_vehicle_id }];
      if (current.length <= 1) return prev;
      const updated = current.filter((_, idx) => idx !== index);
      return { 
        ...prev, 
        requested_vehicles: updated,
        vehicle_preference: updated[0].preference,
        specific_vehicle_id: updated[0].specific_vehicle_id || null
      };
    });
  };

  const handleUpdateBikePreference = (index: number, pref: LeadVehiclePreference) => {
    setLeadForm(prev => {
      const current = prev.requested_vehicles && prev.requested_vehicles.length > 0 
        ? [...prev.requested_vehicles] 
        : [{ preference: prev.vehicle_preference, specific_vehicle_id: prev.specific_vehicle_id }];
      current[index] = { ...current[index], preference: pref, specific_vehicle_id: null };
      return {
        ...prev,
        requested_vehicles: current,
        ...(index === 0 ? { vehicle_preference: pref, specific_vehicle_id: null } : {})
      };
    });
  };

  const handleUpdateBikeSpecificVehicle = (index: number, vehicleId: number | null) => {
    setLeadForm(prev => {
      const current = prev.requested_vehicles && prev.requested_vehicles.length > 0 
        ? [...prev.requested_vehicles] 
        : [{ preference: prev.vehicle_preference, specific_vehicle_id: prev.specific_vehicle_id }];
      current[index] = { ...current[index], specific_vehicle_id: vehicleId };
      return {
        ...prev,
        requested_vehicles: current,
        ...(index === 0 ? { specific_vehicle_id: vehicleId } : {})
      };
    });
  };

  // Load leads on mount
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await fetchLeadsFromSupabase();
      setLeads(data);
      setLoading(false);
    };
    load();
  }, []);

  // Compute analytics
  const analytics = useMemo(() => computeDemandAnalytics(leads), [leads]);

  // Handle open add modal
  const handleOpenAddModal = () => {
    setEditingLead(null);
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    setLeadForm({
      customer_name: '',
      customer_phone: '',
      source: 'whatsapp',
      vehicle_preference: 'scooty',
      specific_vehicle_id: null,
      requested_vehicles: [{ preference: 'scooty', specific_vehicle_id: null }],
      pickup_date: today,
      return_date: tomorrow,
      rental_duration_days: 1,
      purpose: 'Weekend Trip / Outing',
      budget_expectation: 'Standard Rate',
      status: 'need_follow_up',
      follow_up_date: tomorrow,
      notes: ''
    });
    setIsAddModalOpen(true);
  };

  // Handle open edit modal
  const handleOpenEditModal = (lead: Lead) => {
    setEditingLead(lead);
    const initialRequested: RequestedVehicleItem[] = (lead.requested_vehicles && lead.requested_vehicles.length > 0)
      ? lead.requested_vehicles
      : [{ preference: lead.vehicle_preference, specific_vehicle_id: lead.specific_vehicle_id ?? null, specific_vehicle_name: lead.specific_vehicle_name }];

    setLeadForm({
      customer_name: lead.customer_name,
      customer_phone: lead.customer_phone,
      source: lead.source,
      vehicle_preference: lead.vehicle_preference,
      specific_vehicle_id: lead.specific_vehicle_id ?? null,
      requested_vehicles: initialRequested,
      pickup_date: lead.pickup_date,
      return_date: lead.return_date,
      rental_duration_days: lead.rental_duration_days,
      purpose: lead.purpose,
      budget_expectation: lead.budget_expectation || 'Standard Rate',
      status: lead.status,
      follow_up_date: lead.follow_up_date || lead.pickup_date,
      notes: lead.notes || ''
    });
    setIsAddModalOpen(true);
  };

  // Quick date presets in form
  const applyDatePreset = (preset: 'today' | 'tomorrow' | 'weekend' | 'nextWeek') => {
    const now = new Date();
    let start = new Date();
    let days = 1;

    if (preset === 'today') {
      start = now;
      days = 1;
    } else if (preset === 'tomorrow') {
      start = new Date(now.getTime() + 86400000);
      days = 1;
    } else if (preset === 'weekend') {
      const dayOfWeek = now.getDay();
      const daysUntilSat = (6 - dayOfWeek + 7) % 7 || 7;
      start = new Date(now.getTime() + daysUntilSat * 86400000);
      days = 2;
    } else if (preset === 'nextWeek') {
      start = new Date(now.getTime() + 7 * 86400000);
      days = 2;
    }

    const startStr = start.toISOString().split('T')[0];
    const end = new Date(start.getTime() + days * 86400000);
    const endStr = end.toISOString().split('T')[0];

    setLeadForm(prev => ({
      ...prev,
      pickup_date: startStr,
      return_date: endStr,
      rental_duration_days: days
    }));
  };

  // Quick duration presets
  const applyDurationPreset = (days: number) => {
    const start = new Date(leadForm.pickup_date || new Date());
    const end = new Date(start.getTime() + days * 86400000);
    setLeadForm(prev => ({
      ...prev,
      rental_duration_days: days,
      return_date: end.toISOString().split('T')[0]
    }));
  };

  // Quick note preset appender
  const appendNoteChip = (chip: string) => {
    setLeadForm(prev => {
      const existing = prev.notes.trim();
      if (!existing) return { ...prev, notes: chip };
      if (existing.includes(chip)) return prev;
      return { ...prev, notes: `${existing} · ${chip}` };
    });
  };

  // Submit save lead
  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.customer_name.trim()) {
      showToast('Please enter customer name', 'warning');
      return;
    }
    if (!leadForm.customer_phone.trim() || leadForm.customer_phone.length < 10) {
      showToast('Please enter a valid 10-digit phone number', 'warning');
      return;
    }
    if (leadForm.status === 'need_follow_up' && !leadForm.follow_up_date) {
      showToast('Please select a scheduled follow-up date', 'warning');
      return;
    }

    const reqVehicles = (leadForm.requested_vehicles && leadForm.requested_vehicles.length > 0)
      ? leadForm.requested_vehicles
      : [{ preference: leadForm.vehicle_preference, specific_vehicle_id: leadForm.specific_vehicle_id ? Number(leadForm.specific_vehicle_id) : null }];

    const firstBike = allFleetBikes.find(b => b.id === Number(reqVehicles[0]?.specific_vehicle_id));
    
    // Generate clean descriptive summary
    let vehicleSummary = '';
    if (reqVehicles.length > 1) {
      vehicleSummary = `${reqVehicles.length} Bikes: ` + reqVehicles.map(v => {
        const b = allFleetBikes.find(bike => bike.id === Number(v.specific_vehicle_id));
        return b ? b.name : v.preference.toUpperCase();
      }).join(', ');
    } else {
      vehicleSummary = firstBike ? firstBike.name : `${(reqVehicles[0]?.preference || 'scooty').toUpperCase()} (Any model)`;
    }

    const leadPayload: Lead = {
      id: editingLead ? editingLead.id : `lead_${Date.now()}`,
      created_at: editingLead ? editingLead.created_at : new Date().toISOString(),
      customer_name: leadForm.customer_name.trim(),
      customer_phone: leadForm.customer_phone.trim(),
      source: leadForm.source,
      vehicle_preference: reqVehicles[0]?.preference || leadForm.vehicle_preference,
      specific_vehicle_id: reqVehicles[0]?.specific_vehicle_id ? Number(reqVehicles[0].specific_vehicle_id) : null,
      specific_vehicle_name: vehicleSummary,
      requested_vehicles: reqVehicles.map(v => {
        const b = allFleetBikes.find(bike => bike.id === Number(v.specific_vehicle_id));
        return {
          preference: v.preference,
          specific_vehicle_id: v.specific_vehicle_id ? Number(v.specific_vehicle_id) : null,
          specific_vehicle_name: b ? b.name : undefined
        };
      }),
      pickup_date: leadForm.pickup_date,
      return_date: leadForm.return_date,
      rental_duration_days: Math.max(1, Number(leadForm.rental_duration_days) || 1),
      purpose: leadForm.purpose,
      budget_expectation: leadForm.budget_expectation,
      status: leadForm.status,
      follow_up_date: leadForm.status === 'need_follow_up' ? leadForm.follow_up_date : undefined,
      notes: leadForm.notes.trim(),
      follow_up_comments: editingLead ? editingLead.follow_up_comments : undefined,
      converted_booking_id: editingLead ? editingLead.converted_booking_id : undefined,
      converted_at: editingLead ? editingLead.converted_at : undefined
    };

    await saveLead(leadPayload);
    const updated = await fetchLeadsFromSupabase();
    setLeads(updated);
    setIsAddModalOpen(false);

    // If status is Booked, immediately open the manual booking form to ask relevant entries before moving to bookings tab
    if (leadForm.status === 'booked') {
      showToast('Lead saved! Complete manual booking entries to move to bookings ledger.', 'info');
      handleOpenConvertModal(leadPayload);
      return;
    }

    showToast(editingLead ? 'Lead updated successfully' : 'New inquiry logged successfully', 'success');
  };

  // Open Schedule Follow-Up & Details Modal
  const handleOpenScheduleFollowUpModal = (lead: Lead) => {
    setSchedulePromptLead(lead);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    setPromptFollowUpDate(lead.follow_up_date || tomorrow);
    setPromptFollowUpNote(lead.notes || '');
  };

  // Quick status update inline: If set to follow up, prompt to enter follow up date!
  // If set to booked, open the manual booking form to ask relevant entries before moving to bookings tab!
  const handleQuickStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    const target = leads.find(l => l.id === leadId);
    if (!target) return;

    if (newStatus === 'need_follow_up') {
      // Prompt user to enter follow up date & details
      handleOpenScheduleFollowUpModal(target);
      return;
    }

    if (newStatus === 'booked') {
      // Open create manual booking form
      handleOpenConvertModal(target);
      return;
    }

    await updateLeadStatus(leadId, newStatus);
    const updated = await fetchLeadsFromSupabase();
    setLeads(updated);
    showToast(`Lead status updated to ${newStatus.replace(/_/g, ' ')}`, 'info');
  };

  // Confirm schedule follow up from prompt modal
  const handleConfirmScheduleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulePromptLead) return;
    if (!promptFollowUpDate) {
      showToast('Please select a follow-up date', 'warning');
      return;
    }

    const note = promptFollowUpNote.trim();
    if (note) {
      await addFollowUpComment(schedulePromptLead.id, note, promptFollowUpDate, 'need_follow_up');
    }
    
    const updatedLead: Lead = {
      ...schedulePromptLead,
      status: 'need_follow_up',
      follow_up_date: promptFollowUpDate,
      notes: note || schedulePromptLead.notes
    };
    await saveLead(updatedLead);

    const updated = await fetchLeadsFromSupabase();
    setLeads(updated);
    setSchedulePromptLead(null);
    showToast(`Follow-up scheduled for ${promptFollowUpDate}`, 'success');
  };

  // Open Follow-Up Comments Modal (When followed up later)
  const handleOpenFollowUpCommentsModal = (lead: Lead) => {
    setFollowUpModalLead(lead);
    setNewCommentText('');
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    setNextFollowUpDate(lead.follow_up_date || tomorrow);
    setStatusAfterComment(lead.status);
  };

  // Submit new follow up comment
  const handleSaveFollowUpComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpModalLead) return;
    if (!newCommentText.trim()) {
      showToast('Please enter comment text', 'warning');
      return;
    }

    await addFollowUpComment(
      followUpModalLead.id,
      newCommentText.trim(),
      statusAfterComment === 'need_follow_up' ? nextFollowUpDate : undefined,
      statusAfterComment
    );

    const updated = await fetchLeadsFromSupabase();
    setLeads(updated);
    
    // Update local modal view with fresh comments
    const refreshed = updated.find(l => l.id === followUpModalLead.id);
    if (refreshed) setFollowUpModalLead(refreshed);
    setNewCommentText('');
    showToast('Follow-up comment recorded', 'success');
  };

  // Delete lead
  const handleDeleteLead = async (lead: Lead) => {
    if (!window.confirm(`Delete inquiry for ${lead.customer_name}?`)) return;
    await deleteLead(lead.id);
    const updated = await fetchLeadsFromSupabase();
    setLeads(updated);
    showToast('Inquiry removed', 'info');
  };

  // WhatsApp Follow-up link
  const getWhatsAppFollowUpUrl = (lead: Lead) => {
    const phone = lead.customer_phone.replace(/\D/g, '');
    const cleanPhone = phone.length === 10 ? `91${phone}` : phone;
    const vehicleName = lead.specific_vehicle_name || `${lead.vehicle_preference.toUpperCase()}`;

    const text = `Hi *${lead.customer_name}*, greetings from *Rydeit Rentals Kolkata*! 🏍️💨\n\n` +
      `We are following up on your inquiry for *${vehicleName}* for *${lead.pickup_date}* to *${lead.return_date}* (${lead.rental_duration_days} Day${lead.rental_duration_days > 1 ? 's' : ''}).\n\n` +
      `We have verified machine availability and would love to reserve this slot for you.\n\n` +
      `Would you like us to send the booking details and lock your ride?\n\n` +
      `Best regards,\n` +
      `Team Rydeit Kolkata\n` +
      `📞 +91 76860 22245 | 6C, Mohammadan Burial Ground Lane`;

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  // Duration text helper
  const getDurationText = (pDate: string, pTime: string, rDate: string, rTime: string): string => {
    if (!pDate || !rDate) return '1 Day';
    const start = new Date(`${pDate}T${pTime || '10:00'}`).getTime();
    const end = new Date(`${rDate}T${rTime || '20:00'}`).getTime();
    const diffHours = (end - start) / (1000 * 60 * 60);
    if (isNaN(diffHours) || diffHours <= 0) return '1 Day (Standard)';
    const days = Math.floor(diffHours / 24);
    const remHours = Math.round(diffHours % 24);
    if (days === 0) return `${remHours} Hours`;
    if (remHours === 0) return `${days} Day${days > 1 ? 's' : ''}`;
    return `${days}D ${remHours}H`;
  };

  // Open Convert to Booking modal (Prefills with all available Lead Data)
  const handleOpenConvertModal = (lead: Lead) => {
    setConvertingLead(lead);
    
    let defaultBikeId = lead.specific_vehicle_id || 16;
    if (!lead.specific_vehicle_id) {
      if (lead.vehicle_preference === 'scooty') defaultBikeId = 16;
      else if (lead.vehicle_preference === 'bullet') defaultBikeId = 12;
      else if (lead.vehicle_preference === 'sports') defaultBikeId = 10;
      else defaultBikeId = 1;
    }

    const chosenBike = allFleetBikes.find(b => b.id === defaultBikeId) || allFleetBikes[0];
    const durationDays = lead.rental_duration_days || Math.max(1, Math.round((new Date(lead.return_date).getTime() - new Date(lead.pickup_date).getTime()) / 86400000)) || 1;
    const standardRent = (chosenBike?.dailyRate || 700) * durationDays;

    setConvertForm({
      customer_name: lead.customer_name || '',
      customer_phone: lead.customer_phone || '',
      customer_email: '', // Mandatory for profile creation & cross-device rider login
      bike_id: defaultBikeId,
      is_outstation: lead.purpose === 'Long Highway Tour',
      pickup_date: lead.pickup_date || new Date().toISOString().split('T')[0],
      pickup_time: '10:00',
      return_date: lead.return_date || new Date(Date.now() + 86400000).toISOString().split('T')[0],
      return_time: '20:00',
      agreed_rent: standardRent,
      standard_rent: standardRent,
      deposit_amount: 1000,
      advance_amount: 500,
      payment_method: 'upi',
      payment_note: '',
      pickup_method: 'garage',
      drop_method: 'garage',
      delivery_address: '',
      return_pickup_address: '',
      same_address_for_drop: true,
      aadhaar_number: '',
      dl_number: '',
      aadhaar_image: null,
      dl_image: null,
      handover_image: null,
      ride_status: 'booking_confirmed',
      start_odometer: chosenBike?.odometer_reading || 0,
      admin_notes: `Converted from ${lead.source.toUpperCase()} lead: ${lead.purpose || ''} ${lead.notes ? `| ${lead.notes}` : ''}`.trim()
    });
  };

  // Recompute prices and odometer when bike or dates change during conversion
  const handleConvertBikeOrDateChange = (changes: Partial<typeof convertForm>) => {
    setConvertForm(prev => {
      const next = { ...prev, ...changes };
      const bike = allFleetBikes.find(b => b.id === next.bike_id) || allFleetBikes[0];
      const start = new Date(`${next.pickup_date}T${next.pickup_time}`).getTime();
      const end = new Date(`${next.return_date}T${next.return_time}`).getTime();
      const diffHours = (end - start) / (1000 * 60 * 60);
      const days = Math.max(1, Math.ceil(diffHours / 24));
      const dailyRate = bike?.dailyRate || 700;
      const standardRent = dailyRate * days;
      const wasAgreedAtStandard = prev.agreed_rent === prev.standard_rent;

      return {
        ...next,
        standard_rent: standardRent,
        agreed_rent: wasAgreedAtStandard ? standardRent : next.agreed_rent,
        start_odometer: changes.bike_id ? (bike?.odometer_reading || 0) : next.start_odometer
      };
    });
  };

  // Confirm Convert to Booking with ALL manual booking fields, mandatory email, and guaranteed profile
  const handleConfirmConversion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingLead) return;

    if (!convertForm.customer_name.trim()) {
      showToast('Customer name is required', 'warning');
      return;
    }
    if (!convertForm.customer_phone.trim()) {
      showToast('Customer phone is required', 'warning');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!convertForm.customer_email.trim() || !emailRegex.test(convertForm.customer_email.trim())) {
      showToast('Valid Customer Email is mandatory for converting to booking & creating rider profile', 'warning');
      return;
    }

    const chosenBike = allFleetBikes.find(b => b.id === Number(convertForm.bike_id));
    if (!chosenBike) {
      showToast('Please select a valid bike', 'warning');
      return;
    }

    setLoading(true);
    const readableId = `RD-M${Math.floor(100000 + Math.random() * 900000)}`;

    const reqStart = new Date(`${convertForm.pickup_date}T${convertForm.pickup_time}`).getTime();
    const reqEnd = new Date(`${convertForm.return_date}T${convertForm.return_time}`).getTime();

    // Verify slot collision with active confirmed bookings
    const { data: conflicts } = await supabase
      .from('bookings')
      .select('id, readable_id, pickup_date, pickup_time, return_date, return_time')
      .eq('bike_id', convertForm.bike_id)
      .in('status', ['booking_confirmed', 'ongoing']);

    const conflict = conflicts?.find(b => {
      const bStart = new Date(`${b.pickup_date}T${b.pickup_time || '10:00'}`).getTime();
      const bEnd = new Date(`${b.return_date}T${b.return_time || '20:00'}`).getTime();
      return reqStart < bEnd && reqEnd > bStart;
    });

    if (conflict) {
      showToast(`Conflict: Bike already has an active reservation (${conflict.readable_id}: ${conflict.pickup_date} ${conflict.pickup_time} - ${conflict.return_date})`, 'error');
      setLoading(false);
      return;
    }

    try {
      let aadhaar_url = '';
      let dl_url = '';
      let customer_photo_url = '';

      // Upload Aadhaar if present
      if (convertForm.aadhaar_image) {
        try {
          const fileExt = convertForm.aadhaar_image.name.split('.').pop();
          const fileName = `aadhaar_${readableId}_${Date.now()}.${fileExt}`;
          const filePath = `manual-docs/${fileName}`;
          const { error: uploadError } = await supabase.storage.from('booking-docs').upload(filePath, convertForm.aadhaar_image);
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('booking-docs').getPublicUrl(filePath);
            aadhaar_url = publicUrl;
          }
        } catch (uploadErr) {
          console.warn('Aadhaar upload skipped:', uploadErr);
        }
      }

      // Upload DL if present
      if (convertForm.dl_image) {
        try {
          const fileExt = convertForm.dl_image.name.split('.').pop();
          const fileName = `dl_${readableId}_${Date.now()}.${fileExt}`;
          const filePath = `manual-docs/${fileName}`;
          const { error: uploadError } = await supabase.storage.from('booking-docs').upload(filePath, convertForm.dl_image);
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('booking-docs').getPublicUrl(filePath);
            dl_url = publicUrl;
          }
        } catch (uploadErr) {
          console.warn('DL upload skipped:', uploadErr);
        }
      }

      // Upload Handover Photo if present
      if (convertForm.handover_image) {
        try {
          const fileExt = convertForm.handover_image.name.split('.').pop();
          const fileName = `handover_${readableId}_${Date.now()}.${fileExt}`;
          const filePath = `handover-photos/${fileName}`;
          const { error: uploadError } = await supabase.storage.from('booking-docs').upload(filePath, convertForm.handover_image);
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('booking-docs').getPublicUrl(filePath);
            customer_photo_url = publicUrl;
          }
        } catch (uploadErr) {
          console.warn('Handover photo upload skipped:', uploadErr);
        }
      }

      let combinedAddress = '';
      if (convertForm.pickup_method === 'home' && convertForm.drop_method === 'home') {
        if (convertForm.same_address_for_drop || convertForm.delivery_address.trim() === convertForm.return_pickup_address.trim()) {
          combinedAddress = `Delivery & Return: ${convertForm.delivery_address.trim()}`;
        } else {
          combinedAddress = `Delivery: ${convertForm.delivery_address.trim()} | Return Pickup: ${convertForm.return_pickup_address.trim()}`;
        }
      } else if (convertForm.pickup_method === 'home') {
        combinedAddress = `Delivery: ${convertForm.delivery_address.trim()}`;
      } else if (convertForm.drop_method === 'home') {
        combinedAddress = `Return Pickup: ${convertForm.return_pickup_address.trim()}`;
      }

      const diff = Number(convertForm.agreed_rent) - Number(convertForm.standard_rent);
      let adjustmentAmount = 0;
      let adjustmentReason = '';

      if (diff < 0) {
        adjustmentAmount = diff;
        adjustmentReason = `Negotiated discount: agreed rent ₹${convertForm.agreed_rent} (₹${Math.abs(diff)} discount on standard ₹${convertForm.standard_rent})`;
      } else if (diff > 0) {
        adjustmentAmount = diff;
        adjustmentReason = `Premium charge: agreed rent ₹${convertForm.agreed_rent} (₹${diff} premium over standard ₹${convertForm.standard_rent})`;
      }

      const combinedNotes = [
        convertForm.admin_notes.trim(),
        convertForm.payment_note ? `Payment: ${convertForm.payment_note.trim()}` : ''
      ].filter(Boolean).join(' | ');

      const bookingPayload: any = {
        readable_id: readableId,
        bike_id: chosenBike.id,
        customer_name: convertForm.customer_name.trim(),
        customer_phone: convertForm.customer_phone.trim(),
        customer_email: convertForm.customer_email.trim(),
        pickup_date: convertForm.pickup_date,
        pickup_time: convertForm.pickup_time,
        return_date: convertForm.return_date,
        return_time: convertForm.return_time,
        total_rent: Number(convertForm.standard_rent),
        adjustment_amount: adjustmentAmount,
        adjustment_reason: adjustmentReason || null,
        security_deposit: Number(convertForm.deposit_amount) || 0,
        advance_amount: Number(convertForm.advance_amount) || 0,
        payment_method: convertForm.payment_method,
        status: convertForm.ride_status || 'booking_confirmed',
        is_outstation: convertForm.is_outstation || false,
        needs_delivery: convertForm.pickup_method === 'home',
        needs_return_pickup: convertForm.drop_method === 'home',
        address: combinedAddress || null,
        aadhaar_number: convertForm.aadhaar_number.trim() || null,
        dl_number: convertForm.dl_number.trim() || null,
        aadhaar_url: aadhaar_url || null,
        dl_url: dl_url || null,
        customer_photo_url: customer_photo_url || null,
        start_odometer: Number(convertForm.start_odometer) || null,
        admin_notes: combinedNotes || `Converted from Lead (${convertingLead.id}): ${convertingLead.purpose}`
      };

      const { error: bookingErr } = await supabase.from('bookings').insert(bookingPayload);
      if (bookingErr) throw bookingErr;

      // GUARANTEED PROFILE: Create or update customer profile in public.profiles
      try {
        await ensureCustomerProfile({
          email: convertForm.customer_email.trim(),
          full_name: convertForm.customer_name.trim(),
          phone: convertForm.customer_phone.trim(),
          dl_number: convertForm.dl_number.trim() || null,
          aadhaar_number: convertForm.aadhaar_number.trim() || null,
          dl_url: dl_url || null,
          aadhaar_url: aadhaar_url || null
        });
      } catch (profileErr) {
        console.warn('Profile sync notice on lead conversion:', profileErr);
      }

      // Record follow-up comment on lead
      await addFollowUpComment(
        convertingLead.id,
        `Converted to confirmed booking #${readableId} (${chosenBike.name})`,
        undefined,
        'booked'
      );

      const updatedLead: Lead = {
        ...convertingLead,
        status: 'booked',
        converted_booking_id: readableId,
        converted_at: new Date().toISOString()
      };
      await saveLead(updatedLead);

      const updatedList = await fetchLeadsFromSupabase();
      setLeads(updatedList);
      setConvertingLead(null);
      showToast(`Success! Converted lead to booking ${readableId} with confirmed rider profile.`, 'success');

      // Navigate to bookings tab as requested
      if (onNavigateToBooking) {
        onNavigateToBooking(readableId);
      }

      // WhatsApp booking confirmation
      const phone = convertForm.customer_phone.replace(/\D/g, '');
      const cleanPhone = phone.length === 10 ? `91${phone}` : phone;
      const msg = `*RYDEIT - BOOKING RESERVATION CONFIRMED* 🏍️💨\n\n` +
        `Dear *${convertForm.customer_name}*,\n\n` +
        `Your reservation has been created for *${chosenBike.name}*!\n` +
        `• *Booking Ref:* ${readableId}\n` +
        `• *Pickup:* ${convertForm.pickup_date} @ ${convertForm.pickup_time}\n` +
        `• *Return:* ${convertForm.return_date} @ ${convertForm.return_time}\n` +
        `• *Agreed Total Rent:* ₹${convertForm.agreed_rent}\n` +
        `• *Advance Received:* ₹${convertForm.advance_amount}\n` +
        `• *Rider Email:* ${convertForm.customer_email}\n\n` +
        `You can log in to view your booking at https://rydeit.in using your Email or Phone with your mobile number as initial password.\n\n` +
        `Team Rydeit Kolkata`;

      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');

    } catch (err: any) {
      showToast(err.message || 'Failed to convert lead to booking', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Export Leads to CSV
  const handleExportCSV = () => {
    if (leads.length === 0) {
      showToast('No leads to export', 'info');
      return;
    }
    const headers = ['ID', 'Date', 'Customer Name', 'Phone', 'Source', 'Preference', 'Vehicle', 'Pickup Date', 'Return Date', 'Days', 'Purpose', 'Status', 'Follow-up Date', 'Comments Count', 'Notes', 'Converted Booking ID'];
    const rows = leads.map(l => [
      l.id,
      l.created_at.split('T')[0],
      `"${l.customer_name.replace(/"/g, '""')}"`,
      l.customer_phone,
      l.source,
      l.vehicle_preference,
      `"${(l.specific_vehicle_name || '').replace(/"/g, '""')}"`,
      l.pickup_date,
      l.return_date,
      l.rental_duration_days,
      `"${(l.purpose || '').replace(/"/g, '""')}"`,
      l.status,
      l.follow_up_date || '',
      l.follow_up_comments?.length || 0,
      `"${(l.notes || '').replace(/"/g, '""')}"`,
      l.converted_booking_id || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rydeit_leads_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Leads CSV exported successfully', 'success');
  };

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Compute urgent immediate follow-ups (need_follow_up and date <= today or unset)
  const immediateFollowUps = useMemo(() => {
    return leads.filter(l => l.status === 'need_follow_up' && (!l.follow_up_date || l.follow_up_date <= todayStr));
  }, [leads, todayStr]);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    const list = leads.filter(lead => {
      if (statusFilter !== 'all') {
        if (statusFilter === 'immediate_follow_up') {
          return lead.status === 'need_follow_up' && (!lead.follow_up_date || lead.follow_up_date <= todayStr);
        }
        if (statusFilter === 'follow_up' && lead.status !== 'need_follow_up') return false;
        if (statusFilter === 'booked' && lead.status !== 'booked') return false;
        if (statusFilter === 'contacted' && lead.status !== 'contacted') return false;
        if (statusFilter === 'lost' && !['not_interested', 'lost_to_availability', 'lost_to_price', 'postponed'].includes(lead.status)) return false;
      }

      if (categoryFilter !== 'all' && lead.vehicle_preference !== categoryFilter) return false;
      if (sourceFilter !== 'all' && lead.source !== sourceFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = lead.customer_name.toLowerCase().includes(q);
        const matchesPhone = lead.customer_phone.includes(q);
        const matchesBike = (lead.specific_vehicle_name || '').toLowerCase().includes(q);
        const matchesPurpose = lead.purpose.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesBike && !matchesPurpose) return false;
      }

      return true;
    });

    // When viewing follow-ups, sort immediate/overdue follow-ups to the top
    if (statusFilter === 'follow_up' || statusFilter === 'immediate_follow_up') {
      return [...list].sort((a, b) => {
        const aIsImmediate = !a.follow_up_date || a.follow_up_date <= todayStr;
        const bIsImmediate = !b.follow_up_date || b.follow_up_date <= todayStr;
        if (aIsImmediate && !bIsImmediate) return -1;
        if (!aIsImmediate && bIsImmediate) return 1;
        const aDate = a.follow_up_date || '9999-99-99';
        const bDate = b.follow_up_date || '9999-99-99';
        return aDate.localeCompare(bDate);
      });
    }

    return list;
  }, [leads, statusFilter, categoryFilter, sourceFilter, searchQuery, todayStr]);

  return (
    <div className="space-y-6 animate-fade-in p-2 sm:p-4 text-slate-800">
      
      {/* Top Banner & Fast Action Bar */}
      <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
            Inquiry & Leads Manager
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Download CSV"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span>Log Lead</span>
          </button>
        </div>
      </div>

      {/* IMMEDIATE FOLLOW-UP ALERT BANNER (Highlight urgent leads) */}
      {immediateFollowUps.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center shrink-0">
              <span className="text-lg">⚡</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-amber-950 text-sm">
                  {immediateFollowUps.length} {immediateFollowUps.length === 1 ? 'Inquiry Needs' : 'Inquiries Need'} Immediate Follow-Up
                </h4>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                These leads are scheduled for today or past due. Contact them promptly to convert into bookings.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'immediate_follow_up' ? 'follow_up' : 'immediate_follow_up')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
                statusFilter === 'immediate_follow_up'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white text-amber-900 border border-amber-300 hover:bg-amber-100'
              }`}
            >
              {statusFilter === 'immediate_follow_up' ? 'Show All Follow-Ups' : 'View Immediate Only'}
            </button>
          </div>
        </div>
      )}

      {/* Market Demand & Insights Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Total Inquiries */}
        <div className="bg-white border border-slate-200 p-3.5 rounded-2xl flex flex-col justify-between shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Leads</span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{analytics.totalLeads}</span>
          </div>
        </div>

        {/* Needs Follow-up (Default Tab Indicator) */}
        <div 
          onClick={() => setStatusFilter('follow_up')}
          className={`border p-3.5 rounded-2xl flex flex-col justify-between cursor-pointer transition-all shadow-sm ${
            statusFilter === 'follow_up' || statusFilter === 'immediate_follow_up'
              ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/30' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">Follow-Up (Active)</span>
            {analytics.needFollowUpCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
            )}
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-900">{analytics.needFollowUpCount}</span>
            {immediateFollowUps.length > 0 && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                {immediateFollowUps.length} due now
              </span>
            )}
          </div>
        </div>

        {/* Converted Bookings */}
        <div 
          onClick={() => setStatusFilter('booked')}
          className={`border p-3.5 rounded-2xl flex flex-col justify-between cursor-pointer transition-all shadow-sm ${
            statusFilter === 'booked'
              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/30' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">Booked</span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-900">{analytics.bookedCount}</span>
            {analytics.bookedCount > 0 && (
              <span className="text-[10px] font-bold text-emerald-700">{analytics.conversionRate}%</span>
            )}
          </div>
        </div>

        {/* Lost to Availability */}
        <div className="bg-white border border-slate-200 p-3.5 rounded-2xl flex flex-col justify-between shadow-sm">
          <span className="text-[10px] uppercase font-bold text-rose-700 tracking-wider">Lost</span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-black text-rose-900">{analytics.lostDemand.availability}</span>
          </div>
        </div>

        {/* Top Channel */}
        <div className="bg-white border border-slate-200 p-3.5 rounded-2xl flex flex-col justify-between col-span-2 md:col-span-1 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Channels</span>
          <div className="mt-1.5 flex items-baseline justify-between text-xs">
            <span className="text-slate-800 font-medium">WA: <strong className="text-emerald-700">{analytics.sourceBreakdown.whatsapp}</strong></span>
            <span className="text-slate-500">Calls: <strong className="text-slate-800">{analytics.sourceBreakdown.call}</strong></span>
          </div>
        </div>
      </div>

      {/* Market Demand Breakdown Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Demand Share
          </span>
          <div className="flex items-center gap-3 text-xs font-semibold flex-wrap">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2 h-2 rounded-sm bg-orange-500"></span>
              Scooty: <strong className="text-slate-900">{analytics.categoryPercentages.scooty}%</strong>
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2 h-2 rounded-sm bg-sky-500"></span>
              Bullet: <strong className="text-slate-900">{analytics.categoryPercentages.bullet}%</strong>
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2 h-2 rounded-sm bg-emerald-500"></span>
              Sports: <strong className="text-slate-900">{analytics.categoryPercentages.sports}%</strong>
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2 h-2 rounded-sm bg-slate-400"></span>
              Commuter: <strong className="text-slate-900">{analytics.categoryPercentages.bike}%</strong>
            </span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
          <div style={{ width: `${analytics.categoryPercentages.scooty}%` }} className="bg-orange-500 h-full transition-all" title={`Scooty: ${analytics.categoryPercentages.scooty}%`} />
          <div style={{ width: `${analytics.categoryPercentages.bullet}%` }} className="bg-sky-500 h-full transition-all" title={`Bullet: ${analytics.categoryPercentages.bullet}%`} />
          <div style={{ width: `${analytics.categoryPercentages.sports}%` }} className="bg-emerald-500 h-full transition-all" title={`Sports: ${analytics.categoryPercentages.sports}%`} />
          <div style={{ width: `${analytics.categoryPercentages.bike}%` }} className="bg-slate-400 h-full transition-all" title={`Commuter: ${analytics.categoryPercentages.bike}%`} />
        </div>
      </div>

      {/* Filter & Search Segmented Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-sm">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: 'follow_up', label: `Follow-Up (${analytics.needFollowUpCount})` },
            ...(immediateFollowUps.length > 0 ? [{ id: 'immediate_follow_up', label: `⚡ Due Now (${immediateFollowUps.length})` }] : []),
            { id: 'all', label: `All (${leads.length})` },
            { id: 'booked', label: `Booked (${analytics.bookedCount})` },
            { id: 'contacted', label: 'Contacted' },
            { id: 'lost', label: 'Lost' }
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === f.id
                  ? 'bg-slate-900 text-white font-bold shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Category & Channel Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-white border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-1.5 font-medium focus:border-orange-500 focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="scooty">Scooty</option>
            <option value="bullet">Bullet</option>
            <option value="bike">Commuter</option>
            <option value="sports">Sports</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-white border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-1.5 font-medium focus:border-orange-500 focus:outline-none"
          >
            <option value="all">All Channels</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="call">Phone Call</option>
            <option value="walk_in">Walk-in</option>
            <option value="instagram">Instagram</option>
          </select>

          <div className="relative flex-grow min-w-[180px]">
            <input
              type="text"
              placeholder="Search name, phone, bike..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE-RESPONSIVE CARD VIEW (visible on small screens < md) */}
      <div className="md:hidden space-y-3">
        {filteredLeads.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 shadow-sm">
            <p className="font-bold text-slate-900">No inquiries found</p>
            <p className="text-xs text-slate-500 mt-1">Try resetting filters or click Log Lead.</p>
          </div>
        ) : (
          filteredLeads.map(lead => {
            const isBooked = lead.status === 'booked';
            const commentsCount = lead.follow_up_comments?.length || 0;
            const latestComment = lead.follow_up_comments && lead.follow_up_comments.length > 0 
              ? lead.follow_up_comments[0] 
              : null;
            const isOverdue = lead.follow_up_date && lead.follow_up_date < todayStr;
            const isToday = lead.follow_up_date === todayStr;

            return (
              <div key={lead.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm text-slate-800">
                {/* Header: Name, Phone & Source */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-900 text-sm truncate">{lead.customer_name}</h4>
                      <span className="text-[10px] text-slate-600 uppercase px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono shrink-0">
                        {lead.source}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-600 mt-1">
                      <a href={`tel:${lead.customer_phone}`} className="hover:text-sky-600 font-mono flex items-center gap-1 font-semibold">
                        <svg className="w-3.5 h-3.5 text-sky-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span>{lead.customer_phone}</span>
                      </a>
                    </div>
                  </div>

                  {/* Status Dropdown */}
                  <select
                    value={lead.status}
                    onChange={(e) => handleQuickStatusChange(lead.id, e.target.value as LeadStatus)}
                    className={`text-xs font-bold rounded-lg px-2.5 py-1.5 border transition-all cursor-pointer focus:outline-none shrink-0 ${
                      lead.status === 'booked' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' :
                      lead.status === 'need_follow_up' ? 'bg-amber-50 border-amber-300 text-amber-900' :
                      lead.status === 'contacted' ? 'bg-sky-50 border-sky-300 text-sky-800' :
                      lead.status === 'lost_to_availability' ? 'bg-rose-50 border-rose-300 text-rose-800' :
                      'bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <option value="need_follow_up">Need Follow-Up</option>
                    <option value="contacted">Contacted</option>
                    <option value="booked">Booked ✓</option>
                    <option value="not_interested">Not Interested</option>
                    <option value="lost_to_availability">Lost: Unavailable</option>
                    <option value="lost_to_price">Lost: Price High</option>
                    <option value="postponed">Postponed</option>
                  </select>
                </div>

                {/* Machine Preference & Dates */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Vehicle</span>
                    {lead.requested_vehicles && lead.requested_vehicles.length > 1 ? (
                      <div>
                        <span className="font-bold text-slate-900 block truncate">
                          {lead.requested_vehicles.length} Bikes
                        </span>
                        <div className="text-[10px] text-slate-600 truncate mt-0.5">
                          {lead.requested_vehicles.map(v => v.specific_vehicle_name || v.preference).join(', ')}
                        </div>
                      </div>
                    ) : (
                      <span className="font-bold text-slate-900 truncate block">
                        {lead.specific_vehicle_name || lead.vehicle_preference.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Dates</span>
                    <span className="font-bold text-slate-900 block">
                      {lead.pickup_date} ({lead.rental_duration_days}D)
                    </span>
                  </div>
                </div>

                {/* Follow-Up Details & Date Bar (Clickable to edit details) */}
                {lead.status === 'need_follow_up' && (
                  <div className="bg-amber-50 border border-amber-300 rounded-xl p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px]">
                        {isOverdue ? (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-100 border border-rose-300 px-1.5 py-0.5 rounded">
                            ⚠️ Overdue
                          </span>
                        ) : isToday ? (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded">
                            ⚡ Today
                          </span>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                        )}
                        <span>Follow-Up: {lead.follow_up_date || 'Date Not Set'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenScheduleFollowUpModal(lead)}
                        className="text-[10px] font-bold text-amber-900 hover:text-amber-950 px-2 py-0.5 rounded bg-amber-200/70 hover:bg-amber-200 border border-amber-300 transition-all cursor-pointer"
                        title="Edit follow-up schedule and details"
                      >
                        ✎ Details
                      </button>
                    </div>
                    {lead.notes && (
                      <p className="text-[11px] text-slate-700 italic line-clamp-1">
                        "{lead.notes}"
                      </p>
                    )}
                  </div>
                )}

                {/* Latest Follow-Up Comment Snippet (if followed up later) */}
                {latestComment && (
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] space-y-0.5">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                      <span className="flex items-center gap-1 text-sky-700">
                        <span>💬</span> Latest Note
                      </span>
                      <span>{new Date(latestComment.timestamp).toLocaleDateString()}</span>
                    </div>
                    <p className="text-slate-800 line-clamp-2">
                      {latestComment.comment}
                    </p>
                  </div>
                )}

                {/* Mobile Action Buttons Bar */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    {/* Call Customer */}
                    <a
                      href={`tel:${lead.customer_phone}`}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-sky-700 border border-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Call customer"
                    >
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>Call</span>
                    </a>

                    {/* WhatsApp */}
                    <a
                      href={getWhatsAppFollowUpUrl(lead)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="WhatsApp customer"
                    >
                      <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.882-4.434 9.885-9.885.002-2.641-1.026-5.124-2.893-6.992-1.867-1.868-4.35-2.896-6.992-2.897-5.451 0-9.885 4.434-9.887 9.884-.001 2.126.602 3.738 1.611 5.421l-.999 3.646 3.883-.769zm10.875-6.193c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                      </svg>
                      <span>Chat</span>
                    </a>

                    {/* Edit Lead Info */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(lead)}
                      className="p-1.5 rounded-xl bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 text-xs transition-colors"
                      title="Edit inquiry details"
                    >
                      ✎
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Add Comment / View History */}
                    <button
                      type="button"
                      onClick={() => handleOpenFollowUpCommentsModal(lead)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs text-sky-800 font-semibold flex items-center gap-1 transition-colors"
                      title="Log follow-up discussion & comments"
                    >
                      <span>💬</span>
                      <span>{commentsCount > 0 ? `${commentsCount} Logged` : '+ Comment'}</span>
                    </button>

                    {/* Convert to Booking */}
                    {!isBooked ? (
                      <button
                        type="button"
                        onClick={() => handleOpenConvertModal(lead)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-sm"
                      >
                        Convert →
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-300">
                        ✓ Booked
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DESKTOP LEADS TABLE (Hidden on small screens) */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 text-[10px] uppercase font-bold tracking-wider">
              <tr>
                <th className="px-5 py-4">Customer & Channel</th>
                <th className="px-5 py-4">Vehicle Preference</th>
                <th className="px-5 py-4">Dates & Duration</th>
                <th className="px-5 py-4">Purpose</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Follow-Up & Comments</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-neutral-500">
                    <div className="max-w-xs mx-auto space-y-2">
                      <p className="font-semibold text-neutral-400">No inquiry records found</p>
                      <p className="text-[11px] text-neutral-500">
                        {searchQuery || statusFilter !== 'all' 
                          ? 'Try resetting your search filters.' 
                          : 'Click "+ Log New Inquiry" to log calls or WhatsApp inquiries.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLeads.map(lead => {
                  const isBooked = lead.status === 'booked';
                  const commentsCount = lead.follow_up_comments?.length || 0;

                  return (
                    <tr key={lead.id} className="hover:bg-neutral-900/40 transition-colors">
                      {/* Customer & Channel */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{lead.customer_name}</span>
                          <span className="text-[10px] text-neutral-500 uppercase px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 font-mono">
                            {lead.source}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-neutral-400 mt-1">
                          <a 
                            href={`tel:${lead.customer_phone}`}
                            className="hover:text-sky-400 font-mono text-xs flex items-center gap-1"
                            title="Call customer"
                          >
                            <svg className="w-3 h-3 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span>{lead.customer_phone}</span>
                          </a>
                        </div>
                      </td>

                      {/* Vehicle Preference */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-white">
                          {lead.vehicle_preference === 'scooty' && <span>Scooty</span>}
                          {lead.vehicle_preference === 'bullet' && <span className="text-sky-400">Bullet</span>}
                          {lead.vehicle_preference === 'sports' && <span className="text-emerald-400">Sports</span>}
                          {lead.vehicle_preference === 'bike' && <span>Commuter Bike</span>}
                          {lead.vehicle_preference === 'flexible' && <span className="text-neutral-400">Flexible</span>}
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-0.5">
                          {lead.specific_vehicle_name || 'Any model in category'}
                        </div>
                      </td>

                      {/* Dates & Duration */}
                      <td className="px-5 py-4">
                        <div className="text-neutral-200 font-medium">{lead.pickup_date}</div>
                        <div className="text-neutral-400 text-[11px] mt-0.5">
                          to {lead.return_date} ({lead.rental_duration_days} Day{lead.rental_duration_days > 1 ? 's' : ''})
                        </div>
                      </td>

                      {/* Purpose */}
                      <td className="px-5 py-4">
                        <span className="text-neutral-300 font-medium block">{lead.purpose}</span>
                        {lead.budget_expectation && (
                          <span className="text-[10px] text-neutral-500 block mt-0.5">{lead.budget_expectation}</span>
                        )}
                      </td>

                      {/* Status Dropdown */}
                      <td className="px-5 py-4">
                        <select
                          value={lead.status}
                          onChange={(e) => handleQuickStatusChange(lead.id, e.target.value as LeadStatus)}
                          className={`text-xs font-bold rounded-lg px-2.5 py-1.5 border transition-all cursor-pointer focus:outline-none ${
                            lead.status === 'booked' 
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' :
                            lead.status === 'need_follow_up' 
                              ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' :
                            lead.status === 'contacted' 
                              ? 'bg-sky-500/15 border-sky-500/30 text-sky-300' :
                            lead.status === 'lost_to_availability'
                              ? 'bg-rose-500/15 border-rose-500/30 text-rose-300' :
                              'bg-neutral-900 border-neutral-800 text-neutral-400'
                          }`}
                        >
                          <option value="need_follow_up">Need Follow-Up</option>
                          <option value="contacted">Contacted</option>
                          <option value="booked">Booked ✓</option>
                          <option value="not_interested">Not Interested</option>
                          <option value="lost_to_availability">Lost: Bike Unavailable</option>
                          <option value="lost_to_price">Lost: Price High</option>
                          <option value="postponed">Postponed</option>
                        </select>
                      </td>

                      {/* Follow-up & Comments History */}
                      <td className="px-5 py-4 max-w-xs">
                        {lead.status === 'need_follow_up' ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                              <span className="text-amber-400 font-bold text-xs">
                                Follow-Up: {lead.follow_up_date || 'Date not set'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenScheduleFollowUpModal(lead)}
                                className="text-[10px] text-amber-300 hover:text-white px-1.5 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/30 transition-all cursor-pointer"
                                title="Edit follow-up schedule and details"
                              >
                                ✎ Details
                              </button>
                            </div>
                            {lead.notes && (
                              <p className="text-neutral-300 text-xs italic truncate" title={lead.notes}>
                                "{lead.notes}"
                              </p>
                            )}
                          </div>
                        ) : lead.follow_up_date && !isBooked ? (
                          <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-[11px]">
                            <span>Follow-Up: {lead.follow_up_date}</span>
                          </div>
                        ) : (
                          <p className="text-neutral-400 text-xs truncate" title={lead.notes}>
                            {lead.notes || <span className="text-neutral-600 italic">No notes</span>}
                          </p>
                        )}

                        {/* Latest follow-up comment snippet if logged */}
                        {lead.follow_up_comments && lead.follow_up_comments.length > 0 && (
                          <p className="text-neutral-300 text-[11px] truncate mt-1 flex items-center gap-1">
                            <span className="text-sky-400">💬</span>
                            <span className="italic truncate">"{lead.follow_up_comments[0].comment}"</span>
                          </p>
                        )}
                        
                        {/* Comments button with counter */}
                        <div className="mt-1.5 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenFollowUpCommentsModal(lead)}
                            className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 cursor-pointer bg-neutral-900/80 hover:bg-neutral-800 px-2 py-0.5 rounded-lg border border-neutral-800 transition-colors"
                          >
                            <span>💬</span>
                            <span>{commentsCount > 0 ? `${commentsCount} Comment${commentsCount > 1 ? 's' : ''}` : '+ Add Comment'}</span>
                          </button>
                          {lead.converted_booking_id && (
                            <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                              · Ref: {lead.converted_booking_id}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          {/* Convert to Booking Button */}
                          {!isBooked ? (
                            <button
                              type="button"
                              onClick={() => handleOpenConvertModal(lead)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-all flex items-center gap-1 cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
                              title="Convert this lead to a confirmed booking slot"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                              <span>Convert to Booking</span>
                            </button>
                          ) : (
                            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                              ✓ Booked
                            </span>
                          )}

                          {/* Follow-Up / Comments Log Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenFollowUpCommentsModal(lead)}
                            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-all cursor-pointer"
                            title="Add follow-up notes & view comment history"
                          >
                            <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </button>

                          {/* WhatsApp Follow-up */}
                          <a
                            href={getWhatsAppFollowUpUrl(lead)}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-black border border-emerald-500/30 transition-all cursor-pointer"
                            title="Send WhatsApp follow-up message"
                          >
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.882-4.434 9.885-9.885.002-2.641-1.026-5.124-2.893-6.992-1.867-1.868-4.35-2.896-6.992-2.897-5.451 0-9.885 4.434-9.887 9.884-.001 2.126.602 3.738 1.611 5.421l-.999 3.646 3.883-.769zm10.875-6.193c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                            </svg>
                          </a>

                          {/* Direct Call */}
                          <a
                            href={`tel:${lead.customer_phone}`}
                            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-all cursor-pointer"
                            title="Call customer"
                          >
                            <svg className="w-3.5 h-3.5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </a>

                          {/* Edit Lead */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(lead)}
                            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-all cursor-pointer"
                            title="Edit details"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteLead(lead)}
                            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-rose-500/20 text-neutral-500 hover:text-rose-400 border border-neutral-800 transition-all cursor-pointer"
                            title="Delete record"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PROMPT MODAL: SCHEDULE FOLLOW-UP DATE & DETAILS */}
      {schedulePromptLead && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#0a0a0a] border border-neutral-800 w-full max-w-lg rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl animate-fade-in my-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0"></span>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Follow-Up Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSchedulePromptLead(null)}
                className="text-neutral-400 hover:text-white p-1.5 rounded-xl bg-neutral-900 border border-neutral-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Customer Summary */}
            <div className="bg-neutral-950 p-3 rounded-2xl border border-neutral-800/80 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-white">{schedulePromptLead.customer_name}</span>
                <div className="text-neutral-400 font-mono text-[11px] mt-0.5">{schedulePromptLead.customer_phone}</div>
              </div>
              <div className="text-right">
                <span className="text-amber-400 font-semibold">{schedulePromptLead.specific_vehicle_name || schedulePromptLead.vehicle_preference.toUpperCase()}</span>
                <div className="text-neutral-500 text-[10px] mt-0.5">
                  {schedulePromptLead.pickup_date} ({schedulePromptLead.rental_duration_days}D)
                </div>
              </div>
            </div>

            <form onSubmit={handleConfirmScheduleFollowUp} className="space-y-3.5">
              <div>
                <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                  Follow-Up Date *
                </label>
                <input
                  type="date"
                  required
                  value={promptFollowUpDate}
                  onChange={(e) => setPromptFollowUpDate(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Date Shortcuts */}
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { label: 'Today', days: 0 },
                    { label: 'Tomorrow', days: 1 },
                    { label: '+2 Days', days: 2 },
                    { label: '+7 Days', days: 7 }
                  ].map(sc => (
                    <button
                      key={sc.label}
                      type="button"
                      onClick={() => {
                        const targetDate = new Date(Date.now() + sc.days * 86400000).toISOString().split('T')[0];
                        setPromptFollowUpDate(targetDate);
                      }}
                      className="px-2 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[10px] text-neutral-300 hover:text-white transition-all cursor-pointer"
                    >
                      {sc.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Follow-up Note */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-neutral-400 block">
                  Notes
                </label>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    'Call evening',
                    'Waiting confirmation',
                    'Advance tonight',
                    'Discount offered',
                    'Sent photos',
                    'Sent WhatsApp'
                  ].map(chip => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setPromptFollowUpNote(prev => prev ? `${prev} · ${chip}` : chip)}
                      className="px-2 py-0.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[10px] text-neutral-300 hover:text-white transition-all cursor-pointer"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={2}
                  placeholder="Notes..."
                  value={promptFollowUpNote}
                  onChange={(e) => setPromptFollowUpNote(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white placeholder-neutral-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setSchedulePromptLead(null)}
                  className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Save Follow-Up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FOLLOW-UP COMMENTS & HISTORY MODAL (When followed up later) */}
      {followUpModalLead && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0a0a0a] border border-neutral-800 w-full max-w-xl rounded-3xl p-6 sm:p-7 space-y-6 shadow-2xl animate-fade-in my-8 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-neutral-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
                  <h3 className="text-lg font-heading tracking-wide uppercase text-white">
                    Follow-Up Log & Comments
                  </h3>
                </div>
                <div className="text-xs text-neutral-400 mt-1 flex items-center gap-2">
                  <span className="font-semibold text-white">{followUpModalLead.customer_name}</span>
                  <span>·</span>
                  <a href={`tel:${followUpModalLead.customer_phone}`} className="text-sky-400 hover:underline">
                    {followUpModalLead.customer_phone}
                  </a>
                  <span>·</span>
                  <span className="text-neutral-500">{followUpModalLead.specific_vehicle_name || followUpModalLead.vehicle_preference}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFollowUpModalLead(null)}
                className="text-neutral-400 hover:text-white p-2 rounded-xl bg-neutral-900 border border-neutral-800"
              >
                ✕
              </button>
            </div>

            {/* Quick Contact Bar */}
            <div className="bg-black p-3.5 rounded-2xl border border-neutral-800 flex items-center justify-between">
              <span className="text-xs text-neutral-400">Direct Actions:</span>
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${followUpModalLead.customer_phone}`}
                  className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-sky-400 border border-neutral-800 text-xs font-semibold flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>Call Now</span>
                </a>
                <a
                  href={getWhatsAppFollowUpUrl(followUpModalLead)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500 hover:text-black text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.882-4.434 9.885-9.885.002-2.641-1.026-5.124-2.893-6.992-1.867-1.868-4.35-2.896-6.992-2.897-5.451 0-9.885 4.434-9.887 9.884-.001 2.126.602 3.738 1.611 5.421l-.999 3.646 3.883-.769zm10.875-6.193c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  </svg>
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Log New Comment Form */}
            <form onSubmit={handleSaveFollowUpComment} className="space-y-3 bg-black/60 p-3.5 rounded-2xl border border-neutral-800">
              <label className="text-[10px] uppercase font-bold text-white block">
                Add Comment *
              </label>

              {/* Quick Comment Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  'Spoke on call',
                  'Confirmed booking',
                  'Checking friends',
                  '₹100 discount',
                  'Sent photos',
                  'Not answered',
                  'Postponed'
                ].map(chip => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setNewCommentText(prev => prev ? `${prev} · ${chip}` : chip)}
                    className="px-2 py-0.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[10px] text-neutral-300 hover:text-white transition-all cursor-pointer"
                  >
                    + {chip}
                  </button>
                ))}
              </div>

              <textarea
                rows={2}
                required
                placeholder="Enter details of what was discussed, customer reaction, or next steps..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs text-white placeholder-neutral-500 focus:border-sky-500 focus:outline-none"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[10px] text-neutral-400 block mb-1 font-semibold uppercase">
                    Status After Follow-Up
                  </label>
                  <select
                    value={statusAfterComment}
                    onChange={(e) => setStatusAfterComment(e.target.value as LeadStatus)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
                  >
                    <option value="need_follow_up">Need Follow-Up</option>
                    <option value="contacted">Contacted</option>
                    <option value="booked">Booked</option>
                    <option value="postponed">Postponed</option>
                    <option value="not_interested">Not Interested</option>
                  </select>
                </div>

                {statusAfterComment === 'need_follow_up' && (
                  <div>
                    <label className="text-[10px] text-neutral-400 block mb-1 font-semibold uppercase">
                      Next Follow-Up Date
                    </label>
                    <input
                      type="date"
                      value={nextFollowUpDate}
                      onChange={(e) => setNextFollowUpDate(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
                >
                  Save Comment
                </button>
              </div>
            </form>

            {/* Comment History & Timeline */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Follow-Up History & Notes ({followUpModalLead.follow_up_comments?.length || 0})
              </h4>

              {(!followUpModalLead.follow_up_comments || followUpModalLead.follow_up_comments.length === 0) ? (
                <div className="bg-black p-4 rounded-xl border border-neutral-800 text-center text-xs text-neutral-500">
                  No comments logged yet. Use the form above to record your conversation details.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {followUpModalLead.follow_up_comments.map((comm, idx) => (
                    <div key={comm.id || idx} className="bg-black p-3 rounded-xl border border-neutral-800 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-neutral-500">
                        <span>{new Date(comm.timestamp).toLocaleString()}</span>
                        {comm.status_after && (
                          <span className="uppercase font-semibold text-neutral-400">
                            Status: {comm.status_after.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                      <p className="text-neutral-200 font-medium leading-relaxed">{comm.comment}</p>
                      {comm.next_follow_up_date && (
                        <span className="text-[10px] text-amber-400 font-semibold block">
                          Next scheduled: {comm.next_follow_up_date}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* FAST DATA ENTRY MODAL (MINIMAL TYPING, MOSTLY DROPDOWNS & CHIPS) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0a0a0a] border border-neutral-800 w-full max-w-2xl rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl animate-fade-in my-8 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3.5">
              <h3 className="text-base font-bold uppercase tracking-wider text-white">
                {editingLead ? 'Edit Lead' : 'Log Lead'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-neutral-400 hover:text-white p-2 rounded-xl bg-neutral-900 border border-neutral-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLead} className="space-y-4">
              
              {/* Channel & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                    Channel *
                  </label>
                  <select
                    value={leadForm.source}
                    onChange={(e) => setLeadForm(prev => ({ ...prev, source: e.target.value as LeadSource }))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="call">Call</option>
                    <option value="walk_in">Walk-in</option>
                    <option value="instagram">Instagram</option>
                    <option value="website">Website</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Customer Name"
                    value={leadForm.customer_name}
                    onChange={(e) => setLeadForm(prev => ({ ...prev, customer_name: e.target.value }))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit number"
                    value={leadForm.customer_phone}
                    onChange={(e) => setLeadForm(prev => ({ ...prev, customer_phone: e.target.value.replace(/\D/g, '') }))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Multi-Bike Selector & Preferences (Support any number of bikes with preference for each) */}
              <div className="space-y-3 bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs uppercase font-bold text-slate-800 flex items-center gap-2">
                      <span>🏍️ Bikes Requested ({leadForm.requested_vehicles?.length || 1})</span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Select any number of bikes and specify preferences (Scooty, Bullet, Bike, Sports, Flexible)
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddBike}
                    className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer active:scale-95"
                  >
                    <span>+ Add Another Bike</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {(leadForm.requested_vehicles && leadForm.requested_vehicles.length > 0 
                    ? leadForm.requested_vehicles 
                    : [{ preference: leadForm.vehicle_preference, specific_vehicle_id: leadForm.specific_vehicle_id }]
                  ).map((veh, idx) => {
                    const availableForThisBike = getBikesForPreference(veh.preference);
                    return (
                      <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md">
                            Bike #{idx + 1} Preference
                          </span>
                          {(leadForm.requested_vehicles?.length || 1) > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveBike(idx)}
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-semibold px-2 py-0.5 rounded-md transition-all cursor-pointer"
                              title="Remove this bike"
                            >
                              ✕ Remove
                            </button>
                          )}
                        </div>

                        {/* Category Buttons for this bike */}
                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-600 block mb-1">
                            Preference / Type *
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                            {[
                              { id: 'scooty', label: 'Scooty' },
                              { id: 'bullet', label: 'Bullet' },
                              { id: 'bike', label: 'Bike' },
                              { id: 'sports', label: 'Sports' },
                              { id: 'flexible', label: 'Flexible' }
                            ].map(cat => (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => handleUpdateBikePreference(idx, cat.id as LeadVehiclePreference)}
                                className={`py-1.5 px-2 rounded-lg text-center border text-xs font-bold transition-all cursor-pointer ${
                                  veh.preference === cat.id
                                    ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-xs ring-1 ring-orange-400/40'
                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                              >
                                {cat.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Specific Vehicle Model Dropdown for this bike */}
                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-600 block mb-1">
                            Specific Machine (Optional)
                          </label>
                          <select
                            value={veh.specific_vehicle_id || ''}
                            onChange={(e) => handleUpdateBikeSpecificVehicle(idx, e.target.value ? Number(e.target.value) : null)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:border-orange-500 focus:outline-none"
                          >
                            <option value="">Any {veh.preference} (Flexible model)</option>
                            {availableForThisBike.map(b => (
                              <option key={b.id} value={b.id}>
                                {b.name} — ₹{b.dailyRate}/day {b.rc_number ? `(${b.rc_number})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Multi-bike summary badge */}
                {(leadForm.requested_vehicles?.length || 1) > 1 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-2.5 text-xs text-orange-900 flex items-center justify-between">
                    <span className="font-semibold">
                      Total {leadForm.requested_vehicles?.length} bikes selected for this inquiry
                    </span>
                    <button
                      type="button"
                      onClick={handleAddBike}
                      className="text-orange-700 font-bold hover:underline text-xs cursor-pointer"
                    >
                      + Add another
                    </button>
                  </div>
                )}
              </div>

              {/* Dates & Duration */}
              <div className="space-y-2 bg-black p-3.5 rounded-2xl border border-neutral-800">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block">
                    Dates *
                  </label>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <button type="button" onClick={() => applyDatePreset('today')} className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300">Today</button>
                    <button type="button" onClick={() => applyDatePreset('tomorrow')} className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300">Tomorrow</button>
                    <button type="button" onClick={() => applyDatePreset('weekend')} className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300">Weekend</button>
                    <button type="button" onClick={() => applyDatePreset('nextWeek')} className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300">+7D</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[10px] text-neutral-500 block mb-1">Pickup</label>
                    <input
                      type="date"
                      required
                      value={leadForm.pickup_date}
                      onChange={(e) => {
                        const newStart = e.target.value;
                        const days = leadForm.rental_duration_days || 1;
                        const end = new Date(new Date(newStart).getTime() + days * 86400000).toISOString().split('T')[0];
                        setLeadForm(prev => ({ ...prev, pickup_date: newStart, return_date: end }));
                      }}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-neutral-500 block mb-1">Return</label>
                    <input
                      type="date"
                      required
                      value={leadForm.return_date}
                      onChange={(e) => {
                        const newEnd = e.target.value;
                        const start = new Date(leadForm.pickup_date).getTime();
                        const end = new Date(newEnd).getTime();
                        const days = Math.max(1, Math.round((end - start) / 86400000));
                        setLeadForm(prev => ({ ...prev, return_date: newEnd, rental_duration_days: days }));
                      }}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-neutral-500 block mb-1">Days</label>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 7].map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => applyDurationPreset(d)}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                            leadForm.rental_duration_days === d
                              ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          {d}D
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Purpose & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                    Purpose *
                  </label>
                  <select
                    value={leadForm.purpose}
                    onChange={(e) => setLeadForm(prev => ({ ...prev, purpose: e.target.value as RentalPurpose }))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                  >
                    <option value="Weekend Trip / Outing">Weekend Trip</option>
                    <option value="Daily Commute / Office">Daily Commute</option>
                    <option value="Local City Errands">City Errands</option>
                    <option value="Long Highway Tour">Highway Tour</option>
                    <option value="Exam / Interview / Work">Exam / Work</option>
                    <option value="Vehicle in Service / Replacement">Bike in Service</option>
                    <option value="Wedding / Family Function">Wedding / Function</option>
                    <option value="Joyride / Trial">Joyride</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                    Status *
                  </label>
                  <select
                    value={leadForm.status}
                    onChange={(e) => setLeadForm(prev => ({ ...prev, status: e.target.value as LeadStatus }))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                  >
                    <option value="need_follow_up">Need Follow-Up</option>
                    <option value="contacted">Contacted</option>
                    <option value="booked">Booked</option>
                    <option value="not_interested">Not Interested</option>
                    <option value="lost_to_availability">Lost - Unavailable</option>
                    <option value="lost_to_price">Lost - Price High</option>
                    <option value="postponed">Postponed</option>
                  </select>
                </div>
              </div>

              {/* Booked Status Conversion Notice */}
              {leadForm.status === 'booked' && (
                <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 space-y-2.5 animate-fade-in shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🎉</span> Inquiry Status: Booked
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                      Step 1 of 2: Save & Open Booking Form
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Setting status to <strong>Booked</strong> will automatically save this lead and open the <strong>Create Manual Booking & Rider Profile</strong> window. There you can confirm the assigned fleet bike, agreed daily rate, advance payment, and security deposit before moving it directly to the <strong>Bookings</strong> tab.
                  </p>
                </div>
              )}

              {/* Follow-up Date Input (shown when status is need_follow_up) */}
              {leadForm.status === 'need_follow_up' && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 space-y-2.5 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                      Follow-Up Schedule *
                    </span>
                    <span className="text-[10px] text-amber-400 font-medium">Prompt on status</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] text-neutral-400 block mb-1">Date *</label>
                      <input
                        type="date"
                        required
                        value={leadForm.follow_up_date}
                        onChange={(e) => setLeadForm(prev => ({ ...prev, follow_up_date: e.target.value }))}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-neutral-400 block mb-1">Quick Date</label>
                      <div className="flex items-center gap-1 flex-wrap">
                        {['Today', 'Tomorrow', '+2 Days', '+7 Days'].map(preset => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              const now = new Date();
                              let d = now;
                              if (preset === 'Tomorrow') d = new Date(now.getTime() + 86400000);
                              else if (preset === '+2 Days') d = new Date(now.getTime() + 2 * 86400000);
                              else if (preset === '+7 Days') d = new Date(now.getTime() + 7 * 86400000);
                              setLeadForm(prev => ({ ...prev, follow_up_date: d.toISOString().split('T')[0] }));
                            }}
                            className="px-2 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[10px] text-neutral-300 font-semibold cursor-pointer"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Notes */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-neutral-400 block">
                  Notes
                </label>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    'Discount',
                    'Home Delivery',
                    'Solo',
                    'Helmet',
                    'Tour',
                    'Friends',
                    'Salary'
                  ].map(chip => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => appendNoteChip(chip)}
                      className="px-2 py-0.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[10px] text-neutral-300 hover:text-white transition-all cursor-pointer"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={2}
                  placeholder="Notes..."
                  value={leadForm.notes}
                  onChange={(e) => setLeadForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white placeholder-neutral-500 focus:border-orange-500 focus:outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer ${
                    leadForm.status === 'booked'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-orange-600 hover:bg-orange-500'
                  }`}
                >
                  {leadForm.status === 'booked' 
                    ? 'Save & Open Booking Form →' 
                    : (editingLead ? 'Save Changes' : 'Log Lead')}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* CONVERT TO BOOKING MODAL (ASKS ALL MANUAL BOOKING FIELDS WITH PREFILLED LEAD DATA) */}
      {convertingLead && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-[#0c0c0c] border border-neutral-800 w-full max-w-4xl rounded-3xl p-5 sm:p-7 space-y-6 shadow-2xl animate-fade-in my-6 max-h-[92vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  Lead Conversion → Create Booking & Rider Profile
                </span>
                <h3 className="text-xl font-heading tracking-wide uppercase text-white mt-1">
                  Convert Inquiry: {convertingLead.customer_name}
                </h3>
                <p className="text-neutral-400 text-xs mt-0.5">
                  Prefilled from {convertingLead.source.toUpperCase()} inquiry. Email is mandatory to create their cross-device login profile.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConvertingLead(null)}
                className="text-neutral-400 hover:text-white p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmConversion} className="space-y-6">

              {/* 1. CUSTOMER INFORMATION */}
              <div className="bg-black/60 p-5 rounded-2xl border border-neutral-800/80 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold text-sky-400 uppercase tracking-widest flex items-center gap-1.5">
                    <span>👤</span> 1. Customer Information
                  </h4>
                  <span className="text-[9px] text-neutral-500 uppercase">From Lead Inquiry</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-300 uppercase">Rider Full Name *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Rahul Sharma"
                      value={convertForm.customer_name}
                      onChange={(e) => setConvertForm(p => ({ ...p, customer_name: e.target.value }))}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs text-white outline-none focus:border-sky-400 font-bold"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-300 uppercase">Mobile Phone *</label>
                    <input 
                      type="tel" 
                      placeholder="e.g. 9876543210"
                      value={convertForm.customer_phone}
                      onChange={(e) => setConvertForm(p => ({ ...p, customer_phone: e.target.value }))}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs text-white outline-none focus:border-sky-400 font-mono font-bold"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-sky-400 uppercase flex items-center justify-between">
                      <span>Rider Email (Mandatory) *</span>
                      <span className="text-[9px] text-emerald-400 font-mono">Profile Auth</span>
                    </label>
                    <input 
                      type="email" 
                      placeholder="customer@gmail.com"
                      value={convertForm.customer_email}
                      onChange={(e) => setConvertForm(p => ({ ...p, customer_email: e.target.value }))}
                      className="w-full bg-neutral-900 border border-sky-500/40 rounded-xl p-3 text-xs text-white outline-none focus:border-sky-400 font-medium"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 2. VEHICLE & RENTAL SCHEDULE */}
              <div className="bg-black/60 p-5 rounded-2xl border border-neutral-800/80 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <h4 className="text-[11px] font-bold text-sky-400 uppercase tracking-widest flex items-center gap-1.5">
                    <span>🏍️</span> 2. Vehicle & Rental Schedule
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-[9px] font-bold text-sky-400 uppercase">
                      Duration: {getDurationText(convertForm.pickup_date, convertForm.pickup_time, convertForm.return_date, convertForm.return_time)}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-bold text-neutral-300 uppercase">
                      Standard Tariff: ₹{convertForm.standard_rent}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Select Machine</label>
                    <select 
                      value={convertForm.bike_id}
                      onChange={(e) => handleConvertBikeOrDateChange({ bike_id: parseInt(e.target.value) })}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-sky-400"
                      required
                    >
                      {allFleetBikes.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.category}) — ₹{b.dailyRate}/day {b.rc_number ? `• ${b.rc_number}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Trip Scope (City or Outstation)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setConvertForm(p => ({ ...p, is_outstation: false }))}
                        className={`py-2 px-3 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer ${
                          !convertForm.is_outstation ? 'bg-sky-400 text-black shadow' : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                        }`}
                      >
                        🏙️ City / Local Riding
                      </button>
                      <button
                        type="button"
                        onClick={() => setConvertForm(p => ({ ...p, is_outstation: true }))}
                        className={`py-2 px-3 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer ${
                          convertForm.is_outstation ? 'bg-orange-500 text-white shadow' : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                        }`}
                      >
                        🛣️ Outstation / Highway
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Pickup Date & Time</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="date" 
                        value={convertForm.pickup_date}
                        onChange={(e) => handleConvertBikeOrDateChange({ pickup_date: e.target.value })}
                        className="bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-sky-400 cursor-pointer"
                        required
                      />
                      <input 
                        type="time" 
                        value={convertForm.pickup_time}
                        onChange={(e) => handleConvertBikeOrDateChange({ pickup_time: e.target.value })}
                        className="bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-sky-400 cursor-pointer"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Return Date & Time</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="date" 
                        value={convertForm.return_date}
                        onChange={(e) => handleConvertBikeOrDateChange({ return_date: e.target.value })}
                        className="bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-sky-400 cursor-pointer"
                        required
                      />
                      <input 
                        type="time" 
                        value={convertForm.return_time}
                        onChange={(e) => handleConvertBikeOrDateChange({ return_time: e.target.value })}
                        className="bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-sky-400 cursor-pointer"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. AGREED RENT, DEPOSIT & FINANCIAL TERMS */}
              <div className="bg-black/60 p-5 rounded-2xl border-2 border-yellow-500/20 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <h4 className="text-[11px] font-bold text-yellow-400 uppercase tracking-widest flex items-center gap-1.5">
                    <span>💰</span> 3. Agreed Rent, Deposit & Payment Terms
                  </h4>
                  <span className="text-[9px] text-neutral-400 uppercase">Settlement Breakdown</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {/* Agreed Rent */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-neutral-300 uppercase">Finally Agreed Rent (₹) *</label>
                      <span className="text-[9px] text-neutral-400 uppercase">Std: ₹{convertForm.standard_rent}</span>
                    </div>
                    <input 
                      type="number" 
                      min="1"
                      value={convertForm.agreed_rent}
                      onChange={(e) => setConvertForm(p => ({ ...p, agreed_rent: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-2.5 text-base font-heading font-bold text-yellow-400 outline-none focus:border-yellow-400"
                      required
                    />
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setConvertForm(p => ({ ...p, agreed_rent: p.standard_rent }))}
                        className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[9px] font-bold text-neutral-400 uppercase cursor-pointer"
                      >
                        Std (₹{convertForm.standard_rent})
                      </button>
                      <button
                        type="button"
                        onClick={() => setConvertForm(p => ({ ...p, agreed_rent: Math.max(100, p.standard_rent - 100) }))}
                        className="px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-[9px] font-bold text-sky-400 uppercase cursor-pointer"
                      >
                        -₹100
                      </button>
                      <button
                        type="button"
                        onClick={() => setConvertForm(p => ({ ...p, agreed_rent: Math.max(100, p.standard_rent - 200) }))}
                        className="px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-[9px] font-bold text-sky-400 uppercase cursor-pointer"
                      >
                        -₹200
                      </button>
                    </div>
                  </div>

                  {/* Deposit */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-neutral-300 uppercase">Deposit Received (₹)</label>
                      <span className="text-[9px] text-teal-400 uppercase">Refundable</span>
                    </div>
                    <input 
                      type="number" 
                      min="0"
                      value={convertForm.deposit_amount}
                      onChange={(e) => setConvertForm(p => ({ ...p, deposit_amount: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-2.5 text-base font-heading font-bold text-teal-400 outline-none focus:border-teal-400"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setConvertForm(p => ({ ...p, deposit_amount: 0 }))}
                        className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[9px] font-bold text-neutral-400 uppercase cursor-pointer"
                      >
                        ₹0
                      </button>
                      <button
                        type="button"
                        onClick={() => setConvertForm(p => ({ ...p, deposit_amount: 1000 }))}
                        className="px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/20 text-[9px] font-bold text-teal-400 uppercase cursor-pointer"
                      >
                        ₹1,000 (Std)
                      </button>
                      <button
                        type="button"
                        onClick={() => setConvertForm(p => ({ ...p, deposit_amount: 1500 }))}
                        className="px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/20 text-[9px] font-bold text-teal-400 uppercase cursor-pointer"
                      >
                        ₹1,500
                      </button>
                    </div>
                  </div>

                  {/* Advance */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-neutral-300 uppercase">Advance Received (₹)</label>
                      <span className="text-[9px] text-sky-400 uppercase">Paid Now</span>
                    </div>
                    <input 
                      type="number" 
                      min="0"
                      value={convertForm.advance_amount}
                      onChange={(e) => setConvertForm(p => ({ ...p, advance_amount: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-2.5 text-base font-heading font-bold text-sky-400 outline-none focus:border-sky-400"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setConvertForm(p => ({ ...p, advance_amount: 500 }))}
                        className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[9px] font-bold text-neutral-400 uppercase cursor-pointer"
                      >
                        ₹500 Min
                      </button>
                      <button
                        type="button"
                        onClick={() => setConvertForm(p => ({ ...p, advance_amount: p.agreed_rent }))}
                        className="px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-[9px] font-bold text-sky-400 uppercase cursor-pointer"
                      >
                        Full Rent
                      </button>
                      <button
                        type="button"
                        onClick={() => setConvertForm(p => ({ ...p, advance_amount: p.agreed_rent + p.deposit_amount }))}
                        className="px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-[9px] font-bold text-sky-400 uppercase cursor-pointer"
                      >
                        Rent + Dep
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4-way settlement breakdown */}
                <div className="bg-black p-3.5 rounded-xl border border-neutral-800 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                  <div>
                    <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-wider block">Agreed Rent</span>
                    <span className="text-sm font-heading text-white">₹{convertForm.agreed_rent}</span>
                  </div>
                  <div className="sm:border-l border-neutral-800">
                    <span className="text-[8px] font-bold text-teal-400 uppercase tracking-wider block">Deposit Recv.</span>
                    <span className="text-sm font-heading text-teal-400">₹{convertForm.deposit_amount}</span>
                  </div>
                  <div className="sm:border-l border-neutral-800">
                    <span className="text-[8px] font-bold text-sky-400 uppercase tracking-wider block">Advance Recv.</span>
                    <span className="text-sm font-heading text-sky-400">₹{convertForm.advance_amount}</span>
                  </div>
                  <div className="sm:border-l border-neutral-800">
                    <span className="text-[8px] font-bold text-yellow-400 uppercase tracking-wider block">Balance on Handover</span>
                    <span className="text-sm font-heading text-yellow-400">
                      ₹{Math.max(0, (Number(convertForm.agreed_rent) + Number(convertForm.deposit_amount)) - Number(convertForm.advance_amount))}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1 border-t border-neutral-800">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Payment Method</label>
                    <select 
                      value={convertForm.payment_method}
                      onChange={(e) => setConvertForm(p => ({ ...p, payment_method: e.target.value as any }))}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white font-bold outline-none focus:border-sky-400"
                    >
                      <option value="upi">UPI (GPay / PhonePe / QR)</option>
                      <option value="cash">Cash Received at Garage</option>
                      <option value="card">Debit / Credit Card POS</option>
                      <option value="bank_transfer">Bank Transfer / IMPS</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Payment / Transaction Note</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Advance paid via UPI ref / Cash at desk..."
                      value={convertForm.payment_note}
                      onChange={(e) => setConvertForm(p => ({ ...p, payment_note: e.target.value }))}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-sky-400"
                    />
                  </div>
                </div>
              </div>

              {/* 4. LOGISTICS & HANDOVER LOCATIONS */}
              <div className="bg-black/60 p-5 rounded-2xl border border-neutral-800/80 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold text-sky-400 uppercase tracking-widest flex items-center gap-1.5">
                    <span>📍</span> 4. Logistics & Handover Locations
                  </h4>
                  <span className="text-[9px] text-neutral-500 uppercase">Garage or Home Delivery</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Pickup Handover</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setConvertForm(p => ({ ...p, pickup_method: 'garage' }))}
                        className={`py-2 px-3 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer ${
                          convertForm.pickup_method === 'garage'
                            ? 'bg-sky-400 text-black shadow'
                            : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                        }`}
                      >
                        Garage Pickup
                      </button>
                      <button
                        type="button"
                        onClick={() => setConvertForm(p => ({ ...p, pickup_method: 'home' }))}
                        className={`py-2 px-3 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer ${
                          convertForm.pickup_method === 'home'
                            ? 'bg-sky-400 text-black shadow'
                            : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                        }`}
                      >
                        Deliver to Home
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Return Drop</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setConvertForm(p => ({ ...p, drop_method: 'garage' }))}
                        className={`py-2 px-3 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer ${
                          convertForm.drop_method === 'garage'
                            ? 'bg-yellow-400 text-black shadow'
                            : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                        }`}
                      >
                        Garage Drop
                      </button>
                      <button
                        type="button"
                        onClick={() => setConvertForm(p => ({ ...p, drop_method: 'home' }))}
                        className={`py-2 px-3 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer ${
                          convertForm.drop_method === 'home'
                            ? 'bg-yellow-400 text-black shadow'
                            : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                        }`}
                      >
                        Pickup from Home
                      </button>
                    </div>
                  </div>
                </div>

                {convertForm.pickup_method === 'home' && (
                  <div className="space-y-2 pt-2 border-t border-neutral-800 animate-fade-in">
                    <label className="text-[10px] font-bold text-sky-400 uppercase">
                      🚚 Delivery Address in Kolkata
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Flat 4B, Park Street..."
                      value={convertForm.delivery_address}
                      onChange={(e) => setConvertForm(p => ({ ...p, delivery_address: e.target.value }))}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-sky-400"
                      required
                    />
                  </div>
                )}
              </div>

              {/* 5. DOCUMENTS & KYC */}
              <div className="bg-black/60 p-5 rounded-2xl border border-neutral-800/80 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold text-sky-400 uppercase tracking-widest flex items-center gap-1.5">
                    <span>🪪</span> 5. Identity Verification & KYC
                  </h4>
                  <span className="text-[9px] text-neutral-500 uppercase">Can enter now or at garage</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Aadhaar / National ID</label>
                    <input 
                      type="text" 
                      placeholder="XXXX-XXXX-XXXX"
                      value={convertForm.aadhaar_number}
                      onChange={(e) => setConvertForm(p => ({ ...p, aadhaar_number: e.target.value }))}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs font-mono text-white outline-none focus:border-sky-400"
                    />
                    <label className="flex items-center gap-2 cursor-pointer bg-neutral-900 border border-dashed border-neutral-700 rounded-xl p-2.5 hover:border-sky-400 transition-all">
                      <span className="text-[9px] font-bold text-neutral-400 uppercase truncate">
                        {convertForm.aadhaar_image ? convertForm.aadhaar_image.name : 'Upload Aadhaar Photo'}
                      </span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => e.target.files?.[0] && setConvertForm(p => ({ ...p, aadhaar_image: e.target.files![0] }))} 
                      />
                    </label>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Driving License</label>
                    <input 
                      type="text" 
                      placeholder="DL Number"
                      value={convertForm.dl_number}
                      onChange={(e) => setConvertForm(p => ({ ...p, dl_number: e.target.value }))}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs font-mono text-white outline-none focus:border-sky-400"
                    />
                    <label className="flex items-center gap-2 cursor-pointer bg-neutral-900 border border-dashed border-neutral-700 rounded-xl p-2.5 hover:border-sky-400 transition-all">
                      <span className="text-[9px] font-bold text-neutral-400 uppercase truncate">
                        {convertForm.dl_image ? convertForm.dl_image.name : 'Upload DL Photo'}
                      </span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => e.target.files?.[0] && setConvertForm(p => ({ ...p, dl_image: e.target.files![0] }))} 
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* 6. OPERATIONAL STATUS & HANDOVER */}
              <div className="bg-black/60 p-5 rounded-2xl border border-neutral-800/80 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold text-sky-400 uppercase tracking-widest flex items-center gap-1.5">
                    <span>⚡</span> 6. Operational Status & Handover
                  </h4>
                  <span className="text-[9px] text-neutral-500 uppercase">Active Dispatch</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Operational Status</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setConvertForm(p => ({ ...p, ride_status: 'booking_confirmed' }))}
                        className={`py-2.5 px-3 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer ${
                          convertForm.ride_status === 'booking_confirmed'
                            ? 'bg-sky-400 text-black shadow-lg shadow-sky-500/20'
                            : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                        }`}
                      >
                        ✓ Confirmed (Ready)
                      </button>
                      <button
                        type="button"
                        onClick={() => setConvertForm(p => ({ ...p, ride_status: 'ongoing' }))}
                        className={`py-2.5 px-3 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer ${
                          convertForm.ride_status === 'ongoing'
                            ? 'bg-emerald-400 text-black shadow-lg shadow-emerald-500/20'
                            : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                        }`}
                      >
                        🚀 Start Ride Now
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Starting Odometer (KM)</label>
                    <input 
                      type="number"
                      min="0"
                      value={convertForm.start_odometer || ''}
                      onChange={(e) => setConvertForm(p => ({ ...p, start_odometer: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs font-mono font-bold text-white outline-none focus:border-sky-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Handover Notes / Inspection</label>
                    <textarea 
                      rows={2}
                      placeholder="e.g. 2 Helmets provided, scratch on mirror..."
                      value={convertForm.admin_notes}
                      onChange={(e) => setConvertForm(p => ({ ...p, admin_notes: e.target.value }))}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2 text-xs text-white resize-none outline-none focus:border-sky-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Rider Handover Photo</label>
                    <label className="flex flex-col items-center justify-center cursor-pointer bg-neutral-900 border border-dashed border-neutral-700 rounded-xl p-2 hover:border-sky-400 transition-all h-[58px]">
                      <span className="text-[9px] font-bold text-neutral-400 truncate">
                        {convertForm.handover_image ? convertForm.handover_image.name : 'Take / Upload Handover Photo'}
                      </span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => e.target.files?.[0] && setConvertForm(p => ({ ...p, handover_image: e.target.files![0] }))} 
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setConvertingLead(null)}
                  className="px-5 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white text-xs font-bold uppercase transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-7 py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-xs uppercase tracking-wider transition-all shadow-xl shadow-emerald-500/20 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Creating Booking & Profile...' : 'Confirm & Create Booking'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
