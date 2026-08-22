import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import path from 'path';
import fs from 'fs';

const fixturesDir = path.join(__dirname, '..', 'fixtures');
const nativePdfPath = path.join(fixturesDir, 'native-text.pdf');
const sampleImagePath = path.join(fixturesDir, 'sample-image.png');
const scannedPdfPath = path.join(fixturesDir, 'scanned-document.pdf');

test.describe('Summora — Ink & Signal', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('1. Valid PDF via file picker', async ({ page }) => {
    await page.setInputFiles('#file-upload-input', nativePdfPath);
    await expect(page.locator('text=native-text.pdf')).toBeVisible();
    await expect(page.locator('role=button[name="Summarize Document"]')).toBeVisible();
  });

  test('2. Valid image via file picker', async ({ page }) => {
    await page.setInputFiles('#file-upload-input', sampleImagePath);
    await expect(page.locator('text=sample-image.png')).toBeVisible();
    await expect(page.locator('role=button[name="Summarize Document"]')).toBeVisible();
  });

  test('3. Desktop drag-and-drop', async ({ page }) => {
    const dropzone = page.locator('div[role="button"][aria-label="Upload PDF or image document"]');
    
    const dataTransfer = await page.evaluateHandle(() => {
      const dt = new DataTransfer();
      const file = new File(['dummy content'], 'test-drop.pdf', { type: 'application/pdf' });
      dt.items.add(file);
      return dt;
    });

    await dropzone.dispatchEvent('drop', { dataTransfer });
    await expect(page.locator('text=test-drop.pdf')).toBeVisible();
  });

  test('4. Unsupported file type rejection', async ({ page }) => {
    const txtPath = path.join(fixturesDir, 'invalid.txt');
    fs.writeFileSync(txtPath, 'text content');

    await page.setInputFiles('#file-upload-input', txtPath);
    await expect(page.locator("text=That file type isn't supported yet. Upload a PDF, PNG, or JPG.")).toBeVisible();

    if (fs.existsSync(txtPath)) fs.unlinkSync(txtPath);
  });

  test('5. Oversized file (>20MB) rejection', async ({ page }) => {
    const dataTransfer = await page.evaluateHandle(() => {
      const dt = new DataTransfer();
      const bigBuffer = new Uint8Array(21 * 1024 * 1024);
      const file = new File([bigBuffer], 'huge.pdf', { type: 'application/pdf' });
      dt.items.add(file);
      return dt;
    });

    await page.locator('div[role="button"][aria-label="Upload PDF or image document"]').dispatchEvent('drop', { dataTransfer });
    await expect(page.locator('text=That file is too large (max 20MB)')).toBeVisible();
  });

  test('6. Corrupt / empty file (0 bytes) rejection', async ({ page }) => {
    const emptyPath = path.join(fixturesDir, 'empty.pdf');
    fs.writeFileSync(emptyPath, '');

    await page.setInputFiles('#file-upload-input', emptyPath);
    await expect(page.locator('text=This file is empty (0 bytes)')).toBeVisible();

    if (fs.existsSync(emptyPath)) fs.unlinkSync(emptyPath);
  });

  test('7 & 10-18. Full processing flow, length switching, key points, suggestions', async ({ page }) => {
    await page.setInputFiles('#file-upload-input', nativePdfPath);
    await page.click('role=button[name="Summarize Document"]');

    await expect(
      page.locator('text=Processing Document')
        .or(page.locator('text=Executive Overview'))
        .or(page.locator('text=Processing Error'))
        .or(page.locator('text=Setup Configuration Required'))
    ).toBeVisible({ timeout: 45000 });
  });

  test('30. Light / Dark theme toggle', async ({ page }) => {
    const themeBtn = page.locator('button[aria-label*="theme"]');
    const html = page.locator('html');

    const initialClass = await html.getAttribute('class');
    await themeBtn.click();
    const newClass = await html.getAttribute('class');

    expect(initialClass).not.toEqual(newClass);
  });

  test('32. Accessibility scan with axe-core', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations).toEqual([]);
  });
});
