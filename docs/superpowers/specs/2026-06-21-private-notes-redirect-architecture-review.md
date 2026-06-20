# Phase 2.6 Private Notes & Custom Links — Mimari İnceleme Raporu

Bu rapor, **Phase 2.6 (Personal Private Notes & Custom Redirect Links)** aşaması kapsamında önerilen mimariyi değerlendirmek ve veri tutarlılığı ile kullanıcı deneyimi optimizasyonlarını sunmak amacıyla hazırlanmıştır.

---

## 1. Genel Mimari Değerlendirmesi

Önerilen veri modeli ve UI entegrasyonu, kişiselleştirilmiş bir izleme/okuma takip aracı için son derece mantıklı ve işlevseldir.

* **UserNote Modeli:** `userId` ve `seriesId` üzerinde unique kurgulanması, veri mükerrerliğini önler ve detay sayfasında hızlı yükleme/kaydetme işlemlerini kolaylaştırır.
* **SearchKeyword Modeli:** Kullanıcıya özel global arama anahtar kelimelerinin (/settings sayfasında) tutulması, her dizi için tek tek adres girmek yerine tüm sistemde ortak "kısayollar" (shortcut) kullanılmasını sağlar.
* **Google Redirector:** Link oluşturmanın client-side yapılması, sunucu tarafında gereksiz yönlendirme (redirect) rotaları yazılmasını engeller ve sayfa performansını artırır.

---

## 2. Mimari Detaylar ve Kritik Öneriler

### A. `isDefault` Varsayılan Değişimi (Veri Tutarlılığı)
Bir kullanıcı yeni bir kelimeyi varsayılan (`isDefault = true`) yaptığında veya yeni bir varsayılan eklediğinde, veritabanında aynı kullanıcıya ait diğer kelimelerin `isDefault` alanı `false` çekilmelidir. Bu işlemin API tarafında bir **Prisma Transaction** içinde yapılması zorunludur:

```ts
await prisma.$transaction([
  // 1. Kullanıcının tüm diğer varsayılanlarını sıfırla
  prisma.searchKeyword.updateMany({
    where: { userId, isDefault: true },
    data: { isDefault: false },
  }),
  // 2. Hedef kelimeyi varsayılan yap
  prisma.searchKeyword.update({
    where: { id: targetId },
    data: { isDefault: true },
  })
]);
```

### B. Dil/Anahtar Kelime Boş İken Fallback (Yedek Plan)
Kullanıcının henüz hiçbir özel `SearchKeyword` tanımlamadığı veya varsayılan kelime seçmediği durumlar için yedek plan olmalıdır:
* **Fallback Davranışı:** Eğer varsayılan kelime yoksa, yönlendirme butonu/ikonu doğrudan `{title} + {progress}` sorgusuyla Google araması açmalıdır (örn. `https://www.google.com/search?q=One+Piece+Episode+1000`). Bu sayede özellik her durumda çalışmaya devam eder.

### C. Anime/Manga Türlerine Göre Dinamik `{progress}` Parametresi
Google aramasının kullanıcıyı nokta atışı doğru bölüme yönlendirebilmesi için `{progress}` parametresi içeriğin türüne göre dinamik biçimlendirilmelidir:
* **Anime / TV:** `Episode X` (örn. `https://www.google.com/search?q=One+Piece+Episode+1000+tranimeizle`)
* **Manga / Manhwa:** `Chapter Y` (örn. `https://www.google.com/search?q=Jujutsu+Kaisen+Chapter+250+sadscans`)
* **Progress Yoksa:** Sadece dizi/manga başlığı ve anahtar kelime aranır.
