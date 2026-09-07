export default function Loading() {
  return (
    <>
      <div className="arte-topo h-[calc(38vh+var(--cabecalho))] max-h-[30rem] min-h-[18rem] w-full animate-pulse bg-sala" />
      <div className="wrap relative -mt-24">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-end">
          <div className="aspect-[2/3] w-36 shrink-0 animate-pulse rounded-[2px] bg-sala sm:w-52" />
          <div className="flex-1 space-y-4 pb-1">
            <div className="h-10 w-2/3 animate-pulse rounded-[2px] bg-sala" />
            <div className="h-4 w-1/3 animate-pulse rounded-[2px] bg-sala" />
          </div>
        </div>
        <div className="mt-8 h-20 max-w-[64ch] animate-pulse rounded-[2px] bg-sala" />
      </div>
    </>
  )
}
