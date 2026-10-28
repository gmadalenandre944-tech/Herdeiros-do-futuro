import * as React from "react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface IconInputProps extends React.ComponentProps<"input"> {
  icon: LucideIcon;
}

/** Text/email/etc input with a descriptive icon inside the field. */
const IconInput = React.forwardRef<HTMLInputElement, IconInputProps>(
  ({ icon: Icon, className, ...props }, ref) => {
    return (
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input ref={ref} className={cn("pl-9", className)} {...props} />
      </div>
    );
  },
);
IconInput.displayName = "IconInput";

interface PasswordInputProps extends React.ComponentProps<"input"> {
  icon: LucideIcon;
}

/** Password input with a descriptive icon and a show/hide eye toggle. */
const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ icon: Icon, className, ...props }, ref) => {
    const [show, setShow] = React.useState(false);
    return (
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={ref}
          type={show ? "text" : "password"}
          className={cn("pl-9 pr-10", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Ocultar senha" : "Mostrar senha"}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";

export { IconInput, PasswordInput };
