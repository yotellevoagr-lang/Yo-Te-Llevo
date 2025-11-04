
"use client"

import { useState, useMemo, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Button } from './ui/button';

interface SearchableSelectOption {
    value: string;
    label: string;
    keywords?: string[];
}

interface SearchableSelectProps {
    options: SearchableSelectOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    listHeight?: string;
    disabled?: boolean;
}

export function SearchableSelect({ options, value, onChange, placeholder, listHeight = 'h-60', disabled = false }: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedOption = useMemo(() => options.find(opt => opt.value === value), [options, value]);

    useEffect(() => {
        // Update searchTerm if the external value changes and we are NOT focused
        if (document.activeElement !== inputRef.current) {
            setSearchTerm(selectedOption?.label || value);
        }
    }, [value, selectedOption]);

    const filteredOptions = useMemo(() => {
        if (!searchTerm || (selectedOption && searchTerm === selectedOption.label)) return options;
        const lowercasedTerm = searchTerm.toLowerCase();
        return options.filter(opt => 
            opt.label.toLowerCase().includes(lowercasedTerm) || 
            (opt.keywords && opt.keywords.some(kw => kw.toLowerCase().includes(lowercasedTerm)))
        );
    }, [options, searchTerm, selectedOption]);

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
        inputRef.current?.focus();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setSearchTerm(newValue);
        onChange(newValue); // Allow creating new values by typing
        if (!isOpen) setIsOpen(true);
    };

    return (
        <div className="relative">
            <div className="relative">
                <Input
                    ref={inputRef}
                    placeholder={placeholder}
                    value={searchTerm}
                    onChange={handleInputChange}
                    onFocus={() => setIsOpen(true)}
                    onBlur={() => setTimeout(() => {
                        setIsOpen(false);
                        // On blur, if no option is selected, the input value is the final value
                        const matchingOption = options.find(opt => opt.label.toLowerCase() === searchTerm.toLowerCase());
                        if (matchingOption) {
                            setSearchTerm(matchingOption.label);
                            onChange(matchingOption.value);
                        } else {
                            onChange(searchTerm);
                        }
                    }, 200)}
                    disabled={disabled}
                />
                {value && !disabled && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleClear}
                        className="absolute inset-y-0 right-0 flex items-center h-full w-10 text-muted-foreground hover:text-foreground"
                        aria-label="Clear selection"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                )}
            </div>

            {isOpen && !disabled && (
                <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg">
                    <ScrollArea className={listHeight}>
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(option => (
                                <div
                                    key={option.value}
                                    className={cn(
                                        "px-3 py-2 cursor-pointer hover:bg-accent",
                                        value === option.value && "bg-accent"
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
                                No se encontraron familias. Puedes crear una nueva escribiendo.
                            </div>
                        )}
                    </ScrollArea>
                </div>
            )}
        </div>
    );
}
