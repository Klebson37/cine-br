import { GridSkeleton } from '@/components/catalog/GridSkeleton'

export default function Loading() {
  return (
    <>
      <div className="mb-6 h-[42vh] min-h-64 animate-pulse rounded-xl bg-neutral-900" />
      <GridSkeleton />
    </>
  )
}
