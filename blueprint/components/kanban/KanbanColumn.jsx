import { TaskCard } from './TaskCard';

export function KanbanColumn({ column, tasks, onDragStart, onDrop, onDragOver, onMoveLeft, onMoveRight, colIndex, totalCols, expandedId, onExpand }) {
    return (
        <div
            className="flex-1 min-w-0 flex flex-col"
            onDragOver={(e) => { e.preventDefault(); onDragOver(e, column.id); }}
            onDrop={(e) => onDrop(e, column.id)}
        >
            <div className={`bg-gradient-to-r ${column.gradient} rounded-xl p-3.5 mb-4 shadow-md`}>
                <div className="flex items-center justify-between">
                    <h2 className="text-white font-bold text-sm">{column.emoji} {column.title}</h2>
                    <span className="bg-white bg-opacity-25 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">{tasks.length}</span>
                </div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto pr-1" style={{ maxHeight: "calc(100vh - 260px)" }}>
                {tasks.length === 0 && (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                        <p className="text-gray-300 text-sm">Drop tasks here</p>
                    </div>
                )}
                {tasks.map((task) => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        onDragStart={onDragStart}
                        onMoveLeft={onMoveLeft}
                        onMoveRight={onMoveRight}
                        canMoveLeft={colIndex > 0}
                        canMoveRight={colIndex < totalCols - 1}
                        isExpanded={expandedId === task.id}
                        onExpand={onExpand}
                    />
                ))}
            </div>
        </div>
    );
}
