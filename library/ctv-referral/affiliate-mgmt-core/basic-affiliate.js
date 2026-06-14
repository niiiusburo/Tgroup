const { AffiliateEngine } = require('../src/index.js');

async function basicAffiliateExample() {
  console.log('🚀 Starting Basic Affiliate Management Example');
  
  // Initialize the affiliate system
  const affiliateSystem = new AffiliateEngine({
    commission: {
      enabled: true,
      multiTier: false,
      calculation: 'percentage',
      rate: 10
    },
    referral: {
      enabled: true,
      tracking: true,
      attribution: 'last-click'
    },
    payment: {
      enabled: true,
      processor: 'razorpay',
      schedule: 'monthly',
      minimum: 50
    },
    analytics: {
      enabled: true,
      reporting: true,
      dashboard: true
    },
    fraud: {
      enabled: true,
      detection: true,
      prevention: true
    }
  });

  // Wait for initialization
  await new Promise(resolve => {
    if (affiliateSystem.isInitialized) {
      resolve();
    } else {
      affiliateSystem.once('initialized', resolve);
    }
  });

  console.log('✅ Affiliate System initialized');

  try {
    // Create an affiliate
    const affiliate = await affiliateSystem.createAffiliate({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      company: 'Tech Solutions Inc',
      website: 'https://techsolutions.com',
      taxId: 'TAX123456',
      paymentMethod: 'bank_transfer',
      bankDetails: {
        accountNumber: '1234567890',
        routingNumber: '987654321',
        bankName: 'First National Bank'
      }
    });

    console.log('✅ Affiliate created:', {
      id: affiliate.id,
      name: affiliate.name,
      email: affiliate.email,
      status: affiliate.status
    });

    // Create a referral link
    const referralLink = await affiliateSystem.createReferralLink(affiliate.id, {
      baseUrl: 'https://example.com',
      customParameters: {
        source: 'email',
        campaign: 'winter2024'
      }
    });

    console.log('✅ Referral link created:', {
      id: referralLink.id,
      code: referralLink.code,
      url: referralLink.url
    });

    // Track a referral
    const referral = await affiliateSystem.trackReferral({
      affiliateId: affiliate.id,
      referralCode: referralLink.code,
      customerId: 'CUST001',
      sessionId: 'SESS001',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0...',
      referrer: 'https://google.com'
    });

    console.log('✅ Referral tracked:', {
      id: referral.id,
      affiliateId: referral.affiliateId,
      customerId: referral.customerId,
      attribution: referral.attributionData
    });

    // Calculate commission for a sale
    const commission = await affiliateSystem.calculateCommission(affiliate.id, 1000, {
      productId: 'PROD001',
      customerId: 'CUST001'
    });

    console.log('✅ Commission calculated:', {
      id: commission.id,
      affiliateId: commission.affiliateId,
      amount: commission.amount,
      commissionRate: commission.commissionRate,
      totalCommission: commission.totalCommission
    });

    // Track the commission
    const trackedCommission = await affiliateSystem.trackCommission(affiliate.id, {
      amount: 1000,
      transactionId: 'TXN001',
      customerId: 'CUST001',
      productId: 'PROD001'
    });

    console.log('✅ Commission tracked:', {
      id: trackedCommission.id,
      totalCommission: trackedCommission.totalCommission,
      timestamp: trackedCommission.timestamp
    });

    // Get referral stats
    const stats = await affiliateSystem.getReferralStats(affiliate.id, {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      endDate: new Date()
    });

    console.log('✅ Referral stats:', {
      totalReferrals: stats.totalReferrals,
      uniqueCustomers: stats.uniqueCustomers,
      conversionRate: stats.conversionRate.toFixed(2) + '%'
    });

    // Get commission history
    const commissionHistory = await affiliateSystem.getCommissionHistory(affiliate.id, {
      limit: 10
    });

    console.log('✅ Commission history:', {
      total: commissionHistory.total,
      recentCommissions: commissionHistory.history.slice(0, 3).map(c => ({
        amount: c.amount,
        commission: c.totalCommission,
        date: c.timestamp
      }))
    });

    // Get system status
    const systemStatus = affiliateSystem.getSystemStatus();
    console.log('✅ System status:', systemStatus);

    // Get supported features
    const features = affiliateSystem.getSupportedFeatures();
    console.log('✅ Supported features:', features);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    // Shutdown the system
    await affiliateSystem.shutdown();
    console.log('✅ Affiliate System shutdown');
  }
}

// Run the example
if (require.main === module) {
  basicAffiliateExample().catch(console.error);
}

module.exports = basicAffiliateExample;
