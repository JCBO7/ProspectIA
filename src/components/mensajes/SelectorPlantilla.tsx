"use client";
import { useState, useEffect } from "react";
import {
  X, Zap, Trash2, Loader2, Send, Check,
  AlertCircle, BookOpen, ChevronRight, ExternalLink, MessageCircle,
} from "lucide-react";
import type { ProspectoData } from "@/types";

interface Plantilla {
  id: string;
  nombre: string;
  canal: string;
  contenido: string;
  asunto?: string;
  descripcion?: string;
  usosCount: number;
  createdAt: string;
}

const CANAL_ICON: Record<string, string> = {
  WHATSAPP: "💬", EMAIL: "📧", SMS: "📱",
  LINKEDIN: "💼", LLAMADA: "📞", INSTAGRAM: "📸", FACEBOOK: "👤",
};

interface Props {
  prospectos: ProspectoData[];       // 1 = individual, N = masivo
  onClose: () => void;
}

export function SelectorPlantilla({ prospectos, onClose }: Props) {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroCanal, setFiltroCanal] = useState("TODOS");
  const [seleccionada, setSeleccionada] = useState<Plantilla | null>(null);
  const [mensajeEditado, setMensajeEditado] = useState("");
  const [asuntoEditado, setAsuntoEditado] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ enviados: number; errores: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listaWAManual, setListaWAManual] = useState<Array<{ empresa: string; numero: string; url: string }>>([]);

  const esMasivo = prospectos.length > 1;
  const prospecto = prospectos[0];

  useEffect(() => {
    fetch("/api/plantillas")
      .then((r) => r.json())
      .then((d) => setPlantillas(d.plantillas ?? []))
      .finally(() => setCargando(false));
  }, []);

  function seleccionar(p: Plantilla) {
    // Personalizar con datos del prospecto si es individual
    let texto = p.contenido;
    if (!esMasivo && prospecto) {
      texto = texto
        .replace(/\[NOMBRE\]/gi, prospecto.contacto ?? prospecto.empresa)
        .replace(/\[EMPRESA\]/gi, prospecto.empresa)
        .replace(/\[GIRO\]/gi, prospecto.giro ?? "su empresa")
        .replace(/\[ZONA\]/gi, prospecto.zona ?? prospecto.ciudad ?? "su ciudad");
    }
    setSeleccionada(p);
    setMensajeEditado(texto);
    setAsuntoEditado(p.asunto ?? "");
    setError(null);
    setResultado(null);
    setListaWAManual([]);
  }

  async function eliminar(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`/api/plantillas/${id}`, { method: "DELETE" });
    setPlantillas((prev) => prev.filter((p) => p.id !== id));
    if (seleccionada?.id === id) setSeleccionada(null);
  }

  function abrirWhatsApp() {
    if (!seleccionada || !prospecto?.telefono) return;
    // Limpiar número: solo dígitos, agregar 52 si no tiene código de país
    const digits = prospecto.telefono.replace(/\D/g, "");
    const numero = digits.startsWith("52") ? digits : `52${digits}`;
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensajeEditado)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    fetch(`/api/plantillas/${seleccionada.id}`, { method: "PATCH" });
    setResultado({ enviados: 1, errores: 0 });
  }

  async function enviar() {
    if (!seleccionada) return;

    // WhatsApp individual → abrir wa.me directamente (sin Twilio)
    if (!esMasivo && seleccionada.canal === "WHATSAPP") {
      if (!prospecto?.telefono) {
        setError("Este prospecto no tiene número de teléfono");
        return;
      }
      abrirWhatsApp();
      return;
    }

    // Masivo WhatsApp → generar links wa.me para envío manual (Twilio no conectado)
    if (esMasivo && seleccionada.canal === "WHATSAPP") {
      const lista = prospectos
        .filter((p) => !!p.telefono)
        .map((p) => {
          const texto = mensajeEditado
            .replace(/\[NOMBRE\]/gi, p.contacto ?? p.empresa)
            .replace(/\[EMPRESA\]/gi, p.empresa)
            .replace(/\[GIRO\]/gi, p.giro ?? "su empresa")
            .replace(/\[ZONA\]/gi, p.zona ?? p.ciudad ?? "su ciudad");
          const digits = (p.telefono ?? "").replace(/\D/g, "");
          const numero = digits.startsWith("52") ? digits : `52${digits}`;
          return {
            empresa: p.empresa,
            numero: p.telefono ?? "",
            url: `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`,
          };
        });
      fetch(`/api/plantillas/${seleccionada.id}`, { method: "PATCH" });
      setListaWAManual(lista);
      setResultado({ enviados: lista.length, errores: prospectos.filter((p) => !p.telefono).length });
      return;
    }

    setEnviando(true);
    setError(null);

    try {
      // Incrementar contador de usos
      fetch(`/api/plantillas/${seleccionada.id}`, { method: "PATCH" });

      if (esMasivo) {
        const res = await fetch("/api/campanas/enviar-masivo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            canal: seleccionada.canal,
            mensaje: seleccionada.contenido,
            asunto: asuntoEditado,
            prospectos,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setResultado({ enviados: data.enviados, errores: data.errores });
        setPlantillas((prev) =>
          prev.map((p) => (p.id === seleccionada.id ? { ...p, usosCount: p.usosCount + 1 } : p))
        );
      } else {
        const res = await fetch("/api/mensajes/enviar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            canal: seleccionada.canal,
            mensaje: mensajeEditado,
            asunto: asuntoEditado,
            prospecto,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setResultado({ enviados: 1, errores: 0 });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al enviar");
    } finally {
      setEnviando(false);
    }
  }

  const canalesFiltro = ["TODOS", ...Array.from(new Set(plantillas.map((p) => p.canal)))];
  const filtradas = filtroCanal === "TODOS"
    ? plantillas
    : plantillas.filter((p) => p.canal === filtroCanal);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white">Envío Rápido con Plantilla</h2>
              <p className="text-xs text-gray-500">
                {esMasivo
                  ? `${prospectos.length} prospectos seleccionados`
                  : `Para: ${prospecto?.empresa}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={18} /></button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Lista de plantillas */}
          <div className="w-1/2 border-r border-gray-800 flex flex-col overflow-hidden">
            {/* Filtro canal */}
            <div className="p-3 border-b border-gray-800 shrink-0">
              <div className="flex gap-1.5 flex-wrap">
                {canalesFiltro.map((c) => (
                  <button
                    key={c}
                    onClick={() => setFiltroCanal(c)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                      filtroCanal === c
                        ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
                        : "border-gray-700 text-gray-500 hover:border-gray-600"
                    }`}
                  >
                    {c === "TODOS" ? "Todos" : `${CANAL_ICON[c] ?? ""} ${c}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista */}
            <div className="overflow-y-auto flex-1">
              {cargando ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 size={20} className="animate-spin text-gray-600" />
                </div>
              ) : filtradas.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <BookOpen size={32} className="mx-auto mb-2 text-gray-700" />
                  <p className="text-sm text-gray-600">Sin plantillas guardadas</p>
                  <p className="text-xs text-gray-700 mt-1">
                    Genera un mensaje y usa &quot;Guardar como plantilla&quot;
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1.5">
                  {filtradas.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => seleccionar(p)}
                      className={`group p-3 rounded-xl border cursor-pointer transition-all ${
                        seleccionada?.id === p.id
                          ? "border-amber-500/50 bg-amber-500/10"
                          : "border-gray-800 hover:border-gray-700 hover:bg-gray-800/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm">{CANAL_ICON[p.canal] ?? "📄"}</span>
                            <span className="text-sm font-medium text-white truncate">{p.nombre}</span>
                          </div>
                          {p.descripcion && (
                            <p className="text-xs text-gray-500 truncate">{p.descripcion}</p>
                          )}
                          <p className="text-xs text-gray-700 mt-1 truncate">
                            {p.contenido.slice(0, 60)}...
                          </p>
                          {p.usosCount > 0 && (
                            <span className="text-[10px] text-amber-600 mt-1 block">
                              Usada {p.usosCount} {p.usosCount === 1 ? "vez" : "veces"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {seleccionada?.id === p.id && (
                            <ChevronRight size={14} className="text-amber-400" />
                          )}
                          <button
                            onClick={(e) => eliminar(p.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-600 hover:text-red-400 transition-all"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Panel derecho: preview + envío */}
          <div className="w-1/2 flex flex-col overflow-hidden">
            {!seleccionada ? (
              <div className="flex items-center justify-center flex-1 text-center px-6">
                <div>
                  <Zap size={32} className="mx-auto mb-2 text-gray-700" />
                  <p className="text-sm text-gray-600">Selecciona una plantilla para enviar</p>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-3 overflow-y-auto flex-1">
                <div>
                  <p className="text-xs font-semibold text-amber-400 mb-2">{seleccionada.nombre}</p>

                  {seleccionada.canal === "EMAIL" && (
                    <div className="mb-2">
                      <label className="text-xs text-gray-500 mb-1 block">Asunto</label>
                      <input
                        value={asuntoEditado}
                        onChange={(e) => setAsuntoEditado(e.target.value)}
                        className="input-dark w-full text-sm"
                      />
                    </div>
                  )}

                  <label className="text-xs text-gray-500 mb-1 block">
                    Mensaje {esMasivo ? "(con variables)" : "(personalizado)"}
                  </label>
                  <textarea
                    value={mensajeEditado}
                    onChange={(e) => setMensajeEditado(e.target.value)}
                    className="input-dark w-full text-sm resize-none h-40 font-mono"
                  />
                  {esMasivo && (
                    <p className="text-[10px] text-gray-600 mt-1">
                      [NOMBRE] [EMPRESA] [GIRO] [ZONA] se reemplazarán por cada prospecto
                    </p>
                  )}
                </div>

                {/* Resumen de destinatarios */}
                <div className="bg-gray-800/50 rounded-lg px-3 py-2">
                  {esMasivo ? (
                    <p className="text-xs text-gray-400">
                      <span className="text-white font-medium">{prospectos.length}</span> prospectos ·{" "}
                      <span className="text-emerald-400">
                        {prospectos.filter((p) =>
                          seleccionada.canal === "EMAIL" ? !!p.email : !!p.telefono
                        ).length}{" "}
                        con datos
                      </span>
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400">
                      Para: <span className="text-white">{prospecto?.empresa}</span>
                      {seleccionada.canal === "EMAIL" && prospecto?.email && (
                        <span className="text-blue-400 ml-1">· {prospecto.email}</span>
                      )}
                      {(seleccionada.canal === "WHATSAPP" || seleccionada.canal === "SMS") &&
                        prospecto?.telefono && (
                          <span className="text-emerald-400 ml-1">· {prospecto.telefono}</span>
                        )}
                    </p>
                  )}
                </div>

                {/* Resultado */}
                {resultado ? (
                  listaWAManual.length > 0 ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 space-y-2">
                      <p className="text-sm text-emerald-300 font-medium flex items-center gap-2">
                        <MessageCircle size={14} />
                        Abre WhatsApp manualmente para cada prospecto:
                      </p>
                      <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                        {listaWAManual.map((item) => (
                          <a
                            key={item.url}
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all"
                          >
                            <span className="text-xs text-white font-medium truncate">{item.empresa}</span>
                            <span className="flex items-center gap-1 text-emerald-400 text-xs shrink-0">
                              {item.numero} <ExternalLink size={10} />
                            </span>
                          </a>
                        ))}
                      </div>
                      {resultado.errores > 0 && (
                        <p className="text-xs text-red-400">{resultado.errores} sin teléfono registrado</p>
                      )}
                    </div>
                  ) : (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-3">
                    <Check size={18} className="text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-sm text-emerald-300 font-medium">
                        {resultado.enviados === 1 ? "¡Mensaje enviado!" : `¡${resultado.enviados} enviados!`}
                      </p>
                      {resultado.errores > 0 && (
                        <p className="text-xs text-red-400">{resultado.errores} errores</p>
                      )}
                    </div>
                  </div>
                  )
                ) : (
                  <button
                    onClick={enviar}
                    disabled={enviando || (!esMasivo && seleccionada.canal === "WHATSAPP" && !prospecto?.telefono)}
                    className={`w-full flex items-center justify-center gap-2 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-all text-sm ${
                      seleccionada.canal === "WHATSAPP"
                        ? "bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400"
                        : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400"
                    }`}
                  >
                    {enviando ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : seleccionada.canal === "WHATSAPP" ? (
                      <span className="text-base leading-none">💬</span>
                    ) : (
                      <Send size={15} />
                    )}
                    {enviando
                      ? "Abriendo..."
                      : !esMasivo && seleccionada.canal === "WHATSAPP"
                      ? prospecto?.telefono
                        ? `Abrir WhatsApp · ${prospecto.telefono}`
                        : "Sin teléfono"
                      : esMasivo && seleccionada.canal === "WHATSAPP"
                      ? `Abrir WhatsApp Web · ${prospectos.filter((p) => !!p.telefono).length} prospectos`
                      : esMasivo
                      ? `Enviar a ${prospectos.filter((p) => seleccionada.canal === "EMAIL" ? !!p.email : !!p.telefono).length} prospectos`
                      : "Enviar ahora"}
                  </button>
                )}

                {error && (
                  <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                    <AlertCircle size={13} className="text-red-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
