import { useState, useEffect } from 'react';
import { X, CheckCircle2, XCircle, Loader2, User } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface PaymentInfo {
  userId: string;
  accountName: string;
  accountNumber: string;
  paymentApv: string;
  method: string;
  dateTimePay: string;
}

interface QRPaymentModalProps {
  amount: number;
  onClose: () => void;
  onSuccess: (paymentInfo: PaymentInfo) => void;
  productTitle: string;
  variantLabel?: string;
  khqrUrl?: string;
  usdQrUrl?: string;
}

const DEFAULT_KH_QR = "/paymentQR/khmer_qr.jpg";

export function QRPaymentModal({
  amount,
  onClose,
  onSuccess,
  productTitle,
  variantLabel,
  khqrUrl,
  usdQrUrl,
}: QRPaymentModalProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes = 300 seconds
  const [step, setStep] = useState<'qr' | 'form' | 'processing' | 'success' | 'expired'>('qr');
  const PAYMENT_METHODS = [
    { value: 'manual', label: language === 'km' ? 'ដៃគូផ្សេង' : 'Manual / Other' },
    { value: 'ABA Bank', label: 'ABA Bank' },
    { value: 'ACLEDA Bank', label: 'ACLEDA Bank' },
    { value: 'Wing Bank', label: 'Wing Bank' },
    { value: 'Canadia Bank', label: 'Canadia Bank' },
    { value: 'Other', label: language === 'km' ? 'ធនាគារផ្សេង' : 'Other Bank' }
  ];

  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
    userId: user?.id != null ? String(user.id) : '',
    accountName: '',
    accountNumber: '',
    paymentApv: '',
    method: PAYMENT_METHODS[0].value,
    dateTimePay: ''
  });
  useEffect(() => {
    setPaymentInfo((prev) => ({
      ...prev,
      userId: user?.id != null ? String(user.id) : '',
    }));
  }, [user?.id]);

  const resolvedKhQr = khqrUrl && khqrUrl.trim() ? khqrUrl : DEFAULT_KH_QR;
  const resolvedUsdQr =
    usdQrUrl &&
    usdQrUrl.trim() &&
    usdQrUrl.trim().toLowerCase() !== 'none'
      ? usdQrUrl
      : null;
  const userDisplayName =
    user?.firstName?.trim() || user?.username?.trim() || user?.email?.trim() || 'User';
  const [activeQrType, setActiveQrType] = useState<'khqr' | 'usdqr'>(
    resolvedKhQr ? 'khqr' : 'usdqr'
  );
  useEffect(() => {
    if (activeQrType === 'usdqr' && !resolvedUsdQr) {
      setActiveQrType('khqr');
    }
  }, [activeQrType, resolvedUsdQr]);

  const activeQrUrl =
    activeQrType === 'usdqr' && resolvedUsdQr ? resolvedUsdQr : resolvedKhQr;

  // Countdown timer
  useEffect(() => {
    if (step !== 'qr' && step !== 'form') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setStep('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step]);

  // Auto-close when expired
  useEffect(() => {
    if (step === 'expired') {
      setTimeout(() => {
        onClose();
      }, 3000);
    }
  }, [step, onClose]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleContinueToForm = () => {
    setStep('form');
  };

  const handleSubmitPaymentInfo = async () => {
    // Validate all fields
    if (
      !paymentInfo.userId ||
      !paymentInfo.accountName ||
      !paymentInfo.accountNumber ||
      !paymentInfo.paymentApv ||
      !paymentInfo.method ||
      !paymentInfo.dateTimePay
    ) {
      return;
    }

    setStep('processing');
    await new Promise(resolve => setTimeout(resolve, 1500));
    setStep('success');
    
    setTimeout(() => {
      onSuccess(paymentInfo);
    }, 1500);
  };

  const isFormValid =
    paymentInfo.userId &&
    paymentInfo.accountName &&
    paymentInfo.accountNumber &&
    paymentInfo.paymentApv &&
    paymentInfo.method &&
    paymentInfo.dateTimePay;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
        onClick={step === 'qr' || step === 'form' ? onClose : undefined}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full my-8">
          {/* Header with Timer */}
          <div className="relative bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {step === 'processing' && (
                  <Loader2 className="w-5 h-5 animate-spin" />
                )}
                {(step === 'qr' || step === 'form') && (
                  <div className="text-2xl font-bold">
                    {formatTime(timeLeft)}
                  </div>
                )}
                {step === 'success' && (
                  <CheckCircle2 className="w-6 h-6" />
                )}
                {step === 'expired' && (
                  <XCircle className="w-6 h-6" />
                )}
              </div>
              
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center font-bold text-xl">
              ABA PayWay
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Step 1: QR Code */}
            {step === 'qr' && (
              <>
                {/* User Info Display */}
                {user && (
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-2 mb-3 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
                        <User className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-gray-900 dark:text-white">
                          {userDisplayName}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {language === 'km' ? 'អត្តសញ្ញាណ' : 'User ID'}: {user.id}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Amount Display */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-2 mb-2">
                  <div className="font-bold text-gray-900 dark:text-white text-lg mb-1">
                    {language === 'km' ? 'ចំនួនទឹកប្រាក់' : 'Total Amount'}
                  </div>
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                    ${amount.toFixed(2)}
                  </div>
                </div>

                {/* Product Info */}
                <div className="bg-white dark:bg-gray-900 rounded-xl p-2 mb-4 border border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {language === 'km' ? 'ផលិតផល' : 'Product'}
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {productTitle}
                  </div>
                  {variantLabel && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {variantLabel}
                    </div>
                  )}
                </div>

                {/* QR Selector */}
                <div className="mb-3">
                  <div className="flex gap-3 mb-4">
                    <Button
                      onClick={() => setActiveQrType('khqr')}
                      variant={activeQrType === 'khqr' ? 'default' : 'outline'}
                      className="flex-1"
                    >
                      KHQR
                    </Button>
                    <Button
                      onClick={() => setActiveQrType('usdqr')}
                      variant={activeQrType === 'usdqr' ? 'default' : 'outline'}
                      className="flex-1"
                      disabled={!resolvedUsdQr}
                    >
                      USD QR
                    </Button>
                  </div>

                  <div className="flex flex-col items-center">
                    {activeQrUrl ? (
                      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-lg">
                        <img
                          src={activeQrUrl}
                          alt="Payment QR"
                          className="w-56 h-56 object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-full rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        {language === 'km'
                          ? 'មិនមាន QR code សម្រាប់ជម្រើសនេះទេ'
                          : 'QR code not available for this option.'}
                      </div>
                    )}
                    <img
                      src="/paymentQR/bank_support.webp"
                      alt="Bank Support"
                      className="w-full h-8 mx-auto mt-3"
                    />
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                      {language === 'km'
                        ? 'ស្កេន QR ដែលបានជ្រើសជាមួយ ABA Mobile របស់អ្នកដើម្បីបន្តការទូទាត់។'
                        : 'Scan the selected QR with your ABA Mobile app to pay.'}
                    </p>
                  </div>
                </div>

                {/* Continue Button */}
                <Button
                  onClick={handleContinueToForm}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  size="lg"
                >
                  {language === 'km' ? 'បន្តបន្ទាប់ពីទូទាត់' : 'Continue After Payment'}
                </Button>

                {/* Timer Warning */}
                {timeLeft < 60 && (
                  <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-center">
                    <div className="text-sm font-semibold text-yellow-800 dark:text-yellow-400">
                      {language === 'km' 
                        ? `⚠️ នៅសល់ពេល ${timeLeft} វិនាទី!`
                        : `⚠️ Only ${timeLeft} seconds left!`
                      }
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Step 2: Payment Info Form */}
            {step === 'form' && (
              <>
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {language === 'km' ? 'បំពេញព័ត៌មានការទូទាត់' : 'Enter Payment Information'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {language === 'km' 
                      ? 'សូមបំពេញព័ត៌មានពីការទូទាត់របស់អ្នក' 
                      : 'Please fill in your payment details'}
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  {/* User ID */}
                  <div>
                    <Label className="text-gray-900 dark:text-white">
                      {language === 'km' ? 'អត្តសញ្ញាណអ្នកប្រើប្រាស់' : 'User ID'} *
                    </Label>
                    <Input
                      value={paymentInfo.userId}
                      readOnly
                      disabled
                      placeholder={language === 'km' ? 'បញ្ចូលអត្តសញ្ញាណអ្នកប្រើប្រាស់' : 'Enter User ID'}
                      className="mt-1 dark:bg-gray-900 dark:border-gray-700"
                      required
                    />
                  </div>

                  {/* Account Name */}
                  <div>
                    <Label className="text-gray-900 dark:text-white">
                      {language === 'km' ? 'ឈ្មោះគណនី' : 'Account Name'} *
                    </Label>
                    <Input
                      value={paymentInfo.accountName}
                      onChange={(e) => setPaymentInfo(prev => ({ ...prev, accountName: e.target.value }))}
                      placeholder={language === 'km' ? 'បញ្ចូលឈ្មោះគណនី' : 'Enter account name'}
                      className="mt-1 dark:bg-gray-900 dark:border-gray-700"
                      required
                    />
                  </div>

                  {/* Account Number */}
                  <div>
                    <Label className="text-gray-900 dark:text-white">
                      {language === 'km' ? 'លេខគណនី' : 'Account Number'} *
                    </Label>
                    <Input
                      value={paymentInfo.accountNumber}
                      onChange={(e) => setPaymentInfo(prev => ({ ...prev, accountNumber: e.target.value }))}
                      placeholder={language === 'km' ? 'បញ្ចូលលេខគណនី' : 'Enter account number'}
                      className="mt-1 dark:bg-gray-900 dark:border-gray-700"
                      required
                    />
                  </div>

                  {/* Purchase Apv */}
                  <div>
                    <Label className="text-gray-900 dark:text-white">
                      {language === 'km' ? 'លេខទទួលបញ្ជី' : 'Purchase Apv'} *
                    </Label>
                    <Input
                      value={paymentInfo.paymentApv}
                      onChange={(e) => setPaymentInfo(prev => ({ ...prev, paymentApv: e.target.value }))}
                      placeholder={language === 'km' ? 'បញ្ចូល Purchase Apv' : 'Enter Purchase Apv'}
                      className="mt-1 dark:bg-gray-900 dark:border-gray-700"
                      required
                    />
                  </div>

                  {/* Method */}
                  <div>
                    <Label className="text-gray-900 dark:text-white">
                      {language === 'km' ? 'វិធីសាស្ត្រទូទាត់' : 'Payment Method'} *
                    </Label>
                    <select
                      value={paymentInfo.method}
                      onChange={(e) => setPaymentInfo(prev => ({ ...prev, method: e.target.value }))}
                      className="mt-1 w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-700"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option value={m.value} key={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date Time Pay */}
                  <div>
                    <Label className="text-gray-900 dark:text-white">
                      {language === 'km' ? 'ថ្ងៃនិងម៉ោងទូទាត់' : 'Payment Date & Time'} *
                    </Label>
                    <Input
                      type="datetime-local"
                      value={paymentInfo.dateTimePay}
                      onChange={(e) => setPaymentInfo(prev => ({ ...prev, dateTimePay: e.target.value }))}
                      className="mt-1 dark:bg-gray-900 dark:border-gray-700"
                      required
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => setStep('qr')}
                    variant="outline"
                    className="flex-1 dark:border-gray-600 dark:text-gray-300"
                  >
                    {language === 'km' ? 'ត្រឡប់ក្រោយ' : 'Back'}
                  </Button>
                  <Button
                    onClick={handleSubmitPaymentInfo}
                    disabled={!isFormValid}
                    className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:opacity-50"
                  >
                    {language === 'km' ? 'បញ្ជូន' : 'Submit'}
                  </Button>
                </div>

                {/* Timer Warning */}
                {timeLeft < 60 && (
                  <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-center">
                    <div className="text-sm font-semibold text-yellow-800 dark:text-yellow-400">
                      {language === 'km' 
                        ? `⚠️ នៅសល់ពេល ${timeLeft} វិនាទី!`
                        : `⚠️ Only ${timeLeft} seconds left!`
                      }
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Processing State */}
            {step === 'processing' && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-12 text-center">
                <Loader2 className="w-16 h-16 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-4" />
                <div className="font-bold text-gray-900 dark:text-white text-lg mb-2">
                  {language === 'km' ? 'កំពុងដំណើរការ...' : 'Processing...'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {language === 'km' ? 'សូមរង់ចាំ...' : 'Please wait...'}
                </div>
              </div>
            )}

            {/* Success State */}
            {step === 'success' && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-12 text-center">
                <CheckCircle2 className="w-20 h-20 text-green-600 dark:text-green-400 mx-auto mb-4" />
                <div className="font-bold text-gray-900 dark:text-white text-2xl mb-2">
                  {language === 'km' ? 'ជោគជ័យ!' : 'Order Placed!'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {language === 'km' 
                    ? 'ការបញ្ជាទិញរបស់អ្នកកំពុងរង់ចាំការអនុម័ត' 
                    : 'Your order is pending approval'}
                </div>
              </div>
            )}

            {/* Expired State */}
            {step === 'expired' && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-12 text-center">
                <XCircle className="w-20 h-20 text-red-600 dark:text-red-400 mx-auto mb-4" />
                <div className="font-bold text-gray-900 dark:text-white text-2xl mb-2">
                  {language === 'km' ? 'ផុតកំណត់!' : 'Payment Expired!'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {language === 'km' 
                    ? 'ការទូទាត់បានផុតកំណត់ សូមព្យាយាមម្តងទៀត' 
                    : 'Payment timeout. Please try again'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
