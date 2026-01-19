/**
 * rewrite-text - Edge function for AI-powered text rewriting
 * 
 * Takes original text and user instructions to rewrite content
 * while maintaining professional legal proposal tone.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RewriteRequest {
  originalText: string;
  instruction: string;
  context?: {
    clientName?: string;
    industry?: string;
    sectionType?: 'background' | 'service' | 'transition' | 'closing' | 'pricing';
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { originalText, instruction, context } = await req.json() as RewriteRequest;

    if (!originalText || !instruction) {
      return new Response(
        JSON.stringify({ error: "originalText and instruction are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build system prompt based on section type
    const sectionContext = context?.sectionType 
      ? `Esta es una sección de tipo "${context.sectionType}" de la propuesta.`
      : "";
    
    const clientContext = context?.clientName
      ? `El cliente es ${context.clientName}${context.industry ? `, del sector ${context.industry}` : ""}.`
      : "";

    const systemPrompt = `Eres un abogado senior especializado en la redacción de propuestas legales corporativas en México. Tu tarea es reescribir textos de propuestas siguiendo las instrucciones del usuario.

${sectionContext}
${clientContext}

REGLAS IMPORTANTES:
1. Mantén un tono profesional y formal apropiado para documentos legales
2. Preserva la información técnica y legal importante
3. No inventes datos específicos (nombres, fechas, montos) que no estén en el original
4. Responde ÚNICAMENTE con el texto reescrito, sin explicaciones adicionales
5. El texto debe estar en español formal mexicano
6. Mantén la longitud similar al original a menos que la instrucción indique lo contrario`;

    const userPrompt = `Texto original:
"""
${originalText}
"""

Instrucción del usuario: ${instruction}

Reescribe el texto siguiendo la instrucción. Responde SOLO con el texto reescrito:`;

    console.log("Calling Lovable AI for text rewrite...");

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
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Usage limit reached. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const rewrittenText = data.choices?.[0]?.message?.content?.trim();

    if (!rewrittenText) {
      throw new Error("No content returned from AI");
    }

    console.log("Text rewritten successfully");

    return new Response(
      JSON.stringify({
        rewrittenText,
        originalLength: originalText.length,
        newLength: rewrittenText.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("rewrite-text error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
