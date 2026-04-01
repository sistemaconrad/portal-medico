import React, { useState, useEffect } from 'react';
import { supabase } from '../App';
import {
  Search, Calendar, FileText, Upload, Clock, User,
  ChevronDown, ChevronUp, MessageSquare, CheckCircle,
  AlertCircle, Eye, Download, Filter, X
} from 'lucide-react';

interface Props { medicoId: string; modo: 'hoy' | 'todos'; }

interface Paciente {
  consulta_id: string;
  paciente_id: string;
  nombre: string;
  edad: string;
  telefono: string;
  fecha: string;
  hora: string;
  estudios: string[];
  numero_paciente: number;
  tiene_archivos: boolean;
  archivos: Archivo[];
  nota_medico: string;
}

interface Archivo {
  id: string;
  nombre_archivo: string;
  url: string;
  tipo: string;
  created_at: string;
}

const colorEstudio = (e: string) => {
  const up = e.toUpperCase();
  if (up.includes('TAC') || up.includes('TOMOG')) return 'bg-violet-100 text-violet-700 border-violet-200';
  if (up.includes('RX') || up.includes('RAYO')) return 'bg-blue-100 text-blue-700 border-blue-200';
  if (up.includes('USG') || up.includes('ULTRA')) return 'bg-cyan-100 text-cyan-700 border-cyan-200';
  if (up.includes('EKG') || up.includes('ELECTRO')) return 'bg-green-100 text-green-700 border-green-200';
  if (up.includes('MAMO')) return 'bg-pink-100 text-pink-700 border-pink-200';
  if (up.includes('LAB') || up.includes('LABORA')) return 'bg-amber-100 text-amber-700 border-amber-200';
  if (up.includes('PAP')) return 'bg-rose-100 text-rose-700 border-rose-200';
  return 'bg-gray-100 text-gray-600 border-gray-200';
};

export const PacientesTab: React.FC<Props> = ({ medicoId, modo }) => {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [filtrados, setFiltrados] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => {
    const gt = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Guatemala' }));
    return `${gt.getFullYear()}-${String(gt.getMonth() + 1).padStart(2, '0')}-${String(gt.getDate()).padStart(2, '0')}`;
  });
  const [expandido, setExpandido] = useState<string | null>(null);
  const [notaEditar, setNotaEditar] = useState<{ id: string; texto: string } | null>(null);
  const [guardandoNota, setGuardandoNota] = useState(false);
  const [pdfViendo, setPdfViendo] = useState<string | null>(null);

  useEffect(() => {
    cargarPacientes();
  }, [modo, fechaSeleccionada, medicoId]);

  useEffect(() => {
    let f = [...pacientes];
    if (busqueda) f = f.filter(p =>
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.numero_paciente.toString().includes(busqueda)
    );
    setFiltrados(f);
  }, [pacientes, busqueda]);

  const cargarPacientes = async () => {
    setLoading(true);
    try {
      // Obtener IDs de pacientes visibles para este médico
      const { data: visibles } = await supabase
        .from('portal_pacientes_visibles')
        .select('consulta_id')
        .eq('medico_id', medicoId);

      const consultaIds = (visibles || []).map((v: any) => v.consulta_id);
      if (consultaIds.length === 0) { setPacientes([]); setLoading(false); return; }

      let query = supabase
        .from('consultas')
        .select(`id, numero_paciente, fecha, created_at,
          pacientes (id, nombre, edad, edad_valor, edad_tipo, telefono),
          detalle_consultas (sub_estudios (nombre, estudios (nombre)))`)
        .in('id', consultaIds)
        .or('anulado.is.null,anulado.eq.false')
        .order('fecha', { ascending: false })
        .order('numero_paciente', { ascending: true });

      if (modo === 'hoy') {
        query = query.eq('fecha', fechaSeleccionada);
      }

      const { data: consultas } = await query;

      const lista = await Promise.all((consultas || []).map(async (c: any) => {
        const [{ data: archivosRaw }, { data: notaRaw }] = await Promise.all([
          supabase.from('archivos_estudios').select('id, nombre_archivo, archivo_url, tipo_archivo, created_at')
            .eq('consulta_id', c.id),
          supabase.from('portal_notas_medico').select('nota')
            .eq('consulta_id', c.id).eq('medico_id', medicoId).maybeSingle(),
        ]);

        const archivos: Archivo[] = (archivosRaw || []).map((a: any) => ({
          id: a.id,
          nombre_archivo: a.nombre_archivo || 'Archivo PDF',
          url: a.archivo_url,
          tipo: a.tipo_archivo || 'pdf',
          created_at: a.created_at,
        }));

        return {
          consulta_id: c.id,
          paciente_id: c.pacientes?.id || '',
          nombre: c.pacientes?.nombre || 'Sin nombre',
          edad: c.pacientes?.edad_valor && c.pacientes?.edad_tipo
            ? `${c.pacientes.edad_valor} ${c.pacientes.edad_tipo}`
            : `${c.pacientes?.edad || '?'} años`,
          telefono: c.pacientes?.telefono || '',
          fecha: c.fecha,
          hora: new Date(c.created_at).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: false }),
          estudios: (c.detalle_consultas || []).map((d: any) => d.sub_estudios?.nombre).filter(Boolean),
          numero_paciente: c.numero_paciente || 0,
          tiene_archivos: archivos.length > 0,
          archivos,
          nota_medico: notaRaw?.nota || '',
        };
      }));

      setPacientes(lista);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const guardarNota = async () => {
    if (!notaEditar) return;
    setGuardandoNota(true);
    try {
      await supabase.from('portal_notas_medico').upsert({
        consulta_id: notaEditar.id,
        medico_id: medicoId,
        nota: notaEditar.texto,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'consulta_id,medico_id' });

      setPacientes(prev => prev.map(p =>
        p.consulta_id === notaEditar.id ? { ...p, nota_medico: notaEditar.texto } : p
      ));
      setNotaEditar(null);
    } catch (e) { console.error(e); }
    setGuardandoNota(false);
  };

  return (
    <div>
      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5">
        <div className="flex flex-col sm:flex-row gap-3">
          {modo === 'hoy' && (
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
              <Calendar size={15} className="text-indigo-500 shrink-0" />
              <input type="date" value={fechaSeleccionada}
                onChange={e => setFechaSeleccionada(e.target.value)}
                className="bg-transparent text-sm text-gray-700 focus:outline-none" />
            </div>
          )}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 flex-1">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input type="text" placeholder="Buscar por nombre o número..." value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="bg-transparent text-sm text-gray-700 flex-1 focus:outline-none placeholder-gray-400" />
          </div>
        </div>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Pacientes', value: filtrados.length, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
          { label: 'Con PDF', value: filtrados.filter(p => p.tiene_archivos).length, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
          { label: 'Con notas', value: filtrados.filter(p => p.nota_medico).length, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-3 text-center`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Lista */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-50">
          <User size={16} className="text-indigo-500" />
          <h2 className="font-bold text-gray-800 text-sm">
            {modo === 'hoy'
              ? `Pacientes del ${new Date(fechaSeleccionada + 'T12:00').toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long' })}`
              : 'Historial completo de pacientes'}
          </h2>
          <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">{filtrados.length}</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-indigo-100 border-t-indigo-600" style={{ borderWidth: 3 }} />
            <p className="text-sm text-gray-400">Cargando pacientes...</p>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-20">
            <div className="bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <User size={28} className="text-gray-300" />
            </div>
            <p className="font-semibold text-gray-400">No hay pacientes disponibles</p>
            <p className="text-sm text-gray-300 mt-1">
              {modo === 'hoy' ? 'Intenta cambiar la fecha' : 'No hay registros aún'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtrados.map(p => (
              <div key={p.consulta_id}>
                {/* Fila principal */}
                <div className="px-6 py-4 hover:bg-gray-50/60 transition-colors">
                  <div className="flex items-center gap-4">
                    {/* Número */}
                    <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white"
                      style={{ background: 'linear-gradient(135deg, #3730a3, #4f46e5)' }}>
                      {p.numero_paciente}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900 text-sm">{p.nombre}</span>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-500">{p.edad}</span>
                        {modo === 'todos' && (
                          <>
                            <span className="text-xs text-gray-400">·</span>
                            <span className="text-xs text-gray-400">{new Date(p.fecha + 'T12:00').toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {p.estudios.map((e, i) => (
                          <span key={i} className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colorEstudio(e)}`}>{e}</span>
                        ))}
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="hidden sm:flex items-center gap-2 shrink-0">
                      {p.tiene_archivos && (
                        <span className="flex items-center gap-1 text-xs bg-violet-50 text-violet-600 border border-violet-100 px-2.5 py-1 rounded-full font-medium">
                          <FileText size={11} /> PDF
                        </span>
                      )}
                      {p.nota_medico && (
                        <span className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-600 border border-emerald-100 px-2.5 py-1 rounded-full font-medium">
                          <MessageSquare size={11} /> Nota
                        </span>
                      )}
                    </div>

                    {/* Expandir */}
                    <button
                      onClick={() => setExpandido(expandido === p.consulta_id ? null : p.consulta_id)}
                      className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all">
                      {expandido === p.consulta_id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Panel expandido */}
                {expandido === p.consulta_id && (
                  <div className="px-6 pb-5 bg-gray-50/50 border-t border-gray-100">
                    <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">

                      {/* PDFs */}
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <FileText size={12} /> Archivos PDF
                        </h4>
                        {p.archivos.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">Sin archivos subidos aún.</p>
                        ) : (
                          <div className="space-y-2">
                            {p.archivos.map(a => (
                              <div key={a.id} className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5">
                                <FileText size={14} className="text-red-500 shrink-0" />
                                <span className="text-xs text-gray-700 flex-1 truncate">{a.nombre_archivo}</span>
                                <a href={a.url} target="_blank" rel="noopener noreferrer"
                                  className="text-indigo-600 hover:text-indigo-800 transition-colors">
                                  <Eye size={14} />
                                </a>
                                <a href={a.url} download
                                  className="text-gray-400 hover:text-gray-700 transition-colors">
                                  <Download size={14} />
                                </a>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Nota del médico */}
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <MessageSquare size={12} /> Mi nota / comentario
                        </h4>
                        {notaEditar?.id === p.consulta_id ? (
                          <div>
                            <textarea
                              value={notaEditar.texto}
                              onChange={e => setNotaEditar({ ...notaEditar, texto: e.target.value })}
                              rows={3}
                              placeholder="Escribe tu nota o comentario sobre este paciente..."
                              className="w-full text-sm border border-indigo-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                            />
                            <div className="flex gap-2 mt-2">
                              <button onClick={guardarNota} disabled={guardandoNota}
                                className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-all">
                                {guardandoNota ? 'Guardando...' : 'Guardar nota'}
                              </button>
                              <button onClick={() => setNotaEditar(null)}
                                className="px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-500 hover:bg-gray-100 transition-all">
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            {p.nota_medico ? (
                              <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5 text-sm text-gray-700 leading-relaxed">
                                {p.nota_medico}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 italic mb-2">Sin nota agregada.</p>
                            )}
                            <button
                              onClick={() => setNotaEditar({ id: p.consulta_id, texto: p.nota_medico })}
                              className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition-colors flex items-center gap-1">
                              <MessageSquare size={12} />
                              {p.nota_medico ? 'Editar nota' : 'Agregar nota'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
