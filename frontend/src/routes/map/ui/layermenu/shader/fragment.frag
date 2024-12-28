precision mediump float;
uniform float u_height;
uniform int colorMap;

#pragma glslify: jet = require("glsl-colormap/jet")
#pragma glslify: hsv = require("glsl-colormap/hsv")
#pragma glslify: hot = require("glsl-colormap/hot")
#pragma glslify: cool = require("glsl-colormap/cool")
#pragma glslify: spring = require("glsl-colormap/spring")
#pragma glslify: summer = require("glsl-colormap/summer")
#pragma glslify: autumn = require("glsl-colormap/autumn")
#pragma glslify: winter = require("glsl-colormap/winter")
#pragma glslify: bone = require("glsl-colormap/bone")
#pragma glslify: copper = require("glsl-colormap/copper")
#pragma glslify: greys = require("glsl-colormap/greys")
#pragma glslify: yignbu = require("glsl-colormap/yignbu")
#pragma glslify: greens = require("glsl-colormap/greens")
#pragma glslify: yiorrd = require("glsl-colormap/yiorrd")
#pragma glslify: bluered = require("glsl-colormap/bluered")
#pragma glslify: rdbu = require("glsl-colormap/rdbu")
#pragma glslify: picnic = require("glsl-colormap/picnic")
#pragma glslify: rainbow = require("glsl-colormap/rainbow")
#pragma glslify: portland = require("glsl-colormap/portland")
#pragma glslify: blackbody = require("glsl-colormap/blackbody")
#pragma glslify: earth = require("glsl-colormap/earth")
#pragma glslify: electric = require("glsl-colormap/electric")
#pragma glslify: alpha = require("glsl-colormap/alpha")
#pragma glslify: viridis = require("glsl-colormap/viridis")
#pragma glslify: inferno = require("glsl-colormap/inferno")
#pragma glslify: magma = require("glsl-colormap/magma")
#pragma glslify: plasma = require("glsl-colormap/plasma")
#pragma glslify: warm = require("glsl-colormap/warm")
#pragma glslify: rainbowSoft = require("glsl-colormap/rainbow-soft")
#pragma glslify: bathymetry = require("glsl-colormap/bathymetry")
#pragma glslify: cdom = require("glsl-colormap/cdom")
#pragma glslify: chlorophyll = require("glsl-colormap/chlorophyll")
#pragma glslify: density = require("glsl-colormap/density")
#pragma glslify: freesurfaceBlue = require("glsl-colormap/freesurface-blue")
#pragma glslify: freesurfaceRed = require("glsl-colormap/freesurface-red")
#pragma glslify: oxygen = require("glsl-colormap/oxygen")
#pragma glslify: par = require("glsl-colormap/par")
#pragma glslify: phase = require("glsl-colormap/phase")
#pragma glslify: salinity = require("glsl-colormap/salinity")
#pragma glslify: temperature = require("glsl-colormap/temperature")
#pragma glslify: turbidity = require("glsl-colormap/turbidity")
#pragma glslify: velocityBlue = require("glsl-colormap/velocity-blue")
#pragma glslify: velocityGreen = require("glsl-colormap/velocity-green")
#pragma glslify: cubehelix = require("glsl-colormap/cubehelix")

vec4 applyColorMap(int type, float value) {
    if (type == 1) return jet(value);
    else if (type == 2) return hsv(value);
    else if (type == 3) return hot(value);
    else if (type == 4) return cool(value);
    else if (type == 5) return spring(value);
    else if (type == 6) return summer(value);
    else if (type == 7) return autumn(value);
    else if (type == 8) return winter(value);
    else if (type == 9) return bone(value);
    else if (type == 10) return copper(value);
    else if (type == 11) return greys(value);
    else if (type == 12) return yignbu(value);
    else if (type == 13) return greens(value);
    else if (type == 14) return yiorrd(value);
    else if (type == 15) return bluered(value);
    else if (type == 16) return rdbu(value);
    else if (type == 17) return picnic(value);
    else if (type == 18) return rainbow(value);
    else if (type == 19) return portland(value);
    else if (type == 20) return blackbody(value);
    else if (type == 21) return earth(value);
    else if (type == 22) return electric(value);
    else if (type == 23) return alpha(value);
    else if (type == 24) return viridis(value);
    else if (type == 25) return inferno(value);
    else if (type == 26) return magma(value);
    else if (type == 27) return plasma(value);
    else if (type == 28) return warm(value);
    else if (type == 29) return rainbowSoft(value);
    else if (type == 30) return bathymetry(value);
    else if (type == 31) return cdom(value);
    else if (type == 32) return chlorophyll(value);
    else if (type == 33) return density(value);
    else if (type == 34) return freesurfaceBlue(value);
    else if (type == 35) return freesurfaceRed(value);
    else if (type == 36) return oxygen(value);
    else if (type == 37) return par(value);
    else if (type == 38) return phase(value);
    else if (type == 39) return salinity(value);
    else if (type == 40) return temperature(value);
    else if (type == 41) return turbidity(value);
    else if (type == 42) return velocityBlue(value);
    else if (type == 43) return velocityGreen(value);
    else if (type == 44) return cubehelix(value);
    else return vec4(1.0, 0.0, 0.0, 1.0); // デフォルト値（赤色）
}


void main() {
    float x = gl_FragCoord.x / u_height;

    vec4 color = applyColorMap(colorMap, x);
    gl_FragColor = color;
}