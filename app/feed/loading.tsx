export default function FeedLoading() {
  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-5 w-full animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-muted" />
          <div className="space-y-2">
            <div className="h-5 w-24 bg-muted rounded-lg" />
            <div className="h-3 w-48 bg-muted/60 rounded-lg" />
          </div>
        </div>
        <div className="h-8 w-32 bg-muted/60 rounded-2xl" />
      </div>

      {/* Post Form Skeleton */}
      <div className="bg-card border border-border rounded-2xl p-4 flex gap-3">
        <div className="w-9 h-9 rounded-full bg-muted flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="h-6 w-20 bg-muted/60 rounded-lg" />
          <div className="h-10 w-full bg-muted/30 rounded-xl" />
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 mt-1">
        <div className="flex-1 border-t border-border/65" />
        <div className="h-3 w-28 bg-muted/50 rounded" />
        <div className="flex-1 border-t border-border/65" />
      </div>

      {/* Post List Skeleton */}
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card/70 border border-border/80 rounded-2xl p-5 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted" />
              <div className="space-y-1.5">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-3 w-16 bg-muted/60 rounded" />
              </div>
            </div>
            
            {/* Content */}
            <div className="space-y-2">
              <div className="h-4 w-full bg-muted/50 rounded" />
              <div className="h-4 w-full bg-muted/50 rounded" />
              <div className="h-4 w-2/3 bg-muted/50 rounded" />
            </div>
            
            {/* Actions */}
            <div className="border-t border-border/50 pt-3 flex items-center justify-between">
              <div className="flex gap-4">
                <div className="h-6 w-12 bg-muted/60 rounded-lg" />
                <div className="h-6 w-12 bg-muted/60 rounded-lg" />
                <div className="h-6 w-16 bg-muted/60 rounded-lg" />
              </div>
              <div className="h-6 w-8 bg-muted/60 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
