/**
 * Sprint 2B: Generate Dynamic Content Edge Function
 * 
 * Uses Lovable AI to generate content for dynamic template blocks
 * based on instructions and context from the case/proposal.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DynamicBlockRequest {
  blockId: string;
  instructions: string;
  placeholderContent: string;
  context: {
    client: {
      group_name: string;
      alias?: string;
      industry?: string;
      annual_revenue?: string;
      employee_count?: number;
      contact_name?: string;
      contact_position?: string;
    };
    entities: Array<{
      legal_name: string;
      rfc?: string;
    }>;
    services: Array<{
      name: string;
      description?: string;
      objectives_template?: string;
      deliverables_template?: string;
      standard_text?: string;
      fee?: number;
      monthly_fee?: number;
    }>;
    proposal: {
      date: string;
      title?: string;
      background?: string;
      total_fee: number;
      monthly_retainer: number;
      retainer_months: number;
    };
    case: {
      title: string;
      background?: string;
      notes?: string;
    };
    firm?: {
      name: string;
      address?: string;
      phone?: string;
      email?: string;
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { blocks } = await req.json() as { blocks: DynamicBlockRequest[] };
    
    if (!blocks || blocks.length === 0) {
      return new Response(
        JSON.stringify({ error: "No blocks provided" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log(`Processing ${blocks.length} dynamic block(s)`);

    // Process all blocks in parallel
    const results = await Promise.all(
      blocks.map(async (block) => {
        const systemPrompt = `Eres un redactor legal profesional para un despacho de abogados en México. 
Tu trabajo es generar contenido para propuestas legales basándote en las instrucciones proporcionadas.

REGLAS IMPORTANTES:
- Escribe en español formal y profesional
- Sé conciso pero completo
- Usa terminología legal mexicana apropiada
- El contenido debe ser específico al contexto del cliente y caso
- Genera SOLO el contenido solicitado, sin explicaciones adicionales
- No uses placeholders como [NOMBRE] - usa los datos reales del contexto
- Formatea el texto con párrafos cuando sea apropiado`;

        const contextSummary = `
CONTEXTO DEL CASO:
- Cliente: ${block.context.client.group_name}${block.context.client.industry ? ` (${block.context.client.industry})` : ''}
- Título del caso: ${block.context.case.title}
${block.context.case.background ? `- Antecedentes: ${block.context.case.background}` : ''}
${block.context.case.notes ? `- Notas: ${block.context.case.notes}` : ''}

SERVICIOS A PRESTAR:
${block.context.services.map((s, i) => `${i + 1}. ${s.name}${s.description ? `: ${s.description}` : ''}`).join('\n')}

PROPUESTA:
- Fecha: ${block.context.proposal.date}
- Honorarios iniciales: $${block.context.proposal.total_fee?.toLocaleString('es-MX') || 0}
${block.context.proposal.monthly_retainer ? `- Iguala mensual: $${block.context.proposal.monthly_retainer.toLocaleString('es-MX')}` : ''}

ENTIDADES LEGALES:
${block.context.entities.map(e => `- ${e.legal_name}${e.rfc ? ` (RFC: ${e.rfc})` : ''}`).join('\n') || 'No especificadas'}
${block.context.firm ? `\nDESPACHO: ${block.context.firm.name}` : ''}`;

        const userPrompt = `${contextSummary}

---

INSTRUCCIONES PARA GENERAR:
${block.instructions}

${block.placeholderContent ? `CONTENIDO DE REFERENCIA (reemplazar):
${block.placeholderContent}` : ''}

Genera el contenido ahora:`;

        console.log(`Generating content for block ${block.blockId}`);

        try {
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
              max_tokens: 2000,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`AI gateway error for block ${block.blockId}:`, response.status, errorText);
            
            if (response.status === 429) {
              return {
                blockId: block.blockId,
                success: false,
                error: "Rate limit exceeded. Please try again later.",
                content: null,
              };
            }
            
            if (response.status === 402) {
              return {
                blockId: block.blockId,
                success: false,
                error: "Payment required. Please add credits to your workspace.",
                content: null,
              };
            }
            
            return {
              blockId: block.blockId,
              success: false,
              error: `AI generation failed: ${response.status}`,
              content: null,
            };
          }

          const data = await response.json();
          const generatedContent = data.choices?.[0]?.message?.content?.trim();

          if (!generatedContent) {
            return {
              blockId: block.blockId,
              success: false,
              error: "No content generated",
              content: null,
            };
          }

          console.log(`Successfully generated content for block ${block.blockId}`);

          return {
            blockId: block.blockId,
            success: true,
            error: null,
            content: generatedContent,
          };
        } catch (blockError) {
          console.error(`Error generating block ${block.blockId}:`, blockError);
          return {
            blockId: block.blockId,
            success: false,
            error: blockError instanceof Error ? blockError.message : "Unknown error",
            content: null,
          };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    console.log(`Completed: ${successCount}/${blocks.length} blocks generated successfully`);

    return new Response(
      JSON.stringify({ 
        results,
        summary: {
          total: blocks.length,
          success: successCount,
          failed: blocks.length - successCount,
        }
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("generate-dynamic-content error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
