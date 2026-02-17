export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]" role="status" aria-live="polite">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-4 border-foreground/10 border-t-accent-sage animate-spin" aria-hidden="true" />
        <p className="mt-4 text-sm text-muted text-center">読み込み中...</p>
      </div>
    </div>
  );
}
