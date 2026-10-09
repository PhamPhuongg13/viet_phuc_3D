import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { Engine } from '@babylonjs/core/Engines/engine';
import '@babylonjs/core/Engines/Extensions/engine.dynamicTexture';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Scene } from '@babylonjs/core/scene';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { MultiMaterial } from '@babylonjs/core/Materials/multiMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { SubMesh } from '@babylonjs/core/Meshes/subMesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { PointerEventTypes } from '@babylonjs/core/Events/pointerEvents';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { DEFAULT_LOOK, type Look, type GarmentId } from './data';
import { drawPatternArt } from './patternArt';

/** Garments built from Babylon primitives: a stand-in shown while (or if) the detailed GLB fails to load. */
type ProceduralGarmentId = 'ao-dai';

/** Where the 512×512 pattern board is drawn on a GLB texture atlas, as fractions of the texture size. */
type PatternPlacement = { x: number; y: number; w: number; h: number };

/**
 * Fills a polygon given in the model's own x/y coordinates on the front or back half of the atlas.
 * 'around' covers the full texture width, including the strip side-seam triangles blend through.
 */
type RegionFill = (side: 'front' | 'back' | 'around', color: string, points: [number, number][]) => void;

/**
 * How a GLB's generated UVs map onto its texture (see generateMeshyUvs). `regions` paints areas whose
 * borders are straight in x/y straight into the texture, so they come out crisp per pixel rather than
 * following the mesh's triangles.
 */
type AtlasLayout = {
  halfWidth: number;
  placements: PatternPlacement[];
  regions?: (fill: RegionFill, look: Look) => void;
};

/** A Meshy GLB without materials: vertices are split into regions by position (see the *Roles functions). */
type DetailedModelConfig = {
  file: string;
  atlas: AtlasLayout;
  roles: (positions: ArrayLike<number>, indices: ArrayLike<number>) => Uint8Array;
  /** Colors for role 4 and up, from the look (role 0 = textured coat, 1 = pants/skirt, 2 = skin, 3 = shoes). */
  accentColors: ((look: Look) => string)[];
  /** Knowledge hotspots (ids match HOTSPOTS in data.ts), in the model's own coordinates. */
  hotspots: Record<string, HotspotSpec>;
};

type DetailedModel = {
  root: Mesh;
  lowerMaterial: StandardMaterial;
  accentMaterials: StandardMaterial[];
  patternTexture: DynamicTexture;
  lastPatternKey: string;
};

type GarmentParts = {
  root: TransformNode;
  baseFabric: StandardMaterial;
  patternTexture: DynamicTexture;
  lastPatternKey: string;
};

/** A hotspot's place on screen, as fractions of the canvas size. */
export type HotspotScreen = { id: string; x: number; y: number; visible: boolean };

/**
 * A point on a garment, in the coordinates of the node it hangs on. For a GLB model `at` is a rough
 * position and the anchor snaps onto the mesh surface along `dir` (its outward direction) at load.
 */
type HotspotSpec = { at: [number, number, number]; dir: [number, number, number] };
type HotspotAnchor = { id: string; node: TransformNode; point: Vector3; normal: Vector3 };

export type FashionStage = {
  scene: Scene;
  engine: Engine;
  camera: ArcRotateCamera;
  applyLook: (look: Look) => void;
  setView: (view: 'front' | 'back' | 'detail') => void;
  /** Turntable spin of the whole figure (the GLB has no skeleton, so it turns as one piece). */
  setSpinning: (on: boolean) => void;
  /**
   * Flies the camera to a hotspot; null returns to the front view. `shift` places the spot off-centre,
   * as fractions of half the view (x to the right, y up), to keep it clear of an info card.
   */
  focusHotspot: (id: string | null, shift?: { x: number; y: number }) => void;
  /** Called every frame with where the current garment's hotspots are on screen. */
  onHotspots: (listener: ((spots: HotspotScreen[]) => void) | null) => void;
  dispose: () => void;
};

function material(scene: Scene, name: string, hex: string, specular = '#353535') {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = Color3.FromHexString(hex);
  mat.specularColor = Color3.FromHexString(specular);
  mat.specularPower = 48;
  return mat;
}

function createPatternTexture(scene: Scene, name: string, size: number, atlas?: AtlasLayout): DynamicTexture {
  const texture = new DynamicTexture(name, { width: size, height: size }, scene, false);
  texture.wrapU = DynamicTexture.CLAMP_ADDRESSMODE;
  texture.wrapV = DynamicTexture.CLAMP_ADDRESSMODE;
  paintPattern(texture, { ...DEFAULT_LOOK, coatColor: '#ffffff' }, atlas);
  return texture;
}

/** Paints coat color and pattern. Without an atlas it fills a procedural panel; with one, a GLB texture. */
function paintPattern(texture: DynamicTexture, look: Look, atlas?: AtlasLayout) {
  const { patternId: pattern, patternDesign: design, coatColor } = look;
  const context = texture.getContext() as unknown as CanvasRenderingContext2D;
  const size = texture.getSize().width;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, size, size);
  context.fillStyle = coatColor;
  if (atlas) {
    // Fill everything: triangles that straddle the front/back seam sample the gap between the halves.
    context.fillRect(0, 0, size, size);
  } else {
    context.fillRect(0, 0, size, size);
    context.strokeStyle = 'rgba(70, 63, 48, 0.035)';
    context.lineWidth = 1;
    for (let x = 0; x < size; x += 5) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, size);
      context.stroke();
    }
  }
  const base = pattern === 'custom' ? design?.base ?? 'plain' : pattern;
  const marks = pattern === 'custom' ? design?.marks ?? [] : [];
  for (const board of atlas?.placements ?? [{ x: 0.18, y: 0.41, w: 0.64, h: 0.44 }]) {
    context.save();
    context.translate(size * board.x, size * board.y);
    context.scale((size * board.w) / 512, (size * board.h) / 512);
    drawPatternArt(context, base, marks);
    context.restore();
  }
  // Painted areas go on top, so a pattern never spills onto the váy, yếm or sash.
  if (atlas?.regions) {
    const { halfWidth } = atlas;
    atlas.regions((side, color, points) => {
      context.fillStyle = color;
      context.beginPath();
      points.forEach(([x, y], index) => {
        const across = (Math.max(-halfWidth, Math.min(halfWidth, x)) + halfWidth) / (halfWidth * 2);
        const u = side === 'around' ? across : side === 'front' ? 0.575 + across * 0.35 : 0.125 + (1 - across) * 0.35;
        const v = (Math.max(-0.96, Math.min(0.96, y)) + 0.96) / 1.92;
        if (index === 0) context.moveTo(u * size, (1 - v) * size);
        else context.lineTo(u * size, (1 - v) * size);
      });
      context.closePath();
      context.fill();
    }, look);
  }
  texture.update();
}

function sphere(scene: Scene, name: string, pos: [number, number, number], scale: [number, number, number], mat: StandardMaterial, parent?: TransformNode) {
  const mesh = MeshBuilder.CreateSphere(name, { diameter: 1, segments: 20 }, scene);
  mesh.position.set(...pos);
  mesh.scaling.set(...scale);
  mesh.material = mat;
  if (parent) mesh.parent = parent;
  return mesh;
}

function tube(scene: Scene, name: string, points: Vector3[], radius: number, mat: StandardMaterial, parent?: TransformNode) {
  const mesh = MeshBuilder.CreateTube(name, { path: points, radius, tessellation: 8 }, scene);
  mesh.material = mat;
  if (parent) mesh.parent = parent;
  return mesh;
}

function panelPoint(front: boolean, t: number, u: number): Vector3 {
  const top = 2.92;
  const bottom = 0.43;
  const width = 0.35 + 0.29 * Math.pow(t, 1.45);
  const x = u * width;
  const y = top + (bottom - top) * t + 0.045 * Math.abs(u) * t * t;
  const depth = 0.24 + 0.16 * Math.pow(t, 1.45);
  const rounded = Math.sqrt(Math.max(0, 1 - u * u));
  const fold = (0.014 + 0.034 * t * t) * Math.cos(u * Math.PI * 5 + t * 0.7);
  const sideSlit = 0.16 * Math.pow(Math.max(0, (t - 0.28) / 0.72), 1.2) * Math.pow(Math.abs(u), 6);
  return new Vector3(x, y, (front ? -1 : 1) * (depth * rounded + fold * t + sideSlit));
}

function curvedPanel(scene: Scene, name: string, parent: TransformNode, mat: StandardMaterial, front: boolean) {
  const positions: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const rows = 28;
  const columns = 24;
  for (let r = 0; r <= rows; r++) {
    const t = r / rows;
    for (let c = 0; c <= columns; c++) {
      const u = c / columns;
      const point = panelPoint(front, t, u * 2 - 1);
      positions.push(point.x, point.y, point.z);
      uvs.push(u, 1 - t);
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const a = r * (columns + 1) + c;
      const b = a + 1;
      const d = a + columns + 1;
      indices.push(a, b, d, b, d + 1, d);
    }
  }
  VertexData.ComputeNormals(positions, indices, normals);
  const mesh = new Mesh(name, scene);
  const data = new VertexData();
  data.positions = positions;
  data.indices = indices;
  data.normals = normals;
  data.uvs = uvs;
  data.applyToMesh(mesh);
  mesh.material = mat;
  mesh.parent = parent;
  return mesh;
}

function torso(scene: Scene, parent: TransformNode, mat: StandardMaterial) {
  const rings = [[2.78, 0.35, 0.23], [3.02, 0.34, 0.23], [3.36, 0.37, 0.23], [3.58, 0.43, 0.22], [3.69, 0.38, 0.20], [3.79, 0.16, 0.15]];
  const positions: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const sides = 32;
  for (const [y, width, depth] of rings) {
    for (let s = 0; s <= sides; s++) {
      const angle = (s / sides) * Math.PI * 2;
      positions.push(Math.sin(angle) * width, y, Math.cos(angle) * depth);
      uvs.push(s / sides, 0.76 + 0.24 * (y - 2.72) / 1.2);
    }
  }
  for (let r = 0; r < rings.length - 1; r++) {
    for (let s = 0; s < sides; s++) {
      const a = r * (sides + 1) + s;
      const b = a + sides + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  VertexData.ComputeNormals(positions, indices, normals);
  const mesh = new Mesh('ao-dai-than-ao', scene);
  const data = new VertexData();
  data.positions = positions;
  data.indices = indices;
  data.normals = normals;
  data.uvs = uvs;
  data.applyToMesh(mesh);
  mesh.material = mat;
  mesh.parent = parent;
  return mesh;
}

function sleeve(scene: Scene, parent: TransformNode, mat: StandardMaterial, right: boolean) {
  const side = right ? 1 : -1;
  const rings = [
    [3.64, 0.45, 0.18, 0.19],
    [3.54, 0.52, 0.18, 0.18],
    [3.33, 0.65, 0.16, 0.16],
    [3.07, 0.76, 0.135, 0.135],
    [2.76, 0.85, 0.115, 0.115],
    [2.46, 0.92, 0.10, 0.10],
  ];
  const sides = 24;
  const positions: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  for (const [ringIndex, [y, centerX, radiusX, radiusZ]] of rings.entries()) {
    for (let i = 0; i <= sides; i++) {
      const angle = i / sides * Math.PI * 2;
      positions.push(side * centerX + Math.cos(angle) * radiusX, y, Math.sin(angle) * radiusZ);
      uvs.push(i / sides, 0.76 + 0.24 * ringIndex / (rings.length - 1));
    }
  }
  for (let r = 0; r < rings.length - 1; r++) {
    for (let i = 0; i < sides; i++) {
      const a = r * (sides + 1) + i;
      const b = a + sides + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  VertexData.ComputeNormals(positions, indices, normals);
  const mesh = new Mesh(`ao-dai-${right ? 'tay-phai' : 'tay-trai'}`, scene);
  const data = new VertexData();
  data.positions = positions;
  data.indices = indices;
  data.normals = normals;
  data.uvs = uvs;
  data.applyToMesh(mesh);
  mesh.material = mat;
  mesh.parent = parent;
  const cuff = MeshBuilder.CreateTorus(`vien-tay-${side}`, { diameter: 0.20, thickness: 0.013, tessellation: 24 }, scene);
  cuff.position.set(side * 0.92, 2.46, 0);
  cuff.material = mat;
  cuff.parent = parent;
  return mesh;
}

function makeGarment(scene: Scene, id: ProceduralGarmentId, plainWeave: DynamicTexture): GarmentParts {
  const root = new TransformNode(id, scene);
  const fabric = material(scene, `${id}-front-fabric`, '#ffffff', '#454b43');
  const baseFabric = material(scene, `${id}-base-fabric`, '#a94d43', '#454b43');
  fabric.backFaceCulling = false;
  baseFabric.backFaceCulling = false;
  const patternTexture = createPatternTexture(scene, `${id}-pattern-texture`, 512);
  fabric.diffuseTexture = patternTexture;
  baseFabric.diffuseTexture = plainWeave;
  torso(scene, root, baseFabric);
  curvedPanel(scene, `${id}-ta-truoc`, root, fabric, true);
  curvedPanel(scene, `${id}-ta-sau`, root, baseFabric, false);
  sleeve(scene, root, baseFabric, false);
  sleeve(scene, root, baseFabric, true);

  const collar = MeshBuilder.CreateCylinder(`${id}-co-ao`, { height: 0.17, diameterTop: 0.31, diameterBottom: 0.35, tessellation: 32 }, scene);
  collar.position.y = 3.83;
  collar.material = baseFabric;
  collar.parent = root;

  const trimTone = material(scene, 'modern-piping', '#e4cba4', '#858074');
  tube(scene, 'ao-dai-nep-ao', [new Vector3(0.02, 3.87, -0.20), new Vector3(0.035, 3.62, -0.235), new Vector3(0.13, 3.39, -0.24)], 0.007, trimTone, root);

  for (const sign of [-1, 1]) {
    const points: Vector3[] = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const point = panelPoint(true, t, sign);
      point.z -= 0.008;
      points.push(point);
    }
    tube(scene, `${id}-vien-ta-${sign}`, points, 0.006, trimTone, root);
  }

  return { root, baseFabric, patternTexture, lastPatternKey: '' };
}

function createAvatar(scene: Scene, pantsMat: StandardMaterial, skin: StandardMaterial, hair: StandardMaterial, shoes: StandardMaterial) {
  const root = new TransformNode('nhan-vat', scene);
  // A matte display mannequin keeps the eye on the garment and avoids an uncanny face.
  sphere(scene, 'dau-mannequin', [0, 4.25, 0], [0.47, 0.59, 0.43], skin, root);
  const neck = MeshBuilder.CreateCylinder('co', { height: 0.33, diameter: 0.20, tessellation: 24 }, scene);
  neck.position.y = 3.89;
  neck.material = skin;
  neck.parent = root;
  const neckRing = MeshBuilder.CreateTorus('vien-co-mannequin', { diameter: 0.23, thickness: 0.013, tessellation: 24 }, scene);
  neckRing.position.y = 4.025;
  neckRing.material = hair;
  neckRing.parent = root;
  for (const side of [-1, 1]) {
    sphere(scene, `ban-tay-${side}`, [side * 0.92, 2.32, -0.018], [0.115, 0.21, 0.105], skin, root);
    const leg = MeshBuilder.CreateCylinder(`quan-${side}`, { height: 2.27, diameterTop: 0.32, diameterBottom: 0.29, tessellation: 24 }, scene);
    leg.position.set(side * 0.18, 1.52, 0);
    leg.material = pantsMat;
    leg.parent = root;
    sphere(scene, `giay-${side}`, [side * 0.18, 0.26, -0.11], [0.31, 0.16, 0.52], shoes, root);
  }
  return root;
}

const COAT = 0;
const LOWER = 1;
const SKIN = 2;
const SHOES = 3;

/** Áo dài (sage-elegance.glb): head and hands are skin, below the tà is pants, then shoes. */
function aoDaiRoles(positions: ArrayLike<number>, indices: ArrayLike<number>): Uint8Array {
  const roles = new Uint8Array(positions.length / 3);
  const hands = growHands(positions, indices, 0.035, -0.2, -0.06, 0.245);
  for (let i = 0; i < positions.length; i += 3) {
    const x = Math.abs(positions[i]);
    const y = positions[i + 1];
    const z = positions[i + 2];
    // The stand collar's top edge rises from y 0.706 at the front to about 0.74 at the back, and
    // dips into a V at the front opening; neck and head are everything above it.
    const collarTop = 0.706 + Math.min(0.11, Math.max(0, -z)) * 0.36;
    const vee = 0.667 + 1.1 * Math.abs(positions[i] + 0.01);
    const skinFrom = x < 0.1 ? (z > -0.02 ? Math.min(vee, collarTop) : collarTop) : 0.69;
    roles[i / 3] = y > skinFrom || hands[i / 3] ? SKIN
      : y < -0.885 ? SHOES
      : y < -0.56 ? LOWER
      : COAT;
  }
  return roles;
}

const SCARF = 4;

const TU_THAN_ATLAS: AtlasLayout = {
  halfWidth: 0.36,
  // The front is open over the váy, so the motif goes on each front panel and once, larger, on the back.
  placements: [
    { x: 0.587, y: 0.576, w: 0.16, h: 0.155 },
    { x: 0.753, y: 0.576, w: 0.16, h: 0.155 },
    { x: 0.15, y: 0.298, w: 0.30, h: 0.29 },
  ],
  regions: (fill, look) => {
    const lower = look.pantsColor;
    const sash = look.sashColor;
    // Below the coat hem: the left front panel dips to -0.625, the rest of the hem sits near -0.60.
    fill('around', lower, [[-1, -0.625], [1, -0.625], [1, -1], [-1, -1]]);
    fill('back', lower, [[-1, -0.603], [1, -0.603], [1, -0.7], [-1, -0.7]]);
    fill('front', lower, [[0.12, -0.603], [1, -0.603], [1, -0.7], [0.12, -0.7]]);
    // Everything else is traced from the coat's front edges, which widen from the waist to the hem.
    fill('front', lower, [[-0.075, 0.30], [-0.080, 0], [-0.094, -0.30], [-0.113, -0.625], [0.120, -0.625], [0.100, -0.25], [0.076, 0], [0.064, 0.30]]);
    fill('front', look.yemColor, [[-0.068, 0.645], [0.055, 0.645], [0.062, 0.45], [0.064, 0.36], [-0.075, 0.36], [-0.075, 0.45]]);
    // Sash band, then its tails: the long tail with its folded end, the angled flap below it, and
    // the short tail to its right.
    fill('front', sash, [[-0.075, 0.362], [0.064, 0.362], [0.064, 0.298], [-0.075, 0.298]]);
    fill('front', sash, [[-0.043, 0.30], [0.021, 0.30], [0.031, 0.06], [0.045, -0.25], [0.031, -0.315], [-0.036, -0.30], [-0.041, 0]]);
    fill('front', sash, [[-0.073, -0.338], [-0.034, -0.298], [0.013, -0.312], [0.022, -0.33], [0.022, -0.427], [0.0, -0.422], [-0.073, -0.347]]);
    fill('front', sash, [[0.0, 0.30], [0.021, 0.30], [0.065, 0.065], [0.019, 0.076]]);
  },
};

/**
 * Hands sit inside the sleeves and touch the coat, so position alone can't separate them from the
 * cuff lining. Grow from the fingertips along the mesh instead, staying below the cuffs (`wristTop`,
 * where the lining joins the wrist), above `fingertips` and out at the sides. Seeds are points lower
 * than `seedBelow` and further out than `seedOut`.
 */
function growHands(positions: ArrayLike<number>, indices: ArrayLike<number>, wristTop: number, fingertips: number, seedBelow: number, seedOut: number): Uint8Array {
  const count = positions.length / 3;
  const inBox = (v: number) => Math.abs(positions[v * 3]) > 0.2 && positions[v * 3 + 1] < wristTop && positions[v * 3 + 1] > fingertips;
  const { start, neighbours } = buildNeighbours(count, indices);
  const hand = new Uint8Array(count);
  const queue: number[] = [];
  for (let v = 0; v < count; v++) {
    if (inBox(v) && positions[v * 3 + 1] < seedBelow && Math.abs(positions[v * 3]) > seedOut) {
      hand[v] = 1;
      queue.push(v);
    }
  }
  for (let head = 0; head < queue.length; head++) {
    const v = queue[head];
    for (let n = start[v]; n < start[v + 1]; n++) {
      const w = neighbours[n];
      if (!hand[w] && inBox(w)) {
        hand[w] = 1;
        queue.push(w);
      }
    }
  }
  return hand;
}

/**
 * Áo tứ thân (indigo-heritage.glb). One connected mesh, so regions come from position, tuned against
 * rendered views. Only parts whose borders follow real 3D edges are split off here (skin, feet, the
 * headscarf); the váy, yếm and sash are painted into the coat texture by TU_THAN_ATLAS.
 */
function tuThanRoles(positions: ArrayLike<number>, indices: ArrayLike<number>): Uint8Array {
  const count = positions.length / 3;
  const roles = new Uint8Array(count);
  const hands = growHands(positions, indices, 0.03, -0.17, -0.09, 0.235);
  // Outermost surface seen from behind on a 12 mm grid: the scarf tail lies on top of the coat's back.
  const cell = 0.012;
  const key = (i: number) => Math.floor((positions[i * 3] + 0.5) / cell) * 1000 + Math.floor((positions[i * 3 + 1] + 1) / cell);
  const zMin = new Map<number, number>();
  for (let i = 0; i < count; i++) {
    const k = key(i);
    const z = positions[i * 3 + 2];
    if (z < (zMin.get(k) ?? Infinity)) zMin.set(k, z);
  }
  for (let i = 0; i < count; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    const ax = Math.abs(x);
    const k = key(i);
    const backmost = z < (zMin.get(k) ?? z) + 0.015;
    const face = (x / 0.07) ** 2 + ((y - 0.795) / 0.105) ** 2 < 1 && z > 0;
    // The neck blends into the garment in this mesh; the yếm's neckline is set at y 0.645.
    const neck = y > 0.648 && y <= 0.72 && Math.abs(x + 0.004) < 0.06 && z > -0.01;

    // Later rules win.
    let role = COAT;
    if (hands[i]) role = SKIN;
    if (y < -0.905 && ax < 0.2) role = SHOES;
    if (y > 0.70) role = SCARF;
    if (face || neck) role = SKIN;
    // Scarf tail down the back: inside a V below the head, the outermost surface seen from behind.
    if (y > 0.40 && y <= 0.70 && z < -0.095 && ax < 0.03 + (y - 0.40) * 0.42 && backmost) role = SCARF;
    roles[i] = role;
  }
  return roles;
}

const DETAILED_MODELS: Partial<Record<GarmentId, DetailedModelConfig>> = {
  'ao-dai': {
    file: 'sage-elegance.glb',
    atlas: { halfWidth: 0.34, placements: [{ x: 0.60, y: 0.48, w: 0.30, h: 0.29 }] },
    roles: aoDaiRoles,
    accentColors: [],
    hotspots: {
      // On the collar flap beside the front V (the centre of the V is neck).
      'co-dung': { at: [-0.045, 0.69, 0], dir: [0, 0, 1] },
      'duong-cai': { at: [-0.185, 0.53, 0], dir: [0, 0, 1] },
      // Low on the side, clear of the hanging hands.
      'xe-ta': { at: [0, -0.32, 0.01], dir: [1, 0, 0] },
    },
  },
  'tu-than': {
    file: 'indigo-heritage.glb',
    atlas: TU_THAN_ATLAS,
    roles: tuThanRoles,
    accentColors: [(look) => look.scarfColor],
    hotspots: {
      'vat-truoc': { at: [-0.13, -0.12, 0], dir: [0, 0, 1] },
      yem: { at: [-0.005, 0.50, 0], dir: [0, 0, 1] },
      'that-lung': { at: [0.035, 0.33, 0], dir: [0, 0, 1] },
      'song-lung': { at: [0, 0.12, 0], dir: [0, 0, -1] },
    },
  },
};

/** Vertex neighbour lists in CSR form (`neighbours[start[v]..start[v + 1]]`), from triangle edges. */
function buildNeighbours(count: number, indices: ArrayLike<number>) {
  const degree = new Uint32Array(count + 1);
  for (let i = 0; i < indices.length; i += 3) {
    for (let k = 0; k < 3; k++) degree[indices[i + k]] += 2;
  }
  const start = new Uint32Array(count + 1);
  for (let v = 0; v < count; v++) start[v + 1] = start[v] + degree[v];
  const fill = start.slice(0, count);
  const neighbours = new Uint32Array(start[count]);
  for (let i = 0; i < indices.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const a = indices[i + k];
      neighbours[fill[a]++] = indices[i + (k + 1) % 3];
      neighbours[fill[a]++] = indices[i + (k + 2) % 3];
    }
  }
  return { start, neighbours };
}

/** Majority vote over mesh neighbours: removes single-vertex specks and spikes along region borders. */
function smoothRoles(roles: Uint8Array, indices: ArrayLike<number>, roleCount: number, iterations: number): Uint8Array {
  const count = roles.length;
  // Shared edges appear once per triangle, so they simply weigh more.
  const { start, neighbours } = buildNeighbours(count, indices);
  let current = roles;
  const votes = new Uint16Array(roleCount);
  for (let pass = 0; pass < iterations; pass++) {
    const next = new Uint8Array(count);
    for (let v = 0; v < count; v++) {
      votes.fill(0);
      votes[current[v]] += 2;
      for (let n = start[v]; n < start[v + 1]; n++) votes[current[neighbours[n]]] += 1;
      let best = current[v];
      for (let r = 0; r < roleCount; r++) if (votes[r] > votes[best]) best = r;
      next[v] = best;
    }
    current = next;
  }
  return current;
}

/**
 * Gives the mesh front/back projected UVs. Each triangle belongs to the side its centre is on, and
 * vertices shared across that seam are duplicated, so no triangle stretches between the two halves of
 * the texture (which would smear whatever lies between them across the sides). Returns the roles
 * extended to the new vertices.
 */
function generateMeshyUvs(mesh: Mesh, halfWidth: number, roles: Uint8Array): Uint8Array {
  const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
  const indices = mesh.getIndices();
  if (!positions || !indices) return roles;
  const count = positions.length / 3;
  const triangleFront = new Uint8Array(indices.length / 3);
  const usedFront = new Uint8Array(count);
  const usedBack = new Uint8Array(count);
  for (let t = 0; t < triangleFront.length; t++) {
    const [a, b, c] = [indices[t * 3], indices[t * 3 + 1], indices[t * 3 + 2]];
    // The visible front of these Meshy files has positive local Z.
    const front = positions[a * 3 + 2] + positions[b * 3 + 2] + positions[c * 3 + 2] >= 0;
    triangleFront[t] = front ? 1 : 0;
    for (const v of [a, b, c]) (front ? usedFront : usedBack)[v] = 1;
  }
  const backCopy = new Int32Array(count).fill(-1);
  let total = count;
  for (let v = 0; v < count; v++) if (usedFront[v] && usedBack[v]) backCopy[v] = total++;

  const newPositions = new Float32Array(total * 3);
  newPositions.set(positions);
  const newRoles = new Uint8Array(total);
  newRoles.set(roles);
  const isFront = new Uint8Array(total);
  for (let v = 0; v < count; v++) {
    isFront[v] = usedFront[v];
    const copy = backCopy[v];
    if (copy < 0) continue;
    newPositions.set(positions.slice(v * 3, v * 3 + 3), copy * 3);
    newRoles[copy] = roles[v];
  }
  const newIndices = new Uint32Array(indices.length);
  for (let i = 0; i < indices.length; i++) {
    const v = indices[i];
    newIndices[i] = !triangleFront[Math.floor(i / 3)] && backCopy[v] >= 0 ? backCopy[v] : v;
  }

  const uvs = new Float32Array(total * 2);
  for (let v = 0; v < total; v++) {
    const x = Math.max(0, Math.min(1, (newPositions[v * 3] + halfWidth) / (halfWidth * 2)));
    const y = Math.max(0, Math.min(1, (newPositions[v * 3 + 1] + 0.96) / 1.92));
    // The back half is mirrored so anything drawn there reads correctly when seen from behind.
    uvs[v * 2] = isFront[v] ? 0.575 + x * 0.35 : 0.125 + (1 - x) * 0.35;
    uvs[v * 2 + 1] = y;
  }
  mesh.setVerticesData(VertexBuffer.PositionKind, newPositions);
  mesh.setIndices(newIndices, total);
  mesh.setVerticesData(VertexBuffer.UVKind, uvs);
  mesh.refreshBoundingInfo();
  return newRoles;
}

function assignMeshyMaterials(mesh: Mesh, roles: Uint8Array, materials: StandardMaterial[], scene: Scene) {
  const indices = mesh.getIndices();
  if (!indices) return;
  const groups: number[][] = Array.from({ length: materials.length }, () => []);
  for (let i = 0; i < indices.length; i += 3) {
    const a = roles[indices[i]];
    const b = roles[indices[i + 1]];
    const c = roles[indices[i + 2]];
    const role = a === b || a === c ? a : b === c ? b : 0;
    groups[role].push(indices[i], indices[i + 1], indices[i + 2]);
  }
  mesh.setIndices(groups.flat());
  const multi = new MultiMaterial('meshy-vung-chat-lieu', scene);
  multi.subMaterials = materials;
  mesh.material = multi;
  mesh.subMeshes = [];
  let offset = 0;
  for (let role = 0; role < groups.length; role++) {
    const length = groups[role].length;
    if (length) new SubMesh(role, 0, mesh.getTotalVertices(), offset, length, mesh);
    offset += length;
  }
}

/** Moves a rough point onto the outermost surface along `dir`: the vertex furthest out within 12 mm of that line. */
function snapToSurface(positions: ArrayLike<number>, spec: HotspotSpec): Vector3 {
  const at = Vector3.FromArray(spec.at);
  const dir = Vector3.FromArray(spec.dir).normalize();
  let best: Vector3 | null = null;
  let bestAlong = -Infinity;
  const p = new Vector3();
  for (let i = 0; i < positions.length; i += 3) {
    p.set(positions[i] - at.x, positions[i + 1] - at.y, positions[i + 2] - at.z);
    const along = Vector3.Dot(p, dir);
    const perpendicular = p.subtract(dir.scale(along)).length();
    if (perpendicular < 0.012 && along > bestAlong) {
      bestAlong = along;
      best = new Vector3(positions[i], positions[i + 1], positions[i + 2]);
    }
  }
  // Sit just above the cloth so the marker isn't half inside it.
  return (best ?? at).add(dir.scale(0.004));
}

/** `onLoadingChange` reports when a detailed GLB starts and finishes loading. */
export function createFashionStage(canvas: HTMLCanvasElement, onLoadingChange?: (loading: boolean) => void): FashionStage {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, alpha: true }, true);
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0, 0, 0, 0);
  const camera = new ArcRotateCamera('xoay-trang-phuc', -Math.PI / 2 + 0.34, Math.PI / 2.14, 7.25, new Vector3(0, 2.4, 0), scene);
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 2.6;
  camera.upperRadiusLimit = 9.3;
  camera.lowerBetaLimit = 0.82;
  camera.upperBetaLimit = 2.08;
  camera.wheelPrecision = 65;
  camera.panningSensibility = 0;
  camera.useAutoRotationBehavior = false;

  const ambient = new HemisphericLight('anh-sang-mem', new Vector3(0, 1, 0), scene);
  ambient.intensity = 0.78;
  ambient.groundColor = Color3.FromHexString('#c4b7a4');
  const key = new DirectionalLight('anh-sang-chinh', new Vector3(-0.5, -1.1, 0.6), scene);
  key.position = new Vector3(3, 8, -5);
  key.intensity = 0.72;
  const fill = new DirectionalLight('anh-sang-phu', new Vector3(0.5, -0.4, -0.8), scene);
  fill.intensity = 0.26;

  const skin = material(scene, 'be-mat-mannequin', '#c9b9a2', '#242424');
  const hair = material(scene, 'kim-loai-mannequin', '#8a765f', '#454039');
  const pants = material(scene, 'quan', '#f1e9d7', '#55524d');
  const shoes = material(scene, 'giay', '#69594e', '#3f3d39');
  shoes.specularPower = 60;
  const trim = material(scene, 'vien-ao', '#dcc292', '#8d805e');

  const avatar = createAvatar(scene, pants, skin, hair, shoes);
  const plainWeave = createPatternTexture(scene, 'plain-weave', 512);
  const garments: Record<ProceduralGarmentId, GarmentParts> = {
    'ao-dai': makeGarment(scene, 'ao-dai', plainWeave),
  };
  // Everything that turns together during a spin; the pedestal and lights stay put.
  const figure = new TransformNode('nhan-vat-chuyen-dong', scene);
  // Filled in as each detailed GLB loads.
  const anchors: Partial<Record<GarmentId, HotspotAnchor[]>> = {};
  avatar.parent = figure;
  for (const garment of Object.values(garments)) garment.root.parent = figure;
  const detailed: Partial<Record<GarmentId, DetailedModel>> = {};
  const loading = new Map<GarmentId, Promise<void>>();
  const failed = new Set<GarmentId>();
  let pending = 0;
  let activeLook: Look | null = null;
  let lastGarment: GarmentId | null = null;
  let disposed = false;
  const loaderReady = import('@babylonjs/loaders/glTF/2.0');

  function loadDetailed(id: GarmentId): Promise<void> {
    const config = DETAILED_MODELS[id];
    if (!config) return Promise.resolve();
    const existing = loading.get(id);
    if (existing) return existing;
    pending += 1;
    onLoadingChange?.(true);
    const promise = loaderReady.then(() => {
      if (disposed) return null;
      return SceneLoader.ImportMeshAsync('', '/models/', config.file, scene);
    }).then((result) => {
      if (!result) return;
      if (disposed) {
        result.meshes.forEach((mesh) => mesh.dispose());
        return;
      }
      const imported = result.meshes.find((mesh): mesh is Mesh => mesh instanceof Mesh && mesh.getTotalVertices() > 0);
      if (!imported) return;
      imported.scaling.setAll(2.35);
      imported.position.y = 2.35;
      const positions = imported.getVerticesData(VertexBuffer.PositionKind) ?? [];
      const meshIndices = imported.getIndices() ?? [];
      const smoothed = smoothRoles(config.roles(positions, meshIndices), meshIndices, 4 + config.accentColors.length, 6);
      const roles = generateMeshyUvs(imported, config.atlas.halfWidth, smoothed);
      const patternTexture = createPatternTexture(scene, `${id}-meshy-pattern`, 1024, config.atlas);
      const coatMat = material(scene, `${id}-meshy-ao`, '#ffffff', '#353535');
      coatMat.diffuseTexture = patternTexture;
      const lowerMaterial = material(scene, `${id}-meshy-duoi`, '#f1e9d7', '#353535');
      const accentMaterials = config.accentColors.map((_, index) => material(scene, `${id}-meshy-phu-${index}`, '#ffffff', '#2a2a2a'));
      assignMeshyMaterials(imported, roles, [
        coatMat,
        lowerMaterial,
        material(scene, `${id}-meshy-da`, '#d2bba3', '#353535'),
        material(scene, `${id}-meshy-giay`, '#73655a', '#353535'),
        ...accentMaterials,
      ], scene);
      const root = result.meshes[0] as Mesh;
      root.parent = figure;
      root.setEnabled(false);
      detailed[id] = { root, lowerMaterial, accentMaterials, patternTexture, lastPatternKey: '' };
      anchors[id] = Object.entries(config.hotspots).map(([hotspotId, spec]) => ({
        id: hotspotId,
        node: imported,
        point: snapToSurface(positions, spec),
        normal: Vector3.FromArray(spec.dir).normalize(),
      }));
      if (activeLook?.garmentId === id) {
        applyLook(activeLook);
        setView('front');
      }
    }).catch((error) => {
      if (disposed) return;
      console.warn(`Không thể tải mô hình ${config.file}.`, error);
      failed.add(id);
      if (activeLook?.garmentId === id) applyLook(activeLook);
    }).finally(() => {
      pending -= 1;
      if (!disposed && pending === 0) onLoadingChange?.(false);
    });
    loading.set(id, promise);
    return promise;
  }

  // The default garment loads right away; others load the first time they are picked.
  loadDetailed('ao-dai');

  // Dark lacquer pedestal with a gold rim, matching the sơn mài stage behind the canvas.
  const platformMat = material(scene, 'be-trung-bay', '#4a372b', '#2a2420');
  const platform = MeshBuilder.CreateCylinder('san-khau', { height: 0.16, diameter: 3.3, tessellation: 64 }, scene);
  platform.position.y = 0.02;
  platform.material = platformMat;
  const platformEdge = MeshBuilder.CreateTorus('vien-san-khau', { diameter: 3.22, thickness: 0.018, tessellation: 64 }, scene);
  platformEdge.position.y = 0.11;
  platformEdge.material = trim;
  const floorShadow = material(scene, 'bong-do', '#120c09');
  floorShadow.alpha = 0.32;
  const shadow = MeshBuilder.CreateDisc('bong-nhan-vat', { radius: 0.72, tessellation: 40 }, scene);
  shadow.rotation.x = Math.PI / 2;
  shadow.position.y = 0.105;
  shadow.material = floorShadow;

  let spinning = false;

  function setSpinning(on: boolean) {
    // Bring the accumulated turn back to (-π, π] so stopping eases the short way to the front.
    const turn = Math.PI * 2;
    figure.rotation.y = ((figure.rotation.y % turn) + turn * 1.5) % turn - Math.PI;
    spinning = on;
  }

  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    if (spinning) {
      figure.rotation.y += dt * 0.75;
    } else if (figure.rotation.y !== 0) {
      // Ease back to facing front after a spin stops.
      figure.rotation.y *= Math.exp(-dt * 6);
      if (Math.abs(figure.rotation.y) < 1e-4) figure.rotation.y = 0;
    }
  });

  function applyLook(look: Look) {
    activeLook = look;
    const patternKey = JSON.stringify([look.patternId, look.patternDesign, look.coatColor, look.pantsColor, look.yemColor, look.sashColor]);
    loadDetailed(look.garmentId);
    const model = detailed[look.garmentId];
    // Garments without a procedural fallback (tứ thân) show nothing until their GLB arrives,
    // and just the mannequin if it fails to load.
    const hasProcedural = look.garmentId in garments;
    avatar.setEnabled(!model && (hasProcedural || failed.has(look.garmentId)));
    for (const [id, item] of Object.entries(detailed) as [GarmentId, DetailedModel][]) item.root.setEnabled(id === look.garmentId);
    if (model) {
      model.lowerMaterial.diffuseColor = Color3.FromHexString(look.pantsColor);
      DETAILED_MODELS[look.garmentId]?.accentColors.forEach((color, index) => {
        model.accentMaterials[index].diffuseColor = Color3.FromHexString(color(look));
      });
      if (model.lastPatternKey !== patternKey) {
        paintPattern(model.patternTexture, look, DETAILED_MODELS[look.garmentId]?.atlas);
        model.lastPatternKey = patternKey;
      }
    }
    for (const [id, garment] of Object.entries(garments) as [ProceduralGarmentId, GarmentParts][]) {
      garment.root.setEnabled(id === look.garmentId && !model);
      garment.baseFabric.diffuseColor = Color3.FromHexString(look.coatColor);
      if (garment.lastPatternKey !== patternKey) {
        paintPattern(garment.patternTexture, look);
        garment.lastPatternKey = patternKey;
      }
    }
    pants.diffuseColor = Color3.FromHexString(look.pantsColor);
    if (lastGarment !== look.garmentId) {
      lastGarment = look.garmentId;
      setView('front');
    }
  }

  type CameraPose = { alpha: number; beta: number; radius: number; target: Vector3 };
  let flight: { from: CameraPose; to: CameraPose; t: number } | null = null;

  /** Eases the camera to a pose; any drag or scroll by the viewer takes over immediately. */
  function flyTo(to: CameraPose) {
    const from = { alpha: camera.alpha, beta: camera.beta, radius: camera.radius, target: camera.target.clone() };
    // Go the short way round.
    const turn = Math.PI * 2;
    to.alpha = from.alpha + ((((to.alpha - from.alpha) % turn) + turn * 1.5) % turn - Math.PI);
    flight = { from, to, t: 0 };
  }

  scene.onPointerObservable.add((info) => {
    if (info.type === PointerEventTypes.POINTERDOWN || info.type === PointerEventTypes.POINTERWHEEL) flight = null;
  });

  scene.onBeforeRenderObservable.add(() => {
    if (!flight) return;
    flight.t = Math.min(1, flight.t + engine.getDeltaTime() / 750);
    const k = flight.t < 0.5 ? 4 * flight.t ** 3 : 1 - (-2 * flight.t + 2) ** 3 / 2;
    const { from, to } = flight;
    camera.alpha = from.alpha + (to.alpha - from.alpha) * k;
    camera.beta = from.beta + (to.beta - from.beta) * k;
    camera.radius = from.radius + (to.radius - from.radius) * k;
    camera.setTarget(Vector3.Lerp(from.target, to.target, k), false, false, true);
    if (flight.t >= 1) flight = null;
  });

  function setView(view: 'front' | 'back' | 'detail') {
    // Meshy models face +Z; the procedural ones face -Z.
    const frontAlpha = activeLook && detailed[activeLook.garmentId] ? Math.PI / 2 : -Math.PI / 2;
    if (view === 'detail') flyTo({ alpha: frontAlpha, beta: 1.43, radius: 4.45, target: new Vector3(0, 3.25, 0) });
    else flyTo({ alpha: view === 'front' ? frontAlpha : -frontAlpha, beta: Math.PI / 2.14, radius: 7.25, target: new Vector3(0, 2.4, 0) });
  }

  /** Where an anchor is in the world, and which way it faces. `rest` ignores the figure's current spin. */
  function anchorWorld(anchor: HotspotAnchor, rest = false) {
    const matrix = anchor.node.computeWorldMatrix();
    const point = Vector3.TransformCoordinates(anchor.point, matrix);
    const normal = Vector3.TransformNormal(anchor.normal, matrix).normalize();
    if (!rest || !figure.rotation.y) return { point, normal };
    const undo = Matrix.RotationY(-figure.rotation.y);
    return { point: Vector3.TransformCoordinates(point, undo), normal: Vector3.TransformNormal(normal, undo) };
  }

  function focusHotspot(id: string | null, shift = { x: 0, y: 0 }) {
    const anchor = id && activeLook ? anchors[activeLook.garmentId]?.find((item) => item.id === id) : undefined;
    if (!anchor) {
      setView('front');
      return;
    }
    setSpinning(false);
    const { point, normal } = anchorWorld(anchor, true);
    const flat = Math.hypot(normal.x, normal.z) || 1;
    const alpha = Math.atan2(normal.z / flat, normal.x / flat);
    const radius = 3.1;
    // Move the look-at point away from the spot so the spot lands where `shift` asks.
    const halfHeight = radius * Math.tan(camera.fov / 2);
    const halfWidth = halfHeight * engine.getAspectRatio(camera);
    const forward = new Vector3(-Math.cos(alpha), 0, -Math.sin(alpha));
    const right = Vector3.Cross(Vector3.Up(), forward).normalize();
    const target = point
      .subtract(right.scale(shift.x * halfWidth))
      .subtract(Vector3.Up().scale(shift.y * halfHeight));
    // Look slightly down at the spot.
    flyTo({ alpha, beta: Math.PI / 2 - 0.12, radius, target });
  }

  let hotspotListener: ((spots: HotspotScreen[]) => void) | null = null;
  const toCamera = new Vector3();
  scene.onAfterRenderObservable.add(() => {
    if (!hotspotListener) return;
    // Hidden garments' anchors drop out through isEnabled() below.
    const list = activeLook ? anchors[activeLook.garmentId] ?? [] : [];
    const width = engine.getRenderWidth();
    const height = engine.getRenderHeight();
    const viewport = camera.viewport.toGlobal(width, height);
    const transform = scene.getTransformMatrix();
    hotspotListener(list.map((anchor) => {
      const { point, normal } = anchorWorld(anchor);
      camera.globalPosition.subtractToRef(point, toCamera);
      const facing = Vector3.Dot(normal, toCamera.normalize());
      const screen = Vector3.Project(point, Matrix.IdentityReadOnly, transform, viewport);
      const enabled = anchor.node.isEnabled();
      return {
        id: anchor.id,
        x: screen.x / width,
        y: screen.y / height,
        visible: enabled && !spinning && facing > 0.25 && screen.z > 0 && screen.z < 1,
      };
    }));
  });


  engine.runRenderLoop(() => scene.render());
  return {
    scene,
    engine,
    camera,
    applyLook,
    setView,
    setSpinning,
    focusHotspot,
    onHotspots: (listener) => { hotspotListener = listener; },
    dispose: () => { disposed = true; scene.dispose(); engine.dispose(); },
  };
}
