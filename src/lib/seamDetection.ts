import * as THREE from 'three';

// Seam detection utilities for UV-aware painting

export interface SeamEdge {
  v1Index: number;
  v2Index: number;
  uv1: THREE.Vector2;
  uv2: THREE.Vector2;
  worldPos1: THREE.Vector3;
  worldPos2: THREE.Vector3;
}

export interface SeamInfo {
  edges: SeamEdge[];
  uvDiscontinuityMap: Map<number, number[]>; // vertex index -> adjacent vertices with UV discontinuity
}

// Detect UV seams in a mesh - edges where the same world position has different UVs
export function detectUVSeams(geometry: THREE.BufferGeometry): SeamInfo {
  const posAttr = geometry.attributes.position as THREE.BufferAttribute;
  const uvAttr = geometry.attributes.uv as THREE.BufferAttribute;
  const indexAttr = geometry.index;
  
  if (!posAttr || !uvAttr) {
    return { edges: [], uvDiscontinuityMap: new Map() };
  }
  
  const edges: SeamEdge[] = [];
  const uvDiscontinuityMap = new Map<number, number[]>();
  
  // Build edge map: key = sorted vertex indices, value = list of (face, uv pairs)
  const edgeMap = new Map<string, { v1: number; v2: number; uv1: THREE.Vector2; uv2: THREE.Vector2; face: number }[]>();
  
  const getIndex = (i: number) => indexAttr ? indexAttr.getX(i) : i;
  const faceCount = indexAttr ? indexAttr.count / 3 : posAttr.count / 3;
  
  for (let f = 0; f < faceCount; f++) {
    const i0 = getIndex(f * 3);
    const i1 = getIndex(f * 3 + 1);
    const i2 = getIndex(f * 3 + 2);
    
    const indices = [i0, i1, i2];
    
    for (let e = 0; e < 3; e++) {
      const v1 = indices[e];
      const v2 = indices[(e + 1) % 3];
      
      const key = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
      const uv1 = new THREE.Vector2(uvAttr.getX(v1), uvAttr.getY(v1));
      const uv2 = new THREE.Vector2(uvAttr.getX(v2), uvAttr.getY(v2));
      
      if (!edgeMap.has(key)) {
        edgeMap.set(key, []);
      }
      edgeMap.get(key)!.push({ v1, v2, uv1, uv2, face: f });
    }
  }
  
  // Find edges with UV discontinuity (same world edge, different UVs)
  const threshold = 0.001; // UV threshold for considering as discontinuity
  
  edgeMap.forEach((edgeList, key) => {
    if (edgeList.length < 2) return; // Boundary edge, not a seam
    
    // Compare UVs across faces sharing this edge
    for (let i = 0; i < edgeList.length; i++) {
      for (let j = i + 1; j < edgeList.length; j++) {
        const e1 = edgeList[i];
        const e2 = edgeList[j];
        
        // Check if UVs match (accounting for edge direction)
        const d1 = e1.uv1.distanceTo(e2.uv1) + e1.uv2.distanceTo(e2.uv2);
        const d2 = e1.uv1.distanceTo(e2.uv2) + e1.uv2.distanceTo(e2.uv1);
        
        if (d1 > threshold && d2 > threshold) {
          // UV discontinuity found
          const [v1, v2] = key.split('-').map(Number);
          
          edges.push({
            v1Index: v1,
            v2Index: v2,
            uv1: e1.uv1,
            uv2: e1.uv2,
            worldPos1: new THREE.Vector3(posAttr.getX(v1), posAttr.getY(v1), posAttr.getZ(v1)),
            worldPos2: new THREE.Vector3(posAttr.getX(v2), posAttr.getY(v2), posAttr.getZ(v2)),
          });
          
          // Add to discontinuity map
          if (!uvDiscontinuityMap.has(v1)) uvDiscontinuityMap.set(v1, []);
          if (!uvDiscontinuityMap.has(v2)) uvDiscontinuityMap.set(v2, []);
          uvDiscontinuityMap.get(v1)!.push(v2);
          uvDiscontinuityMap.get(v2)!.push(v1);
        }
      }
    }
  });
  
  return { edges, uvDiscontinuityMap };
}

// Calculate seam blend weight for a UV position
// Returns 0 (no blending) to 1 (full blend) based on distance to nearest seam
export function calculateSeamBlendWeight(
  uv: THREE.Vector2,
  seamInfo: SeamInfo,
  blendRadius: number,
  canvasSize: number
): number {
  if (seamInfo.edges.length === 0 || blendRadius <= 0) return 0;
  
  const blendRadiusUV = blendRadius / canvasSize;
  let minDist = Infinity;
  
  // Find minimum distance to any seam edge in UV space
  for (const edge of seamInfo.edges) {
    const dist = distanceToLineSegment(uv, edge.uv1, edge.uv2);
    minDist = Math.min(minDist, dist);
  }
  
  if (minDist >= blendRadiusUV) return 0;
  
  // Smooth falloff from seam
  const t = minDist / blendRadiusUV;
  return 1 - smoothstep(0, 1, t);
}

// Distance from point to line segment
function distanceToLineSegment(p: THREE.Vector2, a: THREE.Vector2, b: THREE.Vector2): number {
  const ab = b.clone().sub(a);
  const ap = p.clone().sub(a);
  
  const t = Math.max(0, Math.min(1, ap.dot(ab) / ab.dot(ab)));
  const closest = a.clone().add(ab.multiplyScalar(t));
  
  return p.distanceTo(closest);
}

// Smooth step function
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// Find corresponding UV on the other side of a seam for blending
export function findSeamPairUV(
  uv: THREE.Vector2,
  seamInfo: SeamInfo,
  geometry: THREE.BufferGeometry
): THREE.Vector2 | null {
  const uvAttr = geometry.attributes.uv as THREE.BufferAttribute;
  const posAttr = geometry.attributes.position as THREE.BufferAttribute;
  if (!uvAttr || !posAttr) return null;
  
  // Find closest seam edge
  let minDist = Infinity;
  let closestEdge: SeamEdge | null = null;
  
  for (const edge of seamInfo.edges) {
    const dist = distanceToLineSegment(uv, edge.uv1, edge.uv2);
    if (dist < minDist) {
      minDist = dist;
      closestEdge = edge;
    }
  }
  
  if (!closestEdge) return null;
  
  // Find the corresponding position on the other side of the seam
  // This requires finding vertices at the same world position with different UVs
  // For now, return a simple mirror approximation
  const edgeDir = closestEdge.uv2.clone().sub(closestEdge.uv1).normalize();
  const toPoint = uv.clone().sub(closestEdge.uv1);
  const proj = edgeDir.clone().multiplyScalar(toPoint.dot(edgeDir));
  const perp = toPoint.clone().sub(proj);
  
  // Mirror across the seam edge
  return closestEdge.uv1.clone().add(proj).sub(perp);
}

// Cache for seam info per geometry
const seamCache = new WeakMap<THREE.BufferGeometry, SeamInfo>();

export function getCachedSeamInfo(geometry: THREE.BufferGeometry): SeamInfo {
  let info = seamCache.get(geometry);
  if (!info) {
    info = detectUVSeams(geometry);
    seamCache.set(geometry, info);
  }
  return info;
}
