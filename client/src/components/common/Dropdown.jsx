import { useState, useRef, useEffect } from 'react';

export default function Dropdown({ trigger, children, align = 'right', direction = 'down' }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const alignmentClasses = {
    left: 'left-0',
    right: 'right-0',
  };
  const directionClasses = {
    down: 'mt-2',
    up: 'mb-2 bottom-full',
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>

      {isOpen && (
        <div
          className={`
            absolute z-50 w-48 rounded-lg
            bg-white shadow-lg border border-gray-200
            py-1 ${alignmentClasses[align]} ${directionClasses[direction]}
          `}
        >
          {typeof children === 'function'
            ? children({ close: () => setIsOpen(false) })
            : children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({ onClick, children, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full px-4 py-2 text-left text-sm
        transition-colors duration-150
        ${
          danger
            ? 'text-red-600 hover:bg-red-50'
            : 'text-gray-700 hover:bg-gray-100'
        }
      `}
    >
      {children}
    </button>
  );
}
