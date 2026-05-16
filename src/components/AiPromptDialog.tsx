import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Loader2, AlertCircle, Wand2 } from 'lucide-react';
import { generateDiagram } from '../server-fns/gemini';
import type { Element } from '../types';

interface AiPromptDialogProps {
  onGenerate: (elements: Element[]) => void;
  onClose: () => void;
  hasExistingElements: boolean;
}

const EXAMPLE_PROMPTS = [
  'Software product line with UI Framework (mandatory) having React, Vue, Angular variants and Database (mandatory) with PostgreSQL and MongoDB',
  'Smart home system with Lighting (mandatory, LED/Halogen variants), Security (optional, Camera/Alarm), where Camera requires LED',
];

export function AiPromptDialog({ onGenerate, onClose, hasExistingElements }: AiPromptDialogProps) {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await generateDiagram({ data: { prompt: prompt.trim() } });
      onGenerate(result.elements);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleExampleClick = (example: string) => {
    setPrompt(example);
    setError(null);
    textareaRef.current?.focus();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[6px]" />

      {/* Dialog */}
      <div
        className="relative z-50 w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: 'aiDialogIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            boxShadow:
              '0 24px 80px rgba(0, 0, 0, 0.14), 0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '20px 24px 16px',
              borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #6965db 0%, #a855f7 50%, #ec4899 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(105, 101, 219, 0.3)',
                }}
              >
                <Sparkles size={18} color="#ffffff" />
              </div>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 700,
                    fontFamily: 'Inter, sans-serif',
                    background: 'linear-gradient(135deg, #6965db, #a855f7)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    lineHeight: 1.2,
                  }}
                >
                  AI Diagram Generator
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: '#868e96',
                    fontWeight: 500,
                    fontFamily: 'Inter, sans-serif',
                    lineHeight: 1.3,
                  }}
                >
                  Describe your OVM diagram in natural language
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: 'none',
                backgroundColor: 'transparent',
                color: '#868e96',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f1f3f5';
                e.currentTarget.style.color = '#495057';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#868e96';
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '16px 24px 20px' }}>
            {/* Warning if existing elements */}
            {hasExistingElements && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 8,
                  backgroundColor: 'rgba(251, 191, 36, 0.08)',
                  border: '1px solid rgba(251, 191, 36, 0.2)',
                  marginBottom: 12,
                  fontSize: 12,
                  fontWeight: 500,
                  fontFamily: 'Inter, sans-serif',
                  color: '#b45309',
                }}
              >
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                <span>This will replace the current diagram on the canvas.</span>
              </div>
            )}

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                setError(null);
              }}
              placeholder='e.g. "A car variability model with Engine Type as mandatory VP connected to Diesel and Petrol variants..."'
              rows={4}
              maxLength={2000}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px 14px',
                fontSize: 14,
                fontWeight: 500,
                fontFamily: 'Inter, sans-serif',
                border: '2px solid #e9ecef',
                borderRadius: 10,
                outline: 'none',
                transition: 'border-color 150ms ease, box-shadow 150ms ease',
                color: '#1e1e2e',
                backgroundColor: '#f8f9fa',
                resize: 'vertical',
                minHeight: 100,
                lineHeight: 1.5,
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#6965db';
                e.target.style.boxShadow = '0 0 0 3px rgba(105, 101, 219, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e9ecef';
                e.target.style.boxShadow = 'none';
              }}
            />

            {/* Character count */}
            <div
              style={{
                textAlign: 'right',
                fontSize: 11,
                color: prompt.length > 1800 ? '#e03131' : '#adb5bd',
                fontWeight: 500,
                fontFamily: 'Inter, sans-serif',
                marginTop: 4,
              }}
            >
              {prompt.length}/2000
            </div>

            {/* Example Prompts */}
            <div style={{ marginTop: 12 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: 'Inter, sans-serif',
                  color: '#868e96',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 8,
                }}
              >
                Try an example
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {EXAMPLE_PROMPTS.map((example, i) => (
                  <button
                    key={i}
                    onClick={() => handleExampleClick(example)}
                    disabled={isLoading}
                    style={{
                      padding: '8px 12px',
                      fontSize: 12,
                      fontWeight: 500,
                      fontFamily: 'Inter, sans-serif',
                      color: '#495057',
                      backgroundColor: '#f8f9fa',
                      border: '1px solid #e9ecef',
                      borderRadius: 8,
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                      lineHeight: 1.4,
                      transition: 'all 150ms ease',
                      opacity: isLoading ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoading) {
                        e.currentTarget.style.backgroundColor = '#f1f3f5';
                        e.currentTarget.style.borderColor = '#6965db';
                        e.currentTarget.style.color = '#6965db';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8f9fa';
                      e.currentTarget.style.borderColor = '#e9ecef';
                      e.currentTarget.style.color = '#495057';
                    }}
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            {/* Error display */}
            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: '10px 12px',
                  borderRadius: 8,
                  backgroundColor: 'rgba(224, 49, 49, 0.06)',
                  border: '1px solid rgba(224, 49, 49, 0.15)',
                  marginTop: 12,
                  fontSize: 13,
                  fontWeight: 500,
                  fontFamily: 'Inter, sans-serif',
                  color: '#c92a2a',
                  lineHeight: 1.4,
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '12px 24px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: '#adb5bd',
                fontWeight: 500,
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'}+Enter to generate
            </span>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                style={{
                  padding: '8px 18px',
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: 'Inter, sans-serif',
                  color: '#868e96',
                  backgroundColor: 'transparent',
                  border: '1px solid #dee2e6',
                  borderRadius: 8,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'background-color 150ms ease',
                  opacity: isLoading ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) e.currentTarget.style.backgroundColor = '#f8f9fa';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!prompt.trim() || isLoading}
                style={{
                  padding: '8px 20px',
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: 'Inter, sans-serif',
                  color: '#ffffff',
                  background:
                    prompt.trim() && !isLoading
                      ? 'linear-gradient(135deg, #6965db 0%, #a855f7 100%)'
                      : '#c5c5e0',
                  border: 'none',
                  borderRadius: 8,
                  cursor: prompt.trim() && !isLoading ? 'pointer' : 'not-allowed',
                  transition: 'all 150ms ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow:
                    prompt.trim() && !isLoading ? '0 2px 8px rgba(105, 101, 219, 0.3)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (prompt.trim() && !isLoading) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(105, 101, 219, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  if (prompt.trim() && !isLoading) {
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(105, 101, 219, 0.3)';
                  }
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Wand2 size={14} />
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes aiDialogIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
