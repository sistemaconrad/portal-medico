import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export { supabase };

export type Session = {
  medico_id: string;
  medico_nombre: string;
  email: string;
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const resolverMedico = async (email: string) => {
    const { data } = await supabase
      .from('portal_medicos_acceso')
      .select('medico_id, email, activo')
      .eq('email', email)
      .eq('activo', true)
      .single();

    if (data) {
      const { data: medico } = await supabase
        .from('medicos')
        .select('nombre')
        .eq('id', data.medico_id)
        .single();

      setSession({
        medico_id: data.medico_id,
        medico_nombre: medico?.nombre || email,
        email,
      });
    } else {
      await supabase.auth.signOut();
      setSession(null);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (s?.user) {
        await resolverMedico(s.user.email!);
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (s?.user) {
        await resolverMedico(s.user.email!);
      } else {
        setSession(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-300 border-t-white mx-auto mb-4" />
          <p className="text-indigo-200 text-sm">Cargando portal...</p>
        </div>
      </div>
    );
  }

  if (!session) return <LoginPage />;

  return <DashboardPage session={session} onLogout={handleLogout} />;
}
