import React, { useRef } from 'react';
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "btn-primary", // Use custom class
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, disabled, ...props }, ref) => {
    const internalRef = useRef<HTMLButtonElement>(null);
    const buttonRef = (ref || internalRef) as React.RefObject<HTMLButtonElement>;

    function handleMouseMove(e: React.MouseEvent<HTMLButtonElement>) {
      const el = buttonRef.current;
      if (!el || variant !== 'default') return;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left);
      const y = (e.clientY - rect.top);
      (el.style as any).setProperty('--mx', `${x}px`);
      (el.style as any).setProperty('--my', `${y}px`);
    }

    function handleMouseLeave() {
      const el = buttonRef.current;
      if (!el || variant !== 'default') return;
      (el.style as any).setProperty('--mx', `-50%`);
      (el.style as any).setProperty('--my', `-50%`);
    }

    const Comp = asChild ? Slot : "button"
    
    // Add the disabled class if the button is disabled
    const variantClasses = cn(buttonVariants({ variant, size, className }), {
      'btn-primary-disabled': disabled && variant === 'default'
    });

    return (
      <Comp
        className={variantClasses}
        ref={buttonRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        disabled={disabled}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
