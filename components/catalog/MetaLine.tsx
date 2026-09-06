interface MetaLineProps {
  items: (string | null)[]
  className?: string
}

/** Ano, duração e nota separados por fio, não por ponto médio: a régua
 *  vertical é lida como divisão sem virar enfeite de texto. */
export function MetaLine({ items, className = '' }: MetaLineProps) {
  const visible = items.filter((item): item is string => Boolean(item))
  if (visible.length === 0) return null

  return (
    <ul className={`flex flex-wrap items-center gap-x-4 gap-y-1 ${className}`}>
      {visible.map((item, index) => (
        <li
          key={`${index}-${item}`}
          className={index > 0 ? 'border-l border-borda pl-4' : ''}
        >
          {item}
        </li>
      ))}
    </ul>
  )
}
