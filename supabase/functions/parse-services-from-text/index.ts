import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParsedService {
  name: string;
  description: string;
  standard_text: string;
  fee_type: "one_time" | "monthly" | "both";
}

interface AIResponse {
  services: ParsedService[];
  confidence: number;
  notes: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Se requiere un texto para analizar" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit text to avoid excessive costs
    const trimmedText = text.slice(0, 15000);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Eres un asistente experto en análisis de servicios profesionales, especialmente en el ámbito legal y de consultoría.

Tu tarea es analizar el texto proporcionado y extraer todos los servicios profesionales que puedas identificar.

Para cada servicio encontrado, debes proporcionar:
1. name: Nombre corto y claro del servicio (máximo 50 caracteres)
2. description: Descripción breve del servicio (1-2 oraciones, máximo 200 caracteres)
3. standard_text: Texto formal y profesional para usar en propuestas de servicios (2-4 oraciones, describiendo el alcance y beneficios)
4. fee_type: Tipo de cobro inferido del contexto:
   - "one_time": Para servicios puntuales (constituciones, contratos, litigios específicos)
   - "monthly": Para servicios de iguala o acompañamiento continuo
   - "both": Para servicios que típicamente tienen un pago inicial + iguala mensual

Si el texto no contiene servicios claros, devuelve un array vacío.

IMPORTANTE: Responde ÚNICAMENTE con un JSON válido, sin texto adicional.`;

    const userPrompt = `Analiza el siguiente texto y extrae los servicios profesionales:

---
${trimmedText}
---

Responde con un JSON en este formato exacto:
{
  "services": [
    {
      "name": "Nombre del Servicio",
      "description": "Descripción breve",
      "standard_text": "Texto formal para propuestas...",
      "fee_type": "one_time"
    }
  ],
  "confidence": 0.85,
  "notes": "Observaciones sobre el análisis"
}`;

    console.log("Calling Lovable AI Gateway to parse services...");

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
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Límite de solicitudes excedido. Por favor, intenta más tarde." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Se requiere agregar créditos. Contacta al administrador." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    console.log("AI response received");

    const content = aiResult.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON response from AI
    let parsedResult: AIResponse;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsedResult = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("La IA no pudo procesar el texto correctamente");
    }

    // Validate the response structure
    if (!parsedResult.services || !Array.isArray(parsedResult.services)) {
      parsedResult = { services: [], confidence: 0, notes: "No se encontraron servicios en el texto" };
    }

    // Ensure all services have required fields
    parsedResult.services = parsedResult.services.map((service) => ({
      name: service.name || "Servicio sin nombre",
      description: service.description || "",
      standard_text: service.standard_text || "",
      fee_type: ["one_time", "monthly", "both"].includes(service.fee_type) 
        ? service.fee_type 
        : "one_time",
    }));

    console.log(`Successfully parsed ${parsedResult.services.length} services`);

    return new Response(JSON.stringify(parsedResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in parse-services-from-text:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Error al procesar la solicitud" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
