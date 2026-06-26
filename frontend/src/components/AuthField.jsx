import { authColors } from '../config/authTheme';
import { uiConfig } from '../config/uiConfig';

export default function AuthField({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  className = '',
}) {
  return (
    <label className={`block ${className}`}>
      <span
        className="mb-2 block text-sm"
        style={{ color: authColors.gray }}
      >
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-3 text-sm outline-none transition-all duration-200 focus:ring-2"
        style={{
          height: uiConfig.inputHeight,
          borderRadius: uiConfig.radius,
          backgroundColor: authColors.input,
          border: `1px solid ${authColors.border}`,
          color: authColors.text,
          boxShadow: 'none',
        }}
        onFocus={(event) => {
          event.target.style.borderColor = authColors.green;
          event.target.style.boxShadow = `0 0 0 2px rgba(24, 201, 110, 0.15)`;
        }}
        onBlur={(event) => {
          event.target.style.borderColor = authColors.border;
          event.target.style.boxShadow = 'none';
        }}
      />
    </label>
  );
}
