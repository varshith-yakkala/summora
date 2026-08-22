import ThemeToggle from './ThemeToggle';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 h-16 border-b border-border bg-bg/95 backdrop-blur-sm flex items-center justify-between px-4 md:px-8">
      <div className="flex items-center gap-3">
        <span className="font-sans font-semibold text-base md:text-lg text-text tracking-tight">
          Summora
        </span>
      </div>
      <div className="flex items-center gap-4">
        <ThemeToggle />
      </div>
    </header>
  );
}
