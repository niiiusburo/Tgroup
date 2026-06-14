const EventEmitter = require("events");
const _ = require("lodash");
const Joi = require("joi");
const winston = require("winston");
const { v4: uuidv4 } = require("uuid");

class CommissionEngine extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = this._mergeConfig(config);
    this.logger = this._setupLogger();
    this.commissions = new Map();
    this.commissionHistory = new Map();
    this.tierStructure = new Map();

    this.isInitialized = false;
  }

  _mergeConfig(userConfig) {
    const defaultConfig = {
      multiTier: false,
      calculation: "percentage",
      rate: 10,
      minimum: 0,
      maximum: 100,
      tiers: [
        { level: 1, rate: 10, name: "Bronze" },
        { level: 2, rate: 15, name: "Silver" },
        { level: 3, rate: 20, name: "Gold" },
      ],
      volumeBonuses: [
        { threshold: 1000, bonus: 2 },
        { threshold: 5000, bonus: 5 },
        { threshold: 10000, bonus: 10 },
      ],
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
      defaultMeta: { service: "commission-engine" },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
      ],
    });
  }

  async initialize() {
    try {
      this.logger.info("Initializing Commission Engine");

      // Setup tier structure
      if (this.config.multiTier) {
        this._setupTierStructure();
      }

      this.isInitialized = true;
      this.emit("initialized", { timestamp: new Date() });
    } catch (error) {
      this.logger.error("Commission Engine initialization error:", error);
      throw error;
    }
  }

  _setupTierStructure() {
    this.config.tiers.forEach((tier) => {
      this.tierStructure.set(tier.level, tier);
    });
  }

  async calculateCommission(affiliateId, amount, options = {}) {
    try {
      const validation = this._validateCommissionInput(
        affiliateId,
        amount,
        options,
      );
      if (validation.error) {
        throw new Error(
          `Invalid input: ${validation.error.details[0].message}`,
        );
      }

      const affiliate = await this._getAffiliateData(affiliateId);
      const commissionRate = this._getCommissionRate(affiliate, amount);
      const baseCommission = this._calculateBaseCommission(
        amount,
        commissionRate,
      );
      const volumeBonus = this._calculateVolumeBonus(affiliate, amount);
      const tierBonus = this._calculateTierBonus(affiliate);

      const totalCommission = baseCommission + volumeBonus + tierBonus;
      const finalCommission = this._applyLimits(totalCommission);

      const commissionData = {
        id: uuidv4(),
        affiliateId,
        amount,
        commissionRate,
        baseCommission,
        volumeBonus,
        tierBonus,
        totalCommission: finalCommission,
        timestamp: new Date(),
        options,
      };

      // Store commission
      this.commissions.set(commissionData.id, commissionData);

      // Add to history
      this._addToHistory(commissionData);

      this.emit("commissionCalculated", commissionData);

      return commissionData;
    } catch (error) {
      this.logger.error("Commission calculation error:", error);
      throw error;
    }
  }

  _validateCommissionInput(affiliateId, amount, options) {
    const schema = Joi.object({
      affiliateId: Joi.string().required(),
      amount: Joi.number().positive().required(),
      options: Joi.object().optional(),
    });

    return schema.validate({ affiliateId, amount, options });
  }

  async _getAffiliateData(affiliateId) {
    // In a real implementation, this would fetch from database
    // For now, return mock data with tier 2 for testing
    return {
      id: affiliateId,
      tier: 2, // Default to tier 2 for testing
      totalSales: 0,
      totalCommissions: 0,
      joinDate: new Date(),
      status: "active",
    };
  }

  _getCommissionRate(affiliate, amount) {
    if (this.config.multiTier) {
      const tier = this.tierStructure.get(affiliate.tier);
      return tier ? tier.rate : this.config.rate;
    }
    return this.config.rate;
  }

  _calculateBaseCommission(amount, rate) {
    return (amount * rate) / 100;
  }

  _calculateVolumeBonus(affiliate, amount) {
    if (!this.config.volumeBonuses || this.config.volumeBonuses.length === 0) {
      return 0;
    }

    const totalSales = affiliate.totalSales + amount;
    let bonus = 0;

    for (const volumeBonus of this.config.volumeBonuses) {
      if (totalSales >= volumeBonus.threshold) {
        bonus = Math.max(bonus, volumeBonus.bonus);
      }
    }

    return (amount * bonus) / 100;
  }

  _calculateTierBonus(affiliate) {
    if (!this.config.multiTier) {
      return 0;
    }

    const tier = this.tierStructure.get(affiliate.tier);
    if (!tier || !tier.bonus) {
      return 0;
    }

    return tier.bonus;
  }

  _applyLimits(commission) {
    let finalCommission = commission;

    if (this.config.minimum > 0) {
      finalCommission = Math.max(finalCommission, this.config.minimum);
    }

    if (this.config.maximum > 0) {
      finalCommission = Math.min(finalCommission, this.config.maximum);
    }

    return finalCommission;
  }

  _addToHistory(commissionData) {
    const historyKey = `${commissionData.affiliateId}_${new Date().toISOString().split("T")[0]}`;

    if (!this.commissionHistory.has(historyKey)) {
      this.commissionHistory.set(historyKey, []);
    }

    this.commissionHistory.get(historyKey).push(commissionData);
  }

  async trackCommission(affiliateId, transactionData) {
    try {
      const validation = this._validateTransactionInput(
        affiliateId,
        transactionData,
      );
      if (validation.error) {
        throw new Error(
          `Invalid input: ${validation.error.details[0].message}`,
        );
      }

      const commission = await this.calculateCommission(
        affiliateId,
        transactionData.amount,
        transactionData.options,
      );

      // Update affiliate data
      await this._updateAffiliateStats(
        affiliateId,
        transactionData.amount,
        commission.totalCommission,
      );

      this.emit("commissionTracked", {
        affiliateId,
        transactionData,
        commission,
        timestamp: new Date(),
      });

      return commission;
    } catch (error) {
      this.logger.error("Commission tracking error:", error);
      throw error;
    }
  }

  _validateTransactionInput(affiliateId, transactionData) {
    const schema = Joi.object({
      affiliateId: Joi.string().required(),
      transactionData: Joi.object({
        amount: Joi.number().positive().required(),
        transactionId: Joi.string().required(),
        customerId: Joi.string().optional(),
        productId: Joi.string().optional(),
        options: Joi.object().optional(),
      }).required(),
    });

    return schema.validate({ affiliateId, transactionData });
  }

  async _updateAffiliateStats(affiliateId, amount, commission) {
    // In a real implementation, this would update the database
    this.logger.info(
      `Updated stats for affiliate ${affiliateId}: +${amount} sales, +${commission} commission`,
    );
  }

  async getCommissionHistory(affiliateId, options = {}) {
    try {
      const validation = this._validateHistoryInput(affiliateId, options);
      if (validation.error) {
        throw new Error(
          `Invalid input: ${validation.error.details[0].message}`,
        );
      }

      const { startDate, endDate, limit = 100, offset = 0 } = options;

      let history = [];

      // Get all history entries for the affiliate
      for (const [key, entries] of this.commissionHistory) {
        if (key.startsWith(affiliateId)) {
          history = history.concat(entries);
        }
      }

      // Filter by date range if provided
      if (startDate || endDate) {
        history = history.filter((entry) => {
          const entryDate = new Date(entry.timestamp);
          if (startDate && entryDate < new Date(startDate)) return false;
          if (endDate && entryDate > new Date(endDate)) return false;
          return true;
        });
      }

      // Sort by timestamp (newest first)
      history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Apply pagination
      const paginatedHistory = history.slice(offset, offset + limit);

      return {
        affiliateId,
        history: paginatedHistory,
        total: history.length,
        pagination: {
          limit,
          offset,
          hasMore: offset + limit < history.length,
        },
      };
    } catch (error) {
      this.logger.error("Get commission history error:", error);
      throw error;
    }
  }

  _validateHistoryInput(affiliateId, options) {
    const schema = Joi.object({
      affiliateId: Joi.string().required(),
      options: Joi.object({
        startDate: Joi.date().optional(),
        endDate: Joi.date().optional(),
        limit: Joi.number().integer().min(1).max(1000).optional(),
        offset: Joi.number().integer().min(0).optional(),
      }).optional(),
    });

    return schema.validate({ affiliateId, options });
  }

  async getCommissionStats(affiliateId, options = {}) {
    try {
      const history = await this.getCommissionHistory(affiliateId, {
        ...options,
        limit: 1000,
      });

      const stats = {
        totalCommissions: 0,
        totalAmount: 0,
        averageCommission: 0,
        commissionCount: history.history.length,
        monthlyBreakdown: {},
        tierInfo: null,
      };

      // Calculate totals
      history.history.forEach((entry) => {
        stats.totalCommissions += entry.totalCommission;
        stats.totalAmount += entry.amount;

        // Monthly breakdown
        const month = new Date(entry.timestamp).toISOString().substring(0, 7);
        if (!stats.monthlyBreakdown[month]) {
          stats.monthlyBreakdown[month] = {
            commissions: 0,
            amount: 0,
            count: 0,
          };
        }
        stats.monthlyBreakdown[month].commissions += entry.totalCommission;
        stats.monthlyBreakdown[month].amount += entry.amount;
        stats.monthlyBreakdown[month].count += 1;
      });

      // Calculate average
      if (stats.commissionCount > 0) {
        stats.averageCommission =
          stats.totalCommissions / stats.commissionCount;
      }

      // Get tier info if multi-tier is enabled
      if (this.config.multiTier) {
        const affiliate = await this._getAffiliateData(affiliateId);
        stats.tierInfo = this.tierStructure.get(affiliate.tier);
      }

      return stats;
    } catch (error) {
      this.logger.error("Get commission stats error:", error);
      throw error;
    }
  }

  async updateTierStructure(newTiers) {
    try {
      const validation = this._validateTierStructure(newTiers);
      if (validation.error) {
        throw new Error(
          `Invalid tier structure: ${validation.error.details[0].message}`,
        );
      }

      this.tierStructure.clear();
      newTiers.forEach((tier) => {
        this.tierStructure.set(tier.level, tier);
      });

      this.config.tiers = newTiers;

      this.emit("tierStructureUpdated", {
        tiers: newTiers,
        timestamp: new Date(),
      });

      return { success: true, tiers: newTiers };
    } catch (error) {
      this.logger.error("Update tier structure error:", error);
      throw error;
    }
  }

  _validateTierStructure(tiers) {
    const schema = Joi.array().items(
      Joi.object({
        level: Joi.number().integer().min(1).required(),
        rate: Joi.number().min(0).max(100).required(),
        name: Joi.string().required(),
        bonus: Joi.number().min(0).optional(),
      }),
    );

    return schema.validate(tiers);
  }

  getTierStructure() {
    return Array.from(this.tierStructure.values());
  }

  async shutdown() {
    this.logger.info("Shutting down Commission Engine");
    this.commissions.clear();
    this.commissionHistory.clear();
    this.tierStructure.clear();
    this.emit("shutdown", { timestamp: new Date() });
  }
}

module.exports = CommissionEngine;
