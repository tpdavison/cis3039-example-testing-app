import { describe, expect, it, vi } from 'vitest';
import { HttpProductService, type HttpClient } from './http-product-service';

const baseUrl = 'https://catalogue.example/api/';

describe('HttpProductService', () => {
  it('requests the product endpoint and decodes the list', async () => {
    // Arrange
    const product = {
      id: 'widget',
      name: 'Widget',
      pricePence: 1299,
      description: 'An example product',
    };
    const http = vi
      .fn<HttpClient>()
      .mockResolvedValue(
        Response.json([{ ...product, updatedAt: '2026-01-01T00:00:00.000Z' }]),
      );
    const service = new HttpProductService({ baseUrl, http });

    // Act
    const products = await service.listProducts();

    // Assert
    expect(products).toEqual([product]);
    expect(http).toHaveBeenCalledExactlyOnceWith(
      'https://catalogue.example/api/products',
      { headers: { Accept: 'application/json' } },
    );
  });

  it('rejects a non-success HTTP response', async () => {
    // Arrange
    const http: HttpClient = async () => new Response(null, { status: 500 });
    const service = new HttpProductService({ baseUrl, http });

    // Act
    const request = service.listProducts();

    // Assert
    await expect(request).rejects.toThrow(/status 500/);
  });

  it('rejects a response whose body is not an array', async () => {
    // Arrange
    const http: HttpClient = async () => Response.json({ products: [] });
    const service = new HttpProductService({ baseUrl, http });

    // Act
    const request = service.listProducts();

    // Assert
    await expect(request).rejects.toThrow(/invalid list/);
  });

  it('rejects a product whose price has the wrong type', async () => {
    // Arrange
    const http: HttpClient = async () =>
      Response.json([{ id: 'widget', name: 'Widget', pricePence: '1299' }]);
    const service = new HttpProductService({ baseUrl, http });

    // Act
    const request = service.listProducts();

    // Assert
    await expect(request).rejects.toThrow(/invalid product fields/);
  });

  it.todo('rejects a list with duplicate product IDs');
});
