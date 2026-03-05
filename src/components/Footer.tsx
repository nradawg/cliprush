export default function Footer() {
  return (
    <footer className="mt-24 border-t border-surface-3 py-10">
      <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-display text-xl text-white tracking-widest">CLIPRUSH</span>
          <span className="text-zinc-700 text-xs">—</span>
          <span className="text-xs text-zinc-600">Find viral moments. Fast.</span>
        </div>
        <span className="text-xs text-zinc-700">
          Powered by{" "}
          <a href="https://anthropic.com" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-zinc-300 transition-colors">
            Anthropic Claude
          </a>
        </span>
      </div>
    </footer>
  );
}