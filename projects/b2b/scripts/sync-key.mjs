import { readFileSync, writeFileSync } from 'node:fs'
const seed = JSON.parse(readFileSync(new URL('../.local-seed.json', import.meta.url), 'utf8'))
const env = new URL('../apps/storefront/.env.local', import.meta.url)
const content = readFileSync(env, 'utf8').replace(/^NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=.*$/m, `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=${seed.publishableKey}`)
writeFileSync(env, content, { mode: 0o600 })
console.log('Storefront publishable key configured')
