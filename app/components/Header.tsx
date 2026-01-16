// app\components\Header.tsx
import { useState } from 'react';
import { ShoppingCart, Menu, X, Search, User, Globe, Moon, Sun, LogOut, Settings, BookOpen, Wallet, MoreVertical, DollarSign, Package, FileText, Layers, ChevronRight, Facebook, Youtube, Send } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';

interface HeaderProps {
  onNavigate: (page: string) => void;
  currentPage: string;
  cartCount: number;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
}

export function Header({ onNavigate, currentPage, cartCount, sidebarOpen, setSidebarOpen, mobileSidebarOpen, setMobileSidebarOpen }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountPopupOpen, setAccountPopupOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const { currency, setCurrency, formatPrice, balance } = useCurrency();

  const navLinks = [
    { name: t('nav.home'), value: 'home' },
    { name: t('nav.all'), value: 'all' },
    { name: t('nav.courses'), value: 'courses' },
    { name: t('nav.programs'), value: 'programs' },
    { name: t('nav.games'), value: 'games' },
    { name: t('nav.tools'), value: 'tools' },
    { name: t('nav.blog'), value: 'blog' },
    { name: t('nav.about'), value: 'about' }
  ];

  const handleLogout = () => {
    logout();
    setAccountPopupOpen(false);
    onNavigate('home');
  };

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 shadow-sm transition-colors">
      {/* Top Bar - Currency, Language, Theme, Social Icons */}
      <div className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-10">
            {/* Left Side - Currency, Language, Dark Mode */}
            <div className="flex items-center gap-2 md:gap-4">
              {/* Currency Switcher */}
              <button
                onClick={() => setCurrency(currency === 'USD' ? 'KHR' : 'USD')}
                className="flex items-center gap-1 px-2 md:px-3 py-1 rounded text-xs md:text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title={currency === 'USD' ? 'Switch to KHR' : 'Switch to USD'}
              >
                <DollarSign className="w-3 h-3 md:w-4 md:h-4" />
                <span className="font-semibold">{currency}</span>
              </button>

              {/* Language Switcher */}
              <button
                onClick={() => setLanguage(language === 'en' ? 'km' : 'en')}
                className="flex items-center gap-1 px-2 md:px-3 py-1 rounded text-xs md:text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title={language === 'en' ? 'Switch to Khmer' : 'Switch to English'}
              >
                <Globe className="w-3 h-3 md:w-4 md:h-4" />
                <span className="font-medium">{language === 'en' ? 'ភាសាខ្មែរ' : 'EN'}</span>
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="flex items-center gap-1 px-2 md:px-3 py-1 rounded text-xs md:text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              >
                {theme === 'light' ? <Moon className="w-3 h-3 md:w-4 md:h-4" /> : <Sun className="w-3 h-3 md:w-4 md:h-4" />}
                <span className="font-medium hidden sm:inline">{theme === 'light' ? 'Dark' : 'Light'}</span>
              </button>
            </div>

            {/* Right Side - Social Media Icons */}
            <div className="flex items-center gap-2 md:gap-3">
              <a
                href="https://www.youtube.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                title="YouTube"
              >
                <Youtube className="w-4 h-4 md:w-5 md:h-5" />
              </a>
              
              <a
                href="https://www.youtube.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title="Facebook"
              >
                <Facebook className="w-4 h-4 md:w-5 md:h-5" />
              </a>
              
              <a
                href="https://www.youtube.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-400 dark:hover:text-blue-300 transition-colors"
                title="Telegram"
              >
                <Send className="w-4 h-4 md:w-5 md:h-5" />
              </a>
              
              <a
                href="https://www.youtube.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                title="TikTok"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left: Hamburger Menu + Logo */}
          <div className="flex items-center gap-3">
            {/* Hamburger Menu Toggle - Desktop */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden md:block p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            </button>

            {/* Hamburger Menu Toggle - Mobile */}
            <button
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            </button>

            {/* Logo */}
            <button 
              onClick={() => onNavigate('home')}
              className="flex items-center space-x-2"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-lg sm:text-xl">E</span>
              </div>
              <span className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent whitespace-nowrap">
                Edugroit
              </span>
            </button>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <button
                key={link.value}
                onClick={() => onNavigate(link.value)}
                className={`text-sm font-medium transition-colors hover:text-blue-600 dark:hover:text-blue-400 ${
                  currentPage === link.value ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {link.name}
              </button>
            ))}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Search Icon */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Cart */}
            <button
              onClick={() => onNavigate('cart')}
              className="relative p-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            {/* User Account Icon - Desktop */}
            {isAuthenticated && user ? (
              <div className="relative hidden md:block">
                <button
                  onClick={() => setAccountPopupOpen(!accountPopupOpen)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-8 h-8 rounded-full ring-2 ring-blue-500"
                  />
                </button>

                {/* Account Popup */}
                {accountPopupOpen && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-30"
                      onClick={() => setAccountPopupOpen(false)}
                    />
                    
                    {/* Popup - Small like reference image */}
                    <div className="absolute right-0 mt-2 w-48 bg-blue-600 dark:bg-blue-700 rounded-lg shadow-2xl overflow-hidden z-40">
                      {/* User Info Header */}
                      <div className="px-4 py-3 bg-blue-700 dark:bg-blue-800 border-b border-blue-500">
                        <div className="text-xs font-bold text-white truncate">{user.name}</div>
                        <div className="text-xs text-blue-200 truncate">
                          {language === 'km' ? 'អត្តសញ្ញាណ' : 'User ID'}: {user.id}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => {
                          onNavigate('profile');
                          setAccountPopupOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-blue-700 dark:hover:bg-blue-800 flex items-center gap-2 font-medium transition-colors"
                      >
                        <User className="w-4 h-4" />
                        <span>{language === 'km' ? 'គណនី' : 'Account'}</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          onNavigate('profile');
                          setAccountPopupOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-blue-700 dark:hover:bg-blue-800 flex items-center gap-2 font-medium transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                        <span>{language === 'km' ? 'ប្រវត្តិទិញ' : 'Purchase History'}</span>
                      </button>
                      
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-blue-700 dark:hover:bg-blue-800 flex items-center gap-2 font-medium transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>{language === 'km' ? 'ចាកចេញ' : 'Logout'}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="hidden md:flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate('login')}
                  className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <User className="w-4 h-4 mr-2" />
                  {t('nav.login')}
                </Button>
                <Button
                  size="sm"
                  onClick={() => onNavigate('register')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {t('nav.signup')}
                </Button>
              </div>
            )}

            {/* User Account Icon - Mobile */}
            {isAuthenticated && user ? (
              <div className="relative md:hidden">
                <button
                  onClick={() => setAccountPopupOpen(!accountPopupOpen)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-8 h-8 rounded-full ring-2 ring-blue-500"
                  />
                </button>

                {/* Mobile Account Popup */}
                {accountPopupOpen && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 bg-black/50 z-40"
                      onClick={() => setAccountPopupOpen(false)}
                    />
                    
                    {/* Popup - Match PC style with 3 buttons */}
                    <div className="absolute right-0 mt-2 w-48 bg-blue-600 dark:bg-blue-700 rounded-lg shadow-2xl overflow-hidden z-50">
                      <button
                        onClick={() => {
                          onNavigate('profile');
                          setAccountPopupOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-blue-700 dark:hover:bg-blue-800 flex items-center gap-2 font-medium transition-colors"
                      >
                        <User className="w-4 h-4" />
                        <span>{language === 'km' ? 'គណនី' : 'Account'}</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          onNavigate('profile');
                          setAccountPopupOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-blue-700 dark:hover:bg-blue-800 flex items-center gap-2 font-medium transition-colors"
                      >
                        <Package className="w-4 h-4" />
                        <span>{language === 'km' ? 'ប្រវត្តិទិញ' : 'Purchase History'}</span>
                      </button>
                      
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-blue-700 dark:hover:bg-blue-800 flex items-center gap-2 font-medium transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>{language === 'km' ? 'ចាកចេញ' : 'Logout'}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => onNavigate('login')}
                className="md:hidden p-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <User className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>

        {/* Search Bar - Expandable */}
        {searchOpen && (
          <div className="pb-4 animate-in slide-in-from-top duration-300">
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder={t('nav.search')}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}