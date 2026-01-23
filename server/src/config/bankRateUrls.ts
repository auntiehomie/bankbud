/**
 * Direct URLs to bank rate pages
 * Helps AI navigate directly to where rates are published
 */

interface BankRateUrls {
  bankName: string;
  savingsUrl?: string;
  checkingUrl?: string;
  cdUrl?: string;
  moneyMarketUrl?: string;
  homepage?: string;
}

export const BANK_RATE_URLS: BankRateUrls[] = [
  {
    bankName: 'Marcus by Goldman Sachs',
    savingsUrl: 'https://www.marcus.com/us/en/savings-accounts/high-yield-savings',
    cdUrl: 'https://www.marcus.com/us/en/savings-accounts/certificate-of-deposit',
    homepage: 'https://www.marcus.com'
  },
  {
    bankName: 'Ally Bank',
    savingsUrl: 'https://www.ally.com/bank/online-savings-account/',
    checkingUrl: 'https://www.ally.com/bank/interest-checking-account/',
    cdUrl: 'https://www.ally.com/bank/high-yield-cd/',
    moneyMarketUrl: 'https://www.ally.com/bank/money-market-account/',
    homepage: 'https://www.ally.com'
  },
  {
    bankName: 'Synchrony Bank',
    savingsUrl: 'https://www.synchronybank.com/banking/high-yield-savings/',
    cdUrl: 'https://www.synchronybank.com/banking/cds/',
    moneyMarketUrl: 'https://www.synchronybank.com/banking/money-market-account/',
    homepage: 'https://www.synchronybank.com'
  },
  {
    bankName: 'Discover Bank',
    savingsUrl: 'https://www.discover.com/online-banking/savings-account/',
    checkingUrl: 'https://www.discover.com/online-banking/checking/',
    cdUrl: 'https://www.discover.com/online-banking/cd/',
    homepage: 'https://www.discover.com'
  },
  {
    bankName: 'Capital One',
    savingsUrl: 'https://www.capitalone.com/bank/savings-accounts/online-performance-savings-account/',
    checkingUrl: 'https://www.capitalone.com/bank/checking-accounts/',
    cdUrl: 'https://www.capitalone.com/bank/cds/',
    moneyMarketUrl: 'https://www.capitalone.com/bank/money-market/',
    homepage: 'https://www.capitalone.com'
  },
  {
    bankName: 'American Express',
    savingsUrl: 'https://www.americanexpress.com/en-us/banking/online-savings/accounts/',
    cdUrl: 'https://www.americanexpress.com/en-us/banking/online-savings/cds/',
    homepage: 'https://www.americanexpress.com'
  },
  {
    bankName: 'CIT Bank',
    savingsUrl: 'https://www.cit.com/cit-bank/savings/platinum-savings/',
    moneyMarketUrl: 'https://www.cit.com/cit-bank/savings/money-market/',
    cdUrl: 'https://www.cit.com/cit-bank/cds/',
    homepage: 'https://www.cit.com'
  },
  {
    bankName: 'Barclays',
    savingsUrl: 'https://www.banking.barclaysus.com/online-savings.html',
    cdUrl: 'https://www.banking.barclaysus.com/online-cd.html',
    homepage: 'https://www.banking.barclaysus.com'
  },
  {
    bankName: 'Citizens Access',
    savingsUrl: 'https://www.citizensaccess.com/online-savings-account.html',
    cdUrl: 'https://www.citizensaccess.com/online-cd-rates.html',
    homepage: 'https://www.citizensaccess.com'
  },
  {
    bankName: 'Flagstar Bank',
    savingsUrl: 'https://www.flagstar.com/personal/banking/savings.html',
    checkingUrl: 'https://www.flagstar.com/personal/banking/checking.html',
    homepage: 'https://www.flagstar.com'
  },
  {
    bankName: 'KeyBank',
    savingsUrl: 'https://www.key.com/personal/bank-accounts/savings-accounts.jsp',
    checkingUrl: 'https://www.key.com/personal/bank-accounts/checking-accounts.jsp',
    homepage: 'https://www.key.com'
  },
  {
    bankName: 'Huntington Bank',
    savingsUrl: 'https://www.huntington.com/Personal/checking-savings/savings',
    checkingUrl: 'https://www.huntington.com/Personal/checking',
    homepage: 'https://www.huntington.com'
  },
  {
    bankName: 'PNC Bank',
    savingsUrl: 'https://www.pnc.com/en/personal-banking/banking/savings/pnc-high-yield-savings.html',
    checkingUrl: 'https://www.pnc.com/en/personal-banking/banking/checking.html',
    homepage: 'https://www.pnc.com'
  },
  {
    bankName: 'Citizens Bank',
    savingsUrl: 'https://www.citizensbank.com/savings/citizens-savings.aspx',
    checkingUrl: 'https://www.citizensbank.com/checking/citizens-everyday-checking.aspx',
    homepage: 'https://www.citizensbank.com'
  },
  {
    bankName: 'Chase Bank',
    savingsUrl: 'https://www.chase.com/personal/savings',
    checkingUrl: 'https://www.chase.com/personal/checking',
    homepage: 'https://www.chase.com'
  },
  {
    bankName: 'Bank of America',
    savingsUrl: 'https://www.bankofamerica.com/deposits/savings-accounts/',
    checkingUrl: 'https://www.bankofamerica.com/deposits/checking/personal-checking-account/',
    homepage: 'https://www.bankofamerica.com'
  },
  {
    bankName: 'Comerica Bank',
    savingsUrl: 'https://www.comerica.com/personal-banking/banking-products/savings-accounts.html',
    checkingUrl: 'https://www.comerica.com/personal-banking/banking-products/checking-accounts.html',
    homepage: 'https://www.comerica.com'
  },
  {
    bankName: 'Michigan Schools and Government Credit Union',
    savingsUrl: 'https://www.msgcu.org/products-services/savings-and-money-market',
    checkingUrl: 'https://www.msgcu.org/products-services/checking',
    homepage: 'https://www.msgcu.org'
  },
  {
    bankName: 'Lake Michigan Credit Union',
    savingsUrl: 'https://www.lmcu.org/banking/savings/',
    checkingUrl: 'https://www.lmcu.org/banking/checking/',
    homepage: 'https://www.lmcu.org'
  }
];

/**
 * Get the specific rate page URL for a bank and account type
 */
export function getBankRateUrl(bankName: string, accountType: 'savings' | 'checking' | 'cd' | 'money-market'): string | null {
  const bank = BANK_RATE_URLS.find(b => 
    b.bankName.toLowerCase().includes(bankName.toLowerCase()) ||
    bankName.toLowerCase().includes(b.bankName.toLowerCase())
  );
  
  if (!bank) return null;
  
  switch (accountType) {
    case 'savings':
      return bank.savingsUrl || bank.homepage || null;
    case 'checking':
      return bank.checkingUrl || bank.homepage || null;
    case 'cd':
      return bank.cdUrl || bank.homepage || null;
    case 'money-market':
      return bank.moneyMarketUrl || bank.homepage || null;
    default:
      return bank.homepage || null;
  }
}
