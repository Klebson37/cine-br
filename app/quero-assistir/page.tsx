import { MarkedList } from '@/components/catalog/MarkedList'
import { ListTabs } from '@/components/layout/ListTabs'

export const metadata = {
  title: 'Quero assistir — CineBR',
}

export default function QueroAssistirPage() {
  return (
    <div className="wrap pt-10">
      <ListTabs active="want" />
      <div className="mt-10">
        <MarkedList state="want" />
      </div>
    </div>
  )
}
