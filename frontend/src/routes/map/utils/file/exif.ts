//TODO
import * as exifr from 'exifr';

// only GPS
let { latitude, longitude } = await exifr.gps('./myimage.jpg');
// only orientation
// let num = await exifr.orientation(blob);
// // only three tags
// let output = await exifr.parse(file, ['ISO', 'Orientation', 'LensModel']);
// // only XMP segment (and disabled TIFF which is enabled by default)
// let output = await exifr.parse(file, { tiff: false, xmp: true });
