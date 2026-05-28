import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "JC ProspectAI - Motor de Prospección B2B",
  description: "Encuentra clientes, genera mensajes personalizados y lanza campañas de outreach multicanal con IA.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className="bg-gray-950 text-gray-100 antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
