# Center User Signature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Center the "Developed by Elias Ablan" signature at the bottom of the screen on the main page and leaderboard.

**Architecture:** Change Tailwind classes from `right-6` to `left-1/2 -translate-x-1/2`.

**Tech Stack:** Next.js 15, Tailwind CSS.

---

### Task 1: Center Signature on Main Page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Update CSS classes for centering**
Replace `bottom-6 right-6` with `bottom-8 left-1/2 -translate-x-1/2`.
```tsx
<a 
  href="https://eliasablan.dev" 
  target="_blank" 
  rel="noopener noreferrer"
  className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 text-[10px] font-black tracking-[0.2em] text-white/20 hover:text-primary transition-all uppercase flex items-center gap-2 group bg-black/20 backdrop-blur-md px-6 py-2 rounded-full border border-white/5 hover:border-primary/30 pointer-events-auto whitespace-nowrap"
>
  <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
  Developed by Elias Ablan
</a>
```

- [ ] **Step 2: Commit**
```bash
git add src/app/page.tsx
git commit -m "ui: center developer signature on main page"
```

### Task 2: Center Signature on Leaderboard Page

**Files:**
- Modify: `src/app/leaderboard/page.tsx`

- [ ] **Step 1: Update CSS classes for centering**
Apply the same centering logic to match the main page.
```tsx
<a 
  href="https://eliasablan.dev" 
  target="_blank" 
  rel="noopener noreferrer"
  className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 text-[10px] font-black tracking-[0.2em] text-white/20 hover:text-primary transition-all uppercase flex items-center gap-2 group bg-black/20 backdrop-blur-md px-6 py-2 rounded-full border border-white/5 hover:border-primary/30 pointer-events-auto whitespace-nowrap"
>
  <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
  Developed by Elias Ablan
</a>
```

- [ ] **Step 2: Commit**
```bash
git add src/app/leaderboard/page.tsx
git commit -m "ui: center developer signature on leaderboard page"
```

### Task 3: Final Validation

- [ ] **Step 1: Run Build**
Run: `npm run build`
Expected: PASS (Variables handled by user's .env.local)
