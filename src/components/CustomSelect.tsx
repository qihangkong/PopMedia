import { useState, useRef, useEffect } from 'react'

interface Option {
  value: string
  label: string
  description?: string
  isCoding?: boolean
}

interface CustomSelectProps {
  value: string
  options: Option[]
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
}

export default function CustomSelect({
  value,
  options,
  onChange,
  disabled = false,
  placeholder = '请选择...'
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(opt => opt.value === value)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const handleSelect = (optValue: string) => {
    onChange(optValue)
    setIsOpen(false)
  }

  return (
    <div className="custom-select-wrapper" ref={wrapperRef}>
      <button
        type="button"
        className={`custom-select-trigger ${disabled ? 'disabled' : ''} ${isOpen ? 'open' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className="custom-select-value">
          {selectedOption ? (
            <span className="custom-select-label">{selectedOption.label}</span>
          ) : (
            <span className="custom-select-placeholder">{placeholder}</span>
          )}
        </span>
        <svg
          className={`custom-select-arrow ${isOpen ? 'rotated' : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {isOpen && (
        <div className="custom-select-dropdown">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`custom-select-option ${opt.value === value ? 'selected' : ''}`}
              onClick={() => handleSelect(opt.value)}
            >
              <span className="custom-select-option-label">{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
