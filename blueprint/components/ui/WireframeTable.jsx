export function WireframeTable({ columns, rows = 5 }) {
    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex bg-gray-50 border-b border-gray-200">
                {columns.map((col, i) => (
                    <div key={i} className="flex-1 px-3 py-2 text-xs font-bold text-gray-500 uppercase">{col}</div>
                ))}
            </div>
            {Array.from({ length: rows }).map((_, r) => (
                <div key={r} className={`flex ${r < rows - 1 ? "border-b border-gray-100" : ""}`}>
                    {columns.map((_, i) => (
                        <div key={i} className="flex-1 px-3 py-2.5">
                            <div className="h-3 bg-gray-100 rounded w-3/4"></div>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}
