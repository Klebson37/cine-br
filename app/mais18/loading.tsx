import { GridSkeleton } from '@/components/catalog/GridSkeleton'

export default function Loading() {
  return (
    <div className="wrap pt-14">
      <div className="h-9 w-56 animate-pulse rounded-[2px] bg-sala" />
      <div className="mt-4 h-4 w-80 max-w-full animate-pulse rounded-[2px] bg-sala" />
      <div className="mt-10">
        <GridSkeleton count={8} />
      </div>
    </div>
  )
}
