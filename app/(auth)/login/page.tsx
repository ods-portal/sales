'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Eye, EyeOff, Sparkles } from 'lucide-react';

const valuePropTexts = [
  'Real-time visit tracking',
  'Automated follow-up alerts',
  'Role-based secure access',
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [shake, setShake] = useState(false);
  const [valuePropIndex, setValuePropIndex] = useState(0);
  const [valuePropVisible, setValuePropVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setValuePropVisible(false);
      setTimeout(() => {
        setValuePropIndex((i) => (i + 1) % valuePropTexts.length);
        setValuePropVisible(true);
      }, 400);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || isRedirecting) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setLoading(false);
        return;
      }
      setIsRedirecting(true);
      router.replace('/dashboard');
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  const isBusy = loading || isRedirecting;

  return (
    <div className="login-page">
      {/* Left panel */}
      <div className="login-left">
        <div className="login-blob absolute -right-20 -top-20 h-80 w-80 bg-indigo-500" />
        <div className="login-blob absolute -left-10 bottom-32 h-52 w-52 bg-violet-500" style={{ animationDelay: '-3s' }} />
        <div className="login-blob absolute bottom-0 right-32 h-40 w-40 bg-teal-400" style={{ animationDelay: '-5s' }} />

        <div className="login-left-content">
          <div className="flex items-center gap-3 text-white">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
              <Activity className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight">DSR CMS</div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-indigo-300/70">Sales Portal</div>
            </div>
          </div>

          <div className="hidden flex-1 flex-col justify-center md:flex">
            <h1 className="mb-4 text-4xl font-extrabold leading-tight tracking-tight text-white lg:text-[2.75rem]">
              Track Every Visit.<br />Grow Every Relationship.
            </h1>
            <p className="mb-10 text-base text-indigo-200/80">
              Your complete field sales intelligence platform.
            </p>

            <div className="flex flex-col gap-4">
              <div
                className={`flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-white backdrop-blur-md transition-all duration-400 ${valuePropVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
              >
                <Sparkles className="h-5 w-5 shrink-0 text-indigo-300" />
                <span className="font-medium">{valuePropTexts[valuePropIndex]}</span>
              </div>
              <div className="flex gap-1.5">
                {valuePropTexts.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === valuePropIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/40'}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <p className="hidden text-xs text-slate-500 md:block">© 2026 DSR CMS · v1.0.0</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="login-right">
        <div className="login-form-card">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand">Welcome Back</p>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="mt-7">
            <div className="mb-4">
              <label className="input-label" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                required
                autoComplete="email"
              />
            </div>

            <div className="mb-4">
              <label className="input-label" htmlFor="password">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-12"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="mb-2 flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-500">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="rounded" />
                Remember me
              </label>
              <a href="#" className="text-[13px] font-semibold text-brand hover:underline">Forgot password?</a>
            </div>

            {error && (
              <div className={`mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700 ${shake ? 'animate-[shake_0.4s_ease]' : ''}`}>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-full btn-lg mt-5" disabled={isBusy} aria-busy={isBusy}>
              {isRedirecting ? 'Redirecting...' : loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-5 text-center text-[13px] text-slate-500">
            Need help? Contact your <strong className="text-slate-700">Super Admin</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
