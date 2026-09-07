import { expect, test } from '@playwright/test'

test('percorre o fluxo principal do catálogo', async ({ page }) => {
  await page.goto('/')

  // A home carrega com pelo menos uma fileira e um destaque.
  await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible()

  // Selecionar um streaming pelo painel.
  await page.getByRole('link', { name: /meus streamings/i }).click()
  const netflix = page.getByRole('checkbox').first()
  await netflix.check()
  await page.getByRole('button', { name: /salvar/i }).click()

  // O contador do cabeçalho reflete a escolha.
  await expect(
    page.getByRole('link', { name: /meus streamings \(1\)/i }),
  ).toBeVisible()

  // Abrir um filme e conferir o bloco de disponibilidade.
  await page.locator('a[href^="/movie/"]').first().click()
  await expect(
    page.getByRole('heading', { name: /onde assistir/i }),
  ).toBeVisible()
})

test('filtra a home por nota minima sem sair do modo descoberta', async ({
  page,
}) => {
  await page.goto('/')

  const antes = await page
    .getByRole('heading', { level: 2 })
    .first()
    .textContent()
  expect(antes).toContain('10')

  await page.getByLabel('Nota mínima').selectOption('8')
  await page.getByRole('button', { name: /aplicar/i }).click()

  await expect(page).toHaveURL(/rating=8/)

  // Continua em descoberta: as fileiras seguem na tela, e o título da
  // fileira de ranking perde a promessa de dez.
  const depois = page.getByRole('heading', { level: 2 }).first()
  await expect(depois).toBeVisible()
  await expect(depois).toContainText(/mais populares/i)
  await expect(depois).not.toContainText('10')

  // O seletor lembra a escolha depois do recarregamento.
  await expect(page.getByLabel('Nota mínima')).toHaveValue('8')
})
