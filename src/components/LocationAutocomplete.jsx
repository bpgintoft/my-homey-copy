import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";

export default function LocationAutocomplete({ value, onChange, placeholder = "Event location" }) {
  const [inputValue, setInputValue] = useState(value || '');

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  const handleInput = (e) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val);
  };

  return (
    <Input
      value={inputValue}
      onChange={handleInput}
      placeholder={placeholder}
    />
  );
}