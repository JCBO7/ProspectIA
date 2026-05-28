"use client";
import { useState } from "react";
import { X, Sparkles, Send, Loader2, Check, AlertCircle, Users } from "lucide-react";
import type { ProspectoData } from "@/types";

const CANALES_MASIVO = [
  { id: "EMAIL",    label: "Email",    icon: "📧", requiere: "email"    },
  { id: "WHATSAPP", label: "WhatsApp", icon: "💬", requiere: "telefono" },
] as const;

interface Props {
  prospectos: ProspectoData[];
  onClose: () => void;
}

interface ResultadoEnvio {
  enviados: number;
  errores: number;
  total: number;
  resultados: Array<{ empresa: string; ok: boolean; error?: string }>;
}

export function EnvioMasivo({ prospectos, onClose }: Props) {
  const [canal, setCanal] = useState("EMAIL");
  const [descripcionNegocio, setDescripcionNegocio] = useState("");
  const [propuestaValor, setPropuestaValor] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [asunto, setAsunto] = useState("");
  const [generando, setGenerando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoEnvio | null>(null);
  const [error, setError] = useState<string | null>(null);

  const aptos = prospectos.filter((p) =>
    canal === "EMAIL" ? !!p.email : !!p.telefono
  );

  async function generarMensaje() {
    if (!descripcionNegocio.trim()) return;
    setGenerando(true);
    setError(null);
    try {
      const res = await fetch("/api/mensajes/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descripcionNegocio,
          prospecto: prospectos[0],
          canal,
          tono: "profesional",
          propuestaValor,
          guardar: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMensaje(data.contenido);
      setAsunto(data.asunto ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error generando mensaje");
    } finally {
      setGenerando(false);
    }
  }

  async function enviarMasivo() {
    if (!mensaje.trim() || !aptos.length) return;
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch("/api/campanas/enviar-masivo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canal, mensaje, asunto, prospectos: aptos }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResultado(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error en envío masivo");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">

        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center">
              <Users size={18} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white">Envío Masivo</h2>
              <p className="text-xs text-gray-500">{prospectos.length} prospectos seleccionados</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Canal */}
          <div>
            <label className="text-xs text-gray-500 mb-2 block">Canal de envío</label>
            <div className="flex gap-2">
              {CANALES_MASIVO.map((c) => {
                const count = prospectos.filter((p) =>
                  c.requiere === "email" ? !!p.email : !!p.telefono
                ).length;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCanal(c.id)}
                    className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border transition-all ${
                      canal === c.id
                        ? "border-cyan-500/50 bg-cyan-500/10 text-white"
                        : "border-gray-700 text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    <span className="text-xl">{c.icon}</span>
                    <span className="text-sm font-medium">{c.label}</span>
                    <span className="text-xs text-gray-500">{count} con {c.requiere}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Resumen aptos */}
          <div className="bg-gray-800/50 rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-400">
              Prospectos con {canal === "EMAIL" ? "email" : "teléfono"}:
            </span>
            <span className={`text-sm font-bold ${aptos.length > 0 ? "text-emerald-400" : "text-red-400"}`}>
              {aptos.length} de {prospectos.length}
            </span>
          </div>

          {/* Generar mensaje */}
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Tu negocio / producto *</label>
              <textarea
                value={descripcionNegocio}
                onChange={(e) => setDescripcionNegocio(e.target.value)}
                placeholder="Ej: Vendo software de contabilidad para pequeñas empresas..."
                className="input-dark w-full text-sm resize-none h-14"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Propuesta de valor <span className="text-gray-700">(opcional)</span></label>
              <input
                value={propuestaValor}
                onChange={(e) => setPropuestaValor(e.target.value)}
                placeholder="Ej: 30 días gratis, sin contrato..."
                className="input-dark w-full text-sm"
              />
            </div>
            <button
              onClick={generarMensaje}
              disabled={generando || !descripcionNegocio.trim()}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {generando ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {generando ? "Generando plantilla..." : "Generar plantilla con IA"}
            </button>
          </div>

          {/* Mensaje generado */}
          {mensaje && (
            <div className="space-y-3 pt-2 border-t border-gray-800">
              {canal === "EMAIL" && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Asunto</label>
                  <input value={asunto} onChange={(e) => setAsunto(e.target.value)} className="input-dark w-full text-sm" />
                </div>
              )}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Mensaje — usa [NOMBRE] [EMPRESA] [GIRO] [ZONA] para personalizar
                </label>
                <textarea
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  className="input-dark w-full text-sm resize-none h-32 font-mono"
                />
              </div>

              {/* Botón envío masivo */}
              {!resultado ? (
                <button
                  onClick={enviarMasivo}
                  disabled={enviando || !aptos.length}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all text-sm"
                >
                  {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {enviando
                    ? `Enviando a ${aptos.length} prospectos...`
                    : `Enviar ahora a ${aptos.length} prospectos`}
                </button>
              ) : (
                <div className="bg-gray-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Check size={20} className="text-emerald-400" />
                    <div>
                      <p className="text-sm font-semibold text-white">Envío completado</p>
                      <p className="text-xs text-gray-400">
                        {resultado.enviados} enviados · {resultado.errores} errores
                      </p>
                    </div>
                  </div>
                  {resultado.resultados.filter((r) => !r.ok).length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-red-400 font-medium">Fallidos:</p>
                      {resultado.resultados.filter((r) => !r.ok).map((r, i) => (
                        <p key={i} className="text-xs text-gray-500">· {r.empresa}: {r.error}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
