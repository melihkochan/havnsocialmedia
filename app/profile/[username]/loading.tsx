export default function ProfileLoading() {
  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 w-full animate-pulse">
      {/* Profile Card Skeleton */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        {/* Banner placeholder */}
        <div className="h-32 bg-muted/60 relative" />
        
        <div className="px-6 pb-6 relative">
          {/* Avatar placeholder */}
          <div className="w-24 h-24 rounded-full bg-muted border-4 border-card -mt-12 mb-4 relative z-10" />
          
          {/* Info placeholders */}
          <div className="space-y-3 mb-4">
            <div className="h-6 w-48 bg-muted rounded-lg" />
            <div className="h-4 w-32 bg-muted/70 rounded-lg" />
            <div className="space-y-2 pt-2">
              <div className="h-4 w-full bg-muted/50 rounded-lg" />
              <div className="h-4 w-5/6 bg-muted/50 rounded-lg" />
            </div>
          </div>
          
          {/* Metadata placeholders */}
          <div className="flex items-center gap-4 text-sm flex-wrap pt-2">
            <div className="h-4 w-28 bg-muted/60 rounded-lg" />
            <div className="h-4 w-24 bg-muted/60 rounded-lg" />
          </div>
          
          {/* Counts placeholders */}
          <div className="flex gap-6 mt-5 pt-4 border-t border-border">
            <div className="space-y-1">
              <div className="h-5 w-12 bg-muted rounded-md" />
              <div className="h-3 w-16 bg-muted/50 rounded-md" />
            </div>
            <div className="space-y-1">
              <div className="h-5 w-12 bg-muted rounded-md" />
              <div className="h-3 w-16 bg-muted/50 rounded-md" />
            </div>
            <div className="space-y-1">
              <div className="h-5 w-12 bg-muted rounded-md" />
              <div className="h-3 w-16 bg-muted/50 rounded-md" />
            </div>
          </div>
        </div>
      </div>

      {/* Communities Section Skeleton */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="h-4 w-24 bg-muted rounded-lg mb-3" />
        <div className="flex flex-wrap gap-2">
          <div className="h-8 w-28 bg-muted/60 rounded-full" />
          <div className="h-8 w-32 bg-muted/60 rounded-full" />
        </div>
      </div>

      {/* Posts Section Skeleton */}
      <div>
        <div className="h-4 w-24 bg-muted rounded-lg mb-4" />
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card/70 border border-border/80 rounded-2xl p-5 flex flex-col gap-4">
              {/* Post Header */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="space-y-1.5">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-3 w-16 bg-muted/60 rounded" />
                </div>
              </div>
              
              {/* Post Content */}
              <div className="space-y-2">
                <div className="h-4 w-full bg-muted/50 rounded" />
                <div className="h-4 w-full bg-muted/50 rounded" />
                <div className="h-4 w-2/3 bg-muted/50 rounded" />
              </div>
              
              {/* Divider & Actions */}
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
    </div>
  )
}
