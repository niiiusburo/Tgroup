export function WireframeStatCard({ label, value }) {
    return (
        <div className="flex-1 bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-xs text-gray-400 mb-1">{label}</div>
            <div className="text-2xl font-bold text-gray-700">{value}</div>
        </div>
    );
}
