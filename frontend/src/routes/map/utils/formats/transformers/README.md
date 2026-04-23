# Format Transformers

Shared conversion code lives here when it is not owned by a single format.

Keep format entry points such as `kml.ts`, `gml.ts`, `geotiff/`, and `gpkg/` in `utils/formats/`.
Move only reusable conversions here, for example geometry conversion or common vector
normalization. Raster-specific helpers live in `utils/formats/raster/`.
