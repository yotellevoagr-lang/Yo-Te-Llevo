
"use client"

import * as React from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar, CalendarProps } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps extends CalendarProps {
    id?: string;
    date?: Date | null;
    setDate?: (date: Date | undefined) => void;
    placeholder?: string;
    className?: string;
}

export function DatePicker({ id, date, setDate, placeholder, className, ...props }: DatePickerProps) {
  
  const handleDateChange = (newDate: Date | undefined) => {
    if (setDate) {
      setDate(newDate)
    }
  }

  // Check if the date is a valid Date object before trying to format it
  const isValidDate = date instanceof Date && !isNaN(date.getTime());

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal h-10",
            !isValidDate && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {isValidDate ? format(date, "PPP", { locale: es }) : <span>{placeholder || "Pick a date"}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date ?? undefined}
          onSelect={handleDateChange}
          initialFocus
          locale={es}
          {...props}
        />
      </PopoverContent>
    </Popover>
  )
}
