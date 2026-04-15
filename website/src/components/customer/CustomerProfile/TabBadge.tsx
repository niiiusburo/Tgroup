export function TabBadge({ count, isActive }: { count: number; isActive: boolean }) {
  if (count === 0) {
    return (
      <span className={`ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold rounded-full transition-colors ${
        isActive 
          ? 'bg-primary/20 text-primary' 
          : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
      }`}>
        0
      </span>
    );
  }
  
  return (
    <span className={`ml-1.5 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-bold rounded-full transition-colors ${
      isActive 
        ? 'bg-primary text-white shadow-sm' 
        : 'bg-primary/10 text-primary group-hover:bg-primary/20'
    }`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}
