import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Heart, Loader2 } from 'lucide-react';

export default function AuthScreen() {
  const { signUpAnonymously, isLoading, error } = useAuthStore();
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      signUpAnonymously(name.trim());
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-6 page-enter-active">
      <div className="glass w-full max-w-md p-10 rounded-[3rem] relative overflow-hidden border-white">
        {/* Decorative blur elements */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-rose-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40"></div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-xl border border-rose-50">
            <Heart className="text-brand-red w-8 h-8 fill-brand-red" />
          </div>
          
          <h1 className="text-4xl font-serif font-black text-slate-900 mb-2 tracking-tight">todoXvos</h1>
          <p className="text-slate-400 text-center font-medium mb-10 leading-relaxed">El juego donde los favores y retos se pagan con amor.</p>

          <form onSubmit={handleSubmit} className="w-full space-y-5">
            <div>
              <label htmlFor="name" className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">
                ¿Cómo te llamás?
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-red/10 focus:border-brand-red/20 transition-all font-medium"
                placeholder="Tu nombre o apodo"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-500 p-4 rounded-2xl text-xs font-bold">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="w-full bg-brand-red hover:bg-red-700 text-white font-black uppercase tracking-widest py-4 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center shadow-xl shadow-brand-red/20"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar al Juego'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
