import { useState, useEffect } from 'react';
import { X, CheckCircle2, XCircle, Loader2, ExternalLink, Copy, Check, User } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface PaymentInfo {
  userId: string;
  idPay: string;
  purchaseId: string;
  dateTimePay: string;
}

interface QRPaymentModalProps {
  amount: number;
  onClose: () => void;
  onSuccess: (paymentInfo: PaymentInfo) => void;
}

export function QRPaymentModal({ amount, onClose, onSuccess }: QRPaymentModalProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes = 300 seconds
  const [step, setStep] = useState<'qr' | 'form' | 'processing' | 'success' | 'expired'>('qr');
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
    userId: user?.id || '',
    idPay: '',
    purchaseId: '',
    dateTimePay: ''
  });
  const [copiedLink, setCopiedLink] = useState(false);

  // Detect if user is on mobile device
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const mobileCheck = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      const touchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const smallScreen = window.innerWidth <= 768;
      
      setIsMobile(mobileCheck || (touchScreen && smallScreen));
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // PayWay link with amount
  const payWayLink = `https://link.payway.com.kh/ABAPAYNw404494A`;

  // Generate QR code URL using Google Charts API with the PayWay link and amount
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(payWayLink)}`;

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
    if (!paymentInfo.userId || !paymentInfo.idPay || !paymentInfo.purchaseId || !paymentInfo.dateTimePay) {
      return;
    }

    setStep('processing');
    await new Promise(resolve => setTimeout(resolve, 1500));
    setStep('success');
    
    setTimeout(() => {
      onSuccess(paymentInfo);
    }, 1500);
  };

  const isFormValid = paymentInfo.userId && paymentInfo.idPay && paymentInfo.purchaseId && paymentInfo.dateTimePay;

  const handleOpenPaymentLink = () => {
    // Open in a phone-width popup to trigger mobile version of PayWay
    const width = 360; // iPhone/Mobile width to trigger mobile site
    const height = 740; // Taller height for better visibility
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);
    
    window.open(
      payWayLink,
      'ABA PayWay Payment',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
    );
  };

  const handleCopyLink = async () => {
    try {
      // Try modern Clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(payWayLink);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } else {
        // Fallback for older browsers or blocked Clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = payWayLink;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          setCopiedLink(true);
          setTimeout(() => setCopiedLink(false), 2000);
        } catch (err) {
          console.error('Fallback copy failed:', err);
        }
        
        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
      
      // Final fallback - create temporary textarea
      const textArea = document.createElement('textarea');
      textArea.value = payWayLink;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        document.execCommand('copy');
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } catch (fallbackErr) {
        console.error('All copy methods failed:', fallbackErr);
      }
      
      document.body.removeChild(textArea);
    }
  };

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
          <div className="relative bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-4 rounded-t-2xl">
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

            <div className="text-center font-bold text-xl mt-2">
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
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 mb-6 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
                        <User className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-gray-900 dark:text-white">
                          {user.name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {language === 'km' ? 'អត្តសញ្ញាណ' : 'User ID'}: {user.id}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Amount Display */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 mb-6">
                  <div className="font-bold text-gray-900 dark:text-white text-lg mb-1">
                    {language === 'km' ? 'ចំនួនទឹកប្រាក់' : 'Total Amount'}
                  </div>
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                    ${amount.toFixed(2)}
                  </div>
                </div>

                {/* Mobile: Click to Pay Button */}
                {isMobile && (
                  <Button
                    onClick={handleOpenPaymentLink}
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white mb-4"
                    size="lg"
                  >
                    <ExternalLink className="w-5 h-5 mr-2" />
                    {language === 'km' ? 'ចុចដើម្បីទូទាត់ប្រាក់' : 'Click to Pay Money'}
                  </Button>
                )}

                {/* PC Mode: Show Warning and Payment Link */}
                {!isMobile && (
                  <>
                    {/* PC Mode Warning */}
                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">📱</div>
                        <div className="flex-1">
                          <div className="font-bold text-orange-800 dark:text-orange-400 mb-1">
                            {language === 'km' ? 'ការជូនដំណឹង' : 'Notice'}
                          </div>
                          <div className="text-sm text-orange-700 dark:text-orange-300">
                            {language === 'km' 
                              ? 'ការទូទាត់អាចស្កេនបានតែនៅក្នុងទូរស័ព្ទប៉ុណ្ណោះ មិនមែននៅលើកុំព្យូទ័រទេ។ សូមស្កេនប្រាក់នៅក្នុងទូរស័ព្ទ។'
                              : 'The payment can scan just in Phone device not PC device. Please scan money in phone.'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Copyable PayWay Link */}
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 mb-6">
                      <div className="text-sm font-bold text-gray-900 dark:text-white mb-2">
                        {language === 'km' ? 'តំណភ្ជាប់ទូទាត់' : 'Payment Link'}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-600 dark:text-gray-400 break-all">
                          {payWayLink}
                        </div>
                        <Button
                          onClick={handleCopyLink}
                          variant="outline"
                          size="sm"
                          className="flex-shrink-0"
                        >
                          {copiedLink ? (
                            <>
                              <Check className="w-4 h-4 mr-1 text-green-600" />
                              {language === 'km' ? 'ចម្លង!' : 'Copied!'}
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 mr-1" />
                              {language === 'km' ? 'ចម្លង' : 'Copy'}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </>
                )}

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
                      onChange={(e) => setPaymentInfo(prev => ({ ...prev, userId: e.target.value }))}
                      placeholder={language === 'km' ? 'បញ្ចូលអត្តសញ្ញាណអ្នកប្រើប្រាស់' : 'Enter User ID'}
                      className="mt-1 dark:bg-gray-900 dark:border-gray-700"
                      required
                    />
                  </div>

                  {/* ID Pay */}
                  <div>
                    <Label className="text-gray-900 dark:text-white">
                      {language === 'km' ? 'លេខសម្គាល់ការទូទាត់' : 'Payment ID'} *
                    </Label>
                    <Input
                      value={paymentInfo.idPay}
                      onChange={(e) => setPaymentInfo(prev => ({ ...prev, idPay: e.target.value }))}
                      placeholder={language === 'km' ? 'បញ្ចូលលេខសម្គាល់ការទូទាត់' : 'Enter Payment ID'}
                      className="mt-1 dark:bg-gray-900 dark:border-gray-700"
                      required
                    />
                  </div>

                  {/* Purchase ID */}
                  <div>
                    <Label className="text-gray-900 dark:text-white">
                      {language === 'km' ? 'លេខសម្គាល់ការទិញ' : 'Purchase ID'} *
                    </Label>
                    <Input
                      value={paymentInfo.purchaseId}
                      onChange={(e) => setPaymentInfo(prev => ({ ...prev, purchaseId: e.target.value }))}
                      placeholder={language === 'km' ? 'បញ្ចូលលេខសម្គាល់ការទិញ' : 'Enter Purchase ID'}
                      className="mt-1 dark:bg-gray-900 dark:border-gray-700"
                      required
                    />
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