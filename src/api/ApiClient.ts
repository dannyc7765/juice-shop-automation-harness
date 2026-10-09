import { randomUUID } from 'node:crypto';
import type { APIRequestContext } from '@playwright/test';

export interface Credentials {
  email: string;
  password: string;
}

export interface TestUser extends Credentials {
  token: string;
  bid: string;
}

/** Thin wrapper over Juice Shop's REST API, used for fast, deterministic test setup. */
export class ApiClient {
  constructor(private readonly request: APIRequestContext) {}

  static uniqueCredentials(): Credentials {
    return {
      email: `sdet-${randomUUID().slice(0, 12)}@juice-sh.op`,
      password: `Pw-${randomUUID().slice(0, 12)}!`,
    };
  }

  async register(creds: Credentials = ApiClient.uniqueCredentials()): Promise<Credentials> {
    const res = await this.request.post('/api/Users', {
      data: { email: creds.email, password: creds.password, passwordRepeat: creds.password },
    });
    if (res.status() !== 201) {
      throw new Error(`User registration failed: HTTP ${res.status()} ${await res.text()}`);
    }
    return creds;
  }

  async login(creds: Credentials): Promise<{ token: string; bid: string }> {
    const res = await this.request.post('/rest/user/login', { data: creds });
    if (!res.ok()) {
      throw new Error(`Login failed: HTTP ${res.status()} ${await res.text()}`);
    }
    const { authentication } = await res.json();
    return { token: authentication.token, bid: String(authentication.bid) };
  }

  /** Registers a brand-new user (with an empty basket, no addresses, no cards) and logs in. */
  async createUser(): Promise<TestUser> {
    const creds = await this.register();
    return { ...creds, ...(await this.login(creds)) };
  }

  static bearer(token: string): Record<string, string> {
    return { Authorization: `Bearer ${token}` };
  }
}
