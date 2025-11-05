# 🔄 Prisma → Supabase Client Migration Rehberi

## 📋 Durum
- ✅ Supabase server client helper oluşturuldu (`lib/supabase-server.ts`)
- ✅ Auth login route güncellendi
- ✅ Auth register route güncellendi
- ⏳ Diğer tüm API route'ları güncellenmeli

## 🔄 Yapılacaklar

### 1. Auth Routes
- [x] `/api/auth/login` - Supabase client kullanıyor
- [x] `/api/auth/register` - Supabase client kullanıyor
- [ ] `/api/auth/profile` - Güncellenmeli
- [ ] `/api/auth/change-password` - Güncellenmeli
- [ ] `/api/auth/enable-2fa` - Güncellenmeli
- [ ] `/api/auth/disable-2fa` - Güncellenmeli
- [ ] `/api/auth/verify-2fa` - Güncellenmeli

### 2. Contacts Routes
- [ ] `/api/contacts` - Güncellenmeli
- [ ] `/api/contacts/[id]` - Güncellenmeli
- [ ] `/api/contacts/search` - Güncellenmeli
- [ ] `/api/contacts/stats` - Güncellenmeli
- [ ] `/api/contacts/import` - Güncellenmeli
- [ ] `/api/contacts/[id]/toggle-block` - Güncellenmeli

### 3. Contact Groups Routes
- [ ] `/api/contact-groups` - Güncellenmeli
- [ ] `/api/contact-groups/[id]` - Güncellenmeli
- [ ] `/api/contact-groups/[id]/contacts` - Güncellenmeli

### 4. SMS Routes
- [ ] `/api/sms/send` - Güncellenmeli
- [ ] `/api/bulk-sms/send-bulk` - Güncellenmeli
- [ ] `/api/bulk-sms/history` - Güncellenmeli
- [ ] `/api/bulk-sms/status/[messageId]` - Güncellenmeli

### 5. SMS Templates Routes
- [ ] `/api/sms-templates` - Güncellenmeli
- [ ] `/api/sms-templates/[id]` - Güncellenmeli

### 6. Payment Routes
- [ ] `/api/payment/packages` - Güncellenmeli
- [ ] `/api/payment/crypto-create` - Güncellenmeli
- [ ] `/api/payment/crypto-status/[paymentId]` - Güncellenmeli
- [ ] `/api/payment/crypto-currencies` - Güncellenmeli
- [ ] `/api/payment/crypto-price/[currency]` - Güncellenmeli

### 7. Payment Requests Routes
- [ ] `/api/payment-requests` - Güncellenmeli

### 8. Admin Routes
- [ ] `/api/admin/users` - Güncellenmeli
- [ ] `/api/admin/users/[userId]/credit` - Güncellenmeli
- [ ] `/api/admin/stats` - Güncellenmeli
- [ ] `/api/admin/payment-requests` - Güncellenmeli
- [ ] `/api/admin/payment-requests/[id]/approve` - Güncellenmeli
- [ ] `/api/admin/payment-requests/[id]/reject` - Güncellenmeli
- [ ] `/api/admin/payment-history` - Güncellenmeli
- [ ] `/api/admin/sms-history` - Güncellenmeli
- [ ] `/api/admin/refunds-report` - Güncellenmeli

### 9. Refunds Routes
- [ ] `/api/refunds` - Güncellenmeli
- [ ] `/api/refunds/stats` - Güncellenmeli

## 📝 Prisma → Supabase Mapping

### Field Name Conversion
- Prisma: `camelCase` (örn: `passwordHash`, `twoFactorEnabled`)
- Supabase: `snake_case` (örn: `password_hash`, `two_factor_enabled`)

### Common Patterns

#### Prisma Query → Supabase Query

**Find First:**
```typescript
// Prisma
const user = await prisma.user.findFirst({
  where: { username: 'test' }
});

// Supabase
const { data: users } = await supabaseServer
  .from('users')
  .select('*')
  .eq('username', 'test')
  .limit(1);
const user = users?.[0];
```

**Find Many:**
```typescript
// Prisma
const users = await prisma.user.findMany({
  where: { role: 'admin' },
  orderBy: { createdAt: 'desc' },
  take: 10,
  skip: 0
});

// Supabase
const { data: users } = await supabaseServer
  .from('users')
  .select('*')
  .eq('role', 'admin')
  .order('created_at', { ascending: false })
  .range(0, 9);
```

**Create:**
```typescript
// Prisma
const user = await prisma.user.create({
  data: { username: 'test', email: 'test@test.com' }
});

// Supabase
const { data: user } = await supabaseServer
  .from('users')
  .insert({ username: 'test', email: 'test@test.com' })
  .select()
  .single();
```

**Update:**
```typescript
// Prisma
const user = await prisma.user.update({
  where: { id: userId },
  data: { credit: 100 }
});

// Supabase
const { data: user } = await supabaseServer
  .from('users')
  .update({ credit: 100 })
  .eq('id', userId)
  .select()
  .single();
```

**Delete:**
```typescript
// Prisma
await prisma.user.delete({
  where: { id: userId }
});

// Supabase
await supabaseServer
  .from('users')
  .delete()
  .eq('id', userId);
```

**Count:**
```typescript
// Prisma
const count = await prisma.user.count({
  where: { role: 'admin' }
});

// Supabase
const { count } = await supabaseServer
  .from('users')
  .select('*', { count: 'exact', head: true })
  .eq('role', 'admin');
```

**OR Query:**
```typescript
// Prisma
const user = await prisma.user.findFirst({
  where: {
    OR: [{ username: login }, { email: login }]
  }
});

// Supabase
const { data: users } = await supabaseServer
  .from('users')
  .select('*')
  .or(`username.eq.${login},email.eq.${login}`)
  .limit(1);
```

**Include Relations:**
```typescript
// Prisma
const contact = await prisma.contact.findUnique({
  where: { id: contactId },
  include: { group: true }
});

// Supabase
const { data: contact } = await supabaseServer
  .from('contacts')
  .select('*, contact_groups(*)')
  .eq('id', contactId)
  .single();
```

## ⚠️ Önemli Notlar

1. **Field Names**: Prisma camelCase → Supabase snake_case
2. **Error Handling**: Supabase hataları `error` objesi içinde gelir
3. **Single vs Array**: Supabase `.single()` kullanarak tek obje döndürebilirsiniz
4. **Relations**: Supabase'de `select` ile nested relations çekebilirsiniz
5. **Transactions**: Supabase'de transaction yok, manuel kontrol gerekir

## 🔍 Test Etme

Her route güncellendikten sonra:
1. Build test edin: `npm run build`
2. API route'ları manuel test edin
3. Frontend'de test edin

