import type { Element } from '../types';

interface ElementRendererProps {
  element: Element;
  isSelected: boolean;
}

export function ElementRenderer({ element, isSelected }: ElementRendererProps) {
  const { type, x1, y1, x2, y2, label } = element;

  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  const width = maxX - minX;
  const height = maxY - minY;
  const midX = minX + width / 2;

  const strokeColor = isSelected ? 'var(--selection-color)' : '#1e1e2e';
  const strokeWidth = 2;
  const labelColor = isSelected ? 'var(--selection-color)' : '#495057';

  const renderSelectionBox = () => {
    if (!isSelected) return null;
    if (type.includes('line') || type.includes('arc')) return null;
    return (
      <rect
        x={minX - 6}
        y={minY - 6}
        width={width + 12}
        height={height + 12 + 20}
        fill="none"
        stroke="var(--selection-color)"
        strokeWidth={1}
        strokeDasharray="5 3"
        rx={4}
        opacity={0.6}
      />
    );
  };

  const renderLineHandles = () => {
    if (!isSelected) return null;
    return (
      <g>
        <circle cx={x1} cy={y1} r={6} fill="white" stroke="var(--selection-color)" strokeWidth={1.5} style={{ cursor: 'pointer' }} />
        <circle cx={x2} cy={y2} r={6} fill="white" stroke="var(--selection-color)" strokeWidth={1.5} style={{ cursor: 'pointer' }} />
      </g>
    );
  };

  switch (type) {
    case 'mandatory-vp':
    case 'optional-vp': {
      const isOptional = type === 'optional-vp';
      // Main triangle: tip at top center, base at bottom
      const triPoints = `${midX},${minY} ${maxX},${maxY} ${minX},${maxY}`;
      // Small black triangle at the top ~40% height
      const topHeight = height * 0.4;
      const topHalfWidth = (width * 0.4) / 2;
      const topTriPoints = `${midX},${minY} ${midX + topHalfWidth},${minY + topHeight} ${midX - topHalfWidth},${minY + topHeight}`;

      return (
        <g>
          {renderSelectionBox()}
          {/* Main triangle outline */}
          <polygon
            points={triPoints}
            fill="white"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={isOptional ? '6 4' : 'none'}
            strokeLinejoin="round"
          />
          {/* Black top section */}
          <polygon
            points={topTriPoints}
            fill="#1e1e2e"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          {/* VP text in black header */}
          <text
            x={midX}
            y={minY + topHeight * 0.6}
            fill="white"
            fontSize={Math.max(10, Math.min(14, width * 0.12))}
            fontWeight="700"
            fontFamily="Inter, sans-serif"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ userSelect: 'none' }}
          >
            VP
          </text>
          {/* User label inside the triangle body */}
          {label && (
            <text
              x={midX}
              y={minY + topHeight + (height - topHeight) * 0.5}
              fill={strokeColor}
              fontSize={Math.max(11, Math.min(14, width * 0.1))}
              fontWeight="600"
              fontFamily="Inter, sans-serif"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ userSelect: 'none' }}
            >
              {label}
            </text>
          )}
          {/* Type label below */}
          <text
            x={midX}
            y={maxY + 18}
            fill={labelColor}
            fontSize="11"
            fontWeight="500"
            fontFamily="Inter, sans-serif"
            textAnchor="middle"
            style={{ userSelect: 'none', opacity: 0.6 }}
          >
            {isOptional ? 'Optional VP' : 'Mandatory VP'}
          </text>
        </g>
      );
    }

    case 'variant': {
      const cornerSize = Math.max(14, Math.min(28, width * 0.22));
      return (
        <g>
          {renderSelectionBox()}
          {/* Main rectangle */}
          <rect
            x={minX}
            y={minY}
            width={width}
            height={height}
            fill="white"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            rx={2}
          />
          {/* Small corner block */}
          <rect
            x={minX}
            y={minY}
            width={cornerSize}
            height={cornerSize}
            fill="#1e1e2e"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
          {/* V text in corner */}
          <text
            x={minX + cornerSize / 2}
            y={minY + cornerSize / 2 + 1}
            fill="white"
            fontSize={Math.max(10, Math.min(13, cornerSize * 0.55))}
            fontWeight="700"
            fontFamily="Inter, sans-serif"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ userSelect: 'none' }}
          >
            V
          </text>
          {/* User label inside the rectangle */}
          {label && (
            <text
              x={midX}
              y={minY + height / 2 + (cornerSize > height * 0.4 ? 8 : 0)}
              fill={strokeColor}
              fontSize={Math.max(11, Math.min(14, width * 0.1))}
              fontWeight="600"
              fontFamily="Inter, sans-serif"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ userSelect: 'none' }}
            >
              {label}
            </text>
          )}
          {/* Type label below */}
          <text
            x={midX}
            y={maxY + 18}
            fill={labelColor}
            fontSize="11"
            fontWeight="500"
            fontFamily="Inter, sans-serif"
            textAnchor="middle"
            style={{ userSelect: 'none', opacity: 0.6 }}
          >
            Variant
          </text>
        </g>
      );
    }

    case 'mandatory-line': {
      return (
        <g>
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Hit area (invisible wider stroke for easier selection) */}
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="transparent"
            strokeWidth={12}
          />
          {renderLineHandles()}
        </g>
      );
    }

    case 'optional-line': {
      return (
        <g>
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray="4 6"
            strokeLinecap="round"
          />
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="transparent"
            strokeWidth={12}
          />
          {renderLineHandles()}
        </g>
      );
    }

    case 'alternative-arc': {
      // Arc between two points with a decorative curve
      const cx = (x1 + x2) / 2;
      const dy = Math.abs(y2 - y1);
      const dx = Math.abs(x2 - x1);
      const curvature = Math.max(40, Math.min(80, (dx + dy) * 0.3));
      const cy = Math.min(y1, y2) - curvature;

      return (
        <g>
          {/* Arc path */}
          <path
            d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray="3 5"
            strokeLinecap="round"
          />
          {/* Dots along the arc for visual decoration */}
          <circle cx={x1} cy={y1} r={3} fill={strokeColor} />
          <circle cx={x2} cy={y2} r={3} fill={strokeColor} />
          <circle cx={cx} cy={cy + curvature * 0.3} r={2.5} fill={strokeColor} opacity={0.5} />
          {/* [min..max] label */}
          <text
            x={cx}
            y={cy - 6}
            fill={labelColor}
            fontSize="12"
            fontWeight="600"
            fontFamily="Inter, sans-serif"
            textAnchor="middle"
            style={{ userSelect: 'none' }}
          >
            [min..max]
          </text>
          {/* Wider hit area */}
          <path
            d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
            fill="none"
            stroke="transparent"
            strokeWidth={14}
          />
          {renderLineHandles()}
        </g>
      );
    }

    case 'requires-line': {
      const markerId = isSelected ? 'arrowhead-selected' : 'arrowhead';
      return (
        <g>
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray="8 4"
            strokeLinecap="round"
            markerEnd={`url(#${markerId})`}
          />
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="transparent"
            strokeWidth={12}
          />
          {renderLineHandles()}
        </g>
      );
    }

    case 'excludes-line': {
      const markerEndId = isSelected ? 'arrowhead-selected' : 'arrowhead';
      const markerStartId = isSelected ? 'arrowhead-reverse-selected' : 'arrowhead-reverse';
      return (
        <g>
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray="8 4"
            strokeLinecap="round"
            markerStart={`url(#${markerStartId})`}
            markerEnd={`url(#${markerEndId})`}
          />
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="transparent"
            strokeWidth={12}
          />
          {renderLineHandles()}
        </g>
      );
    }

    default:
      return null;
  }
}
