interface DeletePaymentDialogProps {
  paymentToDelete: string | null;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeletePaymentDialog({ paymentToDelete, isDeleting, onCancel, onConfirm }: DeletePaymentDialogProps) {
  if (!paymentToDelete) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Xóa thanh toán?</h3>
        <p className="text-sm text-gray-600 mb-4">
          Bạn có chắc muốn xóa bản ghi thanh toán này? Hành động này không thể hoàn tác.
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isDeleting ? 'Đang xóa...' : 'Xóa'}
          </button>
        </div>
      </div>
    </div>
  );
}
