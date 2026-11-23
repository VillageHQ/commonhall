import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";

// Commonhall's buttons (round 8, ui-polish SPEC "Shared rules"): at least 44 px (small 36 px, icon 44×44), radius 6,
// sans 600 15/20 (14 for small), press 1 px. The sizes live on the plain classes in globals.css, so a page that
// writes `fh-btn` itself gets the same button; the admin's console keeps 40 and 32 px there.
export const buttonVariants = cva(
  "fh-btn h-auto text-center whitespace-normal disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-icon-small",
  {
    variants: {
      variant: {
        // The one main action of a card: the fund colour.
        primary: "fh-btn-primary",
        // The page's top action ("Ask for an intro", "Partner report").
        ink: "fh-btn-ink",
        secondary: "fh-btn-secondary",
        // Older names for the secondary button, kept so every screen takes the new look.
        outline: "fh-btn-secondary",
        soft: "fh-btn-secondary",
        quiet: "fh-btn-quiet",
        destructive: "border-destructive bg-destructive text-destructive-foreground hover:bg-ribbon hover:text-leaf",
        link: "fh-linkbtn h-auto min-h-0 p-0 font-semibold text-fund underline hover:text-fund-deep hover:no-underline",
      },
      size: {
        default: "",
        sm: "fh-btn-sm",
        // Commonhall has one size of large button: the default.
        lg: "",
        hero: "",
        icon: "fh-btn-icon [&_svg:not([class*='size-'])]:size-icon",
        "icon-lg": "fh-btn-icon [&_svg:not([class*='size-'])]:size-icon",
      },
      width: {
        auto: "",
        // Full width: public pages and phone forms.
        block: "fh-btn-block",
      },
    },
    compoundVariants: [{ variant: "link", className: "min-h-0 py-0" }],
    defaultVariants: { variant: "primary", size: "default", width: "auto" },
  },
);

type ButtonProps = ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, width, asChild = false, ...props }: ButtonProps) {
  const Component = asChild ? Slot.Root : "button";
  return (
    <Component
      data-slot="button"
      data-variant={variant ?? "primary"}
      data-size={size ?? "default"}
      className={cn(buttonVariants({ variant, size, width }), className)}
      {...props}
    />
  );
}

// A row of buttons: wraps, 8 px apart.
export function ButtonRow({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="button-row" className={cn("fh-btn-row", className)} {...props} />;
}
