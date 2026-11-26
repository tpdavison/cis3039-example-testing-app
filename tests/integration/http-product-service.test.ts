import { URL } from 'node:url';
import { expect, it } from 'vitest';
import { HttpProductService } from '@/infra/http-product-service';

function readTestApiBaseUrl(): string {
  const configuredUrl = process.env.TEST_API_BASE_URL;
  const url = configuredUrl ? URL.parse(configuredUrl) : null;

  if (
    !url ||
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !url.pathname.endsWith('/')
  ) {
    throw new Error(
      'Set TEST_API_BASE_URL to the Product API base URL, such as http://localhost:7071/api/. Use HTTP(S) and a trailing slash, without credentials, a query, or a fragment.',
    );
  }

  return url.href;
}

it('reads the seeded products from the Week 10 Product API', async () => {
  // Arrange
  const service = new HttpProductService({ baseUrl: readTestApiBaseUrl() });
  const expectedProducts = [
    { id: 'p-001', name: 'Seeded Widget', pricePence: 1299 },
    { id: 'p-002', name: 'Seeded Gadget', pricePence: 2599 },
  ];

  // Act
  const products = await service.listProducts();

  // Assert
  expect(products).toEqual(
    expect.arrayContaining(
      expectedProducts.map((product) => expect.objectContaining(product)),
    ),
  );
});
