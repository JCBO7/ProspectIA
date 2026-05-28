"use client";
import { useState } from "react";
import {
  X, Sparkles, Copy, Save, Check, Loader2,
  Mail, MessageCircle, Phone,
  ExternalLink, Send, Globe, BookMarked,
} from "lucide-react";
import type { ProspectoData } from "@/types";

const CANALES = [
  { id: "WHATSAPP",  label: "WhatsApp",  icon: "💬", color: "text-emerald-400" },
  { id: "EMAIL",     label: "Email",     icon: "📧", color: "text-blue-400"    },
  { id: "SMS",       label: "SMS",       icon: "📱", color: "text-cyan-400"    },
  { id: "LINKEDIN",  label: "LinkedIn",  icon: "💼", color: "text-blue-500"    },
  { id: "LLAMADA",   label: "Llamada",   icon: "📞", color: "text-violet-400"  },
  { id: "INSTAGRAM", label: "Instagram", icon: "📸", color: "text-pink-400"    },
  { id: "FACEBOOK",  label: "Facebook",  icon: "👤", color: "text-blue-600"    },
] as const;

const TONOS = ["profesional", "casual", "amigable", "urgente"] as const;

interface Props {
  prospecto: ProspectoData;
  onClose: () => void;
  onGuardado?: () => void;
}

export function GeneradorMensaje({ prospecto, onClose, onGuardado }: Props) {
  const [canal, setCanal] = useState<string>("WHATSAPP");
  const [tono, setTono] = useState<string>("profesional");
  const [descripcionNegocio, setDescripcionNegocio] = useState("");
  const [propuestaValor, setPropuestaValor] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<{ contenido: string; asunto?: string; ideaImagen?: string } | null>(null);
  const [editando, setEditando] = useState("");
  const [asuntoEditado, setAsuntoEditado] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [guardandoPlantilla, setGuardandoPlantilla] = useState(false);
  const [plantillaGuardada, setPlantillaGuardada] = useState(false);
  const [showNombrePlantilla, setShowNombrePlantilla] = useState(false);
  const [nombrePlantilla, setNombrePlantilla] = useState("");
  const [errorGenerar, setErrorGenerar] = useState<string | null>(null);

  async function generar() {
    if (!descripcionNegocio.trim()) return;
    setLoading(true);
    setMensaje(null);
    setErrorEnvio(null);
    setErrorGenerar(null);
    try {
      const res = await fetch("/api/mensajes/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descripcionNegocio, prospecto, canal, tono, propuestaValor, guardar: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al generar");
      if (!data.contenido) throw new Error("La IA no devolvió contenido. Intenta de nuevo.");
      setMensaje(data);
      setEditando(data.contenido);
      setAsuntoEditado(data.asunto ?? "");
    } catch (e) {
      setErrorGenerar(e instanceof Error ? e.message : "Error al generar el mensaje");
    } finally {
      setLoading(false);
    }
  }

  async function guardar() {
    if (!editando || !descripcionNegocio) return;
    await fetch("/api/mensajes/generar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ descripcionNegocio, prospecto, canal, tono, guardar: true }),
    });
    setGuardado(true);
    onGuardado?.();
    setTimeout(() => setGuardado(false), 2000);
  }

  function copiar() {
    navigator.clipboard.writeText(editando);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  // ── Envío directo via API ────────────────────────────────────────────────
  async function enviarAPI() {
    setEnviando(true);
    setErrorEnvio(null);
    try {
      const res = await fetch("/api/mensajes/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canal, mensaje: editando, asunto: asuntoEditado, prospecto, descripcionNegocio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEnviado(true);
      setTimeout(() => setEnviado(false), 3000);
    } catch (e) {
      setErrorEnvio(e instanceof Error ? e.message : "Error al enviar");
    } finally {
      setEnviando(false);
    }
  }

  async function guardarComoPlantilla() {
    if (!nombrePlantilla.trim() || !editando) return;
    setGuardandoPlantilla(true);
    try {
      await fetch("/api/plantillas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombrePlantilla,
          canal,
          contenido: editando,
          asunto: asuntoEditado,
          descripcion: descripcionNegocio,
        }),
      });
      setPlantillaGuardada(true);
      setShowNombrePlantilla(false);
      setNombrePlantilla("");
      setTimeout(() => setPlantillaGuardada(false), 3000);
    } finally {
      setGuardandoPlantilla(false);
    }
  }

  // ── Acciones directas en browser (sin API) ──────────────────────────────
  function abrirWhatsAppWeb() {
    const phone = (prospecto.telefono ?? "").replace(/\D/g, "");
    if (!phone) { alert("Este prospecto no tiene teléfono registrado"); return; }
    const full = phone.startsWith("52") ? phone : `52${phone}`;
    window.open(`https://wa.me/${full}?text=${encodeURIComponent(editando)}`, "_blank");
  }

  function abrirMailto() {
    const subject = encodeURIComponent(asuntoEditado || `Propuesta para ${prospecto.empresa}`);
    const body = encodeURIComponent(editando);
    const to = encodeURIComponent(prospecto.email ?? "");
    // Abre Gmail compose directamente en el navegador
    window.open(
      `https://mail.google.com/mail/?view=cm&to=${to}&su=${subject}&body=${body}`,
      "_blank"
    );
  }

  function abrirLinkedIn() {
    window.open(`https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(prospecto.empresa)}`, "_blank");
  }

  function abrirInstagram() {
    window.open("https://www.instagram.com/direct/inbox/", "_blank");
  }

  function abrirFacebook() {
    window.open(`https://www.facebook.com/search/top?q=${encodeURIComponent(prospecto.empresa)}`, "_blank");
  }

  function llamar() {
    const phone = (prospecto.telefono ?? "").replace(/\D/g, "");
    if (!phone) { alert("Sin teléfono registrado"); return; }
    window.open(`tel:+52${phone}`, "_self");
  }

  const tieneEmail = !!prospecto.email;
  const tieneTelefono = !!prospecto.telefono;
  const tieneTwilio = true;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div>
            <h2 className="font-bold text-white">Generar y Enviar Mensaje con IA</h2>
            <p className="text-xs text-gray-500 mt-0.5">{prospecto.empresa}
              {prospecto.email && <span className="ml-2 text-blue-400">· {prospecto.email}</span>}
              {prospecto.telefono && <span className="ml-2 text-emerald-400">· {prospecto.telefono}</span>}
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Canal */}
          <div>
            <label className="text-xs text-gray-500 mb-2 block">Canal de contacto</label>
            <div className="flex flex-wrap gap-2">
              {CANALES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCanal(c.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all ${
                    canal === c.id
                      ? "border-cyan-500/50 bg-cyan-500/10 text-white"
                      : "border-gray-700 text-gray-400 hover:border-gray-600"
                  }`}
                >
                  <span>{c.icon}</span>{c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Descripción + propuesta */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Tu negocio / producto *</label>
              <textarea
                value={descripcionNegocio}
                onChange={(e) => setDescripcionNegocio(e.target.value)}
                placeholder="Ej: Vendo software de punto de venta para restaurantes..."
                className="input-dark w-full text-sm resize-none h-14"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Propuesta de valor <span className="text-gray-700">(opcional)</span></label>
              <input
                value={propuestaValor}
                onChange={(e) => setPropuestaValor(e.target.value)}
                placeholder="Ej: Primer mes gratis, instalación en 24h..."
                className="input-dark w-full text-sm"
              />
            </div>
          </div>

          {/* Tono */}
          <div>
            <label className="text-xs text-gray-500 mb-2 block">Tono</label>
            <div className="flex gap-2">
              {TONOS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTono(t)}
                  className={`flex-1 py-1.5 rounded-lg text-sm border transition-all ${
                    tono === t
                      ? "border-violet-500/50 bg-violet-500/10 text-violet-300"
                      : "border-gray-700 text-gray-500 hover:border-gray-600"
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={generar}
            disabled={loading || !descripcionNegocio.trim()}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? "Generando..." : "Generar mensaje con IA"}
          </button>

          {/* Error de generación */}
          {errorGenerar && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              <p className="text-xs text-red-400">{errorGenerar}</p>
            </div>
          )}

          {/* Resultado + acciones de envío */}
          {mensaje && (
            <div className="space-y-3 pt-2 border-t border-gray-800">
              {/* Asunto email */}
              {canal === "EMAIL" && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Asunto del email</label>
                  <input
                    value={asuntoEditado}
                    onChange={(e) => setAsuntoEditado(e.target.value)}
                    className="input-dark w-full text-sm font-medium"
                  />
                </div>
              )}

              {/* Mensaje editable */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Mensaje — edita antes de enviar</label>
                <textarea
                  value={editando}
                  onChange={(e) => setEditando(e.target.value)}
                  className="input-dark w-full text-sm resize-none h-36 font-mono"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Variables: [NOMBRE] [EMPRESA] [GIRO] [ZONA] — se reemplazan en envío masivo
                </p>
              </div>

              {mensaje.ideaImagen && (
                <div className="bg-violet-500/5 border border-violet-500/20 rounded-lg px-3 py-2">
                  <p className="text-xs text-violet-400 font-medium mb-0.5">💡 Idea de imagen</p>
                  <p className="text-xs text-gray-400">{mensaje.ideaImagen}</p>
                </div>
              )}

              {/* Acciones básicas */}
              <div className="flex gap-2">
                <button onClick={copiar} className="btn-ghost text-xs flex items-center gap-1 flex-1 justify-center">
                  {copiado ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  {copiado ? "Copiado" : "Copiar"}
                </button>
                <button onClick={guardar} className="btn-ghost text-xs flex items-center gap-1 flex-1 justify-center text-emerald-400 hover:bg-emerald-400/10">
                  {guardado ? <Check size={13} /> : <Save size={13} />}
                  {guardado ? "Guardado" : "Guardar"}
                </button>
                <button onClick={generar} disabled={loading} className="btn-ghost text-xs flex items-center gap-1 flex-1 justify-center">
                  <Sparkles size={13} />Regenerar
                </button>
              </div>

              {/* ── GUARDAR COMO PLANTILLA ────────────────────────────────── */}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                {!showNombrePlantilla ? (
                  <button
                    onClick={() => setShowNombrePlantilla(true)}
                    className="w-full flex items-center justify-center gap-2 text-amber-400 hover:text-amber-300 text-sm transition-all"
                  >
                    {plantillaGuardada
                      ? <><Check size={14} className="text-emerald-400" /><span className="text-emerald-400">¡Plantilla guardada!</span></>
                      : <><BookMarked size={14} />Guardar como plantilla para reusar</>}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-amber-400 font-medium">Nombre de la plantilla</p>
                    <input
                      value={nombrePlantilla}
                      onChange={(e) => setNombrePlantilla(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && guardarComoPlantilla()}
                      placeholder="Ej: Propuesta inicial WhatsApp"
                      className="input-dark w-full text-sm"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={guardarComoPlantilla}
                        disabled={guardandoPlantilla || !nombrePlantilla.trim()}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-sm py-1.5 rounded-lg transition-all disabled:opacity-50"
                      >
                        {guardandoPlantilla ? <Loader2 size={13} className="animate-spin" /> : <BookMarked size={13} />}
                        Guardar
                      </button>
                      <button
                        onClick={() => { setShowNombrePlantilla(false); setNombrePlantilla(""); }}
                        className="px-3 text-gray-500 hover:text-gray-300 text-sm"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── ACCIONES DE ENVÍO ──────────────────────────────────────── */}
              <div className="bg-gray-800/50 rounded-xl p-4 space-y-3 border border-gray-700/50">
                <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Enviar ahora</p>

                {/* EMAIL */}
                {canal === "EMAIL" && (
                  <div className="space-y-2">
                    {tieneEmail ? (
                      <button
                        onClick={enviarAPI}
                        disabled={enviando || enviado}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-all"
                      >
                        {enviando ? <Loader2 size={15} className="animate-spin" /> : enviado ? <Check size={15} /> : <Send size={15} />}
                        {enviando ? "Enviando..." : enviado ? `¡Enviado a ${prospecto.email}!` : `Enviar email a ${prospecto.email}`}
                      </button>
                    ) : (
                      <p className="text-xs text-yellow-500/80">Sin email registrado para este prospecto</p>
                    )}
                    <button
                      onClick={abrirMailto}
                      className="w-full flex items-center justify-center gap-2 border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 text-sm py-2 rounded-lg transition-all"
                    >
                      <Mail size={14} /><ExternalLink size={12} />
                      Abrir en Gmail
                    </button>
                  </div>
                )}

                {/* WHATSAPP */}
                {canal === "WHATSAPP" && (
                  <div className="space-y-2">
                    <button
                      onClick={abrirWhatsAppWeb}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium py-2.5 rounded-lg transition-all"
                    >
                      <MessageCircle size={15} /><ExternalLink size={12} />
                      Abrir WhatsApp Web {tieneTelefono ? `(${prospecto.telefono})` : ""}
                    </button>
                    {tieneTelefono && tieneTwilio && (
                      <button
                        onClick={enviarAPI}
                        disabled={enviando || enviado}
                        className="w-full flex items-center justify-center gap-2 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-sm py-2 rounded-lg transition-all disabled:opacity-50"
                      >
                        {enviando ? <Loader2 size={14} className="animate-spin" /> : enviado ? <Check size={14} /> : <Send size={14} />}
                        {enviado ? "¡Enviado!" : "Enviar via API (Twilio)"}
                      </button>
                    )}
                  </div>
                )}

                {/* SMS */}
                {canal === "SMS" && (
                  <button
                    onClick={enviarAPI}
                    disabled={enviando || enviado || !tieneTelefono}
                    className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-all"
                  >
                    {enviando ? <Loader2 size={15} className="animate-spin" /> : enviado ? <Check size={15} /> : <Send size={15} />}
                    {enviado ? "¡SMS enviado!" : tieneTelefono ? `Enviar SMS a ${prospecto.telefono}` : "Sin teléfono registrado"}
                  </button>
                )}

                {/* LLAMADA */}
                {canal === "LLAMADA" && (
                  <div className="space-y-2">
                    <button
                      onClick={llamar}
                      disabled={!tieneTelefono}
                      className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-all"
                    >
                      <Phone size={15} />
                      {tieneTelefono ? `Llamar a ${prospecto.telefono}` : "Sin teléfono registrado"}
                    </button>
                    <p className="text-xs text-gray-500 text-center">El script de arriba es tu guía para la llamada</p>
                  </div>
                )}

                {/* LINKEDIN */}
                {canal === "LINKEDIN" && (
                  <button
                    onClick={abrirLinkedIn}
                    className="w-full flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-600 text-white text-sm font-medium py-2.5 rounded-lg transition-all"
                  >
                    <span className="text-base">💼</span><ExternalLink size={12} />
                    Buscar {prospecto.empresa} en LinkedIn
                  </button>
                )}

                {/* INSTAGRAM */}
                {canal === "INSTAGRAM" && (
                  <button
                    onClick={abrirInstagram}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-600 to-violet-600 hover:from-pink-500 hover:to-violet-500 text-white text-sm font-medium py-2.5 rounded-lg transition-all"
                  >
                    <span className="text-base">📸</span><ExternalLink size={12} />
                    Abrir Instagram Direct
                  </button>
                )}

                {/* FACEBOOK */}
                {canal === "FACEBOOK" && (
                  <button
                    onClick={abrirFacebook}
                    className="w-full flex items-center justify-center gap-2 bg-blue-800 hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-lg transition-all"
                  >
                    <Globe size={15} /><ExternalLink size={12} />
                    Buscar {prospecto.empresa} en Facebook
                  </button>
                )}

                {/* Error de envío */}
                {errorEnvio && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                    <p className="text-xs text-red-400">{errorEnvio}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
