/**
 * DocumentSidebar - Collapsible panel showing client/services context
 * 
 * Provides quick reference to context data that can be inserted into the document
 */

import { useState } from "react";
import {
  Building2,
  User,
  FileText,
  ChevronRight,
  ChevronLeft,
  Copy,
  Check,
  Briefcase,
  Calendar,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface Entity {
  legalName: string;
  rfc?: string | null;
}

interface Service {
  id: string;
  name: string;
  description?: string | null;
  fee?: number;
  monthlyFee?: number;
}

interface Contact {
  fullName: string;
  position?: string | null;
  email?: string | null;
}

interface DocumentSidebarProps {
  clientName: string;
  groupAlias?: string;
  industry?: string | null;
  entities: Entity[];
  services: Service[];
  primaryContact?: Contact;
  onInsertText?: (text: string) => void;
  className?: string;
}

// Helper to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

function CopyableItem({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy?: (text: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    onCopy?.(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 group">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm truncate">{value}</p>
      </div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{copied ? "¡Copiado!" : "Copiar"}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

export function DocumentSidebar({
  clientName,
  groupAlias,
  industry,
  entities,
  services,
  primaryContact,
  onInsertText,
  className,
}: DocumentSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [clientOpen, setClientOpen] = useState(true);
  const [entitiesOpen, setEntitiesOpen] = useState(true);
  const [servicesOpen, setServicesOpen] = useState(true);

  // Calculate total fees
  const totalInitialFee = services.reduce((sum, s) => sum + (s.fee || 0), 0);
  const totalMonthlyFee = services.reduce((sum, s) => sum + (s.monthlyFee || 0), 0);

  if (isCollapsed) {
    return (
      <div className={cn("w-10 border-r bg-muted/30 flex flex-col items-center py-4", className)}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsCollapsed(false)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Mostrar panel de contexto</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <Separator className="my-4" />
        
        <div className="space-y-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="h-8 w-8 flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">{clientName}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="h-8 w-8 flex items-center justify-center">
                  <Badge variant="secondary" className="text-xs px-1">
                    {entities.length}
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">{entities.length} entidades</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="h-8 w-8 flex items-center justify-center">
                  <Badge variant="secondary" className="text-xs px-1">
                    {services.length}
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">{services.length} servicios</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-72 border-r bg-muted/30 flex flex-col", className)}>
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between shrink-0">
        <h3 className="font-semibold text-sm">Datos de Contexto</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setIsCollapsed(true)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* Client Section */}
          <Collapsible open={clientOpen} onOpenChange={setClientOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded hover:bg-muted">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium flex-1 text-left">Cliente</span>
              <ChevronRight
                className={cn("h-4 w-4 transition-transform", clientOpen && "rotate-90")}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-6 space-y-1 mt-1">
              <CopyableItem label="Nombre del grupo" value={clientName} onCopy={onInsertText} />
              {groupAlias && (
                <CopyableItem label="Alias" value={groupAlias} onCopy={onInsertText} />
              )}
              {industry && (
                <CopyableItem label="Industria" value={industry} onCopy={onInsertText} />
              )}
              {primaryContact && (
                <>
                  <CopyableItem
                    label="Contacto"
                    value={primaryContact.fullName}
                    onCopy={onInsertText}
                  />
                  {primaryContact.position && (
                    <CopyableItem
                      label="Cargo"
                      value={primaryContact.position}
                      onCopy={onInsertText}
                    />
                  )}
                </>
              )}
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Entities Section */}
          <Collapsible open={entitiesOpen} onOpenChange={setEntitiesOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded hover:bg-muted">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium flex-1 text-left">
                Entidades ({entities.length})
              </span>
              <ChevronRight
                className={cn("h-4 w-4 transition-transform", entitiesOpen && "rotate-90")}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-6 space-y-1 mt-1">
              {entities.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">Sin entidades registradas</p>
              ) : (
                entities.map((entity, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <CopyableItem
                      label={`Entidad ${idx + 1}`}
                      value={entity.legalName}
                      onCopy={onInsertText}
                    />
                    {entity.rfc && (
                      <div className="pl-2">
                        <CopyableItem label="RFC" value={entity.rfc} onCopy={onInsertText} />
                      </div>
                    )}
                  </div>
                ))
              )}
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Services Section */}
          <Collapsible open={servicesOpen} onOpenChange={setServicesOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded hover:bg-muted">
              <Briefcase className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium flex-1 text-left">
                Servicios ({services.length})
              </span>
              <ChevronRight
                className={cn("h-4 w-4 transition-transform", servicesOpen && "rotate-90")}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-6 space-y-2 mt-1">
              {services.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">Sin servicios seleccionados</p>
              ) : (
                <>
                  {services.map((service) => (
                    <div key={service.id} className="py-1">
                      <CopyableItem label="Servicio" value={service.name} onCopy={onInsertText} />
                      {(service.fee || service.monthlyFee) && (
                        <div className="pl-2 flex gap-2 text-xs text-muted-foreground mt-0.5">
                          {service.fee && <span>{formatCurrency(service.fee)}</span>}
                          {service.monthlyFee && (
                            <span>{formatCurrency(service.monthlyFee)}/mes</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {(totalInitialFee > 0 || totalMonthlyFee > 0) && (
                    <div className="pt-2 border-t">
                      {totalInitialFee > 0 && (
                        <CopyableItem
                          label="Total inicial"
                          value={formatCurrency(totalInitialFee)}
                          onCopy={onInsertText}
                        />
                      )}
                      {totalMonthlyFee > 0 && (
                        <CopyableItem
                          label="Total mensual"
                          value={formatCurrency(totalMonthlyFee)}
                          onCopy={onInsertText}
                        />
                      )}
                    </div>
                  )}
                </>
              )}
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Quick variables */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground px-2">Variables rápidas</p>
            <div className="space-y-1">
              <CopyableItem
                label="Fecha actual"
                value={new Date().toLocaleDateString("es-MX", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                onCopy={onInsertText}
              />
              <CopyableItem
                label="Lista de entidades"
                value={entities.map((e) => e.legalName).join(", ") || "[Sin entidades]"}
                onCopy={onInsertText}
              />
              <CopyableItem
                label="Lista de servicios"
                value={services.map((s) => s.name).join(", ") || "[Sin servicios]"}
                onCopy={onInsertText}
              />
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
