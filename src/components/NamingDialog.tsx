import React, { useState, useRef, useEffect } from 'react';
import type { ElementType } from '../types';

const TYPE_LABELS: Record<string, string> = {
  'mandatory-vp': 'Mandatory VP',
  'optional-vp': 'Optional VP',
  'variant': 'Variant',
  'alternative-arc': 'Alternative Line',
};

interface NamingDialogProps {
  elementType: ElementType;
  position: { x: number; y: number };
  initialName?: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export function NamingDialog({ elementType, position, initialName = '', onConfirm, onCancel }: NamingDialogProps) {
  const [name, setName] = useState(initialName);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Auto-focus the input and place cursor at the end
    requestAnimationFrame(() => {
      const textarea = inputRef.current;
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      }
    });
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) {
      onConfirm(trimmed);
    } else if (initialName) {
      // If editing existing and cleared, maybe just clear the label
      onConfirm('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const typeLabel = TYPE_LABELS[elementType] || elementType;
  const isArc = elementType === 'alternative-arc';
  const isEditing = !!initialName;

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
          top: Math.min(position.y - 60, window.innerHeight - 200),
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
            {isEditing ? `Edit ${typeLabel}` : (isArc ? 'Set Cardinality (min..max)' : `Name this ${typeLabel}`)}
          </div>

          <textarea
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isArc ? 'e.g. "1..*"' : `e.g. "Engine Type"`}
            rows={3}
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
              resize: 'none',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#6965db')}
            onBlur={(e) => (e.target.style.borderColor = '#e9ecef')}
          />
          <div
            style={{
              fontSize: 11,
              color: '#adb5bd',
              marginTop: 4,
              textAlign: 'right'
            }}
          >
            Press Ctrl+Enter to save
          </div>

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
              disabled={!name.trim() && !isEditing}
              style={{
                padding: '7px 16px',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'Inter, sans-serif',
                color: '#ffffff',
                backgroundColor: (name.trim() || isEditing) ? '#6965db' : '#c5c5e0',
                border: 'none',
                borderRadius: 8,
                cursor: (name.trim() || isEditing) ? 'pointer' : 'not-allowed',
                transition: 'background-color 150ms ease',
              }}
              onMouseEnter={(e) => {
                if (name.trim() || isEditing) e.currentTarget.style.backgroundColor = '#5b57c9';
              }}
              onMouseLeave={(e) => {
                if (name.trim() || isEditing) e.currentTarget.style.backgroundColor = '#6965db';
              }}
            >
              {isEditing ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
