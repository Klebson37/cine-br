export function GridSkeleton({ count = 16 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-x-3 gap-y-8 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="animate-pulse">
          <div className="aspect-[2/3] rounded-[2px] bg-sala" />
          <div className="mt-2 h-3 w-4/5 rounded-[2px] bg-sala" />
        </div>
      ))}
    </div>
  )
}
