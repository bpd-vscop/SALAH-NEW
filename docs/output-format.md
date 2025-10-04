# Output Format

## Authentication
- `POST /api/auth/register` → `201`
  - Body: `{ user: User }`
- `POST /api/auth/login` → `200`
  - Body: `{ user: User }`
- `GET /api/auth/me` → `200`
  - Body: `{ user: User | null }`
- `POST /api/auth/logout` → `204`
  - Body: _empty_
- `POST /api/auth/change-password` → `200`
  - Body: `{ message: string }`

### User type
```
User {
  id: string,
  name: string,
  username: string,
  role: 'admin' | 'manager' | 'staff' | 'client',
  status: 'active' | 'inactive',
  verificationFileUrl?: string | null,
  cart: CartItem[],
  orderHistory: string[],
  accountCreated?: string | null,
  accountUpdated?: string | null
}
```

`CartItem { productId: string, quantity: number }`

## User management (admin/manager)
- `GET /api/users` → `{ users: User[] }`
- `POST /api/users` → `{ user: User }`
- `PUT /api/users/:id` → `{ user: User }`
- `DELETE /api/users/:id` → `204`

## Categories
- `GET /api/categories` → `{ categories: Category[] }`
- `POST /api/categories` → `{ category: Category }`
- `PUT /api/categories/:id` → `{ category: Category }`
- `DELETE /api/categories/:id` → `204`

`Category { id: string, name: string, parentId: string | null }`

## Products
- `GET /api/products` → `{ products: Product[] }`
- `GET /api/products/:id` → `{ product: Product }`
- `POST /api/products` → `{ product: Product }`
- `PUT /api/products/:id` → `{ product: Product }`
- `DELETE /api/products/:id` → `204`

```
Product {
  id: string,
  name: string,
  categoryId: string,
  tags: Array<'in stock' | 'out of stock' | 'on sale' | 'available to order'>,
  description: string,
  images: string[],
  price: number,
  attributes?: Record<string, string> | null,
  createdAt?: string | null,
  updatedAt?: string | null
}
```

## Banners
- `GET /api/banners` → `{ banners: Banner[] }`
- `POST /api/banners` → `{ banner: Banner }`
- `PUT /api/banners/:id` → `{ banner: Banner }`
- `DELETE /api/banners/:id` → `204`

`Banner { id: string, type: 'slide' | 'row' | 'advertising', imageUrl: string, linkUrl?: string | null, text?: string | null, order?: number, isActive?: boolean }`

## Orders
- `GET /api/orders` → `{ orders: Order[] }`
- `GET /api/orders/:id` → `{ order: Order }`
- `POST /api/orders` → `{ order: Order }`
- `PATCH /api/orders/:id` → `{ order: Order }`

```
Order {
  id: string,
  userId: string,
  products: Array<{
    productId: string,
    name: string,
    quantity: number,
    price: number,
    tagsAtPurchase: Product['tags']
  }>,
  status: 'pending' | 'processing' | 'completed' | 'cancelled',
  createdAt: string | null,
  updatedAt: string | null
}
```

## Cart (authenticated clients)
- `GET /api/cart` → `{ cart: CartItem[] }`
- `PUT /api/cart` → `{ cart: CartItem[] }`

## File uploads
- `POST /api/uploads/verification` → `{ verificationFileUrl: string }`
- Errors deliver `{ error: { message: string, details?: Array<Record<string, unknown>> } }`
