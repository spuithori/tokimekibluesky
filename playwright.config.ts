import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testIgnore: [
    '**/virtual-scroll*.spec.ts',
    '**/baseline-memory.spec.ts',
    '**/memory-comparison.spec.ts',
    '**/memory-profile.spec.ts',
    '**/realistic-memory-benchmark.spec.ts',
    '**/heap-snapshot.spec.ts',
    '**/benchmark-comparison.spec.ts',
    '**/performance-benchmark.spec.ts',
    ...(process.env.PROBE ? [] : [
      '**/research-jank*.spec.ts',
      '**/research-trace-vocab.spec.ts',
      '**/research-perf-loop.spec.ts',
    ]),
  ],
  globalSetup: './e2e/support/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
    },
  },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
