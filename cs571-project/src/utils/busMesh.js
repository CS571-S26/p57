/**
 * Procedural bus mesh for SimpleMeshLayer.
 *
 * The mesh is a simple cuboid sized like a real Madison Metro bus
 * (12m long × 3m wide × 3m tall). Length runs along +X so the layer's
 * `getOrientation` accessor can rotate it around the vertical Z axis to
 * face the GTFS-RT bearing.
 *
 * We avoid loading a remote glTF — both for reliability (no network
 * round-trip on every page load) and so the mesh swap is cache-busting
 * across deploys.
 */
const L = 6;   // half-length (meters)
const W = 1.5; // half-width
const H = 3;   // total height

const positions = new Float32Array([
  // bottom face (z = 0)
  -L, -W, 0,
   L, -W, 0,
   L,  W, 0,
  -L,  W, 0,
  // top face (z = H)
  -L, -W, H,
   L, -W, H,
   L,  W, H,
  -L,  W, H,
]);

const indices = new Uint16Array([
  // bottom (looking down)
  0, 2, 1,  0, 3, 2,
  // top (looking up)
  4, 5, 6,  4, 6, 7,
  // front (+X) — windscreen
  1, 2, 6,  1, 6, 5,
  // back (-X)
  0, 4, 7,  0, 7, 3,
  // left (-Y)
  0, 1, 5,  0, 5, 4,
  // right (+Y)
  3, 7, 6,  3, 6, 2,
]);

// Per-vertex normals (flat-shaded). Each face's vertices share its normal,
// but since we're reusing 8 corners across 6 faces we just point each corner
// outward — good enough for a stylized bus.
const normals = new Float32Array([
  -1, -1, -1,   1, -1, -1,   1,  1, -1,  -1,  1, -1,
  -1, -1,  1,   1, -1,  1,   1,  1,  1,  -1,  1,  1,
]);

export const BUS_MESH = { positions, indices, normals };
