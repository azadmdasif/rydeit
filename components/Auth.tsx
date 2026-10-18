import React, { useState } from 'react';
import { supabase } from '../supabase';
import { useToast } from '../App';
import { resolveLoginIdentifierToEmail, ensureCustomerProfile, linkCustomerBookings } from '../profileSync';
import { Mail, User, Phone, Lock, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';

interface AuthProps {
  onSuccess: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onSuccess }) => {
  const { showToast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  
  // Login input can be Email, Username, or 10-digit Mobile Phone
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  
  // Registration specific inputs
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isInIframe] = useState(() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  });

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
      showToast(err.message, 'error');
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        if (!loginIdentifier.trim()) {
          showToast('Please enter your Email, Username, or Mobile Phone', 'warning');
          setLoading(false);
          return;
        }

        // Resolve Email from Username or Mobile Phone
        const resolvedEmail = await resolveLoginIdentifierToEmail(loginIdentifier.trim());
        
        let signInSuccess = false;
        let lastErrorMsg = '';

        // Attempt 1: Sign in with the entered password
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: resolvedEmail,
            password: password
          });
          if (error) {
            lastErrorMsg = error.message;
          } else if (data?.user) {
            signInSuccess = true;
            // Backfill and link bookings
            await linkCustomerBookings(data.user.id, resolvedEmail);
          }
        } catch (attemptErr: any) {
          lastErrorMsg = attemptErr.message || '';
        }

        // Attempt 2: If failed and user entered phone as identifier, try their 10-digit phone as fallback default password
        if (!signInSuccess) {
          const cleanPhone = loginIdentifier.replace(/\D/g, '').slice(-10);
          if (cleanPhone.length === 10 && cleanPhone !== password) {
            try {
              const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
                email: resolvedEmail,
                password: cleanPhone
              });
              if (!retryError && retryData?.user) {
                signInSuccess = true;
                await linkCustomerBookings(retryData.user.id, resolvedEmail);
              }
            } catch {
              // Ignore fallback error
            }
          }
        }

        if (!signInSuccess) {
          throw new Error(lastErrorMsg || 'Invalid login credentials. Please verify your Email/Username/Phone and Password.');
        }

        showToast('Signed in successfully! Welcome to Rydeit.', 'success');
        onSuccess();
      } else {
        // Register flow
        if (!regEmail.trim()) {
          showToast('Email address is mandatory for registration', 'warning');
          setLoading(false);
          return;
        }
        if (!fullName.trim()) {
          showToast('Please enter your full name', 'warning');
          setLoading(false);
          return;
        }

        const cleanPhone = phone.replace(/\D/g, '').slice(-10);
        const finalUsername = username.trim() || regEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ 
          email: regEmail.trim().toLowerCase(), 
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              phone: cleanPhone,
              whatsapp: cleanPhone,
              username: finalUsername
            }
          }
        });

        if (signUpError) throw signUpError;

        // Upsert profile record
        await ensureCustomerProfile({
          email: regEmail.trim().toLowerCase(),
          full_name: fullName.trim(),
          phone: cleanPhone
        });

        if (signUpData.user?.id) {
          await linkCustomerBookings(signUpData.user.id, regEmail.trim().toLowerCase(), cleanPhone);
        }
        
        showToast('Registration successful! You are now logged in.', 'success');
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-black/90 p-6 sm:p-8 rounded-[2rem] border border-neutral-800 w-full animate-fade-in shadow-2xl font-sans max-w-md mx-auto">
      <div className="text-center mb-6">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-400 bg-sky-500/10 px-3 py-1 rounded-full border border-sky-500/20">
          Rydeit Rider Portal
        </span>
        <h4 className="text-white font-heading text-2xl uppercase mt-3 tracking-wide">
          {isLogin ? 'Sign In to Your Rides' : 'Create Rider Account'}
        </h4>
        <p className="text-neutral-400 text-xs mt-1">
          {isLogin ? 'Access your confirmed bookings, digital agreements & trip receipts.' : 'Join the club to book and manage machines on any device.'}
        </p>
      </div>

      <div className="space-y-4">
        {/* GOOGLE ONE CLICK */}
        <button
          onClick={handleGoogleLogin}
          type="button"
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-3.5 rounded-xl shadow-lg hover:bg-neutral-200 transition-all disabled:opacity-50 cursor-pointer"
        >
          <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
          <span className="text-xs uppercase tracking-wider">Continue with Google</span>
        </button>

        {isInIframe && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
            <p className="text-amber-300 text-[11px] leading-relaxed">
              Google blocks popups in embedded preview. Use email/phone login below or open in standalone tab.
            </p>
            <a
              href={window.location.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-[10px] uppercase font-bold text-black bg-amber-400 hover:bg-amber-300 px-3 py-1 rounded-lg transition-colors"
            >
              Open in Standalone Tab ↗
            </a>
          </div>
        )}

        <div className="flex items-center gap-4 py-1">
          <div className="h-px bg-neutral-800 flex-grow" />
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">OR SIGN IN WITH CREDENTIALS</span>
          <div className="h-px bg-neutral-800 flex-grow" />
        </div>

        <form onSubmit={handleAuth} className="space-y-3.5">
          {isLogin ? (
            <>
              {/* LOGIN IDENTIFIER: EMAIL, USERNAME OR MOBILE */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-neutral-300 tracking-wider flex items-center justify-between">
                  <span>Email, Username, or Mobile *</span>
                  <span className="text-[9px] text-sky-400 font-mono">Any works</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="e.g. rahul@gmail.com, rahul_sharma, or 9876543210"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-3.5 py-3 text-xs text-white placeholder:text-neutral-600 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none transition-all font-medium"
                    required
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-neutral-300 tracking-wider flex items-center justify-between">
                  <span>Password *</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    placeholder="Enter password (default is your 10-digit mobile number)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-3.5 py-3 text-xs text-white placeholder:text-neutral-600 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none transition-all"
                    required
                  />
                </div>
              </div>

              {/* RIDER HELPER CALLOUT */}
              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800/80 text-[11px] text-neutral-400 flex items-start gap-2 leading-relaxed">
                <HelpCircle className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Confirmed Booking Rider?</strong> You can sign in using your booking <span className="text-white">Email</span> or <span className="text-white">Mobile Number</span>. Your default password is your 10-digit mobile phone.
                </span>
              </div>
            </>
          ) : (
            <>
              {/* REGISTER FIELDS */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-neutral-300 tracking-wider">Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder:text-neutral-600 focus:border-sky-400 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-neutral-300 tracking-wider">Mobile Number *</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="tel"
                      placeholder="10-digit Mobile"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-2 py-2.5 text-xs text-white placeholder:text-neutral-600 focus:border-sky-400 outline-none font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-neutral-300 tracking-wider">Username</label>
                  <input
                    type="text"
                    placeholder="e.g. rahul_s"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-neutral-600 focus:border-sky-400 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-neutral-300 tracking-wider">Email Address (Mandatory) *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    placeholder="e.g. rahul@gmail.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder:text-neutral-600 focus:border-sky-400 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-neutral-300 tracking-wider">Set Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    placeholder="Create a secure password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder:text-neutral-600 focus:border-sky-400 outline-none"
                    required
                  />
                </div>
              </div>
            </>
          )}

          {error && (
            <p className="text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl text-xs text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-400 hover:bg-sky-300 text-black font-bold uppercase tracking-wider py-3.5 rounded-xl transition-all shadow-lg shadow-sky-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <span>{loading ? 'Processing...' : isLogin ? 'Sign In to Dashboard' : 'Complete Registration'}</span>
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="pt-2 text-center border-t border-neutral-800/80">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            type="button"
            className="text-sky-400 text-xs font-semibold hover:text-white transition-colors cursor-pointer"
          >
            {isLogin ? "Need a new account? Register here" : "Already registered? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
};
