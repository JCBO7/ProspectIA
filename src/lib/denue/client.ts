import axios from "axios";
import type { DenueEstablecimiento } from "@/types";

const DENUE_BASE = "https://www.inegi.org.mx/app/api/denue/v1/consulta";
const API_KEY = process.env.DENUE_API_KEY || "";

export const ESTADOS_MEXICO: Record<string, string> = {
  "00": "Todos los estados",
  "01": "Aguascalientes",
  "02": "Baja California",
  "03": "Baja California Sur",
  "04": "Campeche",
  "05": "Coahuila de Zaragoza",
  "06": "Colima",
  "07": "Chiapas",
  "08": "Chihuahua",
  "09": "Ciudad de México",
  "10": "Durango",
  "11": "Guanajuato",
  "12": "Guerrero",
  "13": "Hidalgo",
  "14": "Jalisco",
  "15": "Estado de México",
  "16": "Michoacán de Ocampo",
  "17": "Morelos",
  "18": "Nayarit",
  "19": "Nuevo León",
  "20": "Oaxaca",
  "21": "Puebla",
  "22": "Querétaro",
  "23": "Quintana Roo",
  "24": "San Luis Potosí",
  "25": "Sinaloa",
  "26": "Sonora",
  "27": "Tabasco",
  "28": "Tamaulipas",
  "29": "Tlaxcala",
  "30": "Veracruz de Ignacio de la Llave",
  "31": "Yucatán",
  "32": "Zacatecas",
};

// Municipios de CDMX (alcaldías) con sus códigos
const ALCALDIAS_CDMX: Record<string, string> = {
  "Álvaro Obregón":         "010",
  "Azcapotzalco":           "002",
  "Benito Juárez":          "014",
  "Coyoacán":               "003",
  "Cuajimalpa de Morelos":  "004",
  "Cuauhtémoc":             "015",
  "Gustavo A. Madero":      "005",
  "Iztacalco":              "006",
  "Iztapalapa":             "007",
  "La Magdalena Contreras": "008",
  "Miguel Hidalgo":         "016",
  "Milpa Alta":             "009",
  "Tláhuac":                "011",
  "Tlalpan":                "012",
  "Venustiano Carranza":    "017",
  "Xochimilco":             "013",
};

export { ALCALDIAS_CDMX };

export interface DenueBusquedaParams {
  nombre?: string;
  giro?: string;
  entidad?: string;
  municipio?: string;
  estrato?: string;
  registro?: number;
  pagina?: number;
}

export async function buscarEnDenue(params: DenueBusquedaParams): Promise<DenueEstablecimiento[]> {
  const {
    nombre = "",
    giro = "",
    entidad = "09",
    municipio = "0",
    estrato = "0",
    registro = 20,
    pagina = 1,
  } = params;

  const url = `${DENUE_BASE}/buscar/${nombre || "0"}/${giro || "0"}/${entidad}/${municipio}/0/0/0/${estrato}/${registro}/${pagina}/${API_KEY}`;

  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: { Accept: "application/json" },
    });
    if (!response.data || !Array.isArray(response.data)) return [];
    return response.data.map(mapDenueItem);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return [];
    throw new Error(`Error DENUE: ${error instanceof Error ? error.message : "desconocido"}`);
  }
}

export async function buscarPorEstado(params: {
  estadoCodigo: string;
  alcaldiaCode?: string;
  giro?: string;
  nombre?: string;
  registro?: number;
  pagina?: number;
}): Promise<DenueEstablecimiento[]> {
  return buscarEnDenue({
    nombre: params.nombre,
    giro: params.giro,
    entidad: params.estadoCodigo,
    municipio: params.alcaldiaCode || "0",
    registro: params.registro || 20,
    pagina: params.pagina || 1,
  });
}

function mapDenueItem(item: Record<string, string>): DenueEstablecimiento {
  // DENUE devuelve el nombre del responsable en varios campos posibles
  const responsable =
    item.NombreContacto || item.nombre_contacto ||
    item.Representante || item.representante ||
    item.Responsable || item.responsable ||
    item.PersonaContacto || item.persona_contacto || "";

  return {
    id: item.Id || item.id || "",
    nombre: item.Nombre || item.nombre || "",
    razonSocial: item.RazonSocial || item.razon_social || "",
    responsable,
    claseActividad: item.ClaseActividad || item.clase_actividad || "",
    codigoActividad: item.CodigoActividad || item.codigo_actividad || "",
    estrato: item.Estrato || item.estrato || "",
    tipoVialidad: item.TipoVialidad || item.tipo_vialidad || "",
    nombreVialidad: item.NombreVialidad || item.nombre_vialidad || "",
    numeroExterior: item.NumeroExterior || item.numero_exterior || "",
    colonia: item.Colonia || item.colonia || "",
    municipio: item.NombreMunicipio || item.nombre_municipio || item.municipio || "",
    entidad: item.NombreEntidad || item.nombre_entidad || "",
    cp: item.CodigoPostal || item.codigo_postal || "",
    telefono: item.Telefono || item.telefono || "",
    correoElectronico: item.CorreoElectronico || item.correo_electronico || "",
    sitioWeb: item.SitioInternet || item.sitio_internet || "",
    latitud: item.Latitud || item.latitud || "",
    longitud: item.Longitud || item.longitud || "",
  };
}

export function mapEstratoATamano(estrato: string): string {
  const n = parseInt(estrato);
  if (n === 1) return "MICRO";
  if (n <= 3) return "PEQUENA";
  if (n <= 5) return "MEDIANA";
  return "GRANDE";
}

export function getMockProspectos(giro: string, estado = "Ciudad de México"): DenueEstablecimiento[] {
  return [
    {
      id: "mock-1",
      nombre: "Restaurante El Buen Sabor",
      razonSocial: "",
      responsable: "Carlos Mendoza",
      claseActividad: giro || "Restaurantes de comida rápida",
      codigoActividad: "722511",
      estrato: "1",
      tipoVialidad: "CALLE",
      nombreVialidad: "Insurgentes Sur",
      numeroExterior: "1234",
      colonia: "Del Valle",
      municipio: "Benito Juárez",
      entidad: estado,
      cp: "03100",
      telefono: "5512345678",
      correoElectronico: "",
      sitioWeb: "",
      latitud: "19.3735",
      longitud: "-99.1757",
    },
    {
      id: "mock-2",
      nombre: "Consultora Empresarial Avanzada SA de CV",
      razonSocial: "Consultora Empresarial Avanzada SA de CV",
      responsable: "Ana Ramírez García",
      claseActividad: giro || "Consultoría en administración",
      codigoActividad: "541610",
      estrato: "3",
      tipoVialidad: "AVENIDA",
      nombreVialidad: "Paseo de la Reforma",
      numeroExterior: "500",
      colonia: "Cuauhtémoc",
      municipio: "Cuauhtémoc",
      entidad: estado,
      cp: "06600",
      telefono: "5598765432",
      correoElectronico: "contacto@consultora.com",
      sitioWeb: "www.consultora.com",
      latitud: "19.4284",
      longitud: "-99.1618",
    },
    {
      id: "mock-3",
      nombre: "Materiales de Construcción Vallejo",
      razonSocial: "",
      responsable: "Roberto Sánchez",
      claseActividad: giro || "Venta de materiales de construcción",
      codigoActividad: "444190",
      estrato: "2",
      tipoVialidad: "CALZADA",
      nombreVialidad: "Vallejo",
      numeroExterior: "789",
      colonia: "Industrial Vallejo",
      municipio: "Azcapotzalco",
      entidad: estado,
      cp: "02300",
      telefono: "5567890123",
      correoElectronico: "",
      sitioWeb: "",
      latitud: "19.4821",
      longitud: "-99.1523",
    },
    {
      id: "mock-4",
      nombre: "Clínica Dental Sonrisa Perfecta",
      razonSocial: "",
      responsable: "Dra. Laura Torres",
      claseActividad: giro || "Consultorios dentales",
      codigoActividad: "621210",
      estrato: "1",
      tipoVialidad: "CALLE",
      nombreVialidad: "Eje 5 Sur",
      numeroExterior: "210",
      colonia: "Narvarte",
      municipio: "Benito Juárez",
      entidad: estado,
      cp: "03020",
      telefono: "5543219876",
      correoElectronico: "citas@sonrisaperfecta.com",
      sitioWeb: "www.sonrisaperfecta.com",
      latitud: "19.3950",
      longitud: "-99.1600",
    },
    {
      id: "mock-5",
      nombre: "Ferretería y Tlapalería El Martillo",
      razonSocial: "",
      responsable: "",
      claseActividad: giro || "Ferreterías y tlapalerías",
      codigoActividad: "444130",
      estrato: "1",
      tipoVialidad: "CALLE",
      nombreVialidad: "Mesones",
      numeroExterior: "45",
      colonia: "Centro Histórico",
      municipio: "Cuauhtémoc",
      entidad: estado,
      cp: "06060",
      telefono: "5512987654",
      correoElectronico: "",
      sitioWeb: "",
      latitud: "19.4320",
      longitud: "-99.1332",
    },
  ];
}
