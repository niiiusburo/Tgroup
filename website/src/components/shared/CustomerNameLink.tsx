import { useNavigate } from 'react-router-dom';

interface CustomerNameLinkProps {
  readonly customerId?: string | null;
  readonly children: React.ReactNode;
  readonly className?: string;
}

export function CustomerNameLink({ customerId, children, className }: CustomerNameLinkProps) {
  const navigate = useNavigate();
  if (!customerId) {
    return <span className={className}>{children}</span>;
  }
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/customers/${customerId}`);
  };
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); navigate(`/customers/${customerId}`); } }}
      className={`cursor-pointer hover:underline hover:text-blue-600 ${className ?? ''}`}
    >
      {children}
    </span>
  );
}
