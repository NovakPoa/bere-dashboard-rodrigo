import * as React from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface MultiSelectProps {
  options: { label: string; value: string }[];
  selected: string[];
  onSelectionChange: (selected: string[]) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

export function MultiSelect({
  options,
  selected,
  onSelectionChange,
  placeholder = "Selecionar...",
  label,
  className,
}: MultiSelectProps) {
  const handleSelect = (value: string) => {
    if (selected.includes(value)) {
      onSelectionChange(selected.filter((item) => item !== value));
    } else {
      onSelectionChange([...selected, value]);
    }
  };

  const handleSelectAll = () => {
    if (selected.length === options.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(options.map((option) => option.value));
    }
  };

  const handleClear = () => {
    onSelectionChange([]);
  };

  const isAllSelected = selected.length === options.length;
  const selectedCount = selected.length;

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="text-sm text-muted-foreground">{label}</label>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between min-h-10"
            size="sm"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {selectedCount === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : selectedCount === 1 ? (
                <span>
                  {options.find((opt) => opt.value === selected[0])?.label}
                </span>
              ) : (
                <div className="flex items-center gap-1 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    {selectedCount} selecionados
                  </Badge>
                </div>
              )}
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 z-50" align="start">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Opções</span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={handleSelectAll}
              >
                {isAllSelected ? "Limpar" : "Todos"}
              </Button>
              {selectedCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={handleClear}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={selected.includes(option.value)}
              onCheckedChange={() => handleSelect(option.value)}
              className="capitalize"
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}