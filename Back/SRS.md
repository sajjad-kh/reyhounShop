Complete Technical Specification Document
E-commerce Platform with Node.js + Express + SQLite (Migratable to MySQL) + Swagger + Full Logging + API Versioning
________________________________________
Document Date: November 4, 2025 Document Version: v1.0.0 Language: English Initial Database: SQLite (Development) → Migratable to MySQL Backend: Node.js + Express API Documentation: Swagger (OpenAPI 3.0) API Versioning: /api/v1/, /api/v2/ Logging: Activity Logs + API Logs + Error Logs in database Security: JWT + Role-Based Access + 2FA + Rate Limiting
________________________________________
1. Project Goals
Build a complete e-commerce platform with the following features:
•	Product, category, and inventory management
•	Order placement, online payment, order tracking
•	Smart discount system, loyalty points
•	Admin panel with dashboard, reporting, and logs
•	Advanced user experience (PWA, search, wishlist, reviews)
•	Full API documentation via Swagger
•	Logging of all actions in the database
•	Multi-language support, PWA, notifications
________________________________________
2. Technologies Used
Layer	Technology
Backend	Node.js, Express.js
Database	SQLite (Dev) → MySQL (Production)
ORM	Prisma (Compatible with both)
Authentication	JWT, bcrypt, OAuth2 (Google)
API Docs	Swagger UI + swagger-jsdoc
File Upload	multer + Cloudinary or local storage
Payment	Zarinpal, Pay.ir (Iran), Stripe (International)
Notifications	Nodemailer, Kavenegar SMS
Logging	winston + Prisma Log Tables
Caching	Redis (Optional)
PWA	Workbox (Frontend)
Versioning	express-version-route or URL-based
________________________________________
3. Database Schema (Prisma)
prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite" // Change to "mysql" later
  url      = env("DATABASE_URL")
}

model User {
  id            Int      @id @default(autoincrement())
  email         String   @unique
  phone         String?  @unique
  password      String
  name          String
  role          Role     @default(USER)
  isActive      Boolean  @default(true)
  is2FAEnabled  Boolean  @default(false)
  twoFASecret   String?
  birthDate     DateTime?
  loyaltyPoints Int      @default(0)
  addresses     Address[]
  orders        Order[]
  reviews       Review[]
  wishlist      Wishlist[]
  cart          Cart?
  logs          ActivityLog[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Address {
  id        Int    @id @default(autoincrement())
  userId    Int
  user      User   @relation(fields: [userId], references: [id])
  title     String // Home, Work
  address   String
  city      String
  province  String
  postalCode String
  lat       Float?
  lng       Float?
  isDefault Boolean @default(false)
}

model Category {
  id        Int       @id @default(autoincrement())
  name      String
  parentId  Int?
  parent    Category? @relation("Subcategories", fields: [parentId], references: [id])
  children  Category[] @relation("Subcategories")
  products  Product[]
}

model Product {
  id            Int         @id @default(autoincrement())
  name          String
  slug          String      @unique
  description   String?
  price         Int
  discountPrice Int?
  stock         Int
  reservedStock Int         @default(0)
  lowStockAlert Int         @default(5)
  categoryId    Int
  category      Category    @relation(fields: [categoryId], references: [id])
  images        ProductImage[]
  reviews       Review[]
  orderItems    OrderItem[]
  wishlist      Wishlist[]
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
}

model ProductImage {
  id        Int    @id @default(autoincrement())
  productId Int
  product   Product @relation(fields: [productId], references: [id])
  url       String
  isMain    Boolean @default(false)
}

model Cart {
  id        Int         @id @default(autoincrement())
  userId    Int         @unique
  user      User        @relation(fields: [userId], references: [id])
  items     CartItem[]
  updatedAt DateTime    @updatedAt
}

model CartItem {
  id        Int    @id @default(autoincrement())
  cartId    Int
  cart      Cart   @relation(fields: [cartId], references: [id])
  productId Int
  product   Product @relation(fields: [productId], references: [id])
  quantity  Int
}

model Order {
  id            Int           @id @default(autoincrement())
  userId        Int
  user          User          @relation(fields: [userId], references: [id])
  status        OrderStatus   @default(PENDING)
  totalPrice    Int
  discountAmount Int          @default(0)
  shippingCost  Int
  addressId     Int
  address       Address       @relation(fields: [addressId], references: [id])
  paymentStatus PaymentStatus @default(PENDING)
  paymentRef    String?
  trackingCode  String?
  items         OrderItem[]
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}

model OrderItem {
  id        Int    @id @default(autoincrement())
  orderId   Int
  order     Order  @relation(fields: [orderId], references: [id])
  productId Int
  product   Product @relation(fields: [productId], references: [id])
  quantity  Int
  price     Int
}

model Review {
  id        Int      @id @default(autoincrement())
  productId Int
  product   Product  @relation(fields: [productId], references: [id])
  userId    Int
  user      User     @relation(fields: [userId], references: [id])
  rating    Int      // 1-5
  comment   String?
  isApproved Boolean @default(false)
  createdAt DateTime @default(now())
}

model Wishlist {
  id        Int      @id @default(autoincrement())
  userId    Int
  user      User     @relation(fields: [userId], references: [id])
  productId Int
  product   Product  @relation(fields: [productId], references: [id])
}

model Discount {
  id            Int      @id @default(autoincrement())
  code          String   @unique
  type          DiscountType
  value         Int
  minPurchase   Int?
  maxUses       Int?
  usedCount     Int      @default(0)
  applicableTo  String?  // productId, categoryId, all
  expiresAt     DateTime?
  isActive      Boolean  @default(true)
}

model LoyaltyTransaction {
  id        Int      @id @default(autoincrement())
  userId    Int
  user      User     @relation(fields: [userId], references: [id])
  points    Int
  reason    String   // purchase, discount, return
  orderId   Int?
  createdAt DateTime @default(now())
}

model ActivityLog {
  id        Int      @id @default(autoincrement())
  userId    Int?
  user      User?    @relation(fields: [userId], references: [id])
  action    String   // "product.created", "order.cancelled"
  entity    String   // "Product", "Order"
  entityId  Int?
  details   Json?
  ip        String?
  userAgent String?
  createdAt DateTime @default(now())
}

model ApiLog {
  id        Int      @id @default(autoincrement())
  method    String
  endpoint  String
  userId    Int?
  status    Int
  ip        String
  userAgent String?
  timestamp DateTime @default(now())
}

model ErrorLog {
  id        Int      @id @default(autoincrement())
  message   String
  stack     String?
  endpoint  String?
  method    String?
  userId    Int?
  timestamp DateTime @default(now())
}

enum Role {
  USER
  ADMIN
}

enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
  DELAYED
}

enum PaymentStatus {
  PENDING
  SUCCESS
  FAILED
}

enum DiscountType {
  PERCENT
  FIXED
}
________________________________________
4. Project Structure
text
backend/
├── src/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── auth/
│   │   │   ├── products/
│   │   │   ├── orders/
│   │   │   └── admin/
│   │   └── v2/ (future)
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── role.js
│   │   ├── logger.js
│   │   └── rateLimiter.js
│   ├── services/
│   │   ├── payment/
│   │   ├── notification/
│   │   └── inventory/
│   ├── utils/
│   │   ├── mailer.js
│   │   └── sms.js
│   ├── swagger/
│   │   └── swagger.js
│   ├── prisma/
│   │   └── schema.prisma
│   └── server.js
├── .env
├── prisma/
│   └── dev.db (SQLite)
└── package.json
________________________________________
5. Key Commands
bash
# Install dependencies
npm install

# Run database migration
npx prisma migrate dev --name init

# Start server
npm run dev

# View Swagger
http://localhost:3000/api-docs
________________________________________
6. Migration from SQLite to MySQL
env
# .env
DATABASE_URL="mysql://user:password@localhost:3306/ecommerce"
bash
npx prisma migrate dev --name init
________________________________________
7. Security
•	JWT with expiresIn: 7d
•	Rate Limiting: 100 requests/min per IP
•	Helmet, CORS, Input Validation (Joi/Zod)
•	Password hashing with bcrypt
•	2FA using speakeasy
________________________________________
8. Sample .env File
env
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET=your_very_long_secret_key_here
ZARINPAL_MERCHANT_ID=xxxx-xxxx-xxxx-xxxx
NODEMAILER_USER=your-email@gmail.com
NODEMAILER_PASS=app-password
KAVENEGAR_API_KEY=your-api-key
PORT=3000
________________________________________
