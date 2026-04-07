import { WireframeBox, WireframeRow, WireframeButton } from '../ui';

export function CalendarLayout() {
    const appointments = [
        { time: "08:00", col: 0, name: "NOTE", doctor: "Dr. 32", phone: "0972020908", hours: "08:00 - 09:00", note: "DR 32 OFF C", status: "Scheduled", bg: "bg-blue-50 border-blue-200", textColor: "text-blue-600" },
        { time: "09:00", col: 0, name: "Sarah Johnson", doctor: "Dr. 32", phone: "0354254971", hours: "09:00 - 09:30", note: "Extract molar 1,4 - root canal", status: "Scheduled", bg: "bg-orange-50 border-orange-200", textColor: "text-orange-600" },
        { time: "09:00", col: 1, name: "Emily Chen", doctor: "Dr. 29", phone: "0357922070", hours: "09:00 - 09:15", note: "Joint elevation", status: "Scheduled", bg: "bg-purple-50 border-purple-200", textColor: "text-purple-600" },
        { time: "09:00", col: 2, name: "Michael Nguyen", doctor: "Dr. 29", phone: "0703661956", hours: "09:00 - 09:15", note: "Implant follow-up", status: "Scheduled", bg: "bg-pink-50 border-pink-200", textColor: "text-pink-600" },
        { time: "09:00", col: 3, name: "David Phong +26", doctor: "Dr. 29", phone: "0388010297", hours: "09:00 - 10:00", note: "Crown fitting - THAO", status: "Scheduled", bg: "bg-yellow-50 border-yellow-200", textColor: "text-yellow-700" },
        { time: "09:00b", col: 0, name: "Lisa Quynh", doctor: "---", phone: "0385446171", hours: "09:00 - 10:00", note: "Braces consultation", status: "Scheduled", bg: "bg-orange-50 border-orange-200", textColor: "text-orange-600" },
        { time: "09:00b", col: 1, name: "James Trong", doctor: "---", phone: "0817969858", hours: "09:00 - 10:00", note: "Braces consultation (with Lisa)", status: "Scheduled", bg: "bg-purple-50 border-purple-200", textColor: "text-purple-600" },
        { time: "09:00b", col: 2, name: "Anna Diep +26", doctor: "---", phone: "0787909480", hours: "09:00 - 09:10", note: "Checkup - QUYEN", status: "Scheduled", bg: "bg-pink-50 border-pink-200", textColor: "text-pink-600" },
        { time: "09:00b", col: 3, name: "Maria Lan - Mgr", doctor: "Dr. 15", phone: "0337786396", hours: "09:00 - 09:15", note: "Suture removal IMP", status: "Scheduled", bg: "bg-green-50 border-green-200", textColor: "text-green-700" },
    ];
    const timeSlots = ["06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

    const renderCard = (apt) => (
        <div key={apt.name} className={`rounded-lg border p-3 ${apt.bg} flex-1 min-w-0`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium bg-blue-500 text-white px-2 py-0.5 rounded">{apt.status}</span>
                <div className="flex gap-1.5">
                    <span className="text-gray-400 text-xs cursor-pointer hover:text-gray-600">✏️</span>
                    <span className="text-gray-400 text-xs cursor-pointer hover:text-gray-600">👤</span>
                </div>
            </div>
            <div className={`text-sm font-semibold ${apt.textColor} mb-1.5`}>{apt.name}</div>
            <div className="space-y-1 text-xs text-gray-600">
                <div className="flex items-center gap-1.5"><span className="text-gray-400">👨‍⚕️</span>{apt.doctor}</div>
                <div className="flex items-center gap-1.5"><span className="text-gray-400">📞</span>{apt.phone}</div>
                <div className="flex items-center gap-1.5"><span className="text-gray-400">🕐</span>{apt.hours}</div>
                <div className="flex items-center gap-1.5"><span className="text-gray-400">📋</span>{apt.note}</div>
            </div>
        </div>
    );

    return (
        <div className="space-y-0">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800">Appointments</h2>
                <div className="flex items-center gap-2">
                    <WireframeButton label="+ Add New" primary />
                    <WireframeButton label="Export Excel" />
                    <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                        <button className="px-3 py-1.5 bg-blue-500 text-white text-xs">Grid</button>
                        <button className="px-3 py-1.5 bg-white text-gray-500 text-xs border-l border-gray-200">List</button>
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-between mb-4 bg-white rounded-lg border border-gray-200 p-3">
                <div className="flex items-center gap-1">
                    <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                        <button className="px-4 py-1.5 text-xs font-medium text-blue-600 bg-white border-b-2 border-blue-500">Day</button>
                        <button className="px-4 py-1.5 text-xs font-medium text-gray-500 bg-white border-l border-gray-200">Week</button>
                        <button className="px-4 py-1.5 text-xs font-medium text-gray-500 bg-white border-l border-gray-200">Month</button>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs hover:bg-gray-200">‹</button>
                    <span className="text-sm font-bold text-gray-700 min-w-[200px] text-center">Tuesday - 04/07/2026</span>
                    <button className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs hover:bg-gray-200">›</button>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-9 w-72 bg-gray-100 rounded-lg border border-gray-200 flex items-center px-3">
                        <span className="text-gray-400 text-xs">🔍 Search by name, phone, doctor...</span>
                    </div>
                    <div className="flex gap-1">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs">👤</div>
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs text-white">🕐</div>
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs relative">
                            🛒
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center">0</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs">🗑️</div>
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {timeSlots.map((time) => {
                    const hour = parseInt(time);
                    const slot8Cards = appointments.filter(a => a.time === "08:00");
                    const slot9Row1 = appointments.filter(a => a.time === "09:00");
                    const slot9Row2 = appointments.filter(a => a.time === "09:00b");
                    return (
                        <div key={time} className="flex border-b border-gray-100">
                            <div className={`w-14 flex-shrink-0 py-3 text-right pr-3 text-xs font-medium ${hour === 8 || hour === 9 ? "text-blue-600" : "text-gray-400"} border-r border-gray-100`}>
                                {time}
                            </div>
                            <div className="flex-1 p-2 min-h-[60px]">
                                {hour === 8 && (
                                    <div className="flex gap-2">
                                        {slot8Cards.map(renderCard)}
                                        <div className="flex-1" /><div className="flex-1" /><div className="flex-1" />
                                    </div>
                                )}
                                {hour === 9 && (
                                    <div className="space-y-2">
                                        <div className="flex gap-2">{slot9Row1.map(renderCard)}</div>
                                        <div className="flex gap-2">{slot9Row2.map(renderCard)}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
