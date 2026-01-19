import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateCaseRequest {
  title: string;
  client_id: string;
  need_type?: string;
  notes?: string;
  selected_template_id?: string;
}

interface TemplateSnapshot {
  template_id: string;
  template_name: string;
  schema_json: unknown;
  ai_instructions?: unknown;
  version: string;
  snapshotted_at: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header for RLS
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's auth (respects RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const body: CreateCaseRequest = await req.json();
    const { title, client_id, need_type, notes, selected_template_id } = body;

    // Validate required fields
    if (!title || !client_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: title and client_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build template snapshot if a template is selected
    let templateSnapshot: TemplateSnapshot | null = null;
    
    if (selected_template_id) {
      console.log("Fetching template for snapshot:", selected_template_id);
      
      const { data: template, error: templateError } = await supabase
        .from("document_templates")
        .select("id, name, schema_json, ai_instructions, version")
        .eq("id", selected_template_id)
        .eq("status", "active")
        .single();

      if (templateError) {
        console.error("Error fetching template:", templateError);
        return new Response(
          JSON.stringify({ error: "Selected template not found or not active" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (template) {
        templateSnapshot = {
          template_id: template.id,
          template_name: template.name,
          schema_json: template.schema_json,
          ai_instructions: template.ai_instructions,
          version: template.version || "1.0",
          snapshotted_at: new Date().toISOString(),
        };
        console.log("Template snapshot created:", templateSnapshot.template_name);
      }
    }

    // Insert the case with template snapshot
    const { data: newCase, error: insertError } = await supabase
      .from("cases")
      .insert({
        title,
        client_id,
        need_type: need_type || null,
        notes: notes || null,
        status: "nuevo",
        ai_status: "pending",
        selected_template_id: selected_template_id || null,
        template_snapshot: templateSnapshot,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating case:", insertError);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Case created successfully:", newCase.id);

    return new Response(
      JSON.stringify(newCase),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in create-case:", error);
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
