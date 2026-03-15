import { useState, useEffect, useRef } from 'react';
import { X, CheckCircle2, XCircle, Loader2, User } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';

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
  onSuccess: (paymentInfo: PaymentInfo) => void | Promise<void>;
  orderId?: number;
  orderCreatedAt?: string;
  productTitle: string;
  variantLabel?: string;
  billNumber?: string;
  telegramSupportUrl?: string;
  khqrUrl?: string;
  usdQrUrl?: string;
}

const DEFAULT_KH_QR = "/paymentQR/khmer_qr.jpg";
const KHR_PER_USD = 4000;

type KhqrApiResponse = {
  qrDataUrl?: string;
  md5?: string;
  error?: string;
};

export function QRPaymentModal({
  amount,
  onClose,
  onSuccess,
  orderId,
  orderCreatedAt,
  productTitle,
  variantLabel,
  billNumber,
  telegramSupportUrl,
  khqrUrl,
  usdQrUrl,
}: QRPaymentModalProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes = 300 seconds
  const [step, setStep] = useState<'qr' | 'form' | 'processing' | 'success' | 'expired'>('qr');
  const userDisplayName =
    user?.firstName?.trim() || user?.username?.trim() || user?.email?.trim() || 'User';
  const PAYMENT_METHODS = [
    { value: 'manual', label: language === 'km' ? 'ដៃគូផ្សេង' : 'Manual / Other' },
    { value: 'ABA Bank', label: 'ABA Bank' },
    { value: 'ACLEDA Bank', label: 'ACLEDA Bank' },
    { value: 'Wing Bank', label: 'Wing Bank' },
    { value: 'Canadia Bank', label: 'Canadia Bank' },
    { value: 'Other', label: language === 'km' ? 'ធនាគារផ្សេង' : 'Other Bank' }
  ];

  const toDatetimeLocalValue = (value?: string | null) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(trimmed)) {
          return trimmed.replace(' ', 'T').slice(0, 16);
        }
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed)) {
          return trimmed.slice(0, 16);
        }
        const parsed = new Date(trimmed);
        if (!Number.isNaN(parsed.getTime())) {
          const localMs = parsed.getTime() - parsed.getTimezoneOffset() * 60000;
          return new Date(localMs).toISOString().slice(0, 16);
        }
      }
    }

    const now = new Date();
    const localMs = now.getTime() - now.getTimezoneOffset() * 60000;
    return new Date(localMs).toISOString().slice(0, 16);
  };

  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
    userId: user?.id != null ? String(user.id) : '',
    accountName: userDisplayName,
    accountNumber: billNumber?.trim() || '',
    paymentApv: '',
    method: 'ABA Bank',
    dateTimePay: toDatetimeLocalValue(orderCreatedAt)
  });
  useEffect(() => {
    setPaymentInfo((prev) => ({
      ...prev,
      userId: user?.id != null ? String(user.id) : '',
    }));
  }, [user?.id]);

  useEffect(() => {
    setPaymentInfo((prev) => ({
      ...prev,
      userId: user?.id != null ? String(user.id) : '',
      accountName: userDisplayName,
      accountNumber: billNumber?.trim() || '',
      method: 'ABA Bank',
      dateTimePay: prev.dateTimePay || toDatetimeLocalValue(orderCreatedAt),
    }));
  }, [billNumber, orderCreatedAt, user?.id, userDisplayName]);

  const [generatedKhQr, setGeneratedKhQr] = useState<string | null>(null);
  const [generatedUsdQr, setGeneratedUsdQr] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState('');
  const [autoConfirming, setAutoConfirming] = useState(false);
  const [copyingTelegramText, setCopyingTelegramText] = useState(false);
  const autoSubmitStartedRef = useRef(false);
  const fallbackKhQr = khqrUrl && khqrUrl.trim() ? khqrUrl : DEFAULT_KH_QR;
  const fallbackUsdQr =
    usdQrUrl &&
    usdQrUrl.trim() &&
    usdQrUrl.trim().toLowerCase() !== 'none'
      ? usdQrUrl
      : null;
  const resolvedKhQr = generatedKhQr || fallbackKhQr;
  const resolvedUsdQr = generatedUsdQr || fallbackUsdQr;
  const [activeQrType, setActiveQrType] = useState<'khqr' | 'usdqr'>('khqr');
  const hasOrderPrefill = Boolean(billNumber?.trim()) || Boolean(orderCreatedAt?.trim());
  const resolvedTelegramSupportUrl =
    telegramSupportUrl?.trim() ||
    (process.env.NEXT_PUBLIC_TELEGRAM_SUPPORT_URL || '').trim();
  const preferTelegramCheckout = Boolean(resolvedTelegramSupportUrl);
  const telegramSupportLabel =
    (process.env.NEXT_PUBLIC_TELEGRAM_SUPPORT_LABEL || '').trim() || 'Continue payment in Telegram';
  const telegramProofMessage = [
    'ABA payment support request',
    `Order ID: ${orderId ?? 'N/A'}`,
    `Bill Number: ${billNumber?.trim() || 'N/A'}`,
    `Buyer: ${userDisplayName}`,
    `Email: ${user?.email?.trim() || 'N/A'}`,
    `Product: ${productTitle}${variantLabel ? ` (${variantLabel})` : ''}`,
    `Amount: $${amount.toFixed(2)}`,
    `Created: ${orderCreatedAt?.trim() || new Date().toISOString().slice(0, 19).replace('T', ' ')}`,
    '',
    'I will send my transfer screenshot in this chat after payment.',
  ].join('\n');

  const handleCopyTelegramText = async () => {
    try {
      setCopyingTelegramText(true);
      await navigator.clipboard.writeText(telegramProofMessage);
      toast.success('Telegram payment message copied.');
    } catch {
      toast.error('Failed to copy Telegram payment message.');
    } finally {
      setCopyingTelegramText(false);
    }
  };

  useEffect(() => {
    const fetchQr = async (currency: 'KHR' | 'USD', value: number) => {
      const res = await fetch('/api/payments/khqr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: value,
          currency,
          billNumber,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as KhqrApiResponse;
      if (!res.ok || !data.qrDataUrl || !data.md5) {
        throw new Error(data.error || `Failed to generate ${currency} ABA PayWay QR`);
      }

      return {
        qrDataUrl: data.qrDataUrl,
      };
    };

    if (!Number.isFinite(amount) || amount <= 0) {
      setGeneratedKhQr(null);
      setGeneratedUsdQr(null);
      return;
    }

    let cancelled = false;
    setQrLoading(true);
    setQrError('');

    void (async () => {
      try {
        const usdAmount = Number(amount.toFixed(2));
        const khrAmount = Math.round(usdAmount * KHR_PER_USD);
        const [khqr, usdqr] = await Promise.all([
          fetchQr('KHR', khrAmount),
          fetchQr('USD', usdAmount),
        ]);

        if (cancelled) return;
        setGeneratedKhQr(khqr.qrDataUrl);
        setGeneratedUsdQr(usdqr.qrDataUrl);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        setQrError(message || 'Failed to generate payment QR.');
        setGeneratedKhQr(null);
        setGeneratedUsdQr(null);
      } finally {
        if (!cancelled) {
          setQrLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [amount, billNumber]);
  useEffect(() => {
    if (activeQrType === 'usdqr' && !resolvedUsdQr) {
      setActiveQrType('khqr');
    }
  }, [activeQrType, resolvedUsdQr]);

  const activeQrUrl =
    activeQrType === 'usdqr' && resolvedUsdQr ? resolvedUsdQr : resolvedKhQr;

  useEffect(() => {
    if (!orderId || step !== 'qr' || autoSubmitStartedRef.current) return;

    let cancelled = false;

    const checkOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`, {
          cache: 'no-store',
          credentials: 'include',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || cancelled) return;

        const orderStatus = String(data?.order?.status || '').toLowerCase();
        const payment = data?.payment;
        const isPaidStatus =
          orderStatus === 'approved' ||
          orderStatus === 'delivering' ||
          orderStatus === 'completed' ||
          orderStatus === 'done';

        if (!payment && !isPaidStatus) return;

        autoSubmitStartedRef.current = true;
        setAutoConfirming(true);
        setStep('processing');

        await onSuccess({
          userId: user?.id != null ? String(user.id) : '',
          accountName:
            typeof payment?.account_id === 'string' && payment.account_id
              ? payment.account_id
              : 'ABA Transfer',
          accountNumber:
            typeof payment?.payment_id === 'string' && payment.payment_id
              ? payment.payment_id
              : 'AUTO',
          paymentApv:
            typeof payment?.payment_apv === 'string' && payment.payment_apv
              ? payment.payment_apv
              : 'AUTO',
          method:
            typeof payment?.method === 'string' && payment.method
              ? payment.method
              : 'ABA Bank',
          dateTimePay:
            typeof payment?.paid_at === 'string' && payment.paid_at
              ? payment.paid_at
              : new Date().toISOString(),
        });
      } catch {
        autoSubmitStartedRef.current = false;
        setAutoConfirming(false);
        setStep('qr');
      }
    };

    void checkOrder();
    const interval = setInterval(() => {
      void checkOrder();
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [onSuccess, orderId, step, user?.id]);

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
                  {billNumber ? (
                    <div className="mt-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                      Order No: {billNumber}
                    </div>
                  ) : null}
                  {variantLabel && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {variantLabel}
                    </div>
                  )}
                </div>

                {preferTelegramCheckout ? (
                  <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-center dark:border-blue-900 dark:bg-blue-950/30">
                    <div className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                      {language === 'km'
                        ? 'បន្តការទូទាត់តាម Telegram ដើម្បីទទួលបាន ABA QR និងផ្ញើរូបថតការផ្ទេរប្រាក់នៅទីនោះ។'
                        : 'Continue in Telegram to receive the ABA QR and send your payment screenshot there.'}
                    </div>
                    <p className="mt-2 text-xs text-blue-800 dark:text-blue-200">
                      {language === 'km'
                        ? 'Bot នឹងបង្ហាញព័ត៌មានអ្នកទិញ លេខប៊ីល ចំនួនទឹកប្រាក់ ហើយផ្ញើទាំង KHR QR និង USD QR ដោយស្វ័យប្រវត្តិ។'
                        : 'The bot will show the buyer details, bill number, amount, and automatically send both KHR and USD QR codes.'}
                    </p>
                  </div>
                ) : null}

                {/* QR Selector */}
                <div className={preferTelegramCheckout ? "hidden" : "mb-3"}>
                  <div className="flex gap-3 mb-4">
                    <Button
                      onClick={() => setActiveQrType('khqr')}
                      variant={activeQrType === 'khqr' ? 'default' : 'outline'}
                      className="flex-1"
                    >
                      KHR QR
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
                    {qrLoading ? (
                      <div className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 p-10 text-center text-sm text-gray-500 dark:text-gray-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" />
                        {language === 'km' ? 'កំពុងបង្កើត ABA PayWay QR...' : 'Generating ABA PayWay QR...'}
                      </div>
                    ) : activeQrUrl ? (
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
                    {qrError ? (
                      <div className="w-full mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {qrError}
                      </div>
                    ) : null}
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
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                      {activeQrType === 'usdqr'
                        ? `USD ${amount.toFixed(2)}`
                        : `KHR ${Math.round(amount * KHR_PER_USD).toLocaleString()}`}
                    </p>
                    <p className="mt-3 text-xs font-medium text-green-600 dark:text-green-400 text-center">
                      {autoConfirming
                        ? 'Payment detected. Finalizing order...'
                        : 'After payment, this page will auto-confirm your order.'}
                    </p>
                  </div>
                </div>

                {/* Continue Button */}
                <div className="space-y-3">
                  {resolvedTelegramSupportUrl ? (
                    <Button
                      onClick={() => window.open(resolvedTelegramSupportUrl, '_blank', 'noopener,noreferrer')}
                      className="w-full"
                      size="lg"
                    >
                      {telegramSupportLabel}
                    </Button>
                  ) : null}

                  <Button
                    onClick={() => void handleCopyTelegramText()}
                    variant="outline"
                    className={preferTelegramCheckout ? 'hidden' : 'w-full'}
                    size="lg"
                    disabled={copyingTelegramText}
                  >
                    {copyingTelegramText ? 'Copying Telegram message...' : 'Copy Telegram payment message'}
                  </Button>

                  <Button
                    onClick={handleContinueToForm}
                    variant="ghost"
                    className={preferTelegramCheckout ? 'hidden' : 'w-full'}
                    size="lg"
                  >
                    {language === 'km' ? 'បំពេញដោយដៃ' : 'Manual Payment Form'}
                  </Button>
                </div>

                <div className={preferTelegramCheckout ? "hidden" : "mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-left dark:border-blue-900 dark:bg-blue-950/30"}>
                  <div className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                    Telegram proof message
                  </div>
                  <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-blue-900 dark:text-blue-100">
                    {telegramProofMessage}
                  </pre>
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

                <p className="mb-4 text-xs font-medium text-blue-600 dark:text-blue-400">
                  {language === 'km'
                    ? 'បំពេញតែ APV បានគ្រប់គ្រាន់ ស្រាប់តែទិន្នន័យផ្សេងៗមកពីអូឌ័រ។'
                    : 'Only APV needs to be entered. The other fields are prefilled from the order.'}
                </p>

                <div className="space-y-4 mb-6">
                  {/* User ID */}
                  <div>
                    <Label className="text-gray-900 dark:text-white">
                      {language === 'km' ? 'អត្តសញ្ញាណអ្នកប្រើប្រាស់' : 'User ID'} *
                    </Label>
                    <Input
                      value={paymentInfo.userId}
                      readOnly={hasOrderPrefill}
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
                      readOnly={hasOrderPrefill}
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
                      readOnly={hasOrderPrefill}
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
                      disabled={hasOrderPrefill}
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
                      readOnly={hasOrderPrefill}
                      className="mt-1 dark:bg-gray-900 dark:border-gray-700"
                      required
                    />
                  </div>
                </div>

                <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-left dark:border-blue-900 dark:bg-blue-950/30">
                  <div className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                    Telegram payment support
                  </div>
                  <p className="mt-2 text-xs text-blue-900 dark:text-blue-100">
                    {language === 'km'
                      ? 'បន្ទាប់ពីបង់ប្រាក់ សូមបើក Telegram support រួចផ្ញើ APV និងរូបថតការផ្ទេរប្រាក់ទៅកាន់អេដមីន។'
                      : 'After payment, open Telegram support and send your APV plus the transfer screenshot to admin.'}
                  </p>
                  <div className="mt-3 space-y-2 sm:flex sm:gap-2 sm:space-y-0">
                    {resolvedTelegramSupportUrl ? (
                      <Button
                        onClick={() => window.open(resolvedTelegramSupportUrl, '_blank', 'noopener,noreferrer')}
                        className="w-full sm:flex-1"
                        variant="outline"
                      >
                        {telegramSupportLabel}
                      </Button>
                    ) : null}
                    <Button
                      onClick={() => void handleCopyTelegramText()}
                      variant="outline"
                      className="w-full sm:flex-1"
                      disabled={copyingTelegramText}
                    >
                      {copyingTelegramText ? 'Copying Telegram message...' : 'Copy Telegram payment message'}
                    </Button>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex flex-col gap-3 sm:flex-row">
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
