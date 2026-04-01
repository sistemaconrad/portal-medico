import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Stethoscope, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modo, setModo] = useState<'login' | 'reset'>('login');
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError('Correo o contraseña incorrectos. Verifica tus datos.');
    }
    setLoading(false);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (err) setError('No se pudo enviar el correo. Intenta de nuevo.');
    else setResetSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #312e81 100%)' }}>

      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div key={i}
            className="absolute rounded-full opacity-5"
            style={{
              width: `${120 + i * 80}px`, height: `${120 + i * 80}px`,
              background: 'white',
              top: `${10 + i * 12}%`, left: `${5 + i * 15}%`,
            }} />
        ))}
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
            <Stethoscope size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Portal Médico</h1>
          <p className="text-indigo-300 mt-2 text-sm">Acceso exclusivo para médicos referentes</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl p-8 shadow-2xl"
          style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.15)' }}>

          {modo === 'login' ? (
            <>
              <h2 className="text-white font-semibold text-lg mb-6">Iniciar sesión</h2>
              {error && (
                <div className="flex items-center gap-2 bg-red-500/20 border border-red-400/30 text-red-300 rounded-xl px-4 py-3 mb-5 text-sm">
                  <AlertCircle size={15} /> {error}
                </div>
              )}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-indigo-200 text-xs font-medium mb-1.5 block">Correo electrónico</label>
                  <div className="flex items-center gap-3 rounded-xl px-4 py-3"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
                    <Mail size={16} className="text-indigo-300 shrink-0" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="doctor@ejemplo.com" required
                      className="bg-transparent text-white placeholder-indigo-400 text-sm flex-1 focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-indigo-200 text-xs font-medium mb-1.5 block">Contraseña</label>
                  <div className="flex items-center gap-3 rounded-xl px-4 py-3"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
                    <Lock size={16} className="text-indigo-300 shrink-0" />
                    <input type={showPass ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••" required
                      className="bg-transparent text-white placeholder-indigo-400 text-sm flex-1 focus:outline-none" />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="text-indigo-400 hover:text-white transition-colors">
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all mt-2"
                  style={{ background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                  {loading ? 'Ingresando...' : 'Ingresar al Portal'}
                </button>
              </form>
              <button onClick={() => { setModo('reset'); setError(''); }}
                className="w-full text-center text-indigo-400 hover:text-indigo-200 text-xs mt-4 transition-colors">
                ¿Olvidaste tu contraseña?
              </button>
            </>
          ) : (
            <>
              <h2 className="text-white font-semibold text-lg mb-2">Recuperar contraseña</h2>
              <p className="text-indigo-300 text-xs mb-5">Te enviaremos un enlace para restablecer tu contraseña.</p>
              {resetSent ? (
                <div className="bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 rounded-xl px-4 py-4 text-sm text-center">
                  ✅ Revisa tu correo. Te enviamos el enlace para restablecer tu contraseña.
                </div>
              ) : (
                <>
                  {error && (
                    <div className="flex items-center gap-2 bg-red-500/20 border border-red-400/30 text-red-300 rounded-xl px-4 py-3 mb-4 text-sm">
                      <AlertCircle size={15} /> {error}
                    </div>
                  )}
                  <form onSubmit={handleReset} className="space-y-4">
                    <div className="flex items-center gap-3 rounded-xl px-4 py-3"
                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
                      <Mail size={16} className="text-indigo-300 shrink-0" />
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="Tu correo registrado" required
                        className="bg-transparent text-white placeholder-indigo-400 text-sm flex-1 focus:outline-none" />
                    </div>
                    <button type="submit" disabled={loading}
                      className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all"
                      style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                      {loading ? 'Enviando...' : 'Enviar enlace'}
                    </button>
                  </form>
                </>
              )}
              <button onClick={() => { setModo('login'); setError(''); setResetSent(false); }}
                className="w-full text-center text-indigo-400 hover:text-indigo-200 text-xs mt-4 transition-colors">
                ← Volver al inicio de sesión
              </button>
            </>
          )}
        </div>

        <p className="text-center text-indigo-500 text-xs mt-6">
          Acceso restringido. Solo médicos autorizados.
        </p>
      </div>
    </div>
  );
};
