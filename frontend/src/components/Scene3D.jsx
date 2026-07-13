import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Signature element: a slowly rotating 3D lattice of nodes ("test cases"),
// where some nodes pulse teal (pass) and a few pulse amber (pending/failing),
// linked by thin verification lines — visualizing a suite of checks running.
export default function Scene3D() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 0, 11);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const NODE_COUNT = 46;
    const nodePositions = [];
    const nodeMeshes = [];
    const teal = new THREE.Color('#2DD4BF');
    const amber = new THREE.Color('#F59E0B');
    const slate = new THREE.Color('#64748B');

    const nodeGeo = new THREE.IcosahedronGeometry(0.09, 0);

    for (let i = 0; i < NODE_COUNT; i++) {
      const phi = Math.acos(-1 + (2 * i) / NODE_COUNT);
      const theta = Math.sqrt(NODE_COUNT * Math.PI) * phi;
      const r = 4.2;
      const pos = new THREE.Vector3(
        r * Math.cos(theta) * Math.sin(phi),
        r * Math.sin(theta) * Math.sin(phi),
        r * Math.cos(phi)
      );
      nodePositions.push(pos);

      const isAmber = i % 9 === 0;
      const color = isAmber ? amber : i % 3 === 0 ? teal : slate;
      const mat = new THREE.MeshBasicMaterial({ color });
      const mesh = new THREE.Mesh(nodeGeo, mat);
      mesh.position.copy(pos);
      mesh.userData = { isAmber, baseScale: isAmber ? 1.6 : 1, phase: Math.random() * Math.PI * 2 };
      group.add(mesh);
      nodeMeshes.push(mesh);
    }

    // Connect nearby nodes with thin lines to form a verification lattice.
    const lineMat = new THREE.LineBasicMaterial({ color: '#334155', transparent: true, opacity: 0.35 });
    const linePositions = [];
    for (let i = 0; i < nodePositions.length; i++) {
      for (let j = i + 1; j < nodePositions.length; j++) {
        if (nodePositions[i].distanceTo(nodePositions[j]) < 2.1) {
          linePositions.push(
            nodePositions[i].x, nodePositions[i].y, nodePositions[i].z,
            nodePositions[j].x, nodePositions[j].y, nodePositions[j].z
          );
        }
      }
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    group.add(lines);

    let mouseX = 0, mouseY = 0;
    function onMouseMove(e) {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    }
    window.addEventListener('mousemove', onMouseMove);

    const clock = new THREE.Clock();
    let frameId;
    function animate() {
      const t = clock.getElapsedTime();
      group.rotation.y = t * 0.08 + mouseX * 0.3;
      group.rotation.x = mouseY * 0.2 + Math.sin(t * 0.05) * 0.1;

      nodeMeshes.forEach((mesh) => {
        const { baseScale, phase } = mesh.userData;
        const pulse = baseScale * (1 + 0.25 * Math.sin(t * 1.4 + phase));
        mesh.scale.setScalar(pulse);
      });

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    }
    animate();

    function onResize() {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      mount.removeChild(renderer.domElement);
      nodeGeo.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      nodeMeshes.forEach((m) => m.material.dispose());
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="scene3d-mount" aria-hidden="true" />;
}
