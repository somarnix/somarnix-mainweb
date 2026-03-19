"use client";

import { useTheme } from "../contexts/ThemeContext";

/**
 * ThemeShowcase Component
 * Display all available theme classes and colors for reference
 * Use this component to test and preview theme changes
 */

export function ThemeShowcase() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="page-bg min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-gradient text-4xl font-bold">Theme Showcase</h1>
            <p className="text-secondary mt-2">Current theme: {theme}</p>
          </div>
          <button onClick={toggleTheme} className="btn-primary">
            Toggle {theme === 'light' ? 'Dark' : 'Light'} Mode
          </button>
        </div>

        {/* Colors Grid */}
        <section className="card mb-6">
          <h2 className="text-2xl font-bold mb-4">Theme Colors</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ColorSwatch name="Background" var="--background" />
            <ColorSwatch name="Foreground" var="--foreground" />
            <ColorSwatch name="Primary" var="--primary" />
            <ColorSwatch name="Secondary" var="--secondary" />
            <ColorSwatch name="Muted" var="--muted" />
            <ColorSwatch name="Accent" var="--accent" />
            <ColorSwatch name="Destructive" var="--destructive" />
            <ColorSwatch name="Border" var="--border" />
          </div>
        </section>

        {/* Cards */}
        <section className="card mb-6">
          <h2 className="text-2xl font-bold mb-4">Card Styles</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card">
              <h3 className="font-semibold">.card</h3>
              <p className="text-secondary text-sm mt-2">Basic card style</p>
            </div>
            <div className="card card-hover">
              <h3 className="font-semibold">.card-hover</h3>
              <p className="text-secondary text-sm mt-2">Card with hover effect</p>
            </div>
            <div className="card-elevated">
              <h3 className="font-semibold">.card-elevated</h3>
              <p className="text-secondary text-sm mt-2">Elevated card with shadow</p>
            </div>
          </div>
        </section>

        {/* Buttons */}
        <section className="card mb-6">
          <h2 className="text-2xl font-bold mb-4">Buttons</h2>
          <div className="flex gap-4 flex-wrap">
            <button className="btn-primary">Primary Button</button>
            <button className="btn-secondary">Secondary Button</button>
            <button className="px-6 py-2.5 rounded-xl font-semibold bg-destructive text-destructive-foreground">
              Destructive
            </button>
          </div>
        </section>

        {/* Inputs */}
        <section className="card mb-6">
          <h2 className="text-2xl font-bold mb-4">Inputs</h2>
          <div className="space-y-4">
            <input className="input" placeholder="Default input" />
            <input className="input" placeholder="Focused input" />
            <select className="input">
              <option value="">Select an option</option>
              <option value="1">Option 1</option>
              <option value="2">Option 2</option>
              <option value="3">Option 3</option>
            </select>
          </div>
        </section>

        {/* Badges */}
        <section className="card mb-6">
          <h2 className="text-2xl font-bold mb-4">Badges</h2>
          <div className="flex gap-4 flex-wrap">
            <span className="badge-primary">Primary Badge</span>
            <span className="badge-secondary">Secondary Badge</span>
            <span className="badge" style={{ backgroundColor: 'var(--success)', color: 'white' }}>
              Success
            </span>
            <span className="badge" style={{ backgroundColor: 'var(--warning)', color: 'white' }}>
              Warning
            </span>
          </div>
        </section>

        {/* Text Styles */}
        <section className="card mb-6">
          <h2 className="text-2xl font-bold mb-4">Text Styles</h2>
          <div className="space-y-2">
            <p className="text-primary">.text-primary - Primary text color</p>
            <p className="text-secondary">.text-secondary - Secondary text color</p>
            <p className="text-tertiary text-muted-foreground">.text-tertiary - Tertiary text color</p>
            <p className="text-gradient text-2xl font-bold">.text-gradient - Gradient text</p>
          </div>
        </section>

        {/* Effects */}
        <section className="card mb-6">
          <h2 className="text-2xl font-bold mb-4">Effects & Animations</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="glass p-4 rounded-xl">
              <h3 className="font-semibold">.glass</h3>
              <p className="text-sm text-secondary">Glass morphism effect</p>
            </div>
            <div className="card hover-lift p-4">
              <h3 className="font-semibold">.hover-lift</h3>
              <p className="text-sm text-secondary">Lift on hover</p>
            </div>
          </div>
        </section>

        {/* Navigation */}
        <section className="card mb-6">
          <h2 className="text-2xl font-bold mb-4">Navigation</h2>
          <div className="flex gap-2">
            <a className="nav-item nav-item-active" href="#">Active</a>
            <a className="nav-item" href="#">Normal</a>
            <a className="nav-item" href="#">Link</a>
          </div>
        </section>

        {/* Usage Code */}
        <section className="card">
          <h2 className="text-2xl font-bold mb-4">Quick Usage</h2>
          <pre className="bg-muted p-4 rounded-xl overflow-x-auto text-sm">
{`// Card Example
<div className="card card-hover">
  <h3 className="text-gradient">Title</h3>
  <p className="text-secondary">Description</p>
  <button className="btn-primary">Action</button>
</div>

// Page Layout
<div className="page-bg">
  <header className="header">...</header>
  <main>...</main>
</div>`}
          </pre>
        </section>
      </div>
    </div>
  );
}

function ColorSwatch({ name, var: cssVar }: { name: string; var: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div 
        className="h-16 rounded-lg border border-border shadow-sm"
        style={{ backgroundColor: `var(${cssVar})` }}
      />
      <div className="text-xs">
        <div className="font-semibold">{name}</div>
        <div className="text-secondary font-mono">{cssVar}</div>
      </div>
    </div>
  );
}

export default ThemeShowcase;
