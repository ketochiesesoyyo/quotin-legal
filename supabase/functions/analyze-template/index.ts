const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalyzeRequest {
  template_id: string;
  canonical_content: {
    text: string;
    html: string;
    blocks?: Array<{
      id: string;
      type: string;
      content: string;
    }>;
  };
  context: string;
}

interface DetectedBlock {
  block_id: string;
  suggested_type: "static" | "variable";
  confidence: number;
  reason: string;
  suggested_source?: string;
  suggested_variable_name?: string;
}

interface AnalysisResult {
  detected_blocks: DetectedBlock[];
  warnings: string[];
  confidence_score: number;
  analyzed_at: string;
}

// Legal keywords that should force static type
const LEGAL_STATIC_KEYWORDS = [
  "confidencial",
  "confidencialidad",
  "penalidad",
  "jurisdicción",
  "competencia",
  "tribunal",
  "cláusula",
  "obligación",
  "responsabilidad",
  "garantía",
  "indemnización",
  "rescisión",
  "terminación",
  "propiedad intelectual",
  "secreto",
  "ley aplicable",
];

// Variable patterns
const VARIABLE_PATTERNS = [
  { pattern: /\{\{(\w+)\}\}/g, type: "template_variable" },
  { pattern: /\[nombre[_\s]?cliente\]/gi, type: "client_name" },
  { pattern: /\[fecha\]/gi, type: "date" },
  { pattern: /\[monto\]/gi, type: "amount" },
  { pattern: /estimad[oa]\s+(señor|cliente|licenciado)/gi, type: "salutation" },
];

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { template_id, canonical_content, context }: AnalyzeRequest = await req.json();

    if (!template_id || !canonical_content) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: template_id, canonical_content" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Analyzing template: ${template_id}`);

    const text = canonical_content.text || "";
    const existingBlocks = canonical_content.blocks || [];

    // If user already marked blocks, analyze those
    if (existingBlocks.length > 0) {
      const detectedBlocks: DetectedBlock[] = existingBlocks.map((block) => {
        // Check if content contains legal keywords
        const hasLegalKeywords = LEGAL_STATIC_KEYWORDS.some((keyword) =>
          block.content.toLowerCase().includes(keyword.toLowerCase())
        );

        // Check for variable patterns
        const hasVariablePattern = VARIABLE_PATTERNS.some((p) =>
          p.pattern.test(block.content)
        );

        let suggestedType: "static" | "variable" = block.type as "static" | "variable";
        let confidence = 0.9;
        let reason = "User-defined block type";
        let suggestedSource: string | undefined;
        let suggestedVariableName: string | undefined;

        // Override logic based on content analysis
        if (hasLegalKeywords && block.type !== "static") {
          suggestedType = "static";
          confidence = 0.95;
          reason = "legal_clause_detected";
        } else if (hasVariablePattern) {
          suggestedType = "variable";
          confidence = 0.85;
          reason = "variable_pattern_detected";
          
          // Try to extract variable name
          const match = block.content.match(/\{\{(\w+)\}\}/);
          if (match) {
            suggestedVariableName = match[1];
            suggestedSource = `context.${match[1]}`;
          }
        }

        return {
          block_id: block.id,
          suggested_type: suggestedType,
          confidence,
          reason,
          suggested_source: suggestedSource,
          suggested_variable_name: suggestedVariableName,
        };
      });

      // Generate warnings
      const warnings: string[] = [];
      
      detectedBlocks.forEach((block) => {
        if (block.confidence < 0.7) {
          warnings.push(
            `Bloque ${block.block_id}: Confianza baja (${Math.round(block.confidence * 100)}%) - requiere revisión manual`
          );
        }
        
        const originalBlock = existingBlocks.find((b) => b.id === block.block_id);
        if (originalBlock?.type !== block.suggested_type) {
          warnings.push(
            `Bloque ${block.block_id}: Tipo cambiado de ${originalBlock?.type} a ${block.suggested_type} - ${block.reason}`
          );
        }
      });

      // Calculate overall confidence
      const avgConfidence =
        detectedBlocks.reduce((sum, b) => sum + b.confidence, 0) / detectedBlocks.length;

      const result: AnalysisResult = {
        detected_blocks: detectedBlocks,
        warnings,
        confidence_score: Math.round(avgConfidence * 100) / 100,
        analyzed_at: new Date().toISOString(),
      };

      console.log(`Analysis complete: ${detectedBlocks.length} blocks, confidence: ${result.confidence_score}`);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If no blocks marked, analyze the raw text
    // Split into paragraphs/sections
    const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);

    const detectedBlocks: DetectedBlock[] = paragraphs.map((paragraph, index) => {
      const blockId = `block_${index + 1}`;
      
      // Check for legal keywords
      const hasLegalKeywords = LEGAL_STATIC_KEYWORDS.some((keyword) =>
        paragraph.toLowerCase().includes(keyword.toLowerCase())
      );

      // Check for variable patterns
      let hasVariablePattern = false;
      let variableName: string | undefined;
      let variableSource: string | undefined;

      for (const { pattern, type } of VARIABLE_PATTERNS) {
        const match = paragraph.match(pattern);
        if (match) {
          hasVariablePattern = true;
          variableName = type;
          
          // Map to sources
          if (type === "client_name") {
            variableSource = "client.group_name";
            variableName = "client_name";
          } else if (type === "date") {
            variableSource = "proposal.date";
            variableName = "proposal_date";
          }
          break;
        }
      }

      // Determine type and confidence
      let suggestedType: "static" | "variable";
      let confidence: number;
      let reason: string;

      if (hasLegalKeywords) {
        suggestedType = "static";
        confidence = 0.95;
        reason = "legal_boilerplate";
      } else if (hasVariablePattern) {
        suggestedType = "variable";
        confidence = 0.88;
        reason = "variable_pattern_detected";
      } else if (paragraph.length > 200) {
        // Long paragraphs are likely dynamic content
        suggestedType = "variable";
        confidence = 0.65; // Low confidence - needs review
        reason = "likely_dynamic_content";
      } else {
        // Default to static for safety
        suggestedType = "static";
        confidence = 0.75;
        reason = "default_static";
      }

      // FAIL-SAFE: If confidence < 0.7, force to static
      if (confidence < 0.7) {
        suggestedType = "static";
        reason = `${reason} - forced_static_low_confidence`;
      }

      return {
        block_id: blockId,
        suggested_type: suggestedType,
        confidence,
        reason,
        suggested_source: variableSource,
        suggested_variable_name: variableName,
      };
    });

    // Generate warnings
    const warnings: string[] = [];
    
    const lowConfidenceBlocks = detectedBlocks.filter((b) => b.confidence < 0.7);
    if (lowConfidenceBlocks.length > 0) {
      warnings.push(
        `${lowConfidenceBlocks.length} bloque(s) con confianza baja - marcados como STATIC por defecto`
      );
    }

    const staticLegalBlocks = detectedBlocks.filter(
      (b) => b.reason === "legal_boilerplate"
    );
    if (staticLegalBlocks.length > 0) {
      staticLegalBlocks.forEach((b) => {
        warnings.push(
          `Bloque ${b.block_id}: Cláusula legal detectada - forzado a STATIC por seguridad`
        );
      });
    }

    // Calculate overall confidence
    const avgConfidence =
      detectedBlocks.reduce((sum, b) => sum + b.confidence, 0) / 
      Math.max(detectedBlocks.length, 1);

    const result: AnalysisResult = {
      detected_blocks: detectedBlocks,
      warnings,
      confidence_score: Math.round(avgConfidence * 100) / 100,
      analyzed_at: new Date().toISOString(),
    };

    console.log(`Analysis complete: ${detectedBlocks.length} blocks, confidence: ${result.confidence_score}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error analyzing template:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        detected_blocks: [],
        warnings: ["Error en el análisis - la plantilla permanece en estado draft"],
        confidence_score: 0,
        analyzed_at: new Date().toISOString(),
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
