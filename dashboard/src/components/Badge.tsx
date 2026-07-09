type BadgeVariant = "success" | "warning" | "error" | "info" | "default";

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: "bg-emerald-500/10 text-emerald-400",
  warning: "bg-amber-500/10 text-amber-400",
  error: "bg-red-500/10 text-red-400",
  info: "bg-sky-500/10 text-sky-400",
  default: "bg-white/5 text-white/50",
};

export default function Badge({ variant, children }: BadgeProps) {
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${variantStyles[variant]}`}>
      {children}
    </span>
  );
}
