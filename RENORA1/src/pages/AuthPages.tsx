import React, { useEffect, useState } from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { SUPPORTED_COUNTRIES } from '../utils/currency.ts';

export function SignInPage() {
  const { navigate, setSession } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        setError(data.error || 'Sign in failed.');
      } else {
        setSession(data.token, data.user);
        navigate(data.user.role === 'admin' ? '/admin' : '/dashboard');
      }
    } catch {
      setError('Network error while signing in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#F7F8FA] min-h-[75vh] py-14 px-4">
      <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-lg p-8 space-y-6">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold tracking-wider text-[#9A721C] uppercase">Customer Access</p>
          <h1 className="font-editorial text-3xl font-semibold text-[#0B192C]">Sign In to RENORA</h1>
          <p className="text-sm text-slate-600">
            Access your personal dashboard, profile preferences, and official announcements.
          </p>
        </div>

        {error && (
          <div className="p-3.5 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="signin-email" className="block text-xs font-semibold text-[#0B192C] mb-1.5">
              Email Address
            </label>
            <input
              id="signin-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0B192C]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="signin-password" className="block text-xs font-semibold text-[#0B192C]">
                Password
              </label>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-xs font-medium text-[#9A721C] hover:text-[#0B192C] cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
            <input
              id="signin-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0B192C]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 text-sm font-semibold text-white bg-[#0B192C] hover:bg-[#132642] rounded-md transition-colors disabled:opacity-60 cursor-pointer"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-200 text-center text-sm text-slate-600">
          New to RENORA?{' '}
          <button
            type="button"
            onClick={() => navigate('/register')}
            className="font-semibold text-[#0B192C] hover:text-[#9A721C] cursor-pointer"
          >
            Create an account
          </button>
        </div>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const { navigate, setSession, selectedCountry } = useApp();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState(selectedCountry || 'Ghana');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedCountryMeta = SUPPORTED_COUNTRIES.find((c) => c.name === country);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          country,
          phone,
          password,
          confirmPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not create account.');
      } else {
        setSession(data.token, data.user);
        navigate('/dashboard');
      }
    } catch {
      setError('Network error during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#F7F8FA] min-h-[80vh] py-14 px-4">
      <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-lg p-8 space-y-6">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold tracking-wider text-[#9A721C] uppercase">
            More Possibilities, Less Spending.
          </p>
          <h1 className="font-editorial text-3xl font-semibold text-[#0B192C]">
            Create Your RENORA Account
          </h1>
          <p className="text-sm text-slate-600">
            Register securely for product updates, regional availability notices, and personal dashboard access.
          </p>
        </div>

        {error && (
          <div className="p-3.5 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="reg-first" className="block text-xs font-semibold text-[#0B192C] mb-1.5">
                First Name
              </label>
              <input
                id="reg-first"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0B192C]"
              />
            </div>
            <div>
              <label htmlFor="reg-last" className="block text-xs font-semibold text-[#0B192C] mb-1.5">
                Last Name
              </label>
              <input
                id="reg-last"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0B192C]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="reg-email" className="block text-xs font-semibold text-[#0B192C] mb-1.5">
              Email Address
            </label>
            <input
              id="reg-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0B192C]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="reg-country" className="block text-xs font-semibold text-[#0B192C] mb-1.5">
                Country
              </label>
              <select
                id="reg-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-[#0B192C]"
              >
                {SUPPORTED_COUNTRIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="reg-phone" className="block text-xs font-semibold text-[#0B192C] mb-1.5">
                Phone Number (Optional)
              </label>
              <input
                id="reg-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={`${selectedCountryMeta?.dialCode || '+233'} ...`}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0B192C]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="reg-pass" className="block text-xs font-semibold text-[#0B192C] mb-1.5">
                Password
              </label>
              <input
                id="reg-pass"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0B192C]"
              />
            </div>
            <div>
              <label htmlFor="reg-confirm" className="block text-xs font-semibold text-[#0B192C] mb-1.5">
                Confirm Password
              </label>
              <input
                id="reg-confirm"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0B192C]"
              />
            </div>
          </div>

          <p className="text-xs text-slate-500 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[#9A721C] shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              By creating an account, you acknowledge our Privacy Policy, Terms and Conditions, and Responsible Participation guidelines.
            </span>
          </p>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 text-sm font-semibold text-white bg-[#0B192C] hover:bg-[#132642] rounded-md transition-colors disabled:opacity-60 cursor-pointer"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-200 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => navigate('/signin')}
            className="font-semibold text-[#0B192C] hover:text-[#9A721C] cursor-pointer"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}

export function ForgotPasswordPage() {
  const { navigate } = useApp();
  const [email, setEmail] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatusMsg('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not process request.');
      } else {
        setStatusMsg(
          data.smtpConfigured
            ? data.message
            : `${data.message} (Preview mode: check your server terminal output for the one-time reset link.)`
        );
      }
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#F7F8FA] min-h-[75vh] py-14 px-4">
      <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-lg p-8 space-y-6">
        <div className="space-y-1.5">
          <h1 className="font-editorial text-2xl font-semibold text-[#0B192C]">Reset Your Password</h1>
          <p className="text-sm text-slate-600">
            Enter your account email and we will send a one-time password reset link.
          </p>
        </div>

        {error && <div className="p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">{error}</div>}
        {statusMsg && (
          <div className="p-4 text-sm text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-md">
            {statusMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="forgot-email" className="block text-xs font-semibold text-[#0B192C] mb-1.5">
              Email Address
            </label>
            <input
              id="forgot-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0B192C]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 text-sm font-semibold text-white bg-[#0B192C] hover:bg-[#132642] rounded-md cursor-pointer"
          >
            {loading ? 'Sending Link...' : 'Send Reset Link'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => navigate('/signin')}
          className="block w-full text-center text-xs font-semibold text-slate-600 hover:text-[#0B192C] cursor-pointer"
        >
          Back to Sign In
        </button>
      </div>
    </div>
  );
}

export function ResetPasswordPage() {
  const { navigate } = useApp();
  const params = new URLSearchParams(window.location.search);
  const [token, setToken] = useState(params.get('token') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not reset password.');
      } else {
        setSuccess(data.message);
      }
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#F7F8FA] min-h-[75vh] py-14 px-4">
      <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-lg p-8 space-y-6">
        <h1 className="font-editorial text-2xl font-semibold text-[#0B192C]">Choose a New Password</h1>
        {error && <div className="p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">{error}</div>}
        {success && (
          <div className="p-4 text-sm text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-md space-y-3">
            <p>{success}</p>
            <button
              type="button"
              onClick={() => navigate('/signin')}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0B192C] rounded-md cursor-pointer"
            >
              Proceed to Sign In
            </button>
          </div>
        )}
        {!success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reset-token" className="block text-xs font-semibold text-[#0B192C] mb-1.5">
                Reset Token
              </label>
              <input
                id="reset-token"
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label htmlFor="reset-pass" className="block text-xs font-semibold text-[#0B192C] mb-1.5">
                New Password
              </label>
              <input
                id="reset-pass"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label htmlFor="reset-confirm" className="block text-xs font-semibold text-[#0B192C] mb-1.5">
                Confirm New Password
              </label>
              <input
                id="reset-confirm"
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 text-sm font-semibold text-white bg-[#0B192C] rounded-md cursor-pointer"
            >
              {loading ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function VerifyEmailPage() {
  const { navigate } = useApp();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your email address...');

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token') || '';
    if (!token) {
      setStatus('error');
      setMessage('Verification token is missing from the URL.');
      return;
    }

    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully.');
        } else {
          setStatus('error');
          setMessage(data.error || 'Verification failed.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Network error during email verification.');
      });
  }, []);

  return (
    <div className="bg-[#F7F8FA] min-h-[70vh] py-16 px-4">
      <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-lg p-8 text-center space-y-5">
        {status === 'success' && <CheckCircle2 className="w-10 h-10 text-emerald-700 mx-auto" />}
        <h1 className="font-editorial text-2xl font-semibold text-[#0B192C]">Email Verification</h1>
        <p className="text-sm text-slate-600">{message}</p>
        <button
          type="button"
          onClick={() => navigate('/signin')}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-[#0B192C] rounded-md cursor-pointer"
        >
          Go to Sign In
        </button>
      </div>
    </div>
  );
}
