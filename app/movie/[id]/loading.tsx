export default function Loading() {
  return (
    <div className="flex flex-col gap-6 sm:flex-row">
      <div className="aspect-[2/3] w-full max-w-56 animate-pulse rounded-lg bg-neutral-900" />
      <div className="flex-1 space-y-4">
        <div className="h-8 w-2/3 animate-pulse rounded bg-neutral-900" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-neutral-900" />
        <div className="h-24 animate-pulse rounded bg-neutral-900" />
      </div>
    </div>
  )
}
