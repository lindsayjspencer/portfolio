import React, { useMemo, useState, useCallback, forwardRef } from 'react';
import Tippy, { type TippyProps } from '@tippyjs/react';
import type { SkillMatrix } from '~/lib/ViewTransitions';
import { usePortfolioStore, graph } from '~/lib/PortfolioStore';
import type { SkillNode, ProjectNode } from '~/lib/PortfolioStore';

type Props = {
	matrix: SkillMatrix;
	highlights?: string[]; // skillId or projectId
	accent?: string; // CSS color token or hex
};

type TooltipData = {
	x: number;
	y: number;
	content: React.ReactNode;
	skillRow?: { id: string; label: string };
	projCol?: { id: string; label: string };
};

const SkillsMatrixTable = forwardRef<HTMLTableElement, Props>(function SkillsMatrixTable(
	{ matrix, highlights = [], accent = '--color-primary-600' },
	ref,
) {
	const { openPanel } = usePortfolioStore();
	const hl = useMemo(() => new Set(highlights), [highlights]);
	const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);

	const rows = matrix.rowOrder ?? matrix.rows.map((_, i) => i);
	const cols = matrix.colOrder ?? matrix.cols.map((_, i) => i);

	// Calculate row and column totals
	const rowTotals = useMemo(() => {
		return matrix.rows.map((_, ri) => matrix.values[ri]?.reduce((sum, val) => sum + (val > 0 ? 1 : 0), 0) || 0);
	}, [matrix]);

	const colTotals = useMemo(() => {
		return matrix.cols.map((_, ci) =>
			matrix.rows.reduce((sum, _, ri) => {
				const rowValues = matrix.values[ri];
				return sum + (rowValues && rowValues[ci] !== undefined && rowValues[ci] > 0 ? 1 : 0);
			}, 0),
		);
	}, [matrix]);

	const handleCellHover = useCallback(
		(ri: number, ci: number, e: React.MouseEvent) => {
			const rowValues = matrix.values[ri];
			if (!rowValues) return;
			const cellValue = rowValues[ci];
			if (cellValue === undefined || cellValue <= 0) {
				setTooltipData(null);
				return;
			}

			const skillRow = matrix.rows[ri];
			const projCol = matrix.cols[ci];
			if (!skillRow || !projCol) {
				setTooltipData(null);
				return;
			}

			const rect = (e.target as HTMLElement).getBoundingClientRect();
			setTooltipData({
				x: rect.left + rect.width / 2,
				y: rect.top,
				skillRow,
				projCol,
				content: (
					<div className="tooltip-content">
						<div className="skill-name">{skillRow.label}</div>
						<div className="project-name">{projCol.label}</div>
					</div>
				),
			});
		},
		[matrix],
	);

	const handleCellLeave = useCallback(() => {
		setTooltipData(null);
	}, []);

	const createTooltipRect = useCallback(
		(x: number, y: number): DOMRect =>
			({
				width: 0,
				height: 0,
				top: y,
				right: x,
				bottom: y,
				left: x,
				x,
				y,
				toJSON: () => ({}),
			}) as DOMRect,
		[],
	);

	const onCellClick = (ri: number, ci: number, e: React.MouseEvent) => {
		const rowValues = matrix.values[ri];
		if (!rowValues) return;
		const cellValue = rowValues[ci];
		if (cellValue === undefined || cellValue <= 0) return;
		const skillRow = matrix.rows[ri];
		const projCol = matrix.cols[ci];

		if (!skillRow || !projCol) return;

		// Find the full nodes from the graph
		const skillNode = graph.nodes.find((n) => n.id === skillRow.id && n.type === 'skill') as SkillNode;
		const projNode = graph.nodes.find((n) => n.id === projCol.id && n.type === 'project') as ProjectNode;

		if (e.metaKey || e.ctrlKey) {
			// Open skill panel
			if (skillNode) {
				openPanel({
					type: 'node',
					title: skillNode.label,
					data: {
						...skillNode,
						itemName: skillNode.label,
					},
				});
			}
		} else {
			// Open project panel
			if (projNode) {
				openPanel({
					type: 'node',
					title: projNode.label,
					data: {
						...projNode,
						itemName: projNode.label,
					},
				});
			}
		}
	};

	return (
		<div
			className="skills-matrix-table"
			style={
				{
					'--accent': accent.startsWith('#') ? accent : `var(${accent})`,
				} as React.CSSProperties
			}
		>
			<table ref={ref}>
				<thead>
					<tr>
						<th className="row-hdr-spacer" />
						{cols.map((ci) => {
							const c = matrix.cols[ci];
							if (!c) return null;
							const isHl = hl.has(c.id);
							const total = colTotals[ci] || 0;
							return (
								<th
									key={c.id}
									className={isHl ? 'col-hdr hl' : 'col-hdr'}
									title={`${c.label} (${total} skills)`}
								>
									<span className="rot">{c.label}</span>
									<span className="col-total">{total}</span>
								</th>
							);
						})}
					</tr>
				</thead>
				<tbody>
					{rows.map((ri) => {
						const r = matrix.rows[ri];
						if (!r) return null;
						const rowHl = hl.has(r.id);
						const total = rowTotals[ri] || 0;
						return (
							<tr key={r.id}>
								<th
									scope="row"
									className={rowHl ? 'row-hdr hl' : 'row-hdr'}
									title={`${r.label} (${total} projects)`}
								>
									<span className="skill-name">{r.label}</span>
									<span className="row-total">{total}</span>
								</th>
								{cols.map((ci) => {
									const v = matrix.values[ri]?.[ci];
									if (v === undefined) return null;
									const isMatch = v > 0;
									const colData = matrix.cols[ci];
									if (!colData) return null;
									const cls = [
										'cell',
										isMatch ? 'match' : 'empty',
										rowHl || hl.has(colData.id) ? 'emph' : '',
									].join(' ');
									return (
										<td
											key={`${ri}-${ci}`}
											className={cls}
											aria-label={`${r.label} • ${colData.label}`}
											onClick={(e) => onCellClick(ri, ci, e)}
											onMouseEnter={isMatch ? (e) => handleCellHover(ri, ci, e) : undefined}
											onMouseLeave={isMatch ? handleCellLeave : undefined}
										>
											{isMatch && <span className="dot" />}
										</td>
									);
								})}
							</tr>
						);
					})}
				</tbody>
			</table>
			{tooltipData && (
				<Tippy
					visible={true}
					placement="top"
					interactive={true}
					arrow={true}
					duration={[0, 0]}
					offset={[0, 24]}
					getReferenceClientRect={() => createTooltipRect(tooltipData.x, tooltipData.y)}
					className="skills-matrix-tooltip"
					content={tooltipData.content}
				>
					<div />
				</Tippy>
			)}
		</div>
	);
});

export default SkillsMatrixTable;
