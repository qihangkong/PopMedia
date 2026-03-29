import { useState, useRef, useCallback } from 'react'
import { useClickOutside } from '../hooks/useClickOutside'

interface ModelOption {
  value: string
  label: string
}

interface ModelSelectProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

const MODEL_OPTIONS: ModelOption[] = [
  { value: 'default', label: '默认' },
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-3.5', label: 'GPT-3.5' },
  { value: 'claude', label: 'Claude' },
]

export function ModelSelect({ value, onChange, disabled }: ModelSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const selectedOption = MODEL_OPTIONS.find(opt => opt.value === value) || MODEL_OPTIONS[0]

  const handleClose = useCallback(() => setIsOpen(false), [])
  useClickOutside(wrapperRef, handleClose, isOpen)

  const handleSelect = (optValue: string) => {
    onChange(optValue)
    setIsOpen(false)
  }

  return (
    <div
      ref={wrapperRef}
      className={`model-select-custom ${disabled ? 'disabled' : ''}`}
    >
      <button
        type="button"
        className="model-select-trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span>{selectedOption.label}</span>
        <svg
          className={`model-select-arrow ${isOpen ? 'open' : ''}`}
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
        >
          <path
            d="M1 1L5 5L9 1"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="model-select-dropdown">
          {MODEL_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`model-select-option ${opt.value === value ? 'selected' : ''}`}
              onClick={() => handleSelect(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
