import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, ChevronDown, History, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AuthToast from '../../components/AuthToast';
import Header from '../../components/Header';
import PlayerMobileNav from '../../components/PlayerMobileNav';
import { colors } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import { useSiteBranding } from '../../context/SiteBrandingContext';
import { submitDepositRequest } from '../../services/userProfileService';
import { fetchPublicPaymentMethods } from '../../services/sitePaymentService';
import { fetchSiteActiveDepositBonus } from '../../services/adminDepositBonusService';
import { fetchPublicDepositWithdrawRules } from '../../services/adminGeneralSettingsService';

const CHANNEL_OPTIONS = [
  { value: 'Personal', label: 'চ্যানেল ১' },
  { value: 'Agent', label: 'চ্যানেল ২' },
  { value: 'Merchant', label: 'চ্যানেল ৩' },
];

const AMOUNT_PRESETS = [100, 200, 500, 1000, 3000, 5000, 10000, 20000, 30000, 50000];

const PAYMENT_MODE_CARD =
  'relative flex h-[3.25rem] items-center justify-center overflow-hidden rounded-xl border-2 bg-white transition-colors';
const SELECT_CARD =
  'relative flex min-h-[3.75rem] items-center justify-center rounded-xl border-2 bg-white px-2 transition-colors';
const SELECT_ACTIVE = 'border-emerald-500 shadow-[0_0_0_1px_rgba(34,197,94,0.25)]';
const SELECT_IDLE = 'border-slate-200 hover:border-slate-300';

function getMethodBrand(name) {
  const normalized = String(name || '').toLowerCase();
  if (normalized.includes('bkash')) return '/images/payment-bkash.png';
  if (normalized.includes('nagad')) return '/images/payment-nagad.png';
  if (normalized.includes('rocket')) return '/images/payment-rocket.png';
  if (normalized.includes('upay')) return '/images/payment-upay.png';
  return null;
}

function formatAmount(value) {
  return Number(value || 0).toLocaleString('en-BD');
}

function SelectionCheck() {
  return (
    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
      <Check size={12} strokeWidth={3} />
    </span>
  );
}

function DepositBonusSelector({ offers, loading, selectedId, onChange, currencySymbol }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const selectedOffer = offers.find((offer) => String(offer.id) === String(selectedId));

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [open]);

  const handleToggle = () => {
    if (loading || offers.length === 0) return;
    setOpen((current) => !current);
  };

  const handleSelect = (offer) => {
    if (String(selectedId) === String(offer.id)) {
      onChange('');
    } else {
      onChange(String(offer.id));
    }
    setOpen(false);
  };

  return (
    <section className="rounded-xl bg-white p-4">
      <h2 className="text-[15px] font-bold text-slate-900">Deposit Bonus</h2>
      <p className="mt-1 text-xs text-slate-500">
        প্রতিটি জমায় স্বয়ংক্রিয় বোনাস যোগ হয়। নিচ থেকে শুধু অতিরিক্ত অফার বেছে নিন।
      </p>
      <div ref={containerRef} className="relative mt-3">
        <button
          type="button"
          onClick={handleToggle}
          disabled={loading || offers.length === 0}
          className={`flex w-full items-center justify-between gap-3 rounded-xl border-2 bg-white px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            selectedOffer ? SELECT_ACTIVE : SELECT_IDLE
          }`}
        >
          <span
            className={`min-w-0 flex-1 truncate text-sm font-semibold ${
              selectedOffer ? 'text-emerald-800' : 'text-slate-600'
            }`}
          >
            {loading
              ? 'Loading bonuses...'
              : offers.length === 0
                ? 'No bonus available'
                : selectedOffer
                  ? selectedOffer.title
                  : 'Select Bonus'}
          </span>
          <ChevronDown
            size={18}
            className={`shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {open && offers.length > 0 ? (
          <div className="absolute left-0 right-0 z-20 mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
            {offers.map((offer) => {
              const isActive = String(selectedId) === String(offer.id);
              return (
                <button
                  key={`bonus-${offer.id}`}
                  type="button"
                  onClick={() => handleSelect(offer)}
                  className={`relative mb-2 w-full rounded-xl border px-3 py-2.5 text-left transition-colors last:mb-0 ${
                    isActive
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/60'
                  }`}
                >
                  {isActive ? (
                    <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  ) : null}
                  <p className="pr-7 text-sm font-semibold text-emerald-800">{offer.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-emerald-700">
                    {offer.bonusPercent}% bonus · {currencySymbol}
                    {formatAmount(offer.minDeposit)} – {currencySymbol}
                    {formatAmount(offer.maxDeposit)} · Turnover {offer.turnoverMultiplier}x
                  </p>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default function ProfileDepositPage() {
  const navigate = useNavigate();
  const { loggedIn } = useAuth();
  const { currencySymbol } = useSiteBranding();
  const [methods, setMethods] = useState([]);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [selectedMethodId, setSelectedMethodId] = useState('');
  const [channel, setChannel] = useState('Personal');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [depositBonusOffers, setDepositBonusOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [selectedBonusRuleId, setSelectedBonusRuleId] = useState('');
  const [rules, setRules] = useState(null);

  useEffect(() => {
    let active = true;
    fetchSiteActiveDepositBonus()
      .then((depositBonusResult) => {
        if (!active) return;
        setDepositBonusOffers(depositBonusResult.rules || []);
      })
      .catch(() => {
        if (active) setDepositBonusOffers([]);
      })
      .finally(() => {
        if (active) setLoadingOffers(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetchPublicDepositWithdrawRules()
      .then((data) => {
        if (active) setRules(data);
      })
      .catch(() => {
        if (active) setRules(null);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetchPublicPaymentMethods()
      .then((data) => {
        if (!active) return;
        setMethods(data);
        if (data.length) {
          setSelectedMethodId(String(data[0].id));
        }
      })
      .catch(() => {
        if (active) setMethods([]);
      })
      .finally(() => {
        if (active) setLoadingMethods(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedMethod = methods.find((item) => String(item.id) === selectedMethodId);

  const presetAmounts = useMemo(() => {
    const min = Number(rules?.depositMin ?? 100);
    const max = Number(rules?.depositMax ?? 50000);
    return AMOUNT_PRESETS.filter((value) => value >= min && value <= max);
  }, [rules]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedMethod) {
      setToast('কোনো পেমেন্ট মেথড পাওয়া যায়নি');
      window.setTimeout(() => setToast(''), 3000);
      return;
    }

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      setToast('সঠিক পরিমাণ দিন');
      window.setTimeout(() => setToast(''), 3000);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        amount: numericAmount,
        method: selectedMethod.name,
        channel,
      };
      if (selectedBonusRuleId) {
        payload.bonusRuleId = Number(selectedBonusRuleId);
      }
      const response = await submitDepositRequest(payload);
      const payUrl = response?.gateway?.payUrl || response?.gateway?.pay_url;
      if (payUrl) {
        setToast('পেমেন্ট পেজে নিয়ে যাওয়া হচ্ছে...');
        window.setTimeout(() => {
          window.location.href = payUrl;
        }, 400);
        return;
      }
      if (response?.gateway?.provider === 'winypay' && response?.gateway?.mode === 'redirect') {
        setToast('পেমেন্ট লিংক পাওয়া যায়নি। আবার চেষ্টা করুন।');
        return;
      }
      setToast('জমার অনুরোধ সফলভাবে জমা হয়েছে');
      setAmount('');
      setSelectedBonusRuleId('');
    } catch (error) {
      setToast(error.message || 'জমা দিতে ব্যর্থ');
    } finally {
      setSubmitting(false);
      window.setTimeout(() => setToast(''), 3500);
    }
  };

  return (
    <div className="min-h-screen pb-[82px] lg:pb-0" style={{ backgroundColor: colors.mainBg }}>
      <Header onProfileClick={() => navigate('/profile')} onMenuClick={() => navigate('/')} />

      <div className="mx-auto w-full max-w-lg px-3 py-4 lg:py-6">
        <div className="overflow-hidden rounded-2xl bg-[#eef1f4] shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="inline-flex items-center gap-2 text-base font-semibold text-slate-900"
            >
              <ArrowLeft size={20} />
              জমা দিন
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/profile/transactions?type=deposit')}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600"
                aria-label="Transaction history"
              >
                <History size={18} />
              </button>
              <button
                type="button"
                onClick={() => navigate('/profile/inbox')}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600"
                aria-label="Support"
              >
                <MessageCircle size={18} />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 p-3">
            <DepositBonusSelector
              offers={depositBonusOffers}
              loading={loadingOffers}
              selectedId={selectedBonusRuleId}
              onChange={setSelectedBonusRuleId}
              currencySymbol={currencySymbol}
            />

            <section className="rounded-xl bg-white p-4">
              <h2 className="text-[15px] font-bold text-slate-900">আমানতের মোড</h2>

              {loadingMethods ? (
                <p className="mt-3 text-sm text-slate-400">Loading payment methods...</p>
              ) : methods.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">এখন কোনো পেমেন্ট মেথড নেই</p>
              ) : (
                <div className="mt-3 grid grid-cols-3 gap-2.5">
                  {methods.map((item) => {
                    const brand = getMethodBrand(item.name);
                    const isActive = String(item.id) === selectedMethodId;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedMethodId(String(item.id))}
                        className={`${PAYMENT_MODE_CARD} ${
                          isActive ? SELECT_ACTIVE : SELECT_IDLE
                        }`}
                      >
                        {isActive ? <SelectionCheck /> : null}
                        {brand ? (
                          <img
                            src={brand}
                            alt={item.name}
                            className="h-9 w-full max-w-[4.75rem] object-contain"
                          />
                        ) : (
                          <span className="px-2 text-sm font-bold uppercase text-slate-700">{item.name}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <p className="mt-3 text-xs leading-relaxed text-red-600">
                মোড ও চ্যানেল নির্বাচন করে পরিমাণ দিন। &apos;পরবর্তী&apos; চাপলে আপনার জমার অনুরোধ
                জমা হবে।
              </p>
            </section>

            <section className="rounded-xl bg-white p-4">
              <h2 className="text-[15px] font-bold text-slate-900">পেমেন্ট চ্যানেল</h2>
              <div className="mt-3 grid grid-cols-3 gap-2.5">
                {CHANNEL_OPTIONS.map((item) => {
                  const isActive = channel === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setChannel(item.value)}
                      className={`${SELECT_CARD} min-h-[2.75rem] text-[13px] font-semibold ${
                        isActive ? `${SELECT_ACTIVE} text-emerald-700` : `${SELECT_IDLE} text-slate-600`
                      }`}
                    >
                      {isActive ? <SelectionCheck /> : null}
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-xl bg-white p-4">
              <h2 className="text-[15px] font-bold text-slate-900">জমা পরিমাণ</h2>

              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {presetAmounts.map((preset) => {
                  const isActive = Number(amount) === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(String(preset))}
                      className={`${SELECT_CARD} min-h-10 text-[13px] font-semibold ${
                        isActive ? `${SELECT_ACTIVE} text-emerald-700` : `${SELECT_IDLE} text-slate-600`
                      }`}
                    >
                      {isActive ? <SelectionCheck /> : null}
                      {formatAmount(preset)}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
                <span className="text-base font-bold text-slate-500">{currencySymbol}</span>
                <input
                  type="number"
                  min={rules?.depositMin ?? 1}
                  max={rules?.depositMax ?? undefined}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0"
                  className="w-full border-none bg-transparent text-base font-semibold text-slate-900 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>

              {selectedMethod?.accountNumber ? (
                <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                  Send payment to:{' '}
                  <span className="font-semibold">{selectedMethod.accountNumber}</span>
                </p>
              ) : null}

              {rules ? (
                <p className="mt-2 text-xs text-slate-400">
                  Allowed range: {currencySymbol}
                  {formatAmount(rules.depositMin)} – {currencySymbol}
                  {formatAmount(rules.depositMax)}
                </p>
              ) : null}
            </section>

            <button
              type="submit"
              disabled={submitting || loadingMethods || methods.length === 0}
              className="w-full rounded-xl bg-emerald-500 py-3.5 text-base font-semibold text-white shadow-[0_4px_14px_rgba(34,197,94,0.35)] disabled:opacity-60"
            >
              {submitting ? 'Processing...' : 'পরবর্তী'}
            </button>
          </form>
        </div>
      </div>

      <AuthToast message={toast} />
      {loggedIn ? <PlayerMobileNav /> : null}
    </div>
  );
}
