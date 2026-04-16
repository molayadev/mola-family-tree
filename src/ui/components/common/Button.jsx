export default function Button({ children, onClick, variant = 'primary', disabled = false, className = '' }) {
  const baseStyle = 'px-6 py-3 rounded-full font-semibold transition-all duration-200 transform active:scale-95 flex items-center justify-center gap-2';
  const variants = {
    primary: 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg hover:shadow-orange-500/30',
    secondary: 'bg-white text-gray-700 border-2 border-gray-200 hover:border-orange-300 hover:bg-orange-50',
    outline: 'border-2 border-white text-white hover:bg-white/10',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100',
    ghost: 'bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700 border border-transparent hover:border-gray-200',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''} ${className}`}
    >
      {children}
    </button>
  );
}
