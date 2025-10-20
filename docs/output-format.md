# Output Format

## Authentication
- `POST /api/auth/register` → `201`
  - Request body:
    ```json
    {
      "clientType": "B2B",
      "basicInfo": {
        "fullName": "Ada Lovelace",
        "email": "ada@example.com",
        "password": "password123"
      },
      "companyInfo": {
        "companyName": "Analytical Engines",
        "companyAddress": "10 Downing St, London",
        "companyPhone": "+44 20 7946 0958"
      }
    }
    ```
  - Response body: `{ user: User }`
- `POST /api/auth/login` → `200`
  - Request body: `{ identifier: string, password: string }`
  - Response body: `{ user: User }`
- `GET /api/auth/me` → `200`
  - Body: `{ user: User | null }`
- `POST /api/auth/logout` → `204`
  - Body: _empty_
- `POST /api/auth/change-password` → `200`
  - Body: `{ message: string }`
- `POST /api/auth/verify` → `200`
  - Request body: `{ email: string, code: string }`
  - Success: `{ message: 'Email verified successfully.' }`
  - Errors:
    - Wrong code → `{ "error": { "message": "Invalid verification code." } }`
    - Expired code → `{ "error": { "message": "Verification code expired. Please request a new code." } }`
    - Too many attempts → `{ "error": { "message": "Too many failed attempts. Please request a new verification code." } }`
- `POST /api/auth/verify/resend` → `200`
  - Request body: `{ email: string }`
  - Success: `{ message: 'Verification code sent.' }`

### User type
```
User {
  id: string,
  name: string,
  email: string,
  username: string,
  role: 'super_admin' | 'admin' | 'staff' | 'client',
  status: 'active' | 'inactive',
  profileImageUrl?: string | null,
  clientType?: 'B2B' | 'C2B' | null,
  company?: {
    name: string | null,
    address: string | null,
    phone: string | null,
  },
  isEmailVerified?: boolean,
  emailVerifiedAt?: string | null,
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

## Hero Slides
- `GET /api/hero-slides` → `{ slides: HeroSlide[] }`
- `POST /api/hero-slides` → `{ slide: HeroSlide }`
- `PUT /api/hero-slides/:id` → `{ slide: HeroSlide }`
- `DELETE /api/hero-slides/:id` → `204`

```
HeroSlide {
  id: string,
  title: string,
  subtitle?: string,
  caption?: string,
  ctaText?: string,
  linkUrl: string,
  altText?: string,
  order?: number,
  desktopImage: string, // base64 data URL
  mobileImage: string,  // base64 data URL
  createdAt: string | null,
  updatedAt: string | null
}
```

## Featured Showcase
- `GET /api/featured-showcase` → `{ items: FeaturedShowcase[] }`
- `POST /api/featured-showcase` → `{ item: FeaturedShowcase }`
- `PUT /api/featured-showcase/:id` → `{ item: FeaturedShowcase }`
- `DELETE /api/featured-showcase/:id` → `204`

```
FeaturedShowcase {
  id: string,
  variant: 'feature' | 'tile',
  title: string,
  subtitle?: string,
  category?: string,
  offer?: string,
  badgeText?: string,
  ctaText?: string,
  linkUrl: string,
  price?: string,
  altText?: string,
  order?: number,
  image: string, // base64 data URL
  createdAt: string | null,
  updatedAt: string | null
}

- Variant capacity: up to 3 `feature` entries and 4 `tile` entries are retained (newest wins when exceeding the limit).
```

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
- `POST /api/uploads/profile-image` → `{ profileImageUrl: string }`
- Errors deliver `{ error: { message: string, details?: Array<Record<string, unknown>> } }`

## Email configuration
Set the following environment variables to enable SMTP delivery from `bpd.claude@gmail.com` (or another sender):

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=bpd.claude@gmail.com
SMTP_PASSWORD=<application-specific-password>
SMTP_FROM="Brand Support <bpd.claude@gmail.com>"
EMAIL_VERIFICATION_EXPIRY_MINUTES=15
EMAIL_VERIFICATION_MAX_ATTEMPTS=5
PROFILE_UPLOAD_MAX_MB=5
```

> **Note:** `SMTP_PASSWORD` must be an application-specific password when using Gmail. Codes expire after 15 minutes by default.
