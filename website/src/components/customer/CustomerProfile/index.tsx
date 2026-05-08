import { useState } from 'react';
import { CustomerAppointmentHistory } from '../CustomerAppointmentHistory';
import { CustomerProfileIdentity } from './CustomerProfileIdentity';
import { ProfileActionsHeader } from './ProfileActionsHeader';
import { ProfileTabs } from './ProfileTabs';
import { ProfileTab } from './ProfileTab';
import { RecordsTab } from './RecordsTab';
import { PaymentTab } from './PaymentTab';
import { CustomerProfileModals } from './CustomerProfileModals';
import { useAuth } from '@/contexts/AuthContext';
import type { CustomerService } from '@/types/customer';
import type { ApiAppointment } from '@/lib/api';
import type {
  CustomerProfileTab,
  OrchestratorProps,
  PaymentFormData,
  ServiceFormPayload,
  ServiceFormUpdatePayload,
} from './types';

export type ProfileTab = CustomerProfileTab;
export type { OrchestratorProps as CustomerProfileProps } from './types';

export function CustomerProfile(props: OrchestratorProps) {
  const {
    profile, appointments, services = [], loadingServices = false, employees,
    depositList = [], usageHistory = [], depositBalance,
    payments = [], activeTab: controlledActiveTab, onTabChange,
    onBack, onEdit, onAddDeposit, onAddRefund, onVoidDeposit, onDeleteDeposit,
    onEditDeposit, onRefreshDeposits, onCreateAppointment, onUpdateAppointment,
    onCreateService, onUpdateService, onDeleteService, onMakePayment, onDeletePayment,
    onSoftDelete, onHardDelete, canSoftDelete, canHardDelete,
    loadingPayments = false, loadingDeposits = false,
    checkupData, checkupsLoading, checkupsError, onRefetchCheckups,
    onUpdateServiceStatus,
  } = props;

  const { hasPermission } = useAuth();
  const canViewHealthCheckups = hasPermission('external_checkups.view');
  const canCreateExternalPatient = hasPermission('external_checkups.create');
  const canUploadHealthCheckups = hasPermission('external_checkups.upload');
  const canAddPayment = hasPermission('payment.add');
  const canRefundPayment = hasPermission('payment.refund');
  const canEditPayment = hasPermission('payment.edit');
  const canVoidPayment = hasPermission('payment.void');

  const [internalActiveTab, setInternalActiveTab] = useState<CustomerProfileTab>('profile');
  const activeTab = controlledActiveTab ?? internalActiveTab;
  const setActiveTab = (tab: CustomerProfileTab) => {
    if (controlledActiveTab === undefined) setInternalActiveTab(tab);
    onTabChange?.(tab);
  };

  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<ApiAppointment | null>(null);
  const [editingService, setEditingService] = useState<CustomerService | null>(null);
  const [payTargetService, setPayTargetService] = useState<CustomerService | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<CustomerService | null>(null);
  const [isDeletingService, setIsDeletingService] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
  const [isDeletingPayment, setIsDeletingPayment] = useState(false);

  const handleInitiateAppointmentCreate = () => {
    setEditingAppointment(null);
    setShowAppointmentModal(true);
  };

  const handleInitiateAppointmentEdit = (appt: ApiAppointment) => {
    setEditingAppointment(appt);
    setShowAppointmentModal(true);
  };

  const handleInitiateServiceCreate = () => setShowServiceModal(true);
  const handleInitiateServiceEdit = (svc: CustomerService) => {
    setEditingService(svc);
  };
  const handleInitiatePayment = (svc: CustomerService) => {
    setPayTargetService(svc);
    setShowPaymentModal(true);
  };

  const handleConfirmDeletePayment = async () => {
    if (!onDeletePayment || !paymentToDelete) return;
    setIsDeletingPayment(true);
    try {
      await onDeletePayment(paymentToDelete);
    } catch (err) {
      console.error('Failed to delete payment:', err);
    } finally {
      setIsDeletingPayment(false);
      setPaymentToDelete(null);
    }
  };

  const handleConfirmDeleteService = async () => {
    if (!onDeleteService || !serviceToDelete) return;
    setIsDeletingService(true);
    try {
      await onDeleteService(serviceToDelete.id);
    } catch (err) {
      console.error('Failed to delete service:', err);
    } finally {
      setIsDeletingService(false);
      setServiceToDelete(null);
    }
  };

  const handleAppointmentSuccess = async () => {
    try {
      if (editingAppointment && onUpdateAppointment) {
        await onUpdateAppointment();
      } else if (onCreateAppointment) {
        await onCreateAppointment();
      }
      setShowAppointmentModal(false);
      setEditingAppointment(null);
    } catch (error) {
      console.error('Failed to save appointment:', error);
    }
  };

  const handleServiceSubmit = async (data: ServiceFormPayload) => {
    try {
      if (onCreateService) await onCreateService(data);
      setShowServiceModal(false);
    } catch (error) {
      console.error('Failed to create service:', error);
    }
  };

  const handleServiceUpdate = async (data: ServiceFormUpdatePayload) => {
    if (!data.id) {
      console.error('Missing service ID', data);
      throw new Error('Missing service ID');
    }
    if (!onUpdateService) {
      console.error('Update handler missing');
      throw new Error('Update handler not available');
    }
    try {
      await onUpdateService({ ...data, id: data.id });
      setEditingService(null);
    } catch (error) {
      console.error('Service update failed:', error);
      throw error;
    }
  };

  const handlePaymentSubmit = async (data: PaymentFormData) => {
    try {
      if (onMakePayment) await onMakePayment(data);
      setShowPaymentModal(false);
      setPayTargetService(null);
    } catch (error) {
      console.error('Failed to make payment:', error);
    }
  };

  return (
    <div className="space-y-6">
      <ProfileActionsHeader
        onBack={onBack}
        onEdit={onEdit}
        onSoftDelete={onSoftDelete}
        onHardDelete={onHardDelete}
        canSoftDelete={canSoftDelete}
        canHardDelete={canHardDelete}
      />

      <CustomerProfileIdentity profile={profile} />

      <ProfileTabs activeTab={activeTab} props={props} loadingServices={loadingServices} onSelect={setActiveTab} />

      {activeTab === 'profile' && (
        <ProfileTab
          profile={profile}
          checkupData={checkupData ?? null}
          checkupsLoading={checkupsLoading ?? false}
          checkupsError={checkupsError ?? null}
          onRefetchCheckups={onRefetchCheckups}
          canViewHealthCheckups={canViewHealthCheckups}
          canCreateExternalPatient={canCreateExternalPatient}
          canUploadHealthCheckups={canUploadHealthCheckups}
        />
      )}

      {activeTab === 'appointments' && (
        <CustomerAppointmentHistory
          appointments={appointments}
          onCreateAppointment={onCreateAppointment ? handleInitiateAppointmentCreate : undefined}
          onEditAppointment={onUpdateAppointment ? handleInitiateAppointmentEdit : undefined}
        />
      )}

      {activeTab === 'records' && (
        <RecordsTab
          profile={profile}
          services={services}
          loadingServices={loadingServices}
          payments={payments}
          onCreateService={handleInitiateServiceCreate}
          onEditService={handleInitiateServiceEdit}
          onDeleteService={onDeleteService ? setServiceToDelete : undefined}
          onPayForService={canAddPayment ? handleInitiatePayment : undefined}
          onDeletePayment={canVoidPayment && onDeletePayment ? (id) => setPaymentToDelete(id) : undefined}
          onUpdateServiceStatus={onUpdateServiceStatus ?? (async () => {})}
        />
      )}

      {activeTab === 'payment' && (
        <PaymentTab
          profile={profile}
          services={services}
          payments={payments}
          loadingPayments={loadingPayments}
          loadingDeposits={loadingDeposits}
          depositList={depositList}
          usageHistory={usageHistory}
          depositBalance={depositBalance ?? {
            depositBalance: profile.depositBalance,
            outstandingBalance: profile.outstandingBalance,
            totalDeposited: 0,
            totalUsed: 0,
            totalRefunded: 0,
          }}
          onAddDeposit={canAddPayment && onAddDeposit ? async (amount, method, date, note) => onAddDeposit(profile.id, amount, method, date, note) : undefined}
          onAddRefund={canRefundPayment && onAddRefund ? async (amount, method, date, note) => onAddRefund(profile.id, amount, method, date, note) : undefined}
          onVoidDeposit={canVoidPayment ? onVoidDeposit : undefined}
          onDeleteDeposit={canVoidPayment ? onDeleteDeposit : undefined}
          onEditDeposit={canEditPayment ? onEditDeposit : undefined}
          onRefreshDeposits={onRefreshDeposits}
          onDeletePayment={canVoidPayment && onDeletePayment ? (id) => setPaymentToDelete(id) : undefined}
        />
      )}

      <CustomerProfileModals
        profile={profile}
        employees={employees}
        showAppointmentModal={showAppointmentModal}
        editingAppointment={editingAppointment}
        canCreateAppointment={Boolean(onCreateAppointment)}
        canUpdateAppointment={Boolean(onUpdateAppointment)}
        onCloseAppointment={() => { setShowAppointmentModal(false); setEditingAppointment(null); }}
        onAppointmentSuccess={handleAppointmentSuccess}
        showServiceModal={showServiceModal}
        canCreateService={Boolean(onCreateService)}
        onCloseServiceCreate={() => setShowServiceModal(false)}
        onServiceCreate={handleServiceSubmit}
        editingService={editingService}
        onCloseServiceEdit={() => setEditingService(null)}
        onServiceUpdate={handleServiceUpdate}
        paymentToDelete={paymentToDelete}
        isDeletingPayment={isDeletingPayment}
        onCancelDeletePayment={() => setPaymentToDelete(null)}
        onConfirmDeletePayment={handleConfirmDeletePayment}
        serviceToDelete={serviceToDelete}
        isDeletingService={isDeletingService}
        onCancelDeleteService={() => setServiceToDelete(null)}
        onConfirmDeleteService={handleConfirmDeleteService}
        showPaymentModal={showPaymentModal}
        payTargetService={payTargetService}
        canMakePayment={canAddPayment && Boolean(onMakePayment)}
        onPaymentSubmit={handlePaymentSubmit}
        onClosePayment={() => { setShowPaymentModal(false); setPayTargetService(null); }}
      />
    </div>
  );
}
