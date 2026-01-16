import { Layers, Zap, Shield, Award, Headphones, BookOpen } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface ServicesPageProps {
  onNavigate: (page: string) => void;
}

export function ServicesPage({ onNavigate }: ServicesPageProps) {
  const { language } = useLanguage();

  const services = [
    {
      icon: <BookOpen className="w-8 h-8" />,
      title: language === 'km' ? 'វគ្គសិក្សាពេញលេញ' : 'Comprehensive Courses',
      titleKm: 'វគ្គសិក្សាពេញលេញ',
      description: language === 'km' 
        ? 'ចូលប្រើវគ្គសិក្សារាប់ពាន់ដើម្បីរៀនជំនាញថ្មី' 
        : 'Access thousands of courses to learn new skills',
      descriptionKm: 'ចូលប្រើវគ្គសិក្សារាប់ពាន់ដើម្បីរៀនជំនាញថ្មី',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: language === 'km' ? 'ការរៀនលឿន' : 'Fast Learning',
      titleKm: 'ការរៀនលឿន',
      description: language === 'km' 
        ? 'រៀនតាមល្បឿនរបស់អ្នកជាមួយវីដេអូដែលមានគុណភាពខ្ពស់' 
        : 'Learn at your own pace with high-quality videos',
      descriptionKm: 'រៀនតាមល្បឿនរបស់អ្នកជាមួយវីដេអូដែលមានគុណភាពខ្ពស់',
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: language === 'km' ? 'សញ្ញាបត្រ' : 'Certificates',
      titleKm: 'សញ្ញាបត្រ',
      description: language === 'km' 
        ? 'ទទួលបានសញ្ញាបត្រនៅពេលបញ្ចប់វគ្គសិក្សា' 
        : 'Earn certificates upon course completion',
      descriptionKm: 'ទទួលបានសញ្ញាបត្រនៅពេលបញ្ចប់វគ្គសិក្សា',
      color: 'from-green-500 to-green-600'
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: language === 'km' ? 'ការទូទាត់សុវត្ថិភាព' : 'Secure Payments',
      titleKm: 'ការទូទាត់សុវត្ថិភាព',
      description: language === 'km' 
        ? 'ការទូទាត់សុវត្ថិភាពតាមរយៈ ABA PayWay' 
        : 'Safe and secure payments via ABA PayWay',
      descriptionKm: 'ការទូទាត់សុវត្ថិភាពតាមរយៈ ABA PayWay',
      color: 'from-red-500 to-red-600'
    },
    {
      icon: <Headphones className="w-8 h-8" />,
      title: language === 'km' ? 'ជំនួយ 24/7' : '24/7 Support',
      titleKm: 'ជំនួយ 24/7',
      description: language === 'km' 
        ? 'ក្រុមជំនួយរបស់យើងរង់ចាំជួយអ្នក' 
        : 'Our support team is here to help you',
      descriptionKm: 'ក្រុមជំនួយរបស់យើងរង់ចាំជួយអ្នក',
      color: 'from-orange-500 to-orange-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
              <Layers className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {language === 'km' ? 'សេវាកម្មរបស់យើង' : 'Our Services'}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {language === 'km' 
              ? 'យើងផ្តល់សេវាកម្មគុណភាពខ្ពស់ដើម្បីជួយអ្នករៀនសូត្រនិងអភិវឌ្ឍន៍ជំនាញ' 
              : 'We provide high-quality services to help you learn and develop your skills'}
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {services.map((service, index) => (
            <div 
              key={index}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <div className={`w-16 h-16 bg-gradient-to-r ${service.color} rounded-xl flex items-center justify-center mb-6 text-white`}>
                {service.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                {service.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {service.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            {language === 'km' ? 'ចាប់ផ្តើមការរៀនរបស់អ្នក' : 'Start Your Learning Journey'}
          </h2>
          <p className="text-lg mb-8 text-blue-100">
            {language === 'km' 
              ? 'ចូលរួមជាមួយសិស្សរាប់ពាន់នាក់ដែលកំពុងរៀនសូត្រជាមួយយើង' 
              : 'Join thousands of students learning with us'}
          </p>
          <button
            onClick={() => onNavigate('courses')}
            className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-4 rounded-xl font-bold text-lg transition-colors shadow-lg"
          >
            {language === 'km' ? 'រុករកវគ្គសិក្សា' : 'Browse Courses'}
          </button>
        </div>
      </div>
    </div>
  );
}
