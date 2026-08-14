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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 text-white shadow-md mb-2">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            O'quv Markaz Tizimiga Kirish
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Tizimdan foydalanish uchun shaxsiy login va parolingizni kiriting
          </p>
        </div>

        {/* Login Form Card */}
        <Card className="bg-white border border-slate-200 p-6 sm:p-8 shadow-md space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-600 flex-shrink-0 animate-ping" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>Login / Foydalanuvchi Nomi</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="masalan: 1 yoki english"
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all"
                autoComplete="username"
                required
              />
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Parol</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all pr-10"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1"
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
              className="w-full py-3 text-sm font-extrabold shadow-md mt-2"
            >
              Tizimga Kirish
            </Button>
          </form>

          {/* Preset Account Badges */}
          <div className="border-t border-slate-200 pt-4 space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Tezkor Kirish Akkountlari:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('1', 'saidislomadmin1')}
                className="p-2 rounded-lg bg-amber-50 border border-amber-200 hover:border-amber-400 text-left transition-all cursor-pointer"
              >
                <div className="flex items-center space-x-1 text-[11px] font-bold text-amber-700">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span>Admin</span>
                </div>
                <div className="text-[10px] text-amber-800 font-mono mt-0.5 truncate font-semibold">
                  1 / saidislom...
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('english', '1')}
                className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 hover:border-emerald-400 text-left transition-all cursor-pointer"
              >
                <div className="flex items-center space-x-1 text-[11px] font-bold text-emerald-700">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>English</span>
                </div>
                <div className="text-[10px] text-emerald-800 font-mono mt-0.5 truncate font-semibold">
                  english / 1
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('math', '1')}
                className="p-2 rounded-lg bg-blue-50 border border-blue-200 hover:border-blue-400 text-left transition-all cursor-pointer"
              >
                <div className="flex items-center space-x-1 text-[11px] font-bold text-blue-700">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Math</span>
                </div>
                <div className="text-[10px] text-blue-800 font-mono mt-0.5 truncate font-semibold">
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
