import paramiko, sys, json
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

VERIFY = r"""
cd /www/wwwroot/jowabuzz/backend
node --input-type=module << 'EOF'
import { stripAffiliateCommissionFields } from './middleware/affiliateResponseSanitizer.js';

const sample = {
  commissionPercent: 25,
  commission_percent: 20,
  availableBalance: 100,
  affiliate: { commissionRate: 15, name: 'Test' },
  formula: 'Commission = Net Profit × Commission %',
  recentSettlements: [{ commissionPercent: 25, amount: 100 }],
};

const cleaned = stripAffiliateCommissionFields(sample);
console.log('SANITIZER_TEST:', JSON.stringify(cleaned));
console.log('HAS_COMMISSION:', JSON.stringify(cleaned).includes('commission') ? 'FAIL' : 'PASS');
EOF
grep -l affiliateResponseSanitizer routes/affiliateRoutes.js routes/affiliateAuthRoutes.js && echo MIDDLEWARE_WIRED_OK
pm2 list | grep jowabuzz
curl -s -o /dev/null -w "health:%{http_code}\n" http://127.0.0.1:3001/api/health
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.165.10.242', 22, 'root', 'Jowabuzz@12', timeout=30)
_, o, e = c.exec_command(VERIFY, timeout=60)
print(o.read().decode('utf-8', errors='replace'))
print(e.read().decode('utf-8', errors='replace'))
c.close()
