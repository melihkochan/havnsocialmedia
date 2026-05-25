# HAVN — Premium Social Networking & Community Architecture

HAVN is an ultra-modern, high-fidelity community hub and real-time social networking platform. Merging a state-of-the-art glassmorphism design language, fluid micro-animations, and enterprise-grade real-time systems, HAVN is engineered to deliver a premium, interactive digital lounge.

---

## 🔒 Confidentiality & Proprietary License Notice

**Proprietary and Confidential.**

Copyright © 2026 HAVN. All rights reserved.

This repository contains proprietary, closed-source software. Unauthorized copying, cloning, distribution, modification, reverse engineering, or commercial exploitation of this codebase via any medium is strictly prohibited. Access to this source code is restricted to authorized contributors and stakeholders only.

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
