// @crossref:global-filter[FilterByLocation] — synced via LocationContext across: Overview, Customers, Calendar, Appointments, Employees, Services, Payment
import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";

import {
  softDeletePartner,
  hardDeletePartner,
} from "@/lib/api";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomers } from "@/hooks/useCustomers";
import { useLocations } from "@/hooks/useLocations";
import type { ProfileTab } from "@/components/customer/CustomerProfile";
import { LoadingState } from "@/components/shared/LoadingState";

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
  // Sync selected customer with URL param for deep-linking
  useEffect(() => {
    setSelectedCustomerId(id ?? null);
  }, [id]);

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
        onAddDeposit={handleAddDeposit}
        onAddRefund={handleAddRefund}
        onVoidDeposit={handleVoidDeposit}
        onDeleteDeposit={handleDeleteDeposit}
        onEditDeposit={handleEditDeposit}
        onRefreshDeposits={handleRefreshDeposits}
        onCreateAppointment={handleCreateAppointment}
        onUpdateAppointment={handleUpdateAppointment}
        onCreateService={handleCreateService}
        onUpdateService={handleUpdateService}
        onDeleteService={handleDeleteService}
        onMakePayment={handleMakePayment}
        deletePaymentById={deletePaymentById}
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
