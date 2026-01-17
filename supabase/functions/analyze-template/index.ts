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

// Variable patterns - using functions to avoid regex lastIndex issues
const VARIABLE_PATTERNS = [
  { pattern: /\{\{[\w.]+\}\}/, type: "template_variable", extract: /\{\{([\w.]+)\}\}/ },
  { pattern: /\[nombre[_\s]?cliente\]/i, type: "client_name", source: "client.group_name" },
  { pattern: /\[fecha\]/i, type: "date", source: "proposal.date" },
  { pattern: /\[monto\]/i, type: "amount", source: "proposal.total_fee" },
  { pattern: /estimad[oa]\s+(señor|cliente|licenciado)/i, type: "salutation", source: "client.contact_name" },
  { pattern: /{{client\.[\w]+}}/i, type: "client_var" },
  { pattern: /{{service\.[\w]+}}/i, type: "service_var" },
  { pattern: /{{proposal\.[\w]+}}/i, type: "proposal_var" },
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

        // Check for variable patterns - use match() instead of test() to avoid lastIndex issues
        const hasVariablePattern = VARIABLE_PATTERNS.some((p) =>
          block.content.match(p.pattern) !== null
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
          
          // Try to extract variable name from {{variable.name}} patterns
          const varMatch = block.content.match(/\{\{([\w.]+)\}\}/);
          if (varMatch) {
            suggestedVariableName = varMatch[1].replace('.', '_');
            suggestedSource = varMatch[1];
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

      // Generate human-friendly warnings
      const warnings: string[] = [];
      
      detectedBlocks.forEach((block, index) => {
        const blockNumber = index + 1;
        
        if (block.confidence < 0.7) {
          warnings.push(
            `⚠️ El bloque #${blockNumber} tiene baja certeza de clasificación. Te recomendamos revisarlo manualmente.`
          );
        }
        
        const originalBlock = existingBlocks.find((b) => b.id === block.block_id);
        if (originalBlock?.type !== block.suggested_type) {
          // Human-friendly explanations
          const fromTypeHuman = originalBlock?.type === 'dynamic' ? 'Dinámico' : 
                                originalBlock?.type === 'variable' ? 'Variable' : 'Fijo';
          const toTypeHuman = block.suggested_type === 'static' ? 'Fijo' : 
                              block.suggested_type === 'variable' ? 'Variable' : 'Dinámico';
          
          if (block.reason === 'legal_clause_detected') {
            warnings.push(
              `📋 Bloque #${blockNumber}: Marcaste este texto como "${fromTypeHuman}", pero detectamos términos legales (como cláusulas de confidencialidad o jurisdicción). Por seguridad, te sugerimos cambiarlo a "${toTypeHuman}" para evitar que la IA modifique contenido legal sensible.`
            );
          } else if (block.reason === 'variable_pattern_detected') {
            warnings.push(
              `📝 Bloque #${blockNumber}: Detectamos variables como {{nombre}} en este texto. Te sugerimos marcarlo como "Variable" para que se complete automáticamente con los datos del cliente.`
            );
          } else {
            warnings.push(
              `ℹ️ Bloque #${blockNumber}: Sugerimos cambiar de "${fromTypeHuman}" a "${toTypeHuman}" basándonos en el contenido del texto.`
            );
          }
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

      for (const patternDef of VARIABLE_PATTERNS) {
        const match = paragraph.match(patternDef.pattern);
        if (match) {
          hasVariablePattern = true;
          
          // Extract variable info from {{var.name}} patterns
          const varMatch = paragraph.match(/\{\{([\w.]+)\}\}/);
          if (varMatch) {
            variableSource = varMatch[1];
            variableName = varMatch[1].replace('.', '_');
          } else if ('source' in patternDef) {
            variableSource = patternDef.source as string;
            variableName = patternDef.type;
          } else {
            variableName = patternDef.type;
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

    // Generate human-friendly warnings
    const warnings: string[] = [];
    
    const lowConfidenceBlocks = detectedBlocks.filter((b) => b.confidence < 0.7);
    if (lowConfidenceBlocks.length > 0) {
      warnings.push(
        `⚠️ Encontramos ${lowConfidenceBlocks.length} sección(es) donde no estamos seguros de cómo clasificarlas. Las marcamos como "Fijo" por seguridad, pero te recomendamos revisarlas.`
      );
    }

    const staticLegalBlocks = detectedBlocks.filter(
      (b) => b.reason === "legal_boilerplate"
    );
    if (staticLegalBlocks.length > 0) {
      warnings.push(
        `📋 Detectamos ${staticLegalBlocks.length} sección(es) con términos legales importantes (como cláusulas de confidencialidad o responsabilidad). Las marcamos como "Fijo" para proteger el contenido legal y evitar modificaciones automáticas.`
      );
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
