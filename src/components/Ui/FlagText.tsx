'use client';

// FlagText.tsx — Shader-based ripple effect text display
// Uses automatic text sizing and Three.js shaders for water ripple animation

import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import GUI from 'lil-gui';

const waterVertexShader = `
uniform float uTime;
uniform float uBigWavesElevation;
uniform vec2 uBigWavesFrequency;
uniform float uBigWavesSpeed;

uniform float uSmallWavesElevation;
uniform float uSmallWavesFrequency;
uniform float uSmallWavesSpeed;
uniform float uSmallIterations;

varying float vElevation;
varying vec2 vUv;

// Classic Perlin 3D Noise 
// by Stefan Gustavson
//
vec4 permute(vec4 x)
{
    return mod(((x*34.0)+1.0)*x, 289.0);
}
vec4 taylorInvSqrt(vec4 r)
{
    return 1.79284291400159 - 0.85373472095314 * r;
}
vec3 fade(vec3 t)
{
    return t*t*t*(t*(t*6.0-15.0)+10.0);
}

float cnoise(vec3 P)
{
    vec3 Pi0 = floor(P); // Integer part for indexing
    vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
    Pi0 = mod(Pi0, 289.0);
    Pi1 = mod(Pi1, 289.0);
    vec3 Pf0 = fract(P); // Fractional part for interpolation
    vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz;
    vec4 iz1 = Pi1.zzzz;

    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);

    vec4 gx0 = ixy0 / 7.0;
    vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);

    vec4 gx1 = ixy1 / 7.0;
    vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);

    vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
    vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
    vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
    vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
    vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
    vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
    vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
    vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
    g000 *= norm0.x;
    g010 *= norm0.y;
    g100 *= norm0.z;
    g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
    g001 *= norm1.x;
    g011 *= norm1.y;
    g101 *= norm1.z;
    g111 *= norm1.w;

    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
    float n111 = dot(g111, Pf1);

    vec3 fade_xyz = fade(Pf0);
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
    return 2.2 * n_xyz;
}

void main()
{
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);

    // Elevation
    float elevation = sin(modelPosition.x * uBigWavesFrequency.x + uTime * uBigWavesSpeed) *
                      sin(modelPosition.y * uBigWavesFrequency.y + uTime * uBigWavesSpeed) *
                      uBigWavesElevation;

    for(float i = 1.0; i <= uSmallIterations; i++)
    {
        elevation -= abs(cnoise(vec3(modelPosition.xz * uSmallWavesFrequency * i, uTime * uSmallWavesSpeed)) * uSmallWavesElevation / i);
    }
    
    modelPosition.y += elevation;

    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;

    vElevation = elevation;
    vUv = uv;
}
`;

const waterFragmentShader = `
uniform vec3 uDepthColor;
uniform vec3 uSurfaceColor;
uniform float uColorOffset;
uniform float uColorMultiplier;
uniform sampler2D uTextTexture;
uniform float uTextStrength;

varying float vElevation;
varying vec2 vUv;

void main()
{
    // Water color based on elevation
    float mixStrength = (vElevation + uColorOffset) * uColorMultiplier;
    vec3 waterColor = mix(uDepthColor, uSurfaceColor, mixStrength);
    
    // Sample text texture
    vec4 textColor = texture2D(uTextTexture, vUv);
    
    // Blend text with water color
    vec3 finalColor = mix(waterColor, textColor.rgb, textColor.a * uTextStrength);
    
    gl_FragColor = vec4(finalColor, 1.0);
    #include <colorspace_fragment>
}
`;

type Props = {
	text: string;
	maxWidth?: number;
	maxHeight?: number;

	// appearance
	font?: string;
	textColor?: string;
	backgroundColor?: string;

	// water effect properties (from script.js)
	depthColor?: string;
	surfaceColor?: string;
	bigWavesElevation?: number;
	bigWavesFrequency?: { x: number; y: number };
	bigWavesSpeed?: number;
	smallWavesElevation?: number;
	smallWavesFrequency?: number;
	smallWavesSpeed?: number;
	smallIterations?: number;
	colorOffset?: number;
	colorMultiplier?: number;
	textStrength?: number;

	// Debug
	showDebugControls?: boolean;

	className?: string;
	style?: React.CSSProperties;
};

const width = 150;
const height = 60;

const FlagText: React.FC<Props> = ({
	text,

	font = 'bold 220px Arial',
	textColor = '#ffffff',
	backgroundColor = '#004cff',

	// Water effect defaults from script.js
	depthColor = '#000000',
	surfaceColor = '#ffffff',
	bigWavesElevation = 0.043,
	bigWavesFrequency = { x: 4, y: 2.5 },
	bigWavesSpeed = 0.75,
	smallWavesElevation = 0.06,
	smallWavesFrequency = 3,
	smallWavesSpeed = 0.2,
	smallIterations = 1,
	colorOffset = 0.08,
	colorMultiplier = 10,
	textStrength = 0.75,

	// Debug
	showDebugControls = false,

	className,
	style,
}) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const rendererRef = useRef<THREE.WebGLRenderer>();
	const sceneRef = useRef<THREE.Scene>();
	const cameraRef = useRef<THREE.PerspectiveCamera>();
	const waterMeshRef = useRef<THREE.Mesh>();
	const materialRef = useRef<THREE.ShaderMaterial>();
	const textureRef = useRef<THREE.CanvasTexture>();
	const animRef = useRef<number>();
	const guiRef = useRef<GUI>();

	// Create text texture exactly like in script.js
	const createTextTexture = React.useCallback((debugText?: string, debugTextColor?: string, debugBgColor?: string) => {
		const canvas = document.createElement('canvas');
		const context = canvas.getContext('2d')!;

		canvas.width = 1064;
		canvas.height = 400;

		// Use debug values if provided, otherwise use props
		const currentText = debugText || text;
		const currentTextColor = debugTextColor || textColor;
		const currentBgColor = debugBgColor || backgroundColor;

		// Background
		context.fillStyle = currentBgColor;
		context.fillRect(0, 0, canvas.width, canvas.height);

		// Text
		context.fillStyle = currentTextColor;
		context.font = font;
		context.textAlign = 'center';
		context.textBaseline = 'middle';
		context.fillText(currentText, canvas.width / 2, canvas.height / 2);

		const texture = new THREE.CanvasTexture(canvas);
		texture.needsUpdate = true;
		return texture;
	}, [text, font, textColor, backgroundColor]);

	useEffect(() => {
		let mounted = true;

		const init = () => {
			if (!mounted) return;

			// Canvas
			const canvas = canvasRef.current!;

			// Scene
			const scene = new THREE.Scene();
			sceneRef.current = scene;

			// Water geometry - exactly like script.js
			const waterGeometry = new THREE.PlaneGeometry(2, 0.7, 512, 512);

			// Text texture
			const textTexture = createTextTexture();
			textureRef.current = textTexture;

			// Water material with all uniforms from script.js
			const uniforms = {
				uTime: { value: 0 },

				uBigWavesElevation: { value: bigWavesElevation },
				uBigWavesFrequency: { value: new THREE.Vector2(bigWavesFrequency.x, bigWavesFrequency.y) },
				uBigWavesSpeed: { value: bigWavesSpeed },

				uSmallWavesElevation: { value: smallWavesElevation },
				uSmallWavesFrequency: { value: smallWavesFrequency },
				uSmallWavesSpeed: { value: smallWavesSpeed },
				uSmallIterations: { value: smallIterations },

				uDepthColor: { value: new THREE.Color(depthColor) },
				uSurfaceColor: { value: new THREE.Color(surfaceColor) },
				uColorOffset: { value: colorOffset },
				uColorMultiplier: { value: colorMultiplier },

				uTextTexture: { value: textTexture },
				uTextStrength: { value: textStrength },
			};
			const waterMaterial = new THREE.ShaderMaterial({
				vertexShader: waterVertexShader,
				fragmentShader: waterFragmentShader,
				uniforms: uniforms,
				side: THREE.DoubleSide, // Make sure we can see it from both sides
			}) as Omit<THREE.ShaderMaterial, 'uniforms'> & { uniforms: typeof uniforms };
			materialRef.current = waterMaterial;

			// Debug GUI controls
			if (showDebugControls) {
				const gui = new GUI({ width: 340 });
				guiRef.current = gui;

				const debugObject = {
					depthColor: depthColor,
					surfaceColor: surfaceColor,
					textColor: textColor,
					backgroundColor: backgroundColor,
					flagText: text
				};

				// Color controls
				gui.addColor(debugObject, 'depthColor').onChange(() => {
					waterMaterial.uniforms.uDepthColor.value.set(debugObject.depthColor);
				});
				gui.addColor(debugObject, 'surfaceColor').onChange(() => {
					waterMaterial.uniforms.uSurfaceColor.value.set(debugObject.surfaceColor);
				});
				gui.addColor(debugObject, 'textColor').onChange(() => {
					const newTexture = createTextTexture(debugObject.flagText, debugObject.textColor, debugObject.backgroundColor);
					waterMaterial.uniforms.uTextTexture.value = newTexture;
				});
				gui.addColor(debugObject, 'backgroundColor').onChange(() => {
					const newTexture = createTextTexture(debugObject.flagText, debugObject.textColor, debugObject.backgroundColor);
					waterMaterial.uniforms.uTextTexture.value = newTexture;
				});
				gui.add(debugObject, 'flagText').onChange(() => {
					const newTexture = createTextTexture(debugObject.flagText, debugObject.textColor, debugObject.backgroundColor);
					waterMaterial.uniforms.uTextTexture.value = newTexture;
				});

				// Wave controls
				gui.add(waterMaterial.uniforms.uBigWavesElevation, 'value').min(0).max(1).step(0.001).name('Big Waves Elevation');
				gui.add(waterMaterial.uniforms.uBigWavesFrequency.value, 'x').min(0).max(10).step(0.001).name('Big Waves Freq X');
				gui.add(waterMaterial.uniforms.uBigWavesFrequency.value, 'y').min(0).max(10).step(0.001).name('Big Waves Freq Y');
				gui.add(waterMaterial.uniforms.uBigWavesSpeed, 'value').min(0).max(4).step(0.001).name('Big Waves Speed');

				gui.add(waterMaterial.uniforms.uSmallWavesElevation, 'value').min(0).max(1).step(0.001).name('Small Waves Elevation');
				gui.add(waterMaterial.uniforms.uSmallWavesFrequency, 'value').min(0).max(30).step(0.001).name('Small Waves Frequency');
				gui.add(waterMaterial.uniforms.uSmallWavesSpeed, 'value').min(0).max(4).step(0.001).name('Small Waves Speed');
				gui.add(waterMaterial.uniforms.uSmallIterations, 'value').min(0).max(5).step(1).name('Small Iterations');

				gui.add(waterMaterial.uniforms.uColorOffset, 'value').min(0).max(1).step(0.001).name('Color Offset');
				gui.add(waterMaterial.uniforms.uColorMultiplier, 'value').min(0).max(10).step(0.001).name('Color Multiplier');
				gui.add(waterMaterial.uniforms.uTextStrength, 'value').min(0).max(1).step(0.01).name('Text Strength');
			}

			// Water mesh - keep it flat (no rotation)
			const water = new THREE.Mesh(waterGeometry, waterMaterial);
			// Don't rotate the plane - keep it facing the camera
			waterMeshRef.current = water;
			scene.add(water);

			// Camera - position it to look at the plane from the front
			const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100);
			camera.position.set(0, 0, 0.65); // Position camera in front of the plane
			camera.lookAt(0, 0, 0); // Look at the center of the plane
			cameraRef.current = camera;
			scene.add(camera);

			// Renderer
			const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
			renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
			renderer.setClearColor(0x00000000, 0); // Black background to see if anything renders
			rendererRef.current = renderer;

			// Calculate canvas size based on text metrics
			renderer.setSize(width, height);
			camera.aspect = width / height;
			camera.updateProjectionMatrix();

			// Animation loop
			const clock = new THREE.Clock();

			const tick = () => {
				if (!mounted) return;

				const elapsedTime = clock.getElapsedTime();

				// Update water uniforms
				waterMaterial.uniforms.uTime.value = elapsedTime;

				// Debug: log first few frames
				if (elapsedTime < 1) {
					console.log('Rendering frame:', elapsedTime);
				}

				// Render
				renderer.render(scene, camera);

				// Continue animation
				animRef.current = requestAnimationFrame(tick);
			};

			animRef.current = requestAnimationFrame(tick);
		};

		init();

		return () => {
			mounted = false;
			if (animRef.current) {
				cancelAnimationFrame(animRef.current);
			}
			if (guiRef.current) {
				guiRef.current.destroy();
			}
			try {
				sceneRef.current?.clear();
				materialRef.current?.dispose();
				textureRef.current?.dispose();
				rendererRef.current?.dispose();
			} catch {}
		};
	}, [
		text,
		font,
		textColor,
		backgroundColor,
		createTextTexture,
		bigWavesElevation,
		bigWavesFrequency,
		bigWavesSpeed,
		smallWavesElevation,
		smallWavesFrequency,
		smallWavesSpeed,
		smallIterations,
		depthColor,
		surfaceColor,
		colorOffset,
		colorMultiplier,
		textStrength,
	]);

	return (
		<div className={className} style={{ width, height, display: 'inline-block', ...style }}>
			<canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
		</div>
	);
};

export default FlagText;
