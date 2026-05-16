// @crossref:global-filter[FilterByLocation] — synced via LocationContext across: Overview, Customers, Calendar, Appointments, Employees, Services, Payment
import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";

import {
  softDeletePartner,
  hardDeletePartner,
} from "@/lib/api";
import { resolvePartnerKey, type PartnerResolveCandidate } from "@/lib/api/partners";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomers } from "@/hooks/useCustomers";
import { useLocations } from "@/hooks/useLocations";
import type { ProfileTab } from "@/components/customer/CustomerProfile";
import { LoadingState } from "@/components/shared/LoadingState";
import { CustomerKeyPicker } from "@/components/customer/CustomerKeyPicker";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

import { buildCustomerColumns } from "./Customers/CustomerColumns";
import { CustomerListView } from "./Customers/CustomerListView";
import { CustomerFormModal } from "./Customers/CustomerFormModal";
import { CustomerProfileContent } from "./Customers/CustomerProfileContent";
import { useCustomerDetailController } from "./Customers/useCustomerDetailController";

/**
 * Customers Page - Patient records with search, filters, table, and profile view
 * @crossref:route[/customers]
 * @crossref:used-in[App]
 * @crossref:uses[SearchBar, DataTable, StatusBadge, useCustomers, CustomerProfile, AddCustomerForm, mapSaleOrderLineToCustomerService, useCustomerPaymentActions]
 */

export function Customers() {
  const { t } = useTranslation("customers");
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    id ?? null,
  );
  const [profileTab, setProfileTab] = useState<ProfileTab>("profile");
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    customerId: string | null;
    customerName: string;
    mode: "soft" | "hard";
  } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showForm) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => document.body.classList.remove("modal-open");
  }, [showForm]);
  // Resolver state — only used when URL contains a non-UUID key (e.g., /customers/T056733)
  const [resolveState, setResolveState] = useState<
    | { status: 'idle' }
    | { status: 'resolving'; key: string }
    | { status: 'not-found'; key: string }
    | { status: 'ambiguous'; key: string; matchedBy: 'ref' | 'phone'; candidates: PartnerResolveCandidate[] }
  >({ status: 'idle' });

  // Sync selected customer with URL param for deep-linking.
  // If the URL is a non-UUID key (customer code or phone), resolve it to a
  // canonical UUID and redirect, so every downstream component stays UUID-only.
  useEffect(() => {
    if (!id) {
      setSelectedCustomerId(null);
      setResolveState({ status: 'idle' });
      return;
    }

    if (UUID_RE.test(id)) {
      setSelectedCustomerId(id);
      setResolveState({ status: 'idle' });
      return;
    }

    let cancelled = false;
    setResolveState({ status: 'resolving', key: id });
    resolvePartnerKey(id)
      .then((result) => {
        if (cancelled) return;
        if (result.status === 'found') {
          navigate(`/customers/${result.partner.id}`, { replace: true });
        } else if (result.status === 'not-found') {
          setResolveState({ status: 'not-found', key: id });
        } else {
          setResolveState({
            status: 'ambiguous',
            key: id,
            matchedBy: result.matchedBy,
            candidates: result.candidates,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setResolveState({ status: 'not-found', key: id });
      });

    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  // Reset profile tab when switching customers or returning to list
  useEffect(() => {
    setProfileTab("profile");
  }, [selectedCustomerId]);

  const { hasPermission } = useAuth();

  // Check permissions
  const canEditCustomers = hasPermission("customers.edit");
  const canAddCustomers = hasPermission("customers.add");
  const canSoftDelete = hasPermission("customers.delete");
  const canHardDelete = hasPermission("customers.hard_delete");
  const canExportCustomers = hasPermission("customers.export");
  const canAddPayment = hasPermission("payment.add");
  const canRefundPayment = hasPermission("payment.refund");
  const canEditPayment = hasPermission("payment.edit");
  const canVoidPayment = hasPermission("payment.void");

  const {
    customers,
    stats,
    page,
    setPage,
    pageSize,
    totalItems,
    loading,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    createCustomer,
    updateCustomer,
    searchRequired,
    minSearchLength,
    // Load customers across all locations so staff can search by name/phone
    // regardless of the global clinic filter.
  } = useCustomers(undefined, { paginated: true });

  const { allLocations } = useLocations();
  const locationNameMap = useMemo(
    () => new Map(allLocations.map((l) => [l.id, l.name])),
    [allLocations],
  );
  const customerColumns = useMemo(
    () =>
      buildCustomerColumns(
        locationNameMap,
        canSoftDelete,
        (id, name) => {
          setDeleteDialog({
            open: true,
            customerId: id,
            customerName: name,
            mode: "soft",
          });
        },
        t,
      ),
    [locationNameMap, canSoftDelete, t],
  );

  const {
    createdCustomerCode,
    setPendingFaceImage,
    setCreatedCustomerCode,
    getCustomerCode,
    getEditFormData,
    handleSubmit,
    hookProfile,
    hookAppointments,
    linkedCounts,
    profileLoading,
    refetchProfile,
    profileData,
    allEmployees,
    depositList,
    usageHistory,
    depositBalanceData,
    depositsLoading,
    customerPayments,
    paymentsLoading,
    refetchPayments,
    deletePaymentById,
    loadSaleOrderLines,
    saleOrderLines,
    saleOrderLinesLoading,
    handleCreateAppointment,
    handleUpdateAppointment,
    handleCreateService,
    handleUpdateService,
    handleDeleteService,
    handleMakePayment,
    handleAddDeposit,
    handleAddRefund,
    handleVoidDeposit,
    handleDeleteDeposit,
    handleEditDeposit,
    handleRefreshDeposits,
    updateServiceStatus,
    checkupData,
    checkupsLoading,
    checkupsError,
    refetchCheckups,
  } = useCustomerDetailController({
    selectedCustomerId,
    customers,
    locationNameMap,
    isEditMode,
    createCustomer,
    updateCustomer,
    setShowForm,
    setIsEditMode,
  });

  function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    return "Unexpected error";
  }

  const handleDeleteConfirm = async () => {
    if (!deleteDialog?.customerId) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      if (deleteDialog.mode === "hard") {
        await hardDeletePartner(deleteDialog.customerId);
      } else {
        await softDeletePartner(deleteDialog.customerId);
      }
      setDeleteDialog(null);
      navigate("/customers");
      refetchProfile();
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "status" in err &&
        (err as { status: number }).status === 409
      ) {
        setDeleteError(t("deleteErrorHasLinkedData"));
      } else {
        setDeleteError(getErrorMessage(err));
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  if (resolveState.status === 'resolving') {
    return <LoadingState title="Đang tra cứu bệnh nhân..." />;
  }

  if (resolveState.status === 'not-found') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <h2 className="text-lg font-semibold text-slate-900">Không tìm thấy bệnh nhân</h2>
        <p className="text-sm text-slate-500 mt-1">
          Không có hồ sơ nào khớp với <span className="font-mono">{resolveState.key}</span>.
        </p>
        <button
          type="button"
          onClick={() => navigate('/customers')}
          className="mt-4 text-sm text-blue-600 hover:underline"
        >
          Quay lại danh sách khách hàng
        </button>
      </div>
    );
  }

  if (resolveState.status === 'ambiguous') {
    return (
      <CustomerKeyPicker
        searchedKey={resolveState.key}
        matchedBy={resolveState.matchedBy}
        candidates={resolveState.candidates}
      />
    );
  }

  if (profileLoading) {
    return (
      <LoadingState title={t("loadingProfile") || "Loading profile..."} />
    );
  }

  const content = selectedCustomerId ? (
    <CustomerProfileContent
        profile={profileData}
        appointments={hookAppointments}
        services={saleOrderLines}
        loadingServices={saleOrderLinesLoading}
        employees={allEmployees}
        depositList={depositList}
        usageHistory={usageHistory}
        depositBalance={depositBalanceData}
        payments={customerPayments}
        activeTab={profileTab}
        onTabChange={setProfileTab}
        onBack={() => navigate("/customers")}
        canEditCustomers={canEditCustomers}
        openEditForm={() => { setIsEditMode(true); setShowForm(true); }}
        selectedCustomerId={selectedCustomerId}
        hookProfile={hookProfile}
        setDeleteDialog={setDeleteDialog}
        onAddDeposit={canAddPayment ? handleAddDeposit : undefined}
        onAddRefund={canRefundPayment ? handleAddRefund : undefined}
        onVoidDeposit={canVoidPayment ? handleVoidDeposit : undefined}
        onDeleteDeposit={canVoidPayment ? handleDeleteDeposit : undefined}
        onEditDeposit={canEditPayment ? handleEditDeposit : undefined}
        onRefreshDeposits={handleRefreshDeposits}
        onCreateAppointment={handleCreateAppointment}
        onUpdateAppointment={handleUpdateAppointment}
        onCreateService={handleCreateService}
        onUpdateService={handleUpdateService}
        onDeleteService={handleDeleteService}
        onMakePayment={canAddPayment ? handleMakePayment : undefined}
        deletePaymentById={canVoidPayment ? deletePaymentById : undefined}
        refetchPayments={refetchPayments}
        refetchProfile={refetchProfile}
        loadSaleOrderLines={loadSaleOrderLines}
        canSoftDelete={canSoftDelete}
        canHardDelete={canHardDelete}
        loadingDeposits={depositsLoading}
        loadingPayments={paymentsLoading}
        checkupData={checkupData}
        checkupsLoading={checkupsLoading}
        checkupsError={checkupsError}
        onRefetchCheckups={refetchCheckups}
        updateServiceStatus={updateServiceStatus}
    />
  ) : (
    <CustomerListView
      customers={customers}
      columns={customerColumns}
      stats={stats}
      page={page}
      pageSize={pageSize}
      totalItems={totalItems}
      loading={loading}
      onPageChange={setPage}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder={t("searchPlaceholder")}
      statusFilter={statusFilter}
      onStatusFilterChange={setStatusFilter}
      searchRequired={searchRequired}
      minSearchLength={minSearchLength}
      canAddCustomers={canAddCustomers}
      canExportCustomers={canExportCustomers}
      onAddCustomer={() => { setIsEditMode(false); setShowForm(true); }}
      onRowClick={(row) => navigate(`/customers/${row.id}`)}
      emptyMessage={t("table.noData", { ns: "common" })}
      deleteDialog={deleteDialog}
      linkedCounts={linkedCounts}
      deleteError={deleteError}
      deleteLoading={deleteLoading}
      onDeleteCancel={() => setDeleteDialog(null)}
      onDeleteConfirm={handleDeleteConfirm}
      t={t}
    />
  );

  // Unified Add/Edit Customer Form
  return (
    <>
      {content}
      <CustomerFormModal
        showForm={showForm}
        isEditMode={isEditMode}
        canEditCustomers={canEditCustomers}
        initialData={isEditMode ? getEditFormData() : undefined}
        customerRef={isEditMode ? getCustomerCode() : createdCustomerCode}
        customerId={selectedCustomerId ?? undefined}
        onSubmit={handleSubmit}
        onCancel={() => {
          setShowForm(false);
          setIsEditMode(false);
          setCreatedCustomerCode(null);
        }}
        onPendingFaceImage={setPendingFaceImage}
      />
    </>
  );
}
