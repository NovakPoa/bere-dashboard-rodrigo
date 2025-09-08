import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface CategoryComboboxProps {
  value?: string;
  onChange: (value: string) => void;
  suggestions?: string[];
  placeholder?: string;
  disabled?: boolean;
}

export function CategoryCombobox({
  value,
  onChange,
  suggestions = [],
  placeholder = "Selecione ou digite uma categoria...",
  disabled = false,
}: CategoryComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  // Get unique categories from suggestions and recent usage
  const getRecentCategories = (): string[] => {
    try {
      const recent = JSON.parse(localStorage.getItem("recent_categories") || "[]") as string[];
      return recent.slice(0, 8); // Show top 8 recent
    } catch {
      return [];
    }
  };

  const saveRecentCategory = (category: string) => {
    try {
      const recent = getRecentCategories();
      const filtered = recent.filter(c => c !== category);
      const updated = [category, ...filtered].slice(0, 20); // Keep top 20
      localStorage.setItem("recent_categories", JSON.stringify(updated));
    } catch {
      // Ignore localStorage errors
    }
  };

  const recentCategories = getRecentCategories();
  const allSuggestions = [...new Set([...recentCategories, ...suggestions])];

  // Filter suggestions based on input
  const filteredSuggestions = allSuggestions.filter(suggestion =>
    suggestion.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Capitalize first letter
  const formatCategory = (category: string): string => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const handleSelect = (selectedValue: string) => {
    const formatted = formatCategory(selectedValue);
    onChange(formatted);
    saveRecentCategory(formatted);
    setOpen(false);
    setInputValue("");
  };

  const handleCreateNew = () => {
    if (inputValue.trim()) {
      const formatted = formatCategory(inputValue.trim());
      onChange(formatted);
      saveRecentCategory(formatted);
      setOpen(false);
      setInputValue("");
    }
  };

  const displayValue = value || "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between",
            !value && "text-muted-foreground"
          )}
        >
          {displayValue || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Digite para buscar ou criar..."
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
              {inputValue.trim() ? (
                <div className="p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCreateNew}
                    className="w-full justify-start"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Criar "{formatCategory(inputValue.trim())}"
                  </Button>
                </div>
              ) : (
                "Nenhuma categoria encontrada."
              )}
            </CommandEmpty>
            {recentCategories.length > 0 && (
              <CommandGroup heading="Usadas recentemente">
                {recentCategories
                  .filter(category => category.toLowerCase().includes(inputValue.toLowerCase()))
                  .map((category) => (
                    <CommandItem
                      key={category}
                      value={category}
                      onSelect={() => handleSelect(category)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === category ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {category}
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}
            {suggestions.length > 0 && (
              <CommandGroup heading="Sugestões">
                {suggestions
                  .filter(suggestion => 
                    suggestion.toLowerCase().includes(inputValue.toLowerCase()) &&
                    !recentCategories.includes(suggestion)
                  )
                  .map((suggestion) => (
                    <CommandItem
                      key={suggestion}
                      value={suggestion}
                      onSelect={() => handleSelect(suggestion)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === suggestion ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {suggestion}
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}
            {inputValue.trim() && !allSuggestions.some(s => 
              s.toLowerCase() === inputValue.toLowerCase()
            ) && (
              <CommandGroup>
                <CommandItem onSelect={handleCreateNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar "{formatCategory(inputValue.trim())}"
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}