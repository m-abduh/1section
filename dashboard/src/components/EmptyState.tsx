interface EmptyStateProps {
  message?: string;
  className?: string;
}

export default function EmptyState({ message = "No data", className = "" }: EmptyStateProps) {
  return (
    <div className={`flex items-center justify-center text-white/20 text-sm ${className}`}>
      {message}
    </div>
  );
}
