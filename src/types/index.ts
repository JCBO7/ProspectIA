export type Canal = "WHATSAPP" | "EMAIL" | "SMS" | "LINKEDIN" | "FACEBOOK" | "INSTAGRAM" | "LLAMADA";
export type Plan = "FREE" | "PRO" | "ENTERPRISE";
export type TamanoEmpresa = "MICRO" | "PEQUENA" | "MEDIANA" | "GRANDE";
export type ProspectoStatus = "NUEVO" | "CONTACTADO" | "INTERESADO" | "NO_INTERESADO" | "CONVERTIDO" | "DESCARTADO";
export type FuenteProspecto = "DENUE" | "GOOGLE_MAPS" | "SECCION_AMARILLA" | "MANUAL" | "IMPORTADO";
export type CampanaStatus = "BORRADOR" | "PROGRAMADA" | "EN_CURSO" | "PAUSADA" | "COMPLETADA" | "CANCELADA";
export type EnvioStatus = "PENDIENTE" | "ENVIADO" | "ENTREGADO" | "LEIDO" | "RESPONDIO" | "ERROR" | "OMITIDO";

export interface ProspectoData {
  id?: string;
  empresa: string;
  giro?: string;
  giroSCIAN?: string;
  zona?: string;
  alcaldia?: string;
  ciudad?: string;
  tamano?: TamanoEmpresa;
  contacto?: string;
  cargo?: string;
  telefono?: string;
  email?: string;
  website?: string;
  direccion?: string;
  score?: number;
  status?: ProspectoStatus;
  fuente?: FuenteProspecto;
  notas?: string;
  metadata?: Record<string, unknown>;
}

export interface BusquedaParams {
  descripcionNegocio: string;
  zona?: string;
  alcaldia?: string;
  giro?: string;
  tamano?: TamanoEmpresa;
  limite?: number;
}

export interface GenerarMensajeParams {
  descripcionNegocio: string;
  prospecto: ProspectoData;
  canal: Canal;
  tono?: "formal" | "casual" | "amigable" | "urgente";
  propuestaValor?: string;
}

export interface MensajeGenerado {
  canal: Canal;
  contenido: string;
  asunto?: string;
  ideaImagen?: string;
  variantes?: string[];
}

export interface DenueEstablecimiento {
  id: string;
  nombre: string;
  razonSocial?: string;
  responsable?: string;
  claseActividad: string;
  codigoActividad: string;
  estrato: string;
  tipoVialidad: string;
  nombreVialidad: string;
  numeroExterior: string;
  colonia: string;
  municipio: string;
  entidad: string;
  cp: string;
  telefono: string;
  correoElectronico: string;
  sitioWeb: string;
  latitud: string;
  longitud: string;
}

export interface MetricasCampana {
  total: number;
  pendientes: number;
  enviados: number;
  entregados: number;
  leidos: number;
  respondieron: number;
  errores: number;
  tasaApertura: number;
  tasaRespuesta: number;
  tasaConversion: number;
}
