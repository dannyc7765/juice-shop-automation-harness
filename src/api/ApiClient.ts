import { randomUUID } from 'node:crypto';
import type { APIRequestContext, APIResponse } from '@playwright/test';

export interface Credentials {
  email: string;
  password: string;
}

export interface TestUser extends Credentials {
  token: string;
  bid: string;
}

/** The few response fields the checkout helper needs; other fields are ignored. */
interface CreatedBody {
  data: { id: number };
  orderConfirmation: string;
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

  /** Raw response so tests can assert on failures as well as successes. */
  async addToBasket(user: TestUser, productId: number, quantity = 1): Promise<APIResponse> {
    return this.request.post('/api/BasketItems', {
      headers: ApiClient.bearer(user.token),
      data: { ProductId: productId, BasketId: user.bid, quantity },
    });
  }

  async getBasket(user: TestUser): Promise<APIResponse> {
    return this.request.get(`/rest/basket/${user.bid}`, {
      headers: ApiClient.bearer(user.token),
    });
  }

  /** Creates an address and card, picks the first delivery method and checks out. Returns the order id. */
  async checkout(user: TestUser): Promise<string> {
    const headers = ApiClient.bearer(user.token);

    const address = await this.postOrThrow('/api/Addresss', headers, {
      country: 'United States',
      fullName: 'Alex Mercer',
      mobileNum: 5551234567,
      zipCode: '30047',
      streetAddress: '100 Technology Pkwy',
      city: 'Atlanta',
      state: 'Georgia',
    });
    const card = await this.postOrThrow('/api/Cards', headers, {
      fullName: 'Alex Mercer',
      cardNum: 4111111111111111,
      expMonth: 11,
      expYear: 2085,
    });

    const deliveryRes = await this.request.get('/api/Deliverys', { headers });
    if (!deliveryRes.ok()) {
      throw new Error(`Delivery methods failed: HTTP ${deliveryRes.status()}`);
    }
    const delivery = await deliveryRes.json();

    const body = await this.postOrThrow(`/rest/basket/${user.bid}/checkout`, headers, {
      orderDetails: {
        paymentId: String(card.data.id),
        addressId: String(address.data.id),
        deliveryMethodId: String(delivery.data[0].id),
      },
    });
    return String(body.orderConfirmation);
  }

  private async postOrThrow(
    path: string,
    headers: Record<string, string>,
    data: unknown,
  ): Promise<CreatedBody> {
    const res = await this.request.post(path, { headers, data });
    if (!res.ok()) {
      throw new Error(`POST ${path} failed: HTTP ${res.status()} ${await res.text()}`);
    }
    return (await res.json()) as CreatedBody;
  }
}
