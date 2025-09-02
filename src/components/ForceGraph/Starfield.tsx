'use client';

import React, { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import type { Bounds } from './Common';

type GL = WebGLRenderingContext;

type StarLocations = {
	u_matrix: WebGLUniformLocation | null;
	u_resolution: WebGLUniformLocation | null;
	u_time: WebGLUniformLocation | null;
	u_color: WebGLUniformLocation | null;
	u_bounds_min: WebGLUniformLocation | null;
	u_bounds_max: WebGLUniformLocation | null;
	u_globalAlpha: WebGLUniformLocation | null;
	a_position: number;
	a_size: number;
	a_alpha: number;
	a_velocity: number;
};

type LinkLocations = {
	u_matrix: WebGLUniformLocation | null;
	u_resolution: WebGLUniformLocation | null;
	u_color: WebGLUniformLocation | null;
	u_bounds_min: WebGLUniformLocation | null;
	u_bounds_max: WebGLUniformLocation | null;
	u_globalAlpha: WebGLUniformLocation | null;
	a_position: number;
	a_alpha: number;
};

interface Props {
	bounds: Bounds;
	starCount?: number;
	color?: string; // "r,g,b"
	linkDistance?: number; // screen px
	linkWorldDistance?: number;
	maxLinksPerStar?: number; // currently unused (we link all neighbours)
	linkFps?: number; // max link rebuilds/sec
	parallax?: { translate?: number; scale?: number }; // parallax effect
	globalAlpha?: number; // global alpha multiplier (0.0 to 1.0)
	startInvisible?: boolean; // start with alpha 0.0 for fade-in animations
	onReady?: (
		renderFn: (transform?: DOMMatrix) => void,
		fadeController?: {
			fadeIn: (duration: number) => void;
			fadeOut: (duration: number) => void;
			resetAlpha: (alpha: number) => void;
		},
	) => void;
}

/* ================= Shaders ================ */

const STAR_VS = `
precision highp float;
precision highp int;

attribute vec2 a_position;
attribute float a_size;
attribute float a_alpha;
attribute vec2 a_velocity;

uniform mat3 u_matrix;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_bounds_min;
uniform vec2 u_bounds_max;

varying float v_alpha;
varying vec2 v_worldPos;

void main() {
	vec2 bounds_size = u_bounds_max - u_bounds_min;
	vec2 pos = a_position + a_velocity * u_time * 0.02;
	pos = mod(pos - u_bounds_min, bounds_size) + u_bounds_min;

	// pass world position for edge fade
	v_worldPos = pos;

	vec3 q = u_matrix * vec3(pos, 1.0);
	vec2 clip = ((q.xy / u_resolution) * 2.0 - 1.0) * vec2(1.0, -1.0);

	gl_Position = vec4(clip, 0.0, 1.0);
	gl_PointSize = a_size; // device px
	v_alpha = a_alpha;
}
`;

const STAR_FS = `
precision highp float;
precision highp int;

varying float v_alpha;
varying vec2 v_worldPos;
uniform vec3 u_color;
uniform vec2 u_bounds_min;
uniform vec2 u_bounds_max;
uniform float u_globalAlpha;

void main() {
	vec2 d = gl_PointCoord - vec2(0.5);
	float dist = length(d);

	// proportional edge fade (0 at edges → 1 at centre)
	vec2 rel = (v_worldPos - u_bounds_min) / (u_bounds_max - u_bounds_min);
	float edgeFade = min(min(rel.x, 1.0 - rel.x), min(rel.y, 1.0 - rel.y));
	edgeFade = clamp(edgeFade * 2.0, 0.0, 1.0);

	float alpha = smoothstep(0.5, 0.3, dist) * v_alpha * edgeFade * u_globalAlpha;
	gl_FragColor = vec4(u_color, alpha);
}
`;

const LINK_VS = `
precision highp float;
precision highp int;

attribute vec2 a_position;
attribute float a_alpha;

uniform mat3 u_matrix;
uniform vec2 u_resolution;

varying float v_alpha;
varying vec2 v_worldPos;

void main() {
	// world position for this vertex (line endpoint)
	v_worldPos = a_position;

	vec3 q = u_matrix * vec3(a_position, 1.0);
	vec2 clip = ((q.xy / u_resolution) * 2.0 - 1.0) * vec2(1.0, -1.0);
	gl_Position = vec4(clip, 0.0, 1.0);
	v_alpha = a_alpha;
}
`;

const LINK_FS = `
precision highp float;
precision highp int;
varying float v_alpha;
varying vec2 v_worldPos;
uniform vec3 u_color;
uniform vec2 u_bounds_min;
uniform vec2 u_bounds_max;
uniform float u_globalAlpha;

void main() {
	vec2 rel = (v_worldPos - u_bounds_min) / (u_bounds_max - u_bounds_min);
	float edgeFade = min(min(rel.x, 1.0 - rel.x), min(rel.y, 1.0 - rel.y));
	edgeFade = clamp(edgeFade * 2.0, 0.0, 1.0);

	gl_FragColor = vec4(u_color, v_alpha * edgeFade * u_globalAlpha);
}
`;

/* ================= Utils ================ */

function createShader(gl: GL, type: number, src: string) {
	const sh = gl.createShader(type);
	if (!sh) return null;
	gl.shaderSource(sh, src);
	gl.compileShader(sh);
	if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
		console.error('Shader error:', gl.getShaderInfoLog(sh));
		gl.deleteShader(sh);
		return null;
	}
	return sh;
}

function createProgram(gl: GL, vsSrc: string, fsSrc: string) {
	const vs = createShader(gl, gl.VERTEX_SHADER, vsSrc);
	const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSrc);
	if (!vs || !fs) return null;
	const p = gl.createProgram();
	if (!p) return null;
	gl.attachShader(p, vs);
	gl.attachShader(p, fs);
	gl.linkProgram(p);
	if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
		console.error('Link error:', gl.getProgramInfoLog(p));
		gl.deleteProgram(p);
		return null;
	}
	return p;
}

function hash01(x: number, y: number) {
	let n = x * 374761393 + y * 668265263;
	n = (n ^ (n >>> 13)) * 1274126177;
	n = (n ^ (n >>> 16)) >>> 0;
	return n / 0xffffffff;
}

const makeParallaxMat3 = (t: DOMMatrix, pt = 0.5, ps = 1.0) => {
	// Scale: blend toward identity (ps=1 → original scale, ps=0 → no zoom)
	const a = 1 + (t.a - 1) * ps;
	const b = 0 + (t.b - 0) * ps;
	const c = 0 + (t.c - 0) * ps;
	const d = 1 + (t.d - 1) * ps;

	// Translation: move slower (pt < 1)
	const e = t.e * pt;
	const f = t.f * pt;

	// Return mat3 for shader
	return new Float32Array([a, b, 0, c, d, 0, e, f, 1]);
};

// Smooth easing function for fade animations
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/* =============== Component =============== */

export default function Starfield({
	bounds,
	starCount = 2000,
	color = '80,80,80',
	linkDistance = 40,
	linkFps = 30,
	parallax,
	globalAlpha = 1.0,
	startInvisible = false,
	onReady,
}: Props) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const glRef = useRef<GL | null>(null);

	/* programs + locations */
	const starProgRef = useRef<WebGLProgram | null>(null);
	const linkProgRef = useRef<WebGLProgram | null>(null);
	const starLocRef = useRef<StarLocations | null>(null);
	const linkLocRef = useRef<LinkLocations | null>(null);

	/* static star VBOs */
	const starPosBuf = useRef<WebGLBuffer | null>(null);
	const starSizeBuf = useRef<WebGLBuffer | null>(null);
	const starAlphaBuf = useRef<WebGLBuffer | null>(null);
	const starVelBuf = useRef<WebGLBuffer | null>(null);

	/* dynamic link VBO */
	const linkBufRef = useRef<WebGLBuffer | null>(null);
	const linkVertCountRef = useRef(0);

	/* VAOs (if available) */
	const vaoExtRef = useRef<OES_vertex_array_object | null>(null);
	const starVaoRef = useRef<WebGLVertexArrayObjectOES | null>(null);
	const linkVaoRef = useRef<WebGLVertexArrayObjectOES | null>(null);

	/* CPU arrays */
	const positionsRef = useRef<Float32Array | null>(null);
	const velocitiesRef = useRef<Float32Array | null>(null);

	/* working arrays */
	const worldXRef = useRef<Float32Array | null>(null);
	const worldYRef = useRef<Float32Array | null>(null);

	/* timing/transform */
	const startTimeRef = useRef<number>(performance.now());
	const lastLinkBuildRef = useRef<number>(0);
	const lastTransformRef = useRef<DOMMatrix | null>(null);

	/* fade animation state */
	const [currentAlpha, setCurrentAlpha] = useState(startInvisible ? 0.0 : (globalAlpha ?? 1.0));
	const currentAlphaRef = useRef(currentAlpha);
	const fadeAnimationRef = useRef<number | null>(null);

	// Keep ref in sync with state
	useEffect(() => {
		currentAlphaRef.current = currentAlpha;
	}, [currentAlpha]);

	// Animation functions
	const fadeIn = useCallback((duration: number) => {
		if (fadeAnimationRef.current) {
			cancelAnimationFrame(fadeAnimationRef.current);
		}

		const startTime = performance.now();
		const startAlpha = currentAlphaRef.current; // Get current value from ref
		const targetAlpha = 1.0;

		// If already at target, nothing to animate
		if (Math.abs(startAlpha - targetAlpha) < 0.01) {
			setCurrentAlpha(targetAlpha);
			return;
		}

		const animate = (now: number) => {
			const elapsed = now - startTime;
			const progress = Math.min(elapsed / duration, 1);
			const easedProgress = easeOutCubic(progress);
			const newAlpha = startAlpha + (targetAlpha - startAlpha) * easedProgress;

			setCurrentAlpha(newAlpha);

			if (progress < 1) {
				fadeAnimationRef.current = requestAnimationFrame(animate);
			} else {
				fadeAnimationRef.current = null;
				setCurrentAlpha(targetAlpha); // Ensure exact final value
			}
		};

		fadeAnimationRef.current = requestAnimationFrame(animate);
	}, []);

	const fadeOut = useCallback((duration: number) => {
		if (fadeAnimationRef.current) {
			cancelAnimationFrame(fadeAnimationRef.current);
		}

		const startTime = performance.now();
		const startAlpha = currentAlphaRef.current; // Get current value from ref
		const targetAlpha = 0.0;

		// If already at target, nothing to animate
		if (Math.abs(startAlpha - targetAlpha) < 0.01) {
			setCurrentAlpha(targetAlpha);
			return;
		}

		const animate = (now: number) => {
			const elapsed = now - startTime;
			const progress = Math.min(elapsed / duration, 1);
			const easedProgress = easeOutCubic(progress);
			const newAlpha = startAlpha + (targetAlpha - startAlpha) * easedProgress;

			setCurrentAlpha(newAlpha);

			if (progress < 1) {
				fadeAnimationRef.current = requestAnimationFrame(animate);
			} else {
				fadeAnimationRef.current = null;
				setCurrentAlpha(targetAlpha); // Ensure exact final value
			}
		};

		fadeAnimationRef.current = requestAnimationFrame(animate);
	}, []);

	// Reset function for debugging and initial states
	const resetAlpha = useCallback((alpha: number) => {
		if (fadeAnimationRef.current) {
			cancelAnimationFrame(fadeAnimationRef.current);
			fadeAnimationRef.current = null;
		}
		setCurrentAlpha(Math.max(0, Math.min(1, alpha)));
	}, []);

	/* stable render entry (wrapper & ref) */
	const renderImplRef = useRef<(t?: DOMMatrix) => void>(() => {});
	const stableRender = useMemo(() => (t?: DOMMatrix) => renderImplRef.current?.(t), []);

	/* memo bits */
	const colorVec = useMemo(() => {
		const [r, g, b] = color.split(',').map((v) => parseInt(v, 10) / 255) as [number, number, number];
		return new Float32Array([r, g, b]);
	}, [color]);

	const expandedBounds = useMemo(() => {
		// Expand proportionally so edges fade well off-screen on any viewport
		const width = bounds.maxX - bounds.minX;
		const height = bounds.maxY - bounds.minY;
		const marginX = Math.max(800, width * 0.95);
		const marginY = Math.max(600, height * 0.95);
		return {
			minX: bounds.minX - marginX,
			maxX: bounds.maxX + marginX,
			minY: bounds.minY - marginY,
			maxY: bounds.maxY + marginY,
		};
	}, [bounds]);

	const ensureCanvasSize = useCallback(() => {
		const canvas = canvasRef.current,
			gl = glRef.current;
		if (!canvas || !gl) return;
		const dpr = Math.max(1, window.devicePixelRatio || 1);
		const w = Math.round(canvas.clientWidth * dpr);
		const h = Math.round(canvas.clientHeight * dpr);
		if (canvas.width !== w || canvas.height !== h) {
			canvas.width = w;
			canvas.height = h;
			gl.viewport(0, 0, w, h);
		}
	}, []);

	/* ---------- link builder (grid, ~O(n)) ---------- */
	const buildLinks = useCallback(
		(transform: DOMMatrix, nowMs: number) => {
			// dials
			const worldRadius = linkDistance; // world units
			const alphaPow = 1.2;
			const alphaMin = 0.08;

			// Apply parallax to transform for screen culling
			const pt = parallax?.translate ?? 1.0;
			const ps = parallax?.scale ?? 1.0;
			const parallaxTransform = new DOMMatrix([
				1 + (transform.a - 1) * ps,
				transform.b * ps,
				transform.c * ps,
				1 + (transform.d - 1) * ps,
				transform.e * pt,
				transform.f * pt,
			]);

			const { minX, maxX, minY, maxY } = expandedBounds;
			const wW = maxX - minX,
				wH = maxY - minY;
			const pos = positionsRef.current!,
				vel = velocitiesRef.current!;

			// advance + wrap star positions into expandedBounds (visual torus for points)
			if (!worldXRef.current || worldXRef.current.length !== starCount) {
				worldXRef.current = new Float32Array(starCount);
				worldYRef.current = new Float32Array(starCount);
			}
			const wxA = worldXRef.current!,
				wyA = worldYRef.current!;
			for (let i = 0; i < starCount; i++) {
				// @ts-expect-error
				let x = pos[i * 2] + vel[i * 2] * nowMs * 0.02;
				// @ts-expect-error
				let y = pos[i * 2 + 1] + vel[i * 2 + 1] * nowMs * 0.02;
				// keep stars inside bounds visually
				x = minX + ((((x - minX) % wW) + wW) % wW);
				y = minY + ((((y - minY) % wH) + wH) % wH);
				wxA[i] = x;
				wyA[i] = y;
			}

			// world grid (NO wrap across edges)
			const cell = worldRadius;
			const nCx = Math.max(1, Math.floor(wW / cell));
			const nCy = Math.max(1, Math.floor(wH / cell));
			const clampIdx = (x: number, y: number) => ({
				cx: Math.min(Math.max(Math.floor((x - minX) / cell), 0), nCx - 1),
				cy: Math.min(Math.max(Math.floor((y - minY) / cell), 0), nCy - 1),
			});
			const key = (cx: number, cy: number) => cy * nCx + cx;
			const grid = new Map<number, number[]>();
			for (let i = 0; i < starCount; i++) {
				// @ts-expect-error
				const { cx, cy } = clampIdx(wxA[i], wyA[i]);
				const k = key(cx, cy);
				(grid.get(k) ?? grid.set(k, []).get(k)!)!.push(i);
			}

			const canvas = canvasRef.current!;
			const toScreen = (x: number, y: number) => ({
				x: parallaxTransform.a * x + parallaxTransform.c * y + parallaxTransform.e,
				y: parallaxTransform.b * x + parallaxTransform.d * y + parallaxTransform.f,
			});
			const onScreen = (x: number, y: number, m = 0) => {
				const s = toScreen(x, y);
				return s.x >= -m && s.x <= canvas.width + m && s.y >= -m && s.y <= canvas.height + m;
			};

			const maxD2 = worldRadius * worldRadius;
			const offsets = [-1, 0, 1];
			const verts: number[] = [];

			for (let cy = 0; cy < nCy; cy++) {
				for (let cx = 0; cx < nCx; cx++) {
					const base = grid.get(key(cx, cy));
					if (!base) continue;

					for (let p = 0; p < base.length; p++) {
						const i = base[p];
						// @ts-expect-error
						const xi = wxA[i],
							// @ts-expect-error
							yi = wyA[i];

						for (let dy of offsets)
							for (let dx of offsets) {
								const ncx = cx + dx,
									ncy = cy + dy;
								// NO wrap across grid edges
								if (ncx < 0 || ncx >= nCx || ncy < 0 || ncy >= nCy) continue;

								const nb = grid.get(key(ncx, ncy));
								if (!nb) continue;

								for (let q = 0; q < nb.length; q++) {
									const j = nb[q];
									// @ts-expect-error
									if (j <= i) continue;

									// plain world deltas (NO torus)
									// @ts-expect-error
									const dxw = wxA[j] - xi;
									// @ts-expect-error
									const dyw = wyA[j] - yi;
									const d2 = dxw * dxw + dyw * dyw;
									if (d2 > maxD2) continue;

									// world-distance alpha
									let a = 1.0 - Math.sqrt(d2) / worldRadius;
									a = Math.pow(a, alphaPow);
									if (a < alphaMin) continue;

									// optional draw-only screen cull
									// @ts-expect-error
									if (!onScreen(xi, yi, 0) && !onScreen(wxA[j], wyA[j], 0)) continue;

									// @ts-expect-error
									verts.push(xi, yi, a, wxA[j], wyA[j], a);
								}
							}
					}
				}
			}

			// upload (same as your current)
			const gl = glRef.current!;
			if (!linkBufRef.current) {
				linkBufRef.current = gl.createBuffer();
				gl.bindBuffer(gl.ARRAY_BUFFER, linkBufRef.current);
				gl.bufferData(gl.ARRAY_BUFFER, 4, gl.DYNAMIC_DRAW);
			} else {
				gl.bindBuffer(gl.ARRAY_BUFFER, linkBufRef.current);
			}
			const f32 = new Float32Array(verts);
			const currentBytes = gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_SIZE) as number;
			if (f32.byteLength > currentBytes)
				gl.bufferData(gl.ARRAY_BUFFER, Math.ceil(f32.byteLength * 1.5), gl.DYNAMIC_DRAW);
			if (f32.byteLength) gl.bufferSubData(gl.ARRAY_BUFFER, 0, f32);
			linkVertCountRef.current = f32.byteLength ? verts.length / 3 : 0;
		},
		[expandedBounds, starCount, linkDistance, parallax],
	);

	/* ---------- renderer (updates via renderImplRef) ---------- */
	const render = useCallback(
		(transform?: DOMMatrix) => {
			const canvas = canvasRef.current,
				gl = glRef.current,
				starProg = starProgRef.current;
			if (!canvas || !gl || !starProg) return;

			ensureCanvasSize();
			// If no external transform is provided (e.g., LandingView),
			// center the world-bounds centre in the canvas and scale by DPR so CSS px map to device px.
			const dpr = Math.max(1, window.devicePixelRatio || 1);
			const cx = (bounds.minX + bounds.maxX) * 0.5;
			const cy = (bounds.minY + bounds.maxY) * 0.5;
			const t =
				transform ??
				new DOMMatrix()
					.translateSelf(canvas.width * 0.5, canvas.height * 0.5)
					.scaleSelf(dpr, dpr)
					.translateSelf(-cx, -cy);
			const now = performance.now() - startTimeRef.current;

			// link rebuild throttle
			const minInterval = 1000 / Math.max(1, linkFps | 0 || 16);
			const since = performance.now() - lastLinkBuildRef.current;
			let recompute = since >= minInterval || !lastTransformRef.current;
			if (!recompute && lastTransformRef.current) {
				const lt = lastTransformRef.current;
				const epsT = 0.25,
					epsS = 1e-4;
				if (
					Math.abs(lt.a - t.a) > epsS ||
					Math.abs(lt.b - t.b) > epsS ||
					Math.abs(lt.c - t.c) > epsS ||
					Math.abs(lt.d - t.d) > epsS ||
					Math.abs(lt.e - t.e) > epsT ||
					Math.abs(lt.f - t.f) > epsT
				) {
					recompute = true;
				}
			}
			if (recompute && linkProgRef.current) {
				buildLinks(t, now);
				lastLinkBuildRef.current = performance.now();
				lastTransformRef.current = t;
			}

			gl.clear(gl.COLOR_BUFFER_BIT);

			// Apply parallax
			const pt = parallax?.translate ?? 1.0;
			const ps = parallax?.scale ?? 1.0;
			const mPar = makeParallaxMat3(t, pt, ps);

			/* links */
			const linkProg = linkProgRef.current,
				linkLoc = linkLocRef.current;
			if (linkProg && linkLoc && linkBufRef.current && linkVertCountRef.current) {
				gl.useProgram(linkProg);
				const { minX, minY, maxX, maxY } = expandedBounds;
				gl.uniformMatrix3fv(linkLoc.u_matrix, false, mPar);
				gl.uniform2f(linkLoc.u_resolution, canvas.width, canvas.height);
				gl.uniform3fv(linkLoc.u_color, colorVec);
				gl.uniform2f(linkLoc.u_bounds_min, minX, minY);
				gl.uniform2f(linkLoc.u_bounds_max, maxX, maxY);
				gl.uniform1f(linkLoc.u_globalAlpha, currentAlpha);

				const vaoExt = vaoExtRef.current;
				if (vaoExt && linkVaoRef.current) {
					vaoExt.bindVertexArrayOES(linkVaoRef.current);
				} else {
					gl.bindBuffer(gl.ARRAY_BUFFER, linkBufRef.current);
					gl.enableVertexAttribArray(linkLoc.a_position);
					gl.vertexAttribPointer(linkLoc.a_position, 2, gl.FLOAT, false, 12, 0);
					gl.enableVertexAttribArray(linkLoc.a_alpha);
					gl.vertexAttribPointer(linkLoc.a_alpha, 1, gl.FLOAT, false, 12, 8);
				}
				gl.drawArrays(gl.LINES, 0, linkVertCountRef.current);
				if (vaoExt && linkVaoRef.current) vaoExt.bindVertexArrayOES(null);
			}

			/* stars */
			const starLoc = starLocRef.current!;
			gl.useProgram(starProg);
			const { minX, minY, maxX, maxY } = expandedBounds; // keep same bounds as links
			gl.uniformMatrix3fv(starLoc.u_matrix, false, mPar);
			gl.uniform2f(starLoc.u_resolution, canvas.width, canvas.height);
			gl.uniform1f(starLoc.u_time, now);
			gl.uniform3fv(starLoc.u_color, colorVec);
			gl.uniform2f(starLoc.u_bounds_min, minX, minY);
			gl.uniform2f(starLoc.u_bounds_max, maxX, maxY);
			gl.uniform1f(starLoc.u_globalAlpha, currentAlpha);

			const vaoExt = vaoExtRef.current;
			if (vaoExt && starVaoRef.current) {
				vaoExt.bindVertexArrayOES(starVaoRef.current);
			} else {
				gl.bindBuffer(gl.ARRAY_BUFFER, starPosBuf.current);
				gl.enableVertexAttribArray(starLoc.a_position);
				gl.vertexAttribPointer(starLoc.a_position, 2, gl.FLOAT, false, 0, 0);
				gl.bindBuffer(gl.ARRAY_BUFFER, starSizeBuf.current);
				gl.enableVertexAttribArray(starLoc.a_size);
				gl.vertexAttribPointer(starLoc.a_size, 1, gl.FLOAT, false, 0, 0);
				gl.bindBuffer(gl.ARRAY_BUFFER, starAlphaBuf.current);
				gl.enableVertexAttribArray(starLoc.a_alpha);
				gl.vertexAttribPointer(starLoc.a_alpha, 1, gl.FLOAT, false, 0, 0);
				gl.bindBuffer(gl.ARRAY_BUFFER, starVelBuf.current);
				gl.enableVertexAttribArray(starLoc.a_velocity);
				gl.vertexAttribPointer(starLoc.a_velocity, 2, gl.FLOAT, false, 0, 0);
			}
			gl.drawArrays(gl.POINTS, 0, starCount);
			if (vaoExt && starVaoRef.current) vaoExt.bindVertexArrayOES(null);
		},
		[expandedBounds, linkFps, buildLinks, ensureCanvasSize, starCount, colorVec, parallax, currentAlpha],
	);

	// route latest renderer to the stable wrapper
	useEffect(() => {
		renderImplRef.current = render;
	}, [render]);

	/* ---------- init ---------- */
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false });
		if (!gl) {
			console.error('WebGL not supported');
			return;
		}
		glRef.current = gl;

		vaoExtRef.current = gl.getExtension('OES_vertex_array_object') as OES_vertex_array_object | null;

		const starProg = createProgram(gl, STAR_VS, STAR_FS);
		const linkProg = createProgram(gl, LINK_VS, LINK_FS);
		if (!starProg) return;
		starProgRef.current = starProg;
		linkProgRef.current = linkProg || null;

		// locations
		starLocRef.current = {
			u_matrix: gl.getUniformLocation(starProg, 'u_matrix'),
			u_resolution: gl.getUniformLocation(starProg, 'u_resolution'),
			u_time: gl.getUniformLocation(starProg, 'u_time'),
			u_color: gl.getUniformLocation(starProg, 'u_color'),
			u_bounds_min: gl.getUniformLocation(starProg, 'u_bounds_min'),
			u_bounds_max: gl.getUniformLocation(starProg, 'u_bounds_max'),
			u_globalAlpha: gl.getUniformLocation(starProg, 'u_globalAlpha'),
			a_position: gl.getAttribLocation(starProg, 'a_position'),
			a_size: gl.getAttribLocation(starProg, 'a_size'),
			a_alpha: gl.getAttribLocation(starProg, 'a_alpha'),
			a_velocity: gl.getAttribLocation(starProg, 'a_velocity'),
		};
		if (linkProg) {
			linkLocRef.current = {
				u_matrix: gl.getUniformLocation(linkProg, 'u_matrix'),
				u_resolution: gl.getUniformLocation(linkProg, 'u_resolution'),
				u_color: gl.getUniformLocation(linkProg, 'u_color'),
				u_bounds_min: gl.getUniformLocation(linkProg, 'u_bounds_min'),
				u_bounds_max: gl.getUniformLocation(linkProg, 'u_bounds_max'),
				u_globalAlpha: gl.getUniformLocation(linkProg, 'u_globalAlpha'),
				a_position: gl.getAttribLocation(linkProg, 'a_position'),
				a_alpha: gl.getAttribLocation(linkProg, 'a_alpha'),
			};
		}

		// star data (expanded bounds to hide seam)
		const { minX, maxX, minY, maxY } = expandedBounds;
		const pos = new Float32Array(starCount * 2);
		const vel = new Float32Array(starCount * 2);
		const size = new Float32Array(starCount);
		const alp = new Float32Array(starCount);

		for (let i = 0; i < starCount; i++) {
			const x = minX + (maxX - minX) * hash01(i, 0);
			const y = minY + (maxY - minY) * hash01(i, 1);
			pos[i * 2] = x;
			pos[i * 2 + 1] = y;

			size[i] = 2.0 + 4.0 * hash01(i, 2); // device px
			alp[i] = 0.3 + 0.7 * hash01(i, 3);

			const ang = 2.0 * Math.PI * hash01(i, 4);
			const spd = (1.5 + hash01(i, 5)) * 0.2;
			vel[i * 2] = Math.cos(ang) * spd;
			vel[i * 2 + 1] = Math.sin(ang) * spd;
		}
		positionsRef.current = pos;
		velocitiesRef.current = vel;

		// static star buffers
		const starLoc = starLocRef.current!;
		gl.useProgram(starProg);

		starPosBuf.current = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, starPosBuf.current);
		gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);

		starSizeBuf.current = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, starSizeBuf.current);
		gl.bufferData(gl.ARRAY_BUFFER, size, gl.STATIC_DRAW);

		starAlphaBuf.current = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, starAlphaBuf.current);
		gl.bufferData(gl.ARRAY_BUFFER, alp, gl.STATIC_DRAW);

		starVelBuf.current = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, starVelBuf.current);
		gl.bufferData(gl.ARRAY_BUFFER, vel, gl.STATIC_DRAW);

		// VAO for stars
		if (vaoExtRef.current) {
			const vao = vaoExtRef.current.createVertexArrayOES();
			starVaoRef.current = vao;
			vaoExtRef.current.bindVertexArrayOES(vao);

			gl.bindBuffer(gl.ARRAY_BUFFER, starPosBuf.current);
			gl.enableVertexAttribArray(starLoc.a_position);
			gl.vertexAttribPointer(starLoc.a_position, 2, gl.FLOAT, false, 0, 0);
			gl.bindBuffer(gl.ARRAY_BUFFER, starSizeBuf.current);
			gl.enableVertexAttribArray(starLoc.a_size);
			gl.vertexAttribPointer(starLoc.a_size, 1, gl.FLOAT, false, 0, 0);
			gl.bindBuffer(gl.ARRAY_BUFFER, starAlphaBuf.current);
			gl.enableVertexAttribArray(starLoc.a_alpha);
			gl.vertexAttribPointer(starLoc.a_alpha, 1, gl.FLOAT, false, 0, 0);
			gl.bindBuffer(gl.ARRAY_BUFFER, starVelBuf.current);
			gl.enableVertexAttribArray(starLoc.a_velocity);
			gl.vertexAttribPointer(starLoc.a_velocity, 2, gl.FLOAT, false, 0, 0);

			vaoExtRef.current.bindVertexArrayOES(null);
		}

		// VAO for links (layout only; buffer filled later)
		if (linkProgRef.current && vaoExtRef.current) {
			const ll = linkLocRef.current!;
			const vao = vaoExtRef.current.createVertexArrayOES();
			linkVaoRef.current = vao;
			vaoExtRef.current.bindVertexArrayOES(vao);

			linkBufRef.current = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, linkBufRef.current);
			gl.bufferData(gl.ARRAY_BUFFER, 4, gl.DYNAMIC_DRAW); // seed
			gl.enableVertexAttribArray(ll.a_position);
			gl.vertexAttribPointer(ll.a_position, 2, gl.FLOAT, false, 12, 0);
			gl.enableVertexAttribArray(ll.a_alpha);
			gl.vertexAttribPointer(ll.a_alpha, 1, gl.FLOAT, false, 12, 8);

			vaoExtRef.current.bindVertexArrayOES(null);
		}

		// GL state
		gl.clearColor(0, 0, 0, 0);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

		// expose stable renderer ONCE
		onReady?.(stableRender, { fadeIn, fadeOut, resetAlpha });

		// first draw + DPR resize
		const drawInitial = () => {
			ensureCanvasSize();
			stableRender();
		};
		drawInitial();
		const onResize = () => {
			ensureCanvasSize();
			stableRender(lastTransformRef.current ?? new DOMMatrix());
		};
		window.addEventListener('resize', onResize);

		return () => {
			window.removeEventListener('resize', onResize);
			if (fadeAnimationRef.current) {
				cancelAnimationFrame(fadeAnimationRef.current);
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [expandedBounds, starCount, ensureCanvasSize, stableRender, onReady]);

	/* ----------- JSX ----------- */
	return (
		<canvas
			ref={canvasRef}
			style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
		/>
	);
}
