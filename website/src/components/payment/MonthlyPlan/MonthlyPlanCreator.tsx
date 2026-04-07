import { useState, useMemo } from 'react';
import { Calculator, CalendarDays, DollarSign, User, FileText, ChevronRight, Check } from 'lucide-react';
import type { PlanCreationInput } from '@/data/mockMonthlyPlans';

/**
 * MonthlyPlanCreator - Plan setup wizard for installment plans
 * @crossref:used-in[Payment, OutstandingBalance]
 */

interface MonthlyPlanCreatorProps {
  readonly onCreatePlan: (input: PlanCreationInput) => void;
  readonly onCancel: () => void;
}

type WizardStep = 'customer' | 'treatment' | 'payment' | 'review';

const STEPS: readonly WizardStep[] = ['customer', 'treatment', 'payment', 'review'];

const STEP_LABELS: Record<WizardStep, string> = {
  customer: 'Customer',
  treatment: 'Treatment',
  payment: 'Payment Plan',
  review: 'Review',
};

const INSTALLMENT_OPTIONS = [3, 4, 6, 9, 12] as const;

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
}

export function MonthlyPlanCreator({ onCreatePlan, onCancel }: MonthlyPlanCreatorProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('customer');
  const [customerName, setCustomerName] = useState('');
  const [treatmentDescription, setTreatmentDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [downPaymentPercent, setDownPaymentPercent] = useState(25);
  const [numberOfInstallments, setNumberOfInstallments] = useState(6);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  const parsedTotal = Number(totalAmount) || 0;
  const downPayment = Math.round(parsedTotal * downPaymentPercent / 100);
  const installmentAmount = numberOfInstallments > 0
    ? Math.round((parsedTotal - downPayment) / numberOfInstallments)
    : 0;

  const currentStepIndex = STEPS.indexOf(currentStep);

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 'customer': return customerName.trim().length > 0;
      case 'treatment': return treatmentDescription.trim().length > 0 && parsedTotal > 0;
      case 'payment': return numberOfInstallments > 0 && startDate.length > 0;
      case 'review': return true;
    }
  }, [currentStep, customerName, treatmentDescription, parsedTotal, numberOfInstallments, startDate]);

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]);
    }
  };

  const handleSubmit = () => {
    onCreatePlan({
      customerId: `cust-${Date.now()}`,
      customerName: customerName.trim(),
      treatmentDescription: treatmentDescription.trim(),
      totalAmount: parsedTotal,
      downPayment,
      numberOfInstallments,
      startDate,
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-card">
      {/* Stepper */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {STEPS.map((step, idx) => (
            <div key={step} className="flex items-center">
              <button
                onClick={() => idx < currentStepIndex ? setCurrentStep(step) : undefined}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  step === currentStep
                    ? 'bg-primary text-white'
                    : idx < currentStepIndex
                      ? 'bg-dental-green/10 text-dental-green cursor-pointer'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {idx < currentStepIndex ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <span className="w-4 text-center">{idx + 1}</span>
                )}
                <span className="hidden sm:inline">{STEP_LABELS[step]}</span>
              </button>
              {idx < STEPS.length - 1 && (
                <ChevronRight className="w-4 h-4 text-gray-300 mx-1" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="p-6">
        {currentStep === 'customer' && (
          <div className="space-y-4 max-w-md">
            <div className="flex items-center gap-2 text-gray-700 mb-2">
              <User className="w-5 h-5" />
              <h3 className="font-semibold">Customer Information</h3>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Customer Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>
        )}

        {currentStep === 'treatment' && (
          <div className="space-y-4 max-w-md">
            <div className="flex items-center gap-2 text-gray-700 mb-2">
              <FileText className="w-5 h-5" />
              <h3 className="font-semibold">Treatment Details</h3>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Treatment Description</label>
              <input
                type="text"
                value={treatmentDescription}
                onChange={(e) => setTreatmentDescription(e.target.value)}
                placeholder="e.g., Dental Implant - Upper Jaw"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Total Amount (VND)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="0"
                  min={0}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 'payment' && (
          <div className="space-y-5 max-w-md">
            <div className="flex items-center gap-2 text-gray-700 mb-2">
              <Calculator className="w-5 h-5" />
              <h3 className="font-semibold">Payment Plan Setup</h3>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Down Payment: {downPaymentPercent}% ({formatVND(downPayment)})
              </label>
              <input
                type="range"
                min={0}
                max={50}
                step={5}
                value={downPaymentPercent}
                onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0%</span>
                <span>50%</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">Number of Installments</label>
              <div className="flex gap-2">
                {INSTALLMENT_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setNumberOfInstallments(n)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      numberOfInstallments === n
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {n}x
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Start Date</label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
            </div>
            {parsedTotal > 0 && (
              <div className="bg-primary/5 rounded-lg p-3 text-sm">
                <span className="text-gray-600">Monthly installment: </span>
                <span className="font-semibold text-primary">{formatVND(installmentAmount)}</span>
              </div>
            )}
          </div>
        )}

        {currentStep === 'review' && (
          <div className="space-y-4 max-w-md">
            <h3 className="font-semibold text-gray-700 mb-2">Review Plan Details</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Customer</span>
                <span className="font-medium text-gray-900">{customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Treatment</span>
                <span className="font-medium text-gray-900">{treatmentDescription}</span>
              </div>
              <hr className="border-gray-200" />
              <div className="flex justify-between">
                <span className="text-gray-500">Total Amount</span>
                <span className="font-medium text-gray-900">{formatVND(parsedTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Down Payment ({downPaymentPercent}%)</span>
                <span className="font-medium text-gray-900">{formatVND(downPayment)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Installments</span>
                <span className="font-medium text-gray-900">
                  {numberOfInstallments}x {formatVND(installmentAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Start Date</span>
                <span className="font-medium text-gray-900">{startDate}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100 flex items-center justify-between">
        <button
          onClick={currentStepIndex === 0 ? onCancel : handleBack}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          {currentStepIndex === 0 ? 'Cancel' : 'Back'}
        </button>
        {currentStep === 'review' ? (
          <button
            onClick={handleSubmit}
            className="px-5 py-2 bg-dental-green text-white text-sm font-medium rounded-lg hover:bg-dental-green/90 transition-colors"
          >
            Create Plan
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={!canProceed}
            className="px-5 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
