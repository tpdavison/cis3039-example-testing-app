import { enableAutoUnmount, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent } from 'vue';
import type { ProductDeps, ProductService } from '../app/product-service';
import type { Product } from '../domain/product';
import { PRODUCT_DEPS_KEY } from './products-key';
import { useProducts } from './use-products';

enableAutoUnmount(afterEach);

function mountUseProducts(productService: ProductService) {
  const harness = defineComponent({
    setup: () => ({ state: useProducts() }),
    render: () => null,
  });
  const deps: ProductDeps = { productService };
  const wrapper = mount(harness, {
    global: { provide: { [PRODUCT_DEPS_KEY]: deps } },
  });
  return wrapper.vm.state;
}

describe('useProducts', () => {
  it('starts with an empty list and no loading or error state', () => {
    // Arrange
    const productService: ProductService = {
      listProducts: async () => [],
    };

    // Act
    const { products, loading, error } = mountUseProducts(productService);

    // Assert
    expect(products.value).toEqual([]);
    expect(loading.value).toBe(false);
    expect(error.value).toBeNull();
  });

  it('shows loading until the service returns its products', async () => {
    // Arrange
    const expectedProducts: readonly Product[] = [
      { id: 'widget', name: 'Widget', pricePence: 1299 },
    ];
    let resolveProducts!: (products: readonly Product[]) => void;
    const pendingProducts = new Promise<readonly Product[]>((resolve) => {
      resolveProducts = resolve;
    });
    const { products, loading, error, fetchProducts } = mountUseProducts({
      listProducts: () => pendingProducts,
    });

    // Act
    const request = fetchProducts();
    const loadingWhilePending = loading.value;
    resolveProducts(expectedProducts);
    await request;

    // Assert
    expect(loadingWhilePending).toBe(true);
    expect(products.value).toEqual(expectedProducts);
    expect(loading.value).toBe(false);
    expect(error.value).toBeNull();
  });

  it('shows a user-facing error and clears loading when the service rejects', async () => {
    // Arrange
    const { products, loading, error, fetchProducts } = mountUseProducts({
      listProducts: async () => {
        throw new Error('Service unavailable');
      },
    });

    // Act
    await fetchProducts();

    // Assert
    expect(error.value).toBe('Products could not be loaded. Please try again.');
    expect(loading.value).toBe(false);
    expect(products.value).toEqual([]);
  });

  it.todo('loads products and clears the error when a retry succeeds');
});
