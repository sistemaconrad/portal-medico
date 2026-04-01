import React, { useState, useEffect } from 'react';
import { supabase } from '../App';
import {
  TrendingUp, DollarSign, Users, Calendar,
  BarChart2, ChevronDown, ChevronUp, Lock
} from 'lucide-react';

interface Props { medicoId: string; }

interface PeriodoStats {
  mes: string;
  total_pacientes: number;
  total_comision: number;
  aprobado: boolean;
  detalle: DetalleEstudio[];
}

interface DetalleEstudio {
  estudio: string;
  cantidad: number;
  comision: number;
}

export const EstadisticasTab: React.FC<Props> = ({ medicoId }) => {
  const [stats, setStats] = useState<PeriodoStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [totales, setTotales] = useState({ pacientes: 0, comision: 0 });

  useEffect(() => {
    cargarEstadisticas();
  }, [medicoId]);

  const cargarEstadisticas = async () => {
    setLoading(true);
    try {
      // Traer solo los períodos que el sanatorio ha aprobado mostrar
      const { data: periodos } = await supabase
        .from('portal_comisiones_aprobadas')
        .select('*')
        .eq('medico_id', medicoId)
        .order('periodo', { ascending: false });

      if (!periodos || periodos.length === 0) { setStats([]); setLoading(false); return; }

      const lista: PeriodoStats[] = [];
      let totalPac = 0, totalCom = 0;

      for (const p of periodos) {
        // Si está aprobado, calcular el detalle real desde consultas
        let detalle: DetalleEstudio[] = [];

        if (p.aprobado) {
          const [fechaInicio, fechaFin] = p.rango_fechas
            ? [p.rango_fechas.split('/')[0], p.rango_fechas.split('/')[1]]
            : [p.periodo + '-01', p.periodo + '-31'];

          const { data: consultas } = await supabase
            .from('consultas')
            .select(`
              detalle_consultas (
                precio,
                sub_estudios (
                  nombre,
                  estudios ( nombre, porcentaje_comision )
                )
              )
            `)
            .eq('medico_id', medicoId)
            .gte('fecha', fechaInicio)
            .lte('fecha', fechaFin)
            .or('anulado.is.null,anulado.eq.false')
            .neq('tipo_cobro', 'social');

          const estudiosMap = new Map<string, DetalleEstudio>();
          (consultas || []).forEach((c: any) => {
            (c.detalle_consultas || []).forEach((d: any) => {
              const nombre = d.sub_estudios?.estudios?.nombre || d.sub_estudios?.nombre || 'Otro';
              const pct = (d.sub_estudios?.estudios?.porcentaje_comision || 0) / 100;
              const comision = d.precio * pct;
              if (!estudiosMap.has(nombre)) {
                estudiosMap.set(nombre, { estudio: nombre, cantidad: 0, comision: 0 });
              }
              const actual = estudiosMap.get(nombre)!;
              actual.cantidad += 1;
              actual.comision += comision;
            });
          });
          detalle = Array.from(estudiosMap.values());
        }

        lista.push({
          mes: p.periodo,
          total_pacientes: p.total_pacientes || 0,
          total_comision: p.total_comision || 0,
          aprobado: p.aprobado,
          detalle,
        });

        if (p.aprobado) {
          totalPac += p.total_pacientes || 0;
          totalCom += p.total_comision || 0;
        }
      }

      setStats(lista);
      setTotales({ pacientes: totalPac, comision: totalCom });
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const formatQ = (n: number) => `Q${n.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const nombreMes = (periodo: string) => {
    const [año, mes] = periodo.split('-');
    const fecha = new Date(parseInt(año), parseInt(mes) - 1, 1);
    return fecha.toLocaleDateString('es-GT', { month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-indigo-100 border-t-indigo-600" style={{ borderWidth: 3 }} />
        <p className="text-sm text-gray-400">Cargando estadísticas...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Resumen general */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-indigo-100 rounded-xl p-2">
              <Users size={18} className="text-indigo-600" />
            </div>
            <span className="text-sm text-gray-500 font-medium">Total pacientes</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totales.pacientes}</p>
          <p className="text-xs text-gray-400 mt-1">Períodos aprobados</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-emerald-100 rounded-xl p-2">
              <DollarSign size={18} className="text-emerald-600" />
            </div>
            <span className="text-sm text-gray-500 font-medium">Total comisiones</span>
          </div>
          <p className="text-3xl font-bold text-emerald-700">{formatQ(totales.comision)}</p>
          <p className="text-xs text-gray-400 mt-1">Períodos aprobados</p>
        </div>
      </div>

      {/* Lista de períodos */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-50">
          <BarChart2 size={16} className="text-indigo-500" />
          <h2 className="font-bold text-gray-800 text-sm">Historial de comisiones por período</h2>
        </div>

        {stats.length === 0 ? (
          <div className="text-center py-20">
            <div className="bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <TrendingUp size={28} className="text-gray-300" />
            </div>
            <p className="font-semibold text-gray-400">Sin estadísticas disponibles</p>
            <p className="text-sm text-gray-300 mt-1">El sanatorio aún no ha publicado ningún período</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {stats.map(s => (
              <div key={s.mes}>
                <div
                  className={`px-6 py-4 flex items-center gap-4 transition-colors ${s.aprobado ? 'hover:bg-gray-50/60 cursor-pointer' : 'opacity-60'}`}
                  onClick={() => s.aprobado && setExpandido(expandido === s.mes ? null : s.mes)}>

                  {/* Mes */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-800 text-sm capitalize">{nombreMes(s.mes)}</span>
                      {s.aprobado ? (
                        <span className="text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                          Publicado
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                          <Lock size={10} /> Pendiente de aprobación
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{s.total_pacientes} pacientes referidos</p>
                  </div>

                  {/* Comisión */}
                  <div className="text-right shrink-0">
                    {s.aprobado ? (
                      <p className="font-bold text-emerald-700 text-base">{formatQ(s.total_comision)}</p>
                    ) : (
                      <p className="font-bold text-gray-400 text-base">••••••</p>
                    )}
                  </div>

                  {/* Chevron */}
                  {s.aprobado && (
                    <div className="shrink-0 text-gray-400">
                      {expandido === s.mes ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  )}
                </div>

                {/* Detalle expandido */}
                {expandido === s.mes && s.aprobado && (
                  <div className="px-6 pb-5 bg-gray-50/50 border-t border-gray-100">
                    <div className="pt-4">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Desglose por tipo de estudio</h4>
                      {s.detalle.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">No hay detalle disponible.</p>
                      ) : (
                        <div className="space-y-2">
                          {s.detalle.map((d, i) => (
                            <div key={i} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-2.5">
                              <span className="text-sm text-gray-700 flex-1">{d.estudio}</span>
                              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">{d.cantidad} pacientes</span>
                              <span className="text-sm font-semibold text-emerald-700">{formatQ(d.comision)}</span>
                            </div>
                          ))}
                          <div className="flex items-center gap-3 bg-indigo-50 rounded-xl border border-indigo-100 px-4 py-2.5 mt-3">
                            <span className="text-sm font-bold text-indigo-800 flex-1">Total del período</span>
                            <span className="text-sm font-bold text-indigo-800">{formatQ(s.total_comision)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center mt-4 px-4">
        Las comisiones solo son visibles una vez que el sanatorio las aprueba y publica. Para consultas, comunícate con administración.
      </p>
    </div>
  );
};
