// import { useState } from 'react';
// import {
//   User,
//   BookOpen,
//   Settings,
//   Award,
//   Bell,
//   Globe,
//   LogOut,
//   Camera,
//   Mail,
//   Phone,
//   MapPin,
//   Calendar,
//   Edit2,
//   CheckCircle,
//   Clock,
//   Star,
//   TrendingUp,
//   Sun,
//   Moon
// } from 'lucide-react';
// import { Button } from '../../components/ui/button';
// import { Input } from '../../components/ui/input';
// import { Label } from '../../components/ui/label';
// import { Badge } from '../../components/ui/badge';
// import { useAuth } from '../../contexts/AuthContext';
// import { useLanguage } from '../../contexts/LanguageContext';
// import { useTheme } from '../../contexts/ThemeContext';
// import { courses } from '../../utils/courseData';

// interface ProfilePageProps {
//   onNavigate: (page: string) => void;
// }

// export function ProfilePage({ onNavigate }: ProfilePageProps) {
//   const { user, logout, updateProfile } = useAuth();
//   const { language, setLanguage, t } = useLanguage();
//   const { theme, toggleTheme } = useTheme();
//   const [activeTab, setActiveTab] = useState<'overview' | 'courses' | 'settings'>('overview');
//   const [isEditing, setIsEditing] = useState(false);
//   const [editForm, setEditForm] = useState({
//     name: user?.name || '',
//     bio: user?.bio || '',
//     phone: user?.phone || '',
//     location: user?.location || ''
//   });

//   if (!user) {
//     onNavigate('login');
//     return null;
//   }

//   // Mock enrolled courses (first 3 courses)
//   const enrolledCourses = courses.slice(0, 3);
//   const completedCourses = 12;
//   const totalHours = 156;
//   const certificates = 8;

//   const handleLogout = () => {
//     logout();
//     onNavigate('home');
//   };

//   const handleSaveProfile = () => {
//     updateProfile(editForm);
//     setIsEditing(false);
//   };

//   const tabs = [
//     { id: 'overview', name: 'Overview', icon: User },
//     { id: 'courses', name: 'My Courses', icon: BookOpen },
//     { id: 'settings', name: 'Settings', icon: Settings }
//   ];

//   return (
//     <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
//       {/* Profile Header */}
//       <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-12">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="flex flex-col md:flex-row items-center gap-6">
//             {/* Avatar */}
//             <div className="relative">
//               {/* <img
//                 src={user.avatar}
//                 alt={user.name}
//                 className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-800 shadow-xl"
//               /> */}
//               <button className="absolute bottom-0 right-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-colors shadow-lg">
//                 <Camera className="w-5 h-5" />
//               </button>
//             </div>

//             {/* User Info */}
//             <div className="flex-1 text-center md:text-left">
//               <h1 className="text-3xl font-bold text-white mb-2">{user.name}</h1>
//               <p className="text-blue-100 mb-1">{user.email}</p>
//               <p className="text-blue-200 text-sm mb-4">
//                 {language === 'km' ? 'អត្តសញ្ញាណ' : 'User ID'}: {user.id}
//               </p>
//               <div className="flex flex-wrap gap-4 justify-center md:justify-start">
//                 <div className="flex items-center gap-2 text-white">
//                   <Calendar className="w-4 h-4" />
//                   <span className="text-sm">Joined {new Date(user.joinedDate).toLocaleDateString()}</span>
//                 </div>
//                 {user.location && (
//                   <div className="flex items-center gap-2 text-white">
//                     <MapPin className="w-4 h-4" />
//                     <span className="text-sm">{user.location}</span>
//                   </div>
//                 )}
//               </div>
//             </div>

//             {/* Quick Actions */}
//             <div className="flex gap-3">
//               <Button
//                 variant="outline"
//                 className="border-2 border-white text-white hover:bg-white/10"
//                 onClick={() => setActiveTab('settings')}
//               >
//                 <Settings className="w-4 h-4 mr-2" />
//                 Settings
//               </Button>
//               <Button
//                 variant="outline"
//                 className="border-2 border-white text-white hover:bg-white/10"
//                 onClick={handleLogout}
//               >
//                 <LogOut className="w-4 h-4 mr-2" />
//                 Logout
//               </Button>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Tabs */}
//       <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-40">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           {/* <div className="flex gap-8">
//             {tabs.map((tab) => {
//               const Icon = tab.icon;
//               return (
//                 <button
//                   key={tab.id}
//                   onClick={() => setActiveTab(tab.id as any)}
//                   className={`flex items-center gap-2 py-4 border-b-2 transition-colors ${
//                     activeTab === tab.id
//                       ? 'border-blue-600 text-blue-600 dark:text-blue-400'
//                       : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
//                   }`}
//                 >
//                   <Icon className="w-5 h-5" />
//                   <span className="font-medium">{tab.name}</span>
//                 </button>
//               );
//             })}
//           </div> */}
//         </div>
//       </div>

//       {/* Content */}
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         {/* Overview Tab */}
//         {activeTab === 'overview' && (
//           <div className="space-y-6">
//             {/* Stats Cards */}
//             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
//               <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
//                 <div className="flex items-center justify-between mb-4">
//                   <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
//                     <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
//                   </div>
//                   <Badge className="bg-blue-600">Active</Badge>
//                 </div>
//                 <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{enrolledCourses.length}</div>
//                 <div className="text-sm text-gray-600 dark:text-gray-400">Enrolled Courses</div>
//               </div>

//               <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
//                 <div className="flex items-center justify-between mb-4">
//                   <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
//                     <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
//                   </div>
//                 </div>
//                 <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{completedCourses}</div>
//                 <div className="text-sm text-gray-600 dark:text-gray-400">Completed Courses</div>
//               </div>

//               <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
//                 <div className="flex items-center justify-between mb-4">
//                   <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
//                     <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
//                   </div>
//                 </div>
//                 <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{totalHours}h</div>
//                 <div className="text-sm text-gray-600 dark:text-gray-400">Learning Time</div>
//               </div>

//               <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
//                 <div className="flex items-center justify-between mb-4">
//                   <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
//                     <Award className="w-6 h-6 text-orange-600 dark:text-orange-400" />
//                   </div>
//                 </div>
//                 <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{certificates}</div>
//                 <div className="text-sm text-gray-600 dark:text-gray-400">Certificates Earned</div>
//               </div>
//             </div>

//             {/* Recent Activity */}
//             <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
//               <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
//               <div className="space-y-4">
//                 {[
//                   { action: 'Completed', course: 'Advanced React Patterns', time: '2 hours ago' },
//                   { action: 'Started', course: 'JavaScript Masterclass', time: '1 day ago' },
//                   { action: 'Earned Certificate', course: 'Web Development Bootcamp', time: '3 days ago' }
//                 ].map((activity, index) => (
//                   <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
//                     <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
//                       <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
//                     </div>
//                     <div className="flex-1">
//                       <div className="text-sm font-medium text-gray-900 dark:text-white">
//                         {activity.action} <span className="text-blue-600 dark:text-blue-400">{activity.course}</span>
//                       </div>
//                       <div className="text-xs text-gray-500 dark:text-gray-400">{activity.time}</div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </div>
//         )}

//         {/* My Courses Tab */}
//         {activeTab === 'courses' && (
//           <div className="space-y-6">
//             <div className="flex items-center justify-between">
//               <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Courses</h2>
//               <Button
//                 onClick={() => onNavigate('courses')}
//                 className="bg-gradient-to-r from-blue-600 to-purple-600"
//               >
//                 Browse More Courses
//               </Button>
//             </div>

//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//               {enrolledCourses.map((course) => (
//                 <div key={course.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
//                   {/* <img src={course.image} alt={course.title} className="w-full h-40 object-cover" /> */}
//                   <div className="p-5">
//                     <h3 className="font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">{course.title}</h3>
//                     <div className="flex items-center gap-2 mb-3">
//                       <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
//                       <span className="text-sm font-semibold text-gray-900 dark:text-white">{course.rating}</span>
//                     </div>
                    
//                     {/* Progress Bar */}
//                     <div className="mb-3">
//                       <div className="flex items-center justify-between text-sm mb-1">
//                         <span className="text-gray-600 dark:text-gray-400">Progress</span>
//                         <span className="font-semibold text-gray-900 dark:text-white">65%</span>
//                       </div>
//                       <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
//                         <div className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full" style={{ width: '65%' }}></div>
//                       </div>
//                     </div>

//                     <Button size="sm" className="w-full bg-gradient-to-r from-blue-600 to-purple-600">
//                       Continue Learning
//                     </Button>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         )}

//         {/* Settings Tab */}
//         {activeTab === 'settings' && (
//           <div className="space-y-6">
//             <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>

//             {/* About Section - Moved from Overview */}
//             <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
//               <div className="flex items-center justify-between mb-4">
//                 <h3 className="text-lg font-bold text-gray-900 dark:text-white">About</h3>
//                 <Button
//                   size="sm"
//                   variant="outline"
//                   onClick={() => setIsEditing(!isEditing)}
//                   className="dark:border-gray-600 dark:text-gray-300"
//                 >
//                   <Edit2 className="w-4 h-4 mr-2" />
//                   {isEditing ? 'Cancel' : 'Edit'}
//                 </Button>
//               </div>

//               {isEditing ? (
//                 <div className="space-y-4">
//                   <div>
//                     <Label>Full Name</Label>
//                     <Input
//                       value={editForm.name}
//                       onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
//                       className="mt-1 dark:bg-gray-900 dark:border-gray-700"
//                     />
//                   </div>
//                   <div>
//                     <Label>Bio</Label>
//                     <Input
//                       value={editForm.bio}
//                       onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
//                       className="mt-1 dark:bg-gray-900 dark:border-gray-700"
//                     />
//                   </div>
//                   <div>
//                     <Label>Phone</Label>
//                     <Input
//                       value={editForm.phone}
//                       onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
//                       className="mt-1 dark:bg-gray-900 dark:border-gray-700"
//                     />
//                   </div>
//                   <div>
//                     <Label>Location</Label>
//                     <Input
//                       value={editForm.location}
//                       onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
//                       className="mt-1 dark:bg-gray-900 dark:border-gray-700"
//                     />
//                   </div>
//                   <Button onClick={handleSaveProfile} className="bg-gradient-to-r from-blue-600 to-purple-600">
//                     Save Changes
//                   </Button>
//                 </div>
//               ) : (
//                 <div className="space-y-4">
//                   <div className="flex items-start gap-3">
//                     <User className="w-5 h-5 text-gray-400 mt-0.5" />
//                     <div>
//                       <div className="text-sm text-gray-500 dark:text-gray-400">Bio</div>
//                       <div className="text-gray-900 dark:text-white">{user.bio || 'Passionate learner and tech enthusiast'}</div>
//                     </div>
//                   </div>
//                   <div className="flex items-start gap-3">
//                     <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
//                     <div>
//                       <div className="text-sm text-gray-500 dark:text-gray-400">Email</div>
//                       <div className="text-gray-900 dark:text-white">{user.email}</div>
//                     </div>
//                   </div>
//                   <div className="flex items-start gap-3">
//                     <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
//                     <div>
//                       <div className="text-sm text-gray-500 dark:text-gray-400">Phone</div>
//                       <div className="text-gray-900 dark:text-white">{user.phone || '+1 (555) 123-4567'}</div>
//                     </div>
//                   </div>
//                   <div className="flex items-start gap-3">
//                     <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
//                     <div>
//                       <div className="text-sm text-gray-500 dark:text-gray-400">Location</div>
//                       <div className="text-gray-900 dark:text-white">{user.location || 'San Francisco, CA'}</div>
//                     </div>
//                   </div>
//                 </div>
//               )}
//             </div>

//             {/* Account Settings */}
//             <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
//               <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
//                 <User className="w-5 h-5" />
//                 Account Settings
//               </h3>
//               <div className="space-y-4">
//                 <div>
//                   <Label>Email Address</Label>
//                   <Input value={user.email} disabled className="mt-1 dark:bg-gray-900 dark:border-gray-700" />
//                 </div>
//                 <Button variant="outline" className="dark:border-gray-600 dark:text-gray-300">
//                   Change Password
//                 </Button>
//               </div>
//             </div>

//             {/* Preferences */}
//             <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
//               <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
//                 <Settings className="w-5 h-5" />
//                 Preferences
//               </h3>
//               <div className="space-y-4">
//                 <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
//                   <div className="flex items-center gap-3">
//                     <Globe className="w-5 h-5 text-gray-600 dark:text-gray-400" />
//                     <div>
//                       <div className="font-medium text-gray-900 dark:text-white">Language</div>
//                       <div className="text-sm text-gray-600 dark:text-gray-400">
//                         {language === 'en' ? 'English' : 'ភាសាខ្មែរ'}
//                       </div>
//                     </div>
//                   </div>
//                   <Button
//                     size="sm"
//                     variant="outline"
//                     onClick={() => setLanguage(language === 'en' ? 'km' : 'en')}
//                     className="dark:border-gray-600"
//                   >
//                     Switch
//                   </Button>
//                 </div>

//                 <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
//                   <div className="flex items-center gap-3">
//                     {theme === 'light' ? <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" /> : <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
//                     <div>
//                       <div className="font-medium text-gray-900 dark:text-white">Theme</div>
//                       <div className="text-sm text-gray-600 dark:text-gray-400">
//                         {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
//                       </div>
//                     </div>
//                   </div>
//                   <Button
//                     size="sm"
//                     variant="outline"
//                     onClick={toggleTheme}
//                     className="dark:border-gray-600"
//                   >
//                     Toggle
//                   </Button>
//                 </div>
//               </div>
//             </div>

//             {/* Notifications */}
//             <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
//               <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
//                 <Bell className="w-5 h-5" />
//                 Notifications
//               </h3>
//               <div className="space-y-3">
//                 {[
//                   { label: 'Email notifications for new courses', enabled: true },
//                   { label: 'Course update notifications', enabled: true },
//                   { label: 'Marketing emails', enabled: false },
//                   { label: 'Weekly learning summary', enabled: true }
//                 ].map((notification, index) => (
//                   <label key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-pointer">
//                     <span className="text-gray-900 dark:text-white">{notification.label}</span>
//                     <input type="checkbox" defaultChecked={notification.enabled} className="w-5 h-5" />
//                   </label>
//                 ))}
//               </div>
//             </div>

//             {/* Danger Zone */}
//             <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border-2 border-red-200 dark:border-red-900">
//               <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-4">Danger Zone</h3>
//               <div className="space-y-3">
//                 <Button variant="outline" className="w-full border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30">
//                   Deactivate Account
//                 </Button>
//                 <Button variant="outline" className="w-full border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30">
//                   Delete Account
//                 </Button>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }