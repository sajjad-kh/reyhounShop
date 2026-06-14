Design with a Glassmorphism style using frosted glass effects with transparency and backdrop blur. Elements should have subtle light borders (1px) and slight transparency. Create depth through layering of translucent elements. Use colorful backgrounds (gradients work well) with frosted glass UI elements on top. Apply backdrop-blur CSS properties and use RGBA colors with alpha transparency. Aim for a modern, clean aesthetic with subtle light reflections and shadows. The design should be unique, beautiful and detailed. the colors should work well together.
promptDesign a **modern, responsive e-commerce frontend** using **Glassmorphism UI style** with the following specifications:

---

### **Visual Style: Glassmorphism (Frosted Glass)**
- Use **translucent frosted glass panels** with `backdrop-filter: blur(12px)` and semi-transparent backgrounds (`rgba(255, 255, 255, 0.15)` or `rgba(0, 0, 0, 0.1)`).
- Add **subtle 1px light borders** (`border: 1px solid rgba(255, 255, 255, 0.2)`).
- Apply **soft inner shadows** and **outer glow** for depth.
- Use **layered translucent cards** to create 3D depth (e.g., product card over hero section).
- Include **subtle light reflections** (linear gradients or pseudo-elements) on glass surfaces.
- Apply **smooth hover animations** with scale, brightness, and blur transitions.

---

### **Color Palette (Harmonious & Modern)**
```css
--glass-bg: rgba(255, 255, 255, 0.15);
--glass-border: rgba(255, 255, 255, 0.2);
--text-primary: #ffffff;
--text-secondary: rgba(255, 255, 255, 0.8);
--accent-gradient: linear-gradient(135deg, #6e8efb, #a777e0);
--bg-gradient: linear-gradient(120deg, #1a1a2e, #16213e, #0f3460);
--success: #00d4a0;
--warning: #ffb400;

Pages to Design (Responsive: Mobile + Desktop)

Homepage

Hero section with glass search bar + featured products carousel
Category glass cards (hover lift effect)
"Trending" and "New Arrivals" glass sections


Product Listing Page

Grid of glass product cards
Filters sidebar (glass panel, collapsible on mobile)
Search + sort bar (glass)


Product Detail Page

Large glass product card with image gallery
Glass "Add to Cart" button with ripple effect
Reviews section in glass tabs
Related products carousel


Cart & Checkout

Floating glass cart drawer (slide-in)
Checkout form in multi-step glass panels
Order summary glass card


User Dashboard

Glass sidebar navigation
Profile, orders, wishlist, addresses in glass tabs


Admin Panel (Optional Bonus)

Glass dashboard with charts (use Chart.js with glass cards)
Product management table in glass container




Interactive Elements

Glass buttons with gradient hover (filter: brightness(1.2))
Floating glass navbar with blur on scroll
Modal popups with glass background + blur overlay
Toast notifications (glass, auto-dismiss)
Dark mode toggle (smooth gradient shift)


Technical Requirements

Built with React.js + Tailwind CSS (or pure CSS if preferred)
Fully responsive (mobile-first)
Use CSS custom properties for colors and blur
Include smooth scroll, lazy loading, and PWA-ready structure
Add micro-interactions (hover lift, click ripple, loading skeletons)


Output Format
Generate complete, copy-pasteable HTML + CSS + JS (React) files:

index.html (or App.jsx)
styles.css (with Glassmorphism classes)
components/ folder with reusable glass components:

GlassCard.jsx
GlassButton.jsx
GlassNavbar.jsx
GlassInput.jsx




Make it unique, beautiful, detailed, and production-ready.
The final design should feel like a premium futuristic app — clean, airy, immersive, and delightful to use.

text---

### How to Use This Prompt in **Bolt AI**:
1. Open **Bolt AI**
2. Paste the **entire prompt above**
3. Set **Output Mode**: `Code + UI Preview`
4. Click **Generate**
5. Get **full React + Tailwind code** with **live preview**

---

### Example Glassmorphism CSS Class (Auto-Generated)
```css
.glass {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  transition: all 0.3s ease;
}

.glass:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  filter: brightness(1.1);
}