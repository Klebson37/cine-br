import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'image.tmdb.org', pathname: '/t/p/**' },
    ],
  },
  // O índice de notas é lido com readFileSync, que o rastreador de arquivos
  // não consegue seguir. Sem isto o arquivo não entra no bundle serverless e
  // o filtro de nota quebra só em produção.
  outputFileTracingIncludes: {
    '/': ['./data/**/*'],
    '/*': ['./data/**/*'],
  },
}

export default nextConfig
