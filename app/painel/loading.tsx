export default function PanelLoading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Carregando">
      <div className="h-7 w-48 rounded bg-kb-line" />
      <div className="h-px bg-kb-line" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-20 rounded-lg border border-kb-line bg-kb-panel" />
        ))}
      </div>
    </div>
  );
}
