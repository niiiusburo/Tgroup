export function WireframeBox({ label, className = "", children, dashed = false }) {
    return (
        <div className={`rounded-lg border-2 ${dashed ? "border-dashed border-gray-300 bg-gray-50" : "border-gray-200 bg-white"} p-3 ${className}`}>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{label}</span>
            {children && <div className="mt-2">{children}</div>}
        </div>
    );
}
