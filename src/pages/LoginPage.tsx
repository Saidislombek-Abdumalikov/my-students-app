import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Lock, User, Eye, EyeOff, ShieldCheck, Sparkles, BookOpen } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Iltimos, login va parolni kiriting.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const success = await login(username, password);
      if (success) {
        navigate('/', { replace: true });
      } else {
        setError("Login yoki parol noto'g'ri. Qaytadan urinib ko'ring.");
      }
    } catch (err) {
      console.error('Login error:', err);
      setError("Tizimga kirishda xatolik yuz berdi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background Glow Elements */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 z-10 animate-fade-in">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/20 mb-2">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-100">
            O'quv Markaz Tizimiga Kirish
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Tizimdan foydalanish uchun shaxsiy login va parolingizni kiriting
          </p>
        </div>

        {/* Login Form Card */}
        <Card className="bg-slate-900/90 border-slate-800 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs font-semibold animate-shake flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0 animate-ping" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>Login / Foydalanuvchi Nomi</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="masalan: 1 yoki english"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-semibold text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                autoComplete="username"
                required
              />
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Parol</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-semibold text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all pr-10"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              className="w-full py-3 text-sm font-extrabold shadow-lg shadow-emerald-600/20 mt-2"
            >
              Tizimga Kirish
            </Button>
          </form>

          {/* Preset Account Badges */}
          <div className="border-t border-slate-800/80 pt-4 space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Tezkor Kirish Akkountlari:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('1', 'saidislomadmin1')}
                className="p-2 rounded-lg bg-slate-950 border border-amber-500/30 hover:border-amber-500 text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center space-x-1 text-[11px] font-bold text-amber-400">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Admin</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                  1 / saidislom...
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('english', '1')}
                className="p-2 rounded-lg bg-slate-950 border border-emerald-500/30 hover:border-emerald-500 text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center space-x-1 text-[11px] font-bold text-emerald-400">
                  <Sparkles className="w-3 h-3" />
                  <span>English</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                  english / 1
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('math', '1')}
                className="p-2 rounded-lg bg-slate-950 border border-blue-500/30 hover:border-blue-500 text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center space-x-1 text-[11px] font-bold text-blue-400">
                  <Sparkles className="w-3 h-3" />
                  <span>Math</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                  math / 1
                </div>
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
