const EventEmitter = require("events");
const _ = require("lodash");
const Joi = require("joi");
const winston = require("winston");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");

class ReferralEngine extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = this._mergeConfig(config);
    this.logger = this._setupLogger();
    this.referralLinks = new Map();
    this.referralTracking = new Map();
    this.attributionData = new Map();

    this.isInitialized = false;
  }

  _mergeConfig(userConfig) {
    const defaultConfig = {
      tracking: true,
      attribution: "last-click",
      validation: true,
      analytics: true,
      linkExpiry: 365, // days
      maxClicks: 10000,
      attributionWindow: 30, // days
      cookieExpiry: 30, // days
      allowedDomains: [],
      blockedDomains: [],
      customParameters: [],
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
      defaultMeta: { service: "referral-engine" },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
      ],
    });
  }

  async initialize() {
    try {
      this.logger.info("Initializing Referral Engine");

      // Setup attribution models
      this._setupAttributionModels();

      this.isInitialized = true;
      this.emit("initialized", { timestamp: new Date() });
    } catch (error) {
      this.logger.error("Referral Engine initialization error:", error);
      throw error;
    }
  }

  _setupAttributionModels() {
    this.attributionModels = {
      "first-click": this._firstClickAttribution.bind(this),
      "last-click": this._lastClickAttribution.bind(this),
      "multi-touch": this._multiTouchAttribution.bind(this),
      "time-decay": this._timeDecayAttribution.bind(this),
      "position-based": this._positionBasedAttribution.bind(this),
    };
  }

  async createReferralLink(affiliateId, options = {}) {
    try {
      const validation = this._validateReferralLinkInput(affiliateId, options);
      if (validation.error) {
        throw new Error(
          `Invalid input: ${validation.error.details[0].message}`,
        );
      }

      const linkData = {
        id: uuidv4(),
        affiliateId,
        code: this._generateReferralCode(),
        url: this._generateReferralUrl(affiliateId, options),
        createdAt: new Date(),
        expiresAt: this._calculateExpiryDate(options.expiryDays),
        maxClicks: options.maxClicks || this.config.maxClicks,
        currentClicks: 0,
        isActive: true,
        customParameters: options.customParameters || {},
        metadata: options.metadata || {},
      };

      this.referralLinks.set(linkData.id, linkData);

      this.emit("referralLinkCreated", linkData);

      return linkData;
    } catch (error) {
      this.logger.error("Create referral link error:", error);
      throw error;
    }
  }

  _validateReferralLinkInput(affiliateId, options) {
    const schema = Joi.object({
      affiliateId: Joi.string().required(),
      options: Joi.object({
        baseUrl: Joi.string().uri().optional(),
        expiryDays: Joi.number().integer().min(1).max(365).optional(),
        maxClicks: Joi.number().integer().min(1).optional(),
        customParameters: Joi.object().optional(),
        metadata: Joi.object().optional(),
      }).optional(),
    });

    return schema.validate({ affiliateId, options });
  }

  _generateReferralCode() {
    return crypto.randomBytes(8).toString("hex").toUpperCase();
  }

  _generateReferralUrl(affiliateId, options) {
    const baseUrl = options.baseUrl || "https://example.com";
    const code = this._generateReferralCode();
    const params = new URLSearchParams({
      ref: code,
      affiliate: affiliateId,
    });

    // Add custom parameters
    if (options.customParameters) {
      Object.entries(options.customParameters).forEach(([key, value]) => {
        params.append(key, value);
      });
    }

    return `${baseUrl}?${params.toString()}`;
  }

  _calculateExpiryDate(expiryDays) {
    const days = expiryDays || this.config.linkExpiry;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);
    return expiryDate;
  }

  async trackReferral(referralData) {
    try {
      const validation = this._validateReferralTrackingInput(referralData);
      if (validation.error) {
        throw new Error(
          `Invalid input: ${validation.error.details[0].message}`,
        );
      }

      const trackingData = {
        id: uuidv4(),
        affiliateId: referralData.affiliateId,
        referralCode: referralData.referralCode,
        customerId: referralData.customerId,
        sessionId: referralData.sessionId,
        ipAddress: referralData.ipAddress,
        userAgent: referralData.userAgent,
        referrer: referralData.referrer,
        timestamp: new Date(),
        conversionData: referralData.conversionData || {},
        attributionData: this._calculateAttribution(referralData),
      };

      // Validate referral
      if (this.config.validation) {
        const isValid = await this._validateReferral(trackingData);
        if (!isValid) {
          throw new Error("Invalid referral detected");
        }
      }

      this.referralTracking.set(trackingData.id, trackingData);

      // Update link click count
      await this._updateLinkClicks(referralData.referralCode);

      this.emit("referralTracked", trackingData);

      return trackingData;
    } catch (error) {
      this.logger.error("Track referral error:", error);
      throw error;
    }
  }

  _validateReferralTrackingInput(referralData) {
    const schema = Joi.object({
      affiliateId: Joi.string().required(),
      referralCode: Joi.string().required(),
      customerId: Joi.string().optional(),
      sessionId: Joi.string().optional(),
      ipAddress: Joi.string().ip().optional(),
      userAgent: Joi.string().optional(),
      referrer: Joi.string().uri().optional(),
      conversionData: Joi.object().optional(),
    });

    return schema.validate(referralData);
  }

  _calculateAttribution(referralData) {
    const attributionModel = this.attributionModels[this.config.attribution];
    if (!attributionModel) {
      throw new Error(`Unknown attribution model: ${this.config.attribution}`);
    }

    return attributionModel(referralData);
  }

  _firstClickAttribution(referralData) {
    return {
      model: "first-click",
      weight: 1.0,
      timestamp: new Date(),
      touchpoint: "first",
    };
  }

  _lastClickAttribution(referralData) {
    return {
      model: "last-click",
      weight: 1.0,
      timestamp: new Date(),
      touchpoint: "last",
    };
  }

  _multiTouchAttribution(referralData) {
    // Simplified multi-touch attribution
    return {
      model: "multi-touch",
      weight: 0.5,
      timestamp: new Date(),
      touchpoint: "multi",
    };
  }

  _timeDecayAttribution(referralData) {
    const now = new Date();
    const timeDiff = now - new Date(referralData.timestamp || now);
    const decayFactor = Math.exp(
      -timeDiff / (this.config.attributionWindow * 24 * 60 * 60 * 1000),
    );

    return {
      model: "time-decay",
      weight: decayFactor,
      timestamp: new Date(),
      touchpoint: "time-decay",
    };
  }

  _positionBasedAttribution(referralData) {
    return {
      model: "position-based",
      weight: 0.4, // 40% for first, 40% for last, 20% for middle
      timestamp: new Date(),
      touchpoint: "position",
    };
  }

  async _validateReferral(trackingData) {
    // Check if referral code exists and is active
    const referralLink = this._findReferralLinkByCode(
      trackingData.referralCode,
    );
    if (!referralLink || !referralLink.isActive) {
      return false;
    }

    // Check expiry
    if (new Date() > referralLink.expiresAt) {
      return false;
    }

    // Check click limit
    if (referralLink.currentClicks >= referralLink.maxClicks) {
      return false;
    }

    // Check domain restrictions
    if (this.config.allowedDomains.length > 0) {
      const referrerDomain = this._extractDomain(trackingData.referrer);
      if (!this.config.allowedDomains.includes(referrerDomain)) {
        return false;
      }
    }

    // Check blocked domains
    if (this.config.blockedDomains.length > 0) {
      const referrerDomain = this._extractDomain(trackingData.referrer);
      if (this.config.blockedDomains.includes(referrerDomain)) {
        return false;
      }
    }

    return true;
  }

  _findReferralLinkByCode(code) {
    for (const link of this.referralLinks.values()) {
      if (link.code === code) {
        return link;
      }
    }
    return null;
  }

  _extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch (error) {
      return null;
    }
  }

  async _updateLinkClicks(referralCode) {
    const link = this._findReferralLinkByCode(referralCode);
    if (link) {
      link.currentClicks += 1;
      this.referralLinks.set(link.id, link);
    }
  }

  async getReferralStats(affiliateId, options = {}) {
    try {
      const validation = this._validateStatsInput(affiliateId, options);
      if (validation.error) {
        throw new Error(
          `Invalid input: ${validation.error.details[0].message}`,
        );
      }

      const { startDate, endDate, groupBy = "day" } = options;

      // Get all referrals for the affiliate
      const referrals = Array.from(this.referralTracking.values()).filter(
        (ref) => ref.affiliateId === affiliateId,
      );

      // Filter by date range
      let filteredReferrals = referrals;
      if (startDate || endDate) {
        filteredReferrals = referrals.filter((ref) => {
          const refDate = new Date(ref.timestamp);
          if (startDate && refDate < new Date(startDate)) return false;
          if (endDate && refDate > new Date(endDate)) return false;
          return true;
        });
      }

      // Calculate stats
      const stats = {
        totalReferrals: filteredReferrals.length,
        uniqueCustomers: new Set(filteredReferrals.map((ref) => ref.customerId))
          .size,
        conversionRate: 0,
        topReferrers: this._getTopReferrers(filteredReferrals),
        attributionBreakdown: this._getAttributionBreakdown(filteredReferrals),
        timeSeries: this._getTimeSeries(filteredReferrals, groupBy),
        linkPerformance: this._getLinkPerformance(affiliateId),
      };

      // Calculate conversion rate (simplified)
      const conversions = filteredReferrals.filter(
        (ref) => ref.conversionData && ref.conversionData.converted,
      );
      stats.conversionRate =
        filteredReferrals.length > 0
          ? (conversions.length / filteredReferrals.length) * 100
          : 0;

      return stats;
    } catch (error) {
      this.logger.error("Get referral stats error:", error);
      throw error;
    }
  }

  _validateStatsInput(affiliateId, options) {
    const schema = Joi.object({
      affiliateId: Joi.string().required(),
      options: Joi.object({
        startDate: Joi.date().optional(),
        endDate: Joi.date().optional(),
        groupBy: Joi.string().valid("day", "week", "month").optional(),
      }).optional(),
    });

    return schema.validate({ affiliateId, options });
  }

  _getTopReferrers(referrals) {
    const referrerCounts = {};
    referrals.forEach((ref) => {
      const domain = this._extractDomain(ref.referrer) || "direct";
      referrerCounts[domain] = (referrerCounts[domain] || 0) + 1;
    });

    return Object.entries(referrerCounts)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  _getAttributionBreakdown(referrals) {
    const attributionCounts = {};
    referrals.forEach((ref) => {
      const model = ref.attributionData.model;
      attributionCounts[model] = (attributionCounts[model] || 0) + 1;
    });

    return Object.entries(attributionCounts)
      .map(([model, count]) => ({ model, count }))
      .sort((a, b) => b.count - a.count);
  }

  _getTimeSeries(referrals, groupBy) {
    const timeSeries = {};

    referrals.forEach((ref) => {
      const date = new Date(ref.timestamp);
      let key;

      switch (groupBy) {
        case "day":
          key = date.toISOString().split("T")[0];
          break;
        case "week":
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split("T")[0];
          break;
        case "month":
          key = date.toISOString().substring(0, 7);
          break;
        default:
          key = date.toISOString().split("T")[0];
      }

      if (!timeSeries[key]) {
        timeSeries[key] = { referrals: 0, conversions: 0 };
      }

      timeSeries[key].referrals += 1;
      if (ref.conversionData && ref.conversionData.converted) {
        timeSeries[key].conversions += 1;
      }
    });

    return Object.entries(timeSeries)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  _getLinkPerformance(affiliateId) {
    const affiliateLinks = Array.from(this.referralLinks.values()).filter(
      (link) => link.affiliateId === affiliateId,
    );

    return affiliateLinks.map((link) => ({
      id: link.id,
      code: link.code,
      url: link.url,
      clicks: link.currentClicks,
      maxClicks: link.maxClicks,
      isActive: link.isActive,
      createdAt: link.createdAt,
      expiresAt: link.expiresAt,
    }));
  }

  async getReferralLinks(affiliateId, options = {}) {
    try {
      const validation = this._validateGetLinksInput(affiliateId, options);
      if (validation.error) {
        throw new Error(
          `Invalid input: ${validation.error.details[0].message}`,
        );
      }

      const { activeOnly = false, limit = 100, offset = 0 } = options;

      let links = Array.from(this.referralLinks.values()).filter(
        (link) => link.affiliateId === affiliateId,
      );

      if (activeOnly) {
        links = links.filter(
          (link) => link.isActive && new Date() < link.expiresAt,
        );
      }

      // Sort by creation date (newest first)
      links.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Apply pagination
      const paginatedLinks = links.slice(offset, offset + limit);

      return {
        affiliateId,
        links: paginatedLinks,
        total: links.length,
        pagination: {
          limit,
          offset,
          hasMore: offset + limit < links.length,
        },
      };
    } catch (error) {
      this.logger.error("Get referral links error:", error);
      throw error;
    }
  }

  _validateGetLinksInput(affiliateId, options) {
    const schema = Joi.object({
      affiliateId: Joi.string().required(),
      options: Joi.object({
        activeOnly: Joi.boolean().optional(),
        limit: Joi.number().integer().min(1).max(1000).optional(),
        offset: Joi.number().integer().min(0).optional(),
      }).optional(),
    });

    return schema.validate({ affiliateId, options });
  }

  async updateAttributionModel(model) {
    try {
      if (!this.attributionModels[model]) {
        throw new Error(`Unknown attribution model: ${model}`);
      }

      this.config.attribution = model;

      this.emit("attributionModelUpdated", { model, timestamp: new Date() });

      return { success: true, model };
    } catch (error) {
      this.logger.error("Update attribution model error:", error);
      throw error;
    }
  }

  getAttributionModels() {
    return Object.keys(this.attributionModels);
  }

  async shutdown() {
    this.logger.info("Shutting down Referral Engine");
    this.referralLinks.clear();
    this.referralTracking.clear();
    this.attributionData.clear();
    this.emit("shutdown", { timestamp: new Date() });
  }
}

module.exports = ReferralEngine;
