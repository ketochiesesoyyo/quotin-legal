import { Lock, Variable, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function BlockTypeGuide() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Tipos de Bloques</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Static */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded bg-blue-100">
              <Lock className="h-3.5 w-3.5 text-blue-700" />
            </div>
            <span className="font-medium text-sm">Fijo</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed pl-8">
            Texto que <strong>no cambia</strong> entre propuestas. Ideal para 
            introducciones estándar, cláusulas legales, términos y condiciones, 
            o cualquier contenido que debe mantenerse idéntico.
          </p>
        </div>

        {/* Variable */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded bg-amber-100">
              <Variable className="h-3.5 w-3.5 text-amber-700" />
            </div>
            <span className="font-medium text-sm">Variable</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed pl-8">
            Se reemplaza automáticamente con <strong>datos del sistema</strong>: 
            nombre del cliente, fecha, servicios seleccionados, precios, etc. 
            Configura el nombre de variable y la fuente de datos.
          </p>
          <div className="pl-8 mt-1">
            <p className="text-xs text-muted-foreground italic">
              Ejemplo: {"{{nombre_cliente}}"} → "Grupo Industrial ABC"
            </p>
          </div>
        </div>

        {/* Dynamic */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded bg-purple-100">
              <Sparkles className="h-3.5 w-3.5 text-purple-700" />
            </div>
            <span className="font-medium text-sm">Dinámico (IA)</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed pl-8">
            La <strong>IA genera contenido personalizado</strong> basado en las 
            instrucciones que proporciones y el contexto del caso (cliente, 
            industria, servicios, notas).
          </p>
          <div className="pl-8 mt-1">
            <p className="text-xs text-muted-foreground italic">
              Ejemplo: "Redacta antecedentes del caso..." → Texto personalizado
            </p>
          </div>
        </div>

        {/* Usage tip */}
        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground">
            <strong>Cómo usar:</strong> Selecciona texto en el editor y presiona 
            el botón del tipo de bloque que desees asignar.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
