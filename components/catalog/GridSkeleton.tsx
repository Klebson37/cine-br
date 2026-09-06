export function GridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="aspect-[2/3] animate-pulse rounded-lg bg-neutral-900"
        />
      ))}
    </div>
  )
}
