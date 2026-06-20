/**
 * Universal Product Catalog — the source of truth for the Taqelah demo app's
 * products. Ported verbatim from the reference repo (tests/data/products.js);
 * verified against the v1.1.0 UI dump. Names + prices are exact a11y strings.
 */

export interface Product {
  name: string;
  price: string;
}

export interface CategoryAnchors {
  cheapest: string;
  mostExpensive: string;
  alphaFirst: string;
  alphaLast: string;
}

export interface Category {
  name: string;
  count: number;
  products: Product[];
  anchors: CategoryAnchors;
}

export interface GlobalAnchor {
  name: string;
  price: string;
}

export interface ProductCatalog {
  anchors: {
    cheapest: GlobalAnchor;
    mostExpensive: GlobalAnchor;
    alphaFirst: GlobalAnchor;
    alphaLast: GlobalAnchor;
  };
  categories: {
    casual: Category;
    evening: Category;
    party: Category;
    boho: Category;
  };
  catalog: {
    totalItems: number;
    pageSize: number;
  };
}

const products: ProductCatalog = {
  // Sorting anchors for the full "All Dresses" grid (top result per mode).
  anchors: {
    cheapest: { name: 'Casual Sundress', price: '$49.99' },
    mostExpensive: { name: 'Champagne Gown', price: '$319.99' },
    alphaFirst: { name: 'Black Sequin Mini', price: '$119.99' },
    alphaLast: { name: 'Yellow Sundress', price: '$54.99' },
  },

  categories: {
    casual: {
      name: 'Casual Dresses',
      count: 8,
      products: [
        { name: 'Casual Sundress', price: '$49.99' },
        { name: 'Denim Dress', price: '$74.99' },
        { name: 'Floral Maxi Dress', price: '$89.99' },
        { name: 'Rust Linen Dress', price: '$72.99' },
        { name: 'Sage Midi Dress', price: '$69.99' },
        { name: 'Shirt Dress', price: '$79.99' },
        { name: 'White Linen Dress', price: '$64.99' },
        { name: 'Yellow Sundress', price: '$54.99' },
      ],
      anchors: {
        cheapest: '$49.99',
        mostExpensive: '$89.99',
        alphaFirst: 'Casual Sundress',
        alphaLast: 'Yellow Sundress',
      },
    },
    evening: {
      name: 'Evening Dresses',
      count: 8,
      products: [
        { name: 'Burgundy Velvet Dress', price: '$189.99' },
        { name: 'Champagne Gown', price: '$319.99' },
        { name: 'Coral Maxi Dress', price: '$169.99' },
        { name: 'Mauve Silk Dress', price: '$229.99' },
        { name: 'Peach Bridesmaid Dress', price: '$159.99' },
        { name: 'Red Evening Dress', price: '$279.99' },
        { name: 'Rose Satin Gown', price: '$299.99' },
        { name: 'Satin Evening Gown', price: '$249.99' },
      ],
      anchors: {
        cheapest: '$159.99',
        mostExpensive: '$319.99',
        alphaFirst: 'Burgundy Velvet Dress',
        alphaLast: 'Satin Evening Gown',
      },
    },
    party: {
      name: 'Party Dresses',
      count: 8,
      products: [
        { name: 'Black Sequin Mini', price: '$119.99' },
        { name: 'Copper Sequin Dress', price: '$134.99' },
        { name: 'Gold Party Dress', price: '$139.99' },
        { name: 'Lace Cocktail Dress', price: '$159.99' },
        { name: 'Little Black Dress', price: '$129.99' },
        { name: 'Mint Cocktail Dress', price: '$109.99' },
        { name: 'Navy Cocktail Dress', price: '$149.99' },
        { name: 'Rose Gold Mini', price: '$124.99' },
      ],
      anchors: {
        cheapest: '$109.99',
        mostExpensive: '$159.99',
        alphaFirst: 'Black Sequin Mini',
        alphaLast: 'Rose Gold Mini',
      },
    },
    boho: {
      name: 'Boho Dresses',
      count: 8,
      products: [
        { name: 'Boho Wrap Dress', price: '$69.99' },
        { name: 'Crochet White Dress', price: '$94.99' },
        { name: 'Emerald Wrap Dress', price: '$84.99' },
        { name: 'Lavender Tulle Skirt', price: '$69.99' },
        { name: 'Olive Shirt Dress', price: '$89.99' },
        { name: 'Pleated Midi Skirt', price: '$59.99' },
        { name: 'Terracotta Boho Dress', price: '$99.99' },
        { name: 'Turquoise Print Dress', price: '$79.99' },
      ],
      anchors: {
        cheapest: '$59.99',
        mostExpensive: '$99.99',
        alphaFirst: 'Boho Wrap Dress',
        alphaLast: 'Turquoise Print Dress',
      },
    },
  },

  catalog: {
    totalItems: 32,
    pageSize: 6,
  },
};

export default products;
