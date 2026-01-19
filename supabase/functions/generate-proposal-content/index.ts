import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================
// Interfaces
// ============================================

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

// Request body supports both modes
interface RequestBody {
  // Required for template mode
  caseId?: string;
  mode?: 'template' | 'freeform';
  
  // Freeform mode payload (required if mode is freeform or not specified)
  selectedServices?: ServiceInput[];
  clientContext?: ClientContext;
  aiAnalysis?: AIAnalysisContext | null;
  background?: string;
}

// Zod schema for validating AI output in template mode
const BlockContentsSchema = z.object({
  block_contents: z.record(z.string(), z.string())
});

// ============================================
// Helper Functions
// ============================================

/**
 * Normalizes ai_instructions to a string for prompts
 */
function normalizeAIInstructions(instructions: unknown): string {
  if (!instructions) return '';
  if (typeof instructions === 'string') return instructions;
  if (typeof instructions === 'object') {
    try {
      // Check for common patterns
      const obj = instructions as Record<string, unknown>;
      if (obj.global && typeof obj.global === 'string') {
        return obj.global;
      }
      return JSON.stringify(instructions, null, 2);
    } catch {
      return '';
    }
  }
  return '';
}

/**
 * Extracts JSON from AI response (handles markdown wrapping)
 */
function extractJSON(content: string): string | null {
  // Try to find JSON object in the response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }
  return null;
}

/**
 * Cleans markdown from response
 */
function cleanMarkdown(content: string): string {
  let clean = content.trim();
  if (clean.startsWith("```json")) {
    clean = clean.slice(7);
  } else if (clean.startsWith("```")) {
    clean = clean.slice(3);
  }
  if (clean.endsWith("```")) {
    clean = clean.slice(0, -3);
  }
  return clean.trim();
}

// ============================================
// Template Mode Handler
// ============================================

async function handleTemplateMode(
  supabase: any,
  caseId: string,
  LOVABLE_API_KEY: string
): Promise<Response> {
  console.log("Template mode: Fetching case data for:", caseId);

  // Fetch case with template snapshot and related data
  const { data: caseData, error: caseError } = await supabase
    .from("cases")
    .select(`
      id,
      selected_template_id,
      template_snapshot,
      notes,
      client_id,
      clients (
        id,
        group_name,
        alias,
        industry,
        employee_count,
        annual_revenue
      )
    `)
    .eq("id", caseId)
    .single();

  if (caseError || !caseData) {
    console.error("Error fetching case:", caseError);
    return new Response(
      JSON.stringify({ error: "Case not found", details: caseError?.message }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Check for template snapshot
  if (!caseData.template_snapshot) {
    return new Response(
      JSON.stringify({ 
        error: "Case has no template snapshot", 
        details: "This case was not created with a template or the template snapshot is missing" 
      }),
      { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const templateSnapshot = caseData.template_snapshot as {
    template_id: string;
    template_name: string;
    schema_json: {
      blocks: Array<{
        id: string;
        type: 'static' | 'variable' | 'dynamic';
        content: string;
        order: number;
        instructions?: string;
      }>;
      version: string;
    };
    ai_instructions?: unknown;
  };

  // Fetch case services for context
  const { data: caseServices } = await supabase
    .from("case_services")
    .select(`
      services (
        id,
        name,
        standard_text,
        objectives_template,
        deliverables_template
      )
    `)
    .eq("case_id", caseId);

  // Fetch entities for context
  const { data: entities } = await supabase
    .from("client_entities")
    .select("legal_name, rfc")
    .eq("client_id", caseData.client_id);

  // Extract dynamic blocks that need generation
  const dynamicBlocks = templateSnapshot.schema_json.blocks
    .filter(b => b.type === 'dynamic')
    .sort((a, b) => a.order - b.order);

  if (dynamicBlocks.length === 0) {
    console.log("No dynamic blocks to generate");
    return new Response(
      JSON.stringify({
        mode: "template",
        template_id: templateSnapshot.template_id,
        block_contents: {},
        warnings: [],
        generatedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Check for blocks without instructions
  const blocksWithoutInstructions = dynamicBlocks.filter(b => !b.instructions || b.instructions.trim() === '');
  const warnings: Array<{ block_id: string; reason: string; details: string }> = 
    blocksWithoutInstructions.map(b => ({
      block_id: b.id,
      reason: "missing_instructions",
      details: `Dynamic block "${b.id}" has no instructions configured`
    }));

  // Only process blocks with instructions
  const blocksToGenerate = dynamicBlocks.filter(b => b.instructions && b.instructions.trim() !== '');

  if (blocksToGenerate.length === 0) {
    return new Response(
      JSON.stringify({
        mode: "template",
        template_id: templateSnapshot.template_id,
        block_contents: {},
        warnings,
        generatedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Build context for AI
  const clientInfo = caseData.clients as { group_name: string; alias?: string; industry?: string } | null;
  const servicesInfo = caseServices?.map((cs: any) => cs.services?.name).filter(Boolean).join(', ') || 'Sin servicios seleccionados';
  const entitiesInfo = entities?.map((e: any) => e.legal_name).join(', ') || 'Sin entidades';

  // Normalize ai_instructions
  const globalInstructions = normalizeAIInstructions(templateSnapshot.ai_instructions);

  // Build single prompt for all blocks
  const blocksDescription = blocksToGenerate.map((b, idx) => 
    `${idx + 1}. Block ID: "${b.id}"
   Instrucciones: ${b.instructions}
   Contenido base/placeholder: ${b.content || 'N/A'}`
  ).join('\n\n');

  const systemPrompt = `Eres un abogado senior de un prestigioso despacho legal mexicano especializado en redactar propuestas de servicios legales profesionales.

Tu estilo es:
- Formal pero accesible
- Preciso y técnico cuando es necesario
- Orientado a generar confianza y demostrar valor
- Usa lenguaje en tercera persona
- Evita frases genéricas o de relleno

${globalInstructions ? `\nINSTRUCCIONES GLOBALES DE LA PLANTILLA:\n${globalInstructions}` : ''}`;

  const userPrompt = `Genera contenido para los siguientes bloques dinámicos de una propuesta legal.

## CONTEXTO
- Cliente: ${clientInfo?.group_name || 'Cliente'} ${clientInfo?.alias ? `(${clientInfo.alias})` : ''}
- Industria: ${clientInfo?.industry || 'No especificada'}
- Notas del caso: ${caseData.notes || 'Sin notas adicionales'}
- Servicios seleccionados: ${servicesInfo}
- Entidades: ${entitiesInfo}

## BLOQUES A GENERAR
${blocksDescription}

## FORMATO DE RESPUESTA
Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
{
  "block_contents": {
    "${blocksToGenerate[0]?.id || 'block_id'}": "Contenido generado para este bloque en HTML...",
    ${blocksToGenerate.length > 1 ? `"${blocksToGenerate[1]?.id}": "Contenido generado...",` : ''}
    // ... una key por cada block_id listado arriba
  }
}

IMPORTANTE:
- Cada valor debe ser contenido HTML válido
- Usa <p>, <ul>, <li>, <strong>, <em> según corresponda
- NO incluyas markdown ni texto fuera del JSON
- Genera contenido profesional y específico para el contexto del cliente`;

  console.log("Calling Lovable AI Gateway for template mode...");

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

  // Parse and validate response with Zod
  const jsonStr = extractJSON(cleanMarkdown(content));
  if (!jsonStr) {
    console.error("No valid JSON found in response:", content.substring(0, 500));
    return new Response(
      JSON.stringify({ 
        error: "Invalid AI response format",
        details: "No valid JSON found in model output",
        raw_output: content.substring(0, 500)
      }),
      { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let parsedContent;
  try {
    parsedContent = JSON.parse(jsonStr);
  } catch (parseError) {
    console.error("JSON parse error:", parseError);
    return new Response(
      JSON.stringify({ 
        error: "Failed to parse AI response as JSON",
        raw_output: jsonStr.substring(0, 500)
      }),
      { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Validate with Zod
  const validation = BlockContentsSchema.safeParse(parsedContent);
  if (!validation.success) {
    console.error("Zod validation error:", validation.error);
    return new Response(
      JSON.stringify({ 
        error: "Invalid model output structure",
        details: validation.error.errors,
        raw_output: jsonStr.substring(0, 500)
      }),
      { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const blockContents = validation.data.block_contents;

  // Check for missing blocks
  for (const block of blocksToGenerate) {
    if (!blockContents[block.id]) {
      warnings.push({
        block_id: block.id,
        reason: "missing_content",
        details: `No content was generated for block "${block.id}"`
      });
    }
  }

  // Persist to database
  console.log("Persisting generated content to database...");
  const { error: updateError } = await supabase
    .from("cases")
    .update({
      generated_block_contents: blockContents,
      content_generated_at: new Date().toISOString(),
    })
    .eq("id", caseId);

  if (updateError) {
    console.error("Error persisting content:", updateError);
    // Don't fail the request, just log it
  }

  console.log("Successfully generated template content");

  return new Response(
    JSON.stringify({
      mode: "template",
      template_id: templateSnapshot.template_id,
      block_contents: blockContents,
      warnings,
      generatedAt: new Date().toISOString(),
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ============================================
// Freeform Mode Handler (Original Logic)
// ============================================

async function handleFreeformMode(
  body: RequestBody,
  LOVABLE_API_KEY: string
): Promise<Response> {
  const { selectedServices, clientContext, aiAnalysis, background } = body;

  if (!selectedServices || !clientContext) {
    return new Response(
      JSON.stringify({ error: "Missing required fields for freeform mode: selectedServices and clientContext" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("Generating freeform proposal content for:", clientContext.clientName);
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

1. **transitionText**: Un párrafo (2-4 oraciones) que conecte la situación del cliente con los servicios propuestos.

2. **serviceDescriptions**: Un array con una descripción expandida para CADA servicio seleccionado. Cada elemento debe tener:
   - **serviceId**: El ID del servicio
   - **expandedText**: Descripción detallada (3-5 oraciones)
   - **objectives**: Array de 2-4 objetivos específicos

3. **closingText**: Un párrafo de cierre (2-3 oraciones).

Responde ÚNICAMENTE con el JSON válido, sin texto adicional ni markdown.

Los IDs de los servicios son:
${selectedServices.map(s => `- ${s.name}: "${s.id}"`).join("\n")}`;

  console.log("Calling Lovable AI Gateway for freeform mode...");

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

  // Parse the JSON response
  let parsedContent;
  try {
    const cleanContent = cleanMarkdown(content);
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
    mode: "freeform",
    transitionText: parsedContent.transitionText,
    serviceDescriptions: parsedContent.serviceDescriptions,
    closingText: parsedContent.closingText,
    generatedAt: new Date().toISOString(),
  };

  console.log("Successfully generated freeform proposal content");

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ============================================
// Main Handler
// ============================================

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

    // Determine mode
    const mode = body.mode || (body.caseId ? 'template' : 'freeform');

    if (mode === 'template') {
      if (!body.caseId) {
        return new Response(
          JSON.stringify({ error: "caseId is required for template mode" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get auth header for RLS
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "No authorization header" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create Supabase client with user's auth
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      return await handleTemplateMode(supabase, body.caseId, LOVABLE_API_KEY);
    } else {
      // Freeform mode
      return await handleFreeformMode(body, LOVABLE_API_KEY);
    }
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
