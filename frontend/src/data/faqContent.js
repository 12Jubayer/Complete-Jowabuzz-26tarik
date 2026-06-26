export const faqCategories = [
  { id: 'all', label: 'সব' },
  { id: 'withdrawal', label: 'উত্তোলন' },
  { id: 'deposit', label: 'আমানত' },
  { id: 'technical', label: 'টেকনিক্যাল' },
  { id: 'support', label: 'গ্রাহক সেবা' },
  { id: 'account', label: 'আমার অ্যাকাউন্ট' },
  { id: 'sportsbook', label: 'স্পোর্টসবুক' },
  { id: 'casino', label: 'ক্যাসিনো' },
  { id: 'slot', label: 'স্লট' },
  { id: 'others', label: 'অন্যান্য' },
  { id: 'table', label: 'টেবিল' },
  { id: 'lottery', label: 'লটারি' },
  { id: 'app', label: 'JowaBuzz অ্যাপ' },
];

export const faqContent = {
  subtitle: 'আমাদের তথ্য কেন্দ্রে স্বাগতম',
  title: 'প্রায়শই জিজ্ঞাসিত প্রশ্নাবলী',
  intro:
    'নিচে JowaBuzz সম্পর্কে সাধারণত জিজ্ঞাসিত প্রশ্নগুলো দেওয়া হয়েছে। আপনার প্রশ্নের উত্তর এখানে না থাকলে, দয়া করে আমাদের ২৪/৭ গ্রাহক সহায়তার সাথে যোগাযোগ করুন।',
  questions: [
    {
      id: 'q1',
      category: 'account',
      text: 'কল আইডির মাধ্যমে কীভাবে আপনার ফোন নম্বর যাচাই করবেন (শুধুমাত্র গ্রামীণ ফোন)',
      answer:
        'অ্যাকাউন্ট সেটিংসে গিয়ে "মোবাইল ভেরিফিকেশন" বেছে নিন। গ্রামীণফোন নম্বর দিন এবং "Call ID" পদ্ধতি সিলেক্ট করুন। সিস্টেম যে নম্বরে কল করবে, সেই কল রিসিভ না করলেও কল আইডি/মিসড কল রেকর্ড দেখে যাচাই সম্পন্ন হয়। কয়েক মিনিটের মধ্যে স্ট্যাটাস "Verified" না হলে Live Chat-এ Transaction ID ও নম্বর জানান।',
    },
    {
      id: 'q2',
      category: 'deposit',
      text: 'USDT এর মাধ্যমে কীভাবে ডিপোজিট জমা করবেন?',
      answer:
        'Wallet → Deposit → USDT (TRC20/ERC20) সিলেক্ট করুন। স্ক্রিনে দেখানো ওয়ালেট ঠিকানায় সঠিক নেটওয়ার্কে USDT পাঠান। ট্রান্সফারের পর TxID/Hash কপি করে Deposit ফর্মে বসান এবং Submit করুন। সাধারণত ১০–৩০ মিনিটে ব্যালান্স আপডেট হয়; দেরি হলে TxID সহ Live Chat-এ যোগাযোগ করুন।',
    },
    {
      id: 'q3',
      category: 'deposit',
      text: 'বিকাশ বোনানজা পেমেন্ট চ্যানেলে কীভাবে ডিপোজিট করবেন',
      answer:
        'Deposit পেজে bKash Bonanza চ্যানেল বেছে নিন। JowaBuzz-এর দেওয়া Merchant/Agent নম্বরে "Send Money" করুন। Amount ও Reference/Transaction ID অবশ্যই সঠিকভাবে ফর্মে লিখুন। পেমেন্ট সফল হলে SMS-এর TrxID সংযুক্ত করে Submit করুন; ভুল Reference দিলে ক্রেডিট দেরি হতে পারে।',
    },
    {
      id: 'q4',
      category: 'deposit',
      text: 'বিকাশ ইপে চ্যানেলের মাধ্যমে কীভাবে ডিপোজিট করবেন',
      answer:
        'Deposit → bKash ePay সিলেক্ট করুন। পেজে Redirect হলে bKash PIN দিয়ে পেমেন্ট সম্পন্ন করুন। সফল হলে স্বয়ংক্রিয়ভাবে ব্যালান্স যোগ হয়। পেজ বন্ধ হয়ে গেলে Transaction History চেক করুন; Pending থাকলে TrxID নিয়ে ২৪/৭ সাপোর্টে জানান।',
    },
    {
      id: 'q5',
      category: 'deposit',
      text: 'লোকাল ব্যাংকের মাধ্যমে কীভাবে ডিপোজিট করবেন',
      answer:
        'Deposit → Local Bank Transfer বেছে নিন। JowaBuzz-এর ব্যাংক অ্যাকাউন্ট, Branch ও Reference Code দেখে আপনার ব্যাংক অ্যাপ/শাখা থেকে টাকা পাঠান। Deposit ফর্মে Amount, Bank Name, Slip/Reference Number আপলোড বা লিখুন। ম্যানুয়াল ভেরিফিকেশনে ৩০ মিনিট–২ ঘণ্টা লাগতে পারে।',
    },
    {
      id: 'q6',
      category: 'account',
      text: 'কিভাবে আপনার অ্যাকাউন্ট আনলক করবেন',
      answer:
        'অ্যাকাউন্ট নিরাপত্তাজনিত কারণে, একাধিক ভুল পাসওয়ার্ড, সন্দেহজনক লগইন বা KYC অসম্পূর্ণ থাকলে লক হতে পারে। Live Chat বা ইমেইলে Username, Registered Mobile/Email ও পরিচয়পত্রের ছবি পাঠান। ভেরিফিকেশনের পর সাপোর্ট টিম অ্যাকাউন্ট আনলক করে জানিয়ে দেবে।',
    },
    {
      id: 'q7',
      category: 'withdrawal',
      text: 'শিওরক্যাশ উইথড্রয়াল',
      answer:
        'Withdraw → SureCash সিলেক্ট করুন। অ্যাকাউন্টে যোগ করা SureCash নম্বর ও Amount লিখুন। Turnover/বোনাস শর্ত পূরণ হয়েছে কিনা নিশ্চিত করুন। অনুরোধ Submit-এর পর সাধারণত ৫–৩০ মিনিটে প্রসেস হয়; Pending থাকলে Withdraw History থেকে Status দেখুন বা সাপোর্টে Ticket ID দিন।',
    },
    {
      id: 'q8',
      category: 'account',
      text: 'কিভাবে আমার অ্যাকাউন্টে পাসওয়ার্ড রিসেট করবেন?',
      answer:
        'Login পেজে "Forgot Password" ক্লিক করুন। নিবন্ধিত মোবাইল বা ইমেইল দিন। OTP পেলে নতুন পাসওয়ার্ড সেট করুন (কমপক্ষে ৮ অক্ষর, অক্ষর+সংখ্যা মিশ্রিত রাখুন)। OTP না এলে Spam ফোল্ডার চেক করুন বা Live Chat-এ Username জানিয়ে ম্যানুয়াল রিসেট অনুরোধ করুন।',
    },
    {
      id: 'q9',
      category: 'account',
      text: 'কিভাবে সরাসরি প্লেয়ারের অ্যাকাউন্টে একটি নতুন নম্বর যোগ করবেন?',
      answer:
        'Profile → Account Settings → Phone Numbers এ যান। "Add New Number" ক্লিক করে নতুন নম্বর দিন এবং OTP/Call ID দিয়ে যাচাই করুন। একাধিক নম্বর যোগ করা যায়, তবে Withdrawal-এর জন্য যাচাইকৃত নম্বরই ব্যবহার করতে হবে। সমস্যা হলে KYC ডকুমেন্টসহ সাপোর্টে যোগাযোগ করুন।',
    },
    {
      id: 'q10',
      category: 'others',
      text: 'কিভাবে আপনার বোনাস ক্লেইম করবেন (মোবাইল)?',
      answer:
        'মোবাইলে Menu → Promotions/Bonus খুলুন। Available Bonus তালিকা থেকে যোগ্য অফার বেছে "Claim" করুন। কিছু বোনাসে Promo Code লাগতে পারে—Deposit করার আগে কোড বসান। Turnover শর্ত পূরণ না হলে Withdrawal ব্লক থাকতে পারে; Bonus Terms অবশ্যই পড়ুন।',
    },
    {
      id: 'q11',
      category: 'others',
      text: 'কিভাবে আপনার বোনাস ক্লেইম করবেন (ডেস্কটপ)?',
      answer:
        'ডেস্কটপে উপরের মেনু থেকে Promotions বা My Account → Bonus সেকশনে যান। Eligible বোনাসে Claim Now ক্লিক করুন। Deposit Bonus হলে প্রথমে কোড এন্টার করে তারপর Deposit করুন। Bonus History থেকে Active/Completed স্ট্যাটাস ট্র্যাক করতে পারবেন।',
    },
    {
      id: 'q12',
      category: 'account',
      text: 'কিভাবে আমার পাসওয়ার্ড রিসেট করব?',
      answer:
        'লগইন করা অবস্থায় Profile → Change Password-এ গিয়ে পুরনো ও নতুন পাসওয়ার্ড দিন। লগআউট থাকলে Forgot Password ব্যবহার করুন। নিরাপত্তার জন্য পাসওয়ার্ড কাউকে শেয়ার করবেন না এবং নিয়মিত পরিবর্তন করুন।',
    },
    {
      id: 'q13',
      category: 'account',
      text: 'মোবাইল ভেরিফিকেশন',
      answer:
        'Profile → Verify Mobile-এ আপনার নম্বর দিন। SMS OTP বা Call ID পদ্ধতিতে যাচাই সম্পন্ন করুন। যাচাইকৃত নম্বর দিয়ে Login, Withdrawal ও OTP রিসেট সহজ হয়। OTP একাধিকবার ভুল দিলে ৩০ মিনিট অপেক্ষা করুন বা সাপোর্টে যোগাযোগ করুন।',
    },
    {
      id: 'q14',
      category: 'account',
      text: 'ইমেইলের সত্যতা যাচাই',
      answer:
        'Profile → Email Verification-এ ইমেইল ঠিকানা দিন। Inbox-এ পাঠানো Verification Link-এ ক্লিক করুন (Spam/Junk ফোল্ডারও দেখুন)। লিংক মেয়াদ শেষ হলে "Resend" চাপুন। ইমেইল পরিবর্তন করতে চাইলে সাপোর্টে পরিচয়পত্রসহ অনুরোধ করুন।',
    },
    {
      id: 'q15',
      category: 'deposit',
      text: 'অসম্পূর্ণ ডিপোজিট অনুরোধ সম্পাদন করুন (Mobile)',
      answer:
        'মোবাইলে Wallet → Deposit History খুলুন। Status "Pending/Incomplete" থাকলে Request খুলে TrxID, Screenshot ও সঠিক Amount আপডেট করে Resubmit করুন। ভুল Amount/Reference দিলে ক্রেডিট হবে না—SMS/Statement মিলিয়ে ঠিক তথ্য দিন।',
    },
    {
      id: 'q16',
      category: 'deposit',
      text: 'অসম্পূর্ণ ডিপোজিট অনুরোধ সম্পাদন করুন (PC)',
      answer:
        'PC-তে My Account → Transactions → Deposits-এ Pending আইটেম খুঁজুন। Edit/Complete অপশনে TrxID ও Payment Proof আপলোড করুন। Submit-এর পর ১৫–৬০ মিনিটে রিভিউ হয়; Rejected হলে কারণ দেখে নতুন সঠিক অনুরোধ দিন।',
    },
    {
      id: 'q17',
      category: 'deposit',
      text: 'JowaBuzz ডিপোজিট সমস্যা (মোবাইল)',
      answer:
        'প্রথমে ইন্টারনেট ও bKash/Nagad ব্যালান্স চেক করুন। TrxID সঠিকভাবে দিয়েছেন কিনা, Amount মিলেছে কিনা দেখুন। App Cache Clear করে আবার চেষ্টা করুন। ১ ঘণ্টারও বেশি Pending থাকলে TrxID, Screenshot ও Username নিয়ে Live Chat-এ যোগাযোগ করুন।',
    },
    {
      id: 'q18',
      category: 'deposit',
      text: 'JowaBuzz ডিপোজিট সমস্যা (PC)',
      answer:
        'Browser Cache/Cookies Clear করে Incognito মোডে Login করুন। Ad-blocker বন্ধ রাখুন। Deposit History-তে Status দেখুন—Failed হলে নতুন Request দিন, Pending হলে Proof আপলোড করুন। একই TrxID দুবার ব্যবহার করবেন না।',
    },
    {
      id: 'q19',
      category: 'withdrawal',
      text: 'JowaBuzz উইথড্রয়াল সমস্যা (মোবাইল)',
      answer:
        'Withdrawal Pending/Rejected কারণ: Turnover incomplete, ভুল Wallet Number, বা KYC pending। Withdraw History-তে Remark পড়ুন। Wallet Number Profile-এ Verified কিনা নিশ্চিত করুন। ২৪ ঘণ্টার বেশি Pending থাকলে Request ID সহ সাপোর্টে জানান।',
    },
    {
      id: 'q20',
      category: 'withdrawal',
      text: 'JowaBuzz উইথড্রয়াল সমস্যা (PC)',
      answer:
        'PC-তে Withdrawals → History চেক করুন। Daily limit অতিক্রম, Active Bonus turnover বা Name Mismatch হলে Reject হতে পারে। সঠিক bKash/Nagad নম্বর Profile-এ আপডেট করুন। প্রয়োজনে KYC Document আপলোড করে সাপোর্ট টিকেট খুলুন।',
    },
    {
      id: 'q21',
      category: 'deposit',
      text: 'যদি আমি আমার ডিপোজিট লেনদেন ৪৮ ঘণ্টার মধ্যে সম্পন্ন করতে ব্যর্থ হই তাহলে কি হবে?',
      answer:
        '৪৮ ঘণ্টার মধ্যে TrxID/Reference Submit না করলে Pending Deposit Request স্বয়ংক্রিয়ভাবে Cancel/Expire হতে পারে। টাকা ইতিমধ্যে পাঠিয়ে থাকলে দেরিতে হলেও TrxID + Statement Proof দিয়ে সাপোর্টে জানান—ম্যানুয়াল ভেরিফিকেশনে ক্রেডিট করা যায়। ভবিষ্যতে পেমেন্টের সাথে সাথে Submit করুন।',
    },
    {
      id: 'q22',
      category: 'withdrawal',
      text: 'আমি কি অন্য নামে নিবন্ধিত একটি ব্যাংক থেকে টাকা উইথড্র করতে পারি?',
      answer:
        'নিরাপত্তা ও AML নীতিমালার কারণে Withdrawal শুধুমাত্র আপনার JowaBuzz অ্যাকাউন্টে নিবন্ধিত ও যাচাইকৃত নামের Wallet/Bank-এ যায়। অন্য কারো নামে Registered bKash/Nagad/Bank-এ উত্তোলন সম্ভব নয়। নাম পরিবর্তনের জন্য KYC ও সাপোর্ট Approval লাগে।',
    },
    {
      id: 'q23',
      category: 'account',
      text: 'আমি যদি আমার অ্যাকাউন্টে লগ ইন করতে ব্যর্থ হই তাহলে আমার কি করা উচিত?',
      answer:
        'Username/Password সঠিক কিনা, Caps Lock বন্ধ আছে কিনা দেখুন। Forgot Password দিয়ে রিসেট করুন। Account Locked মেসেজ এলে সাপোর্টে Username + Registered Phone জানান। Browser/App আপডেট করুন এবং Cache Clear করে আবার চেষ্টা করুন।',
    },
    {
      id: 'q24',
      category: 'account',
      text: 'আমার ফোন নম্বর বা ইমেইল যাচাই করতে ব্যর্থ হলে আমার কী করা উচিত?',
      answer:
        'নম্বর/ইমেইল সঠিক টাইপ হয়েছে কিনা, OTP Spam ফোল্ডারে গেছে কিনা চেক করুন। ৩০ মিনিট অপেক্ষা করে Resend OTP চাপুন। Call ID কাজ না করলে Live Chat-এ Username, Phone ও Network Provider জানান। প্রয়োজনে পরিচয়পত্র দিয়ে ম্যানুয়াল Verification করা হয়।',
    },
    {
      id: 'q25',
      category: 'deposit',
      text: 'সর্বনিম্ন এবং সর্বোচ্চ ডিপোজিট এর পরিমাণ কত?',
      answer:
        'পেমেন্ট পদ্ধতি অনুযায়ী সীমা ভিন্ন: bKash/Nagad/Rocket সাধারণত ন্যূনতম ৳২০০–৫০০, সর্বোচ্চ ৳৫০,০০০–২,০০,০০০ (প্রতি লেনদেন)। USDT/Bank Transfer-এ আলাদা সীমা থাকতে পারে। Deposit পেজে চ্যানেল বাছলেই Live Min/Max Amount দেখাবে—সেখানকার তথ্যই চূড়ান্ত।',
    },
  ],
};

export default faqContent;
