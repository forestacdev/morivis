# Vendored opencadkernel

Upstream: https://github.com/HakanSeven12/opencadkernel

Revision: `ae28f669f8a5673585c2c5c5b3617876c8b7bf98`

License: MPL-2.0; see LICENSE. The source and original copyright notices are retained.

This directory contains the upstream crate's `src/`, `Cargo.toml`, and LICENSE.
The workspace entry for the separate constraints crate was removed from Cargo.toml.

Local changes:

- `src/brep/mesh.rs`: `rotate_periodic_rim` snaps a value just above the seam to the same exact seam as a value just below the end of the period. Both use the existing roundoff bound. Otherwise one rim can start a fraction later than the other and `separated_rim_order` incorrectly rejects a valid cylinder.
- `src/brep/geometry.rs`: compare torus inverse-projection residuals in the local frame so a large translation does not choose the wrong sheet near a pole.
- `src/brep/mesh.rs`: stop normal-driven edge refinement once all probes fit inside the linear tolerance; infer an ambiguous torus longitude from neighboring samples; preserve both parameter-space corners at a collapsed pole, including the closing join.
- `src/brep/mesh.rs`: an oppositely traversed seam without pcurves is not a trimming side of a periodic band, even when the seam itself is curved.
- `src/acis/lift.rs`: preserve exact stored/domain spline endpoints when they fit the topological vertex better than numerical projection.
- `src/acis/lift.rs`: retain elliptical cone/cylinder ratios using exact rational quadratic sections, with finite axial bounds from source control hulls. Reproject trims whose angular parameters no longer apply.
- `src/geom2d/constrained.rs`: index ray-crossing edges by height (up to 64 bins) so repeated inside/outside queries retain the same even-odd test without scanning every trim edge.
- `src/geom2d/constrained.rs`: split crossing NURBS trim constraints using Spade and preserve their even-odd regions; distinguish shared boundary constraints from refinable interior grid lines.
- `src/brep/mesh.rs`: separate paired seams from multi-edge periodic rims; coalesce parameter differences only within world-coordinate roundoff; reject zero-width parameter slivers; verify geometric chord error where normal angles are unstable. Boundary refinement requires probes to stay within the original sampled 3D outline's linear tolerance.
- `src/brep/mesh.rs`: start dense NURBS faces from knot lines, using local subdivisions rather than a dense Cartesian product of normal probes. The per-face subdivision budget scales with the source control-net size (16 additions per control point, bounded between 262,144 and 1,048,576); small surfaces keep the original limit.
- `src/brep/mesh.rs`: reuse successful triangle checks only while all parameter corners and boundary-constraint flags are unchanged; discard stale results on each refinement pass.
- `src/brep/near.rs`: expose the existing point-to-triangle distance helper within the crate for chord checks.
- A synthetic unit regression exercises two slanted rims with a `1e-13` parameter offset and checks coverage of the complete period and unchanged positions within floating-point precision.

The bridge adds synthetic horn patches, a bent periodic tube, planar slits, crossing curved boundaries and microscopic collapsed trims, with area, projection and rejection checks. Kernel regressions also cover elliptical sections, grid constraints and geometric chord error.

Run the kernel tests through the bridge lockfile:

```sh
cargo test --locked --release --manifest-path tools/dwg-acis/Cargo.toml -p opencadkernel --lib
```

Keep the upstream source otherwise unchanged; review changes against the pinned revision when updating it.
