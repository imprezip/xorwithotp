interface FormatSelectProps<T extends string> {
  id: string
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  disabled?: boolean
  hint?: string
}

/** Small select used to pick how a value is represented, never how it is computed. */
export function FormatSelect<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
  disabled = false,
  hint,
}: FormatSelectProps<T>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="label">
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as T)}
        className="field cursor-pointer appearance-none bg-[length:0.7rem] bg-[right_0.7rem_center] bg-no-repeat pr-8 disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8' fill='none' stroke='%238b9ab4' stroke-width='1.6'%3E%3Cpath d='M1 1.5 6 6.5 11 1.5'/%3E%3C/svg%3E\")",
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? <p className="text-[11px] leading-relaxed text-faint">{hint}</p> : null}
    </div>
  )
}
