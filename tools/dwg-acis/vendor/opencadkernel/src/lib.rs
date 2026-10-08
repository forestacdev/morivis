//! A geometry kernel for CAD work: 2D curve algebra with a B-rep solid layer
//! built on top of it.
//!
//! # Layering
//!
//! ```text
//! brep    owned mutable topology, SSI, boolean, blends       [feature = "brep"]
//!   │
//! geom2d  curves, intersection, offset, containment          [feature = "geom2d"]
//!   │
//! space   the plane a 2D curve lives on, and the map to it
//! ```
//!
//! The direction matters. Splitting a face during a boolean means projecting
//! the intersection curve into the face's `(u, v)` space and running a loop
//! boolean there — a 2D problem. The quality of [`geom2d`] therefore caps the
//! quality of [`brep`], and 2D is worth getting right first.
//!
//! # Coordinate policy
//!
//! Every entry point lifts its input into a local frame before doing any
//! math, and shifts results back to world coordinates on the way out. See
//! [`geom2d::frame`] for why this is an invariant rather than a convenience.
//!
//! ACIS record conversion is available separately through the `acis` feature.

#![cfg_attr(docsrs, feature(doc_cfg))]

/// Unconditional: a plane and a vector depend on nothing, and a caller
/// bridging a file format still has to say where a face's frame points.
pub mod space;

pub mod tessellation;

#[cfg(feature = "geom2d")]
pub mod geom2d;

#[cfg(feature = "brep")]
pub mod brep;

#[cfg(feature = "acis")]
pub mod acis;
