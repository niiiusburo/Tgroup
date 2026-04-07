export function WireframeButton({ label, primary = false }) {
    return (
        <div className={`px-4 py-2 rounded-lg text-xs font-medium text-center ${primary ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500 border border-gray-200"}`}>
            {label}
        </div>
    );
}
