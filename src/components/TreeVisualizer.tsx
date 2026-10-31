import { useRef, useCallback, useState, useEffect } from 'react';
import Tree from 'react-d3-tree';
import type { RawNodeDatum, CustomNodeElementProps } from 'react-d3-tree';
import type { TreeNode, CellValue } from '../types';
import { useStore } from '../store';

function treeNodeToRawDatum(
  node: TreeNode,
  visitedIds: Set<number>,
  scoredIds: Set<number>,
  bestPathIds: Set<number>,
  currentNodeId: number | null,
): RawNodeDatum | null {
  if (!visitedIds.has(node.id)) return null;

  const children: RawNodeDatum[] = [];
  for (const child of node.children) {
    const childDatum = treeNodeToRawDatum(child, visitedIds, scoredIds, bestPathIds, currentNodeId);
    if (childDatum) children.push(childDatum);
  }

  return {
    name: String(node.id),
    attributes: {
      board: node.board.map((c) => (c === null ? '_' : c)).join(''),
      score: node.score !== null ? node.score : -999,
      isMaximizing: node.isMaximizing ? 1 : 0,
      scored: scoredIds.has(node.id) ? 1 : 0,
      isBestPath: bestPathIds.has(node.id) ? 1 : 0,
      isCurrent: node.id === currentNodeId ? 1 : 0,
      pruned: node.pruned ? 1 : 0,
    },
    children: children.length > 0 ? children : undefined,
  };
}

function parseBoardFromAttr(boardStr: string | number | boolean): CellValue[] {
  return String(boardStr)
    .split('')
    .map((c) => (c === 'X' ? 'X' : c === 'O' ? 'O' : null));
}

const NODE_W = 108;
const NODE_H = 122;
const BOARD_SIZE = 60;

function MiniBoardSvg({ board }: { board: CellValue[] }) {
  const cellSize = BOARD_SIZE / 3;
  const pad = cellSize * 0.22;

  return (
    <g>
      {/* Grid lines */}
      <g className="mini-grid">
        <line x1={cellSize} y1={0} x2={cellSize} y2={BOARD_SIZE} />
        <line x1={cellSize * 2} y1={0} x2={cellSize * 2} y2={BOARD_SIZE} />
        <line x1={0} y1={cellSize} x2={BOARD_SIZE} y2={cellSize} />
        <line x1={0} y1={cellSize * 2} x2={BOARD_SIZE} y2={cellSize * 2} />
      </g>
      {board.map((cell, i) => {
        if (!cell) return null;
        const col = i % 3;
        const row = Math.floor(i / 3);
        const cx = col * cellSize + cellSize / 2;
        const cy = row * cellSize + cellSize / 2;
        const r = cellSize / 2 - pad;
        if (cell === 'X') {
          return (
            <g key={i} className="mini-x">
              <line x1={cx - r} y1={cy - r} x2={cx + r} y2={cy + r} />
              <line x1={cx + r} y1={cy - r} x2={cx - r} y2={cy + r} />
            </g>
          );
        }
        return <circle key={i} className="mini-o" cx={cx} cy={cy} r={r} />;
      })}
    </g>
  );
}

function CustomNode({ nodeDatum }: CustomNodeElementProps) {
  const attrs = nodeDatum.attributes || {};
  const board = parseBoardFromAttr(attrs.board || '_________');
  const score = Number(attrs.score);
  const isMaximizing = attrs.isMaximizing === 1;
  const scored = attrs.scored === 1;
  const isBestPath = attrs.isBestPath === 1;
  const isCurrent = attrs.isCurrent === 1;
  const pruned = attrs.pruned === 1;
  const hasScore = scored && score !== -999;

  const scoreTone = score > 0 ? 'pos' : score < 0 ? 'neg' : 'zero';

  // Visual state is expressed through classes (see App.css, "Tree nodes").
  const className =
    'tnode ' +
    (isMaximizing ? 'tnode-max' : 'tnode-min') +
    (scored ? ' tnode-scored' : '') +
    (pruned && scored ? ' tnode-cutoff' : '') +
    (isBestPath ? ' tnode-best' : '') +
    (isCurrent ? ' tnode-current' : '');

  const description =
    `${isMaximizing ? 'MAX' : 'MIN'} node` +
    (hasScore ? `, score ${score}` : '') +
    (pruned && scored ? ', alpha-beta cutoff: remaining branches pruned' : '') +
    (isBestPath ? ', on best path' : '') +
    (isCurrent ? ', currently being evaluated' : '');

  return (
    <g className={className}>
      <title>{description}</title>

      {/* Node card */}
      <rect
        className="tnode-body"
        x={-NODE_W / 2}
        y={-NODE_H / 2}
        width={NODE_W}
        height={NODE_H}
        rx={14}
      />

      {/* Player label */}
      <text className="tnode-label" x={0} y={-NODE_H / 2 + 17} textAnchor="middle">
        {isMaximizing ? 'MAX' : 'MIN'}
      </text>

      {/* Cutoff badge: the node where alpha-beta pruning fired */}
      {pruned && scored && (
        <g className="tnode-cut" transform={`translate(${NODE_W / 2 - 4}, ${-NODE_H / 2 + 4})`}>
          <circle r={11} />
          <text textAnchor="middle" dy="4">
            ✂
          </text>
        </g>
      )}

      {/* Mini board */}
      <g transform={`translate(${-BOARD_SIZE / 2}, ${-NODE_H / 2 + 28})`}>
        <MiniBoardSvg board={board} />
      </g>

      {/* Score pill */}
      {hasScore && (
        <g className={`tnode-score tnode-score-${scoreTone}`} transform={`translate(0, ${NODE_H / 2 - 17})`}>
          <rect x={-24} y={-11} width={48} height={22} rx={11} />
          <text textAnchor="middle" dy="4.5">
            {score > 0 ? `+${score}` : score}
          </text>
        </g>
      )}
    </g>
  );
}

export function TreeVisualizer() {
  const tree = useStore((s) => s.tree);
  const visitedNodeIds = useStore((s) => s.visitedNodeIds);
  const scoredNodeIds = useStore((s) => s.scoredNodeIds);
  const bestPathNodeIds = useStore((s) => s.bestPathNodeIds);
  const steps = useStore((s) => s.steps);
  const currentStepIndex = useStore((s) => s.currentStepIndex);

  const containerRef = useRef<HTMLDivElement>(null);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });

  const centerTree = useCallback(() => {
    if (containerRef.current) {
      const { width } = containerRef.current.getBoundingClientRect();
      setTranslate({ x: width / 2, y: 90 });
    }
  }, []);

  useEffect(() => {
    centerTree();
  }, [tree, centerTree]);

  if (!tree) {
    return (
      <div className="tree-container tree-empty" ref={containerRef}>
        <div className="tree-placeholder">
          <svg className="tree-placeholder-art" width="132" height="96" viewBox="0 0 132 96" fill="none" aria-hidden="true">
            <path d="M66 22v14M66 36L30 62M66 36l36 26M30 62v8M102 62v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 4" />
            <rect x="50" y="2" width="32" height="22" rx="7" stroke="var(--violet)" strokeWidth="1.5" />
            <rect x="14" y="62" width="32" height="22" rx="7" stroke="var(--teal)" strokeWidth="1.5" />
            <rect x="86" y="62" width="32" height="22" rx="7" stroke="var(--teal)" strokeWidth="1.5" />
          </svg>
          <p className="tree-placeholder-title">Make 2 moves to see the MiniMax tree</p>
          <p className="tree-placeholder-sub">
            The AI&apos;s search tree will build here, one node at a time.
          </p>
        </div>
      </div>
    );
  }

  const currentStep =
    currentStepIndex >= 0 && currentStepIndex < steps.length ? steps[currentStepIndex] : null;
  const currentNodeId = currentStep ? currentStep.nodeId : null;

  const data = treeNodeToRawDatum(tree, visitedNodeIds, scoredNodeIds, bestPathNodeIds, currentNodeId);

  if (!data) {
    return (
      <div className="tree-container tree-empty" ref={containerRef}>
        <div className="tree-placeholder">
          <p className="tree-placeholder-title">Visualizing {steps.length} steps...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tree-container" ref={containerRef}>
      <Tree
        data={data}
        orientation="vertical"
        translate={translate}
        nodeSize={{ x: 132, y: 168 }}
        separation={{ siblings: 1, nonSiblings: 1.2 }}
        pathFunc="diagonal"
        collapsible={false}
        zoomable={true}
        draggable={true}
        scaleExtent={{ min: 0.02, max: 2 }}
        renderCustomNodeElement={(props) => <CustomNode {...props} />}
        pathClassFunc={(link) =>
          link.target.data.attributes?.isBestPath === 1 ? 'tree-link tree-link-best' : 'tree-link'
        }
      />

      <div className="tree-legend" aria-label="Tree legend">
        <span className="legend-item">
          <span className="legend-swatch legend-max" /> MAX
        </span>
        <span className="legend-item">
          <span className="legend-swatch legend-min" /> MIN
        </span>
        <span className="legend-item">
          <span className="legend-swatch legend-best" /> Best path
        </span>
        <span className="legend-item">
          <span className="legend-swatch legend-current" /> Current
        </span>
        <span className="legend-item">
          <span className="legend-swatch legend-cutoff" /> Pruned (✂)
        </span>
      </div>
      <div className="tree-hint" aria-hidden="true">
        Drag to pan · Scroll to zoom
      </div>
    </div>
  );
}
