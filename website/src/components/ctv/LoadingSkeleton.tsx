export function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-3xl p-4 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="w-32 h-3 bg-gray-200 rounded animate-pulse" />
              <div className="w-20 h-2 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-50">
            <div className="h-1.5 bg-gray-200 rounded-full animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
