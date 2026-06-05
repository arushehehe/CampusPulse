import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "editorial";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-200 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
    
    const variants = {
      primary: "bg-[var(--foreground)] text-[var(--background)] hover:bg-[var(--foreground)]/90 shadow-sm",
      secondary: "bg-[var(--border-color)] text-[var(--foreground)] hover:bg-[var(--border-color)]/80",
      outline: "border-2 border-[var(--foreground)] text-[var(--foreground)] hover:bg-[var(--foreground)] hover:text-[var(--background)]",
      ghost: "text-[var(--foreground)] hover:bg-[var(--border-color)]/50",
      editorial: "bg-transparent border-b-2 border-[var(--foreground)] text-[var(--foreground)] rounded-none hover:bg-[var(--foreground)] hover:text-[var(--background)] uppercase tracking-widest text-xs font-bold",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs rounded-md",
      md: "h-10 px-5 text-sm rounded-lg",
      lg: "h-12 px-8 text-base rounded-xl",
    };

    // Editorial variant overrides padding/height
    const sizeStyles = variant === "editorial" ? "py-2 px-4" : sizes[size];

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizeStyles} ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
