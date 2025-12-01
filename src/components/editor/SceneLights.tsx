import { useEditorStore } from '@/hooks/useEditorStore';

export function SceneLights() {
  const { lights } = useEditorStore();

  return (
    <>
      {lights.map((light) => {
        switch (light.type) {
          case 'ambient':
            return (
              <ambientLight
                key={light.id}
                color={light.color}
                intensity={light.intensity}
              />
            );
          case 'directional':
            return (
              <directionalLight
                key={light.id}
                color={light.color}
                intensity={light.intensity}
                position={light.position}
                castShadow={light.castShadow}
                shadow-mapSize={[2048, 2048]}
                shadow-camera-far={50}
                shadow-camera-left={-10}
                shadow-camera-right={10}
                shadow-camera-top={10}
                shadow-camera-bottom={-10}
              />
            );
          case 'point':
            return (
              <pointLight
                key={light.id}
                color={light.color}
                intensity={light.intensity}
                position={light.position}
                castShadow={light.castShadow}
              />
            );
          case 'spot':
            return (
              <spotLight
                key={light.id}
                color={light.color}
                intensity={light.intensity}
                position={light.position}
                castShadow={light.castShadow}
                angle={Math.PI / 6}
                penumbra={0.5}
              />
            );
          default:
            return null;
        }
      })}
    </>
  );
}
