"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Search, MessageSquare, Megaphone,
  LogOut, Zap, ChevronRight,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/prospectos", label: "Prospectos", icon: Search },
  { href: "/mensajes", label: "Mensajes IA", icon: MessageSquare },
  { href: "/campanas", label: "Campañas", icon: Megaphone },
];

interface SidebarProps {
  user: { name?: string | null; email?: string | null; image?: string | null; plan?: string };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-60 flex flex-col bg-gray-900 border-r border-gray-800 h-full shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-900/30">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-white tracking-tight">ProspectAI</span>
            <div className="text-[10px] text-gray-500 -mt-0.5">Motor de Prospección</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                active
                  ? "bg-gradient-to-r from-cyan-500/10 to-violet-600/10 text-cyan-400 border border-cyan-500/20"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              <Icon size={18} className={active ? "text-cyan-400" : "text-gray-500 group-hover:text-gray-300"} />
              {label}
              {active && <ChevronRight size={14} className="ml-auto text-cyan-500/50" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-gray-800 space-y-1">
        {/* Plan badge */}
        <div className="px-3 py-2 mb-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Plan actual</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              user.plan === "PRO"
                ? "bg-violet-500/20 text-violet-400"
                : "bg-gray-700 text-gray-400"
            }`}>
              {user.plan === "PRO" ? "Pro" : "Gratis"}
            </span>
          </div>
          {user.plan !== "PRO" && (
            <div className="mt-1.5 text-xs text-gray-500">50 prospectos/mes</div>
          )}
        </div>

        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-gray-300 truncate">{user.name || "Usuario"}</div>
            <div className="text-[10px] text-gray-600 truncate">{user.email}</div>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-all duration-150"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
