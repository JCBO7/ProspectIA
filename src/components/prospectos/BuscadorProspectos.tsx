"use client";
import { useState } from "react";
import {
  Search, Filter, Download, Save, Phone, Mail, Globe,
  MapPin, Building2, Loader2, Sparkles, ChevronDown,
  User, ImageIcon, MessageSquare, ChevronLeft, ChevronRight, Send, Zap,
} from "lucide-react";
import { GeneradorMensaje } from "@/components/mensajes/GeneradorMensaje";
import { GeneradorImagen } from "@/components/prospectos/GeneradorImagen";
import { EnvioMasivo } from "@/components/mensajes/EnvioMasivo";
import { SelectorPlantilla } from "@/components/mensajes/SelectorPlantilla";
import { ESTADOS_MEXICO, ALCALDIAS_CDMX } from "@/lib/denue/client";
import type { ProspectoData } from "@/types";

const REGISTROS_POR_PAGINA = [10, 20, 50] as const;

const FUENTE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  OSM:     { label: "OpenStreetMap", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: "🗺️" },
  DENUE:   { label: "DENUE INEGI",   color: "bg-blue-500/10 text-blue-400 border-blue-500/20",         icon: "🏛️" },
  MANUAL:  { label: "OpenStreetMap", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: "🗺️" },
};

function FuenteBadge({ fuente }: { fuente: string }) {
  const cfg = FUENTE_CONFIG[fuente] ?? FUENTE_CONFIG.OSM;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${cfg.color}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
    score >= 60 ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
    "bg-red-500/20 text-red-400 border-red-500/30";
  return <span className={`score-badge border ${color}`}>{score}</span>;
}

export function BuscadorProspectos() {
  // Búsqueda
  const [descripcion, setDescripcion] = useState("");
  const [estadoCodigo, setEstadoCodigo] = useState("00");
  const [alcaldia, setAlcaldia] = useState("");
  const [tamano, setTamano] = useState("");
  const [registrosPorPagina, setRegistrosPorPagina] = useState<number>(20);
  const [pagina, setPagina] = useState(1);
  const [showFiltros, setShowFiltros] = useState(false);

  // Resultados
  const [loading, setLoading] = useState(false);
  const [prospectos, setProspectos] = useState<ProspectoData[]>([]);
  const [girosIA, setGirosIA] = useState<string[]>([]);
  const [fuentes, setFuentes] = useState<{ nombre: string; cantidad: number; disponible: boolean }[]>([]);
  const [totalResultados, setTotalResultados] = useState(0);
  const [error, setError] = useState("");

  // Filtro de contacto (client-side)
  const [filtroContacto, setFiltroContacto] = useState<"todos" | "cualquiera" | "telefono" | "email" | "web">("todos");

  // Selección
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());
  const [guardando, setGuardando] = useState(false);

  // Modales
  const [prospectoMensaje, setProspectoMensaje] = useState<ProspectoData | null>(null);
  const [prospectoImagen, setProspectoImagen] = useState<ProspectoData | null>(null);
  const [showEnvioMasivo, setShowEnvioMasivo] = useState(false);
  const [prospectoRapido, setProspectoRapido] = useState<ProspectoData[] | null>(null);

  const esCDMX = estadoCodigo === "09";

  // Aplicar filtro de contacto sobre los resultados ya cargados
  const prospectosFiltrados = prospectos.filter((p) => {
    if (filtroContacto === "todos") return true;
    if (filtroContacto === "cualquiera") return !!(p.telefono || p.email || p.website);
    if (filtroContacto === "telefono") return !!p.telefono;
    if (filtroContacto === "email") return !!p.email;
    if (filtroContacto === "web") return !!p.website;
    return true;
  });

  // Estadísticas de contacto
  const conTelefono = prospectos.filter((p) => p.telefono).length;
  const conEmail    = prospectos.filter((p) => p.email).length;
  const conWeb      = prospectos.filter((p) => p.website).length;
  const conContacto = prospectos.filter((p) => p.telefono || p.email || p.website).length;

  const totalPaginas = Math.ceil(totalResultados / registrosPorPagina);

  async function buscar(paginaNum = 1) {
    if (!descripcion.trim()) return;
    setLoading(true);
    setError("");
    if (paginaNum === 1) {
      setProspectos([]);
      setGirosIA([]);
      setSeleccionados(new Set());
    }
    setPagina(paginaNum);

    try {
      const res = await fetch("/api/prospectos/buscar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descripcionNegocio: descripcion,
          estadoCodigo,
          alcaldia: esCDMX && alcaldia ? alcaldia : undefined,
          tamano: tamano || undefined,
          limite: registrosPorPagina,
          pagina: paginaNum,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error en búsqueda");
      setProspectos(data.prospectos);
      setGirosIA(data.girosInterpretados || []);
      setFuentes(data.fuentes || []);
      setTotalResultados(data.total || data.prospectos.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  async function guardarSeleccionados() {
    const lista = prospectosFiltrados.filter((_, i) => seleccionados.has(i));
    if (!lista.length) return;
    setGuardando(true);
    try {
      await fetch("/api/prospectos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectos: lista, guardar: true }),
      });
      setSeleccionados(new Set());
    } finally {
      setGuardando(false);
    }
  }

  function exportarCSV() {
    const lista = seleccionados.size > 0
      ? prospectosFiltrados.filter((_, i) => seleccionados.has(i))
      : prospectosFiltrados;
    const headers = ["Empresa", "Responsable", "Giro", "Zona", "Alcaldía/Municipio", "Estado", "Teléfono", "Email", "Website", "Score"];
    const rows = lista.map((p) => [
      `"${p.empresa}"`,
      `"${p.contacto || ""}"`,
      `"${p.giro || ""}"`,
      `"${p.zona || ""}"`,
      `"${p.alcaldia || ""}"`,
      `"${p.ciudad || ""}"`,
      p.telefono || "",
      p.email || "",
      p.website || "",
      p.score || "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prospectos-${(ESTADOS_MEXICO[estadoCodigo] ?? "mexico").replace(/\s+/g, "-")}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleSeleccion(idx: number) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) { next.delete(idx); } else { next.add(idx); }
      return next;
    });
  }

  function toggleTodos() {
    setSeleccionados(seleccionados.size === prospectosFiltrados.length
      ? new Set()
      : new Set(prospectosFiltrados.map((_, i) => i)));
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Búsqueda de Prospectos</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Describe a tu cliente ideal y la IA encuentra empresas reales en el DENUE del INEGI
        </p>
      </div>

      {/* Panel de búsqueda */}
      <div className="card-dark p-5 space-y-4">
        {/* Textarea principal */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-3.5 text-gray-500" />
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), buscar())}
            placeholder="Ej: Vendo software de nómina a restaurantes y hoteles con más de 10 empleados..."
            className="input-dark w-full pl-9 pt-3 pb-3 resize-none h-20 text-sm"
          />
        </div>

        {/* Fila controles */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowFiltros(!showFiltros)}
            className="btn-ghost text-sm flex items-center gap-1.5"
          >
            <Filter size={14} />
            Filtros
            <ChevronDown size={13} className={`transition-transform ${showFiltros ? "rotate-180" : ""}`} />
          </button>

          {/* Registros por página */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Ver:</span>
            {REGISTROS_POR_PAGINA.map((n) => (
              <button
                key={n}
                onClick={() => setRegistrosPorPagina(n)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                  registrosPorPagina === n
                    ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400"
                    : "border-gray-700 text-gray-500 hover:border-gray-600"
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          <button
            onClick={() => buscar()}
            disabled={loading || !descripcion.trim()}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {loading ? "Buscando..." : "Buscar con IA"}
          </button>
        </div>

        {/* Filtros expandibles */}
        {showFiltros && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-gray-800">
            {/* Estado */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Estado de México</label>
              <select
                value={estadoCodigo}
                onChange={(e) => { setEstadoCodigo(e.target.value); setAlcaldia(""); }}
                className="input-dark w-full text-sm"
              >
                {Object.entries(ESTADOS_MEXICO).map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>

            {/* Alcaldía — solo para CDMX */}
            {esCDMX ? (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Alcaldía (CDMX)</label>
                <select
                  value={alcaldia}
                  onChange={(e) => setAlcaldia(e.target.value)}
                  className="input-dark w-full text-sm"
                >
                  <option value="">Todas las alcaldías</option>
                  {Object.keys(ALCALDIAS_CDMX).map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Municipio</label>
                <input
                  placeholder="Ej: Monterrey, Guadalajara..."
                  className="input-dark w-full text-sm"
                  disabled
                />
                <p className="text-[10px] text-gray-600 mt-1">Búsqueda por municipio próximamente</p>
              </div>
            )}

            {/* Tamaño */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Tamaño de empresa</label>
              <select
                value={tamano}
                onChange={(e) => setTamano(e.target.value)}
                className="input-dark w-full text-sm"
              >
                <option value="">Todos los tamaños</option>
                <option value="MICRO">Micro (1-10 empleados)</option>
                <option value="PEQUENA">Pequeña (11-50)</option>
                <option value="MEDIANA">Mediana (51-250)</option>
                <option value="GRANDE">Grande (250+)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Tags IA */}
      {girosIA.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Sparkles size={13} className="text-gray-500" />
          <span className="text-xs text-gray-500">IA interpretó:</span>
          {girosIA.map((g) => (
            <span key={g} className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full">
              {g}
            </span>
          ))}
        </div>
      )}

      {/* Panel de fuentes activas */}
      {fuentes.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-gray-600">Fuentes consultadas:</span>
          {fuentes.map((f) => (
            <span
              key={f.nombre}
              className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-all ${
                f.disponible && f.cantidad > 0
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : f.disponible
                  ? "bg-gray-700/50 text-gray-500 border-gray-700"
                  : "bg-amber-500/5 text-amber-600 border-amber-500/20"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${f.disponible && f.cantidad > 0 ? "bg-emerald-400" : f.disponible ? "bg-gray-500" : "bg-amber-500"}`} />
              {f.nombre}
              {f.disponible ? (
                <span className="opacity-60">({f.cantidad})</span>
              ) : (
                <span className="opacity-60">· sin key</span>
              )}
            </span>
          ))}
          {fuentes.some(f => !f.disponible) && (
            <a
              href="https://www.inegi.org.mx/app/api/denue/v1/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-amber-500 hover:text-amber-400 underline underline-offset-2"
            >
              Obtener key DENUE gratis →
            </a>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Resultados */}
      {prospectos.length > 0 && (
        <div className="space-y-3">

          {/* Filtros de contacto + estadísticas */}
          <div className="card-dark p-3 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs text-gray-500 font-medium">Filtrar por medio de contacto</span>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                <Phone size={10} className="text-emerald-500" /> {conTelefono}
                <Mail size={10} className="text-blue-400 ml-2" /> {conEmail}
                <Globe size={10} className="text-violet-400 ml-2" /> {conWeb}
                <span className="ml-2 text-gray-700">de {prospectos.length} resultados</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "todos",      label: `Todos (${prospectos.length})`,          color: "border-gray-600 text-gray-400" },
                { id: "cualquiera", label: `Con cualquier contacto (${conContacto})`, color: "border-cyan-500/50 text-cyan-400" },
                { id: "telefono",   label: `Con teléfono (${conTelefono})`,          color: "border-emerald-500/50 text-emerald-400" },
                { id: "email",      label: `Con email (${conEmail})`,                color: "border-blue-500/50 text-blue-400" },
                { id: "web",        label: `Con web (${conWeb})`,                    color: "border-violet-500/50 text-violet-400" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => { setFiltroContacto(f.id as typeof filtroContacto); setSeleccionados(new Set()); }}
                  className={`text-xs px-3 py-1 rounded-lg border transition-all ${
                    filtroContacto === f.id
                      ? `${f.color} bg-white/5 font-medium`
                      : "border-gray-800 text-gray-600 hover:border-gray-700 hover:text-gray-400"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {conEmail === 0 && (
              <p className="text-[11px] text-amber-600/80">
                La mayoría de fuentes abiertas (OSM) no incluyen email. Activa DENUE o Google Places para mejores datos de contacto.
              </p>
            )}
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={seleccionados.size === prospectosFiltrados.length && prospectosFiltrados.length > 0}
                  onChange={toggleTodos}
                  className="rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500/30"
                />
                {seleccionados.size > 0 ? `${seleccionados.size} seleccionados` : "Seleccionar todos"}
              </label>
              <span className="text-xs text-gray-600">
                {prospectosFiltrados.length} resultados{filtroContacto !== "todos" ? ` filtrados` : ""} · página {pagina}{totalPaginas > 1 ? ` de ${totalPaginas}` : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {seleccionados.size > 0 && (
                <>
                  <button
                    onClick={() => setProspectoRapido(prospectosFiltrados.filter((_, i) => seleccionados.has(i)))}
                    className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-300 hover:from-amber-500/30 hover:to-orange-500/30 transition-all font-medium"
                  >
                    <Zap size={13} />
                    Rápido con plantilla ({seleccionados.size})
                  </button>
                  <button
                    onClick={() => setShowEnvioMasivo(true)}
                    className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 text-cyan-300 hover:from-cyan-500/30 hover:to-violet-500/30 transition-all font-medium"
                  >
                    <Send size={13} />
                    Envío masivo ({seleccionados.size})
                  </button>
                  <button
                    onClick={guardarSeleccionados}
                    disabled={guardando}
                    className="btn-ghost text-sm flex items-center gap-1.5 text-emerald-400 hover:bg-emerald-400/10"
                  >
                    <Save size={13} />
                    {guardando ? "Guardando..." : `Guardar (${seleccionados.size})`}
                  </button>
                </>
              )}
              <button onClick={exportarCSV} className="btn-ghost text-sm flex items-center gap-1.5">
                <Download size={13} />
                CSV
              </button>
            </div>
          </div>

          {/* Sin resultados con el filtro activo */}
          {prospectosFiltrados.length === 0 && filtroContacto !== "todos" && (
            <div className="text-center py-10 text-gray-600">
              <Phone size={30} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm">Ningún prospecto tiene {filtroContacto === "email" ? "email" : filtroContacto === "telefono" ? "teléfono" : filtroContacto === "web" ? "sitio web" : "datos de contacto"}</p>
              <button onClick={() => setFiltroContacto("todos")} className="text-xs text-cyan-400 mt-2 hover:underline">
                Ver todos los resultados
              </button>
            </div>
          )}

          {/* Cards */}
          <div className="grid gap-3">
            {prospectosFiltrados.map((p, i) => (
              <div
                key={i}
                className={`card-dark p-4 transition-all duration-150 ${
                  seleccionados.has(i) ? "border-cyan-500/40 bg-cyan-500/5" : "hover:border-gray-700"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={seleccionados.has(i)}
                    onChange={() => toggleSeleccion(i)}
                    className="mt-1 rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500/30 shrink-0"
                  />

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    {/* Nombre + score */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-white leading-tight">{p.empresa}</h3>
                        {p.giro && <p className="text-xs text-gray-400 mt-0.5">{p.giro}</p>}
                      </div>
                      <ScoreBadge score={p.score || 0} />
                    </div>

                    {/* Responsable */}
                    {p.contacto && (
                      <div className="flex items-center gap-1.5 mt-1.5 mb-1">
                        <User size={12} className="text-violet-400 shrink-0" />
                        <span className="text-xs text-violet-300 font-medium">{p.contacto}</span>
                        {p.cargo && <span className="text-xs text-gray-600">· {p.cargo}</span>}
                      </div>
                    )}

                    {/* Info chips */}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-500">
                      {(p.alcaldia || p.zona) && (
                        <span className="flex items-center gap-1">
                          <MapPin size={11} />
                          {p.alcaldia || p.zona}
                        </span>
                      )}
                      {p.ciudad && p.ciudad !== "Ciudad de México" && (
                        <span className="flex items-center gap-1">
                          <Building2 size={11} />
                          {p.ciudad}
                        </span>
                      )}
                      {p.tamano && (
                        <span className="flex items-center gap-1">
                          <Building2 size={11} />
                          {p.tamano.charAt(0) + p.tamano.slice(1).toLowerCase()}
                        </span>
                      )}
                      {p.telefono && (
                        <span className="flex items-center gap-1 text-emerald-500">
                          <Phone size={11} /> {p.telefono}
                        </span>
                      )}
                      {p.email && (
                        <span className="flex items-center gap-1 text-blue-400">
                          <Mail size={11} /> {p.email}
                        </span>
                      )}
                      {p.website && (
                        <a
                          href={p.website.startsWith("http") ? p.website : `https://${p.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-violet-400 hover:text-violet-300"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Globe size={11} /> {p.website}
                        </a>
                      )}
                    </div>

                    {p.direccion && (
                      <p className="text-xs text-gray-600 mt-1 truncate">{p.direccion}</p>
                    )}

                    {/* Badge de fuente */}
                    <div className="mt-2">
                      <FuenteBadge fuente={(p.metadata as Record<string, string>)?.fuente ?? p.fuente ?? "OSM"} />
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      onClick={() => setProspectoRapido([p])}
                      className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20
                        hover:border-amber-400/40 hover:bg-amber-500/20 px-2.5 py-1.5 rounded-lg
                        transition-all flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Zap size={12} />
                      Rápido
                    </button>
                    <button
                      onClick={() => setProspectoMensaje(p)}
                      className="text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20
                        hover:border-violet-400/40 hover:bg-violet-500/20 px-2.5 py-1.5 rounded-lg
                        transition-all flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <MessageSquare size={12} />
                      Mensaje
                    </button>
                    <button
                      onClick={() => setProspectoImagen(p)}
                      className="text-xs bg-pink-500/10 text-pink-400 border border-pink-500/20
                        hover:border-pink-400/40 hover:bg-pink-500/20 px-2.5 py-1.5 rounded-lg
                        transition-all flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <ImageIcon size={12} />
                      Imagen
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => buscar(pagina - 1)}
                disabled={pagina <= 1 || loading}
                className="btn-ghost p-2 disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(totalPaginas, 5) }, (_, i) => {
                const p = pagina <= 3 ? i + 1 : pagina - 2 + i;
                if (p < 1 || p > totalPaginas) return null;
                return (
                  <button
                    key={p}
                    onClick={() => buscar(p)}
                    className={`w-8 h-8 rounded-lg text-sm transition-all ${
                      p === pagina
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                        : "text-gray-500 hover:text-white hover:bg-gray-800"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => buscar(pagina + 1)}
                disabled={pagina >= totalPaginas || loading}
                className="btn-ghost p-2 disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Estado vacío */}
      {!loading && prospectos.length === 0 && !error && (
        <div className="text-center py-20 text-gray-600">
          <Search size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Describe tu negocio arriba para encontrar prospectos</p>
          <p className="text-xs mt-1 text-gray-700">Puedes buscar en cualquiera de los 32 estados de México</p>
        </div>
      )}

      {/* Modal Mensaje */}
      {prospectoMensaje && (
        <GeneradorMensaje
          prospecto={prospectoMensaje}
          onClose={() => setProspectoMensaje(null)}
        />
      )}

      {/* Modal Imagen */}
      {prospectoImagen && (
        <GeneradorImagen
          prospecto={prospectoImagen}
          descripcionNegocio={descripcion}
          onClose={() => setProspectoImagen(null)}
        />
      )}

      {/* Modal Envío Masivo */}
      {showEnvioMasivo && (
        <EnvioMasivo
          prospectos={prospectosFiltrados.filter((_, i) => seleccionados.has(i))}
          onClose={() => setShowEnvioMasivo(false)}
        />
      )}

      {/* Modal Envío Rápido con Plantilla */}
      {prospectoRapido && (
        <SelectorPlantilla
          prospectos={prospectoRapido}
          onClose={() => setProspectoRapido(null)}
        />
      )}
    </div>
  );
}
