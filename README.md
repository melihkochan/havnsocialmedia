# HAVN — Modern Topluluk ve Sosyal Medya Platformu

HAVN, topluluk odaklı, yüksek etkileşimli ve modern bir sosyal ağ deneyimi sunan bir web uygulamasıdır. Next.js ve Supabase altyapısıyla geliştirilmiş olup, kullanıcıların ilgi alanlarına göre topluluklar oluşturmasına, gönderiler paylaşmasına ve gerçek zamanlı sohbet etmesine olanak tanır.

---

## 🚀 Öne Çıkan Özellikler

- **Gelişmiş Gönderi Akışı:** "Sizin İçin", "Takip Edilenler", "Yeni" ve "Popüler" filtreleriyle kişiselleştirilmiş ana akış.
- **Topluluk Yönetimi (Komüniteler):**
  - Herkese açık veya katılım başvurulu (onay mekanizmalı) topluluklar.
  - Özelleştirilebilir topluluk kuralları ve kuruculara özel "Sabitlenmiş Duyuru" paneli.
  - Rol tabanlı yetkilendirme (Kurucu, Moderatör, Üye).
- **Yüksek Etkileşim:**
  - Canlı emoji tepkileri (❤️, 🔥, 😂, 😮, 😢) ve hareketli animasyon patlamaları.
  - Beğenenlerin listelendiği cam efektli modal ekranı.
  - Resimler için yüksek çözünürlüklü Lightbox (Görsel Detay) aracı.
- **Gerçek Zamanlı Sohbet (Real-time Chat):**
  - Topluluk içi genel ve duyuru kanalları.
  - Kullanıcılar arası doğrudan mesajlaşma (DM) ve mini hızlı sohbet arayüzü (QuickChat).
  - Yazıyor... (Typing...) göstergesi ve çevrimiçi durum takipleri.
- **Destek Sistemi (Support Center):** Kullanıcıların kurucularla doğrudan iletişim kurabileceği biletli (ticket) destek arayüzü.
- **Tema ve Özelleştirme:**
  - Karanlık (Dark) ve Aydınlık (Light) mod seçeneği.
  - 5 farklı premium vurgu rengi teması (Havn Purple, Indigo, Rose, Orange, Teal).

---

## 🛠️ Kullanılan Teknolojiler

- **Framework:** Next.js (App Router, Server Actions, Dynamic Routes)
- **Veritabanı & Backend:** Supabase (Auth, PostgreSQL, Storage, Real-time Broadcast/Postgres Changes)
- **Stil Yönetimi:** TailwindCSS & PostCSS
- **Animasyonlar:** Framer Motion
- **İkon Seti:** Lucide React

---

## 📦 Kurulum ve Çalıştırma

### 1. Depoyu Klonlayın
```bash
git clone https://github.com/melihkochan/havnsocialmedia.git
cd havnsocialmedia
```

### 2. Bağımlılıkları Yükleyin
```bash
npm install
```

### 3. Çevre Değişkenlerini Ayarlayın
Proje kök dizininde bir `.env.local` dosyası oluşturun ve aşağıdaki Supabase ile API değişkenlerini girin:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<PROJE-KODU>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON-KEY-DEGERI>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE-ROLE-KEY-DEGERI>
RESEND_API_KEY=<POSTA-GONDERIM-ANAHTARI>
```

### 4. Geliştirme Sunucusunu Başlatın
```bash
npm run dev
```
Sunucu hazır olduğunda tarayıcınızdan `http://localhost:3000` adresine giderek platformu kullanmaya başlayabilirsiniz.

### 5. Projeyi Derleyin (Production Build)
```bash
npm run build
```

---

## 🌐 Canlıya Alma (Vercel)
Bu proje Next.js yapısında olduğu için en kolay Vercel üzerinde barındırılır. GitHub deponuzu Vercel'e bağlayıp yukarıdaki çevre değişkenlerini (Environment Variables) tanımlayarak tek tıkla canlıya alabilirsiniz.
