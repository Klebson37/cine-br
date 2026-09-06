import { GridSkeleton } from '@/components/catalog/GridSkeleton'

export default function Loading() {
  return (
    <div className="wrap pt-12">
      <div className="h-9 w-64 animate-pulse rounded-[2px] bg-sala" />
      <div className="mt-10">
        <GridSkeleton />
      </div>
    </div>
  )
}
