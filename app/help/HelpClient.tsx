'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, BookOpen, BadgeCheck, Award, Flame, ShieldCheck, 
  Terminal, Lightbulb, HelpCircle, ArrowLeft, Compass, ChevronDown 
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLocale } from '@/lib/i18n/LocaleContext'

interface HelpClientProps {
  currentUser: any
}

interface FAQItem {
  id: string
  question: string
  answer: string | React.ReactNode
}

interface Category {
  id: string
  title: string
  icon: any
  items: FAQItem[]
}

export default function HelpClient({ currentUser }: HelpClientProps) {
  const { locale, t } = useLocale()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('genel')
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})

  const categoriesTr: Category[] = [
    {
      id: 'genel',
      title: 'Havn Hakkında',
      icon: HelpCircle,
      items: [
        {
          id: 'what-is-havn',
          question: 'Havn nedir ve amacı nedir?',
          answer: 'Havn; özgür, topluluk odaklı, reklamsız ve modern bir sosyal ağ platformudur. Kullanıcıların ilgi alanlarına göre topluluklar oluşturmalarını, diğer üyelerle güvenli ve seviyeli bir ortamda etkileşime girmelerini sağlar.'
        },
        {
          id: 'is-free',
          question: 'Havn\'a üye olmak ücretli mi?',
          answer: 'Hayır, Havn\'a üye olmak ve platformun tüm temel özelliklerinden yararlanmak tamamen ücretsizdir. Gelecekte eklenecek premium özellikler haricinde tüm sosyal akış ve topluluk erişimleri ücretsiz kalacaktır.'
        },
        {
          id: 'data-privacy',
          question: 'Verilerim ve gizliliğim güvende mi?',
          answer: 'Evet, Havn kullanıcı gizliliğini en ön planda tutar. E-posta adresiniz, şifreniz ve kişisel verileriniz Supabase altyapısında şifrelenmiş olarak saklanır. Verileriniz asla üçüncü şahıslarla paylaşılmaz veya reklam hedeflemesi amacıyla satılmaz.'
        },
        {
          id: 'create-community',
          question: 'Kendi topluluğumu nasıl oluşturabilirim?',
          answer: 'Sol menüdeki "Topluluklar" sekmesine giderek "Yeni Topluluk Oluştur" seçeneğini kullanabilirsiniz. Topluluğunuzu açık (herkese açık) veya başvurulu (onay gerektiren) yapabilir, kuralları ve açıklamayı dilediğiniz gibi belirleyebilirsiniz.'
        }
      ]
    },
    {
      id: 'xp-sistemi',
      title: 'Seviye & XP Sistemi',
      icon: Award,
      items: [
        {
          id: 'how-to-earn-xp',
          question: 'Nasıl Deneyim Puanı (XP) ve seviye kazanırım?',
          answer: 'Platformda aktif kalarak XP kazanabilirsiniz. Gönderi paylaşmak, diğer gönderilere yorum yapmak, gönderilerinizin beğeni alması veya sizin başka paylaşımları beğenmeniz profilinize XP kazandırır. XP puanınız arttıkça seviyeniz otomatik olarak yükselir.'
        },
        {
          id: 'xp-formula',
          question: 'Seviyeler nasıl hesaplanır ve hangi rütbeler vardır?',
          answer: (
            <div className="space-y-3 text-foreground/80 dark:text-slate-200">
              <p>Seviyeniz matematiksel olarak şu formülle hesaplanır:</p>
              <div className="p-3 bg-muted border border-border/60 rounded-xl text-center">
                <code className="text-primary font-mono font-bold text-xs">Seviye = AşağıYuvarla(Karekök(XP / 100)) + 1</code>
              </div>
              <p>Örnek seviye gereksinimleri:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li><strong>Seviye 2:</strong> 100 XP</li>
                <li><strong>Seviye 3:</strong> 400 XP</li>
                <li><strong>Seviye 4:</strong> 900 XP</li>
                <li><strong>Seviye 5:</strong> 1600 XP</li>
                <li><strong>Seviye 10:</strong> 8100 XP</li>
              </ul>
              <div className="mt-2 border-t border-border/40 pt-2">
                <p className="font-bold mb-1 text-foreground">Rütbe Kademeleri:</p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 bg-muted/60 border border-border/45 rounded-lg">
                    <span className="font-black text-sky-500 dark:text-sky-400">Çaylak</span> (Lvl 1 - 5)
                  </div>
                  <div className="p-2 bg-muted/60 border border-border/45 rounded-lg">
                    <span className="font-black text-emerald-500 dark:text-emerald-400">Gezgin 🧭</span> (Lvl 6 - 15)
                  </div>
                  <div className="p-2 bg-muted/60 border border-border/45 rounded-lg">
                    <span className="font-black text-purple-500 dark:text-purple-400">Bilgi Kaynağı 🔮</span> (Lvl 16 - 30)
                  </div>
                  <div className="p-2 bg-muted/60 border border-border/45 rounded-lg">
                    <span className="font-black text-amber-500 dark:text-amber-400">Efsane 👑</span> (Lvl 31+)
                  </div>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'hide-xp',
          question: 'Seviye ve XP puanlarımı gizleyebilir miyim?',
          answer: 'Evet. Ayarlar > Tercihler sekmesine giderek "XP ve Seviyeyi Göster" ayarını kapatabilirsiniz. Kapatıldığında seviye halkalarınız profilinizde gizlenecek ve yan sidebar Liderlik Tablosunda listelenmeyeceksiniz.'
        }
      ]
    },
    {
      id: 'alev-serisi',
      title: 'Alev Serisi (Streaks)',
      icon: Flame,
      items: [
        {
          id: 'what-is-streak',
          question: 'Alev serisi (Streak) nedir?',
          answer: 'Havn\'da her 24 saat içinde en az bir kez platforma giriş yapıp gönderi paylaşmak veya yorum yazmak gün serinizi uzatır. Seriniz uzadıkça isminizin yanında beliren alev simgesi parlar, renk değiştirir ve evrimleşir.'
        },
        {
          id: 'streak-levels',
          question: 'Hangi alev seviyeleri ve renkleri bulunur?',
          answer: (
            <div className="space-y-2 text-foreground/80 dark:text-slate-200">
              <p>Serinizin gün sayısına göre alev renkleri şu şekilde değişir:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-medium">
                <div className="flex items-center gap-2 p-2.5 bg-muted/60 border border-border/40 rounded-xl">
                  <span className="text-base">🔥</span>
                  <div>
                    <p className="font-black text-orange-500">1 - 9 Gün</p>
                    <p className="text-[10px] text-muted-foreground">Klasik Turuncu</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-muted/60 border border-border/40 rounded-xl">
                  <span className="text-base drop-shadow-[0_0_4px_rgba(239,68,68,0.45)]">🔥</span>
                  <div>
                    <p className="font-black text-red-500">10 - 49 Gün</p>
                    <p className="text-[10px] text-muted-foreground">Gelişmiş Kırmızı</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-muted/60 border border-border/40 rounded-xl">
                  <span className="text-base drop-shadow-[0_0_5px_rgba(236,72,153,0.5)]">🔥</span>
                  <div>
                    <p className="font-black text-pink-500">50 - 99 Gün</p>
                    <p className="text-[10px] text-muted-foreground">Nadir Pembe</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-muted/60 border border-border/40 rounded-xl">
                  <span className="text-base animate-pulse drop-shadow-[0_0_6px_rgba(234,179,8,0.55)]">🔥</span>
                  <div>
                    <p className="font-black text-yellow-500">100 - 149 Gün</p>
                    <p className="text-[10px] text-muted-foreground">Efsanevi Sarı</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-muted/60 border border-border/40 rounded-xl sm:col-span-2">
                  <span className="text-base animate-pulse drop-shadow-[0_0_8px_rgba(168,85,247,0.7)]">🔥</span>
                  <div>
                    <p className="font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-yellow-500">150+ Gün</p>
                    <p className="text-[10px] text-muted-foreground">Kozmik Gökkuşağı</p>
                  </div>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'streak-loss',
          question: 'Bir günü kaçırırsam alev serim sıfırlanır mı?',
          answer: 'Evet. Alev serinizin bozulmaması için ardışık olarak her gün platformda aktiflik (giriş, paylaşım veya yorum) göstermelisiniz. 24 saati aşan inaktiflik durumlarında seriniz sıfırlanacaktır.'
        }
      ]
    },
    {
      id: 'dogrulama',
      title: 'Hesap Doğrulama',
      icon: BadgeCheck,
      items: [
        {
          id: 'blue-tick',
          question: 'Mavi Tik (Doğrulanmış Üye) rozeti nasıl alınır?',
          answer: 'Mavi Tik rozeti, platform kurallarına sadık kalan, düzenli ve onaylanmış hesaplara verilir. Mavi tik almak herhangi bir seviyeye veya göreve bağlı değildir. Tamamen platform yöneticileri tarafından kullanıcı geçmişi incelenerek el ile atanır.'
        },
        {
          id: 'gold-tick',
          question: 'Sarı Tik (Sistem Ortağı & Ekip) rozeti nedir?',
          answer: 'Sarı Tik rozeti; Havn resmi yönetim ekibine, kuruculara, geliştiricilere ve tescilli iş ortaklarına verilen özel bir ortaklık rozetidir. Tamamen kurucu onayıyla el ile atanır, herhangi bir ödeme veya oyunlaştırma ile elde edilemez.'
        }
      ]
    },
    {
      id: 'kisayollar',
      title: 'Komut Paleti & Kısayollar',
      icon: Terminal,
      items: [
        {
          id: 'what-is-command-palette',
          question: 'Küresel Komut Paleti (Ctrl + K) nedir?',
          answer: 'Sitede gezinirken klavyenizle uçmanızı sağlayan arama ve yönetim konsoludur. Sayfa geçişleri yapabilir, tema değiştirebilir veya hızlıca kullanıcı arayabilirsiniz.'
        },
        {
          id: 'ai-semantic-search',
          question: 'Yapay Zeka Destekli (Anlamsal) Arama nasıl çalışır?',
          answer: (
            <div className="space-y-3 text-foreground/80 dark:text-slate-200">
              <p>
                Havn\'da klasik kelime eşleşmesi aramaları yerine modern bir <strong>Yapay Zeka Destekli (Semantic Search)</strong> teknolojisi kullanılır. Supabase pgvector entegrasyonu sayesinde arama kutusuna yazdığınız ifadelerin sadece kelime anlamları değil, arka plandaki konseptsel anlamları da çözümlenir.
              </p>
              <div className="p-3 bg-muted border border-border/60 rounded-xl">
                <p className="font-bold text-foreground mb-1 text-xs">✨ Nasıl Deneyimlersiniz?</p>
                <p className="text-[11px] leading-relaxed">
                  Örneğin, arama çubuğuna doğrudan "GTA 5" yazmak yerine <em>"arkadaşlarla takılmalık rol yapma mekanı"</em> veya <em>"araba sürdüğümüz oyun grubu"</em> yazdığınızda bile, yapay zeka arkadaki anlam ilişkisini kurarak ilgili FiveM veya oyun topluluklarını ve gönderileri benzerlik oranları (%85 gibi) ile birlikte önünüze getirir.
                </p>
              </div>
              <p className="text-xs">
                Bu özellik şu anda <strong>Ctrl + K</strong> komut paletine tam entegre çalışmaktadır ve tamamen lokal altyapıda barındırılan modelimiz sayesinde ücretsiz, hızlı ve gizlilik dostudur.
              </p>
            </div>
          )
        },
        {
          id: 'how-to-use-palette',
          question: 'Komut Paletini nasıl kullanırım ve hangi kısayollar vardır?',
          answer: (
            <div className="space-y-3 text-foreground/80 dark:text-slate-200">
              <p>Paleti açmak ve kullanmak için:</p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between p-2.5 bg-muted border border-border/50 rounded-xl">
                  <span className="font-bold text-foreground/85 text-xs">Açılış Kısayolu</span>
                  <div className="flex items-center gap-1 font-mono">
                    <kbd className="px-2 py-0.5 rounded border border-border/80 bg-background text-foreground font-bold text-xs shadow-sm">Ctrl</kbd>
                    <span className="text-muted-foreground font-bold">+</span>
                    <kbd className="px-2 py-0.5 rounded border border-border/80 bg-background text-foreground font-bold text-xs shadow-sm">K</kbd>
                    <span className="text-[10px] text-muted-foreground mx-1">veya</span>
                    <kbd className="px-2 py-0.5 rounded border border-border/80 bg-background text-foreground font-bold text-xs shadow-sm">⌘</kbd>
                    <span className="text-muted-foreground font-bold">+</span>
                    <kbd className="px-2 py-0.5 rounded border border-border/80 bg-background text-foreground font-bold text-xs shadow-sm">K</kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-muted border border-border/50 rounded-xl text-xs">
                  <span className="font-bold text-foreground/85">Yön Tuşları (↑↓)</span>
                  <span className="text-foreground/80">Menüde aşağı/yukarı gezinme</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-muted border border-border/50 rounded-xl text-xs">
                  <span className="font-bold text-foreground/85">ENTER</span>
                  <span className="text-foreground/80">Seçili olan komutu onaylama / gitme</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-muted border border-border/50 rounded-xl text-xs">
                  <span className="font-bold text-foreground/85">ESC</span>
                  <span className="text-foreground/80">Komut paleti penceresini kapatma</span>
                </div>
              </div>
              <div className="mt-2.5">
                <p className="font-bold mb-1.5 text-foreground">Yazarak Hızlı Komut Tetikleme:</p>
                <p className="text-foreground/80">Arama çubuğuna <code className="bg-background border border-border/45 px-1.5 py-0.5 rounded text-foreground font-bold font-mono">/koyu</code> yazarak anında karanlık moda, <code className="bg-background border border-border/45 px-1.5 py-0.5 rounded text-foreground font-bold font-mono">/ayarlar</code> yazarak ayarlara, <code className="bg-background border border-border/45 px-1.5 py-0.5 rounded text-foreground font-bold font-mono">/profil</code> yazarak profilinize gidebilirsiniz.</p>
              </div>
            </div>
          )
        }
      ]
    },
    {
      id: 'yazi-formatlama',
      title: 'Yazı Biçimlendirme',
      icon: Lightbulb,
      items: [
        {
          id: 'bold-italic',
          question: 'Gönderilerimde kalın veya italik yazıyı nasıl kullanırım?',
          answer: (
            <div className="space-y-2 text-foreground/80 dark:text-slate-200">
              <p>Metinlerinizi zenginleştirmek için standart Markdown etiketlerini kullanabilirsiniz:</p>
              <div className="space-y-1.5 font-semibold">
                <div className="flex items-center justify-between p-2 bg-muted/60 border border-border/40 rounded-xl text-xs">
                  <span className="text-foreground/80">Kalın Yazı</span>
                  <code className="text-primary font-bold font-mono bg-background px-2 py-0.5 rounded border border-border/45">**kalın metin**</code>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted/60 border border-border/40 rounded-xl text-xs">
                  <span className="text-foreground/80">İtalik Yazı</span>
                  <code className="text-primary font-bold font-mono bg-background px-2 py-0.5 rounded border border-border/45">*italik metin*</code>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted/60 border border-border/40 rounded-xl text-xs">
                  <span className="text-foreground/80">Eğik Çizgi (Alt Tire) İtalik</span>
                  <code className="text-primary font-bold font-mono bg-background px-2 py-0.5 rounded border border-border/45">_italik metin_</code>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'announcement-tag',
          question: 'Resmi duyurular nasıl yazılır? (Kurucu/Ekip Özel)',
          answer: 'Yalnızca yönetici veya kurucu yetkisine sahip hesaplar, yazdıkları gönderinin başına "/duyuru" komutunu ekleyerek resmi sistem duyurusu yayınlayabilirler. Bu gönderiler ana akışta parlayan özel duyuru blokları olarak görünür.'
        }
      ]
    }
  ]

  const categoriesEn: Category[] = [
    {
      id: 'genel',
      title: 'About Havn',
      icon: HelpCircle,
      items: [
        {
          id: 'what-is-havn',
          question: 'What is Havn and what is its purpose?',
          answer: 'Havn is a free, community-driven, ad-free and modern social network platform. It allows users to create communities based on their interests and interact with other members in a safe and respectful environment.'
        },
        {
          id: 'is-free',
          question: 'Is it free to join Havn?',
          answer: 'No, joining Havn and using all of its core features is completely free. Except for premium features that may be added in the future, all social feeds and community access will remain free.'
        },
        {
          id: 'data-privacy',
          question: 'Are my data and privacy safe?',
          answer: 'Yes, Havn prioritizes user privacy. Your email address, password, and personal data are stored encrypted in the Supabase infrastructure. Your data is never shared with third parties or sold for ad targeting purposes.'
        },
        {
          id: 'create-community',
          question: 'How can I create my own community?',
          answer: 'You can use the "Create Community" option by going to the "Communities" tab on the left menu. You can set your community as public (anyone can join) or request-required (approval needed), and specify its rules and description as you wish.'
        }
      ]
    },
    {
      id: 'xp-sistemi',
      title: 'Level & XP System',
      icon: Award,
      items: [
        {
          id: 'how-to-earn-xp',
          question: 'How do I earn Experience Points (XP) and level up?',
          answer: 'You can earn XP by staying active on the platform. Sharing posts, commenting on other posts, receiving likes on your posts, or liking others\' posts earns XP for your profile. As your XP points increase, your level will automatically rise.'
        },
        {
          id: 'xp-formula',
          question: 'How are levels calculated and what ranks are there?',
          answer: (
            <div className="space-y-3 text-foreground/80 dark:text-slate-200">
              <p>Your level is calculated mathematically with the following formula:</p>
              <div className="p-3 bg-muted border border-border/60 rounded-xl text-center">
                <code className="text-primary font-mono font-bold text-xs">Level = Floor(Sqrt(XP / 100)) + 1</code>
              </div>
              <p>Example level requirements:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li><strong>Level 2:</strong> 100 XP</li>
                <li><strong>Level 3:</strong> 400 XP</li>
                <li><strong>Level 4:</strong> 900 XP</li>
                <li><strong>Level 5:</strong> 1600 XP</li>
                <li><strong>Level 10:</strong> 8100 XP</li>
              </ul>
              <div className="mt-2 border-t border-border/40 pt-2">
                <p className="font-bold mb-1 text-foreground">Rank Tiers:</p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 bg-muted/60 border border-border/45 rounded-lg">
                    <span className="font-black text-sky-500 dark:text-sky-400">Rookie</span> (Lvl 1 - 5)
                  </div>
                  <div className="p-2 bg-muted/60 border border-border/45 rounded-lg">
                    <span className="font-black text-emerald-500 dark:text-emerald-400">Voyager 🧭</span> (Lvl 6 - 15)
                  </div>
                  <div className="p-2 bg-muted/60 border border-border/45 rounded-lg">
                    <span className="font-black text-purple-500 dark:text-purple-400">Sage 🔮</span> (Lvl 16 - 30)
                  </div>
                  <div className="p-2 bg-muted/60 border border-border/45 rounded-lg">
                    <span className="font-black text-amber-500 dark:text-amber-400">Legend 👑</span> (Lvl 31+)
                  </div>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'hide-xp',
          question: 'Can I hide my level and XP points?',
          answer: 'Yes. You can disable the "Show XP Points" setting by going to Settings > Preferences. When disabled, your level rings will be hidden from your profile and you will not be listed in the Leaderboard on the right sidebar.'
        }
      ]
    },
    {
      id: 'alev-serisi',
      title: 'Streaks (Flame Series)',
      icon: Flame,
      items: [
        {
          id: 'what-is-streak',
          question: 'What is a streak?',
          answer: 'In Havn, logging into the platform and sharing a post or writing a comment at least once every 24 hours extends your daily streak. As your streak extends, the flame icon next to your name grows brighter, changes color, and evolves.'
        },
        {
          id: 'streak-levels',
          question: 'What streak levels and colors are there?',
          answer: (
            <div className="space-y-2 text-foreground/80 dark:text-slate-200">
              <p>Based on your streak day count, flame colors change as follows:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-medium">
                <div className="flex items-center gap-2 p-2.5 bg-muted/60 border border-border/40 rounded-xl">
                  <span className="text-base">🔥</span>
                  <div>
                    <p className="font-black text-orange-500">1 - 9 Days</p>
                    <p className="text-[10px] text-muted-foreground">Classic Orange</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-muted/60 border border-border/40 rounded-xl">
                  <span className="text-base drop-shadow-[0_0_4px_rgba(239,68,68,0.45)]">🔥</span>
                  <div>
                    <p className="font-black text-red-500">10 - 49 Days</p>
                    <p className="text-[10px] text-muted-foreground">Advanced Red</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-muted/60 border border-border/40 rounded-xl">
                  <span className="text-base drop-shadow-[0_0_5px_rgba(236,72,153,0.5)]">🔥</span>
                  <div>
                    <p className="font-black text-pink-500">50 - 99 Days</p>
                    <p className="text-[10px] text-muted-foreground">Rare Pink</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-muted/60 border border-border/40 rounded-xl">
                  <span className="text-base animate-pulse drop-shadow-[0_0_6px_rgba(234,179,8,0.55)]">🔥</span>
                  <div>
                    <p className="font-black text-yellow-500">100 - 149 Days</p>
                    <p className="text-[10px] text-muted-foreground">Legendary Yellow</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-muted/60 border border-border/40 rounded-xl sm:col-span-2">
                  <span className="text-base animate-pulse drop-shadow-[0_0_8px_rgba(168,85,247,0.7)]">🔥</span>
                  <div>
                    <p className="font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-yellow-500">150+ Days</p>
                    <p className="text-[10px] text-muted-foreground">Cosmic Rainbow</p>
                  </div>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'streak-loss',
          question: 'Will my streak reset if I miss a day?',
          answer: 'Yes. To prevent your streak from breaking, you must show activity (login, post, or comment) on the platform every day consecutively. Your streak will be reset in case of inactivity exceeding 24 hours.'
        }
      ]
    },
    {
      id: 'dogrulama',
      title: 'Account Verification',
      icon: BadgeCheck,
      items: [
        {
          id: 'blue-tick',
          question: 'How to get a Blue Tick (Verified Member) badge?',
          answer: 'The Blue Tick badge is awarded to accounts that adhere to platform guidelines and remain active and verified. Getting a blue tick is not dependent on any specific level or task. It is manually assigned by platform administrators after reviewing the user\'s history.'
        },
        {
          id: 'gold-tick',
          question: 'What is the Gold Tick (System Partner & Team) badge?',
          answer: 'The Gold Tick badge is a special partnership badge awarded to the official Havn management team, founders, developers, and registered business partners. It is assigned manually with founder approval and cannot be obtained through payment or gamification.'
        }
      ]
    },
    {
      id: 'kisayollar',
      title: 'Command Palette & Shortcuts',
      icon: Terminal,
      items: [
        {
          id: 'what-is-command-palette',
          question: 'What is the Global Command Palette (Ctrl + K)?',
          answer: 'It is a search and management console that lets you navigate with your keyboard while browsing the site. You can switch pages, change themes, or quickly search for users.'
        },
        {
          id: 'ai-semantic-search',
          question: 'How does AI-Powered (Semantic) Search work?',
          answer: (
            <div className="space-y-3 text-foreground/80 dark:text-slate-200">
              <p>
                In Havn, modern <strong>AI-Powered (Semantic Search)</strong> technology is used instead of classic keyword matching. Thanks to the Supabase pgvector integration, not only the literal word meanings but also the conceptual meanings of the phrases you type in the search box are analyzed.
              </p>
              <div className="p-3 bg-muted border border-border/60 rounded-xl">
                <p className="font-bold text-foreground mb-1 text-xs">✨ How to Experience It?</p>
                <p className="text-[11px] leading-relaxed">
                  For example, instead of searching for "GTA 5" directly, if you search for <em>"roleplay place to hang out with friends"</em> or <em>"game group where we drive cars"</em>, the AI links the underlying semantic relationships and displays relevant FiveM or game communities and posts along with similarity ratios (e.g., 85%).
                </p>
              </div>
              <p className="text-xs">
                This feature is currently fully integrated into the <strong>Ctrl + K</strong> command palette. It is free, fast, and privacy-friendly, powered by our self-hosted local model.
              </p>
            </div>
          )
        },
        {
          id: 'how-to-use-palette',
          question: 'How do I use the Command Palette and what shortcuts are available?',
          answer: (
            <div className="space-y-3 text-foreground/80 dark:text-slate-200">
              <p>To open and use the palette:</p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between p-2.5 bg-muted border border-border/50 rounded-xl">
                  <span className="font-bold text-foreground/85 text-xs">Shortcut to Open</span>
                  <div className="flex items-center gap-1 font-mono">
                    <kbd className="px-2 py-0.5 rounded border border-border/80 bg-background text-foreground font-bold text-xs shadow-sm">Ctrl</kbd>
                    <span className="text-muted-foreground font-bold">+</span>
                    <kbd className="px-2 py-0.5 rounded border border-border/80 bg-background text-foreground font-bold text-xs shadow-sm">K</kbd>
                    <span className="text-[10px] text-muted-foreground mx-1">or</span>
                    <kbd className="px-2 py-0.5 rounded border border-border/80 bg-background text-foreground font-bold text-xs shadow-sm">⌘</kbd>
                    <span className="text-muted-foreground font-bold">+</span>
                    <kbd className="px-2 py-0.5 rounded border border-border/80 bg-background text-foreground font-bold text-xs shadow-sm">K</kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-muted border border-border/50 rounded-xl text-xs">
                  <span className="font-bold text-foreground/85">Arrow Keys (↑↓)</span>
                  <span className="text-foreground/80">Navigate up/down in the menu</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-muted border border-border/50 rounded-xl text-xs">
                  <span className="font-bold text-foreground/85">ENTER</span>
                  <span className="text-foreground/80">Confirm / execute the selected command</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-muted border border-border/50 rounded-xl text-xs">
                  <span className="font-bold text-foreground/85">ESC</span>
                  <span className="text-foreground/80">Close the command palette window</span>
                </div>
              </div>
              <div className="mt-2.5">
                <p className="font-bold mb-1.5 text-foreground">Quick Commands by Typing:</p>
                <p className="text-foreground/80">Type <code className="bg-background border border-border/45 px-1.5 py-0.5 rounded text-foreground font-bold font-mono">/dark</code> in the search bar to immediately switch to dark mode, <code className="bg-background border border-border/45 px-1.5 py-0.5 rounded text-foreground font-bold font-mono">/settings</code> to open settings, or <code className="bg-background border border-border/45 px-1.5 py-0.5 rounded text-foreground font-bold font-mono">/profile</code> to go to your profile page.</p>
              </div>
            </div>
          )
        }
      ]
    },
    {
      id: 'yazi-formatlama',
      title: 'Text Formatting',
      icon: Lightbulb,
      items: [
        {
          id: 'bold-italic',
          question: 'How do I write bold or italic text in my posts?',
          answer: (
            <div className="space-y-2 text-foreground/80 dark:text-slate-200">
              <p>You can use standard Markdown tags to enrich your texts:</p>
              <div className="space-y-1.5 font-semibold">
                <div className="flex items-center justify-between p-2 bg-muted/60 border border-border/40 rounded-xl text-xs">
                  <span className="text-foreground/80">Bold Text</span>
                  <code className="text-primary font-bold font-mono bg-background px-2 py-0.5 rounded border border-border/45">**bold text**</code>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted/60 border border-border/40 rounded-xl text-xs">
                  <span className="text-foreground/80">Italic Text</span>
                  <code className="text-primary font-bold font-mono bg-background px-2 py-0.5 rounded border border-border/45">*italic text*</code>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted/60 border border-border/40 rounded-xl text-xs">
                  <span className="text-foreground/80">Italic Text (Underscore)</span>
                  <code className="text-primary font-bold font-mono bg-background px-2 py-0.5 rounded border border-border/45">_italic text_</code>
                </div>
              </div>
            </div>
          )
        },
        {
          id: 'announcement-tag',
          question: 'How to write official announcements? (Founder/Team Only)',
          answer: 'Only accounts with admin or founder authority can publish official system announcements by adding the "/announcement" command (or "/duyuru" in Turkish) at the beginning of their post. These posts appear as glowing official announcement blocks in the main feed.'
        }
      ]
    }
  ]

  const categories = locale === 'en' ? categoriesEn : categoriesTr

  const toggleItem = (itemId: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }))
  }

  // Filter items across categories based on search query
  const allFilteredItems = searchQuery.trim()
    ? categories.flatMap(cat => 
        cat.items.filter(item => 
          item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (typeof item.answer === 'string' && item.answer.toLowerCase().includes(searchQuery.toLowerCase()))
        ).map(item => ({ ...item, categoryTitle: cat.title }))
      )
    : []

  return (
    <div className="flex flex-col gap-6 w-full pb-12">
      {/* Search Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-transparent to-transparent border border-border rounded-3xl p-6 sm:p-8 flex flex-col gap-5 shadow-lg backdrop-blur-md">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-primary text-primary-foreground shadow-md">
              <BookOpen size={20} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground dark:text-white uppercase tracking-tight">{t('help.page_title')}</h1>
              <p className="text-xs text-muted-foreground dark:text-slate-300 font-semibold mt-0.5">{t('help.page_subtitle')}</p>
            </div>
          </div>
          
          {currentUser ? (
            <Link 
              href="/feed"
              className="px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl border border-border bg-card hover:bg-accent text-foreground transition-all flex items-center gap-1.5 shadow-sm self-start sm:self-auto cursor-pointer"
            >
              <Compass size={13} className="text-primary animate-spin-slow" /> {t('hq.back_to_feed')}
            </Link>
          ) : (
            <Link 
              href="/login"
              className="px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 transition-all flex items-center gap-1.5 shadow-md self-start sm:self-auto cursor-pointer"
            >
              {t('auth.login.submit')} <ArrowLeft size={13} className="rotate-180" />
            </Link>
          )}
        </div>

        {/* Live Search Bar */}
        <div className="relative w-full z-10">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('help.search_placeholder')}
            className="w-full pl-11 pr-5 py-3.5 rounded-2xl bg-background/50 dark:bg-black/40 border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/45 focus:ring-1 focus:ring-primary/20 text-xs sm:text-sm font-semibold shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground font-bold text-xs px-2 py-1 rounded bg-muted hover:bg-accent border border-border"
            >
              {t('feed.clear')}
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Navigation Sidebar (Only when not searching) */}
        {!searchQuery && (
          <aside className="lg:col-span-4 flex flex-col gap-1.5 lg:sticky lg:top-6 select-none">
            <h2 className="text-[10px] font-black tracking-widest text-muted-foreground uppercase px-3.5 py-2 mb-1">
              {t('help.categories')}
            </h2>
            {categories.map((cat) => {
              const Icon = cat.icon
              const isActive = activeCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id)
                    setExpandedItems({})
                  }}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold text-left transition-all duration-200 border cursor-pointer w-full",
                    isActive
                      ? "bg-primary/10 text-primary border-primary/20 shadow"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/40 border-transparent bg-card/45 dark:bg-transparent"
                  )}
                >
                  <Icon size={14} className={isActive ? "text-primary" : "text-muted-foreground"} />
                  {cat.title}
                </button>
              )
            })}
          </aside>
        )}

        {/* Content list panel */}
        <div className={cn("flex flex-col gap-4", searchQuery ? "lg:col-span-12" : "lg:col-span-8")}>
          
          {/* 1. Search Results Mode */}
          {searchQuery && (
            <div className="space-y-4">
              <h3 className="text-xs font-black text-muted-foreground uppercase tracking-wider px-1">
                {t('help.search_results', { count: allFilteredItems.length })}
              </h3>
              
              {allFilteredItems.length > 0 ? (
                allFilteredItems.map((item) => {
                  const isExpanded = !!expandedItems[item.id]
                  return (
                    <div 
                      key={item.id} 
                      className="bg-card border border-border rounded-2xl p-5 hover:border-primary/20 transition-all flex flex-col gap-3 shadow-sm"
                    >
                      <button 
                        onClick={() => toggleItem(item.id)}
                        className="flex items-center justify-between text-left w-full gap-3 cursor-pointer group"
                      >
                        <div>
                          <span className="text-[9px] font-black uppercase text-primary/80 bg-primary/10 border border-primary/15 px-1.5 py-0.5 rounded tracking-wide font-mono">
                            {item.categoryTitle}
                          </span>
                          <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors mt-2">
                            {item.question}
                          </h4>
                        </div>
                        <ChevronDown 
                          size={16} 
                          className={cn("text-muted-foreground transition-transform duration-200 shrink-0", isExpanded && "rotate-180 text-primary")} 
                        />
                      </button>
                      
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="text-xs text-foreground/80 dark:text-slate-200 leading-relaxed font-medium pt-2.5 border-t border-border/40">
                              {item.answer}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-16 bg-card border border-border rounded-3xl flex flex-col items-center justify-center gap-3">
                  <HelpCircle size={36} className="text-muted-foreground opacity-40" />
                  <p className="font-bold text-sm text-foreground">{t('help.no_results.title')}</p>
                  <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                    {t('help.no_results.desc')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 2. Normal Category Mode */}
          {!searchQuery && (
            <div className="space-y-4">
              {categories.filter(cat => cat.id === activeCategory).map((cat) => (
                <div key={cat.id} className="space-y-4">
                  <h3 className="text-xs font-black text-muted-foreground uppercase tracking-wider px-1">
                    {cat.title} ({cat.items.length})
                  </h3>
                  
                  {cat.items.map((item) => {
                    const isExpanded = expandedItems[item.id] !== false // Default open the first click or toggle
                    return (
                      <div 
                        key={item.id} 
                        className="bg-card border border-border rounded-2xl p-5 hover:border-primary/20 transition-all flex flex-col gap-3 shadow-sm"
                      >
                        <button 
                          onClick={() => toggleItem(item.id)}
                          className="flex items-center justify-between text-left w-full gap-3 cursor-pointer group"
                        >
                          <h4 className="font-extrabold text-sm text-foreground group-hover:text-primary transition-colors">
                            {item.question}
                          </h4>
                          <ChevronDown 
                            size={16} 
                            className={cn("text-muted-foreground transition-transform duration-200 shrink-0", isExpanded && "rotate-180 text-primary")} 
                          />
                        </button>
                        
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="text-xs sm:text-sm text-foreground/80 dark:text-slate-200 leading-relaxed font-semibold pt-3.5 border-t border-border/40 whitespace-pre-wrap">
                                {item.answer}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
