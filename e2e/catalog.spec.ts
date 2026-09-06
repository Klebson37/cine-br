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
