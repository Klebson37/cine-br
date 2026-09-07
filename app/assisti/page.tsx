import { MarkedList } from '@/components/catalog/MarkedList'
import { ListTabs } from '@/components/layout/ListTabs'

export const metadata = {
  title: 'Já assisti — CineBR',
}

export default function AssistiPage() {
  return (
    <div className="wrap pt-10">
      <ListTabs active="watched" />
      <div className="mt-10">
        <MarkedList state="watched" />
      </div>
    </div>
  )
}
