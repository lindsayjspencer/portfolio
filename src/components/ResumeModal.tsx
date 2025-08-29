import React, { useRef, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { MaterialIcon } from '~/components/Ui';
import { usePortfolioStore } from '~/lib/PortfolioStore';
import { buildResume } from '~/lib/ResumeFromGraph';
import './ResumeModal.scss';

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ResumeModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export function ResumeModal({ isOpen, onClose }: ResumeModalProps) {
	const { graph } = usePortfolioStore();
	const data = buildResume(graph);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function onEsc(e: KeyboardEvent) {
			if (e.key === 'Escape') onClose();
		}
		if (isOpen) document.addEventListener('keydown', onEsc);
		return () => document.removeEventListener('keydown', onEsc);
	}, [isOpen, onClose]);

	const handlePdf = async () => {
		if (!ref.current) return;
		const canvas = await html2canvas(ref.current, { scale: 2, useCORS: true });
		const img = canvas.toDataURL('image/png');
		const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
		const pageW = pdf.internal.pageSize.getWidth();
		const pageH = pdf.internal.pageSize.getHeight();
		const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
		pdf.addImage(img, 'PNG', 0, 0, canvas.width * ratio, canvas.height * ratio);
		pdf.save('Lindsay-Spencer-Resume.pdf');
	};

	return (
		<Dialog.Root open={isOpen} onOpenChange={onClose}>
			<Dialog.Portal>
				<Dialog.Overlay className="resume-modal-overlay" />
				<Dialog.Content className="resume-modal-content">
					<div className="resume-modal-header">
						<Dialog.Title className="resume-modal-title">Résumé — {data.name}</Dialog.Title>
						<div className="resume-modal-actions">
							<button onClick={handlePdf} className="resume-print-btn">
								Download PDF
							</button>
							<Dialog.Close asChild>
								<button className="resume-modal-close" aria-label="Close">
									Close
								</button>
							</Dialog.Close>
						</div>
					</div>

					<div ref={ref} className="resume-modal-body">
						{/* Header */}
						<div className="resume-header">
							<div>
								<h1 className="resume-name">{data.name}</h1>
								<p className="resume-subtitle">
									{data.title} · {data.location}
								</p>
							</div>
							<div className="resume-links">
								{data.links.map((l) => (
									<div key={l.href}>
										<a
											className="resume-link"
											href={l.href}
											target="_blank"
											rel="noopener noreferrer"
										>
											{l.label}
										</a>
									</div>
								))}
							</div>
						</div>

						<p className="resume-summary">{data.summary}</p>

						{/* Experience */}
						<h3 className="resume-section-title">Experience</h3>
						<div className="resume-experience">
							{data.experience.map((r, i) => (
								<div key={i} className="resume-role">
									<div className="resume-role-header">
										<p className="resume-role-title">{r.title}</p>
										<p className="resume-role-period">
											{r.period} · {r.location}
										</p>
									</div>
									<ul className="resume-role-points">
										{r.points.map((p, j) => (
											<li key={j}>{p}</li>
										))}
									</ul>
									{r.skills.length > 0 && (
										<p className="resume-role-tech">Tech: {r.skills.join(', ')}</p>
									)}
								</div>
							))}
						</div>

						{/* Projects */}
						{data.projects.length > 0 && (
							<>
								<h3 className="resume-section-title">Selected Projects</h3>
								<ul className="resume-projects-list">
									{data.projects.map((p) => (
										<li key={p.name}>
											<b>{p.name}</b> — {p.blurb}{' '}
											{p.link && (
												<a
													className="resume-project-link"
													href={p.link}
													target="_blank"
													rel="noopener noreferrer"
												>
													Link
												</a>
											)}
											<span className="resume-project-tech">
												{' '}
												· {p.tech.slice(0, 5).join(', ')}
											</span>
										</li>
									))}
								</ul>
							</>
						)}

						{/* Skills */}
						<h3 className="resume-section-title">Skills</h3>
						<div className="resume-skills-grid">
							{data.skills.map((s) => (
								<div key={s.level} className="resume-skill-group">
									<p className="resume-skill-level">{s.level}</p>
									<p className="resume-skill-items">{s.items.join(', ')}</p>
								</div>
							))}
						</div>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
