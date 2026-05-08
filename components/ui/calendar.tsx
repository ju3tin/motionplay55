'use client'

import * as React from 'react'
import {
  ChevronLeft,
  ChevronRight,
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
        root: 'w-fit',

        months:
          'flex flex-col sm:flex-row gap-4',

        month: 'space-y-4',

        month_caption:
          'flex justify-center relative items-center',

        month_grid: 'w-full border-collapse',

        weekdays: 'flex',

        weekday:
          'text-muted-foreground rounded-md w-9 text-[0.8rem] font-normal',

        week: 'flex w-full mt-2',

        day: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-9 w-9 p-0 font-normal aria-selected:opacity-100',
        ),

        today:
          'bg-accent text-accent-foreground',

        selected:
          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',

        outside:
          'text-muted-foreground opacity-50',

        disabled:
          'text-muted-foreground opacity-50',

        hidden: 'invisible',

        chevron:
          'h-4 w-4',

        button_previous: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1',
        ),

        button_next: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1',
        ),

        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className, ...props }) => {
          if (orientation === 'left') {
            return (
              <ChevronLeft
                className={cn('h-4 w-4', className)}
                {...props}
              />
            )
          }

          return (
            <ChevronRight
              className={cn('h-4 w-4', className)}
              {...props}
            />
          )
        },
      }}
      {...props}
    />
  )
}

Calendar.displayName = 'Calendar'

export { Calendar }
