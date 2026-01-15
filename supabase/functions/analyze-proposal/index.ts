import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalysisResult {
  objective: string;
  risks: string[];
  suggestedServices: string[];
  missingInfo: string[];
  nextStatus: string;
  summary: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { caseId } = await req.json();
    
    if (!caseId) {
      throw new Error("caseId is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the case with client info
    const { data: caseData, error: caseError } = await supabase
      .from("cases")
      .select(`
        *,
        clients (
          group_name,
          alias,
          notes,
          contacts (*),
          entities (*)
        )
      `)
      .eq("id", caseId)
      .single();

    if (caseError || !caseData) {
      console.error("Error fetching case:", caseError);
      throw new Error("Case not found");
    }

    // Get available services for suggestions
    const { data: services } = await supabase
      .from("services")
      .select("id, name, category, standard_text");

    // Update status to analyzing
    await supabase
      .from("cases")
      .update({ ai_status: "analyzing" })
      .eq("id", caseId);

    console.log("Analyzing case:", caseData.title);
    console.log("Notes:", caseData.notes);
    console.log("Client:", caseData.clients?.group_name);

    const systemPrompt = `Eres un asistente de análisis legal para un despacho de abogados. Tu rol es analizar las notas de conversaciones con clientes y extraer información estructurada.

Debes analizar las notas proporcionadas y extraer:
1. **Objetivo del cliente**: ¿Qué busca lograr el cliente? Resume en 1-2 oraciones.
2. **Riesgos mencionados**: Lista de riesgos o preocupaciones identificados en la conversación.
3. **Servicios sugeridos**: Basándote en el catálogo de servicios disponibles, sugiere cuáles podrían aplicar.
4. **Información faltante**: ¿Qué información adicional se necesita para avanzar?
5. **Resumen ejecutivo**: Un párrafo breve con el contexto general.

IMPORTANTE:
- Solo SUGIERES servicios, no los seleccionas
- Identifica HUECOS de información claramente
- Sé conciso pero completo
- Si hay información del cliente en el CRM, úsala para enriquecer el análisis

Catálogo de servicios disponibles:
${services?.map(s => `- ${s.name} (${s.category})`).join('\n') || 'No hay servicios configurados'}`;

    const userPrompt = `Analiza las siguientes notas de conversación:

TÍTULO DEL CASO: ${caseData.title}
TIPO DE NECESIDAD: ${caseData.need_type || 'No especificado'}

NOTAS DE LA CONVERSACIÓN:
${caseData.notes || 'Sin notas'}

INFORMACIÓN DEL CLIENTE:
- Nombre: ${caseData.clients?.group_name || 'No especificado'}
- Alias: ${caseData.clients?.alias || 'No especificado'}
- Notas del cliente: ${caseData.clients?.notes || 'Sin notas'}
- Contactos registrados: ${caseData.clients?.contacts?.length || 0}
- Entidades registradas: ${caseData.clients?.entities?.length || 0}

Por favor proporciona el análisis estructurado.`;

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
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_proposal",
              description: "Estructura el análisis de la propuesta/caso",
              parameters: {
                type: "object",
                properties: {
                  objective: {
                    type: "string",
                    description: "Objetivo del cliente en 1-2 oraciones"
                  },
                  risks: {
                    type: "array",
                    items: { type: "string" },
                    description: "Lista de riesgos identificados"
                  },
                  suggestedServices: {
                    type: "array",
                    items: { type: "string" },
                    description: "Nombres de servicios sugeridos del catálogo"
                  },
                  missingInfo: {
                    type: "array",
                    items: { type: "string" },
                    description: "Información faltante para avanzar"
                  },
                  summary: {
                    type: "string",
                    description: "Resumen ejecutivo del caso"
                  }
                },
                required: ["objective", "risks", "suggestedServices", "missingInfo", "summary"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analyze_proposal" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        await supabase.from("cases").update({ ai_status: "error" }).eq("id", caseId);
        return new Response(
          JSON.stringify({ error: "Límite de solicitudes excedido. Intenta de nuevo más tarde." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        await supabase.from("cases").update({ ai_status: "error" }).eq("id", caseId);
        return new Response(
          JSON.stringify({ error: "Se requiere agregar créditos para usar la IA." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI error: ${errorText}`);
    }

    const aiResponse = await response.json();
    console.log("AI Response:", JSON.stringify(aiResponse, null, 2));

    let analysis: AnalysisResult;
    
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      analysis = {
        ...parsed,
        nextStatus: determineNextStatus(parsed, caseData)
      };
    } else {
      throw new Error("No structured response from AI");
    }

    // Update the case with analysis
    const { error: updateError } = await supabase
      .from("cases")
      .update({
        ai_analysis: analysis,
        ai_analyzed_at: new Date().toISOString(),
        ai_status: "completed",
        status: analysis.nextStatus
      })
      .eq("id", caseId);

    if (updateError) {
      console.error("Error updating case:", updateError);
      throw updateError;
    }

    console.log("Analysis completed successfully");

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analyze-proposal:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function determineNextStatus(analysis: Omit<AnalysisResult, 'nextStatus'>, caseData: any): string {
  const hasCriticalMissing = analysis.missingInfo.some(info => 
    info.toLowerCase().includes('documento') || 
    info.toLowerCase().includes('contrato') ||
    info.toLowerCase().includes('identificación')
  );

  if (hasCriticalMissing) {
    return "docs_solicitados";
  }
  
  if (analysis.missingInfo.length > 2) {
    return "nuevo";
  }
  
  if (analysis.suggestedServices.length > 0 && analysis.missingInfo.length <= 2) {
    return "en_analisis";
  }
  
  return "docs_solicitados";
}
