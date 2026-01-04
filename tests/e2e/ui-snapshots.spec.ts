import { test, expect, type Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const screenshotsDir = path.join(process.cwd(), 'tests', 'e2e', 'screenshots')

type PageSpec = {
  name: string
  path: string
  locator: (page: Page) => ReturnType<Page['locator']>
}

const pages: PageSpec[] = [
  {
    name: 'login',
    path: '/login',
    locator: (page) => page.getByRole('heading', { name: 'Welcome back', level: 1 }),
  },
  {
    name: 'inquiry',
    path: '/inquiry',
    locator: (page) =>
      page.locator('[data-slot="card-title"]', { hasText: 'Get a Free Lawn Care Quote' }),
  },
  {
    name: 'dashboard',
    path: '/',
    locator: (page) => page.getByRole('heading', { name: 'Dashboard', level: 1 }),
  },
  {
    name: 'customers',
    path: '/customers',
    locator: (page) => page.getByRole('heading', { name: 'Customers', level: 1 }),
  },
  {
    name: 'routes',
    path: '/routes',
    locator: (page) => page.getByRole('heading', { name: 'Routes', level: 1 }),
  },
  {
    name: 'schedule',
    path: '/schedule',
    locator: (page) => page.getByRole('heading', { name: 'Schedule', level: 1 }),
  },
  {
    name: 'inquiries',
    path: '/inquiries',
    locator: (page) => page.getByRole('heading', { name: 'Inquiries', level: 1 }),
  },
  {
    name: 'invoices',
    path: '/invoices',
    locator: (page) => page.getByRole('heading', { name: 'Invoices', level: 1 }),
  },
  {
    name: 'analytics',
    path: '/analytics',
    locator: (page) => page.getByRole('heading', { name: 'Lawn Care CRM Analytics', level: 1 }),
  },
  {
    name: 'services',
    path: '/services',
    locator: (page) => page.getByRole('heading', { name: 'Services Catalog', level: 1 }),
  },
  {
    name: 'crew',
    path: '/crew',
    locator: (page) => page.getByRole('heading', { name: 'Crew', level: 1 }),
  },
  {
    name: 'settings',
    path: '/settings',
    locator: (page) => page.getByRole('heading', { name: 'Settings', level: 1 }),
  },
  {
    name: 'audit-logs',
    path: '/audit-logs',
    locator: (page) =>
      page.locator('[data-slot="card-title"]', { hasText: 'Audit Logs' }),
  },
]

test.beforeAll(() => {
  fs.mkdirSync(screenshotsDir, { recursive: true })
})

for (const pageInfo of pages) {
  test(`capture ${pageInfo.name}`, async ({ page }, testInfo) => {
    await page.goto(pageInfo.path, { waitUntil: 'domcontentloaded' })
    await expect(pageInfo.locator(page)).toBeVisible()
    await page.waitForTimeout(500)
    const projectDir = path.join(screenshotsDir, testInfo.project.name)
    fs.mkdirSync(projectDir, { recursive: true })
    await page.screenshot({
      path: path.join(projectDir, `${pageInfo.name}.png`),
      fullPage: true,
      animations: 'disabled',
    })
  })
}
