
import React, { useState } from 'react';
import { supabase } from '../supabase';
import { useToast } from '../App';

interface AuthProps {
  onSuccess: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onSuccess }) => {
  const { showToast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) {
      setError(error.message);
      showToast(error.message, 'error');
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password
        });
        if (error) throw error;
        
        showToast('Registration successful! Check your email or try logging in.', 'success');
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-brand-black/40 p-8 rounded-[2rem] border-2 border-brand-orange/30 w-full animate-fade-in shadow-2xl font-sans">
      <h4 className="text-white font-heading text-xl uppercase mb-2 text-center">
        {isLogin ? 'Welcome Back' : 'Join the Club'}
      </h4>
      <p className="text-brand-gray-light text-[10px] uppercase font-black tracking-widest text-center mb-8 opacity-60">
        Skip paperwork on every ride.
      </p>

      <div className="space-y-4">
        <button
          onClick={handleGoogleLogin}
          type="button"
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white text-brand-black font-bold py-4 rounded-xl shadow-lg hover:bg-brand-gray-light transition-all disabled:opacity-50"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          <span className="text-xs uppercase tracking-wider">Continue with Google</span>
        </button>

        <div className="flex items-center gap-4 py-2">
          <div className="h-px bg-white/10 flex-grow"></div>
          <span className="text-[10px] text-brand-gray-light font-black uppercase opacity-30">OR</span>
          <div className="h-px bg-white/10 flex-grow"></div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-brand-black border border-brand-gray-dark/50 rounded-xl p-4 text-white w-full focus:ring-2 focus:ring-brand-orange outline-none transition-all placeholder:opacity-30"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-brand-black border border-brand-gray-dark/50 rounded-xl p-4 text-white w-full focus:ring-2 focus:ring-brand-orange outline-none transition-all placeholder:opacity-30"
            required
          />
          
          {error && <p className="text-red-500 text-[10px] font-bold uppercase text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-orange text-white font-heading tracking-widest py-4 rounded-xl uppercase shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50"
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Register'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            type="button"
            className="text-brand-teal text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors"
          >
            {isLogin ? "Need an account? Sign Up" : "Already registered? Login"}
          </button>
        </div>
      </div>
    </div>
  );
};
