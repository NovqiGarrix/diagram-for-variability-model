import React, { useState, useRef, useEffect } from 'react';
import type { ElementType } from '../types';

const TYPE_LABELS: Record<string, string> = {
  'mandatory-vp': 'Mandatory VP',
  'optional-vp': 'Optional VP',
  'variant': 'Variant',
};

interface NamingDialogProps {
  elementType: ElementType;
  position: { x: number; y: number };
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export function NamingDialog({ elementType, position, onConfirm, onCancel }: NamingDialogProps) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus the input when dialog appears
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) {
      onConfirm(trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  const typeLabel = TYPE_LABELS[elementType] || elementType;

  return (
    <div
      className="fixed inset-0 z-50"
      onClick={onCancel}
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />

      {/* Dialog */}
      <div
        className="absolute z-50"
        style={{
          left: Math.min(position.x, window.innerWidth - 320),
          top: Math.min(position.y - 40, window.innerHeight - 160),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <form
          onSubmit={handleSubmit}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05)',
            padding: '16px 20px',
            minWidth: 280,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#868e96',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 8,
            }}
          >
            Name this {typeLabel}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`e.g. "Engine Type"`}
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: 14,
              fontWeight: 500,
              fontFamily: 'Inter, sans-serif',
              border: '2px solid #e9ecef',
              borderRadius: 8,
              outline: 'none',
              transition: 'border-color 150ms ease',
              color: '#1e1e2e',
              backgroundColor: '#f8f9fa',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#6965db')}
            onBlur={(e) => (e.target.style.borderColor = '#e9ecef')}
          />

          <div
            style={{
              display: 'flex',
              gap: 8,
              marginTop: 12,
              justifyContent: 'flex-end',
            }}
          >
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '7px 16px',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'Inter, sans-serif',
                color: '#868e96',
                backgroundColor: 'transparent',
                border: '1px solid #dee2e6',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'background-color 150ms ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8f9fa')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              style={{
                padding: '7px 16px',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'Inter, sans-serif',
                color: '#ffffff',
                backgroundColor: name.trim() ? '#6965db' : '#c5c5e0',
                border: 'none',
                borderRadius: 8,
                cursor: name.trim() ? 'pointer' : 'not-allowed',
                transition: 'background-color 150ms ease',
              }}
              onMouseEnter={(e) => {
                if (name.trim()) e.currentTarget.style.backgroundColor = '#5b57c9';
              }}
              onMouseLeave={(e) => {
                if (name.trim()) e.currentTarget.style.backgroundColor = '#6965db';
              }}
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
