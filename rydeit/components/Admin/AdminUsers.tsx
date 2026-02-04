
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabase';
import { useToast } from '../../App';
import { Modal } from '../Modal';
import { BIKES } from '../../constants';

export const AdminUsers: React.FC = () => {
  const { showToast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data);
    setLoading(false);
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const search = searchTerm.toLowerCase();
      return (
        (u.full_name?.toLowerCase().includes(search)) ||
        (u.email?.toLowerCase().includes(search)) ||
        (u.whatsapp?.toLowerCase().includes(search)) ||
        (u.phone?.toLowerCase().includes(search))
      );
    });
  }, [users, searchTerm]);

  const fetchUserAudit = async (user: any) => {
    setSelectedUser(user);
    setUserStats(null); // Reset while loading
    
    const { data: rides } = await supabase.from('bookings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (rides) {
        const penalties = rides.reduce((acc, r) => acc + (r.adjustment_amount > 0 ? 1 : 0), 0);
        const totalSpent = rides.reduce((acc, r) => acc + (r.total_rent || 0) + (r.adjustment_amount || 0), 0);
        setUserStats({
            rides,
            rideCount: rides.length,
            penalties,
            totalSpent,
            lastRide: rides[0]?.created_at || 'Never'
        });
    }
  };

  const toggleBlock = async (userId: string, isBlocked: boolean) => {
    const { error } = await supabase.from('profiles').update({ 
        is_blocked: !isBlocked,
        admin_notes: `Status toggled to ${!isBlocked ? 'Blocked' : 'Unblocked'} on ${new Date().toLocaleString()}`
    }).eq('id', userId);
    
    if (error) showToast(error.message, 'error');
    else {
      showToast(isBlocked ? 'User Unblocked.' : 'User Restricted.', 'success');
      fetchUsers();
      if (selectedUser?.id === userId) {
          setSelectedUser({...selectedUser, is_blocked: !isBlocked});
      }
    }
  };

  const toggleVerify = async (userId: string, isVerified: boolean) => {
    const { error } = await supabase.from('profiles').update({ is_verified: !isVerified }).eq('id', userId);
    if (error) showToast(error.message, 'error');
    else {
      showToast(isVerified ? 'Verification Revoked.' : 'User Whitelisted.', 'success');
      fetchUsers();
    }
  };

  return (
    <div className="animate-fade-in space-y-12 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
            <h2 className="text-4xl font-heading text-white uppercase tracking-tighter">Rider Registry</h2>
            <p className="text-brand-teal text-[9px] font-black uppercase tracking-[0.4em] mt-2">Search & Compliance Control</p>
        </div>
        <div className="w-full md:w-auto bg-brand-gray-dark border border-white/5 rounded-2xl px-6 py-3 flex items-center gap-4 focus-within:border-brand-teal transition-all">
            <svg className="w-4 h-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input 
              type="text" 
              placeholder="Search Name, Email, or Phone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-xs font-bold text-white outline-none placeholder:text-white/10 w-full md:w-64" 
            />
        </div>
      </div>

      <div className="bg-brand-gray-dark/40 rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-brand-black/60 text-[9px] font-black uppercase tracking-widest text-white/30">
              <tr>
                <th className="px-10 py-8">Rider Profile</th>
                <th className="px-10 py-8">Contacts</th>
                <th className="px-10 py-8">Status</th>
                <th className="px-10 py-8">KYC Assets</th>
                <th className="px-10 py-8 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-10 py-20 text-center text-white/20 uppercase font-black tracking-widest text-[10px]">No riders found matching your search</td>
                </tr>
              ) : (
                filteredUsers.map(profile => (
                  <tr key={profile.id} className="hover:bg-brand-orange/[0.02] transition-colors group cursor-pointer" onClick={() => fetchUserAudit(profile)}>
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-brand-teal/10 flex items-center justify-center text-brand-teal font-black text-xl border border-brand-teal/20 group-hover:bg-brand-teal group-hover:text-black transition-all">
                          {profile.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white uppercase tracking-tight">{profile.full_name || 'Anonymous Rider'}</div>
                          <div className="text-[10px] text-white/30 uppercase mt-1 tracking-widest">{profile.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="text-xs font-bold text-white/80">{profile.whatsapp || profile.phone || 'No Phone'}</div>
                      <div className="text-[9px] text-brand-teal font-black uppercase tracking-widest mt-1">UID: {profile.id.substring(0,8)}</div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex flex-wrap gap-2">
                        <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${profile.is_verified ? 'border-brand-teal/40 text-brand-teal bg-brand-teal/5' : 'border-brand-orange/40 text-brand-orange bg-brand-orange/5'}`}>
                          {profile.is_verified ? 'Verified' : 'Unverified'}
                        </span>
                        {profile.is_blocked && (
                          <span className="bg-red-500/10 text-red-500 border border-red-500/30 px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest animate-pulse">Restricted</span>
                        )}
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                         {profile.dl_url ? <a href={profile.dl_url} target="_blank" className="px-3 py-1.5 bg-brand-black border border-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest text-brand-teal hover:border-brand-teal transition-all">DL</a> : <span className="text-[8px] text-white/5 font-black uppercase italic">N/A</span>}
                         {profile.aadhaar_url ? <a href={profile.aadhaar_url} target="_blank" className="px-3 py-1.5 bg-brand-black border border-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest text-brand-teal hover:border-brand-teal transition-all">ID</a> : <span className="text-[8px] text-white/5 font-black uppercase italic">N/A</span>}
                      </div>
                    </td>
                    <td className="px-10 py-8 text-right">
                      <button className="text-[9px] font-black text-white uppercase tracking-widest bg-brand-black border border-white/10 px-6 py-3 rounded-xl hover:border-brand-orange hover:text-brand-orange transition-all shadow-lg">Audit</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedUser && (
        <Modal isOpen={!!selectedUser} onClose={() => setSelectedUser(null)} title="RIDER INTELLIGENCE">
          <div className="space-y-12 py-6 px-2 max-h-[75vh] overflow-y-auto no-scrollbar">
            {/* PROFILE TOP BAR */}
            <div className="flex flex-col md:flex-row items-center gap-8 bg-brand-black/40 p-8 rounded-[2.5rem] border border-white/5">
                <div className="w-24 h-24 bg-brand-orange/20 rounded-[2rem] flex items-center justify-center text-3xl text-brand-orange font-heading shadow-2xl">
                    {selectedUser.full_name?.charAt(0) || 'U'}
                </div>
                <div className="flex-grow text-center md:text-left">
                    <h3 className="text-white font-heading text-3xl uppercase tracking-tighter leading-none">{selectedUser.full_name || 'Anonymous'}</h3>
                    <div className="flex flex-wrap gap-4 mt-4 justify-center md:justify-start">
                        <span className="text-[10px] text-brand-teal font-black uppercase tracking-widest">{selectedUser.email}</span>
                        <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">•</span>
                        <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">Joined {new Date(selectedUser.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex gap-4 mt-8 justify-center md:justify-start">
                        <button onClick={() => toggleVerify(selectedUser.id, selectedUser.is_verified)} className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${selectedUser.is_verified ? 'border-brand-teal/40 text-brand-teal hover:bg-brand-teal hover:text-black' : 'bg-brand-teal text-black border-brand-teal/20'}`}>
                            {selectedUser.is_verified ? 'Revoke Whitelist' : 'Whitelist User'}
                        </button>
                        <button onClick={() => toggleBlock(selectedUser.id, selectedUser.is_blocked)} className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${selectedUser.is_blocked ? 'bg-green-500 text-white border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 'bg-red-500 text-white border-red-500/20'}`}>
                            {selectedUser.is_blocked ? 'Unblock Rider' : 'Restrict Access'}
                        </button>
                    </div>
                </div>
            </div>

            {/* METRICS */}
            {userStats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-brand-black/40 p-8 rounded-[2rem] border border-white/5 space-y-2 group hover:border-brand-teal/40 transition-all">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Lifetime Value (LTV)</p>
                        <p className="text-3xl font-heading text-white">₹{userStats.totalSpent.toLocaleString()}</p>
                    </div>
                    <div className="bg-brand-black/40 p-8 rounded-[2rem] border border-white/5 space-y-2 group hover:border-brand-teal/40 transition-all">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Total Rides</p>
                        <p className="text-3xl font-heading text-brand-teal">{userStats.rideCount}</p>
                    </div>
                    <div className="bg-brand-black/40 p-8 rounded-[2rem] border border-white/5 space-y-2 group hover:border-brand-teal/40 transition-all">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Penalties Triggered</p>
                        <p className={`text-3xl font-heading ${userStats.penalties > 0 ? 'text-brand-orange' : 'text-green-500'}`}>{userStats.penalties}</p>
                    </div>
                    <div className="bg-brand-black/40 p-8 rounded-[2rem] border border-white/5 space-y-2 group hover:border-brand-teal/40 transition-all">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Last Activity</p>
                        <p className="text-sm font-bold text-white uppercase mt-2">{userStats.lastRide === 'Never' ? 'Never' : new Date(userStats.lastRide).toLocaleDateString()}</p>
                    </div>
                </div>
            )}

            {/* INTERACTION LOG */}
            <div className="bg-brand-gray-dark/40 p-8 md:p-10 rounded-[3rem] border border-white/5">
                <h4 className="text-white font-heading text-sm uppercase mb-8 tracking-[0.2em] flex items-center gap-4">
                  <span className="w-8 h-[2px] bg-brand-teal"></span>
                  Interaction History
                </h4>
                
                {userStats?.rides?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="text-[8px] font-black uppercase text-white/20 tracking-widest border-b border-white/5">
                        <tr>
                          <th className="pb-4">Machine</th>
                          <th className="pb-4">Dates</th>
                          <th className="pb-4">Status</th>
                          <th className="pb-4 text-right">Settlement</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {userStats.rides.map((ride: any) => {
                          const bike = BIKES.find(b => b.id === ride.bike_id);
                          return (
                            <tr key={ride.id} className="text-[10px]">
                              <td className="py-4">
                                <div className="text-white font-bold">{bike?.name || 'N/A'}</div>
                                <div className="text-brand-orange font-black text-[8px] mt-1">{ride.readable_id}</div>
                              </td>
                              <td className="py-4">
                                <div className="text-white/60">{ride.pickup_date}</div>
                                <div className="text-white/20">to {ride.return_date}</div>
                              </td>
                              <td className="py-4">
                                <span className={`uppercase font-black text-[8px] ${
                                  ride.status === 'completed' ? 'text-green-500' :
                                  ride.status === 'ongoing' ? 'text-brand-teal' :
                                  'text-brand-orange'
                                }`}>
                                  {ride.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="py-4 text-right">
                                <div className="text-white font-bold">₹{ride.total_rent + (ride.adjustment_amount || 0)}</div>
                                {ride.adjustment_amount !== 0 && (
                                  <div className={`text-[8px] font-black ${ride.adjustment_amount > 0 ? 'text-brand-orange' : 'text-green-500'}`}>
                                    {ride.adjustment_amount > 0 ? '+' : ''}₹{ride.adjustment_amount} Adj
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-12 text-center text-white/10 font-black uppercase tracking-widest text-[10px]">No historical bookings detected</div>
                )}
            </div>

            {/* ADMIN NOTES */}
            <div className="bg-brand-gray-dark/40 p-10 rounded-[3.5rem] border border-white/5">
                <h4 className="text-white font-heading text-sm uppercase mb-6 tracking-widest">Internal Compliance Notes</h4>
                <div className="p-6 bg-brand-black/40 rounded-2xl border border-white/5 text-[10px] text-white/40 leading-relaxed italic uppercase font-bold tracking-widest min-h-[80px]">
                    {selectedUser.admin_notes || "Clean Record: No previous administrative interventions recorded for this account."}
                </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
