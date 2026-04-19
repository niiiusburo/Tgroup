export function inputClass(hasError: boolean, disabled = false) {
  return [
    'w-full px-4 py-3 bg-white border rounded-xl text-sm transition-all',
    'focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary',
    hasError ? 'border-red-300' : 'border-gray-200',
    disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'hover:border-gray-300',
  ].join(' ');
}

export function selectClass(disabled = false) {
  return [
    'w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm',
    'focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary',
    'transition-all appearance-none',
    disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'hover:border-gray-300',
  ].join(' ');
}
