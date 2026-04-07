export function WireframeRow({ children, className = "" }) {
    return <div className={`flex gap-3 ${className}`}>{children}</div>;
}
