export default function Input({ label, type = 'text', value, onChange, placeholder }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-600 mb-1 ml-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:border-orange-400 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
      />
    </div>
  );
}
