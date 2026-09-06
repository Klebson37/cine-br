/** O jsdom não traz ResizeObserver nem matchMedia, que as fileiras usam
 *  para decidir se as setas têm para onde ir e se a rolagem é suave.
 *  Aqui bastam versões inertes: o comportamento é coberto no Playwright. */

class ResizeObserverInerte {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver =
    ResizeObserverInerte as unknown as typeof ResizeObserver
}

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}
