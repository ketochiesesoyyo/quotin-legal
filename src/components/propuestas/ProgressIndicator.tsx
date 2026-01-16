import { Check, Circle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Step {
  id: string;
  label: string;
  completed: boolean;
  active: boolean;
}

interface ProgressIndicatorProps {
  steps: Step[];
  progress: number;
}

export function ProgressIndicator({ steps, progress }: ProgressIndicatorProps) {
  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Progreso de la propuesta</h3>
        <span className="text-2xl font-bold text-primary">{progress}%</span>
      </div>
      
      <Progress value={progress} className="h-2 mb-4" />
      
      <div className="space-y-2">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center gap-2">
            {step.completed ? (
              <div className="h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="h-3 w-3 text-green-600" />
              </div>
            ) : step.active ? (
              <div className="h-5 w-5 rounded-full border-2 border-primary flex items-center justify-center">
                <Circle className="h-2 w-2 fill-primary text-primary" />
              </div>
            ) : (
              <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
            )}
            <span className={`text-sm ${step.completed ? "text-muted-foreground" : step.active ? "font-medium" : "text-muted-foreground/60"}`}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
