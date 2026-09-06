import { GridSkeleton } from '@/components/catalog/GridSkeleton'

export default function Loading() {
  return (
    <>
      <div className="arte-topo h-[88vh] max-h-[54rem] min-h-[36rem] w-full animate-pulse bg-sala" />
      <div className="wrap mt-14">
        <div className="h-4 w-48 animate-pulse rounded-[2px] bg-sala" />
        <div className="mt-6">
          <GridSkeleton count={8} />
        </div>
      </div>
    </>
  )
}
