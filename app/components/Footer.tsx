import { Facebook, Twitter, Instagram, Linkedin, Youtube, Mail, Phone, MapPin } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useLanguage } from '../contexts/LanguageContext';

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { t } = useLanguage();

  return (
    <footer className="bg-gray-900 dark:bg-gray-950 text-gray-300">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">E</span>
              </div>
              <span className="text-2xl font-bold text-white">Edugroit</span>
            </div>
            <p className="text-sm text-gray-400">
              {t('footer.description')}
            </p>
            
            {/* Social Links */}
            <div className="flex space-x-4">
              <a href="#" className="w-8 h-8 bg-gray-800 dark:bg-gray-900 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" className="w-8 h-8 bg-gray-800 dark:bg-gray-900 rounded-full flex items-center justify-center hover:bg-blue-400 transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="w-8 h-8 bg-gray-800 dark:bg-gray-900 rounded-full flex items-center justify-center hover:bg-pink-600 transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="w-8 h-8 bg-gray-800 dark:bg-gray-900 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors">
                <Linkedin className="w-4 h-4" />
              </a>
              <a href="#" className="w-8 h-8 bg-gray-800 dark:bg-gray-900 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                <Youtube className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t('footer.quickLinks')}</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-sm hover:text-blue-400 transition-colors">{t('footer.aboutUs')}</a></li>
              <li><a href="#" className="text-sm hover:text-blue-400 transition-colors">{t('footer.allCourses')}</a></li>
              <li><a href="#" className="text-sm hover:text-blue-400 transition-colors">{t('footer.becomeInstructor')}</a></li>
              <li><a href="#" className="text-sm hover:text-blue-400 transition-colors">{t('footer.partnerships')}</a></li>
              <li><a href="#" className="text-sm hover:text-blue-400 transition-colors">{t('footer.careers')}</a></li>
              <li><a href="#" className="text-sm hover:text-blue-400 transition-colors">{t('footer.blog')}</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t('footer.support')}</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-sm hover:text-blue-400 transition-colors">{t('footer.helpCenter')}</a></li>
              <li><a href="#" className="text-sm hover:text-blue-400 transition-colors">{t('footer.faqs')}</a></li>
              <li><a href="#" className="text-sm hover:text-blue-400 transition-colors">{t('footer.terms')}</a></li>
              <li><a href="#" className="text-sm hover:text-blue-400 transition-colors">{t('footer.privacy')}</a></li>
              <li><a href="#" className="text-sm hover:text-blue-400 transition-colors">{t('footer.cookies')}</a></li>
              <li><a href="#" className="text-sm hover:text-blue-400 transition-colors">{t('footer.accessibility')}</a></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t('footer.newsletter')}</h3>
            <p className="text-sm text-gray-400 mb-4">
              {t('footer.newsletterDesc')}
            </p>
            <div className="space-y-3">
              <Input
                type="email"
                placeholder={t('footer.emailPlaceholder')}
                className="bg-gray-800 dark:bg-gray-900 border-gray-700 dark:border-gray-800 text-white placeholder:text-gray-500"
              />
              <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                {t('footer.subscribe')}
              </Button>
            </div>
            
            {/* Contact Info */}
            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-blue-400" />
                <span>support@edugroit.com</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-blue-400" />
                <span>+1 (555) 123-4567</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 text-blue-400 mt-0.5" />
                <span>123 Learning St, Education City, EC 12345</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800 dark:border-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-400">
              © {currentYear} Edugroit. {t('footer.rights')}
            </p>
            <div className="flex flex-wrap gap-6 text-sm text-gray-400">
              <a href="#" className="hover:text-blue-400 transition-colors">{t('footer.terms')}</a>
              <a href="#" className="hover:text-blue-400 transition-colors">{t('footer.privacy')}</a>
              <a href="#" className="hover:text-blue-400 transition-colors">{t('footer.cookies')}</a>
              <a href="#" className="hover:text-blue-400 transition-colors">Sitemap</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}