"use client";
import { useState } from "react";
import { X, ImageIcon, Loader2, Download, RefreshCw, Copy, Check } from "lucide-react";
import type { ProspectoData } from "@/types";

const ESTILOS = [
  { id: "profesional", label: "Profesional", desc: "Corporativo, limpio, confiable" },
  { id: "moderno", label: "Moderno", desc: "Minimalista, tech, vanguardista" },
  { id: "cálido", label: "Cálido", desc: "Amigable, cercano, humano" },
  { id: "impactante", label: "Impactante", desc: "Llamativo, audaz, memorable" },
];

interface Props {
  prospecto: ProspectoData;
  descripcionNegocio?: string;
  onClose: () => void;
}

export function GeneradorImagen({ prospecto, descripcionNegocio: initDesc = "", onClose }: Props) {
  const [descripcionNegocio, setDescripcionNegocio] = useState(initDesc);
  const [estilo, setEstilo] = useState("profesional");
  const [canal, setCanal] = useState("general");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<{
    imagenUrl: string;
    promptEN: string;
    descripcionES: string;
  } | null>(null);
  const [imagenCargada, setImagenCargada] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState("");

  async function generar() {
    if (!descripcionNegocio.trim()) return;
    setLoading(true);
    setError("");
    setResultado(null);
    setImagenCargada(false);

    try {
      const res = await fetch("/api/imagenes/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descripcionNegocio,
          prospecto,
          canal,
          estilo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResultado(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error generando imagen");
    } finally {
      setLoading(false);
    }
  }

  function copiarPrompt() {
    if (!resultado) return;
    navigator.clipboard.writeText(resultado.promptEN);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  function descargar() {
    if (!resultado) return;
    const a = document.createElement("a");
    a.href = resultado.imagenUrl;
    a.download = `imagen-${prospecto.empresa.replace(/\s+/g, "-").toLowerCase()}.jpg`;
    a.target = "_blank";
    a.click();
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500/20 to-violet-600/20 border border-pink-500/20 flex items-center justify-center">
              <ImageIcon size={15} className="text-pink-400" />
            </div>
            <div>
              <h2 className="font-bold text-white">Generar Imagen Personalizada</h2>
              <p className="text-xs text-gray-500 mt-0.5">{prospecto.empresa}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Descripción negocio */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Tu negocio *</label>
            <textarea
              value={descripcionNegocio}
              onChange={(e) => setDescripcionNegocio(e.target.value)}
              placeholder="Ej: Soy consultor de software de gestión para restaurantes..."
              className="input-dark w-full text-sm resize-none h-16"
            />
          </div>

          {/* Canal */}
          <div>
            <label className="text-xs text-gray-500 mb-2 block">Uso de la imagen</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "general", label: "General / Marketing" },
                { id: "whatsapp", label: "WhatsApp" },
                { id: "email", label: "Email / Newsletter" },
                { id: "instagram", label: "Instagram / RRSS" },
                { id: "presentacion", label: "Presentación" },
                { id: "anuncio", label: "Anuncio digital" },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCanal(c.id)}
                  className={`py-1.5 px-2 rounded-lg text-xs border transition-all ${
                    canal === c.id
                      ? "border-pink-500/50 bg-pink-500/10 text-white"
                      : "border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-300"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Estilo visual */}
          <div>
            <label className="text-xs text-gray-500 mb-2 block">Estilo visual</label>
            <div className="grid grid-cols-2 gap-2">
              {ESTILOS.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setEstilo(e.id)}
                  className={`p-3 rounded-lg text-left border transition-all ${
                    estilo === e.id
                      ? "border-violet-500/50 bg-violet-500/10"
                      : "border-gray-700 hover:border-gray-600"
                  }`}
                >
                  <div className={`text-sm font-medium ${estilo === e.id ? "text-violet-300" : "text-gray-300"}`}>
                    {e.label}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{e.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Botón generar */}
          <button
            onClick={generar}
            disabled={loading || !descripcionNegocio.trim()}
            className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all
              bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-400 hover:to-violet-500
              text-white shadow-lg shadow-violet-900/20 disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
            {loading ? "Generando imagen..." : "Generar imagen con IA"}
          </button>

          {loading && (
            <div className="text-center py-4 space-y-2">
              <div className="w-full bg-gray-800 rounded-full h-1.5">
                <div className="bg-gradient-to-r from-pink-500 to-violet-600 h-1.5 rounded-full animate-pulse w-3/4" />
              </div>
              <p className="text-xs text-gray-500">Claude está creando el prompt · La imagen tarda ~15 segundos en renderizar</p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Resultado */}
          {resultado && (
            <div className="space-y-4 pt-2 border-t border-gray-800">
              {/* Descripción */}
              <div className="bg-violet-500/5 border border-violet-500/20 rounded-lg px-4 py-3">
                <p className="text-xs text-violet-400 font-medium mb-1">Descripción de la imagen</p>
                <p className="text-sm text-gray-300">{resultado.descripcionES}</p>
              </div>

              {/* Imagen */}
              <div className="relative rounded-xl overflow-hidden bg-gray-800 aspect-square">
                {!imagenCargada && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <Loader2 size={28} className="animate-spin text-violet-400" />
                    <p className="text-xs text-gray-500">Renderizando imagen...</p>
                  </div>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resultado.imagenUrl}
                  alt="Imagen generada para prospecto"
                  className={`w-full h-full object-cover transition-opacity duration-500 ${imagenCargada ? "opacity-100" : "opacity-0"}`}
                  onLoad={() => setImagenCargada(true)}
                  onError={() => setError("No se pudo cargar la imagen. Intenta regenerar.")}
                />
              </div>

              {/* Acciones */}
              {imagenCargada && (
                <div className="flex gap-2">
                  <button
                    onClick={descargar}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm
                      border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-all"
                  >
                    <Download size={14} />
                    Descargar
                  </button>
                  <button
                    onClick={copiarPrompt}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm
                      border border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200 transition-all"
                  >
                    {copiado ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    {copiado ? "Copiado" : "Copiar prompt"}
                  </button>
                  <button
                    onClick={generar}
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm
                      border border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200 transition-all"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              )}

              <p className="text-xs text-gray-600 text-center">
                Imagen generada por Pollinations.ai · Para mayor calidad usa el prompt en Midjourney o DALL-E
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
