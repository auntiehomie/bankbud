import mongoose from 'mongoose';
import dotenv from 'dotenv';
import BankRate from './models/BankRate.js';

dotenv.config();

const sampleRates = [
  // Savings Accounts
  {
    bankName: 'Marcus by Goldman Sachs',
    accountType: 'savings',
    rate: 4.10,
    apy: 4.10,
    minDeposit: 0,
    features: ['No Monthly Fee', 'Online Banking', 'Mobile Banking', 'No Minimum Balance'],
    verifications: 12,
    reports: 0,
    source: 'https://marcus.com',
    notes: 'Highly competitive online savings account',
    availability: 'national',
  },
  {
    bankName: 'Ally Bank',
    accountType: 'savings',
    rate: 4.00,
    apy: 4.00,
    minDeposit: 0,
    features: ['No Monthly Fee', 'Online Banking', 'Mobile Banking', 'ATM Fee Reimbursement'],
    verifications: 15,
    reports: 0,
    source: 'https://ally.com',
    notes: 'Popular online bank with great customer service',
    availability: 'national',
  },
  {
    bankName: 'American Express Personal Savings',
    accountType: 'savings',
    rate: 4.00,
    apy: 4.00,
    minDeposit: 0,
    features: ['No Monthly Fee', 'Online Banking', 'Mobile Banking', 'No Minimum Balance'],
    verifications: 10,
    reports: 0,
    availability: 'national',
  },
  {
    bankName: 'CIT Bank Platinum Savings',
    accountType: 'savings',
    rate: 4.55,
    apy: 4.65,
    minDeposit: 5000,
    features: ['No Monthly Fee', 'Online Banking', 'Mobile Banking'],
    verifications: 8,
    reports: 0,
    availability: 'national',
  },
  {
    bankName: 'First Republic Bank',
    accountType: 'savings',
    rate: 3.80,
    apy: 3.85,
    minDeposit: 1000,
    features: ['Branch Access', 'Online Banking', 'Mobile Banking', 'No Monthly Fee'],
    verifications: 6,
    reports: 0,
    location: {
      city: 'San Francisco',
      state: 'CA',
      region: 'West Coast',
    },
    availability: 'regional',
  },
  
  // Checking Accounts
  {
    bankName: 'Discover Bank Cashback Debit',
    accountType: 'checking',
    rate: 0.25,
    apy: 0.25,
    minDeposit: 0,
    features: ['No Monthly Fee', 'Online Banking', 'Mobile Banking', 'ATM Fee Reimbursement', 'Debit Card', 'Check Writing'],
    verifications: 9,
    reports: 0,
    availability: 'national',
  },
  {
    bankName: 'Capital One 360 Checking',
    accountType: 'checking',
    rate: 0.10,
    apy: 0.10,
    minDeposit: 0,
    features: ['No Monthly Fee', 'Online Banking', 'Mobile Banking', 'Branch Access', 'Debit Card', 'Check Writing'],
    verifications: 14,
    reports: 0,
    availability: 'national',
  },
  {
    bankName: 'Chase Total Checking',
    accountType: 'checking',
    rate: 0.01,
    apy: 0.01,
    minDeposit: 0,
    features: ['Online Banking', 'Mobile Banking', 'Branch Access', 'Debit Card', 'Check Writing', 'Direct Deposit Required'],
    verifications: 20,
    reports: 1,
    notes: 'Monthly fee waived with direct deposit',
    availability: 'national',
  },
  {
    bankName: 'Umpqua Bank',
    accountType: 'checking',
    rate: 0.15,
    apy: 0.15,
    minDeposit: 0,
    features: ['Branch Access', 'Online Banking', 'Mobile Banking', 'Debit Card', 'Check Writing'],
    verifications: 5,
    reports: 0,
    location: {
      city: 'Portland',
      state: 'OR',
      region: 'Pacific Northwest',
    },
    availability: 'regional',
  },
  {
    bankName: 'Huntington Bank',
    accountType: 'savings',
    rate: 0.05,
    apy: 0.05,
    minDeposit: 0,
    features: ['Branch Access', 'Online Banking', 'Mobile Banking', 'ATM Access', 'Overdraft Protection'],
    verifications: 7,
    reports: 0,
    location: {
      city: 'Columbus',
      state: 'OH',
      region: 'Midwest',
    },
    availability: 'regional',
  },
  {
    bankName: 'Huntington Bank',
    accountType: 'checking',
    rate: 0.01,
    apy: 0.01,
    minDeposit: 0,
    features: ['Branch Access', 'Online Banking', 'Mobile Banking', 'Debit Card', 'Check Writing', '24-Hour Grace', 'ATM Access'],
    verifications: 12,
    reports: 0,
    location: {
      city: 'Columbus',
      state: 'OH',
      region: 'Midwest',
    },
    availability: 'regional',
  },
  {
    bankName: 'KeyBank',
    accountType: 'savings',
    rate: 0.02,
    apy: 0.02,
    minDeposit: 25,
    features: ['Branch Access', 'Online Banking', 'Mobile Banking', 'ATM Access'],
    verifications: 5,
    reports: 0,
    location: {
      city: 'Cleveland',
      state: 'OH',
      region: 'Midwest',
    },
    availability: 'regional',
  },
  {
    bankName: 'KeyBank',
    accountType: 'checking',
    rate: 0.01,
    apy: 0.01,
    minDeposit: 0,
    features: ['Branch Access', 'Online Banking', 'Mobile Banking', 'Debit Card', 'Check Writing', 'Relationship Banking'],
    verifications: 8,
    reports: 0,
    location: {
      city: 'Cleveland',
      state: 'OH',
      region: 'Midwest',
    },
    availability: 'regional',
  },
  {
    bankName: 'PNC Bank',
    accountType: 'savings',
    rate: 4.30,
    apy: 4.40,
    minDeposit: 0,
    features: ['Branch Access', 'Online Banking', 'Mobile Banking', 'No Monthly Fee', 'Virtual Wallet'],
    verifications: 11,
    reports: 0,
    availability: 'national',
  },
  {
    bankName: 'Wells Fargo',
    accountType: 'savings',
    rate: 0.15,
    apy: 0.15,
    minDeposit: 25,
    features: ['Branch Access', 'Online Banking', 'Mobile Banking', 'ATM Access', 'Automatic Savings'],
    verifications: 15,
    reports: 0,
    availability: 'national',
  },
  
  // CDs
  {
    bankName: 'Synchrony Bank',
    accountType: 'cd',
    rate: 4.75,
    apy: 4.75,
    minDeposit: 0,
    term: 12,
    features: ['No Monthly Fee', 'Online Banking'],
    verifications: 7,
    reports: 0,
    availability: 'national',
  },
  {
    bankName: 'Marcus by Goldman Sachs',
    accountType: 'cd',
    rate: 4.50,
    apy: 4.50,
    minDeposit: 500,
    term: 12,
    features: ['No Monthly Fee', 'Online Banking', 'No Penalty Early Withdrawal'],
    verifications: 11,
    reports: 0,
    availability: 'national',
  },
  {
    bankName: 'Barclays Bank',
    accountType: 'cd',
    rate: 5.00,
    apy: 5.00,
    minDeposit: 0,
    term: 18,
    features: ['No Monthly Fee', 'Online Banking'],
    verifications: 6,
    reports: 0,
    availability: 'national',
  },
  {
    bankName: 'Capital One',
    accountType: 'cd',
    rate: 4.50,
    apy: 4.60,
    minDeposit: 0,
    term: 6,
    features: ['No Monthly Fee', 'Online Banking', 'Branch Access'],
    verifications: 8,
    reports: 0,
    availability: 'national',
  },
  
  // Money Market
  {
    bankName: 'Vio Bank',
    accountType: 'money-market',
    rate: 4.83,
    apy: 4.95,
    minDeposit: 100,
    features: ['No Monthly Fee', 'Online Banking', 'Mobile Banking', 'Check Writing'],
    verifications: 5,
    reports: 0,
    availability: 'national',
  },
  {
    bankName: 'Sallie Mae Bank',
    accountType: 'money-market',
    rate: 4.65,
    apy: 4.75,
    minDeposit: 0,
    features: ['No Monthly Fee', 'Online Banking', 'Mobile Banking', 'ATM Fee Reimbursement', 'Debit Card'],
    verifications: 7,
    reports: 0,
    availability: 'national',
  },
];

async function seedDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bankbud';
    await mongoose.connect(mongoUri, {
      tls: true,
      tlsAllowInvalidCertificates: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Clear existing data
    await BankRate.deleteMany({});
    console.log('🧹 Cleared existing rates');
    
    // Insert sample data
    await BankRate.insertMany(sampleRates);
    console.log(`✅ Inserted ${sampleRates.length} sample rates`);
    
    // Display summary
    const counts = await Promise.all([
      BankRate.countDocuments({ accountType: 'savings' }),
      BankRate.countDocuments({ accountType: 'checking' }),
      BankRate.countDocuments({ accountType: 'cd' }),
      BankRate.countDocuments({ accountType: 'money-market' }),
    ]);
    
    console.log('\n📊 Database Summary:');
    console.log(`  - Savings Accounts: ${counts[0]}`);
    console.log(`  - Checking Accounts: ${counts[1]}`);
    console.log(`  - CDs: ${counts[2]}`);
    console.log(`  - Money Market: ${counts[3]}`);
    console.log(`  - Total: ${counts.reduce((a, b) => a + b, 0)}\n`);
    
    await mongoose.connection.close();
    console.log('✅ Database seeding complete!');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
