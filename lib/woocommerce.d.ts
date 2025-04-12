export interface ProductImage {
  id: number;
  src: string;
  alt?: string;
  name?: string;
}

export interface ProductCategory {
  id: number;
  name: string;
  slug: string;
}

export interface ProductAttribute {
  id: number;
  name: string;
  position: number;
  visible: boolean;
  variation: boolean;
  options: string[];
}

export class Product {
  id: number;
  name: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  description: string;
  short_description: string;
  images: ProductImage[];
  categories: ProductCategory[];
  stock_status: string;
  stock_quantity: number;
  attributes: ProductAttribute[];
  variations: number[];
}

export interface ProductsResponse {
  products: Product[];
  totalPages: number;
  total: number;
}

export interface OrderLineItem {
  product_id: number;
  quantity: number;
  variation_id?: number;
}

export interface OrderData {
  payment_method: string;
  payment_method_title: string;
  set_paid: boolean;
  billing: {
    first_name: string;
    last_name: string;
    address_1: string;
    address_2?: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    email: string;
    phone?: string;
  };
  shipping?: {
    first_name: string;
    last_name: string;
    address_1: string;
    address_2?: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  line_items: OrderLineItem[];
  customer_id?: number;
}

export function getProducts(page?: number, perPage?: number, category?: number): Promise<ProductsResponse>;
export function getProduct(productId: number): Promise<Product>;
export function getCategories(): Promise<ProductCategory[]>;
export function searchProducts(searchTerm: string, page?: number, perPage?: number): Promise<ProductsResponse>;
export function applyMembershipDiscount(price: string, isPremium?: boolean): string;
export function createOrder(orderData: OrderData): Promise<any>;

declare const _default: {
  getProducts: typeof getProducts;
  getProduct: typeof getProduct;
  getCategories: typeof getCategories;
  searchProducts: typeof searchProducts;
  applyMembershipDiscount: typeof applyMembershipDiscount;
  createOrder: typeof createOrder;
};

export default _default;
