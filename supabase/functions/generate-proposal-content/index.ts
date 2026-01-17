import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ServiceInput {
  id: string;
  name: string;
  standardText: string | null;
  objectivesTemplate: string | null;
  deliverablesTemplate: string | null;
}

interface ClientContext {
  clientName: string;
  groupAlias: string | null;
  industry: string | null;
  entityCount: number;
  employeeCount: number;
  annualRevenue: string | null;
  entities: { legalName: string; rfc: string | null }[];
}

interface AIAnalysisContext {
  objective: string | null;
  risks: string[];
  summary: string | null;
}

interface RequestBody {
  selectedServices: ServiceInput[];
  clientContext: ClientContext;
  aiAnalysis: AIAnalysisContext | null;
  background: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body: RequestBody = await req.json();
    const { selectedServices, clientContext, aiAnalysis, background } = body;

    console.log("Generating proposal content for:", clientContext.clientName);
    console.log("Selected services:", selectedServices.map(s => s.name));

    // Build the prompt
    const servicesInfo = selectedServices.map((s, idx) => {
      let info = `${idx + 1}. ${s.name}`;
      if (s.standardText) info += `\n   Descripción base: ${s.standardText}`;
      if (s.objectivesTemplate) info += `\n   Objetivos típicos: ${s.objectivesTemplate}`;
      if (s.deliverablesTemplate) info += `\n   Entregables típicos: ${s.deliverablesTemplate}`;
      return info;
    }).join("\n\n");

    const entitiesInfo = clientContext.entities.length > 0
      ? clientContext.entities.map(e => `- ${e.legalName}${e.rfc ? ` (RFC: ${e.rfc})` : ''}`).join("\n")
      : "No se especificaron entidades";

    const risksInfo = aiAnalysis?.risks && aiAnalysis.risks.length > 0
      ? aiAnalysis.risks.map(r => `- ${r}`).join("\n")
      : "No se identificaron riesgos específicos";

    const systemPrompt = `Eres un abogado senior de un prestigioso despacho legal mexicano. Tu especialidad es redactar propuestas de servicios legales profesionales, claras y personalizadas para cada cliente.

Tu estilo es:
- Formal pero accesible
- Preciso y técnico cuando es necesario
- Orientado a generar confianza y demostrar valor
- Usa lenguaje en tercera persona
- Evita frases genéricas o de relleno`;

    const userPrompt = `Genera el contenido narrativo para una propuesta de servicios legales basándote en la siguiente información:

## CONTEXTO DEL CLIENTE
- **Nombre/Grupo:** ${clientContext.groupAlias || clientContext.clientName}
- **Industria:** ${clientContext.industry || "No especificada"}
- **Número de entidades:** ${clientContext.entityCount}
- **Empleados aproximados:** ${clientContext.employeeCount || "No especificado"}
- **Ingresos anuales:** ${clientContext.annualRevenue || "No especificado"}

### Entidades del grupo:
${entitiesInfo}

### Antecedentes actuales:
${background || "No se proporcionaron antecedentes específicos."}

### Análisis previo (objetivo general):
${aiAnalysis?.objective || "Optimización legal y fiscal del grupo empresarial"}

### Riesgos identificados:
${risksInfo}

## SERVICIOS SELECCIONADOS
${servicesInfo}

---

## GENERA LO SIGUIENTE (en formato JSON):

1. **transitionText**: Un párrafo (2-4 oraciones) que conecte la situación del cliente con los servicios propuestos. Este texto debe:
   - Hacer referencia a las necesidades específicas del cliente
   - Mencionar la importancia de implementar soluciones profesionales
   - Preparar al lector para la lista de servicios

2. **serviceDescriptions**: Un array con una descripción expandida para CADA servicio seleccionado. Cada elemento debe tener:
   - **serviceId**: El ID del servicio (lo proporcionaré)
   - **expandedText**: Descripción detallada (3-5 oraciones) explicando:
     * Qué incluye específicamente este servicio para ESTE cliente
     * Por qué es relevante dada su situación particular
     * Qué beneficios concretos obtendrán
   - **objectives**: Array de 2-4 objetivos específicos y medibles para este servicio

3. **closingText**: Un párrafo de cierre (2-3 oraciones) que:
   - Refuerce el valor de los servicios propuestos
   - Invite a continuar con la relación profesional
   - Mantenga un tono profesional pero cercano

Responde ÚNICAMENTE con el JSON válido, sin texto adicional ni markdown.

Los IDs de los servicios son:
${selectedServices.map(s => `- ${s.name}: "${s.id}"`).join("\n")}`;

    console.log("Calling Lovable AI Gateway...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI Gateway returned ${response.status}: ${errorText}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content received from AI");
    }

    console.log("Raw AI response:", content.substring(0, 500));

    // Parse the JSON response (handle potential markdown wrapping)
    let parsedContent;
    try {
      // Remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();
      
      parsedContent = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.error("Content was:", content);
      throw new Error("Failed to parse AI response as JSON");
    }

    // Validate structure
    if (!parsedContent.transitionText || !parsedContent.serviceDescriptions || !parsedContent.closingText) {
      console.error("Invalid response structure:", parsedContent);
      throw new Error("AI response missing required fields");
    }

    const result = {
      transitionText: parsedContent.transitionText,
      serviceDescriptions: parsedContent.serviceDescriptions,
      closingText: parsedContent.closingText,
      generatedAt: new Date().toISOString(),
    };

    console.log("Successfully generated proposal content");

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-proposal-content:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
