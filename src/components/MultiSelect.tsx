import React, { useState, useRef, useEffect } from 'react';

interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selectedValues: string[];
  onSelectionChange: (selectedValues: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  selectedValues,
  onSelectionChange,
  placeholder = "Select options...",
  disabled = false,
  loading = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.label && typeof option.label === 'string' && 
    option.value && typeof option.value === 'string' &&
    (option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.value.toLowerCase().includes(searchTerm.toLowerCase()))
  );



  // Handle individual option selection
  const handleOptionToggle = (value: string) => {
    const newSelectedValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    onSelectionChange(newSelectedValues);
  };

  // Handle select all/none
  const handleSelectAll = () => {
    if (selectedValues.length === filteredOptions.length) {
      // Deselect all filtered options
      const newSelectedValues = selectedValues.filter(value =>
        !filteredOptions.some(option => option.value === value)
      );
      onSelectionChange(newSelectedValues);
    } else {
      // Select all filtered options
      const newSelectedValues = [...selectedValues];
      filteredOptions.forEach(option => {
        if (!newSelectedValues.includes(option.value)) {
          newSelectedValues.push(option.value);
        }
      });
      onSelectionChange(newSelectedValues);
    }
  };

  // Get display text for selected values
  const getDisplayText = () => {
    if (selectedValues.length === 0) return placeholder;
    if (selectedValues.length === 1) {
      const option = options.find(opt => opt.value === selectedValues[0]);
      return option ? option.label : selectedValues[0];
    }
    return `${selectedValues.length} items selected`;
  };

  // Check if all filtered options are selected
  const areAllFilteredSelected = filteredOptions.length > 0 && 
    filteredOptions.every(option => selectedValues.includes(option.value));

  return (
    <div className="multi-select-container" ref={dropdownRef}>
      <div 
        className={`multi-select-trigger ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
      >
        <span className="multi-select-text">{getDisplayText()}</span>
        <i className={`ri-arrow-down-s-line ${isOpen ? 'rotated' : ''}`}></i>
        {loading && <i className="ri-loader-4-line spinning"></i>}
      </div>
      
      {isOpen && (
        <div className="multi-select-dropdown">
          {/* Search Box */}
          <div className="multi-select-search">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-control"
              autoFocus
            />
          </div>
          
          {/* Options List */}
          <div className="multi-select-options">
            {filteredOptions.length === 0 ? (
              <div className="no-options">No options found</div>
            ) : (
              <>
                {/* Select All Option */}
                <div className="multi-select-option select-all">
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      checked={areAllFilteredSelected}
                      onChange={handleSelectAll}
                    />
                    <span className="checkmark"></span>
                    <span className="option-label">
                      {areAllFilteredSelected ? 'Deselect All' : 'Select All'}
                    </span>
                  </label>
                </div>
                
                {/* Individual Options */}
                {filteredOptions.map((option) => (
                  <div key={option.value} className="multi-select-option">
                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        checked={selectedValues.includes(option.value)}
                        onChange={() => handleOptionToggle(option.value)}
                      />
                      <span className="checkmark"></span>
                      <span className="option-label">{option.label}</span>
                    </label>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelect; 