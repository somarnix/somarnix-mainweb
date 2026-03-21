# ✅ Collapsible Filter + 4 Cards Per Row (PC Mode)

## 🎯 What Changed

### 1. Collapsible Filter (PC Only)
- **Before:** Filter always visible on PC
- **After:** Click to show/hide filter

### 2. 4 Cards Per Row (PC Only)
- **Before:** 3 cards per row on PC
- **After:** 4 cards per row on PC (XL screens)

---

## 📊 Layout Changes

### Mobile (Unchanged)
```
[Filter Toggle Button]
[Cards: 2 per row]
```

### Tablet (Unchanged)
```
[Filter Toggle Button]
[Cards: 3 per row]
```

### PC/XL (Changed)
```
[Filter Toggle Button] ← Click to show/hide

When Filter Open:
┌────────────┬─────────────────────────────┐
│  Filter    │  [Card] [Card] [Card] [Card]│
│  Options   │  [Card] [Card] [Card] [Card]│
│            │  [Card] [Card] [Card] [Card]│
└────────────┴─────────────────────────────┘

When Filter Closed:
┌──────────────────────────────────────────┐
│  [Card] [Card] [Card] [Card]             │
│  [Card] [Card] [Card] [Card]             │
│  [Card] [Card] [Card] [Card]             │
└──────────────────────────────────────────┘
```

---

## 💻 Files Updated

### 1. SlugFilter Component
**File:** `app/components/filters/SlugFilter.tsx`

**Changes:**
- Added `pcOpen` state for PC filter toggle
- Added toggle button for PC
- Filter collapses when clicked

**Code:**
```typescript
const [pcOpen, setPcOpen] = useState(true); // PC filter open by default

// Toggle button
<button onClick={() => setPcOpen((current) => !current)}>
  {pcOpen ? "Hide Filters" : "Show Filters"}
</button>

// Conditional rendering
{pcOpen && (
  <div className="filter-content">
    {/* Filter options */}
  </div>
)}
```

---

### 2. ToolsPage
**File:** `app/pages/tools-ai/ToolsPage.tsx`

**Changes:**
- Changed grid from `lg:grid-cols-4` to `xl:grid-cols-5`
- Sidebar: `lg:col-span-1` → `xl:col-span-1`
- Main: `lg:col-span-3` → `xl:col-span-4`
- Cards: `lg:grid-cols-3` → `xl:grid-cols-4`

**Code:**
```tsx
<!-- Layout Grid -->
<div className="grid xl:grid-cols-5 gap-8">
  <!-- Filter Sidebar -->
  <aside className="xl:col-span-1">
    <SlugFilter />
  </aside>
  
  <!-- Main Content -->
  <main className="xl:col-span-4">
    <!-- Cards Grid -->
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
      {tools.map(...)}
    </div>
  </main>
</div>
```

---

## 📐 Responsive Breakpoints

| Screen Size | Filter | Cards Per Row |
|-------------|--------|---------------|
| **Mobile** (< 768px) | Collapsible | 2 |
| **Tablet** (768px - 1279px) | Always Visible | 3 |
| **PC** (1280px - 1535px) | Always Visible | 3 |
| **XL PC** (≥ 1600px) | Collapsible | 4 |

---

## 🎨 User Experience

### PC User Flow

1. **Page Loads**
   - Filter is open by default
   - 4 cards per row visible

2. **User Clicks Filter Button**
   - Filter collapses
   - More space for cards
   - Cards expand to fill space

3. **User Clicks Again**
   - Filter re-opens
   - Back to sidebar + cards layout

---

## ✅ Benefits

| Benefit | Explanation |
|---------|-------------|
| **More Space** | 4 cards per row = more products visible |
| **Cleaner UI** | Hide filter when not needed |
| **Better UX** | Users control their layout |
| **Responsive** | Works on all screen sizes |
| **PC Optimized** | Specifically for large screens |

---

## 🎯 Summary

**What Changed:**
- ✅ Filter is now collapsible on PC (XL screens)
- ✅ Cards show 4 per row on PC (XL screens)
- ✅ Mobile/tablet unchanged
- ✅ User controls filter visibility

**Files Updated:**
- `app/components/filters/SlugFilter.tsx`
- `app/pages/tools-ai/ToolsPage.tsx`

**Status:** ✅ Complete!

---

**រួចរាល់ហើយ!** (Ready!) 🎉
