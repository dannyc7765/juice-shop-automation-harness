import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage.js';

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = this.getByLabel(/email/i);
    this.passwordInput = this.getByLabel(/password/i);
    this.loginButton = this.getByRole('button', { name: /log in/i });
  }

  async goto(): Promise<void> {
    await this.navigate('/#/login');
  }

  async login(email: string, pass: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(pass);
    await this.loginButton.click();
  }
}