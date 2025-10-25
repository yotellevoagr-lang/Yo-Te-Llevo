
"use client"

import { useState, useMemo } from 'react';
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
    const [searchTerm, setSearchTerm] = useState('');

    const selectedOption = useMemo(() => options.find(opt => opt.value === value), [options, value]);

    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        const lowercasedTerm = searchTerm.toLowerCase();
        return options.filter(opt => 
            opt.label.toLowerCase().includes(lowercasedTerm) || 
            (opt.keywords && opt.keywords.some(kw => kw.toLowerCase().includes(lowercasedTerm)))
        );
    }, [options, searchTerm]);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setSearchTerm('');
        setIsOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setSearchTerm('');
        setIsOpen(true);
    };

    const handleFocus = () => {
        if (disabled) return;
        setIsOpen(true);
        if (selectedOption) {
            setSearchTerm(''); // Clear search term to show all options
        }
    }

    return (
        <div className="relative">
            <div className="relative">
                <Input
                    placeholder={placeholder}
                    value={isOpen ? searchTerm : (selectedOption?.label || '')}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        if (!isOpen) setIsOpen(true);
                    }}
                    onFocus={handleFocus}
                    onBlur={() => setTimeout(() => setIsOpen(false), 200)} // Delay to allow click
                    disabled={disabled}
                />
                {selectedOption && !disabled && (
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
                                        handleSelect(option.value);
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
