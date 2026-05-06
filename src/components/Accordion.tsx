'use client';

import React from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { motion, useReducedMotion } from 'motion/react';
import { ChevronDown } from 'lucide-react';

interface AccordionSingleProps {
  type?: 'single';
  collapsible?: boolean;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children?: React.ReactNode;
}

interface AccordionMultipleProps {
  type: 'multiple';
  collapsible?: boolean;
  defaultValue?: string[];
  value?: string[];
  onValueChange?: (value: string[]) => void;
  className?: string;
  children?: React.ReactNode;
}

type AccordionProps = AccordionSingleProps | AccordionMultipleProps;

interface AccordionItemProps {
  value: string;
  className?: string;
  children?: React.ReactNode;
}

interface AccordionTriggerProps {
  className?: string;
  children?: React.ReactNode;
}

interface AccordionContentProps {
  className?: string;
  children?: React.ReactNode;
}

const Accordion = React.forwardRef<HTMLDivElement, AccordionProps>(
  (props, ref) => {
    const { type = 'single', collapsible = true, defaultValue, value, onValueChange, className = '', children } = props;
    return (
      <AccordionPrimitive.Root
        ref={ref}
        type={type as any}
        collapsible={collapsible}
        defaultValue={defaultValue as any}
        value={value as any}
        onValueChange={onValueChange as any}
        className={className}
      >
        {children}
      </AccordionPrimitive.Root>
    );
  }
);

Accordion.displayName = 'Accordion';

const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ value, className = '', children }, ref) => {
    return (
      <AccordionPrimitive.Item ref={ref} value={value} className={className}>
        {children}
      </AccordionPrimitive.Item>
    );
  }
);

AccordionItem.displayName = 'AccordionItem';

const AccordionTrigger = React.forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  ({ className = '', children }, ref) => {
    const prefersReducedMotion = useReducedMotion();

    return (
      <AccordionPrimitive.Header className="flex">
        <AccordionPrimitive.Trigger
          ref={ref}
          className={`flex flex-1 items-center justify-between py-4 text-sm font-medium transition-all hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${className}`}
        >
          {children}
          <motion.span
            initial={{ rotate: 0 }}
            animate={{ rotate: 180 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
          >
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200" />
          </motion.span>
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>
    );
  }
);

AccordionTrigger.displayName = 'AccordionTrigger';

const AccordionContent = React.forwardRef<HTMLDivElement, AccordionContentProps>(
  ({ className = '', children }, ref) => {
    const prefersReducedMotion = useReducedMotion();

    return (
      <AccordionPrimitive.Content
        ref={ref}
        className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
      >
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.3,
            ease: 'easeInOut',
          }}
          className={className}
        >
          <div className="pb-4 pt-0">{children}</div>
        </motion.div>
      </AccordionPrimitive.Content>
    );
  }
);

AccordionContent.displayName = 'AccordionContent';

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
