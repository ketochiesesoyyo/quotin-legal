/**
 * Sprint 3: Version History Component
 * 
 * Shows proposal version history with comparison capabilities.
 */

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { History, ChevronDown, ChevronUp, Eye, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { ProposalVersion, ProposalVersionContent } from "@/hooks/useProposalVersions";
import { useProposalVersions } from "@/hooks/useProposalVersions";

interface VersionHistoryProps {
  caseId: string;
  onRestoreVersion?: (content: ProposalVersionContent) => void;
}

export function VersionHistory({ caseId, onRestoreVersion }: VersionHistoryProps) {
  const { versions, isLoading, compareVersions } = useProposalVersions(caseId);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<ProposalVersion | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareVersionId, setCompareVersionId] = useState<string | null>(null);

  if (versions.length === 0) {
    return null; // Don't show if no versions
  }

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "d MMM yyyy, HH:mm", { locale: es });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getVersionChanges = (version: ProposalVersion, index: number) => {
    if (index >= versions.length - 1) return ["Versión inicial"];
    const previousVersion = versions[index + 1];
    return compareVersions(previousVersion.content, version.content);
  };

  const selectedCompareVersion = compareVersionId 
    ? versions.find(v => v.id === compareVersionId) 
    : null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
          <History className="h-4 w-4" />
          <span>{versions.length} versión(es)</span>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-2">
        <div className="border rounded-lg bg-card">
          <div className="p-3 border-b flex items-center justify-between">
            <span className="text-sm font-medium">Historial de Versiones</span>
            {versions.length >= 2 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCompareMode(!compareMode)}
                className="gap-1 text-xs"
              >
                <GitCompare className="h-3 w-3" />
                {compareMode ? "Cancelar" : "Comparar"}
              </Button>
            )}
          </div>
          
          <ScrollArea className="max-h-[300px]">
            <div className="divide-y">
              {versions.map((version, index) => {
                const changes = getVersionChanges(version, index);
                const isCompareSelected = compareVersionId === version.id;

                return (
                  <div
                    key={version.id}
                    className={`p-3 hover:bg-muted/50 transition-colors ${
                      isCompareSelected ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={index === 0 ? "default" : "secondary"} className="text-xs">
                          v{version.version_number}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(version.created_at)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {compareMode && index > 0 && (
                          <Button
                            variant={isCompareSelected ? "default" : "outline"}
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => setCompareVersionId(isCompareSelected ? null : version.id)}
                          >
                            {isCompareSelected ? "✓" : "Comparar"}
                          </Button>
                        )}
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => setSelectedVersion(version)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <History className="h-5 w-5" />
                                Versión {version.version_number}
                                <Badge variant="outline" className="ml-2">
                                  {formatDate(version.created_at)}
                                </Badge>
                              </DialogTitle>
                            </DialogHeader>
                            
                            <div className="space-y-4 mt-4">
                              {/* Services */}
                              <div>
                                <h4 className="font-medium text-sm mb-2">Servicios ({version.content.services.length})</h4>
                                <div className="space-y-1">
                                  {version.content.services.map((s, i) => (
                                    <div key={i} className="text-sm text-muted-foreground flex justify-between">
                                      <span>{s.serviceName}</span>
                                      {s.customFee && (
                                        <span>{formatCurrency(s.customFee)}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                              <Separator />
                              
                              {/* Pricing */}
                              <div>
                                <h4 className="font-medium text-sm mb-2">Precios</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Pago inicial:</span>
                                    <span className="ml-2">{formatCurrency(version.content.pricing.initialPayment)}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Iguala:</span>
                                    <span className="ml-2">{formatCurrency(version.content.pricing.monthlyRetainer)}/mes</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Meses:</span>
                                    <span className="ml-2">{version.content.pricing.retainerMonths}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Modo:</span>
                                    <span className="ml-2 capitalize">{version.content.pricing.pricingMode}</span>
                                  </div>
                                </div>
                              </div>
                              
                              {version.content.background && (
                                <>
                                  <Separator />
                                  <div>
                                    <h4 className="font-medium text-sm mb-2">Antecedentes</h4>
                                    <p className="text-sm text-muted-foreground line-clamp-3">
                                      {version.content.background}
                                    </p>
                                  </div>
                                </>
                              )}
                              
                              {onRestoreVersion && index > 0 && (
                                <>
                                  <Separator />
                                  <div className="flex justify-end">
                                    <Button
                                      variant="outline"
                                      onClick={() => onRestoreVersion(version.content)}
                                    >
                                      Restaurar esta versión
                                    </Button>
                                  </div>
                                </>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                    
                    {/* Changes summary */}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {changes.slice(0, 2).map((change, i) => (
                        <span key={i} className="text-xs text-muted-foreground">
                          • {change}
                        </span>
                      ))}
                      {changes.length > 2 && (
                        <span className="text-xs text-muted-foreground">
                          +{changes.length - 2} más
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Comparison view */}
          {compareMode && selectedCompareVersion && versions[0] && (
            <div className="p-3 border-t bg-blue-50/50">
              <div className="text-sm font-medium mb-2">
                Comparando v{selectedCompareVersion.version_number} → v{versions[0].version_number}
              </div>
              <div className="space-y-1">
                {compareVersions(selectedCompareVersion.content, versions[0].content).map((change, i) => (
                  <div key={i} className="text-xs flex items-center gap-2">
                    <span className={
                      change.startsWith('+') ? 'text-green-600' : 
                      change.startsWith('-') ? 'text-red-600' : 
                      'text-muted-foreground'
                    }>
                      {change}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
