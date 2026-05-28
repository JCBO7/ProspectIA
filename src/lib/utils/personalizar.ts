/**
 * Reemplaza variables de plantilla con datos del prospecto.
 * Si un dato no existe, usa un fallback natural en español
 * para que el mensaje no quede con corchetes o en blanco.
 */

export interface DatosProspecto {
  empresa?: string;
  contacto?: string;
  giro?: string;
  zona?: string;
  alcaldia?: string;
  ciudad?: string;
}

const FALLBACKS: Record<string, string> = {
  NOMBRE:   "estimado/a",
  EMPRESA:  "su empresa",
  GIRO:     "acorde a su negocio",
  ZONA:     "en su zona",
  CIUDAD:   "en su ciudad",
  VENDEDOR: "Arely Domínguez",
  FIRMA:    "Arely Domínguez",
  CONTACTO: "estimado/a",
};

export function personalizarMensaje(
  plantilla: string,
  prospecto: DatosProspecto
): string {
  return plantilla
    .replace(/\[NOMBRE\]/gi,   prospecto.contacto ?? FALLBACKS.NOMBRE)
    .replace(/\[EMPRESA\]/gi,  prospecto.empresa   ?? FALLBACKS.EMPRESA)
    .replace(/\[GIRO\]/gi,     prospecto.giro       ?? FALLBACKS.GIRO)
    .replace(/\[ZONA\]/gi,     prospecto.zona ?? prospecto.alcaldia ?? prospecto.ciudad ?? FALLBACKS.ZONA)
    .replace(/\[CIUDAD\]/gi,   prospecto.ciudad ?? prospecto.alcaldia ?? FALLBACKS.CIUDAD)
    .replace(/\[VENDEDOR\]/gi, FALLBACKS.VENDEDOR)
    .replace(/\[FIRMA\]/gi,    FALLBACKS.FIRMA)
    .replace(/\[CONTACTO\]/gi, prospecto.contacto ?? FALLBACKS.CONTACTO)
    // Limpiar cualquier variable sobrante que no se haya reemplazado
    .replace(/\[[A-Z_]+\]/g, (match) => {
      const key = match.slice(1, -1);
      return FALLBACKS[key] ?? "";
    });
}
