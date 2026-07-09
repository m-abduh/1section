interface LoadingSpinnerProps {
  size?: number;
  className?: string;
}

export default function LoadingSpinner({ size = 24, className = "" }: LoadingSpinnerProps) {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ minHeight: size * 2 }}
    >
      <div
        className="border-2 border-white/20 border-t-white rounded-full animate-spin"
        style={{ width: size, height: size }}
      />
    </div>
  );
}
