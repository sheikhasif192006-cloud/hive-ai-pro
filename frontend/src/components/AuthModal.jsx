import React, { useState } from 'react';
import { X, Mail, Lock, User, Zap, Activity } from 'lucide-react';
import axios from 'axios';

const AuthModal = ({ isOpen, onClose, setUser, setCredits }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    try {
      const { data } = await axios.post(`${import.meta.env.VITE_API_URL}${endpoint}`, formData);
      localStorage.setItem('hive_token', data.token);
      setUser(data.user);
      setCredits(data.user.credits);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-4">
      <div className="bg-black/60 border border-[#00ff88]/30 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(0,255,136,0.2)] transition-all cyber-card relative">
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 p-4 opacity-20">
            <Activity size={100} className="text-[#00ff88]" />
        </div>

        <div className="p-8 border-b border-[#00ff88]/10 flex items-center justify-between relative z-10">
          <div>
            <h2 className="text-2xl font-black text-[#00ff88] italic uppercase tracking-tighter">
                {isLogin ? 'Initialize Session' : 'Create Identity'}
            </h2>
            <p className="text-[10px] text-[#00ff88]/40 font-bold uppercase tracking-[0.3em] mt-2">
                HIVE System Access v2.4
            </p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-[#00ff88]/10 rounded-full text-[#00ff88]/40 hover:text-[#00ff88] transition-all">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 relative z-10">
          {!isLogin && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#00ff88]/40 uppercase tracking-widest ml-4">Codename</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00ff88]/40" size={18} />
                <input 
                  type="text" 
                  placeholder="DESIGNER_X"
                  className="w-full bg-black/40 border border-[#00ff88]/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/10 focus:border-[#00ff88] transition-all outline-none text-sm font-bold italic"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-[#00ff88]/40 uppercase tracking-widest ml-4">Neural Link (Email)</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00ff88]/40" size={18} />
              <input 
                type="email" 
                placeholder="user@hive.ai"
                className="w-full bg-black/40 border border-[#00ff88]/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/10 focus:border-[#00ff88] transition-all outline-none text-sm font-bold italic"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-[#00ff88]/40 uppercase tracking-widest ml-4">Access Key (Password)</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00ff88]/40" size={18} />
              <input 
                type="password" 
                placeholder="••••••••"
                className="w-full bg-black/40 border border-[#00ff88]/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/10 focus:border-[#00ff88] transition-all outline-none text-sm font-bold italic"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-[10px] font-black uppercase text-center">{error}</p>}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-5 bg-[#00ff88] text-black rounded-2xl font-black uppercase italic tracking-[0.2em] shadow-[0_0_30px_#00ff88] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? 'Processing...' : (
                <>
                    <Zap size={20} fill="black" />
                    {isLogin ? 'Establish Link' : 'Register Identity'}
                </>
            )}
          </button>
        </form>

        <div className="p-8 bg-black/40 text-center border-t border-[#00ff88]/10 relative z-10">
          <p className="text-[10px] text-[#00ff88]/40 font-black uppercase tracking-[0.2em]">
            {isLogin ? "No identity found?" : "Already registered?"} 
            <button 
                onClick={() => setIsLogin(!isLogin)}
                className="ml-2 text-[#00ff88] hover:underline"
            >
                {isLogin ? "Sync New Account" : "Access Archive"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
