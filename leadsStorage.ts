import { Lead, LeadStatus } from './types';
import { supabase } from './supabase';

const LOCAL_STORAGE_LEADS_KEY = 'rydeit_leads_data_v1';

export const INITIAL_LEADS: Lead[] = [
  {
    id: 'lead_1729170001',
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    customer_name: 'Subham Ghosh',
    customer_phone: '9830124567',
    source: 'whatsapp',
    vehicle_preference: 'bullet',
    specific_vehicle_id: 12,
    specific_vehicle_name: 'RE Classic 350',
    pickup_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    return_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    rental_duration_days: 2,
    purpose: 'Weekend Trip / Outing',
    budget_expectation: 'Standard Rate (₹1600/day)',
    status: 'need_follow_up',
    follow_up_date: new Date().toISOString().split('T')[0],
    notes: 'Planning Digha weekend tour with friends. Asked if helmet included.'
  },
  {
    id: 'lead_1729170002',
    created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    customer_name: 'Priyanka Mukherjee',
    customer_phone: '8777123987',
    source: 'call',
    vehicle_preference: 'scooty',
    specific_vehicle_id: 16,
    specific_vehicle_name: 'Honda Activa 125',
    pickup_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    return_date: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
    rental_duration_days: 3,
    purpose: 'Vehicle in Service / Replacement',
    budget_expectation: 'Budget (₹700/day)',
    status: 'contacted',
    follow_up_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    notes: 'Her car is in workshop for 3 days. Needs comfortable automatic scooty for Salt Lake office commute.'
  },
  {
    id: 'lead_1729170003',
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    customer_name: 'Arindam Das',
    customer_phone: '9051876543',
    source: 'walk_in',
    vehicle_preference: 'scooty',
    specific_vehicle_id: 15,
    specific_vehicle_name: 'Suzuki Burgman',
    pickup_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    return_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    rental_duration_days: 2,
    purpose: 'Local City Errands',
    budget_expectation: 'Standard Rate (₹700/day)',
    status: 'booked',
    notes: 'Converted from walk-in visit. Advance paid at desk.',
    converted_booking_id: 'RD-M819201',
    converted_at: new Date(Date.now() - 22 * 3600 * 1000).toISOString()
  },
  {
    id: 'lead_1729170004',
    created_at: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
    customer_name: 'Rohit Sen',
    customer_phone: '9836541290',
    source: 'instagram',
    vehicle_preference: 'sports',
    specific_vehicle_id: 11,
    specific_vehicle_name: 'KTM Duke 390',
    pickup_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    return_date: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
    rental_duration_days: 2,
    purpose: 'Long Highway Tour',
    budget_expectation: 'Standard Rate (₹2200/day)',
    status: 'lost_to_availability',
    notes: 'Wanted Duke 390 specifically for weekend highway ride. Duke was already reserved by another customer.'
  },
  {
    id: 'lead_1729170005',
    created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    customer_name: 'Md. Tariq',
    customer_phone: '7003456712',
    source: 'whatsapp',
    vehicle_preference: 'bike',
    specific_vehicle_id: 1,
    specific_vehicle_name: 'Hero Xtreme 125r',
    pickup_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    return_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    rental_duration_days: 1,
    purpose: 'Exam / Interview / Work',
    budget_expectation: 'Budget (₹700/day)',
    status: 'need_follow_up',
    follow_up_date: new Date().toISOString().split('T')[0],
    notes: 'Interview in Sector V on Monday morning. Needs punctual morning delivery or pickup.'
  },
  {
    id: 'lead_1729170006',
    created_at: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    customer_name: 'Debjit Bose',
    customer_phone: '9123456780',
    source: 'call',
    vehicle_preference: 'bullet',
    specific_vehicle_id: 8,
    specific_vehicle_name: 'RE Hunter 350',
    pickup_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    return_date: new Date(Date.now() + 9 * 86400000).toISOString().split('T')[0],
    rental_duration_days: 2,
    purpose: 'Joyride / Trial',
    budget_expectation: 'Standard (₹1500/day)',
    status: 'postponed',
    notes: 'Friend cancelled plans. Told us he will book for next month holiday weekend.'
  }
];

export const getStoredLeads = (): Lead[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_LEADS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_LEADS_KEY, JSON.stringify(INITIAL_LEADS));
      return INITIAL_LEADS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(LOCAL_STORAGE_LEADS_KEY, JSON.stringify(INITIAL_LEADS));
      return INITIAL_LEADS;
    }
    return parsed;
  } catch (err) {
    console.warn('Failed to parse stored leads, using default:', err);
    return INITIAL_LEADS;
  }
};

export const saveStoredLeads = (leads: Lead[]): void => {
  try {
    localStorage.setItem(LOCAL_STORAGE_LEADS_KEY, JSON.stringify(leads));
  } catch (err) {
    console.error('Failed to save leads to localStorage:', err);
  }
};

export const fetchLeadsFromSupabase = async (): Promise<Lead[]> => {
  const local = getStoredLeads();
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      // Merge with local storage
      saveStoredLeads(data);
      return data as Lead[];
    }
  } catch (err) {
    // If table doesn't exist yet, gracefully use local storage
    console.info('Supabase leads table not available, using local persistent storage');
  }
  return local;
};

export const saveLead = async (lead: Lead): Promise<Lead> => {
  const current = getStoredLeads();
  const index = current.findIndex(l => l.id === lead.id);
  let updated: Lead[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = lead;
  } else {
    updated = [lead, ...current];
  }
  saveStoredLeads(updated);

  // Try background sync to Supabase
  try {
    await supabase.from('leads').upsert(lead);
  } catch (err) {
    // Silent fail if table not yet created
  }

  return lead;
};

export const updateLeadStatus = async (leadId: string, newStatus: LeadStatus): Promise<Lead | null> => {
  const current = getStoredLeads();
  const target = current.find(l => l.id === leadId);
  if (!target) return null;

  const updatedLead: Lead = {
    ...target,
    status: newStatus
  };

  await saveLead(updatedLead);
  return updatedLead;
};

export const addFollowUpComment = async (
  leadId: string, 
  commentText: string, 
  nextFollowUpDate?: string, 
  statusAfter?: LeadStatus
): Promise<Lead | null> => {
  const current = getStoredLeads();
  const target = current.find(l => l.id === leadId);
  if (!target) return null;

  const newComment = {
    id: `comm_${Date.now()}`,
    timestamp: new Date().toISOString(),
    comment: commentText.trim(),
    next_follow_up_date: nextFollowUpDate || target.follow_up_date,
    status_after: statusAfter || target.status
  };

  const updatedComments = [newComment, ...(target.follow_up_comments || [])];

  const updatedLead: Lead = {
    ...target,
    follow_up_date: nextFollowUpDate || target.follow_up_date,
    status: statusAfter || target.status,
    follow_up_comments: updatedComments
  };

  await saveLead(updatedLead);
  return updatedLead;
};

export const deleteLead = async (leadId: string): Promise<boolean> => {
  const current = getStoredLeads();
  const updated = current.filter(l => l.id !== leadId);
  saveStoredLeads(updated);

  try {
    await supabase.from('leads').delete().eq('id', leadId);
  } catch (err) {
    // Ignore Supabase error
  }
  return true;
};

export interface MarketDemandAnalytics {
  totalLeads: number;
  needFollowUpCount: number;
  bookedCount: number;
  conversionRate: number; // percentage
  categoryCounts: {
    scooty: number;
    bike: number;
    bullet: number;
    sports: number;
    flexible: number;
  };
  categoryPercentages: {
    scooty: number;
    bike: number;
    bullet: number;
    sports: number;
  };
  lostDemand: {
    availability: number;
    price: number;
    notInterested: number;
    totalLost: number;
  };
  sourceBreakdown: {
    whatsapp: number;
    call: number;
    walk_in: number;
    instagram: number;
    website: number;
  };
  topPurposes: { purpose: string; count: number }[];
}

export const computeDemandAnalytics = (leads: Lead[]): MarketDemandAnalytics => {
  const total = leads.length;
  if (total === 0) {
    return {
      totalLeads: 0,
      needFollowUpCount: 0,
      bookedCount: 0,
      conversionRate: 0,
      categoryCounts: { scooty: 0, bike: 0, bullet: 0, sports: 0, flexible: 0 },
      categoryPercentages: { scooty: 0, bike: 0, bullet: 0, sports: 0 },
      lostDemand: { availability: 0, price: 0, notInterested: 0, totalLost: 0 },
      sourceBreakdown: { whatsapp: 0, call: 0, walk_in: 0, instagram: 0, website: 0 },
      topPurposes: []
    };
  }

  const needFollowUp = leads.filter(l => l.status === 'need_follow_up').length;
  const booked = leads.filter(l => l.status === 'booked').length;
  const conversionRate = Math.round((booked / total) * 100);

  const categoryCounts = {
    scooty: leads.filter(l => l.vehicle_preference === 'scooty').length,
    bike: leads.filter(l => l.vehicle_preference === 'bike').length,
    bullet: leads.filter(l => l.vehicle_preference === 'bullet').length,
    sports: leads.filter(l => l.vehicle_preference === 'sports').length,
    flexible: leads.filter(l => l.vehicle_preference === 'flexible').length
  };

  const categorizedTotal = categoryCounts.scooty + categoryCounts.bike + categoryCounts.bullet + categoryCounts.sports;
  const denom = categorizedTotal > 0 ? categorizedTotal : 1;

  const categoryPercentages = {
    scooty: Math.round((categoryCounts.scooty / denom) * 100),
    bike: Math.round((categoryCounts.bike / denom) * 100),
    bullet: Math.round((categoryCounts.bullet / denom) * 100),
    sports: Math.round((categoryCounts.sports / denom) * 100)
  };

  const lostAvailability = leads.filter(l => l.status === 'lost_to_availability').length;
  const lostPrice = leads.filter(l => l.status === 'lost_to_price').length;
  const notInterested = leads.filter(l => l.status === 'not_interested').length;

  const sourceBreakdown = {
    whatsapp: leads.filter(l => l.source === 'whatsapp').length,
    call: leads.filter(l => l.source === 'call').length,
    walk_in: leads.filter(l => l.source === 'walk_in').length,
    instagram: leads.filter(l => l.source === 'instagram').length,
    website: leads.filter(l => l.source === 'website').length
  };

  const purposeMap: Record<string, number> = {};
  leads.forEach(l => {
    purposeMap[l.purpose] = (purposeMap[l.purpose] || 0) + 1;
  });

  const topPurposes = Object.entries(purposeMap)
    .map(([purpose, count]) => ({ purpose, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalLeads: total,
    needFollowUpCount: needFollowUp,
    bookedCount: booked,
    conversionRate,
    categoryCounts,
    categoryPercentages,
    lostDemand: {
      availability: lostAvailability,
      price: lostPrice,
      notInterested,
      totalLost: lostAvailability + lostPrice + notInterested
    },
    sourceBreakdown,
    topPurposes
  };
};
