import { WireframeBox } from '../ui';

export function CommissionLayout() {
    return (
        <div className="space-y-4">
            <WireframeBox label="(P) Commission — Placeholder Page" dashed>
                <div className="space-y-4 mt-2">
                    <WireframeBox label="(P) Commission Structure Setup" dashed>
                        <div className="text-xs text-gray-400 mt-1">Define rates per role, per service type, or per employee. Flat fee vs percentage. Volume tiers.</div>
                    </WireframeBox>
                    <WireframeBox label="(P) Commission Tracking" dashed>
                        <div className="text-xs text-gray-400 mt-1">Auto-calculated per employee based on services and referrals. Earned vs paid.</div>
                    </WireframeBox>
                    <WireframeBox label="(P) Commission Payouts" dashed>
                        <div className="text-xs text-gray-400 mt-1">Payout date, method, amount. Running balance of owed commissions.</div>
                    </WireframeBox>
                    <WireframeBox label="(P) Commission Reports" dashed>
                        <div className="text-xs text-gray-400 mt-1">By employee, location, date range. Top earners. Exportable.</div>
                    </WireframeBox>
                </div>
            </WireframeBox>
        </div>
    );
}
