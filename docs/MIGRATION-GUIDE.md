# 🚀 Complete Theme Migration Guide - GSTECHKH

## Quick Reference - Before & After

### 1. Page Containers

#### Before:
```tsx
<div className="min-h-screen bg-white dark:bg-gray-900">
  {/* content */}
</div>
```

#### After:
```tsx
<div className="page-bg">
  {/* content */}
</div>
```

---

### 2. Cards

#### Before:
```tsx
<div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all">
  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Title</h3>
  <p className="text-gray-600 dark:text-gray-400 mt-2">Description</p>
</div>
```

#### After:
```tsx
<div className="card card-hover">
  <h3 className="text-gradient text-xl font-bold">Title</h3>
  <p className="text-secondary mt-2">Description</p>
</div>
```

---

### 3. Buttons

#### Before:
```tsx
<button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold transition-all">
  Click Me
</button>
<button className="border border-gray-300 dark:border-gray-700 px-6 py-2.5 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
  Secondary
</button>
```

#### After:
```tsx
<button className="btn-primary">
  Click Me
</button>
<button className="btn-secondary">
  Secondary
</button>
```

---

### 4. Text Colors

#### Before:
```tsx
<h1 className="text-gray-900 dark:text-white">Primary</h1>
<p className="text-gray-600 dark:text-gray-400">Secondary</p>
<span className="text-gray-500 dark:text-gray-500">Tertiary</span>
```

#### After:
```tsx
<h1 className="text-primary">Primary</h1>
<p className="text-secondary">Secondary</p>
<span className="text-tertiary">Tertiary</span>
```

---

### 5. Inputs

#### Before:
```tsx
<input 
  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 
             bg-white dark:bg-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500"
  placeholder="Enter text"
/>
```

#### After:
```tsx
<input 
  className="input"
  placeholder="Enter text"
/>
```

---

### 6. Badges

#### Before:
```tsx
<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold 
                 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
  New
</span>
```

#### After:
```tsx
<span className="badge-primary">
  New
</span>
```

---

## Page-by-Page Migration Examples

### HomePage.tsx

```tsx
// OLD
<section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600">
  <div className="max-w-4xl mx-auto px-4 text-center">
    <h2 className="text-4xl font-bold text-white mb-4">Title</h2>
  </div>
</section>

// NEW
<section className="py-16 gradient-primary">
  <div className="max-w-4xl mx-auto px-4 text-center">
    <h2 className="text-4xl font-bold text-white mb-4">Title</h2>
  </div>
</section>

// OLD
<div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 p-8 rounded-xl">
  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Title</h3>
</div>

// NEW
<div className="card-elevated bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30">
  <h3 className="text-gradient text-xl font-bold">Title</h3>
</div>
```

---

### AiPage.tsx / AllPage.tsx / Products Pages

```tsx
// OLD - Page Container
<div className="min-h-screen bg-white dark:bg-gray-900 py-8">
  <div className="max-w-7xl mx-auto px-4">
    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">Title</h1>
    
    {/* Filters */}
    <div className="flex gap-4 mb-6">
      <select className="border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2">
        <option>Sort by</option>
      </select>
    </div>
    
    {/* Grid */}
    <div className="grid grid-cols-3 gap-6">
      {items.map(item => (
        <div key={item.id} className="bg-white dark:bg-gray-900 border rounded-xl overflow-hidden">
          <img src={item.image} className="w-full h-48 object-cover" />
          <div className="p-4">
            <h3 className="font-bold text-gray-900 dark:text-white">{item.title}</h3>
            <p className="text-blue-600 font-bold">${item.price}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
</div>

// NEW - Page Container
<div className="page-bg py-8">
  <div className="max-w-7xl mx-auto px-4">
    <h1 className="text-gradient text-4xl font-bold mb-8">Title</h1>
    
    {/* Filters */}
    <div className="flex gap-4 mb-6">
      <select className="input w-auto">
        <option>Sort by</option>
      </select>
    </div>
    
    {/* Grid */}
    <div className="grid grid-cols-3 gap-6">
      {items.map(item => (
        <div key={item.id} className="card p-0 overflow-hidden">
          <img src={item.image} className="w-full h-48 object-cover" />
          <div className="p-4">
            <h3 className="text-gradient font-bold">{item.title}</h3>
            <p className="text-primary font-bold">${item.price}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
</div>
```

---

### ProfilePage.tsx

```tsx
// OLD
<div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
  <div className="flex items-center gap-4 mb-6">
    <img src={user.avatar} className="w-20 h-20 rounded-full" />
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{user.name}</h2>
      <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
    </div>
  </div>
  
  <div className="space-y-4">
    <div className="flex justify-between py-3 border-b">
      <span className="text-gray-600">Label</span>
      <span className="text-gray-900 font-medium">Value</span>
    </div>
  </div>
</div>

// NEW
<div className="card">
  <div className="flex items-center gap-4 mb-6">
    <img src={user.avatar} className="w-20 h-20 rounded-full border-2 border-primary" />
    <div>
      <h2 className="text-gradient text-2xl font-bold">{user.name}</h2>
      <p className="text-secondary">{user.email}</p>
    </div>
  </div>
  
  <div className="space-y-4">
    <div className="flex justify-between py-3 border-b border-border">
      <span className="text-secondary">Label</span>
      <span className="text-primary font-medium">Value</span>
    </div>
  </div>
</div>
```

---

### LoginPage.tsx / RegisterPage.tsx

```tsx
// OLD
<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
  <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">
    <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-8">
      Welcome Back
    </h1>
    
    <form className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Email
        </label>
        <input 
          type="email"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 
                     rounded-lg bg-white dark:bg-gray-800"
        />
      </div>
      
      <button 
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold"
      >
        Login
      </button>
    </form>
  </div>
</div>

// NEW
<div className="page-bg min-h-screen flex items-center justify-center px-4">
  <div className="max-w-md w-full card-elevated p-8">
    <h1 className="text-gradient text-3xl font-bold text-center mb-8">
      Welcome Back
    </h1>
    
    <form className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-secondary mb-2">
          Email
        </label>
        <input 
          type="email"
          className="input"
        />
      </div>
      
      <button 
        type="submit"
        className="w-full btn-primary py-3"
      >
        Login
      </button>
    </form>
  </div>
</div>
```

---

### Admin Dashboard Pages

```tsx
// OLD
<div className="bg-white dark:bg-gray-900 min-h-screen">
  <div className="grid grid-cols-4 gap-6 mb-8">
    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
      <div className="text-sm opacity-80">Total Sales</div>
      <div className="text-3xl font-bold mt-2">$12,345</div>
    </div>
  </div>
  
  <div className="bg-white dark:bg-gray-900 border rounded-xl">
    <div className="border-b px-6 py-4">
      <h2 className="font-bold text-lg">Recent Orders</h2>
    </div>
    <table className="w-full">
      <thead className="bg-gray-50 dark:bg-gray-800">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
        <tr>
          <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">#1234</td>
          <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">John Doe</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

// NEW
<div className="page-bg min-h-screen">
  <div className="grid grid-cols-4 gap-6 mb-8">
    <div className="gradient-primary rounded-xl p-6 text-white">
      <div className="text-sm opacity-80">Total Sales</div>
      <div className="text-3xl font-bold mt-2">$12,345</div>
    </div>
  </div>
  
  <div className="card p-0 overflow-hidden">
    <div className="border-b border-border px-6 py-4">
      <h2 className="text-gradient font-bold text-lg">Recent Orders</h2>
    </div>
    <table className="w-full">
      <thead className="bg-secondary">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase">ID</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase">Customer</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        <tr>
          <td className="px-6 py-4 text-sm text-primary">#1234</td>
          <td className="px-6 py-4 text-sm text-primary">John Doe</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

---

## Common Patterns

### Pattern 1: Section Headers

```tsx
// OLD
<div className="text-center mb-12">
  <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Title</h2>
  <p className="text-xl text-gray-600 dark:text-gray-400">Description</p>
</div>

// NEW
<div className="text-center mb-12">
  <h2 className="text-gradient text-4xl font-bold mb-4">Title</h2>
  <p className="text-secondary text-xl">Description</p>
</div>
```

### Pattern 2: Grid Layouts

```tsx
// OLD
<div className="grid grid-cols-3 gap-6">
  {items.map(item => (
    <div className="bg-white dark:bg-gray-900 border rounded-xl p-4">
      {/* content */}
    </div>
  ))}
</div>

// NEW
<div className="grid grid-cols-3 gap-6">
  {items.map(item => (
    <div className="card p-4">
      {/* content */}
    </div>
  ))}
</div>
```

### Pattern 3: Navigation/Tabs

```tsx
// OLD
<div className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
  <button className="px-4 py-2 text-blue-600 border-b-2 border-blue-600 font-medium">
    Active
  </button>
  <button className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 font-medium">
    Tab
  </button>
</div>

// NEW
<div className="flex gap-2 border-b border-border">
  <button className="nav-item nav-item-active">
    Active
  </button>
  <button className="nav-item">
    Tab
  </button>
</div>
```

---

## Migration Checklist

### Phase 1: Core Pages (High Priority)
- [ ] HomePage.tsx
- [ ] AiPage.tsx
- [ ] AllPage.tsx
- [ ] ProductDetailPage.tsx
- [ ] CoursesPage.tsx
- [ ] VideoDetailPage.tsx

### Phase 2: User Pages
- [ ] ProfilePage.tsx
- [ ] LoginPage.tsx
- [ ] RegisterPage.tsx
- [ ] OrdersPage.tsx
- [ ] OrderDetailPage.tsx
- [ ] CartPage.tsx
- [ ] CheckoutPage.tsx

### Phase 3: Content Pages
- [ ] ProgramsPage.tsx
- [ ] GamesPage.tsx
- [ ] ToolsPage.tsx
- [ ] BlogPage.tsx
- [ ] ServicesPage.tsx
- [ ] SupportCenterPage.tsx

### Phase 4: Communication
- [ ] ChatPage.tsx
- [ ] ChatConversationPage.tsx

### Phase 5: Admin Pages
- [ ] AdminDashboardPage.tsx
- [ ] AdminProductsPage.tsx
- [ ] AdminOrdersPage.tsx
- [ ] AdminOrdersSellerPage.tsx
- [ ] AdminUsersPage.tsx
- [ ] AdminVideoCoursesPage.tsx
- [ ] AdminNotificationsPage.tsx
- [ ] AdminToolLicensesPage.tsx

### Phase 6: AI Tools
- [ ] Veo3.tsx
- [ ] ToolsPage.tsx (AI)
- [ ] PromtAi.tsx
- [ ] Videoeditor.tsx
- [ ] TranslateVideoAI.tsx
- [ ] ToolDownload.tsx

### Phase 7: Utilities
- [ ] Becomeseller.tsx
- [ ] Nodata.tsx
- [ ] PreviewVideoPage.tsx

---

## Testing After Migration

1. **Check Light/Dark Mode** - Toggle theme and verify all pages look correct
2. **Check Responsive** - Test on mobile, tablet, desktop
3. **Check Hover States** - Ensure all interactive elements have proper hover effects
4. **Check Forms** - Verify all inputs work correctly
5. **Check Buttons** - Ensure all buttons are clickable and have proper styles

---

## Rollback

If you need to rollback, all original files are backed up with `.original` extension.

---

## Need Help?

- Check `/docs/THEME-GUIDE.md` for complete documentation
- View `/app/components/ThemeShowcase.tsx` for live examples
- Check `/styles/theme-professional.css` for available classes

---

**Migration Status:** In Progress  
**Last Updated:** March 2026  
**Version:** 2.0 Professional
