import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Button } from "@/components/ui/button";
import { Investment } from "@/types/investment";
import { TrendingUp, Percent } from "lucide-react";

interface RentabilityFiltersProps {
  investments: Investment[];
  selectedPeriod: "7days" | "month" | "year";
  onPeriodChange: (period: "7days" | "month" | "year") => void;
  selectedNames: string[];
  onNamesChange: (names: string[]) => void;
  selectedTypes: string[];
  onTypesChange: (types: string[]) => void;
  showValue: boolean;
  onToggleDisplay: () => void;
}

const PERIOD_LABELS = {
  "7days": "Últimos 7 dias",
  "month": "Este mês",
  "year": "Este ano",
};

export const RentabilityFilters: React.FC<RentabilityFiltersProps> = ({
  investments,
  selectedPeriod,
  onPeriodChange,
  selectedNames,
  onNamesChange,
  selectedTypes,
  onTypesChange,
  showValue,
  onToggleDisplay,
}) => {
  const nameOptions = React.useMemo(() => {
    const uniqueNames = Array.from(new Set(investments.map(inv => inv.nome_investimento)));
    return uniqueNames.map(name => ({ label: name, value: name }));
  }, [investments]);

  const typeOptions = React.useMemo(() => {
    const uniqueTypes = Array.from(new Set(investments.map(inv => inv.tipo_investimento)));
    return uniqueTypes.map(type => ({ label: type, value: type }));
  }, [investments]);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="min-w-[200px]">
              <Select value={selectedPeriod} onValueChange={onPeriodChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PERIOD_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[250px]">
              <MultiSelect
                options={nameOptions}
                selected={selectedNames}
                onSelectionChange={(selected) => onNamesChange(selected as string[])}
                placeholder="Filtrar por investimento"
                className="w-full"
              />
            </div>

            <div className="min-w-[200px]">
              <MultiSelect
                options={typeOptions}
                selected={selectedTypes}
                onSelectionChange={(selected) => onTypesChange(selected as string[])}
                placeholder="Filtrar por tipo"
                className="w-full"
              />
            </div>
          </div>

          <Button
            variant="outline"
            onClick={onToggleDisplay}
            className="flex items-center gap-2"
          >
            {showValue ? (
              <>
                <TrendingUp className="h-4 w-4" />
                Valor (R$)
              </>
            ) : (
              <>
                <Percent className="h-4 w-4" />
                Percentual (%)
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};