import { createClient } from '@/lib/supabase/server'
import { MainLayout } from '@/components/layout/MainLayout'
import { BadgeCheck, Flame, Award, BookOpen, ShieldCheck, Palette, LifeBuoy, Search, ShieldAlert } from 'lucide-react'

export const metadata = {
  title: 'Havn Rehberi — Sıkça Sorulan Sorular ve Bilgiler',
  description: 'HAVN verification rozetleri, seviye/XP sistemi ve alev gücü hakkında merak ettiğiniz her şey.',
}

export const dynamic = 'force-dynamic'

export default async function HelpPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile = data
  }

  return (
    <MainLayout currentUser={profile}>
      <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-12">
        {/* Page Title Header */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md border border-primary/20"
            style={{
              background: 'linear-gradient(135deg, var(--havn-gradient-start), var(--havn-gradient-end))',
              color: 'var(--primary-foreground)',
            }}
          >
            <BookOpen size={20} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground">Havn Rehberi</h1>
            <p className="text-xs text-muted-foreground">
              Doğrulama sistemleri, seviyeler, XP puanları ve alevler hakkında bilmeniz gereken her şey
            </p>
          </div>
        </div>

        {/* Verification System Section */}
        <section className="bg-card border border-border/80 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md">
          <div className="absolute -right-20 -top-20 w-48 h-48 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
          
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <BadgeCheck size={16} className="text-primary" />
            Doğrulama (Verification) Rozetleri
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Classic Verified */}
            <div className="p-5 rounded-2xl bg-card border border-border/60 hover:border-[#0ea5e9]/40 transition-all flex flex-col gap-3 group">
              <div className="flex items-center gap-2">
                <BadgeCheck size={20} className="fill-[#0ea5e9] text-background drop-shadow-[0_0_4px_rgba(14,165,233,0.4)]" />
                <h3 className="font-bold text-sm text-foreground">Mavi Tik (Doğrulanmış Üye)</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                HAVN topluluğunun aktif, onaylanmış ve kurallara uygun üyelerini tanımlamak için verilir.
              </p>
              <div className="border-t border-border/40 pt-2 mt-auto">
                <h4 className="text-[10px] font-bold text-foreground/80 uppercase mb-1">Nasıl Alınır?</h4>
                <ul className="list-disc list-inside text-[10px] text-muted-foreground space-y-1">
                  <li>Profil fotoğrafı, kapak resmi ve biyografi girilmiş olmalıdır.</li>
                  <li>Doğrulanmış bir e-posta adresine sahip olunmalıdır.</li>
                  <li>Hesap en az <strong>Seviye 5 (1600+ XP)</strong> seviyesine ulaşmalıdır.</li>
                  <li>Platform kurallarına uygun, temiz bir geçmişe sahip olunmalıdır.</li>
                </ul>
              </div>
            </div>

            {/* Gold Verified */}
            <div className="p-5 rounded-2xl bg-card border border-border/60 hover:border-[#eab308]/40 transition-all flex flex-col gap-3 group">
              <div className="flex items-center gap-2">
                <BadgeCheck size={20} className="fill-[#eab308] text-background drop-shadow-[0_0_4px_rgba(234,179,8,0.4)]" />
                <h3 className="font-bold text-sm text-foreground">Sarı Tik (Sistem Ortağı & Ekip)</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                HAVN ekibine, kuruculara, baş geliştiricilere ve resmi iş ortaklarına özel olarak tanımlanır.
              </p>
              <div className="border-t border-border/40 pt-2 mt-auto">
                <h4 className="text-[10px] font-bold text-foreground/80 uppercase mb-1">Nasıl Alınır?</h4>
                <ul className="list-disc list-inside text-[10px] text-muted-foreground space-y-1">
                  <li>HAVN kurucusu tarafından doğrudan atanır.</li>
                  <li>Resmi iş ortaklığı veya marka tescili sağlanmalıdır.</li>
                  <li>Toplulukta resmi bir moderatör veya yönetici rolü üstlenilmelidir.</li>
                  <li>Proje katkı payı ve kurucu doğrulaması tamamlanmalıdır.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Gamification System Section */}
        <section className="bg-card border border-border/80 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md">
          <div className="absolute -left-20 -bottom-20 w-48 h-48 rounded-full bg-purple-500/5 blur-3xl pointer-events-none" />
          
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Award size={16} className="text-purple-500" />
            Seviye (XP) ve Rütbeler
          </h2>
          
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            Platformda paylaştığınız gönderiler, aldığınız beğeniler, katıldığınız topluluk etkinlikleri ve günlük etkileşimleriniz size **Deneyim Puanı (XP)** kazandırır. XP biriktikçe seviyeniz artar ve yeni rütbelerin kilidini açarsınız.
          </p>

          <div className="overflow-hidden border border-border/60 rounded-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border/60 text-muted-foreground font-black text-[10px] uppercase tracking-wider">
                  <th className="p-3">Rütbe</th>
                  <th className="p-3">Seviye Aralığı</th>
                  <th className="p-3">Gerekli XP</th>
                  <th className="p-3">Görünüm Stili</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-medium">
                <tr className="hover:bg-accent/20 transition-all">
                  <td className="p-3 flex items-center gap-1.5 font-bold">
                    <span>Çaylak</span>
                  </td>
                  <td className="p-3">1 - 5</td>
                  <td className="p-3">0 - 1,500 XP</td>
                  <td className="p-3">
                    <span className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider bg-sky-500/10 border border-sky-500/20 text-sky-400">
                      SEVİYE 1
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-accent/20 transition-all">
                  <td className="p-3 flex items-center gap-1.5 font-bold">
                    <span>Gezgin 🧭</span>
                  </td>
                  <td className="p-3">6 - 15</td>
                  <td className="p-3">2,500 - 22,400 XP</td>
                  <td className="p-3">
                    <span className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      SEVİYE 6
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-accent/20 transition-all">
                  <td className="p-3 flex items-center gap-1.5 font-bold">
                    <span>Bilgi Kaynağı 🔮</span>
                  </td>
                  <td className="p-3">16 - 30</td>
                  <td className="p-3">22,500 - 90,000 XP</td>
                  <td className="p-3">
                    <span className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider bg-purple-500/10 border border-purple-500/20 text-purple-400 shadow-sm" style={{ boxShadow: '0 0 6px rgba(147, 51, 234, 0.15)' }}>
                      SEVİYE 16
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-accent/20 transition-all">
                  <td className="p-3 flex items-center gap-1.5 font-bold">
                    <span className="text-amber-400 font-extrabold">Efsane 👑</span>
                  </td>
                  <td className="p-3">31+</td>
                  <td className="p-3">96,100+ XP</td>
                  <td className="p-3">
                    <span className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider bg-amber-500/15 border border-amber-500/30 text-amber-400 animate-pulse">
                      SEVİYE 31
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-3.5 p-3.5 rounded-xl bg-accent/30 border border-border/40 text-[10px] text-muted-foreground leading-relaxed">
            <strong>XP Hesaplama Formülü:</strong> Seviye hesaplamasında kullanılan matematiksel formül <code className="bg-card px-1.5 py-0.5 rounded text-foreground font-mono">Seviye = AltTaban(Karekök(XP / 100)) + 1</code> şeklindedir. Yani, Seviye 2 için 100 XP, Seviye 3 için 400 XP, Seviye 4 için 900 XP, Seviye 5 için 1600 XP gerekmektedir.
          </div>
        </section>

        {/* Streak / Flame System Section */}
        <section className="bg-card border border-border/80 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md">
          <div className="absolute -right-20 -bottom-20 w-48 h-48 rounded-full bg-orange-500/5 blur-3xl pointer-events-none" />
          
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Flame size={16} className="text-orange-500" />
            Alev Serisi (Streaks)
          </h2>
          
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            HAVN'da her gün aktif olmak, mesajlaşmak veya gönderilere yorum yapmak size bir alev serisi kazandırır. Gün seriniz uzadıkça isminizin yanında beliren alev simgesi evrimleşir, parlar ve renk değiştirir!
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 select-none">
            {/* 1 - 9 */}
            <div className="p-3.5 rounded-xl border border-border/60 bg-card/60 flex flex-col items-center text-center gap-1.5">
              <span className="text-lg">🔥</span>
              <span className="text-[10px] font-black text-orange-500">1 - 9 Gün</span>
              <span className="text-[9px] font-bold text-muted-foreground">Turuncu Klasik</span>
            </div>
            
            {/* 10 - 49 */}
            <div className="p-3.5 rounded-xl border border-border/60 bg-card/60 flex flex-col items-center text-center gap-1.5">
              <span className="text-lg drop-shadow-[0_0_4px_rgba(239,68,68,0.45)]">🔥</span>
              <span className="text-[10px] font-black text-red-500">10 - 49 Gün</span>
              <span className="text-[9px] font-bold text-muted-foreground">Kırmızı Gelişmiş</span>
            </div>

            {/* 50 - 99 */}
            <div className="p-3.5 rounded-xl border border-border/60 bg-card/60 flex flex-col items-center text-center gap-1.5">
              <span className="text-lg drop-shadow-[0_0_5px_rgba(236,72,153,0.5)]">🔥</span>
              <span className="text-[10px] font-black text-pink-500">50 - 99 Gün</span>
              <span className="text-[9px] font-bold text-muted-foreground">Pembe Nadir</span>
            </div>

            {/* 100 - 149 */}
            <div className="p-3.5 rounded-xl border border-border/60 bg-card/60 flex flex-col items-center text-center gap-1.5">
              <span className="text-lg animate-pulse drop-shadow-[0_0_6px_rgba(234,179,8,0.55)]">🔥</span>
              <span className="text-[10px] font-black text-yellow-500">100 - 149 Gün</span>
              <span className="text-[9px] font-bold text-muted-foreground">Sarı Efsanevi</span>
            </div>

            {/* 150+ */}
            <div className="p-3.5 rounded-xl border border-border/60 bg-card/60 flex flex-col items-center text-center gap-1.5">
              <span className="text-lg animate-pulse drop-shadow-[0_0_8px_rgba(168,85,247,0.7)]">🔥</span>
              <span 
                className="text-[10px] font-black"
                style={{
                  background: 'linear-gradient(45deg, #ec4899, #8b5cf6, #3b82f6, #eab308)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                150+ Gün
              </span>
              <span className="text-[9px] font-bold text-muted-foreground">Gökkuşağı Kozmik</span>
            </div>
          </div>

          <div className="mt-3.5 p-3.5 rounded-xl bg-accent/30 border border-border/40 text-[10px] text-muted-foreground leading-relaxed">
            💡 <strong>Seriyi Kaybetmeyin:</strong> Alev serinizin sıfırlanmaması için her 24 saat içinde en az bir kez platforma giriş yapıp etkileşimde bulunmanız gerekir. Bir gün bile kaçırırsanız seriniz sıfırdan başlar!
          </div>
        </section>

        {/* Security & Personalization Section */}
        <section className="bg-card border border-border/80 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md">
          <div className="absolute -left-20 -bottom-20 w-48 h-48 rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />
          
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <ShieldCheck size={16} className="text-blue-500" />
            Güvenlik & Kişiselleştirme
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Single Session Check */}
            <div className="p-5 rounded-2xl bg-card border border-border/60 hover:border-blue-500/40 transition-all flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <ShieldAlert size={18} className="text-blue-500" />
                <h3 className="font-bold text-sm text-foreground">Oturum Güvenliği (Tekil Oturum)</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Hesap güvenliğinizi en üst düzeyde tutmak amacıyla HAVN'da aynı anda sadece tek bir cihazda veya tarayıcıda aktif oturum açabilirsiniz.
              </p>
              <p className="text-[10px] text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/40 mt-auto">
                🔒 Başka bir cihazdan giriş yapıldığında, önceki oturumunuz güvenlik nedeniyle otomatik olarak sonlandırılır.
              </p>
            </div>

            {/* Theme & Customization */}
            <div className="p-5 rounded-2xl bg-card border border-border/60 hover:border-purple-500/40 transition-all flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Palette size={18} className="text-purple-500" />
                <h3 className="font-bold text-sm text-foreground">Renk Teması ve Görünüm</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Görünüm ve renk teması (Mor, İndigo, Pembe, Kehribar, Turkuaz) tercihleriniz Supabase veritabanında bulut tabanlı olarak profilinize kaydedilir.
              </p>
              <p className="text-[10px] text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/40 mt-auto">
                ☁️ Yeni bir bilgisayar veya telefondan giriş yapsanız dahi kişisel tema ayarlarınız otomatik olarak yüklenir ve senkronize edilir.
              </p>
            </div>
          </div>
        </section>

        {/* Destek & Yönetici Modülü Section */}
        <section className="bg-card border border-border/80 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md">
          <div className="absolute -right-20 -top-20 w-48 h-48 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
          
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <LifeBuoy size={16} className="text-emerald-500" />
            Destek Sistemi & Yönetici Kontrolleri
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Support Tickets */}
            <div className="p-5 rounded-2xl bg-card border border-border/60 hover:border-emerald-500/40 transition-all flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <LifeBuoy size={18} className="text-emerald-500" />
                <h3 className="font-bold text-sm text-foreground">Destek ve Talep Modülü</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Platform ile ilgili yaşadığınız teknik sorunları veya şikayetleri Ayarlar altındaki Destek sekmesinden kuruculara bildirebilirsiniz.
              </p>
              <p className="text-[10px] text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/40 mt-auto">
                📨 Destek taleplerinizin güncel durumunu (Açık, Yanıtlandı, Kapatıldı) anlık olarak profilinizden veya destek sayfasından takip edebilirsiniz.
              </p>
            </div>

            {/* Admin Controls */}
            <div className="p-5 rounded-2xl bg-card border border-border/60 hover:border-amber-500/40 transition-all flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Search size={18} className="text-amber-500" />
                <h3 className="font-bold text-sm text-foreground">Yönetici & Kurucu Paneli</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Sistem Kurucuları (Founder), topluluk düzenini sağlamak için kullanıcı profillerine doğrudan müdahale yetkisine sahiptir.
              </p>
              <p className="text-[10px] text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/40 mt-auto">
                🛡️ Kurucular; rozet atama, isim/bio güncelleme ve kural ihlali durumlarında profil resmi/kapak sıfırlama gibi işlemleri anlık bildirimle gerçekleştirebilir.
              </p>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  )
}
