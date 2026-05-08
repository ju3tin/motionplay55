'use client'

import * as React from 'react'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from 'lucide-react'
import { DayPicker } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months:
          'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',

        month: 'space-y-4',

        // Updated for latest react-day-picker
        month_caption:
          'flex justify-center pt-1 relative items-center',

        caption_label:
          'text-sm font-medium',

        nav: 'space-x-1 flex items-center',

        button_previous: cn(
          buttonVariants({ variant: 'outline' }),
          'absolute left-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
        ),

        button_next: cn(
          buttonVariants({ variant: 'outline' }),
          'absolute right-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
        ),

        table: 'w-full border-collapse space-y-1',

        weekdays: 'flex',

        weekday:
          'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',

        week: 'flex w-full mt-2',

        day: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-9 w-9 p-0 font-normal aria-selected:opacity-100',
        ),

        day_button:
          'h-9 w-9 p-0 font-normal',

        selected:
          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',

        today:
          'bg-accent text-accent-foreground',

        outside:
          'text-muted-foreground opacity-50',

        disabled:
          'text-muted-foreground opacity-50',

        range_middle:
          'aria-selected:bg-accent aria-selected:text-accent-foreground',

        hidden: 'invisible',

        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...props }) => {
          const iconClass = 'h-4 w-4'

          switch (orientation) {
            case 'left':
              return (
                <ChevronLeft
                  className={iconClass}
                  {...props}
                />
              )

            case 'right':
              return (
                <ChevronRight
                  className={iconClass}
                  {...props}
                />
              )

            case 'up':
              return (
                <ChevronUp
                  className={iconClass}
                  {...props}
                />
              )

            case 'down':
              return (
                <ChevronDown
                  className={iconClass}
                  {...props}
                />
              )

            default:
              return (
                <ChevronRight
                  className={iconClass}
                  {...props}
                />
              )
          }
        },
      }}
      {...props}
    />
  )
}

Calendar.displayName = 'Calendar'

export { Calendar }
