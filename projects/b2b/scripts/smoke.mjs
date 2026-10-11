import assert from 'node:assert/strict'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { randomUUID, randomBytes } from 'node:crypto'

const readEnv = (name) => Object.fromEntries(readFileSync(new URL(name, import.meta.url), 'utf8').split('\n').filter((line) => /^[A-Z_]+=/.test(line)).map((line) => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)] }))
const backendEnv = readEnv('../apps/backend/.env')
const frontEnv = readEnv('../apps/storefront/.env.local')
const base = frontEnv.NEXT_PUBLIC_MEDUSA_BACKEND_URL
const key = frontEnv.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
const checks = []
const pass = (name) => { checks.push(name); console.log(`PASS ${name}`) }
async function request(route, { token, body, method = body ? 'POST' : 'GET', expected } = {}) {
  const response = await fetch(`${base}${route}`, {
    method, headers: { 'content-type': 'application/json', 'x-publishable-api-key': key, ...(token ? { authorization: `Bearer ${token}` } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000),
  })
  const data = await response.json().catch(() => ({}))
  if (expected) assert.equal(response.status, expected, `${route}: ${JSON.stringify(data)}`)
  else assert.ok(response.ok, `${method} ${route}: ${response.status} ${JSON.stringify(data)}`)
  return data
}
async function registerBuyer() {
  const email = `smoke-${randomUUID()}@example.test`
  const password = randomBytes(24).toString('hex')
  const registration = await request('/auth/customer/emailpass/register', { body: { email, password } })
  const { customer } = await request('/store/customers', { token: registration.token, body: { email, first_name: 'Smoke', last_name: 'Buyer' } })
  const login = await request('/auth/customer/emailpass', { body: { email, password } })
  return { customer, token: login.token, email }
}

await request('/health')
pass('backend health')
const { regions } = await request('/store/regions')
const region = regions.find((r) => r.countries.some((c) => c.iso_2 === 'gb'))
assert.ok(region, 'GB region missing')
const { products } = await request(`/store/products?region_id=${region.id}&fields=*variants.calculated_price,*variants.options`)
assert.ok(products.length > 0)
pass('Mercur product catalog and prices')
const { offers } = await request(`/store/offers?variant_id=${products[0].variants[0].id}&region_id=${region.id}&fields=+calculated_price`)
assert.ok(offers[0]?.id && typeof offers[0].calculated_price?.calculated_amount === 'number')
pass('supplier offers and calculated prices')
const buyer = await registerBuyer()
pass('buyer registration and login')
const { companies } = await request('/store/companies', { token: buyer.token, body: { name: 'Smoke Buyer Ltd', email: buyer.email, currency_code: 'eur', country: 'gb' } })
const company = companies[0]
const { customer } = await request('/store/customers/me?fields=+employee,*employee.company', { token: buyer.token })
assert.equal(customer.employee?.company_id, company.id)
assert.equal(customer.employee?.is_admin, true)
pass('company creation and creator administrator binding')
let { cart } = await request('/store/carts', { token: buyer.token, body: { region_id: region.id, metadata: { company_id: company.id } } })
await request(`/store/carts/${cart.id}/customer`, { token: buyer.token, body: {} })
await request(`/store/carts/${cart.id}/line-items`, { token: buyer.token, body: { offer_id: offers[0].id, quantity: 2 } })
pass('Mercur offer-based add to cart')
await request(`/store/carts/${cart.id}/line-items/bulk`, { token: buyer.token, body: { line_items: [{ variant_id: offers[0].variant_id, offer_id: offers[0].id, quantity: 3 }] } })
pass('B2B bulk cart adapter')
await request(`/store/carts/${cart.id}/line-items/bulk`, { token: buyer.token, body: { line_items: [{ variant_id: 'variant-does-not-match', offer_id: offers[0].id, quantity: 1 }] }, expected: 400 })
pass('reject mismatched offer and variant')
await request(`/store/carts/${cart.id}`, { token: buyer.token, body: {
  email: buyer.email,
  shipping_address: { first_name: 'Smoke', last_name: 'Buyer', address_1: '1 Test Street', city: 'London', postal_code: 'SW1A 1AA', country_code: 'gb' },
  billing_address: { first_name: 'Smoke', last_name: 'Buyer', address_1: '1 Test Street', city: 'London', postal_code: 'SW1A 1AA', country_code: 'gb' },
} })
const { quote } = await request('/store/quotes', { token: buyer.token, body: { cart_id: cart.id } })
assert.equal(quote.status, 'pending_merchant')
await request(`/store/quotes/${quote.id}/messages`, { token: buyer.token, body: { text: 'Please confirm the wholesale quote.' } })
pass('request quote and buyer message')
const other = await registerBuyer()
await request(`/store/companies/${company.id}`, { token: other.token, expected: 403 })
await request(`/store/quotes/${quote.id}/preview`, { token: other.token, expected: 404 })
await request(`/store/quotes/${quote.id}/accept`, { token: other.token, body: {}, expected: 404 })
await request('/store/quotes', { token: other.token, body: { cart_id: cart.id }, expected: 400 })
pass('cross-customer company, cart, and quote isolation')
const admin = await request('/auth/user/emailpass', { body: { email: backendEnv.DEMO_ADMIN_EMAIL, password: backendEnv.DEMO_ADMIN_PASSWORD } })
await request(`/admin/quotes/${quote.id}/messages`, { token: admin.token, body: { text: 'Quote confirmed by platform.' } })
await request(`/admin/quotes/${quote.id}/send`, { token: admin.token, body: {} })
const sent = await request(`/store/quotes/${quote.id}`, { token: buyer.token })
assert.equal(sent.quote.status, 'pending_customer')
pass('platform reviews and sends quote')
const accepted = await request(`/store/quotes/${quote.id}/accept`, { token: buyer.token, body: {} })
assert.equal(accepted.quote.status, 'accepted')
pass('buyer accepts quote')
const order = await request(`/admin/orders/${accepted.quote.draft_order.id}`, { token: admin.token })
assert.equal(order.order.is_draft_order, false)
pass('accepted quote becomes regular order')

if (process.env.SMOKE_FRONTEND !== 'false') {
  for (const route of ['/gb', '/gb/store', '/gb/account', `/gb/products/${products[0].handle}`]) {
    const response = await fetch(`${frontEnv.NEXT_PUBLIC_BASE_URL}${route}`, { signal: AbortSignal.timeout(60000) })
    assert.equal(response.status, 200, `Frontend ${route}`)
    assert.match(await response.text(), /<html/)
  }
  pass('SSR home, catalog, account and product pages')
}
mkdirSync(new URL('../.local/', import.meta.url), { recursive: true })
writeFileSync(new URL('../.local/smoke-result.json', import.meta.url), JSON.stringify({ passed: true, checks, completedAt: new Date().toISOString() }, null, 2))
console.log(`All ${checks.length} smoke checks passed`)
