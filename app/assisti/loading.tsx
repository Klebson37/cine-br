import { GridSkeleton } from '@/components/catalog/GridSkeleton'
import { ListTabs } from '@/components/layout/ListTabs'

export default function Loading() {
  return (
    <div className="wrap pt-10">
      <ListTabs active="watched" />
      <div className="mt-10">
        <GridSkeleton />
      </div>
    </div>
  )
}
