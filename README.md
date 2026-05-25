# HAVN — Premium Social Networking & Community Architecture

HAVN is an ultra-modern, high-fidelity community hub and real-time social networking platform. Built on Next.js, Supabase, and TailwindCSS, HAVN merges state-of-the-art glassmorphism design language, fluid micro-animations, and enterprise-grade real-time systems to deliver a premium, interactive user experience.

---

## ✨ Key Architectural Features

### 🎨 Visual & UX Excellence
- **Custom Accent Tokens:** Support for system-wide custom accent themes (Havn Purple, Indigo, Rose, Orange, Teal) saved persistently via client-side data attributes.
- **Glassmorphic Components:** Seamless backdrop-blur wrappers, neon glow elements, and HSL-tailored dark/light mode configurations.
- **Fluid Micro-Animations:** Bounce reaction triggers, canvas emoji explosion particles, and smooth layout changes powered by Framer Motion.
- **Image Lightbox & Media Gallery:** Fully responsive modal overlays to view high-resolution post attachments.

### ⚡ Real-Time Sync & Engine
- **Instant Messaging (QuickChat):** Double-pane direct messaging layout alongside a collapsible quick-access chat bubble.
- **Presence Indicators:** System-wide live user online status tracking and typing indicators (`Yazıyor...`).
- **Real-Time Notification Center:** Grouped interactive feeds for comments, reactions (likes with emojis: 🔥, 😂, 😮, 😢, ❤️), and system updates.

### 🛡️ Community Administration Pipelines
- **Dynamic Governance Rules:** Creator-defined guidelines (maddeler) and pinned announcements rendered directly inside sidebars and community feeds.
- **Role-Based Access Control:** Configurable permissions for Owners, Moderators, and Members.
- **Access Pipelines:** Support for both Open (Public) and Request-to-Join (Private with application review pipelines) communities.

---

## 🛠️ Technology Stack

- **Core Framework:** Next.js (App Router, Server Actions, Dynamic View Routes)
- **Database & Services:** Supabase (PostgreSQL, Realtime Broadcast, Object Storage, Secure Authentication)
- **Styling:** TailwindCSS & PostCSS
- **Animation Engine:** Framer Motion
- **Icons:** Lucide React

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Supabase account and database instance

### 1. Installation
```bash
git clone https://github.com/melihkochan/havnsocialmedia.git
cd havnsocialmedia
npm install
```

### 2. Configuration
Create a `.env.local` file in the root directory and configure the environment variables:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=your-resend-api-key
```

### 3. Execution
```bash
# Start development server
npm run dev

# Build production optimized package
npm run build
```

---

## 🔒 License & Copyright

Copyright © 2026 HAVN. All rights reserved.

**Proprietary and Confidential.**

All rights reserved. Unauthorized copying, distribution, modification, reverse engineering, or commercial exploitation of this software and codebase via any medium is strictly prohibited. This repository serves as the official source of HAVN's proprietary social networking architecture.
