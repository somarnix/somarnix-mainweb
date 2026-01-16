// import { useState } from 'react';
// import { Package, Clock, CheckCircle2, XCircle, Calendar } from 'lucide-react';
// import { useAuth } from '../contexts/AuthContext';
// import { useLanguage } from '../contexts/LanguageContext';
// import { useCurrency } from '../contexts/CurrencyContext';

// export function OrdersHistory() {
//   const { language } = useLanguage();
//   const { formatPrice } = useCurrency();
//   const { getUserOrders } = useOrders();
//   const { user } = useAuth();
//   const [activeTab, setActiveTab] = useState<OrderStatus>('pending');

//   const userOrders = user ? getUserOrders(user.id) : [];
//   const filteredOrders = userOrders.filter(order => order.status === activeTab);

//   const tabs: { id: OrderStatus; label: string; labelKm: string; icon: any; color: string }[] = [
//     { 
//       id: 'pending', 
//       label: 'Pending', 
//       labelKm: 'កំពុងរង់ចាំ',
//       icon: Clock, 
//       color: 'text-yellow-600 dark:text-yellow-400' 
//     },
//     { 
//       id: 'complete', 
//       label: 'Complete', 
//       labelKm: 'បញ្ចប់',
//       icon: CheckCircle2, 
//       color: 'text-green-600 dark:text-green-400' 
//     },
//     { 
//       id: 'cancelled', 
//       label: 'Cancelled', 
//       labelKm: 'បានបោះបង់',
//       icon: XCircle, 
//       color: 'text-red-600 dark:text-red-400' 
//     },
//   ];

//   const formatDate = (dateString: string) => {
//     const date = new Date(dateString);
//     return date.toLocaleDateString(language === 'km' ? 'km-KH' : 'en-US', {
//       year: 'numeric',
//       month: 'short',
//       day: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit'
//     });
//   };

//   const getStatusBadge = (status: OrderStatus) => {
//     const config = {
//       pending: {
//         bg: 'bg-yellow-100 dark:bg-yellow-900/30',
//         text: 'text-yellow-800 dark:text-yellow-400',
//         label: language === 'km' ? 'កំពុងរង់ចាំ' : 'Pending'
//       },
//       complete: {
//         bg: 'bg-green-100 dark:bg-green-900/30',
//         text: 'text-green-800 dark:text-green-400',
//         label: language === 'km' ? 'បញ្ចប់' : 'Complete'
//       },
//       cancelled: {
//         bg: 'bg-red-100 dark:bg-red-900/30',
//         text: 'text-red-800 dark:text-red-400',
//         label: language === 'km' ? 'បានបោះបង់' : 'Cancelled'
//       }
//     };
    
//     const style = config[status];
//     return (
//       <span className={`px-3 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
//         {style.label}
//       </span>
//     );
//   };

//   return (
//     <div>
//       <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
//         {language === 'km' ? 'ប្រវត្តិការបញ្ជាទិញ' : 'Order History'}
//       </h2>

//       {/* Tabs */}
//       <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
//         {tabs.map((tab) => {
//           const Icon = tab.icon;
//           const count = userOrders.filter(o => o.status === tab.id).length;
          
//           return (
//             <button
//               key={tab.id}
//               onClick={() => setActiveTab(tab.id)}
//               className={`px-4 py-3 font-semibold text-sm transition-all flex items-center gap-2 border-b-2 ${
//                 activeTab === tab.id
//                   ? 'border-blue-600 text-blue-600 dark:text-blue-400'
//                   : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
//               }`}
//             >
//               <Icon className="w-4 h-4" />
//               {language === 'km' ? tab.labelKm : tab.label}
//               {count > 0 && (
//                 <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full text-xs">
//                   {count}
//                 </span>
//               )}
//             </button>
//           );
//         })}
//       </div>

//       {/* Orders List */}
//       {filteredOrders.length === 0 ? (
//         <div className="text-center py-16">
//           <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
//           <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
//             {language === 'km' ? 'មិនមានការបញ្ជាទិញ' : 'No Orders'}
//           </h3>
//           <p className="text-gray-600 dark:text-gray-400">
//             {language === 'km' 
//               ? `អ្នកមិនមានការបញ្ជាទិញ${tabs.find(t => t.id === activeTab)?.labelKm}ទេ`
//               : `You don't have any ${activeTab} orders`}
//           </p>
//         </div>
//       ) : (
//         <div className="space-y-4">
//           {filteredOrders.map((order) => (
//             <div 
//               key={order.id}
//               className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700"
//             >
//               {/* Order Header */}
//               <div className="flex items-start justify-between mb-4">
//                 <div>
//                   <div className="flex items-center gap-3 mb-2">
//                     <h3 className="font-bold text-gray-900 dark:text-white">
//                       {language === 'km' ? 'ការបញ្ជាទិញ' : 'Order'} #{order.id.slice(4, 16)}
//                     </h3>
//                     {getStatusBadge(order.status)}
//                   </div>
//                   <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
//                     <Calendar className="w-4 h-4" />
//                     {formatDate(order.createdAt)}
//                   </div>
//                 </div>
//                 <div className="text-right">
//                   <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
//                     {language === 'km' ? 'សរុប' : 'Total'}
//                   </div>
//                   <div className="text-2xl font-bold text-gray-900 dark:text-white">
//                     {formatPrice(order.totalAmount)}
//                   </div>
//                 </div>
//               </div>

//               {/* Order Items */}
//               <div className="space-y-3 mb-4">
//                 {order.items.map((item, index) => (
//                   <div 
//                     key={index}
//                     className="flex gap-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
//                   >
//                     <img
//                       src={item.course.image}
//                       alt={item.course.title}
//                       className="w-16 h-16 rounded-lg object-cover"
//                     />
//                     <div className="flex-1">
//                       <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
//                         {item.course.title}
//                       </h4>
//                       <div className="text-xs text-gray-600 dark:text-gray-400">
//                         {language === 'km' ? 'រយៈពេល' : 'Duration'}: {item.duration} • 
//                         {language === 'km' ? ' បរិមាណ' : ' Qty'}: {item.quantity}
//                       </div>
//                     </div>
//                     <div className="text-sm font-bold text-gray-900 dark:text-white">
//                       {formatPrice(item.price * item.quantity)}
//                     </div>
//                   </div>
//                 ))}
//               </div>

//               {/* Payment Info */}
//               <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
//                 <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
//                   {language === 'km' ? 'ព័ត៌មានការទូទាត់' : 'Payment Information'}
//                 </div>
//                 <div className="grid grid-cols-2 gap-3 text-sm">
//                   <div>
//                     <span className="text-gray-600 dark:text-gray-400">
//                       {language === 'km' ? 'លេខសម្គាល់ការទូទាត់:' : 'Payment ID:'}
//                     </span>
//                     <div className="font-mono text-gray-900 dark:text-white">
//                       {order.paymentInfo.idPay}
//                     </div>
//                   </div>
//                   <div>
//                     <span className="text-gray-600 dark:text-gray-400">
//                       {language === 'km' ? 'លេខសម្គាល់ការទិញ:' : 'Purchase ID:'}
//                     </span>
//                     <div className="font-mono text-gray-900 dark:text-white">
//                       {order.paymentInfo.purchaseId}
//                     </div>
//                   </div>
//                   <div className="col-span-2">
//                     <span className="text-gray-600 dark:text-gray-400">
//                       {language === 'km' ? 'ថ្ងៃទូទាត់:' : 'Payment Date:'}
//                     </span>
//                     <div className="text-gray-900 dark:text-white">
//                       {new Date(order.paymentInfo.dateTimePay).toLocaleString()}
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               {/* Status Message */}
//               {order.status === 'pending' && (
//                 <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
//                   <p className="text-sm text-yellow-800 dark:text-yellow-400">
//                     ⏳ {language === 'km' 
//                       ? 'ការបញ្ជាទិញរបស់អ្នកកំពុងរង់ចាំការពិនិត្យពីអ្នកគ្រប់គ្រង'
//                       : 'Your order is awaiting admin review'}
//                   </p>
//                 </div>
//               )}
//               {order.status === 'complete' && (
//                 <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
//                   <p className="text-sm text-green-800 dark:text-green-400">
//                     ✅ {language === 'km' 
//                       ? 'ការបញ្ជាទិញរបស់អ្នកត្រូវបានអនុម័ត! វគ្គសិក្សាអាចប្រើបានហើយ'
//                       : 'Your order has been approved! Courses are now available'}
//                   </p>
//                 </div>
//               )}
//               {order.status === 'cancelled' && (
//                 <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
//                   <p className="text-sm text-red-800 dark:text-red-400">
//                     ❌ {language === 'km' 
//                       ? 'ការបញ្ជាទិញរបស់អ្នកត្រូវបានបោះបង់'
//                       : 'Your order has been cancelled'}
//                   </p>
//                 </div>
//               )}
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }
