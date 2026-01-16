"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'km';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('edugroit-language');
    return (saved as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('edugroit-language', language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}

// Translations
const translations: Record<Language, Record<string, string>> = {
  en: {
    // Header/Navigation
    'nav.home': 'Home',
    'nav.all': 'All',
    'nav.courses': 'Courses',
    'nav.programs': 'Programs',
    'nav.games': 'Games',
    'nav.tools': 'Tools',
    'nav.blog': 'Blog',
    'nav.account': 'Account',
    'nav.about': 'About',
    'nav.login': 'Login',
    'nav.signup': 'Sign Up',
    'nav.search': 'Search for courses...',
    
    // Hero Section
    'hero.badge': '🎓 #1 Platform for Online Learning',
    'hero.title1': 'Learn New Skills',
    'hero.title2': 'Anytime, Anywhere',
    'hero.description': 'Access 10,000+ courses from world-class instructors. Build your skills with hands-on projects and earn certificates to advance your career.',
    'hero.students': 'Students',
    'hero.learning': 'Learning Today',
    'hero.exploreBtn': 'Explore Courses',
    'hero.watchDemo': 'Watch Demo',
    
    // Stats Section
    'stats.active': 'Active Students',
    'stats.courses': 'Online Courses',
    'stats.instructors': 'Expert Instructors',
    'stats.success': 'Success Rate',
    
    // Featured Courses
    'featured.title': 'Featured Courses',
    'featured.description': 'Explore our most popular courses taught by industry experts',
    'featured.viewAll': 'View All Courses',
    
    // Why Choose Us
    'why.title': 'Why Choose Edugroit?',
    'why.description': 'We provide the best learning experience for students worldwide',
    'why.pace.title': 'Learn at Your Own Pace',
    'why.pace.description': 'Access course materials anytime, anywhere. Learn on your schedule with lifetime access to all course content.',
    'why.certificate.title': 'Industry-Recognized Certificates',
    'why.certificate.description': 'Earn certificates upon completion that you can share with employers and add to your professional profile.',
    'why.expert.title': 'Expert Instructors',
    'why.expert.description': 'Learn from industry professionals with real-world experience who are passionate about teaching.',
    
    // CTA Section
    'cta.title': 'Start Your Learning Journey Today',
    'cta.description': 'Join thousands of students already learning on Edugroit',
    'cta.getStarted': 'Get Started Free',
    'cta.browse': 'Browse Courses',
    
    // Course Cards
    'course.by': 'By',
    'course.bestseller': 'Bestseller',
    'course.new': 'New',
    'course.lessons': 'lessons',
    'course.addToCart': 'Add to Cart',
    'course.from': 'from',
    
    // Course Levels
    'level.beginner': 'Beginner',
    'level.intermediate': 'Intermediate',
    'level.advanced': 'Advanced',
    
    // Footer
    'footer.description': 'Empowering learners worldwide with high-quality online courses. Learn new skills, advance your career, and achieve your goals.',
    'footer.quickLinks': 'Quick Links',
    'footer.aboutUs': 'About Us',
    'footer.allCourses': 'All Courses',
    'footer.becomeInstructor': 'Become an Instructor',
    'footer.partnerships': 'Partnerships',
    'footer.careers': 'Careers',
    'footer.blog': 'Blog',
    'footer.support': 'Support',
    'footer.helpCenter': 'Help Center',
    'footer.faqs': 'FAQs',
    'footer.terms': 'Terms of Service',
    'footer.privacy': 'Privacy Policy',
    'footer.cookies': 'Cookie Policy',
    'footer.accessibility': 'Accessibility',
    'footer.newsletter': 'Newsletter',
    'footer.newsletterDesc': 'Subscribe to get updates on new courses and special offers.',
    'footer.emailPlaceholder': 'Enter your email',
    'footer.subscribe': 'Subscribe',
    'footer.rights': 'All rights reserved.',
    
    // Cart
    'cart.title': 'Shopping Cart',
    'cart.courses': 'course(s) in your cart',
    'cart.empty': 'Your cart is empty',
    'cart.emptyDesc': "Looks like you haven't added any courses yet",
    'cart.browseCourses': 'Browse Courses',
    'cart.continueShopping': 'Continue Shopping',
    'cart.orderSummary': 'Order Summary',
    'cart.couponCode': 'Coupon Code',
    'cart.enterCode': 'Enter code',
    'cart.subtotal': 'Subtotal',
    'cart.tax': 'Tax (10%)',
    'cart.discount': 'Discount',
    'cart.total': 'Total',
    'cart.checkout': 'Proceed to Checkout',
    'cart.guarantee': '30-Day Money-Back Guarantee',
    'cart.lifetime': 'Lifetime Access to Courses',
    'cart.certificate': 'Certificate of Completion',
    
    // Add to Cart Modal
    'modal.addToCart': 'Add to Cart',
    'modal.selectDuration': 'Select Duration',
    'modal.quantity': 'Quantity',
    'modal.total': 'Total',
    'modal.close': 'Close',
    'modal.confirm': 'Confirm',
    'modal.10days': '10 Days',
    'modal.1month': '1 Month',
    'modal.1year': '1 Year',
    'modal.under1month': 'Under 1 Month',
    'modal.under1year': 'Under 1 Year',
    'modal.fullAccess': 'Full Access',
    
    // Login Page
    'login.title': 'Welcome Back!',
    'login.description': 'Sign in to continue your learning journey',
    'login.google': 'Continue with Google',
    'login.facebook': 'Continue with Facebook',
    'login.email': 'Or continue with email',
    'login.emailLabel': 'Email Address',
    'login.emailPlaceholder': 'you@example.com',
    'login.passwordLabel': 'Password',
    'login.passwordPlaceholder': 'Enter your password',
    'login.remember': 'Remember me',
    'login.forgot': 'Forgot password?',
    'login.signin': 'Sign In',
    'login.noAccount': "Don't have an account?",
    'login.signupLink': 'Sign up for free',
    'login.backHome': '← Back to Home',
    
    // Register Page
    'register.title': 'Create Your Account',
    'register.description': 'Start learning today with Edugroit',
    'register.google': 'Sign up with Google',
    'register.facebook': 'Sign up with Facebook',
    'register.email': 'Or sign up with email',
    'register.fullName': 'Full Name',
    'register.namePlaceholder': 'John Doe',
    'register.emailLabel': 'Email Address',
    'register.emailPlaceholder': 'you@example.com',
    'register.passwordLabel': 'Password',
    'register.passwordPlaceholder': 'Create a password',
    'register.confirmPassword': 'Confirm Password',
    'register.confirmPlaceholder': 'Confirm your password',
    'register.agreeTerms': 'I agree to the',
    'register.termsLink': 'Terms of Service',
    'register.and': 'and',
    'register.privacyLink': 'Privacy Policy',
    'register.createAccount': 'Create Account',
    'register.haveAccount': 'Already have an account?',
    'register.signinLink': 'Sign in',
    'register.backHome': '← Back to Home',
    
    // Courses Page
    'courses.title': 'Explore Our Courses',
    'courses.description': 'Discover courses in web development, design, business, and more',
    'courses.filters': 'Filters',
    'courses.categories': 'Categories',
    'courses.sortBy': 'Sort By',
    'courses.popular': 'Most Popular',
    'courses.rating': 'Highest Rated',
    'courses.priceLow': 'Price: Low to High',
    'courses.priceHigh': 'Price: High to Low',
    'courses.available': 'courses available',
    'courses.clearFilter': 'Clear Filter',
    'courses.noResults': 'No courses found',
    'courses.noResultsDesc': "Try adjusting your filters to find what you're looking for",
    'courses.viewAll': 'View All Courses',
    
    // Course Detail
    'detail.createdBy': 'Created by',
    'detail.students': 'students',
    'detail.addToCart': 'Add to Cart',
    'detail.buyNow': 'Buy Now',
    'detail.includes': 'This course includes:',
    'detail.video': 'on-demand video',
    'detail.resources': 'Downloadable resources',
    'detail.access': 'Full lifetime access',
    'detail.certificate': 'Certificate of completion',
    'detail.overview': 'Overview',
    'detail.curriculum': 'Curriculum',
    'detail.reviews': 'Reviews',
    'detail.about': 'About This Course',
    'detail.whatLearn': "What You'll Learn",
    'detail.requirements': 'Requirements',
    'detail.courseCurriculum': 'Course Curriculum',
    'detail.preview': 'Preview',
    'detail.studentReviews': 'Student Reviews',
    'detail.instructor': 'Your Instructor',
    'detail.expertInstructor': 'Expert Instructor',
    'detail.instructorRating': 'Instructor Rating',
  },
  km: {
    // Header/Navigation
    'nav.home': 'ទំព័រដើម',
    'nav.all': 'ទាំងអស់',
    'nav.courses': 'វគ្គសិក្សា',
    'nav.programs': 'កម្មវិធី',
    'nav.games': 'ហ្គេម',
    'nav.tools': 'ឧបករណ៍',
    'nav.blog': 'វីដេអូ',
    'nav.account': 'គណនី',
    'nav.about': 'អំពីយើង',
    'nav.login': 'ចូលគណនី',
    'nav.signup': 'ចុះឈ្មោះ',
    'nav.search': 'ស្វែងរកវគ្គសិក្សា...',
    
    // Hero Section
    'hero.badge': '🎓 វេទិកាអនឡាញលេខ 1 សម្រាប់ការសិក្សា',
    'hero.title1': 'រៀនជំនាញថ្មី',
    'hero.title2': 'គ្រប់ពេលវេលា គ្រប់ទីកន្លែង',
    'hero.description': 'ចូលប្រើវគ្គសិក្សាជាង 10,000+ ពីគ្រូបង្រៀនដ៏ល្អបំផុត។ បង្កើនជំនាញរបស់អ្នកជាមួយគម្រោងអនុវត្តជាក់ស្តែង និងទទួលបានវិញ្ញាបនប័ត្រដើម្បីបង្កើនអាជីពរបស់អ្នក។',
    'hero.students': 'សិស្ស',
    'hero.learning': 'កំពុងសិក្សា',
    'hero.exploreBtn': 'ស្វែងរកវគ្គសិក្សា',
    'hero.watchDemo': 'មើលការបង្ហាញ',
    
    // Stats Section
    'stats.active': 'សិស្សសកម្ម',
    'stats.courses': 'វគ្គសិក្សាអនឡាញ',
    'stats.instructors': 'គ្រូបង្រៀនជំនាញ',
    'stats.success': 'អត្រាជោគជ័យ',
    
    // Featured Courses
    'featured.title': 'វគ្គសិក្សាពិសេស',
    'featured.description': 'រុករកវគ្គសិក្សាពេញនិយមបំផុតរបស់យើងដែលបង្រៀនដោយអ្នកជំនាញក្នុងឧស្សាហកម្ម',
    'featured.viewAll': 'មើលវគ្គសិក្សាទាំងអស់',
    
    // Why Choose Us
    'why.title': 'ហេតុអ្វីជ្រើសរើស Edugroit?',
    'why.description': 'យើងផ្តល់នូវបទពិសោធន៍សិក្សាល្អបំផុតសម្រាប់សិស្សទូទាំងពិភពលោក',
    'why.pace.title': 'រៀនតាមល្បឿនរបស់អ្នក',
    'why.pace.description': 'ចូលប្រើសម្ភារសិក្សាគ្រប់ពេលវេលា គ្រប់ទីកន្លែង។ រៀនតាមកាលវិភាគរបស់អ្នកជាមួយនឹងការចូលប្រើមួយជីវិតទៅកាន់មាតិកាវគ្គសិក្សាទាំងអស់។',
    'why.certificate.title': 'វិញ្ញាបនប័ត្រទទួលស្គាល់ដោយឧស្សាហកម្ម',
    'why.certificate.description': 'ទទួលបានវិញ្ញាបនប័ត្រនៅពេលបញ្ចប់ ដែលអ្នកអាចចែករំលែកជាមួយនិយោជក និងបន្ថែមទៅកាន់ប្រវត្តិរូបវិជ្ជាជីវៈរបស់អ្នក។',
    'why.expert.title': 'គ្រូបង្រៀនជំនាញ',
    'why.expert.description': 'រៀនពីអ្នកជំនាញឧស្សាហកម្មដែលមានបទពិសោធន៍ពិតប្រាកដ និងមានចិត្តចង់បង្រៀន។',
    
    // CTA Section
    'cta.title': 'ចាប់ផ្តើមការធ្វើដំណើរសិក្សារបស់អ្នកថ្ងៃនេះ',
    'cta.description': 'ចូលរួមជាមួយសិស្សរាប់ពាន់នាក់ដែលកំពុងសិក្សានៅលើ Edugroit',
    'cta.getStarted': 'ចាប់ផ្តើមដោយឥតគិតថ្លៃ',
    'cta.browse': 'រុករកវគ្គសិក្សា',
    
    // Course Cards
    'course.by': 'ដោយ',
    'course.bestseller': 'លក់ដាច់បំផុត',
    'course.new': 'ថ្មី',
    'course.lessons': 'មេរៀន',
    'course.addToCart': 'បន្ថែមទៅកន្ត្រក',
    'course.from': 'ពី',
    
    // Course Levels
    'level.beginner': 'កម្រិតដើម',
    'level.intermediate': 'កម្រិតមធ្យម',
    'level.advanced': 'កម្រិតខ្ពស់',
    
    // Footer
    'footer.description': 'ផ្តល់សិទ្ធិអំណាចដល់អ្នកសិក្សាទូទាំងពិភពលោកជាមួយនឹងវគ្គសិក្សាអនឡាញដែលមានគុណភាពខ្ពស់។ រៀនជំនាញថ្មី បង្កើនអាជីពរបស់អ្នក និងសម្រេចបាននូវគោលដៅរបស់អ្នក។',
    'footer.quickLinks': 'តំណរហ័ស',
    'footer.aboutUs': 'អំពីយើង',
    'footer.allCourses': 'វគ្គសិក្សាទាំងអស់',
    'footer.becomeInstructor': 'ក្លាយជាគ្រូបង្រៀន',
    'footer.partnerships': 'ភាពជាដៃគូ',
    'footer.careers': 'ការងារ',
    'footer.blog': 'ប្លុក',
    'footer.support': 'ជំនួយ',
    'footer.helpCenter': 'មជ្ឈមណ្ឌលជំនួយ',
    'footer.faqs': 'សំណួរញឹកញាប់',
    'footer.terms': 'លក្ខខណ្ឌសេវាកម្ម',
    'footer.privacy': 'គោលការណ៍​ភាព​ឯកជន',
    'footer.cookies': 'គោលការណ៍ Cookie',
    'footer.accessibility': 'ភាពអាចចូលប្រើបាន',
    'footer.newsletter': 'ព័ត៌មានព្រឹត្តិបត្រ',
    'footer.newsletterDesc': 'ជាវដើម្បីទទួលបានការអាប់ដេតអំពីវគ្គសិក្សាថ្មី និងការផ្តល់ជូនពិសេស។',
    'footer.emailPlaceholder': 'បញ្ចូលអ៊ីមែលរបស់អ្នក',
    'footer.subscribe': 'ជាវ',
    'footer.rights': 'រក្សាសិទ្ធិគ្រប់យ៉ាង។',
    
    // Cart
    'cart.title': 'កន្ត្រកទិញទំនិញ',
    'cart.courses': 'វគ្គសិក្សានៅក្នុងកន្ត្រករបស់អ្នក',
    'cart.empty': 'កន្ត្រករបស់អ្នកទទេ',
    'cart.emptyDesc': 'មើលទៅហាក់ដូចជាអ្នកមិនទាន់បន្ថែមវគ្គសិក្សាណាមួយនៅឡើយទេ',
    'cart.browseCourses': 'រុករកវគ្គសិក្សា',
    'cart.continueShopping': 'បន្តទិញទំនិញ',
    'cart.orderSummary': 'សង្ខេបការបញ្ជាទិញ',
    'cart.couponCode': 'លេខកូដកូពុង',
    'cart.enterCode': 'បញ្ចូលលេខកូដ',
    'cart.subtotal': 'សរុបរង',
    'cart.tax': 'ពន្ធ (10%)',
    'cart.discount': 'បញ្ចុះតម្លៃ',
    'cart.total': 'សរុប',
    'cart.checkout': 'បន្តទៅការទូទាត់',
    'cart.guarantee': 'ការធានាសងប្រាក់វិញ 30 ថ្ងៃ',
    'cart.lifetime': 'ចូលប្រើមួយជីវិតទៅកាន់វគ្គសិក្សា',
    'cart.certificate': 'វិញ្ញាបនប័ត្របញ្ចប់',
    
    // Add to Cart Modal
    'modal.addToCart': 'បន្ថែមទៅកន្ត្រក',
    'modal.selectDuration': 'ជ្រើសរើសរយៈពេល',
    'modal.quantity': 'បរិមាណ',
    'modal.total': 'សរុប',
    'modal.close': 'បិទ',
    'modal.confirm': 'បញ្ជាក់',
    'modal.10days': '10 ថ្ងៃ',
    'modal.1month': '1 ខែ',
    'modal.1year': '1 ឆ្នាំ',
    'modal.under1month': 'តិចជាង 1 ខែ',
    'modal.under1year': 'តិចជាង 1 ឆ្នាំ',
    'modal.fullAccess': 'ចូលប្រើពេញលីមួយជីវិត',
    
    // Login Page
    'login.title': 'សូមស្វាគមន៍ការត្រឡប់មកវិញ!',
    'login.description': 'ចូលគណនីដើម្បីបន្តដំណើរសិក្សារបស់អ្នក',
    'login.google': 'បន្តជាមួយ Google',
    'login.facebook': 'បន្តជាមួយ Facebook',
    'login.email': 'ឬបន្តជាមួយអ៊ីមែល',
    'login.emailLabel': 'អាសយដ្ឋានអ៊ីមែល',
    'login.emailPlaceholder': 'you@example.com',
    'login.passwordLabel': 'ពាក្យសម្ងាត់',
    'login.passwordPlaceholder': 'បញ្ចូលពាក្យសម្ងាត់',
    'login.remember': 'ចងចាំខ្ញុំ',
    'login.forgot': 'ភ្លេចពាក្យសម្ងាត់?',
    'login.signin': 'ចូលគណនី',
    'login.noAccount': 'មិនមានគណនី?',
    'login.signupLink': 'ចុះឈ្មោះដោយឥតគិតថ្លៃ',
    'login.backHome': '← ត្រឡប់ទៅទំព័រដើម',
    
    // Register Page
    'register.title': 'បង្កើតគណនីរបស់អ្នក',
    'register.description': 'ចាប់ផ្តើមសិក្សាថ្ងៃនេះជាមួយ Edugroit',
    'register.google': 'ចុះឈ្មោះជាមួយ Google',
    'register.facebook': 'ចុះឈ្មោះជាមួយ Facebook',
    'register.email': 'ឬចុះឈ្មោះជាមួយអ៊ីមែល',
    'register.fullName': 'ឈ្មោះពេញ',
    'register.namePlaceholder': 'ឈ្មោះរបស់អ្នក',
    'register.emailLabel': 'អាសយដ្ឋានអ៊ីមែល',
    'register.emailPlaceholder': 'you@example.com',
    'register.passwordLabel': 'ពាក្យសម្ងាត់',
    'register.passwordPlaceholder': 'បង្កើតពាក្យសម្ងាត់',
    'register.confirmPassword': 'បញ្ជាក់ពាក្យសម្ងាត់',
    'register.confirmPlaceholder': 'បញ្ជាក់ពាក្យសម្ងាត់របស់អ្នក',
    'register.agreeTerms': 'ខ្ញុំយល់ព្រមនឹង',
    'register.termsLink': 'លក្ខខណ្ឌសេវាកម្ម',
    'register.and': 'និង',
    'register.privacyLink': 'គោលការណ៍ភាពឯកជន',
    'register.createAccount': 'បង្កើតគណនី',
    'register.haveAccount': 'មានគណនីរួចហើយ?',
    'register.signinLink': 'ចូលគណនី',
    'register.backHome': '← ត្រឡប់ទៅទំព័រដើម',
 
    // Profile 
    'profile.chooseAvatar': 'ជ្រើសរូបអវតារ',
    'profile.joined': 'ចូលរួមតាំងពី',
    'profile.settings': 'ការកំណត់',
    'profile.logout': 'ចាកចេញ',
    'profile.overview': 'ទិដ្ឋភាពទូទៅ',
    'profile.myCourses': 'វគ្គសិក្សារបស់ខ្ញុំ',
    'profile.about': 'អំពីខ្ញុំ',
    'profile.edit': 'កែប្រែ',
    'profile.cancel': 'បោះបង់',
    'profile.saveChanges': 'រក្សាទុកការផ្លាស់ប្តូរ',

    'profile.bioPlaceholder': 'ពណ៌នា​ខ្លី',
    'profile.fullName': 'ឈ្មោះពេញ',
    'profile.phone': '+855 ...',
    'profile.location': 'កម្ពុជា',
    'profile.passionate': 'ស្រលាញ់ការសិក្សា និងបច្ចេកវិទ្យា',

    'profile.language': 'ភាសា',
    'profile.theme': 'រចនាប័ទ្ម',
    'profile.switch': 'ប្តូរ',

    'profile.enrolled': 'បានចុះឈ្មោះ',
    'profile.completed': 'បានបញ្ចប់',
    'profile.hours': 'ម៉ោង',
    'profile.certificates': 'វិញ្ញាបនបត្រ',

    'profile.deleteAccount': 'លុបគណនី',
    'profile.deleteWarnTitle': 'លុបគណនីមែនទេ?',
    'profile.deleteWarnBody': 'វានឹងបិទគណនី (deleted_at) ហើយអ្នកនឹងត្រូវចាកចេញ។',
    'profile.confirmDelete': 'វាយ DELETE ដើម្បីបញ្ជាក់',
    'profile.confirm': 'បញ្ជាក់',
    'profile.close': 'បិទ',
  
    // Courses Page
    'courses.title': 'ស្វែងរកវគ្គសិក្សារបស់យើង',
    'courses.description': 'រកឃើញវគ្គសិក្សាក្នុងការអភិវឌ្ឍន៍គេហទំព័រ ការរចនា អាជីវកម្ម និងច្រើនទៀត',
    'courses.filters': 'តម្រង',
    'courses.categories': 'ប្រភេទ',
    'courses.sortBy': 'តម្រៀបតាម',
    'courses.popular': 'ពេញនិយមបំផុត',
    'courses.rating': 'ការវាយតម្លៃខ្ពស់បំផុត',
    'courses.priceLow': 'តម្លៃ: ពីទាបទៅខ្ពស់',
    'courses.priceHigh': 'តម្លៃ: ពីខ្ពស់ទៅទាប',
    'courses.available': 'វគ្គសិក្សាមាន',
    'courses.clearFilter': 'សម្អាតតម្រង',
    'courses.noResults': 'រកមិនឃើញវគ្គសិក្សា',
    'courses.noResultsDesc': 'សូមព្យាយាមកែតម្រងរបស់អ្នកដើម្បីស្វែងរកអ្វីដែលអ្នកកំពុងស្វែងរក',
    'courses.viewAll': 'មើលវគ្គសិក្សាទាំងអស់',
    
    // Course Detail
    'detail.createdBy': 'បង្កើតដោយ',
    'detail.students': 'សិស្ស',
    'detail.addToCart': 'បន្ថែមទៅកន្ត្រក',
    'detail.buyNow': 'ទិញឥឡូវនេះ',
    'detail.includes': 'វគ្គសិក្សានេះរួមបញ្ចូល:',
    'detail.video': 'វីដេអូតាមតម្រូវការ',
    'detail.resources': 'ធនធានដែលអាចទាញយកបាន',
    'detail.access': 'ការចូលប្រើពេញមួយជីវិត',
    'detail.certificate': 'វិញ្ញាបនប័ត្របញ្ចប់',
    'detail.overview': 'ទិដ្ឋភាពទូទៅ',
    'detail.curriculum': 'កម្មវិធីសិក្សា',
    'detail.reviews': 'សម្រង់',
    'detail.about': 'អំពីវគ្គសិក្សានេះ',
    'detail.whatLearn': 'អ្វីដែលអ្នកនឹងរៀន',
    'detail.requirements': 'តម្រូវការ',
    'detail.courseCurriculum': 'កម្មវិធីសិក្សាវគ្គ',
    'detail.preview': 'មើលជាមុន',
    'detail.studentReviews': 'សម្រង់របស់សិស្ស',
    'detail.instructor': 'គ្រូបង្រៀនរបស់អ្នក',
    'detail.expertInstructor': 'គ្រូបង្រៀនជំនាញ',
    'detail.instructorRating': 'ការវាយតម្លៃគ្រូបង្រៀន',
  }
};