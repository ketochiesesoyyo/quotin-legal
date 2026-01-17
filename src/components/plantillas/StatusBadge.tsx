import { Badge } from "@/components/ui/badge";
import { FileEdit, Brain, CheckCircle, CheckCircle2, Zap } from "lucide-react";
import type { TemplateStatus } from "./types";
import { STATUS_CONFIG } from "./types";

const iconMap = {
  FileEdit,
  Brain,
  CheckCircle,
  CheckCircle2,
  Zap,
};

interface StatusBadgeProps {
  status: TemplateStatus;
  showIcon?: boolean;
  className?: string;
}

export function StatusBadge({ status, showIcon = true, className = "" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const IconComponent = iconMap[config.icon as keyof typeof iconMap];

  return (
    <Badge className={`${config.color} ${className}`} variant="secondary">
      {showIcon && IconComponent && <IconComponent className="h-3 w-3 mr-1" />}
      {config.label}
    </Badge>
  );
}
