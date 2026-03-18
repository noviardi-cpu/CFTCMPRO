
import React, { useState } from 'react';
import { Database, Chrome } from 'lucide-react';
import { UserAccount } from '../types';
import { auth, googleProvider, signInWithPopup } from '../firebase';

interface Props {
  onLoginSuccess: (user: UserAccount) => void;
}

const LoginScreen: React.FC<Props> = ({ onLoginSuccess }) => {
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // The onAuthStateChanged listener in App.tsx will handle the rest
    } catch (error) {
      console.error("Google login error:", error);
      setError('Gagal login dengan Google.');
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

        {error && <p className="text-rose-500 text-xs font-bold text-center mb-4">{error}</p>}

        <div className="mt-8 pt-8 border-t border-purple-100">
           <button 
             onClick={handleGoogleLogin}
             className="w-full flex items-center justify-center gap-2 py-4 bg-white border border-slate-200 text-slate-700 font-black rounded-2xl hover:bg-slate-50 transition-all shadow-sm mb-4"
           >
              <Chrome className="w-5 h-5 text-blue-500" /> LOGIN DENGAN GOOGLE
           </button>
           <p className="text-[10px] text-purple-400 text-center mt-4 uppercase font-black tracking-widest">Login Google diperlukan untuk sinkronisasi antar perangkat.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
