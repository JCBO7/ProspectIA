"use client";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { GeneradorMensaje } from "@/components/mensajes/GeneradorMensaje";
import type { ProspectoData } from "@/types";

const PROSPECTO_DEMO: ProspectoData = {
  empresa: "Empresa de ejemplo",
  giro: "Comercio",
  zona: "CDMX",
  alcaldia: "Cuauhtémoc",
};

export default function MensajesPage() {
  const [mostrarGenerador, setMostrarGenerador] = useState(false);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Generador de Mensajes IA</h1>
          <p className="text-gray-500 mt-1">Crea mensajes personalizados para cada canal de contacto</p>
        </div>
        <button onClick={() => setMostrarGenerador(true)} className="btn-primary flex items-center gap-2">
          <Sparkles size={16} />
          Nuevo mensaje
        </button>
      </div>

      {/* Channels overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { canal: "WhatsApp", icon: "💬", desc: "Máx 160 palabras, CTA claro", color: "border-emerald-500/20 hover:border-emerald-400/40" },
          { canal: "Email", icon: "📧", desc: "Asunto + cuerpo HTML", color: "border-blue-500/20 hover:border-blue-400/40" },
          { canal: "SMS", icon: "📱", desc: "Máx 160 caracteres", color: "border-cyan-500/20 hover:border-cyan-400/40" },
          { canal: "LinkedIn", icon: "💼", desc: "Mensaje profesional", color: "border-blue-600/20 hover:border-blue-500/40" },
          { canal: "Llamada", icon: "📞", desc: "Script 30 segundos", color: "border-violet-500/20 hover:border-violet-400/40" },
          { canal: "Instagram", icon: "📸", desc: "Copy visual con hashtags", color: "border-pink-500/20 hover:border-pink-400/40" },
        ].map((c) => (
          <button
            key={c.canal}
            onClick={() => setMostrarGenerador(true)}
            className={`card-dark p-4 text-left border transition-all hover:bg-gray-800/50 ${c.color}`}
          >
            <div className="text-2xl mb-2">{c.icon}</div>
            <div className="font-medium text-white text-sm">{c.canal}</div>
            <div className="text-xs text-gray-500 mt-0.5">{c.desc}</div>
          </button>
        ))}
      </div>

      {/* Info banner */}
      <div className="card-dark p-4 border-cyan-500/20 bg-cyan-500/5">
        <p className="text-sm text-gray-300">
          💡 <span className="text-cyan-400 font-medium">Tip:</span> Ve al módulo de Prospectos, selecciona un cliente y haz clic en &quot;✍️ Mensaje&quot;
          para generar mensajes ultra-personalizados con los datos reales del prospecto.
        </p>
      </div>

      {mostrarGenerador && (
        <GeneradorMensaje
          prospecto={PROSPECTO_DEMO}
          onClose={() => setMostrarGenerador(false)}
        />
      )}
    </div>
  );
}
