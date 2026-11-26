import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import type { ProductDeps } from '../app/product-service';
import { PRODUCT_DEPS_KEY } from '../composables/products-key';
import type { Product } from '../domain/product';
import Products from './Products.vue';

enableAutoUnmount(afterEach);

function mountProducts(products: readonly Product[]) {
  const deps: ProductDeps = {
    productService: { listProducts: async () => products },
  };
  return mount(Products, {
    global: { provide: { [PRODUCT_DEPS_KEY]: deps } },
  });
}

describe('Products.vue', () => {
  it('renders product names and formatted prices', async () => {
    // Arrange
    const products: readonly Product[] = [
      { id: 'widget', name: 'Widget', pricePence: 1299 },
      { id: 'gadget', name: 'Gadget', pricePence: 2599 },
    ];

    // Act
    const wrapper = mountProducts(products);
    await flushPromises();
    const items = wrapper.findAll('li').map((item) => item.text());

    // Assert
    expect(items).toHaveLength(2);
    expect(items).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Widget\s*£12\.99/),
        expect.stringMatching(/Gadget\s*£25\.99/),
      ]),
    );
  });

  it('shows the empty state when the service returns no products', async () => {
    // Arrange
    const products: readonly Product[] = [];

    // Act
    const wrapper = mountProducts(products);
    await flushPromises();
    const text = wrapper.text();
    const hasProductList = wrapper.find('ul').exists();

    // Assert
    expect(text).toContain('No products found.');
    expect(hasProductList).toBe(false);
  });

  it('shows descriptions when supplied and distinguishes zero from a missing price', async () => {
    // Arrange
    const products: readonly Product[] = [
      {
        id: 'sample',
        name: 'Sample',
        pricePence: 0,
        description: 'Free with any order',
      },
      { id: 'spare', name: 'Spare' },
    ];

    // Act
    const wrapper = mountProducts(products);
    await flushPromises();
    const items = wrapper.findAll('li').map((item) => item.text());

    // Assert
    expect(items).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Sample\s*£0\.00\s*Free with any order/),
        expect.stringMatching(/^Spare\s*—$/),
      ]),
    );
  });

  it.todo('allows the user to retry after a failed request');
});
