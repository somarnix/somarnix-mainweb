import { Button } from './ui/button';
import { Play, Star, Users } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface HeroProps {
  onNavigate: (page: string) => void;
}

export function Hero({ onNavigate }: HeroProps) {
  const { t } = useLanguage();
  
  return (
    <section className="relative bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-900 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8 z-10">
            <div className="inline-block">
              <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-semibold">
                {t('hero.badge')}
              </span>
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
              {t('hero.title1')}
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {t('hero.title2')}
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
              {t('hero.description')}
            </p>

            {/* Stats */}
            <div className="flex flex-wrap gap-6 items-center">
              <div className="flex items-center space-x-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 border-2 border-white dark:border-gray-800"
                    />
                  ))}
                </div>
                <div className="text-sm">
                  <div className="font-semibold text-gray-900 dark:text-white">500K+ {t('hero.students')}</div>
                  <div className="text-gray-500 dark:text-gray-400">{t('hero.learning')}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-1">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="ml-2 text-sm font-semibold text-gray-900 dark:text-white">4.8/5.0</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4">
              <Button
                size="lg"
                onClick={() => onNavigate('courses')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-6 text-lg shadow-lg shadow-blue-500/30"
              >
                {t('hero.exploreBtn')}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 px-8 py-6 text-lg dark:border-gray-600 dark:text-white"
              >
                <Play className="w-5 h-5 mr-2" />
                {t('hero.watchDemo')}
              </Button>
            </div>
          </div>

          {/* Right Content - Image/Visual */}
          <div className="relative lg:block hidden">
            <div className="relative">
              {/* Main Image */}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1629359652978-a5d383151c4c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvbmxpbmUlMjBsZWFybmluZyUyMHN0dWRlbnR8ZW58MXx8fHwxNzY3NjY4NTY5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                  alt="Student learning online"
                  className="w-full h-[500px] object-cover"
                />
              </div>

              {/* Floating Cards */}
              <div className="absolute -bottom-6 -left-6 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white">125K+</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{t('stats.active')}</div>
                  </div>
                </div>
              </div>

              <div className="absolute -top-6 -right-6 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                    <Star className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white">4.9 Rating</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">From 50K+ Reviews</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Background Decorations */}
            <div className="absolute top-1/4 -right-12 w-72 h-72 bg-purple-200 dark:bg-purple-900/50 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
            <div className="absolute bottom-1/4 -left-12 w-72 h-72 bg-blue-200 dark:bg-blue-900/50 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          </div>
        </div>
      </div>

      {/* Wave Divider */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            fill="currentColor"
            className="text-white dark:text-gray-900"
          />
        </svg>
      </div>
    </section>
  );
}