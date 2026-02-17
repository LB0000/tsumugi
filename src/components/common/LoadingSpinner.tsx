export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-4 border-foreground/10 border-t-accent-sage animate-spin" />
        <p className="mt-4 text-sm text-muted text-center">読み込み中...</p>
      </div>
    </div>
  );
}
