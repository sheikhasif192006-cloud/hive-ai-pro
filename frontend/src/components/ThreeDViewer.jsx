import React, { useRef, Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, Center, Grid, GizmoHelper, GizmoViewport, Environment } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';

const Model = ({ url, color = "#3b82f6" }) => {
  const isStl = url.toLowerCase().endsWith('.stl');
  
  if (isStl) {
    const geometry = useLoader(STLLoader, url);
    return (
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial 
          color={color} 
          metalness={0.6} 
          roughness={0.2} 
          envMapIntensity={1}
        />
      </mesh>
    );
  }
  return null;
};

const ThreeDViewer = ({ fileUrl }) => {
  return (
    <div className="w-full h-full bg-[#18181b] relative group">
      <Canvas 
        shadows 
        camera={{ position: [150, 150, 150], fov: 45 }}
        gl={{ antialias: true, logarithmicDepthBuffer: true }}
      >
        <color attach="background" args={['#0f0f10']} />
        
        <Suspense fallback={null}>
          <Stage 
            environment="city" 
            intensity={0.5} 
            contactShadow={{ opacity: 0.7, blur: 2 }}
            adjustCamera={false}
          >
            <Center top>
              {fileUrl ? <Model url={fileUrl} /> : (
                <mesh castShadow>
                  <boxGeometry args={[20, 20, 20]} />
                  <meshStandardMaterial color="#27272a" wireframe />
                </mesh>
              )}
            </Center>
          </Stage>
          
          {/* Build Plate Grid */}
          <Grid 
            infiniteGrid 
            fadeDistance={400} 
            fadeStrength={5} 
            cellSize={10} 
            sectionSize={50} 
            sectionColor="#3f3f46" 
            cellColor="#27272a"
          />
        </Suspense>

        <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.75} />
        
        {/* Navigation Gizmo (Like Chitubox/Blender) */}
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport axisColors={['#ef4444', '#22c55e', '#3b82f6']} labelColor="white" />
        </GizmoHelper>

        <Environment preset="city" />
      </Canvas>

      {/* Viewport Overlay Info */}
      <div className="absolute top-4 left-4 pointer-events-none">
        <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-lg px-3 py-2">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Perspective</p>
          <p className="text-[10px] font-bold text-orange-500 uppercase">Hive Engine v2.4</p>
        </div>
      </div>

      {!fileUrl && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-700 pointer-events-none">
          <div className="text-center">
            <p className="text-sm font-black uppercase italic tracking-tighter opacity-20">Drop STL to Start Slicing</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreeDViewer;
