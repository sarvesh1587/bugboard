import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import Mascot from '../components/Mascot';
import { Blobs, Field, Logo, RevealText, Segmented, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { errMsg, fieldErrors } from '../api/client';

const DEMOS = [
  ['Admin', 'admin@bugboard.dev'],
  ['Developer', 'diya@bugboard.dev'],
  ['Tester', 'tara@bugboard.dev'],
];

export default function Auth({ mode }) {
  const isLogin = mode === 'login';
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'developer' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const redirect = location.state?.from || '/dashboard';
  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));
    setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!isLogin && form.name.trim().length < 2) e.name = 'Name must be at least 2 characters';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email';
    if (form.password.length < (isLogin ? 1 : 6)) e.password = isLogin ? 'Password is required' : 'At least 6 characters';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const u = isLogin ? await login(form.email, form.password) : await register(form);
      toast.success(`Welcome${isLogin ? ' back' : ''}, ${u.name.split(' ')[0]}`);
      navigate(redirect, { replace: true });
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (email) => {
    setForm((f) => ({ ...f, email, password: 'Password@123' }));
    setErrors({});
  };

  return (
    <div className="auth">
      <Blobs />
      <aside className="auth-art">
        <Link to="/" className="auth-logo"><Logo /></Link>
        <div className="auth-stage">
          <motion.div initial={{ y: -200, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 11, delay: 0.2 }}>
            <Mascot size={230} accessory={isLogin ? undefined : form.role === 'tester' ? 'magnifier' : 'glasses'} color={isLogin ? '#F25C3D' : form.role === 'tester' ? '#5CC98F' : '#6FB8FF'} />
          </motion.div>
          <h1 className="display auth-title">
            {isLogin ? (
              <>
                <RevealText text="Welcome" className="line" />
                <span className="line"><RevealText text="back," delay={0.12} /> <span className="pop">friend!</span></span>
              </>
            ) : (
              <>
                <RevealText text="Join the" className="line" />
                <span className="line"><span className="pop">bug hunt</span></span>
              </>
            )}
          </h1>
          <p className="auth-note">{isLogin ? 'Your open issues missed you.' : 'Pick a role — your ladybug changes with it.'}</p>
        </div>
      </aside>

      <main className="auth-main">
        <Link to="/" className="auth-logo-sm"><Logo /></Link>
        <motion.form className="auth-form" onSubmit={submit} noValidate initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 20 }}>
          <div>
            <h2 className="display" style={{ fontSize: 'clamp(34px, 4vw, 44px)' }}>
              {isLogin ? 'Sign in' : 'Create account'}
            </h2>
            <p className="dim" style={{ margin: '6px 0 0' }}>{isLogin ? 'Good to see you again.' : 'It takes less than a minute.'}</p>
          </div>

          {!isLogin && (
            <Field label="Full name" error={errors.name} htmlFor="name">
              <input id="name" className={`input ${errors.name ? 'has-error' : ''}`} value={form.name} onChange={set('name')} autoComplete="name" placeholder="Ada Lovelace" />
            </Field>
          )}
          <Field label="Email" error={errors.email} htmlFor="email">
            <input id="email" type="email" className={`input ${errors.email ? 'has-error' : ''}`} value={form.email} onChange={set('email')} autoComplete="email" placeholder="you@company.com" />
          </Field>
          <Field label="Password" error={errors.password} htmlFor="password">
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={show ? 'text' : 'password'}
                className={`input ${errors.password ? 'has-error' : ''}`}
                value={form.password}
                onChange={set('password')}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                placeholder="••••••••"
                style={{ paddingRight: 44 }}
              />
              <button type="button" className="pw-toggle" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
                {show ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </Field>
          {!isLogin && (
            <Field label="I am a">
              <Segmented id="role" options={[{ value: 'developer', label: 'Developer' }, { value: 'tester', label: 'Tester' }]} value={form.role} onChange={set('role')} />
            </Field>
          )}

          <button className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%' }}>
            {loading ? <Spinner /> : <>{isLogin ? 'Sign in' : 'Create account'} <ArrowRight /></>}
          </button>

          {isLogin && (
            <div className="demo-box">
              <span className="label">Quick demo login · Password@123</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {DEMOS.map(([role, email]) => (
                  <button type="button" key={email} className={`chip ${form.email === email ? 'active' : ''}`} onClick={() => fillDemo(email)}>{role}</button>
                ))}
              </div>
            </div>
          )}

          <p className="dim" style={{ margin: 0, textAlign: 'center' }}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <Link to={isLogin ? '/register' : '/login'} className="accent" style={{ fontWeight: 600 }}>
              {isLogin ? 'Sign up' : 'Sign in'}
            </Link>
          </p>
        </motion.form>
      </main>
    </div>
  );
}
