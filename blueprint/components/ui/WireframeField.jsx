export function WireframeField({ label }) {
    return (
        <div className="flex-1">
            <div className="text-xs text-gray-400 mb-1">{label}</div>
            <div className="h-8 bg-gray-100 rounded-md border border-gray-200"></div>
        </div>
    );
}
