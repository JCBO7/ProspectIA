import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = "claude-sonnet-4-6";

// Parsea JSON aunque venga envuelto en ```json ... ``` o truncado por max_tokens
function parseJSON<T = unknown>(text: string): T {
  const clean = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(clean) as T;
  } catch {
    // Intento de reparación: cerrar cadenas y objetos abiertos
    let repaired = clean;
    // Cerrar string abierto
    const quoteCount = (repaired.match(/(?<!\\)"/g) ?? []).length;
    if (quoteCount % 2 !== 0) repaired += '"';
    // Cerrar objetos/arrays abiertos
    const opens = (repaired.match(/[{[]/g) ?? []).length;
    const closes = (repaired.match(/[}\]]/g) ?? []).length;
    for (let i = 0; i < opens - closes; i++) repaired += "}";
    return JSON.parse(repaired) as T;
  }
}

export async function interpretarBusquedaCompleta(descripcion: string): Promise<{
  girosScian: string[];
  palabrasClave: string[];
  osmTags: Array<{ key: string; value: string }>;
  razonamiento: string;
}> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: `Eres un motor de prospección B2B para México.
Tu ÚNICA función es identificar qué tipos de NEGOCIOS SERÍAN CLIENTES del vendedor — es decir, quiénes le COMPRARÍAN o CONTRATARÍAN.

REGLA CRÍTICA: NUNCA devuelvas el mismo tipo de negocio que el vendedor.
- Si vende "servicios de aire acondicionado" → NO devuelvas empresas de aire acondicionado
- Si vende "software contable" → NO devuelvas empresas de software
- Si vende "servicios de limpieza" → NO devuelvas empresas de limpieza

Devuelve SIEMPRE los tipos de negocio que NECESITAN y CONTRATAN ese servicio/producto.
Responde SIEMPRE en JSON válido sin markdown.`,
    messages: [
      {
        role: "user",
        content: `VENDEDOR: "${descripcion}"

Pregunta clave: ¿Qué tipos de negocios CONTRATAN o COMPRAN esto?

EJEMPLOS OBLIGATORIOS de lógica correcta:
- "servicios de aire acondicionado" → clientes: restaurantes, hoteles, hospitales, oficinas, gimnasios, escuelas, centros comerciales
- "software contable" → clientes: restaurantes, tiendas, despachos, clínicas, constructoras, talleres
- "servicio de limpieza" → clientes: oficinas, restaurantes, hoteles, clínicas, gimnasios
- "venta de uniformes" → clientes: restaurantes, hospitales, empresas de seguridad, hoteles, escuelas
- "agencia de marketing" → clientes: tiendas, restaurantes, clínicas, hoteles, despachos profesionales
- "materiales de construcción" → clientes: constructoras, arquitectos, ferreterías, inmobiliarias
- "renta de equipo" → clientes: constructoras, eventos, restaurantes, hoteles

Devuelve los SECTORES DE CLIENTES (no del vendedor):
{
  "girosScian": ["sector cliente 1", "sector cliente 2", "sector cliente 3"],
  "palabrasClave": ["giro DENUE cliente 1", "giro DENUE cliente 2"],
  "osmTags": [
    {"key": "amenity", "value": "restaurant"},
    {"key": "tourism", "value": "hotel"}
  ],
  "razonamiento": "estos negocios contratan/compran este servicio porque..."
}

IMPORTANTE para osmTags: usa los tags del CLIENTE, no del vendedor.
Keys válidos: amenity, shop, office, tourism, leisure, healthcare, craft
Máximo 4 tags OSM.
Para palabrasClave: escribe el GIRO del cliente (ej: "restaurante", "hotel", "clínica"), NUNCA el producto del vendedor.`,
      },
    ],
  });
  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const parsed = JSON.parse(text);

  // Validación: si palabrasClave repite palabras clave del propio vendedor, probablemente Claude se equivocó
  const descLower = descripcion.toLowerCase();
  const palabrasFiltradas = (parsed.palabrasClave ?? []).filter((kw: string) => {
    const kwLower = kw.toLowerCase();
    // Rechazar si la palabra clave del "cliente" es demasiado similar a la descripción del vendedor
    const palabrasVendedor = descLower.split(/\s+/).filter((w) => w.length > 4);
    return !palabrasVendedor.some((w) => kwLower.includes(w) || w.includes(kwLower));
  });

  return {
    girosScian: parsed.girosScian ?? [],
    palabrasClave: palabrasFiltradas.length > 0 ? palabrasFiltradas : (parsed.palabrasClave ?? []),
    osmTags: parsed.osmTags ?? [],
    razonamiento: parsed.razonamiento ?? "",
  };
}

export async function interpretarBusqueda(descripcion: string): Promise<{
  girosScian: string[];
  palabrasClave: string[];
  razonamiento: string;
}> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: `Eres un experto en el clasificador SCIAN (Sistema de Clasificación Industrial de América del Norte)
    de México utilizado por el DENUE del INEGI. Tu tarea es interpretar descripciones de negocios objetivo
    y mapearlas a códigos o nombres de actividades económicas del DENUE.
    Responde SIEMPRE en JSON válido sin markdown.`,
    messages: [
      {
        role: "user",
        content: `Un vendedor describe a sus clientes objetivo así: "${descripcion}"

        Devuelve un JSON con:
        {
          "girosScian": ["nombre actividad 1", "nombre actividad 2", ...],  // máx 5 giros relevantes en lenguaje natural
          "palabrasClave": ["palabra1", "palabra2", ...],  // términos de búsqueda para DENUE
          "razonamiento": "explicación breve de por qué estos giros"
        }`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  return parseJSON(text);
}

export async function scorearProspecto(
  prospecto: {
    empresa: string;
    giro?: string;
    tamano?: string;
    zona?: string;
    telefono?: string;
    email?: string;
    website?: string;
  },
  descripcionNegocio: string
): Promise<{ score: number; razonamiento: string; factores: string[] }> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    system: `Eres un experto en ventas B2B mexicanas. Evalúas si un negocio es un buen CLIENTE POTENCIAL del 1 al 100.
    Un score alto significa que es muy probable que COMPRE o CONTRATE el producto/servicio del vendedor.
    Si el prospecto parece ser un COMPETIDOR (mismo giro que el vendedor), dale score muy bajo (1-15).
    Considera: probabilidad de necesitar el producto, tamaño, presencia digital, datos de contacto.
    Responde SIEMPRE en JSON válido sin markdown.`,
    messages: [
      {
        role: "user",
        content: `MI NEGOCIO/PRODUCTO: ${descripcionNegocio}

        Prospecto a evaluar como posible CLIENTE (no competidor):
        - Empresa: ${prospecto.empresa}
        - Giro: ${prospecto.giro || "desconocido"}
        - Tamaño: ${prospecto.tamano || "desconocido"}
        - Zona: ${prospecto.zona || "desconocida"}
        - Tiene teléfono: ${prospecto.telefono ? "sí" : "no"}
        - Tiene email: ${prospecto.email ? "sí" : "no"}
        - Tiene web: ${prospecto.website ? "sí" : "no"}

        ¿Qué tan probable es que este negocio COMPRE o CONTRATE lo que ofrezco?
        Si es del mismo giro (competidor), score 1-15.

        Devuelve JSON:
        {
          "score": número del 1 al 100,
          "razonamiento": "explicación en 1 oración de por qué sería o no buen cliente",
          "factores": ["factor positivo 1", "factor negativo 1", ...]
        }`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  return parseJSON(text);
}

export async function generarMensaje(params: {
  descripcionNegocio: string;
  prospecto: {
    empresa: string;
    giro?: string;
    contacto?: string;
    zona?: string;
  };
  canal: string;
  tono?: string;
  propuestaValor?: string;
}): Promise<{
  contenido: string;
  asunto?: string;
  ideaImagen?: string;
}> {
  const limites: Record<string, string> = {
    WHATSAPP: "máximo 160 palabras, incluye CTA claro y emoji ocasional",
    EMAIL: "asunto atractivo + cuerpo HTML con párrafos cortos, incluye CTA botón",
    SMS: "máximo 160 caracteres, muy directo",
    LINKEDIN: "mensaje de conexión profesional, máximo 300 caracteres",
    FACEBOOK: "post amigable con pregunta de enganche",
    INSTAGRAM: "copy visual corto con hashtags relevantes",
    LLAMADA: "script de 30 segundos con gancho inicial + propuesta + CTA",
  };

  const limite = limites[params.canal] || "mensaje conciso y directo";

  const prompt = `Genera un mensaje de outreach comercial con estas características:

MI NEGOCIO: ${params.descripcionNegocio}
${params.propuestaValor ? `PROPUESTA DE VALOR: ${params.propuestaValor}` : ""}

PROSPECTO:
- Empresa: ${params.prospecto.empresa}
- Giro: ${params.prospecto.giro || "empresa local"}
- Contacto: ${params.prospecto.contacto || "Estimado/a"}
- Zona: ${params.prospecto.zona || "CDMX"}

CANAL: ${params.canal}
TONO: ${params.tono || "profesional pero cercano"}
RESTRICCIONES: ${limite}

REGLAS OBLIGATORIAS:
1. Firma SIEMPRE como "Arely Domínguez" al final del mensaje.
2. Usa [NOMBRE] para el nombre del contacto, [EMPRESA] para su empresa, [GIRO] para su giro, [ZONA] para su zona.
3. Si una variable puede estar vacía, redacta la oración de forma que tenga sentido sin ella. Ejemplo: en vez de "en [ZONA]" escribe "en su zona ([ZONA])".
4. El mensaje debe poder enviarse sin edición aunque falten datos del prospecto.

Devuelve JSON:
{
  "contenido": "el mensaje completo, firmado por Arely Domínguez",
  ${params.canal === "EMAIL" ? '"asunto": "línea de asunto del email",' : ""}
  "ideaImagen": "descripción breve de imagen/visual que acompañaría este mensaje"
}`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: `Eres un experto en marketing directo y ventas B2B para el mercado mexicano.
    Generas mensajes de outreach efectivos, naturales y no invasivos.
    Responde SIEMPRE en JSON válido sin markdown.`,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  return parseJSON(text);
}

export async function generarPromptImagen(params: {
  descripcionNegocio: string;
  prospecto: {
    empresa: string;
    giro?: string;
    zona?: string;
  };
  canal?: string;
  estilo?: string;
}): Promise<{ promptEN: string; descripcionES: string }> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    system: `Eres experto en marketing visual B2B mexicano. Generas prompts precisos para
    generadores de imágenes (Stable Diffusion / Flux). Los prompts deben ser en inglés,
    fotorrealistas, profesionales y relevantes para el giro del prospecto.
    Responde SIEMPRE en JSON válido sin markdown.`,
    messages: [
      {
        role: "user",
        content: `Crea un prompt de imagen para material de marketing B2B:

MI NEGOCIO: ${params.descripcionNegocio}
PROSPECTO: ${params.prospecto.empresa} (${params.prospecto.giro || "empresa"}) en ${params.prospecto.zona || "México"}
CANAL: ${params.canal || "general"}
ESTILO DESEADO: ${params.estilo || "profesional, moderno, fotorrealista"}

El prompt debe generar una imagen que conecte visualmente mi negocio con el del prospecto.
Evita texto dentro de la imagen. Incluye ambiente profesional mexicano si aplica.

Devuelve JSON:
{
  "promptEN": "detailed english prompt for image generation, max 150 words, photorealistic, professional",
  "descripcionES": "descripción en español de lo que mostrará la imagen (2 oraciones)"
}`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  return parseJSON(text);
}

export async function generarFollowUp(params: {
  mensajeOriginal: string;
  canal: string;
  diasSinRespuesta: number;
  empresa: string;
}): Promise<{ contenido: string; asunto?: string }> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    system: `Eres experto en follow-up de ventas B2B. Generas mensajes de seguimiento
    naturales que no parezcan spam. Responde en JSON válido sin markdown.`,
    messages: [
      {
        role: "user",
        content: `Genera un follow-up para ${params.empresa} por canal ${params.canal}.
        Han pasado ${params.diasSinRespuesta} días sin respuesta.
        Mensaje original enviado: "${params.mensajeOriginal}"

        Devuelve JSON: { "contenido": "mensaje follow-up", "asunto": "asunto si es email" }`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  return parseJSON(text);
}
