import React, { useState, useEffect } from 'react';
import { Session } from '../App';
import { supabase } from '../App';
import { PacientesTab } from './PacientesTab';
import { EstadisticasTab } from './EstadisticasTab';
import {
  Stethoscope, LogOut, Users, BarChart2, Calendar,
  FileText, TrendingUp, Menu, X
} from 'lucide-react';

interface Props { session: Session; onLogout: () => void; }

export const DashboardPage: React.FC<Props> = ({ session, onLogout }) => {
  const [tab, setTab] = useState<'hoy' | 'todos' | 'estadisticas'>('hoy');
  const [menuOpen, setMenuOpen] = useState(false);

  const tabs = [
    { id: 'hoy', label: 'Pacientes de Hoy', icon: Calendar },
    { id: 'todos', label: 'Historial Completo', icon: Users },
    { id: 'estadisticas', label: 'Mis Estadísticas', icon: BarChart2 },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 50%, #4f46e5 100%)' }}
        className="shadow-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/15 rounded-xl p-2">
                <Stethoscope size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-white font-bold text-base leading-tight">Portal Médico</h1>
                <p className="text-indigo-200 text-xs">Dr. {session.medico_nombre}</p>
              </div>
            </div>
            <button onClick={onLogout}
              className="flex items-center gap-1.5 text-indigo-200 hover:text-white transition-colors text-sm px-3 py-1.5 rounded-lg hover:bg-white/10">
              <LogOut size={15} /> <span className="hidden sm:inline">Salir</span>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 overflow-x-auto pb-1">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  tab === t.id
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-indigo-200 hover:bg-white/10'
                }`}>
                <t.icon size={13} /> {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {tab === 'hoy' && <PacientesTab medicoId={session.medico_id} modo="hoy" />}
        {tab === 'todos' && <PacientesTab medicoId={session.medico_id} modo="todos" />}
        {tab === 'estadisticas' && <EstadisticasTab medicoId={session.medico_id} />}
      </main>
    </div>
  );
};
