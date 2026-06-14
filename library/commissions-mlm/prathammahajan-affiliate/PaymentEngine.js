const EventEmitter = require("events");
const _ = require("lodash");
const Joi = require("joi");
const winston = require("winston");
const { v4: uuidv4 } = require("uuid");
const cron = require("node-cron");

class PaymentEngine extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = this._mergeConfig(config);
    this.logger = this._setupLogger();
    this.payments = new Map();
    this.paymentHistory = new Map();
    this.scheduledPayments = new Map();
    this.paymentMethods = new Map();

    this.isInitialized = false;
    this.scheduler = null;
  }

  _mergeConfig(userConfig) {
    const defaultConfig = {
      processor: "razorpay",
      schedule: "monthly",
      minimum: 50,
      currency: "INR",
      autoProcess: true,
      retryAttempts: 3,
      retryDelay: 300000, // 5 minutes
      paymentMethods: ["bank_transfer", "paypal", "stripe", "razorpay"],
      supportedCurrencies: ["INR", "USD", "EUR", "GBP"],
      taxRate: 0,
      fees: {
        processing: 0.02, // 2%
        withdrawal: 0.01, // 1%
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
      defaultMeta: { service: "payment-engine" },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
      ],
    });
  }

  async initialize() {
    try {
      this.logger.info("Initializing Payment Engine");

      // Setup payment methods
      this._setupPaymentMethods();

      // Setup scheduler if auto processing is enabled
      if (this.config.autoProcess) {
        this._setupScheduler();
      }

      this.isInitialized = true;
      this.emit("initialized", { timestamp: new Date() });
    } catch (error) {
      this.logger.error("Payment Engine initialization error:", error);
      throw error;
    }
  }

  _setupPaymentMethods() {
    this.config.paymentMethods.forEach((method) => {
      this.paymentMethods.set(method, {
        name: method,
        enabled: true,
        fees: this.config.fees,
        supportedCurrencies: this.config.supportedCurrencies,
      });
    });
  }

  _setupScheduler() {
    let cronExpression;

    switch (this.config.schedule) {
      case "daily":
        cronExpression = "0 0 * * *"; // Every day at midnight
        break;
      case "weekly":
        cronExpression = "0 0 * * 0"; // Every Sunday at midnight
        break;
      case "monthly":
        cronExpression = "0 0 1 * *"; // First day of every month at midnight
        break;
      case "quarterly":
        cronExpression = "0 0 1 */3 *"; // First day of every quarter
        break;
      default:
        cronExpression = "0 0 1 * *"; // Default to monthly
    }

    this.scheduler = cron.schedule(
      cronExpression,
      async () => {
        await this.processScheduledPayments();
      },
      {
        scheduled: false,
      },
    );

    this.scheduler.start();
    this.logger.info(
      `Payment scheduler started with schedule: ${this.config.schedule}`,
    );
  }

  async processPayment(affiliateId, amount, options = {}) {
    try {
      const validation = this._validatePaymentInput(
        affiliateId,
        amount,
        options,
      );
      if (validation.error) {
        throw new Error(
          `Invalid input: ${validation.error.details[0].message}`,
        );
      }

      // Check minimum payment amount
      if (amount < this.config.minimum) {
        throw new Error(
          `Payment amount ${amount} is below minimum ${this.config.minimum}`,
        );
      }

      const paymentData = {
        id: uuidv4(),
        affiliateId,
        amount,
        currency: options.currency || this.config.currency,
        paymentMethod: options.paymentMethod || "bank_transfer",
        status: "pending",
        createdAt: new Date(),
        processedAt: null,
        completedAt: null,
        fees: this._calculateFees(amount, options.paymentMethod),
        netAmount: this._calculateNetAmount(amount, options.paymentMethod),
        metadata: options.metadata || {},
        retryCount: 0,
        errorMessage: null,
      };

      this.payments.set(paymentData.id, paymentData);

      // Process payment based on method
      const result = await this._processPaymentByMethod(paymentData);

      // Update payment status
      paymentData.status = result.success ? "completed" : "failed";
      paymentData.processedAt = new Date();
      paymentData.errorMessage = result.error || null;

      if (result.success) {
        paymentData.completedAt = new Date();
        this._addToHistory(paymentData);
        this.emit("paymentCompleted", paymentData);
      } else {
        this.emit("paymentFailed", paymentData);
      }

      this.payments.set(paymentData.id, paymentData);

      return {
        success: result.success,
        paymentId: paymentData.id,
        amount: paymentData.netAmount,
        status: paymentData.status,
        error: result.error,
      };
    } catch (error) {
      this.logger.error("Process payment error:", error);
      throw error;
    }
  }

  _validatePaymentInput(affiliateId, amount, options) {
    const schema = Joi.object({
      affiliateId: Joi.string().required(),
      amount: Joi.number().positive().required(),
      options: Joi.object({
        currency: Joi.string()
          .valid(...this.config.supportedCurrencies)
          .optional(),
        paymentMethod: Joi.string()
          .valid(...this.config.paymentMethods)
          .optional(),
        metadata: Joi.object().optional(),
      }).optional(),
    });

    return schema.validate({ affiliateId, amount, options });
  }

  _calculateFees(amount, paymentMethod) {
    const method = this.paymentMethods.get(paymentMethod || "bank_transfer");
    if (!method) return 0;

    const processingFee = amount * method.fees.processing;
    const withdrawalFee = amount * method.fees.withdrawal;

    return processingFee + withdrawalFee;
  }

  _calculateNetAmount(amount, paymentMethod) {
    const fees = this._calculateFees(amount, paymentMethod);
    return amount - fees;
  }

  async _processPaymentByMethod(paymentData) {
    try {
      switch (paymentData.paymentMethod) {
        case "bank_transfer":
          return await this._processBankTransfer(paymentData);
        case "paypal":
          return await this._processPayPal(paymentData);
        case "stripe":
          return await this._processStripe(paymentData);
        case "razorpay":
          return await this._processRazorpay(paymentData);
        default:
          throw new Error(
            `Unsupported payment method: ${paymentData.paymentMethod}`,
          );
      }
    } catch (error) {
      this.logger.error(
        `Payment processing error for method ${paymentData.paymentMethod}:`,
        error,
      );
      return { success: false, error: error.message };
    }
  }

  async _processBankTransfer(paymentData) {
    // Simulate bank transfer processing
    this.logger.info(
      `Processing bank transfer for affiliate ${paymentData.affiliateId}: ${paymentData.netAmount} ${paymentData.currency}`,
    );

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Simulate success (in real implementation, this would call bank API)
    return { success: true, transactionId: `BT_${uuidv4()}` };
  }

  async _processPayPal(paymentData) {
    // Simulate PayPal processing
    this.logger.info(
      `Processing PayPal payment for affiliate ${paymentData.affiliateId}: ${paymentData.netAmount} ${paymentData.currency}`,
    );

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Simulate success (in real implementation, this would call PayPal API)
    return { success: true, transactionId: `PP_${uuidv4()}` };
  }

  async _processStripe(paymentData) {
    // Simulate Stripe processing
    this.logger.info(
      `Processing Stripe payment for affiliate ${paymentData.affiliateId}: ${paymentData.netAmount} ${paymentData.currency}`,
    );

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // Simulate success (in real implementation, this would call Stripe API)
    return { success: true, transactionId: `ST_${uuidv4()}` };
  }

  async _processRazorpay(paymentData) {
    // Simulate Razorpay processing
    this.logger.info(
      `Processing Razorpay payment for affiliate ${paymentData.affiliateId}: ${paymentData.netAmount} ${paymentData.currency}`,
    );

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Simulate success (in real implementation, this would call Razorpay API)
    return { success: true, transactionId: `RZ_${uuidv4()}` };
  }

  _addToHistory(paymentData) {
    const historyKey = `${paymentData.affiliateId}_${new Date().toISOString().split("T")[0]}`;

    if (!this.paymentHistory.has(historyKey)) {
      this.paymentHistory.set(historyKey, []);
    }

    this.paymentHistory.get(historyKey).push(paymentData);
  }

  async schedulePayment(affiliateId, amount, scheduleDate, options = {}) {
    try {
      const validation = this._validateScheduleInput(
        affiliateId,
        amount,
        scheduleDate,
        options,
      );
      if (validation.error) {
        throw new Error(
          `Invalid input: ${validation.error.details[0].message}`,
        );
      }

      const scheduledPayment = {
        id: uuidv4(),
        affiliateId,
        amount,
        currency: options.currency || this.config.currency,
        paymentMethod: options.paymentMethod || "bank_transfer",
        scheduleDate: new Date(scheduleDate),
        status: "scheduled",
        createdAt: new Date(),
        options: options.options || {},
        metadata: options.metadata || {},
      };

      this.scheduledPayments.set(scheduledPayment.id, scheduledPayment);

      this.emit("paymentScheduled", scheduledPayment);

      return scheduledPayment;
    } catch (error) {
      this.logger.error("Schedule payment error:", error);
      throw error;
    }
  }

  _validateScheduleInput(affiliateId, amount, scheduleDate, options) {
    const schema = Joi.object({
      affiliateId: Joi.string().required(),
      amount: Joi.number().positive().required(),
      scheduleDate: Joi.date().min("now").required(),
      options: Joi.object({
        currency: Joi.string()
          .valid(...this.config.supportedCurrencies)
          .optional(),
        paymentMethod: Joi.string()
          .valid(...this.config.paymentMethods)
          .optional(),
        options: Joi.object().optional(),
        metadata: Joi.object().optional(),
      }).optional(),
    });

    return schema.validate({ affiliateId, amount, scheduleDate, options });
  }

  async processScheduledPayments() {
    try {
      this.logger.info("Processing scheduled payments");

      const now = new Date();
      const duePayments = Array.from(this.scheduledPayments.values()).filter(
        (payment) =>
          payment.status === "scheduled" &&
          new Date(payment.scheduleDate) <= now,
      );

      const results = [];

      for (const scheduledPayment of duePayments) {
        try {
          const result = await this.processPayment(
            scheduledPayment.affiliateId,
            scheduledPayment.amount,
            {
              currency: scheduledPayment.currency,
              paymentMethod: scheduledPayment.paymentMethod,
              metadata: scheduledPayment.metadata,
            },
          );

          // Update scheduled payment status
          scheduledPayment.status = result.success ? "processed" : "failed";
          scheduledPayment.processedAt = new Date();
          this.scheduledPayments.set(scheduledPayment.id, scheduledPayment);

          results.push({
            scheduledPaymentId: scheduledPayment.id,
            success: result.success,
            paymentId: result.paymentId,
            error: result.error,
          });
        } catch (error) {
          this.logger.error(
            `Error processing scheduled payment ${scheduledPayment.id}:`,
            error,
          );
          results.push({
            scheduledPaymentId: scheduledPayment.id,
            success: false,
            error: error.message,
          });
        }
      }

      this.emit("scheduledPaymentsProcessed", {
        count: duePayments.length,
        results,
      });

      return results;
    } catch (error) {
      this.logger.error("Process scheduled payments error:", error);
      throw error;
    }
  }

  async getPaymentHistory(affiliateId, options = {}) {
    try {
      const validation = this._validateHistoryInput(affiliateId, options);
      if (validation.error) {
        throw new Error(
          `Invalid input: ${validation.error.details[0].message}`,
        );
      }

      const { startDate, endDate, status, limit = 100, offset = 0 } = options;

      let payments = Array.from(this.payments.values()).filter(
        (payment) => payment.affiliateId === affiliateId,
      );

      // Filter by date range
      if (startDate || endDate) {
        payments = payments.filter((payment) => {
          const paymentDate = new Date(payment.createdAt);
          if (startDate && paymentDate < new Date(startDate)) return false;
          if (endDate && paymentDate > new Date(endDate)) return false;
          return true;
        });
      }

      // Filter by status
      if (status) {
        payments = payments.filter((payment) => payment.status === status);
      }

      // Sort by creation date (newest first)
      payments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Apply pagination
      const paginatedPayments = payments.slice(offset, offset + limit);

      return {
        affiliateId,
        payments: paginatedPayments,
        total: payments.length,
        pagination: {
          limit,
          offset,
          hasMore: offset + limit < payments.length,
        },
      };
    } catch (error) {
      this.logger.error("Get payment history error:", error);
      throw error;
    }
  }

  _validateHistoryInput(affiliateId, options) {
    const schema = Joi.object({
      affiliateId: Joi.string().required(),
      options: Joi.object({
        startDate: Joi.date().optional(),
        endDate: Joi.date().optional(),
        status: Joi.string().valid("pending", "completed", "failed").optional(),
        limit: Joi.number().integer().min(1).max(1000).optional(),
        offset: Joi.number().integer().min(0).optional(),
      }).optional(),
    });

    return schema.validate({ affiliateId, options });
  }

  async getPaymentStats(affiliateId, options = {}) {
    try {
      const history = await this.getPaymentHistory(affiliateId, {
        ...options,
        limit: 10000,
      });

      const stats = {
        totalPayments: 0,
        totalAmount: 0,
        totalFees: 0,
        totalNetAmount: 0,
        paymentCount: history.payments.length,
        averagePayment: 0,
        monthlyBreakdown: {},
        statusBreakdown: {},
        methodBreakdown: {},
      };

      // Calculate totals
      history.payments.forEach((payment) => {
        stats.totalPayments += 1;
        stats.totalAmount += payment.amount;
        stats.totalFees += payment.fees;
        stats.totalNetAmount += payment.netAmount;

        // Monthly breakdown
        const month = new Date(payment.createdAt).toISOString().substring(0, 7);
        if (!stats.monthlyBreakdown[month]) {
          stats.monthlyBreakdown[month] = { amount: 0, count: 0, fees: 0 };
        }
        stats.monthlyBreakdown[month].amount += payment.amount;
        stats.monthlyBreakdown[month].count += 1;
        stats.monthlyBreakdown[month].fees += payment.fees;

        // Status breakdown
        stats.statusBreakdown[payment.status] =
          (stats.statusBreakdown[payment.status] || 0) + 1;

        // Method breakdown
        stats.methodBreakdown[payment.paymentMethod] =
          (stats.methodBreakdown[payment.paymentMethod] || 0) + 1;
      });

      // Calculate average
      if (stats.paymentCount > 0) {
        stats.averagePayment = stats.totalAmount / stats.paymentCount;
      }

      return stats;
    } catch (error) {
      this.logger.error("Get payment stats error:", error);
      throw error;
    }
  }

  async retryFailedPayment(paymentId) {
    try {
      const payment = this.payments.get(paymentId);
      if (!payment) {
        throw new Error("Payment not found");
      }

      if (payment.status !== "failed") {
        throw new Error("Payment is not in failed status");
      }

      if (payment.retryCount >= this.config.retryAttempts) {
        throw new Error("Maximum retry attempts reached");
      }

      // Reset payment status
      payment.status = "pending";
      payment.retryCount += 1;
      payment.errorMessage = null;
      this.payments.set(paymentId, payment);

      // Retry payment
      const result = await this._processPaymentByMethod(payment);

      // Update payment status
      payment.status = result.success ? "completed" : "failed";
      payment.processedAt = new Date();
      payment.errorMessage = result.error || null;

      if (result.success) {
        payment.completedAt = new Date();
        this._addToHistory(payment);
        this.emit("paymentRetrySuccess", payment);
      } else {
        this.emit("paymentRetryFailed", payment);
      }

      this.payments.set(paymentId, payment);

      return {
        success: result.success,
        paymentId: payment.id,
        retryCount: payment.retryCount,
        error: result.error,
      };
    } catch (error) {
      this.logger.error("Retry failed payment error:", error);
      throw error;
    }
  }

  getSupportedPaymentMethods() {
    return Array.from(this.paymentMethods.values());
  }

  getSupportedCurrencies() {
    return this.config.supportedCurrencies;
  }

  async shutdown() {
    this.logger.info("Shutting down Payment Engine");

    if (this.scheduler) {
      this.scheduler.stop();
    }

    this.payments.clear();
    this.paymentHistory.clear();
    this.scheduledPayments.clear();
    this.paymentMethods.clear();

    this.emit("shutdown", { timestamp: new Date() });
  }
}

module.exports = PaymentEngine;
