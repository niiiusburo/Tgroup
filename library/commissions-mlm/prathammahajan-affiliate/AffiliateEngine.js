const EventEmitter = require("events");
const _ = require("lodash");
const Joi = require("joi");
const winston = require("winston");

// Import managers and services
const CommissionEngine = require("./CommissionEngine");
const ReferralEngine = require("./ReferralEngine");
const PaymentEngine = require("./PaymentEngine");
const AffiliateManager = require("../affiliate/AffiliateManager");
const AnalyticsManager = require("../analytics/AffiliateAnalytics");
const FraudDetector = require("../fraud/FraudDetector");
const CampaignManager = require("../campaign/CampaignManager");
const RewardSystem = require("../rewards/RewardSystem");
const ComplianceChecker = require("../compliance/ComplianceChecker");

class AffiliateEngine extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = this._mergeConfig(config);
    this.isInitialized = false;
    this.logger = this._setupLogger();

    // Initialize managers
    this.commissionEngine = null;
    this.referralEngine = null;
    this.paymentEngine = null;
    this.affiliateManager = null;
    this.analyticsManager = null;
    this.fraudDetector = null;
    this.campaignManager = null;
    this.rewardSystem = null;
    this.complianceChecker = null;

    // Initialize services
    this._initializeServices();
  }

  _mergeConfig(userConfig) {
    const defaultConfig = {
      commission: {
        enabled: true,
        multiTier: false,
        calculation: "percentage",
        rate: 10,
        minimum: 0,
        maximum: 100,
      },
      referral: {
        enabled: true,
        tracking: true,
        attribution: "last-click",
        validation: true,
        analytics: true,
      },
      payment: {
        enabled: true,
        processor: "razorpay",
        schedule: "monthly",
        minimum: 50,
        currency: "INR",
      },
      fraud: {
        enabled: true,
        detection: true,
        prevention: true,
        monitoring: true,
        alerts: true,
      },
      analytics: {
        enabled: true,
        reporting: true,
        dashboard: true,
        realTime: true,
        export: true,
      },
      campaigns: {
        enabled: false,
        tracking: true,
        optimization: true,
        analytics: true,
      },
      rewards: {
        enabled: false,
        bonuses: true,
        incentives: true,
        tracking: true,
      },
      compliance: {
        enabled: false,
        monitoring: true,
        reporting: true,
        audit: true,
      },
    };

    return _.merge(defaultConfig, userConfig);
  }

  _setupLogger() {
    return winston.createLogger({
      level: "info",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      defaultMeta: { service: "affiliate-engine" },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
      ],
    });
  }

  async _initializeServices() {
    try {
      // Initialize commission engine
      if (this.config.commission.enabled) {
        this.commissionEngine = new CommissionEngine(this.config.commission);
        await this.commissionEngine.initialize();
      }

      // Initialize referral engine
      if (this.config.referral.enabled) {
        this.referralEngine = new ReferralEngine(this.config.referral);
        await this.referralEngine.initialize();
      }

      // Initialize payment engine
      if (this.config.payment.enabled) {
        this.paymentEngine = new PaymentEngine(this.config.payment);
        await this.paymentEngine.initialize();
      }

      // Initialize affiliate manager
      this.affiliateManager = new AffiliateManager(this.config);
      await this.affiliateManager.initialize();

      // Initialize analytics manager
      if (this.config.analytics.enabled) {
        this.analyticsManager = new AnalyticsManager(this.config.analytics);
        await this.analyticsManager.initialize();
      }

      // Initialize fraud detector
      if (this.config.fraud.enabled) {
        this.fraudDetector = new FraudDetector(this.config.fraud);
        await this.fraudDetector.initialize();
      }

      // Initialize campaign manager
      if (this.config.campaigns.enabled) {
        this.campaignManager = new CampaignManager(this.config.campaigns);
        await this.campaignManager.initialize();
      }

      // Initialize reward system
      if (this.config.rewards.enabled) {
        this.rewardSystem = new RewardSystem(this.config.rewards);
        await this.rewardSystem.initialize();
      }

      // Initialize compliance checker
      if (this.config.compliance.enabled) {
        this.complianceChecker = new ComplianceChecker(this.config.compliance);
        await this.complianceChecker.initialize();
      }

      this.isInitialized = true;
      this.emit("initialized", { timestamp: new Date() });
    } catch (error) {
      this.logger.error("Service initialization error:", error);
      console.warn("Service initialization warning:", error.message);
      // Don't throw error, just log it and continue
      this.isInitialized = true;
      this.emit("initialized", {
        timestamp: new Date(),
        warning: error.message,
      });
    }
  }

  // Affiliate Management Methods
  async createAffiliate(affiliateData) {
    if (!this.affiliateManager) {
      throw new Error("Affiliate management not enabled");
    }
    return await this.affiliateManager.createAffiliate(affiliateData);
  }

  async getAffiliate(affiliateId) {
    if (!this.affiliateManager) {
      throw new Error("Affiliate management not enabled");
    }
    return await this.affiliateManager.getAffiliate(affiliateId);
  }

  async updateAffiliate(affiliateId, updateData) {
    if (!this.affiliateManager) {
      throw new Error("Affiliate management not enabled");
    }
    return await this.affiliateManager.updateAffiliate(affiliateId, updateData);
  }

  async deleteAffiliate(affiliateId) {
    if (!this.affiliateManager) {
      throw new Error("Affiliate management not enabled");
    }
    return await this.affiliateManager.deleteAffiliate(affiliateId);
  }

  async listAffiliates(options = {}) {
    if (!this.affiliateManager) {
      throw new Error("Affiliate management not enabled");
    }
    return await this.affiliateManager.listAffiliates(options);
  }

  // Commission Management Methods
  async calculateCommission(affiliateId, amount, options = {}) {
    if (!this.commissionEngine) {
      throw new Error("Commission engine not enabled");
    }
    return await this.commissionEngine.calculateCommission(
      affiliateId,
      amount,
      options,
    );
  }

  async trackCommission(affiliateId, transactionData) {
    if (!this.commissionEngine) {
      throw new Error("Commission engine not enabled");
    }
    return await this.commissionEngine.trackCommission(
      affiliateId,
      transactionData,
    );
  }

  async getCommissionHistory(affiliateId, options = {}) {
    if (!this.commissionEngine) {
      throw new Error("Commission engine not enabled");
    }
    return await this.commissionEngine.getCommissionHistory(
      affiliateId,
      options,
    );
  }

  async getCommissionStats(affiliateId, options = {}) {
    if (!this.commissionEngine) {
      throw new Error("Commission engine not enabled");
    }
    return await this.commissionEngine.getCommissionStats(affiliateId, options);
  }

  // Referral Management Methods
  async createReferralLink(affiliateId, options = {}) {
    if (!this.referralEngine) {
      throw new Error("Referral engine not enabled");
    }
    return await this.referralEngine.createReferralLink(affiliateId, options);
  }

  async trackReferral(referralData) {
    if (!this.referralEngine) {
      throw new Error("Referral engine not enabled");
    }
    return await this.referralEngine.trackReferral(referralData);
  }

  async getReferralStats(affiliateId, options = {}) {
    if (!this.referralEngine) {
      throw new Error("Referral engine not enabled");
    }
    return await this.referralEngine.getReferralStats(affiliateId, options);
  }

  // Payment Management Methods
  async processPayment(affiliateId, amount, options = {}) {
    if (!this.paymentEngine) {
      throw new Error("Payment engine not enabled");
    }
    return await this.paymentEngine.processPayment(
      affiliateId,
      amount,
      options,
    );
  }

  async schedulePayment(affiliateId, amount, scheduleDate) {
    if (!this.paymentEngine) {
      throw new Error("Payment engine not enabled");
    }
    return await this.paymentEngine.schedulePayment(
      affiliateId,
      amount,
      scheduleDate,
    );
  }

  async getPaymentHistory(affiliateId, options = {}) {
    if (!this.paymentEngine) {
      throw new Error("Payment engine not enabled");
    }
    return await this.paymentEngine.getPaymentHistory(affiliateId, options);
  }

  // Analytics Methods
  async getAnalytics(affiliateId, options = {}) {
    if (!this.analyticsManager) {
      throw new Error("Analytics not enabled");
    }
    return await this.analyticsManager.getAnalytics(affiliateId, options);
  }

  async generateReport(reportType, options = {}) {
    if (!this.analyticsManager) {
      throw new Error("Analytics not enabled");
    }
    return await this.analyticsManager.generateReport(reportType, options);
  }

  // Fraud Detection Methods
  async detectFraud(transactionData) {
    if (!this.fraudDetector) {
      throw new Error("Fraud detection not enabled");
    }
    return await this.fraudDetector.detectFraud(transactionData);
  }

  async getFraudAlerts(options = {}) {
    if (!this.fraudDetector) {
      throw new Error("Fraud detection not enabled");
    }
    return await this.fraudDetector.getFraudAlerts(options);
  }

  // Campaign Management Methods
  async createCampaign(campaignData) {
    if (!this.campaignManager) {
      throw new Error("Campaign management not enabled");
    }
    return await this.campaignManager.createCampaign(campaignData);
  }

  async getCampaignPerformance(campaignId, options = {}) {
    if (!this.campaignManager) {
      throw new Error("Campaign management not enabled");
    }
    return await this.campaignManager.getCampaignPerformance(
      campaignId,
      options,
    );
  }

  // Reward System Methods
  async calculateRewards(affiliateId, performanceData) {
    if (!this.rewardSystem) {
      throw new Error("Reward system not enabled");
    }
    return await this.rewardSystem.calculateRewards(
      affiliateId,
      performanceData,
    );
  }

  async distributeRewards(affiliateId, rewardData) {
    if (!this.rewardSystem) {
      throw new Error("Reward system not enabled");
    }
    return await this.rewardSystem.distributeRewards(affiliateId, rewardData);
  }

  // Compliance Methods
  async checkCompliance(affiliateId, complianceType) {
    if (!this.complianceChecker) {
      throw new Error("Compliance checking not enabled");
    }
    return await this.complianceChecker.checkCompliance(
      affiliateId,
      complianceType,
    );
  }

  async generateComplianceReport(options = {}) {
    if (!this.complianceChecker) {
      throw new Error("Compliance checking not enabled");
    }
    return await this.complianceChecker.generateComplianceReport(options);
  }

  // System Status Methods
  getSystemStatus() {
    return {
      initialized: this.isInitialized,
      services: {
        commission: !!this.commissionEngine,
        referral: !!this.referralEngine,
        payment: !!this.paymentEngine,
        affiliate: !!this.affiliateManager,
        analytics: !!this.analyticsManager,
        fraud: !!this.fraudDetector,
        campaigns: !!this.campaignManager,
        rewards: !!this.rewardSystem,
        compliance: !!this.complianceChecker,
      },
      timestamp: new Date(),
    };
  }

  getSupportedFeatures() {
    return {
      commission: this.config.commission.enabled,
      referral: this.config.referral.enabled,
      payment: this.config.payment.enabled,
      analytics: this.config.analytics.enabled,
      fraud: this.config.fraud.enabled,
      campaigns: this.config.campaigns.enabled,
      rewards: this.config.rewards.enabled,
      compliance: this.config.compliance.enabled,
    };
  }

  async shutdown() {
    this.logger.info("Shutting down Affiliate Engine");

    // Shutdown all services
    if (this.commissionEngine) await this.commissionEngine.shutdown();
    if (this.referralEngine) await this.referralEngine.shutdown();
    if (this.paymentEngine) await this.paymentEngine.shutdown();
    if (this.affiliateManager) await this.affiliateManager.shutdown();
    if (this.analyticsManager) await this.analyticsManager.shutdown();
    if (this.fraudDetector) await this.fraudDetector.shutdown();
    if (this.campaignManager) await this.campaignManager.shutdown();
    if (this.rewardSystem) await this.rewardSystem.shutdown();
    if (this.complianceChecker) await this.complianceChecker.shutdown();

    this.emit("shutdown", { timestamp: new Date() });
  }
}

module.exports = AffiliateEngine;
