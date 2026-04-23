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
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 page-enter-active">
      <div className="glass w-full max-w-md p-8 rounded-3xl relative overflow-hidden">
        {/* Decorative blur elements */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-brand-red rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6 shadow-lg backdrop-blur-md border border-white/20">
            <Heart className="text-brand-red w-8 h-8 fill-brand-red" />
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">todoXvos</h1>
          <p className="text-slate-400 text-center mb-8">El juego donde los favores y retos se pagan con amor.</p>

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">
                ¿Cómo te llamás?
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-red/50 transition-all"
                placeholder="Tu nombre o apodo"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="w-full bg-brand-red hover:bg-red-600 text-white font-medium py-3 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center shadow-lg shadow-brand-red/25"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar al Juego'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
