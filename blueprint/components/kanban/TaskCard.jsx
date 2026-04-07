import { PRIORITY_STYLES } from '../../constants/styles';

export function TaskCard({ task, onDragStart, onMoveLeft, onMoveRight, canMoveLeft, canMoveRight, isExpanded, onExpand }) {
    const pc = PRIORITY_STYLES[task.priority];
    const isPlaceholder = task.title.includes("Placeholder") || task.title.includes("(P)") || task.title.includes("🔔") || task.title.includes("📧");
    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, task.id)}
            className={`bg-white rounded-xl border p-4 cursor-grab active:cursor-grabbing hover:shadow-lg transition-all duration-200 ${isExpanded ? "ring-2 ring-blue-300 border-blue-200" : "border-gray-200"} ${isPlaceholder ? "border-dashed border-gray-300 bg-gray-50" : ""}`}
        >
            <div className="flex items-center justify-between mb-2">
                <h3 className={`font-semibold text-sm ${isPlaceholder ? "text-gray-400" : "text-gray-800"}`}>{task.title}</h3>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${pc.bg} ${pc.text} ${pc.border}`}>{pc.label}</span>
            </div>
            {isExpanded && task.description && (
                <p className="text-xs text-gray-500 leading-relaxed border-t border-gray-100 pt-2 mt-1 mb-2">{task.description}</p>
            )}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                <button onClick={() => onExpand(task.id)} className="text-xs text-gray-400 hover:text-blue-500 transition-colors">
                    {isExpanded ? "Collapse ▲" : "Details ▼"}
                </button>
                <div className="flex gap-1">
                    {canMoveLeft && (
                        <button onClick={() => onMoveLeft(task.id)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-50 hover:bg-orange-100 text-gray-400 hover:text-orange-500 transition-colors text-sm" title="Move left">←</button>
                    )}
                    {canMoveRight && (
                        <button onClick={() => onMoveRight(task.id)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-50 hover:bg-emerald-100 text-gray-400 hover:text-emerald-500 transition-colors text-sm" title="Move right">→</button>
                    )}
                </div>
            </div>
        </div>
    );
}
