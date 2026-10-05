import { Page, Locator } from '@playwright/test';

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  protected async navigate(path: string = '/'): Promise<void> {
    await this.page.goto(path);
  }

  protected async waitForNetworkIdle(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  protected async getToastMessage(): Promise<string> {
    const toast = this.page.locator('simple-snack-bar, .mat-snack-bar-container');
    await toast.waitFor({ state: 'visible' });
    return (await toast.textContent()) || '';
  }

  protected getByRole(role: Parameters<Page['getByRole']>[0], options?: Parameters<Page['getByRole']>[1]): Locator {
    return this.page.getByRole(role, options);
  }

  protected getByLabel(text: string | RegExp): Locator {
    return this.page.getByLabel(text);
  }

  protected getByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }
}