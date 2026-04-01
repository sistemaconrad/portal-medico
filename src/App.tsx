import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

export type Session = {
  medico_id: string;
  medico_nombre: string;
  email: string;
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar sesión activa de Supabase Auth
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

  const resolverMedico = async (email: string) => {
    // Buscar el médico vinculado a este email en la tabla portal_medicos_acceso
    const { data } = await supabase
      .from('portal_medicos_acceso')
      .select('medico_id, medicos(nombre)')
      .eq('email', email)
      .eq('activo', true)
      .single();

    if (data) {
      setSession({
        medico_id: data.medico_id,
        medico_nombre: (data.medicos as any)?.nombre || email,
        email,
      });
    } else {
      // Email no autorizado en el portal
      await supabase.auth.signOut();
      setSession(null);
    }
  };

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
