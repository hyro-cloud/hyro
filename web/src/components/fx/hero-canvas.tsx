'use client';

import * as React from 'react';

/**
 * Hero background — electric particle wave field + drifting wireframe core
 * with mouse parallax. Ported from the ZAPP three-scene, recolored HYRO blue.
 * Pauses when off-screen / tab hidden / reduced-motion.
 */
export function HeroCanvas() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let raf = 0;
    let disposed = false;

    (async () => {
      const THREE = await import('three');
      if (disposed) return;

      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x040810, 0.0135);

      const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
      camera.position.set(0, 9, 42);

      const COLS = 110;
      const ROWS = 60;
      const SPACING = 1.5;
      const count = COLS * ROWS;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);

      const volt = new THREE.Color(0x3b8cff); // HYRO blue
      const cyan = new THREE.Color(0x41e6ff);
      const dim = new THREE.Color(0x16243f);

      for (let i = 0; i < count; i++) {
        const x = (i % COLS) - COLS / 2;
        const z = Math.floor(i / COLS) - ROWS / 2;
        const idx = i * 3;
        positions[idx] = x * SPACING;
        positions[idx + 1] = 0;
        positions[idx + 2] = z * SPACING;
        dim.toArray(colors, idx);
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const mat = new THREE.PointsMaterial({
        size: 0.16,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const field = new THREE.Points(geo, mat);
      field.position.y = -7;
      scene.add(field);

      const coreGeo = new THREE.IcosahedronGeometry(7, 1);
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0x3b8cff,
        wireframe: true,
        transparent: true,
        opacity: 0.08,
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.set(0, 6, -14);
      scene.add(core);

      const innerGeo = new THREE.IcosahedronGeometry(3.4, 0);
      const innerMat = new THREE.MeshBasicMaterial({
        color: 0x41e6ff,
        wireframe: true,
        transparent: true,
        opacity: 0.12,
      });
      const inner = new THREE.Mesh(innerGeo, innerMat);
      inner.position.copy(core.position);
      scene.add(inner);

      const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
      const onPointer = (e: PointerEvent) => {
        mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
      };
      window.addEventListener('pointermove', onPointer, { passive: true });

      const resize = () => {
        const w = canvas.clientWidth || window.innerWidth;
        const h = canvas.clientHeight || window.innerHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      window.addEventListener('resize', resize);
      resize();

      let visible = true;
      const io = new IntersectionObserver(
        (entries) => {
          visible = entries[0].isIntersecting;
        },
        { threshold: 0 },
      );
      io.observe(canvas);

      const pulse = { amp: 0, x: 0, z: 0 };
      const onDischarge = (e: Event) => {
        const ce = e as CustomEvent<{ nx?: number }>;
        pulse.amp = 5;
        pulse.x = (ce.detail?.nx || 0) * COLS * SPACING * 0.5;
        pulse.z = 0;
      };
      window.addEventListener('hyro:discharge', onDischarge);

      const clock = new THREE.Clock();
      const tmp = new THREE.Color();
      const pos = geo.attributes.position.array as Float32Array;
      const col = geo.attributes.color.array as Float32Array;

      const tick = () => {
        raf = requestAnimationFrame(tick);
        if (!visible || document.hidden) return;

        let t = clock.getElapsedTime();
        if (prefersReduced) t = 0;

        mouse.x += (mouse.tx - mouse.x) * 0.04;
        mouse.y += (mouse.ty - mouse.y) * 0.04;
        pulse.amp *= 0.94;

        for (let j = 0; j < count; j++) {
          const idx = j * 3;
          const px = pos[idx];
          const pz = pos[idx + 2];

          let wave =
            Math.sin(px * 0.18 + t * 0.9) * 1.15 +
            Math.cos(pz * 0.22 + t * 0.65) * 0.95 +
            Math.sin((px + pz) * 0.08 + t * 0.4) * 0.6;

          if (pulse.amp > 0.05) {
            const dx = px - pulse.x;
            const dz = pz - pulse.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            wave += Math.sin(dist * 0.5 - t * 14) * pulse.amp * Math.exp(-dist * 0.06);
          }

          pos[idx + 1] = wave;

          const glow = (wave + 2.7) / 5.4;
          if (glow > 0.72) {
            tmp.copy(dim).lerp(volt, (glow - 0.72) * 3.6);
          } else if (glow < 0.28) {
            tmp.copy(dim).lerp(cyan, (0.28 - glow) * 2.4);
          } else {
            tmp.copy(dim);
          }
          tmp.toArray(col, idx);
        }
        geo.attributes.position.needsUpdate = true;
        geo.attributes.color.needsUpdate = true;

        core.rotation.y = t * 0.12 + mouse.x * 0.3;
        core.rotation.x = t * 0.07 + mouse.y * 0.2;
        inner.rotation.y = -t * 0.2;
        inner.rotation.z = t * 0.1;

        camera.position.x += (mouse.x * 5 - camera.position.x) * 0.04;
        camera.position.y += (9 - mouse.y * 3 - camera.position.y) * 0.04;
        camera.lookAt(0, 2, -6);

        renderer.render(scene, camera);
      };
      tick();

      // cleanup
      (canvas as HTMLCanvasElement & { __cleanup?: () => void }).__cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('pointermove', onPointer);
        window.removeEventListener('resize', resize);
        window.removeEventListener('hyro:discharge', onDischarge);
        io.disconnect();
        geo.dispose();
        mat.dispose();
        coreGeo.dispose();
        coreMat.dispose();
        innerGeo.dispose();
        innerMat.dispose();
        renderer.dispose();
      };
    })();

    return () => {
      disposed = true;
      const c = canvasRef.current as
        | (HTMLCanvasElement & { __cleanup?: () => void })
        | null;
      c?.__cleanup?.();
      cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={canvasRef} className="z-hero__canvas" aria-hidden />;
}
