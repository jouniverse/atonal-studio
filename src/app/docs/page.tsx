export default function DocsPage() {
  return (
    <div className="min-h-full bg-[var(--background)] p-8 max-w-3xl">
      <h1 className="font-[family-name:var(--font-inter)] text-2xl font-semibold text-[var(--on-background)]">
        Docs
      </h1>
      <p className="mt-4 font-[family-name:var(--font-space-grotesk)] text-sm text-[var(--on-surface-variant)] leading-relaxed">
        Theory notes for atonal set theory, interval-class vectors, similarity measures, and how this studio uses them will
        live here. Content is prepared separately; this page is the navigation target from the sidebar.
      </p>
    </div>
  );
}
