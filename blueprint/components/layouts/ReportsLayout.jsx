import { WireframeBox } from '../ui';

export function ReportsLayout() {
    return (
        <div className="space-y-4">
            <WireframeBox label="(P) Reports — Placeholder Page" dashed>
                <div className="space-y-4 mt-2">
                    <WireframeBox label="(P) Revenue Summary" dashed>
                        <div className="text-xs text-gray-400 mt-1">Total revenue by location, service type, and date range. Compare periods.</div>
                    </WireframeBox>
                    <WireframeBox label="(P) Appointment Analytics" dashed>
                        <div className="text-xs text-gray-400 mt-1">Appointment volume, no-show rate, peak hours, average duration by service.</div>
                    </WireframeBox>
                    <WireframeBox label="(P) Employee Performance" dashed>
                        <div className="text-xs text-gray-400 mt-1">Services completed, revenue generated, customer satisfaction per employee.</div>
                    </WireframeBox>
                    <WireframeBox label="(P) Customer Insights" dashed>
                        <div className="text-xs text-gray-400 mt-1">New vs returning customers, lifetime value, top services by customer segment.</div>
                    </WireframeBox>
                </div>
            </WireframeBox>
        </div>
    );
}
