import { Search } from "lucide-react";

interface PageHeaderProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
}

export function PageHeader({ icon, title, description, search }: PageHeaderProps) {
  const searchInput = search ? (
    <div className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-dark" />
      <input
        type="text"
        placeholder={search.placeholder || "Search..."}
        value={search.value}
        onChange={(e) => search.onChange(e.target.value)}
        className="w-full py-2 pl-9 pr-3 bg-bg-card border border-border-subtle rounded-lg text-fg text-[0.8125rem] outline-none focus:border-border transition-colors placeholder:text-muted-dark"
      />
    </div>
  ) : null;

  return (
    <header className="mb-10">
      <div className="flex items-center gap-3 mb-3">
        {icon && (
          <div className="w-9 h-9 rounded-lg bg-bg-elevated flex items-center justify-center text-fg shrink-0">
            {icon}
          </div>
        )}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-[-0.02em]">{title}</h1>
        {search && (
          <div className="ml-auto hidden sm:block sm:max-w-[260px] w-[260px]">
            {searchInput}
          </div>
        )}
      </div>
      {description && (
        <p className="text-muted text-[0.9375rem] max-w-[500px]">{description}</p>
      )}
      {search && (
        <div className="mt-3 block sm:hidden">
          {searchInput}
        </div>
      )}
    </header>
  );
}
