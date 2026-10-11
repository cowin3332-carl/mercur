import { randomBytes } from 'node:crypto'
import { existsSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const secret = () => randomBytes(32).toString('hex')
const write = (name, content) => {
  const target = path.join(root, name)
  if (existsSync(target)) return console.log(`Keeping ${name}`)
  writeFileSync(target, content, { mode: 0o600 })
  console.log(`Created ${name}`)
}
const password = secret()
write('.env', `POSTGRES_PASSWORD=${password}\n`)
write('apps/backend/.env', `DATABASE_URL=postgres://postgres:${password}@localhost:5433/mercur_b2b
STORE_CORS=http://localhost:8000
ADMIN_CORS=http://localhost:9000
AUTH_CORS=http://localhost:8000,http://localhost:9000
JWT_SECRET=${secret()}
COOKIE_SECRET=${secret()}
DEMO_ADMIN_EMAIL=admin@example.test
DEMO_ADMIN_PASSWORD=${secret()}
DEMO_SELLER_PASSWORD=${secret()}
DISABLE_ADMIN=false
`)
write('apps/storefront/.env.local', `NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=replace-after-seed
NEXT_PUBLIC_BASE_URL=http://localhost:8000
NEXT_PUBLIC_DEFAULT_REGION=gb
REVALIDATE_SECRET=${secret()}
`)
