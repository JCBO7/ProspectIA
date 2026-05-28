"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Megaphone, Plus, Loader2, CheckCircle, Clock, PlayCircle, PauseCircle } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  BORRADOR: { label: "Borrador", color: "text-gray-400 bg-gray-700/50", icon: <Clock size={12} /> },
  PROGRAMADA: { label: "Programada", color: "text-amber-400 bg-amber-500/10", icon: <Clock size={12} /> },
  EN_CURSO: { label: "En curso", color: "text-cyan-400 bg-cyan-500/10", icon: <PlayCircle size={12} /> },
  PAUSADA: { label: "Pausada", color: "text-orange-400 bg-orange-500/10", icon: <PauseCircle size={12} /> },
  COMPLETADA: { label: "Completada", color: "text-emerald-400 bg-emerald-500/10", icon: <CheckCircle size={12} /> },
};

const CANAL_ICONS: Record<string, string> = {
  WHATSAPP: "💬", EMAIL: "📧", SMS: "📱", LINKEDIN: "💼", LLAMADA: "📞",
};

export default function CampanasPage() {
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ nombre: "", canal: "EMAIL", mensaje: "", asunto: "" });
  const [saving, setSaving] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ["campanas"],
    queryFn: async () => {
      const res = await fetch("/api/campanas");
      return res.json();
    },
  });

  const campanas = data?.campanas || [];

  async function crearCampana() {
    if (!form.nombre || !form.mensaje) return;
    setSaving(true);
    try {
      await fetch("/api/campanas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setShowNew(false);
      setForm({ nombre: "", canal: "EMAIL", mensaje: "", asunto: "" });
      refetch();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Campañas de Outreach</h1>
          <p className="text-gray-500 mt-1">Envíos masivos multicanal con seguimiento automático</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Nueva campaña
        </button>
      </div>

      {/* Nueva campaña form */}
      {showNew && (
        <div className="card-dark p-5 space-y-4 border-cyan-500/20">
          <h3 className="font-semibold text-white">Nueva campaña</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nombre de la campaña</label>
              <input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej: Campaña restaurantes enero"
                className="input-dark w-full text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Canal</label>
              <select
                value={form.canal}
                onChange={(e) => setForm({ ...form, canal: e.target.value })}
                className="input-dark w-full text-sm"
              >
                <option value="EMAIL">Email</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="SMS">SMS</option>
                <option value="LINKEDIN">LinkedIn</option>
                <option value="LLAMADA">Llamada</option>
              </select>
            </div>
          </div>
          {form.canal === "EMAIL" && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Asunto del email</label>
              <input
                value={form.asunto}
                onChange={(e) => setForm({ ...form, asunto: e.target.value })}
                placeholder="Asunto del correo"
                className="input-dark w-full text-sm"
              />
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Mensaje</label>
            <textarea
              value={form.mensaje}
              onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
              placeholder="Contenido del mensaje..."
              className="input-dark w-full text-sm resize-none h-24"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowNew(false)} className="btn-ghost text-sm">Cancelar</button>
            <button onClick={crearCampana} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {saving ? "Creando..." : "Crear campaña"}
            </button>
          </div>
        </div>
      )}

      {/* Campaigns list */}
      {campanas.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <Megaphone size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay campañas todavía</p>
          <p className="text-xs mt-1">Crea tu primera campaña para comenzar a contactar prospectos en masa</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campanas.map((c: Record<string, unknown>) => {
            const statusKey = c.status as string;
            const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.BORRADOR;
            return (
              <div key={c.id as string} className="card-dark p-4 hover:border-gray-700 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{CANAL_ICONS[c.canal as string] || "📨"}</span>
                    <div>
                      <h3 className="font-semibold text-white">{c.nombre as string}</h3>
                      <p className="text-xs text-gray-500">{c.canal as string} · {(c._count as Record<string, number>)?.prospectos || 0} prospectos</p>
                    </div>
                  </div>
                  <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${statusCfg.color}`}>
                    {statusCfg.icon}
                    {statusCfg.label}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-2 line-clamp-2">{c.mensaje as string}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
