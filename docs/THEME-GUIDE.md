# Professional Theme System - SOMARNIX

## Overview

This is a centralized, professional theme system for the entire SOMARNIX website. It provides consistent colors, components, and utilities across all pages with automatic light/dark mode support.

## Quick Start

### 1. Import the Theme

In your `globals.css`, the theme is already imported:

```css
@import '../styles/theme.css';
@import '../styles/theme-utilities.css';
```

### 2. Use Theme Classes in Components

```tsx
// Example component using theme classes
export function ExampleCard() {
  return (
    <div className="card card-hover">
      <h3 className="text-gradient text-2xl font-bold">Card Title</h3>
      <p className="text-secondary mt-2">Card description text</p>
      <button className="btn-primary mt-4">Action</button>
    </div>
  );
}
```

## Available Theme Classes

### Page Layouts

| Class | Description |
|-------|-------------|
| `.page-bg` | Gradient background for pages |
| `.page-bg-gradient` | Enhanced gradient background |

### Cards

| Class | Description |
|-------|-------------|
| `.card` | Basic themed card |
| `.card-hover` | Card with hover effects |
| `.card-elevated` | Elevated card with shadow |

### Buttons

| Class | Description |
|-------|-------------|
| `.btn-primary` | Primary gradient button |
| `.btn-secondary` | Secondary outlined button |

### Inputs

| Class | Description |
|-------|-------------|
| `.input` | Themed input field |

### Badges

| Class | Description |
|-------|-------------|
| `.badge-primary` | Primary gradient badge |
| `.badge-secondary` | Secondary outlined badge |

### Effects

| Class | Description |
|-------|-------------|
| `.glass` | Glass morphism effect |
| `.text-gradient` | Gradient text |
| `.hover-lift` | Lift on hover |
| `.transition-themed` | Smooth transitions |

### Components

| Class | Description |
|-------|-------------|
| `.header` | Themed header/navigation bar |
| `.sidebar` | Themed sidebar |
| `.nav-item` | Navigation item |
| `.nav-item-active` | Active navigation item |

## CSS Variables

### Colors

```css
/* Use in your CSS */
color: var(--primary);
background-color: var(--background);
border-color: var(--border);
```

### Available Variables

- `--background` - Main background
- `--foreground` - Main text color
- `--primary` - Primary brand color
- `--secondary` - Secondary color
- `--muted` - Muted/subtle color
- `--accent` - Accent color
- `--border` - Border color
- `--card` - Card background
- `--sidebar` - Sidebar background

## Usage Examples

### Example 1: Product Card

```tsx
<div className="card card-hover p-6">
  <div className="badge-primary mb-3">New</div>
  <h3 className="text-gradient text-xl font-bold">Product Name</h3>
  <p className="text-secondary mt-2">Product description here</p>
  <div className="flex gap-2 mt-4">
    <button className="btn-primary">Buy Now</button>
    <button className="btn-secondary">Details</button>
  </div>
</div>
```

### Example 2: Navigation

```tsx
<header className="header">
  <nav className="flex gap-2 p-4">
    <a className="nav-item nav-item-active" href="/home">Home</a>
    <a className="nav-item" href="/courses">Courses</a>
    <a className="nav-item" href="/about">About</a>
  </nav>
</header>
```

### Example 3: Form

```tsx
<form className="card max-w-md">
  <h2 className="text-gradient text-2xl font-bold mb-4">Contact Us</h2>
  <input 
    className="input mb-4" 
    placeholder="Your email" 
  />
  <textarea 
    className="input mb-4" 
    placeholder="Your message"
    rows={4}
  />
  <button className="btn-primary w-full">Send Message</button>
</form>
```

### Example 4: Page Layout

```tsx
<div className="page-bg">
  <header className="header">
    {/* Navigation */}
  </header>
  
  <main className="max-w-7xl mx-auto p-6">
    <h1 className="text-gradient text-4xl font-bold mb-6">
      Welcome Page
    </h1>
    
    <div className="grid grid-cols-3 gap-6">
      {/* Cards */}
    </div>
  </main>
</div>
```

## Dark Mode

Dark mode is automatic! Just toggle the `.dark` class on the `html` element:

```tsx
// In your theme toggle component
const { theme, toggleTheme } = useTheme();

<button onClick={toggleTheme}>
  {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
</button>
```

## Best Practices

### ✅ DO:

```tsx
// Use theme classes for consistency
<div className="card card-hover">

// Use semantic color names
className="text-primary bg-secondary border-border"

// Use transition classes
className="transition-themed hover-lift"
```

### ❌ DON'T:

```tsx
// Avoid hardcoded colors
className="text-gray-700 bg-white"

// Avoid inline styles for colors
style={{ color: '#333' }}

// Mix too many utility classes
className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200..."
```

## Migration Guide

### Old Code:
```tsx
<div className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
  <h3 className="text-gray-900 dark:text-white">Title</h3>
  <button className="bg-blue-600 hover:bg-blue-700 text-white">
    Click
  </button>
</div>
```

### New Code:
```tsx
<div className="card">
  <h3 className="text-primary">Title</h3>
  <button className="btn-primary">Click</button>
</div>
```

**Benefits:**
- ✅ 70% less code
- ✅ Automatic dark mode
- ✅ Consistent design
- ✅ Easy to maintain

## Component Examples by Page Type

### Homepage

```tsx
<section className="page-bg-gradient py-20">
  <div className="max-w-7xl mx-auto px-6">
    <h1 className="text-gradient text-5xl font-bold text-center mb-6">
      Welcome to SOMARNIX
    </h1>
    <div className="grid grid-cols-3 gap-6 mt-12">
      {features.map(feature => (
        <div key={feature.id} className="card card-hover">
          <h3 className="text-xl font-bold">{feature.title}</h3>
        </div>
      ))}
    </div>
  </div>
</section>
```

### Product Page

```tsx
<div className="card max-w-4xl mx-auto">
  <div className="badge-primary">Featured</div>
  <h1 className="text-gradient text-3xl font-bold mt-4">
    Product Name
  </h1>
  <p className="text-secondary mt-2">Product description</p>
  <button className="btn-primary mt-6">Add to Cart</button>
</div>
```

### Dashboard

```tsx
<div className="flex h-screen">
  <aside className="sidebar w-64 p-4">
    <nav className="space-y-2">
      <a className="nav-item nav-item-active" href="/dashboard">
        Dashboard
      </a>
      <a className="nav-item" href="/orders">
        Orders
      </a>
    </nav>
  </aside>
  
  <main className="flex-1 p-6 overflow-auto">
    <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
    <div className="grid grid-cols-4 gap-6">
      {/* Stats cards */}
    </div>
  </main>
</div>
```

## Support

For questions or issues with the theme system, contact the development team or check the documentation.

---

**Last Updated:** March 2026  
**Version:** 2.0 Professional
