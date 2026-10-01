import type { GeoRefCorners } from '../homography';

export const testCorners: GeoRefCorners = [[-2, 2], [2, 2], [2, -2], [-2, -2]];
export const testSkewedCorners: GeoRefCorners = [[0, 3], [4, 2], [3, -1], [-1, 0]];
export const testScreenDiamond: GeoRefCorners = [[100, 20], [180, 100], [100, 180], [20, 100]];
