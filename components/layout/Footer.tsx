export function Footer() {
  return (
    <footer className="border-t border-borda/60 bg-sala/40">
      <div className="px-[var(--margem)] py-10">
        <p className="max-w-[46ch] text-sm leading-relaxed text-nevoa">
          Catálogo do que já está incluído nas assinaturas que você paga, no
          Brasil.
        </p>
        <div className="mt-6 max-w-[62ch] space-y-1 text-xs leading-relaxed text-nevoa">
          <p>
            Este site usa o TMDB e as APIs do TMDB, mas não é endossado,
            certificado ou de outra forma aprovado pelo TMDB.
          </p>
          <p>Dados de disponibilidade em streaming fornecidos por JustWatch.</p>
        </div>
      </div>
    </footer>
  )
}
