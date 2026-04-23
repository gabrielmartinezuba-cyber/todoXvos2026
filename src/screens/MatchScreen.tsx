import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Share2, Link, Loader2, LogOut } from 'lucide-react';

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
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 page-enter-active">
      {/* Header */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-20">
        <div className="text-white font-bold text-xl tracking-tighter">todoXvos</div>
        <button 
          onClick={signOut}
          className="text-slate-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      <div className="glass w-full max-w-md p-8 rounded-3xl relative overflow-hidden">
        {/* Decorative blur elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600 rounded-full mix-blend-multiply filter blur-[80px] opacity-20"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-red rounded-full mix-blend-multiply filter blur-[80px] opacity-20"></div>

        <div className="relative z-10">
          <h2 className="text-2xl font-bold text-white mb-2 text-center">¡Hola, {profile?.display_name}!</h2>
          <p className="text-slate-400 text-center mb-8 text-sm">
            Para empezar a jugar, necesitás emparejarte con tu pareja. Podés compartirle tu código o ingresar el suyo.
          </p>

          {/* Compartir Código */}
          <div className="bg-slate-800/50 border border-white/5 p-6 rounded-2xl mb-8">
            <div className="flex flex-col items-center">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Tu Código de Match</span>
              <div className="text-4xl font-black text-white tracking-widest mb-4 font-mono">
                {profile?.match_code}
              </div>
              <button 
                onClick={handleCopyCode}
                className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-full text-sm font-medium transition-all active:scale-95"
              >
                {copied ? <span className="text-green-400">¡Copiado!</span> : <><Share2 className="w-4 h-4" /> <span>Copiar Código</span></>}
              </button>
            </div>
          </div>

          <div className="relative flex py-2 items-center mb-8">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink-0 mx-4 text-slate-500 text-sm font-medium">O INGRESÁ UNO</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          {/* Ingresar Código */}
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Link className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="text"
                value={matchCodeInput}
                onChange={(e) => setMatchCodeInput(e.target.value.toUpperCase())}
                className="w-full bg-slate-800/50 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all uppercase tracking-widest font-mono text-center"
                placeholder="CÓDIGO DE 6 LETRAS"
                maxLength={6}
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || matchCodeInput.length < 6}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3.5 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center shadow-lg shadow-indigo-600/25"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Emparejar y Jugar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
