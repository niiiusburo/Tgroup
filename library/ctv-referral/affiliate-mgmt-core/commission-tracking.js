const { AffiliateEngine } = require('../src/index.js');

async function commissionTrackingExample() {
  console.log('💰 Starting Commission Tracking Example');
  
  // Initialize the affiliate system with multi-tier commission
  const affiliateSystem = new AffiliateEngine({
    commission: {
      enabled: true,
      multiTier: true,
      calculation: 'percentage',
      rate: 10,
      tiers: [
        { level: 1, rate: 10, name: 'Bronze' },
        { level: 2, rate: 15, name: 'Silver' },
        { level: 3, rate: 20, name: 'Gold' }
      ],
      volumeBonuses: [
        { threshold: 1000, bonus: 2 },
        { threshold: 5000, bonus: 5 },
        { threshold: 10000, bonus: 10 }
      ]
    },
    referral: {
      enabled: true,
      tracking: true
    },
    payment: {
      enabled: true,
      processor: 'razorpay',
      minimum: 50
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

  console.log('✅ Commission tracking system initialized');

  try {
    // Create multiple affiliates with different tiers
    const affiliates = [];
    
    for (let i = 1; i <= 3; i++) {
      const affiliate = await affiliateSystem.createAffiliate({
        name: `Affiliate ${i}`,
        email: `affiliate${i}@example.com`,
        tier: i,
        totalSales: i * 2000, // Different sales volumes
        paymentMethod: 'bank_transfer'
      });
      
      affiliates.push(affiliate);
      console.log(`✅ Created ${affiliate.name} (Tier ${i})`);
    }

    // Simulate multiple transactions for each affiliate
    const transactions = [
      { amount: 500, product: 'Product A' },
      { amount: 1200, product: 'Product B' },
      { amount: 800, product: 'Product C' },
      { amount: 2000, product: 'Product D' },
      { amount: 1500, product: 'Product E' }
    ];

    for (const affiliate of affiliates) {
      console.log(`\n📊 Processing transactions for ${affiliate.name}:`);
      
      for (let i = 0; i < transactions.length; i++) {
        const transaction = transactions[i];
        
        // Calculate commission
        const commission = await affiliateSystem.calculateCommission(
          affiliate.id, 
          transaction.amount,
          {
            productId: transaction.product,
            customerId: `CUST${i + 1}`,
            transactionType: 'sale'
          }
        );

        console.log(`  💰 ${transaction.product}: $${transaction.amount} → Commission: $${commission.totalCommission.toFixed(2)} (${commission.commissionRate}%)`);

        // Track the commission
        await affiliateSystem.trackCommission(affiliate.id, {
          amount: transaction.amount,
          transactionId: `TXN${affiliate.id}_${i + 1}`,
          customerId: `CUST${i + 1}`,
          productId: transaction.product,
          options: {
            product: transaction.product,
            category: 'electronics'
          }
        });
      }

      // Get commission stats for this affiliate
      const stats = await affiliateSystem.getCommissionStats(affiliate.id, {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      });

      console.log(`\n📈 Commission Summary for ${affiliate.name}:`);
      console.log(`  Total Commissions: $${stats.totalCommissions.toFixed(2)}`);
      console.log(`  Total Sales: $${stats.totalAmount.toFixed(2)}`);
      console.log(`  Average Commission: $${stats.averageCommission.toFixed(2)}`);
      console.log(`  Commission Count: ${stats.commissionCount}`);
      
      if (stats.tierInfo) {
        console.log(`  Tier: ${stats.tierInfo.name} (Level ${stats.tierInfo.level})`);
      }
    }

    // Demonstrate volume bonus calculation
    console.log('\n🎯 Volume Bonus Example:');
    const highVolumeAffiliate = affiliates[2]; // Gold tier affiliate
    
    // Simulate a large transaction that triggers volume bonus
    const largeTransaction = await affiliateSystem.calculateCommission(
      highVolumeAffiliate.id,
      15000, // Large amount
      {
        productId: 'Premium Product',
        customerId: 'VIP_CUSTOMER',
        transactionType: 'sale'
      }
    );

    console.log(`Large transaction for ${highVolumeAffiliate.name}:`);
    console.log(`  Amount: $15,000`);
    console.log(`  Base Commission (${largeTransaction.commissionRate}%): $${largeTransaction.baseCommission.toFixed(2)}`);
    console.log(`  Volume Bonus: $${largeTransaction.volumeBonus.toFixed(2)}`);
    console.log(`  Total Commission: $${largeTransaction.totalCommission.toFixed(2)}`);

    // Get commission history for all affiliates
    console.log('\n📋 Commission History Summary:');
    for (const affiliate of affiliates) {
      const history = await affiliateSystem.getCommissionHistory(affiliate.id, {
        limit: 5
      });
      
      console.log(`\n${affiliate.name} (${history.total} total commissions):`);
      history.history.slice(0, 3).forEach(commission => {
        console.log(`  ${commission.timestamp.toISOString().split('T')[0]}: $${commission.amount} → $${commission.totalCommission.toFixed(2)}`);
      });
    }

    // Demonstrate tier structure management
    console.log('\n🏆 Tier Structure Management:');
    const tierStructure = affiliateSystem.commissionEngine.getTierStructure();
    console.log('Current tier structure:');
    tierStructure.forEach(tier => {
      console.log(`  Level ${tier.level}: ${tier.name} (${tier.rate}%)`);
    });

    // Update tier structure
    const newTiers = [
      { level: 1, rate: 12, name: 'Bronze Plus' },
      { level: 2, rate: 18, name: 'Silver Plus' },
      { level: 3, rate: 25, name: 'Gold Plus' },
      { level: 4, rate: 30, name: 'Platinum' }
    ];

    await affiliateSystem.commissionEngine.updateTierStructure(newTiers);
    console.log('\n✅ Updated tier structure:');
    newTiers.forEach(tier => {
      console.log(`  Level ${tier.level}: ${tier.name} (${tier.rate}%)`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    // Shutdown the system
    await affiliateSystem.shutdown();
    console.log('\n✅ Commission tracking system shutdown');
  }
}

// Run the example
if (require.main === module) {
  commissionTrackingExample().catch(console.error);
}

module.exports = commissionTrackingExample;
