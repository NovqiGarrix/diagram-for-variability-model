import type { Tool } from '../types';
import { 
  MousePointer2, 
  Triangle, 
  RectangleHorizontal, 
  Minus, 
  MoreHorizontal, 
  CircleDot,
  ArrowRight,
  ArrowLeftRight,
  Trash2,
  Download,
  Sparkles,
} from 'lucide-react';
import React, { useState } from 'react';

interface ToolbarProps {
  currentTool: Tool;
  setCurrentTool: (tool: Tool) => void;
  onClear: () => void;
  onExport: () => void;
  onOpenAiDialog: () => void;
  elementCount: number;
}

interface ToolItem {
  id: Tool;
  icon: React.FC<{ size?: number; strokeWidth?: number }>;
  label: string;
  shortcut?: string;
}

const SHAPE_TOOLS: ToolItem[] = [
  { id: 'mandatory-vp', icon: Triangle, label: 'Mandatory VP', shortcut: '1' },
  { id: 'optional-vp', icon: Triangle, label: 'Optional VP', shortcut: '2' },
  { id: 'variant', icon: RectangleHorizontal, label: 'Variant', shortcut: '3' },
];

const LINE_TOOLS: ToolItem[] = [
  { id: 'mandatory-line', icon: Minus, label: 'Mandatory', shortcut: '4' },
  { id: 'optional-line', icon: MoreHorizontal, label: 'Optional', shortcut: '5' },
  { id: 'alternative-arc', icon: CircleDot, label: 'Alternative', shortcut: '6' },
  { id: 'requires-line', icon: ArrowRight, label: 'Requires', shortcut: '7' },
  { id: 'excludes-line', icon: ArrowLeftRight, label: 'Excludes', shortcut: '8' },
];

function ToolButton({ tool, isActive, onClick }: { tool: ToolItem; isActive: boolean; onClick: () => void }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const Icon = tool.icon;
  const isOptionalVP = tool.id === 'optional-vp';

  return (
    <div className="relative">
      <button
        title={tool.label}
        className="relative flex items-center justify-center rounded-lg transition-all duration-150 ease-out cursor-pointer"
        style={{
          width: 36,
          height: 36,
          backgroundColor: isActive ? 'var(--tool-active-bg)' : 'transparent',
          color: isActive ? 'var(--tool-active-text)' : 'var(--tool-text)',
          transform: isActive ? 'scale(1.05)' : 'scale(1)',
          boxShadow: isActive ? '0 2px 8px rgba(105, 101, 219, 0.3)' : 'none',
        }}
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <Icon size={18} strokeWidth={isOptionalVP ? 1 : 2} />
        {isOptionalVP && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ opacity: 0.5 }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                border: `1.5px dashed ${isActive ? 'var(--tool-active-text)' : 'var(--tool-text)'}`,
                borderRadius: 2,
              }}
            />
          </div>
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none z-50"
          style={{
            top: 'calc(100% + 8px)',
            backgroundColor: '#1e1e2e',
            color: '#ffffff',
            fontSize: 12,
            fontWeight: 500,
            padding: '5px 10px',
            borderRadius: 6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          {tool.label}
          {tool.shortcut && (
            <span style={{ opacity: 0.5, marginLeft: 6 }}>{tool.shortcut}</span>
          )}
        </div>
      )}
    </div>
  );
}

function Separator() {
  return (
    <div
      style={{
        width: 1,
        height: 24,
        backgroundColor: 'var(--separator-color)',
        margin: '0 4px',
        flexShrink: 0,
      }}
    />
  );
}

export function Toolbar({ currentTool, setCurrentTool, onClear, onExport, onOpenAiDialog, elementCount }: ToolbarProps) {
  return (
    <>
      {/* Main toolbar */}
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 z-20"
        style={{
          padding: '6px 8px',
          backgroundColor: 'var(--toolbar-bg)',
          borderRadius: 12,
          boxShadow: 'var(--toolbar-shadow)',
        }}
      >
        {/* Selection tool */}
        <ToolButton
          tool={{ id: 'selection', icon: MousePointer2, label: 'Select', shortcut: 'V' }}
          isActive={currentTool === 'selection'}
          onClick={() => setCurrentTool('selection')}
        />

        <Separator />

        {/* Shape tools */}
        {SHAPE_TOOLS.map((tool) => (
          <ToolButton
            key={tool.id}
            tool={tool}
            isActive={currentTool === tool.id}
            onClick={() => setCurrentTool(tool.id)}
          />
        ))}

        <Separator />

        {/* Line tools */}
        {LINE_TOOLS.map((tool) => (
          <ToolButton
            key={tool.id}
            tool={tool}
            isActive={currentTool === tool.id}
            onClick={() => setCurrentTool(tool.id)}
          />
        ))}

        <Separator />

        {/* AI Generate button */}
        <button
          title="AI Diagram Generator"
          className="flex items-center justify-center rounded-lg transition-all duration-150 cursor-pointer"
          style={{
            width: 36,
            height: 36,
            color: '#6965db',
            backgroundColor: 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(105, 101, 219, 0.1)';
            e.currentTarget.style.transform = 'scale(1.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          onClick={onOpenAiDialog}
        >
          <Sparkles size={18} />
        </button>

        <Separator />

        {/* Actions */}
        <button
          title="Export as SVG"
          className="flex items-center justify-center rounded-lg transition-colors duration-150 cursor-pointer"
          style={{
            width: 36,
            height: 36,
            color: 'var(--tool-text)',
            backgroundColor: 'transparent',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--tool-hover-bg)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          onClick={onExport}
        >
          <Download size={18} />
        </button>
        <button
          title="Clear canvas"
          className="flex items-center justify-center rounded-lg transition-colors duration-150 cursor-pointer"
          style={{
            width: 36,
            height: 36,
            color: '#e03131',
            backgroundColor: 'transparent',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(224, 49, 49, 0.08)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          onClick={onClear}
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Status bar */}
      <div
        className="absolute bottom-4 left-4 z-20 flex items-center gap-3"
        style={{
          padding: '6px 14px',
          backgroundColor: 'var(--status-bg)',
          borderRadius: 8,
          boxShadow: '0 1px 6px rgba(0, 0, 0, 0.06)',
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--status-text)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span>{elementCount} element{elementCount !== 1 ? 's' : ''}</span>
        <span style={{ opacity: 0.4 }}>•</span>
        <span>OVM Canvas</span>
      </div>
    </>
  );
}
