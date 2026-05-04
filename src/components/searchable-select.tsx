
"use client"

import { useState, useMemo, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { X, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';

interface SearchableSelectOption {
    value: string;
    label: string;
    keywords?: string[];
    price?: number;
    currency?: 'ARS' | 'USD';
}

interface SearchableSelectProps {
    options: SearchableSelectOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    listHeight?: string;
    disabled?: boolean;
    className?: string;
    readOnly?: boolean;
}

export function SearchableSelect({ options, value, onChange, placeholder, listHeight = 'h-60', disabled = false, className, readOnly = false }: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);

    const selectedOption = useMemo(() => options.find(opt => opt.value === value), [options, value]);

    useEffect(() => {
        setSearchTerm(selectedOption?.label || "");
    }, [selectedOption]);

    useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
          setIsOpen(false);
          // If dropdown closes and no value is selected, reset search term
          if (!value) {
            setSearchTerm("");
          } else {
            setSearchTerm(selectedOption?.label || "");
          }
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [wrapperRef, value, selectedOption]);

    const filteredOptions = useMemo(() => {
        if (!searchTerm && value) return options.filter(opt => opt.value !== value);
        if (!searchTerm) return options;

        const lowercasedTerm = searchTerm.toLowerCase();

        return options.filter(opt => {
            // 1. Verificación segura del label
            const labelMatch = opt.label?.toLowerCase().includes(lowercasedTerm) ?? false;

            // 2. Verificación segura de las keywords
            const keywordsMatch = opt.keywords?.some(kw => 
                kw && kw.toLowerCase().includes(lowercasedTerm)
            ) ?? false;

            // 3. Excluir el ya seleccionado
            return (labelMatch || keywordsMatch) && opt.value !== value;
        });
    }, [options, searchTerm, value]);

    const handleSelect = (optionValue: string, optionLabel: string) => {
        onChange(optionValue);
        setSearchTerm(optionLabel);
        setIsOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setSearchTerm('');
        setIsOpen(true);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (readOnly) return;
        const newValue = e.target.value;
        setSearchTerm(newValue);
        if (!isOpen) setIsOpen(true);
    };
    
    const getPriceColorClass = (price?: number, currency?: string) => {
        if (price === undefined || currency === undefined) {
            return '';
        }
        if ((currency === 'ARS' && price < 500000) || (currency === 'USD' && price < 400)) {
            return 'bg-primary/10 hover:bg-primary/20';
        }
        return 'bg-primary/30 hover:bg-primary/40';
    };


    return (
        <div className={cn("relative", className)} ref={wrapperRef}>
            <div className="relative">
                <Input
                    placeholder={placeholder}
                    value={searchTerm}
                    onChange={handleInputChange}
                    onFocus={() => { if (!readOnly) setIsOpen(true); }}
                    onClick={() => { if (readOnly) setIsOpen(prev => !prev); }}
                    disabled={disabled}
                    readOnly={readOnly}
                    className={cn("h-10 text-base", readOnly && "cursor-pointer select-none")}
                />
                {value && !disabled ? (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleClear}
                        className="absolute inset-y-0 right-0 flex items-center h-full w-10 text-muted-foreground hover:text-foreground"
                        aria-label="Clear selection"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                ) : readOnly ? (
                    <ChevronDown className={cn(
                        "absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none transition-transform duration-200",
                        isOpen && "rotate-180"
                    )} />
                ) : null}
            </div>

            {isOpen && !disabled && (
                <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg">
                    <ScrollArea className={listHeight}>
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(option => (
                                <div
                                    key={option.value}
                                    className={cn(
                                        "px-3 py-2 cursor-pointer text-foreground border-b border-primary/20 last:border-b-0",
                                        "hover:bg-accent",
                                        getPriceColorClass(option.price, option.currency)
                                    )}
                                    onMouseDown={(e) => { 
                                        e.preventDefault();
                                        handleSelect(option.value, option.label);
                                    }}
                                >
                                    <p>{option.label}</p>
                                    {option.keywords && (
                                        <p className="text-xs text-muted-foreground">{option.keywords.join(', ')}</p>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                                No se encontraron resultados.
                            </div>
                        )}
                    </ScrollArea>
                </div>
            )}
        </div>
    );
}
