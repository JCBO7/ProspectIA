import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";
import { Users, MessageSquare, Megaphone, TrendingUp, ArrowRight, Zap } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const workspace = await prisma.workspace.findFirst({
    where: { userId: session!.user.id },
    include: {
      _count: {
        select: { prospectos: true, campanas: true, mensajes: true },
      },
    },
  });

  const prospectosPorStatus = workspace
    ? await prisma.prospecto.groupBy({
        by: ["status"],
        where: { workspaceId: workspace.id },
        _count: true,
      })
    : [];

  const convertidos = prospectosPorStatus.find((p) => p.status === "CONVERTIDO")?._count || 0;

  const stats = [
    {
      label: "Prospectos totales",
      value: workspace?._count.prospectos || 0,
      icon: Users,
      color: "text-cyan-400",
      bg: "bg-cyan-400/10",
      href: "/prospectos",
    },
    {
      label: "Mensajes generados",
      value: workspace?._count.mensajes || 0,
      icon: MessageSquare,
      color: "text-violet-400",
      bg: "bg-violet-400/10",
      href: "/mensajes",
    },
    {
      label: "Campañas activas",
      value: workspace?._count.campanas || 0,
      icon: Megaphone,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
      href: "/campanas",
    },
    {
      label: "Conversiones",
      value: convertidos,
      icon: TrendingUp,
      color: "text-amber-400",
      bg: "bg-amber-400/10",
      href: "/prospectos?status=CONVERTIDO",
    },
  ];

  const acciones = [
    {
      title: "Buscar prospectos",
      description: "Describe tu negocio y la IA encuentra clientes potenciales en DENUE",
      href: "/prospectos",
      icon: "🔍",
      color: "from-cyan-500/10 to-cyan-600/5 border-cyan-500/20 hover:border-cyan-400/40",
    },
    {
      title: "Generar mensaje",
      description: "Crea mensajes personalizados con IA para WhatsApp, Email, LinkedIn y más",
      href: "/mensajes",
      icon: "✍️",
      color: "from-violet-500/10 to-violet-600/5 border-violet-500/20 hover:border-violet-400/40",
    },
    {
      title: "Lanzar campaña",
      description: "Programa envíos masivos con seguimiento automático de respuestas",
      href: "/campanas",
      icon: "🚀",
      color: "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 hover:border-emerald-400/40",
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Bienvenido, {session?.user.name?.split(" ")[0] || "Usuario"} 👋
        </h1>
        <p className="text-gray-500 mt-1">
          {workspace?.businessDescription
            ? `Prospectando para: ${workspace.businessDescription}`
            : "Configura tu negocio para comenzar a prospectar"}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="card-dark p-4 hover:border-gray-700 transition-colors group">
            <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center mb-3`}>
              <stat.icon size={20} className={stat.color} />
            </div>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-medium text-gray-400 mb-3">Acciones rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {acciones.map((accion) => (
            <Link
              key={accion.href}
              href={accion.href}
              className={`bg-gradient-to-br ${accion.color} border rounded-xl p-5 transition-all duration-200 group`}
            >
              <div className="text-2xl mb-3">{accion.icon}</div>
              <h3 className="font-semibold text-white group-hover:text-white/90">{accion.title}</h3>
              <p className="text-sm text-gray-400 mt-1 mb-4">{accion.description}</p>
              <div className="flex items-center gap-1 text-xs text-gray-500 group-hover:text-gray-300 transition-colors">
                Ir al módulo <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Plan info */}
      {session?.user.plan !== "PRO" && (
        <div className="card-dark p-5 flex items-center justify-between bg-gradient-to-r from-violet-900/20 to-transparent border-violet-500/20">
          <div className="flex items-center gap-3">
            <Zap size={20} className="text-violet-400" />
            <div>
              <div className="text-sm font-medium text-white">Plan Gratuito</div>
              <div className="text-xs text-gray-400">
                {workspace?._count.prospectos || 0}/50 prospectos usados este mes
              </div>
            </div>
          </div>
          <button className="btn-primary text-sm">Actualizar a Pro →</button>
        </div>
      )}
    </div>
  );
}
