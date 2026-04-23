import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Share2, Link, Loader2, LogOut, Heart } from 'lucide-react';

export default function MatchScreen() {
  const { profile, joinMatch, signOut, isLoading, error } = useAuthStore();
  const [matchCodeInput, setMatchCodeInput] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (profile?.match_code) {
      navigator.clipboard.writeText(profile.match_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (matchCodeInput.trim()) {
      joinMatch(matchCodeInput.trim());
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-6 page-enter-active overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-20">
        <div className="text-slate-900 font-serif font-black text-2xl tracking-tighter">todoXvos</div>
        <button 
          onClick={signOut}
          className="text-slate-400 hover:text-red-500 transition-all p-3 rounded-2xl hover:bg-white shadow-sm"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      <div className="glass w-full max-w-md p-10 rounded-[3rem] relative overflow-hidden border-white">
        {/* Decorative blur elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-100 rounded-full mix-blend-multiply filter blur-[80px] opacity-40"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-200 rounded-full mix-blend-multiply filter blur-[80px] opacity-40"></div>

        <div className="relative z-10">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl border border-rose-50">
              <Heart className="text-brand-red w-8 h-8 fill-brand-red" />
            </div>
          </div>

          <h2 className="text-3xl font-serif font-black text-slate-900 mb-2 text-center leading-tight">¡Hola, {profile?.display_name}!</h2>
          <p className="text-slate-500 text-center mb-10 text-sm font-medium leading-relaxed">
            Para empezar a jugar, necesitás emparejarte con tu pareja. Podés compartirle tu código o ingresar el suyo.
          </p>

          {/* Compartir Código */}
          <div className="bg-white border border-rose-50 p-8 rounded-[2rem] mb-10 shadow-lg shadow-rose-500/5">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Tu Código de Match</span>
              <div className="text-5xl font-black text-brand-red tracking-[0.1em] mb-6 font-serif">
                {profile?.match_code}
              </div>
              <button 
                onClick={handleCopyCode}
                className="flex items-center space-x-2 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-brand-red px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 border border-slate-100"
              >
                {copied ? <span className="text-green-500 font-black">¡Copiado!</span> : <><Share2 className="w-4 h-4" /> <span>Copiar Código</span></>}
              </button>
            </div>
          </div>

          <div className="relative flex py-2 items-center mb-10">
            <div className="flex-grow border-t border-slate-100"></div>
            <span className="flex-shrink-0 mx-4 text-slate-300 text-[10px] font-black uppercase tracking-widest">O INGRESÁ EL DE TU PAREJA</span>
            <div className="flex-grow border-t border-slate-100"></div>
          </div>

          {/* Ingresar Código */}
          <form onSubmit={handleJoin} className="space-y-5">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <Link className="h-5 w-5 text-slate-300" />
              </div>
              <input
                type="text"
                value={matchCodeInput}
                onChange={(e) => setMatchCodeInput(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-5 py-4 text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-red/10 focus:border-brand-red/20 transition-all uppercase tracking-[0.3em] font-serif text-center text-xl"
                placeholder="CÓDIGO"
                maxLength={6}
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-500 p-4 rounded-2xl text-xs font-bold text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || matchCodeInput.length < 6}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest py-4 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center shadow-xl shadow-rose-600/20"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Emparejar y Jugar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
