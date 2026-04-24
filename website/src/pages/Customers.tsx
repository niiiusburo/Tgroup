// @crossref:global-filter[FilterByLocation] — synced via LocationContext across: Overview, Customers, Calendar, Appointments, Employees, Services, Payment
import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Users, Plus, Search } from "lucide-react";
import {
  softDeletePartner,
  hardDeletePartner,
  registerFace,
  fetchSaleOrderLines,
} from "@/lib/api";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AddCustomerForm } from "@/components/forms/AddCustomerForm";
import { CustomerProfile } from "@/components/customer";
import { SearchBar } from "@/components/shared/SearchBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { useCustomers, type Customer } from "@/hooks/useCustomers";

import { useCustomerProfile } from "@/hooks/useCustomerProfile";
import { useLocations } from "@/hooks/useLocations";
import { useAppointments } from "@/hooks/useAppointments";
import { useServices } from "@/hooks/useServices";
import { useDeposits } from "@/hooks/useDeposits";
import { useEmployees } from "@/hooks/useEmployees";
import { useCustomerPayments } from "@/hooks/useCustomerPayments";
import { useExternalCheckups } from "@/hooks/useExternalCheckups";
import { resolveSaleOrderLinePayment } from "@/components/customer/servicePaymentAmounts";
import type { PaymentFormData } from "@/components/payment/PaymentForm";
import type { CustomerProfileData } from "@/hooks/useCustomerProfile";
import type { ProfileTab } from "@/components/customer/CustomerProfile";
import type { CustomerService } from "@/types/customer";
import type { CustomerStatus } from "@/data/mockCustomers";
import type { CustomerFormData } from "@/data/mockCustomerForm";

import { buildCustomerColumns } from "./Customers/CustomerColumns";

/**
 * Customers Page - Patient records with search, filters, table, and profile view
 * @crossref:route[/customers]
 * @crossref:used-in[App]
 * @crossref:uses[SearchBar, DataTable, StatusBadge, useCustomers, CustomerProfile, AddCustomerForm]
 */

const STATUS_FILTER_OPTIONS: readonly {
  readonly value: "all" | CustomerStatus;
  readonly label: string;
}[] = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "pending", label: "Pending" },
] as const;

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

  const {
    customers,
    stats,
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
  } = useCustomers(undefined);

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
    profile: hookProfile,
    rawPartner,
    appointments: hookAppointments,
    linkedCounts,
    isLoading: profileLoading,
    refetch: refetchProfile,
  } = useCustomerProfile(selectedCustomerId);

  // Hooks for profile actions (fetch across all locations — a customer's history
  // should never be hidden by the global clinic filter).
  useAppointments(undefined); // keep hook for potential future use; Shell handles its own API calls
  // Fetch service records without location filter so the customer profile shows
  // treatment history across all locations (not just the currently selected one).
  const {
    createServiceRecord,
    updateServiceRecord,
    updateServiceStatus,
    refetch: refetchServices,
  } = useServices(undefined, selectedCustomerId ?? undefined);
  const {
    depositList,
    usageHistory,
    balance: depositBalanceData,
    loading: depositsLoading,
    loadDeposits,
    addDeposit,
    addRefund,
    voidDeposit,
    removeDeposit,
    editDeposit,
  } = useDeposits();
  const { employees: allEmployees } = useEmployees();
  const {
    payments: customerPayments,
    isLoading: paymentsLoading,
    addPayment,
    refetch: refetchPayments,
    deletePaymentById,
  } = useCustomerPayments(selectedCustomerId);

  // Fetch sale order lines (service lines) for the records tab
  const [saleOrderLines, setSaleOrderLines] = useState<CustomerService[]>([]);
  const [saleOrderLinesLoading, setSaleOrderLinesLoading] = useState(false);

  const loadSaleOrderLines = useCallback(async () => {
    if (!selectedCustomerId) {
      setSaleOrderLines([]);
      return;
    }
    setSaleOrderLinesLoading(true);
    try {
      const res = await fetchSaleOrderLines({ partnerId: selectedCustomerId, limit: 500 });
      const mapped: CustomerService[] = res.items.map((line) => {
        const paymentAmounts = resolveSaleOrderLinePayment(line);
        return {
          id: line.id,
          date: line.date ? line.date.slice(0, 10) : "-",
          service: line.productname || "-",
          doctor: line.doctorname || "N/A",
          doctorId: line.employeeid || undefined,
          assistantId: line.assistantid || undefined,
          assistantName: line.assistantname || undefined,
          catalogItemId: line.productid || undefined,
          cost: parseFloat(line.pricetotal || "0") || 0,
          quantity: parseFloat(line.productuomqty || "0") || undefined,
          status:
            line.sostate === "done" || line.sostate === "completed"
              ? "completed"
              : line.iscancelled
                ? "cancelled"
                : "active",
          tooth: line.tooth_numbers || line.toothtype || line.diagnostic || "-",
          notes: line.note || "",
          orderId: line.orderid || undefined,
          orderName: line.ordername || undefined,
          orderCode: line.ordercode || undefined,
          paidAmount: paymentAmounts.paidAmount,
          residual: paymentAmounts.residual,
          locationName: line.companyname || undefined,
        };
      });
      setSaleOrderLines(mapped);
    } catch (err) {
      console.error("Failed to fetch sale order lines:", err);
      setSaleOrderLines([]);
    } finally {
      setSaleOrderLinesLoading(false);
    }
  }, [selectedCustomerId]);

  useEffect(() => {
    loadSaleOrderLines();
  }, [loadSaleOrderLines]);

  // AppointmentFormShell handles its own API calls; these callbacks just trigger a profile refresh
  const handleCreateAppointment = useCallback(() => {
    refetchProfile();
  }, [refetchProfile]);

  const handleUpdateAppointment = useCallback(() => {
    refetchProfile();
  }, [refetchProfile]);

  const handleCreateService = useCallback(
    async (data: {
      catalogItemId: string;
      serviceName: string;
      doctorId: string | null;
      doctorName: string;
      assistantId?: string | null;
      assistantName?: string;
      dentalAideId?: string | null;
      dentalAideName?: string;
      locationId: string;
      locationName: string;
      startDate: string;
      notes: string;
      totalCost: number;
      toothNumbers: readonly string[];
      sourceId?: string | null;
    }) => {
      await createServiceRecord({
        customerId: selectedCustomerId ?? "",
        customerName: hookProfile?.name ?? "",
        customerPhone: hookProfile?.phone ?? "",
        catalogItemId: data.catalogItemId,
        serviceName: data.serviceName,
        category: "treatment",
        doctorId: data.doctorId,
        doctorName: data.doctorName,
        assistantId: data.assistantId ?? null,
        assistantName: data.assistantName ?? "",
        dentalAideId: data.dentalAideId ?? null,
        dentalAideName: data.dentalAideName ?? "",
        locationId: data.locationId,
        locationName: data.locationName,
        totalVisits: 1,
        totalCost: data.totalCost,
        startDate: data.startDate,
        expectedEndDate: data.startDate,
        notes: data.notes,
        toothNumbers: data.toothNumbers,
        sourceId: data.sourceId ?? null,
      });
    },
    [createServiceRecord, selectedCustomerId, hookProfile],
  );

  const handleUpdateService = useCallback(
    async (data: {
      id: string;
      catalogItemId: string;
      serviceName: string;
      doctorId: string | null;
      doctorName: string;
      assistantId?: string | null;
      assistantName?: string;
      dentalAideId?: string | null;
      dentalAideName?: string;
      locationId: string;
      locationName: string;
      startDate: string;
      notes: string;
      totalCost: number;
      toothNumbers: readonly string[];
      sourceId?: string | null;
    }) => {
      await updateServiceRecord({
        id: data.id,
        customerId: selectedCustomerId ?? "",
        customerName: hookProfile?.name ?? "",
        customerPhone: hookProfile?.phone ?? "",
        catalogItemId: data.catalogItemId,
        serviceName: data.serviceName,
        category: "treatment",
        doctorId: data.doctorId,
        doctorName: data.doctorName,
        assistantId: data.assistantId ?? null,
        assistantName: data.assistantName ?? "",
        dentalAideId: data.dentalAideId ?? null,
        dentalAideName: data.dentalAideName ?? "",
        locationId: data.locationId,
        locationName: data.locationName,
        totalVisits: 1,
        totalCost: data.totalCost,
        startDate: data.startDate,
        expectedEndDate: data.startDate,
        notes: data.notes,
        toothNumbers: data.toothNumbers,
        sourceId: data.sourceId ?? null,
      });
      await loadSaleOrderLines();
    },
    [updateServiceRecord, selectedCustomerId, hookProfile, loadSaleOrderLines],
  );

  const handleMakePayment = useCallback(
    async (data: PaymentFormData) => {
      await addPayment({
        customerId: data.customerId,
        amount: data.amount,
        method: data.method,
        notes: data.notes,
        paymentDate: data.paymentDate,
        referenceCode: data.referenceCode,
        depositUsed: data.sources?.depositAmount,
        cashAmount: data.sources?.cashAmount,
        bankAmount: data.sources?.bankAmount,
        allocations: data.allocations?.map((a) => ({
          invoice_id: a.invoiceId,
          dotkham_id: a.dotkhamId,
          allocated_amount: a.allocatedAmount,
        })),
      });
      refetchProfile();
      refetchPayments();
      loadDeposits(data.customerId);
      refetchServices();
    },
    [
      addPayment,
      refetchProfile,
      refetchPayments,
      loadDeposits,
      refetchServices,
    ],
  );

  const handleAddDeposit = useCallback(
    async (
      customerId: string,
      amount: number,
      method: "cash" | "bank_transfer" | "vietqr",
      date?: string,
      note?: string,
    ) => {
      await addDeposit(customerId, amount, method, date, note);
      refetchProfile();
      if (selectedCustomerId) loadDeposits(selectedCustomerId);
    },
    [addDeposit, refetchProfile, selectedCustomerId, loadDeposits],
  );

  const handleAddRefund = useCallback(
    async (
      customerId: string,
      amount: number,
      method: "cash" | "bank_transfer",
      date?: string,
      note?: string,
    ) => {
      await addRefund(customerId, amount, method, date, note);
      refetchProfile();
      if (selectedCustomerId) loadDeposits(selectedCustomerId);
    },
    [addRefund, refetchProfile, selectedCustomerId, loadDeposits],
  );

  const handleVoidDeposit = useCallback(
    async (id: string) => {
      await voidDeposit(id);
      if (selectedCustomerId) loadDeposits(selectedCustomerId);
    },
    [voidDeposit, selectedCustomerId, loadDeposits],
  );

  const handleDeleteDeposit = useCallback(
    async (id: string) => {
      await removeDeposit(id);
      if (selectedCustomerId) loadDeposits(selectedCustomerId);
    },
    [removeDeposit, selectedCustomerId, loadDeposits],
  );

  const handleEditDeposit = useCallback(
    async (
      id: string,
      data: Partial<{
        amount: number;
        method: "cash" | "bank_transfer";
        notes: string;
        paymentDate: string;
      }>,
    ) => {
      await editDeposit(id, data);
      if (selectedCustomerId) loadDeposits(selectedCustomerId);
    },
    [editDeposit, selectedCustomerId, loadDeposits],
  );

  const handleRefreshDeposits = useCallback(() => {
    if (selectedCustomerId) loadDeposits(selectedCustomerId);
  }, [selectedCustomerId, loadDeposits]);

  // Load deposits when a customer is selected
  useEffect(() => {
    if (selectedCustomerId) {
      loadDeposits(selectedCustomerId);
    }
  }, [selectedCustomerId, loadDeposits]);

  const [createdCustomerCode, setCreatedCustomerCode] = useState<string | null>(
    null,
  );
  const [pendingFaceImage, setPendingFaceImage] = useState<Blob | null>(null);

  useEffect(() => {
    if (!showForm) {
      setPendingFaceImage(null);
    }
  }, [showForm]);

  const handleSubmit = async (data: CustomerFormData) => {
    if (isEditMode && selectedCustomerId) {
      await updateCustomer(selectedCustomerId, data);
      refetchProfile();
      setShowForm(false);
      setIsEditMode(false);
    } else {
      const created = await createCustomer(data);
      if (pendingFaceImage) {
        try {
          await registerFace(created.id, pendingFaceImage);
        } catch (err) {
          console.error("Post-save face registration failed:", err);
        }
        setPendingFaceImage(null);
      }
      setCreatedCustomerCode(created.code ?? null);
      setShowForm(false);
      setIsEditMode(false);
    }
  };

  const handleEdit = () => {
    setIsEditMode(true);
    setShowForm(true);
  };

  const getEditFormData = (): Partial<CustomerFormData> | undefined => {
    if (!isEditMode || !selectedCustomerId) return undefined;
    // Prefer raw partner data (has all fields) over the summarised profile
    if (rawPartner) {
      const g = rawPartner.gender ?? "";
      return {
        name: rawPartner.name,
        phone: rawPartner.phone ?? "",
        email: rawPartner.email ?? "",
        gender:
          g === "female" || g === "Nữ" || g === "f"
            ? "female"
            : g
              ? "male"
              : "",
        companyid: rawPartner.companyid ?? "",
        street: rawPartner.street ?? "",
        // API aliases cityname→city, districtname→district, wardname→ward
        cityname: rawPartner.city ?? "",
        districtname: rawPartner.district ?? "",
        wardname: rawPartner.ward ?? "",
        note: rawPartner.note ?? "",
        comment: rawPartner.comment ?? "",
        medicalhistory: rawPartner.medicalhistory ?? "",
        birthday: rawPartner.birthday ?? null,
        birthmonth: rawPartner.birthmonth ?? null,
        birthyear: rawPartner.birthyear ?? null,
        referraluserid: rawPartner.referraluserid ?? "",
        salestaffid: rawPartner.salestaffid ?? "",
        cskhid: rawPartner.cskhid ?? "",
        weight: rawPartner.weight ?? null,
        identitynumber: rawPartner.identitynumber ?? "",
        healthinsurancecardnumber: rawPartner.healthinsurancecardnumber ?? "",
        emergencyphone: rawPartner.emergencyphone ?? "",
        jobtitle: rawPartner.jobtitle ?? "",
        taxcode: rawPartner.taxcode ?? "",
        unitname: rawPartner.unitname ?? "",
        unitaddress: rawPartner.unitaddress ?? "",
        isbusinessinvoice: rawPartner.isbusinessinvoice ?? false,
        personalname: rawPartner.personalname ?? "",
        personalidentitycard: rawPartner.personalidentitycard ?? "",
        personaltaxcode: rawPartner.personaltaxcode ?? "",
        personaladdress: rawPartner.personaladdress ?? "",
        ref: rawPartner.code ?? "",
      };
    }
    // Fallback to summarised profile
    if (hookProfile) {
      return {
        name: hookProfile.name,
        phone: hookProfile.phone,
        email: hookProfile.email,
        gender:
          hookProfile.gender === "female" ||
          hookProfile.gender === "Nữ" ||
          hookProfile.gender === "f"
            ? "female"
            : hookProfile.gender && hookProfile.gender !== "N/A"
              ? "male"
              : "",
        companyid: hookProfile.companyId,
        street:
          hookProfile.address !== "N/A"
            ? hookProfile.address.split(", ")[0] || ""
            : "",
        note: hookProfile.notes || "",
        comment: "",
        medicalhistory: hookProfile.medicalHistory || "",
        referraluserid: "",
        salestaffid: "",
        cskhid: "",
        ref: hookProfile.code || "",
      };
    }
    // Fallback to paginated customers list
    const customer = customers.find((c) => c.id === selectedCustomerId);
    if (!customer) return undefined;
    return {
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      gender:
        customer.gender === "female" ||
        customer.gender === "Nữ" ||
        customer.gender === "f"
          ? "female"
          : customer.gender
            ? "male"
            : "",
      companyid: customer.locationId,
      street: customer.street || "",
      note: customer.note || "",
      comment: customer.comment || "",
      referraluserid: "",
      salestaffid: "",
      cskhid: customer.cskhid || "",
      ref: customer.code || "",
    };
  };

  const getCustomerCode = (): string | null | undefined => {
    if (!selectedCustomerId) return undefined;
    const customer = customers.find((c) => c.id === selectedCustomerId);
    return customer?.code;
  };

  const customerCode = getCustomerCode();
  const {
    data: checkupData,
    isLoading: checkupsLoading,
    error: checkupsError,
    refetch: refetchCheckups,
  } = useExternalCheckups(customerCode);

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

  const listCustomer = selectedCustomerId
    ? customers.find((c) => c.id === selectedCustomerId)
    : undefined;

  let profileData: CustomerProfileData;
  if (hookProfile) {
    profileData = {
      id: hookProfile.id,
      name: hookProfile.name,
      phone: hookProfile.phone,
      email: hookProfile.email,
      dateOfBirth: hookProfile.dateOfBirth,
      gender: hookProfile.gender === "female" ? "female" : "male",
      address: hookProfile.address,
      notes: hookProfile.notes,
      medicalHistory: hookProfile.medicalHistory,
      tags: hookProfile.tags,
      memberSince: hookProfile.memberSince,
      totalVisits: hookProfile.totalVisits,
      lastVisit: hookProfile.lastVisit,
      totalSpent: hookProfile.totalSpent,
      companyId: hookProfile.companyId,
      companyName:
        hookProfile.companyName ||
        locationNameMap.get(hookProfile.companyId) ||
        "N/A",
      code: getCustomerCode() ?? "",
      depositBalance: hookProfile.depositBalance,
      outstandingBalance: hookProfile.outstandingBalance,
      salestaffid: hookProfile.salestaffid,
      cskhid: hookProfile.cskhid,
      cskhname: hookProfile.cskhname,
      referraluserid: hookProfile.referraluserid,
    };
  } else {
    profileData = {
      id: listCustomer?.id ?? selectedCustomerId ?? "",
      name: listCustomer?.name ?? "",
      phone: listCustomer?.phone ?? "",
      email: listCustomer?.email ?? "",
      dateOfBirth: "N/A",
      gender: "male",
      address: "N/A",
      notes: "",
      medicalHistory: "",
      tags: [],
      memberSince: "N/A",
      totalVisits: 0,
      totalSpent: 0,
      lastVisit: listCustomer?.lastVisit ?? "N/A",
      companyId: listCustomer?.locationId ?? "",
      companyName: locationNameMap.get(listCustomer?.locationId ?? "") ?? "N/A",
      code: listCustomer?.code ?? "",
      depositBalance: 0,
      outstandingBalance: 0,
      salestaffid: null,
      cskhid: null,
      cskhname: null,
      referraluserid: null,
    };
  }

  // Explicitly refetch services when the selected customer changes
  useEffect(() => {
    if (selectedCustomerId) {
      refetchServices();
    }
  }, [selectedCustomerId, refetchServices]);

  // Use sale order lines (service lines) for the records tab to match old system
  const customerServices: CustomerService[] = saleOrderLines;

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-gray-500">
          {t("loadingProfile") || "Loading..."}
        </span>
      </div>
    );
  }

  const content = selectedCustomerId ? (
    <>
      <CustomerProfile
        profile={profileData}
        appointments={hookAppointments}
        services={customerServices}
        loadingServices={saleOrderLinesLoading}
        employees={allEmployees}
        depositList={depositList}
        usageHistory={usageHistory}
        depositBalance={depositBalanceData}
        payments={customerPayments}
        activeTab={profileTab}
        onTabChange={setProfileTab}
        onBack={() => navigate("/customers")}
        onEdit={canEditCustomers ? handleEdit : undefined}
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
        onMakePayment={handleMakePayment}
        onDeletePayment={async (id) => {
          await deletePaymentById(id);
          refetchPayments();
          refetchProfile();
        }}
        canSoftDelete={canSoftDelete}
        canHardDelete={canHardDelete}
        onSoftDelete={() => {
          if (selectedCustomerId && hookProfile) {
            setDeleteDialog({
              open: true,
              customerId: selectedCustomerId,
              customerName: hookProfile.name,
              mode: "soft",
            });
          }
        }}
        onHardDelete={() => {
          if (selectedCustomerId && hookProfile) {
            setDeleteDialog({
              open: true,
              customerId: selectedCustomerId,
              customerName: hookProfile.name,
              mode: "hard",
            });
          }
        }}
        loadingDeposits={depositsLoading}
        loadingPayments={paymentsLoading}
        checkupData={checkupData}
        checkupsLoading={checkupsLoading}
        checkupsError={checkupsError}
        onRefetchCheckups={refetchCheckups}
        onUpdateServiceStatus={async (serviceId, newStatus) => {
          await updateServiceStatus(
            serviceId,
            newStatus as "active" | "completed" | "cancelled",
          );
        }}
      />
    </>
  ) : (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        subtitle={`${stats.total} patients · ${stats.active} active`}
        icon={<Users className="w-6 h-6 text-primary" />}
        actions={
          canAddCustomers && (
            <button
              onClick={() => {
                setIsEditMode(false);
                setShowForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Customer
            </button>
          )
        }
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="w-full sm:max-w-xs">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={t("searchPlaceholder")}
          />
        </div>
        <div className="flex items-center gap-1">
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === opt.value
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search Required Message */}
      {searchRequired && !searchTerm && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Search className="w-6 h-6 text-amber-600" />
          </div>
          <h3 className="text-sm font-medium text-amber-900 mb-1">
            {t("searchToView")}
          </h3>
          <p className="text-xs text-amber-700">{minSearchLength}</p>
        </div>
      )}

      {/* Customer Table - only show when not in search required mode or has results */}
      {(!searchRequired || searchTerm.length >= minSearchLength) && (
        <DataTable<Customer>
          columns={customerColumns}
          data={customers}
          keyExtractor={(row) => row.id}
          pageSize={20}
          onRowClick={(row) => navigate(`/customers/${row.id}`)}
          emptyMessage={t("table.noData", { ns: "common" })}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteDialog?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {deleteDialog.mode === "hard" ? t("xaVnhVin") : t("xaKhchHng")}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              <strong>
                {deleteDialog.mode === "hard" ? t("xaVnhVin1") : t("xa1")}
              </strong>
              <strong>{deleteDialog.customerName}</strong>?
              {deleteDialog.mode === "soft" && t("softDeleteWarning")}
              {deleteDialog.mode === "hard" && t("hardDeleteWarning")}
            </p>
            {linkedCounts &&
              (linkedCounts.appointments > 0 ||
                linkedCounts.saleorders > 0 ||
                linkedCounts.dotkhams > 0) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
                  <p className="font-medium mb-1">{t("relatedData")}</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {linkedCounts.appointments > 0 && (
                      <li>{linkedCounts.appointments}</li>
                    )}
                    {linkedCounts.saleorders > 0 && (
                      <li>{linkedCounts.saleorders}</li>
                    )}
                    {linkedCounts.dotkhams > 0 && (
                      <li>{linkedCounts.dotkhams}</li>
                    )}
                  </ul>
                </div>
              )}
            {deleteError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
                {deleteError}
              </div>
            )}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteDialog(null)}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
              ></button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteLoading
                  ? t("loading")
                  : deleteDialog.mode === "hard"
                    ? t("xaVnhVin")
                    : t("xa")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Unified Add/Edit Customer Form
  return (
    <>
      {content}
      {showForm && (
        <AddCustomerForm
          isEdit={isEditMode}
          canEdit={canEditCustomers}
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
      )}
    </>
  );
}
