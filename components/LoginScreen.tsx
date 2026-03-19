
import React, { useState } from 'react';
import { Database, LogIn, UserPlus } from 'lucide-react';
import { UserAccount } from '../types';
import { login, register } from '../services/authService';

interface Props {
  onLoginSuccess: (user: UserAccount) => void;
}

const LoginScreen: React.FC<Props> = ({ onLoginSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isRegistering) {
        const result = await register(email, password);
        if (result.success && result.user) {
          onLoginSuccess(result.user);
        } else {
          setError(result.message);
        }
      } else {
        const user = await login(email, password);
        if (user) {
          onLoginSuccess(user);
        } else {
          setError('Email atau password salah.');
        }
      }
    } catch (err) {
      setError('Terjadi kesalahan sistem.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-purple-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden opacity-30 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-300 blur-[120px] rounded-full animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-300 blur-[120px] rounded-full animate-pulse delay-1000"></div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl border border-purple-100 w-full max-w-md rounded-3xl shadow-2xl shadow-purple-200/50 p-8 relative z-10">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-purple-200">
             <Database className="w-8 h-8 text-tcm-primary" />
          </div>
          <h1 className="text-2xl font-black text-purple-950 uppercase tracking-tighter">TCM WuXing PRO</h1>
          <p className="text-purple-500 text-xs font-bold uppercase tracking-widest mt-1">Clinical Decision Support System</p>
        </div>

        {error && <p className="text-rose-500 text-xs font-bold text-center mb-4 bg-rose-50 p-2 rounded-lg border border-rose-100">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-purple-900 uppercase tracking-widest mb-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-sm focus:border-tcm-primary focus:ring-1 focus:ring-tcm-primary outline-none transition-all"
              placeholder="Masukkan email"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-purple-900 uppercase tracking-widest mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-sm focus:border-tcm-primary focus:ring-1 focus:ring-tcm-primary outline-none transition-all"
              placeholder="Masukkan password"
            />
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-4 bg-tcm-primary text-white font-black rounded-2xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-900/20 mt-6 disabled:opacity-50"
          >
             {isRegistering ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
             {isRegistering ? 'DAFTAR AKUN BARU' : 'LOGIN SEKARANG'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
            className="text-xs text-purple-600 font-bold hover:text-purple-800 transition-colors uppercase tracking-widest"
          >
            {isRegistering ? 'Sudah punya akun? Login di sini' : 'Belum punya akun? Daftar gratis'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
