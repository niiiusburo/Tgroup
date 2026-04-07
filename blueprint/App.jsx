import { useState, useCallback, useRef } from "react";
import { PAGES } from "./data/pages.js";
import { COLUMNS } from "./constants/styles.js";
import { KanbanColumn } from "./components/kanban/index.js";
import {
  OverviewLayout,
  CalendarLayout,
  CustomersLayout,
  EmployeesLayout,
  CommissionLayout,
  LocationsLayout,
  WebsiteLayout,
  ReportsLayout,
  SettingsLayout,
  RelationshipsLayout,
} from "./components/layouts/index.js";

// Map page IDs to their layout components
// Note: Appointments, Records, and Payment are now tabs inside CustomersLayout
const PAGE_LAYOUTS = {
  overview: OverviewLayout,
  calendar: CalendarLayout,
  customers: CustomersLayout,
  employees: EmployeesLayout,
  commission: CommissionLayout,
  locations: LocationsLayout,
  website: WebsiteLayout,
  reports: ReportsLayout,
  settings: SettingsLayout,
  relationships: RelationshipsLayout,
};

export default function App() {
  const [taskStates, setTaskStates] = useState(() => {
    const map = {};
    PAGES.forEach((page) =>
      page.tasks.forEach((t) => {
        map[t.id] = "planning";
      })
    );
    return map;
  });
  const [activePage, setActivePage] = useState("overview");
  const [viewMode, setViewMode] = useState("modules");
  const [expandedId, setExpandedId] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const draggedId = useRef(null);

  const currentPage = PAGES.find((p) => p.id === activePage);
  const currentTasks = currentPage
    ? currentPage.tasks.map((t) => ({ ...t, status: taskStates[t.id] || "planning" }))
    : [];

  const onDragStart = useCallback((e, id) => {
    draggedId.current = id;
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const onDrop = useCallback((e, targetStatus) => {
    e.preventDefault();
    if (!draggedId.current) return;
    setTaskStates((prev) => ({ ...prev, [draggedId.current]: targetStatus }));
    draggedId.current = null;
  }, []);

  const moveTask = useCallback((id, direction) => {
    const colOrder = COLUMNS.map((c) => c.id);
    setTaskStates((prev) => {
      const current = prev[id] || "planning";
      const idx = colOrder.indexOf(current);
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= colOrder.length) return prev;
      return { ...prev, [id]: colOrder[newIdx] };
    });
  }, []);

  const allTaskIds = PAGES.flatMap((p) => p.tasks.map((t) => t.id));
  const totalTasks = allTaskIds.length;
  const completedTasks = allTaskIds.filter((id) => taskStates[id] === "complete").length;
  const buildingTasks = allTaskIds.filter((id) => taskStates[id] === "building").length;
  const planningTasks = totalTasks - completedTasks - buildingTasks;
  const globalProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const pageStats = (pageId) => {
    const page = PAGES.find((p) => p.id === pageId);
    if (!page) return { total: 0, complete: 0 };
    const ids = page.tasks.map((t) => t.id);
    return {
      total: ids.length,
      complete: ids.filter((id) => taskStates[id] === "complete").length,
    };
  };

  const topPages = PAGES.filter((p) => !p.parent);
  const LayoutComponent = PAGE_LAYOUTS[activePage];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* ─── SIDEBAR ─── */}
      <div
        className={`${
          sidebarCollapsed ? "w-16" : "w-64"
        } bg-white border-r border-gray-200 flex flex-col transition-all duration-300 flex-shrink-0`}
      >
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          {!sidebarCollapsed && (
            <h1 className="text-lg font-bold text-gray-800">🦷 Tam Dentist</h1>
          )}
          {sidebarCollapsed && <span className="text-lg mx-auto">🦷</span>}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 text-sm ${
              sidebarCollapsed ? "mx-auto mt-1" : ""
            }`}
          >
            {sidebarCollapsed ? "»" : "«"}
          </button>
        </div>
        {!sidebarCollapsed && (
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-400 font-medium">Overall Progress</span>
              <span className="text-xs font-bold text-emerald-600">{globalProgress}%</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${globalProgress}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span>📋 {planningTasks}</span>
              <span>🔨 {buildingTasks}</span>
              <span>✅ {completedTasks}</span>
            </div>
          </div>
        )}
        <nav className="flex-1 overflow-y-auto py-2">
          {topPages.map((page) => {
            const children = PAGES.filter((p) => p.parent === page.id);
            const stats = pageStats(page.id);
            const isActive = activePage === page.id;
            const hasActiveChild = children.some((c) => c.id === activePage);
            return (
              <div key={page.id}>
                <button
                  onClick={() => setActivePage(page.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all ${
                    isActive
                      ? "bg-blue-50 text-blue-700 border-r-2 border-blue-600"
                      : hasActiveChild
                      ? "bg-gray-50 text-gray-700"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="text-base flex-shrink-0">{page.icon}</span>
                  {!sidebarCollapsed && (
                    <>
                      <span className="text-sm font-medium flex-1">{page.label}</span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full ${
                          stats.complete === stats.total && stats.total > 0
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {stats.complete}/{stats.total}
                      </span>
                    </>
                  )}
                </button>
                {!sidebarCollapsed && children.length > 0 && (
                  <div className="ml-4 border-l border-gray-100">
                    {children.map((child) => {
                      const cStats = pageStats(child.id);
                      const cActive = activePage === child.id;
                      return (
                        <button
                          key={child.id}
                          onClick={() => setActivePage(child.id)}
                          className={`w-full flex items-center gap-3 pl-5 pr-4 py-2 text-left transition-all ${
                            cActive
                              ? "bg-blue-50 text-blue-700 border-r-2 border-blue-600"
                              : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                          }`}
                        >
                          <span className="text-sm flex-shrink-0">{child.icon}</span>
                          <span className="text-sm flex-1">{child.label}</span>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded-full ${
                              cStats.complete === cStats.total && cStats.total > 0
                                ? "bg-emerald-100 text-emerald-600"
                                : "bg-gray-100 text-gray-400"
                            }`}
                          >
                            {cStats.complete}/{cStats.total}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        {!sidebarCollapsed && (
          <div className="p-4 border-t border-gray-100 text-xs text-gray-400 text-center">
            {totalTasks} total modules
          </div>
        )}
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{currentPage?.icon}</span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-gray-800">{currentPage?.label}</h1>
                  {currentPage?.parent && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {PAGES.find((p) => p.id === currentPage.parent)?.label}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode("modules")}
                  className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                    viewMode === "modules"
                      ? "bg-white text-gray-800 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  📋 Modules
                </button>
                <button
                  onClick={() => setViewMode("layout")}
                  className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                    viewMode === "layout"
                      ? "bg-white text-gray-800 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  🖼️ Layout
                </button>
              </div>
              {viewMode === "modules" &&
                (() => {
                  const ps = pageStats(activePage);
                  const pct = ps.total > 0 ? Math.round((ps.complete / ps.total) * 100) : 0;
                  return (
                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-2">
                      <span className="text-sm text-gray-500">
                        {ps.complete} of {ps.total}
                      </span>
                      <div className="w-28 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-bold text-blue-600">{pct}%</span>
                    </div>
                  );
                })()}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6">
          {viewMode === "modules" ? (
            <div className="flex gap-5 h-full">
              {COLUMNS.map((col, idx) => (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  tasks={currentTasks.filter((t) => t.status === col.id)}
                  onDragStart={onDragStart}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onMoveLeft={(id) => moveTask(id, -1)}
                  onMoveRight={(id) => moveTask(id, 1)}
                  colIndex={idx}
                  totalCols={COLUMNS.length}
                  expandedId={expandedId}
                  onExpand={(id) => setExpandedId(expandedId === id ? null : id)}
                />
              ))}
            </div>
          ) : (
            <div className="max-w-6xl mx-auto">
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center gap-2">
                <span className="text-blue-500 text-sm">🖼️</span>
                <span className="text-xs text-blue-700">
                  Layout Preview — This is the wireframe scaffold of how the{" "}
                  <strong>{currentPage?.label}</strong> page will look when built.
                </span>
              </div>
              {LayoutComponent ? (
                <LayoutComponent />
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
                  <p className="text-gray-400">Layout wireframe coming soon for this page.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
