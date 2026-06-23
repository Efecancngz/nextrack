# Design Patterns Deep Dive — Generic SaaS Starter

Bu doküman bu kod tabanında **gerçekten kullanılan** pattern'leri, nerede ve nasıl kullanıldıklarını gerçek koddan örneklerle açıklar. Inşa edilmemiş, "hedef" bir mimariyi belgelemez — bkz. [architecture.md](architecture.md) bu projenin neden bir Repository/Service katmanı OLMADAN, API Route'ların Prisma'yı doğrudan çağırdığı basit bir yapı kullandığını anlatır.

---

## 1. HOF Middleware Composition

**Neden?** Her API Route'un hata yakalama ve rate limiting gibi ortak ihtiyaçları var. Bunları her handler'a elle yazmak yerine, Higher-Order Function'larla sarıyoruz.

```typescript
// src/lib/utils/middleware.ts
export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (AppError.isAppError(err)) {
        return errorResponse(err.message, err.statusCode);
      }
      console.error("[Route Error]", err);
      return errorResponse("An unexpected error occurred", 500);
    }
  };
}

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function withRateLimit(
  handler: RouteHandler,
  maxRequests = 60,
  windowMs = 60_000
): RouteHandler {
  return async (req, ctx) => {
    const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "anonymous";
    const now = Date.now();
    const record = rateLimitStore.get(ip);

    if (!record || now > record.resetAt) {
      rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs });
    } else if (record.count >= maxRequests) {
      throw AppError.rateLimited();
    } else {
      record.count++;
    }

    return handler(req, ctx);
  };
}

/** Sağdan sola compose eder: compose(A, B)(h) === A(B(h)) */
export function compose(
  ...middlewares: ((h: RouteHandler) => RouteHandler)[]
): (handler: RouteHandler) => RouteHandler {
  return (handler) => middlewares.reduceRight((acc, mw) => mw(acc), handler);
}
```

Her route handler'ın sonunda görülen kullanım şekli:

```typescript
// src/app/api/items/route.ts
export const GET = compose(withErrorHandler, withRateLimit)(getHandler);
```

`withErrorHandler` en dışta olmalı — `withRateLimit`'in `throw AppError.rateLimited()` ile attığı hatayı bile yakalayıp formatlasın diye.

---

## 2. Custom Error Class + Factory Methods

**Neden?** Tutarlı, route handler'lar arasında okunabilir hata fırlatma.

```typescript
// src/lib/utils/app-error.ts
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }

  static notFound(resource = "Resource") {
    return new AppError(`${resource} not found`, 404, "NOT_FOUND");
  }
  static unauthorized(message = "Unauthorized — please log in") {
    return new AppError(message, 401, "UNAUTHORIZED");
  }
  static conflict(message = "Resource already exists") {
    return new AppError(message, 409, "CONFLICT");
  }
  // ... forbidden, badRequest, validationError, rateLimited, externalApiError

  static isAppError(err: unknown): err is AppError {
    return err instanceof AppError && err.isOperational;
  }
}
```

Kullanım: `throw AppError.notFound("Item")`. `withErrorHandler` bunu yakalar ve `err.statusCode`/`err.message`'ı doğrudan response'a yazar — handler'ın kendisi hiçbir zaman response formatlamasıyla uğraşmaz.

---

## 3. Generic API Response Wrapper

**Neden?** Her endpoint aynı `{ success, data, error }` zarfını döndürmeli.

```typescript
// src/lib/utils/api-response.ts
export function successResponse<T>(data: T, status = 200): Response {
  return Response.json({ success: true, data }, { status });
}

export function errorResponse(message: string, status = 500, details?: unknown): Response {
  return Response.json({ success: false, error: message, ...(details ? { details } : {}) }, { status });
}

export const Responses = {
  notFound: (resource = "Resource") => errorResponse(`${resource} not found`, 404),
  unauthorized: () => errorResponse("Unauthorized — please log in", 401),
  badRequest: (message = "Invalid request body") => errorResponse(message, 400),
  validationError: (errors: unknown) => errorResponse("Validation failed", 422, errors),
  // ... forbidden, internalError
} as const;
```

`ApiResponse<T>` tipi (`src/types/common.ts`) tam olarak `{ success: boolean; data?: T; error?: string; message?: string }` — iç içe `error.code`/`error.message` objesi YOK, ayrı bir `meta` alanı YOK. Sayfalama gerektiren endpoint yok şu an (`/api/items` tüm sonuçları tek seferde döndürür), bu yüzden `PaginatedResponse<T>` tanımlı ama henüz kullanılmıyor.

---

## 4. Singleton Pattern — İkili Adaptörlü Prisma Client

**Neden?** Next.js hot-reload'da birden fazla `PrismaClient` instance'ı oluşmasını engellemek standart bir ihtiyaç. Bu projede ayrıca: production'da Neon'un WebSocket tabanlı serverless driver'ı, yerel Docker Postgres'te ise düz `node-postgres` adaptörü gerekiyor — Neon adaptörü vanilla bir Postgres sunucusuyla konuşamıyor.

```typescript
// src/lib/db/prisma.ts
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

const connectionString = process.env.DATABASE_URL || "postgresql://mock:mock@localhost:5432/mock";
const isLocalDatabase = /localhost|127\.0\.0\.1/.test(connectionString);

const adapter = isLocalDatabase
  ? new PrismaPg({ connectionString })
  : new PrismaNeon({ connectionString });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter, log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"] });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

---

## 5. Guard-Clause Auth Pattern

**Neden?** Ayrı bir `withAuth` middleware'i yerine, auth gerektiren her handler'ın en başında `requireAuth()` çağrılır — bu fonksiyon ya geçerli bir user döner ya da `AppError.unauthorized()` fırlatır (ki bunu zaten `withErrorHandler` yakalıyor).

```typescript
// src/lib/auth/helpers.ts
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw AppError.unauthorized();
  }
  return user;
}
```

```typescript
// Kullanım — src/app/api/user-items/route.ts
async function postHandler(req: NextRequest) {
  const user = await requireAuth();   // burada durur, hata fırlatırsa withErrorHandler yakalar
  // ... geri kalan iş mantığı
}
```

### 5.1. Sahiplik Kontrolü (Ownership Check) — 404, 403 değil

`UserItem`/`Rating` gibi kullanıcıya özel kayıtlara erişimde, kayıt başka bir kullanıcıya aitse **403 Forbidden değil, 404 Not Found** döndürülür — bilinçli bir tercih: bir saldırgan, var olan ama kendisine ait olmayan bir kaynağın ID'sini, response kodundan ayırt edemesin.

```typescript
// src/app/api/user-items/[id]/route.ts
async function getOwnedUserItem(id: string, userId: string) {
  const userItem = await prisma.userItem.findUnique({ where: { id } });
  if (!userItem || userItem.userId !== userId) {
    throw AppError.notFound("Tracking entry");
  }
  return userItem;
}
```

---

## 6. Zod Validation — Çoklu Şema Denemesi

**Neden?** Bazı endpoint'ler (örn. `PATCH /api/user-items/[id]`) tek bir body ile üç farklı işlemi destekler (durum değiştir, favori değiştir, ilerleme güncelle). Tek bir şema yerine, üç şema sırayla `safeParse` ile denenir; ilk eşleşen kazanır.

```typescript
// src/app/api/user-items/[id]/route.ts
const statusParsed = updateTrackingStatusSchema.safeParse(body);
if (statusParsed.success) { /* ... */ return successResponse(updated); }

const favoriteParsed = updateTrackingFavoriteSchema.safeParse(body);
if (favoriteParsed.success) { /* ... */ return successResponse(updated); }

const progressParsed = updateTrackingProgressSchema.safeParse(body);
if (progressParsed.success) { /* ... */ return successResponse(updated); }

return Responses.validationError(statusParsed.error.flatten().fieldErrors);
```

Şemaların tanımlı olduğu yer: `src/lib/validations/item.ts`.

---

## 7. Server vs Client Component Sınırı

```
Sayfa yapısı (örnek: /items/[id]):

┌─ page.tsx (SERVER) ──────────────────────────┐
│  - Prisma'dan doğrudan veri çeker (await)    │
│  - SEO meta (generateMetadata)               │
│                                               │
│  ┌─ <AddToTrackingButton> (CLIENT) ────────┐ │
│  │  - Dropdown state, fetch() ile POST/PATCH│ │
│  └──────────────────────────────────────────┘ │
│  ┌─ <RatingWidget> (CLIENT) ────────────────┐ │
│  │  - Puan seçimi state, fetch() ile PUT    │ │
│  └──────────────────────────────────────────┘ │
└───────────────────────────────────────────────┘

Kural:
- Veri çekme → SERVER component (her zaman Prisma'ya doğrudan await)
- Kullanıcı etkileşimi (state, event, fetch çağrısı) → CLIENT component
- Server component, client component'e prop olarak başlangıç verisini (initialEntry, initialEntries) geçer
```

---

## 8. Pattern Özet Tablosu

| Pattern | Nerede | Neden |
|---|---|---|
| **HOF Middleware Composition** | `lib/utils/middleware.ts` | Her route'ta tekrar etmeden hata yakalama + rate limit |
| **Custom Error + Factory** | `lib/utils/app-error.ts` | Tutarlı, okunabilir hata fırlatma |
| **Generic Response Wrapper** | `lib/utils/api-response.ts` | Her endpoint aynı `{success,data,error}` zarfı |
| **Singleton (ikili adaptör)** | `lib/db/prisma.ts` | Hot-reload'da tek instance, Neon/local Postgres ayrımı |
| **Guard-Clause Auth** | `lib/auth/helpers.ts` | Ayrı middleware yerine handler içinde erken dönüş |
| **Sahiplik Kontrolü (404)** | `api/user-items/[id]/route.ts` | Kaynak varlığını sızdırmamak |
| **Çoklu Zod Şema Denemesi** | `api/user-items/[id]/route.ts` | Tek body, birden fazla olası işlem |
| **Server/Client Sınırı** | Tüm sayfalar | Veri çekme sunucuda, etkileşim istemcide |
