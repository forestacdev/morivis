precision mediump float;

uniform sampler2D heightMap;
uniform sampler2D normalMap;
uniform vec3 lightPos;
uniform vec3 viewPos;
uniform vec2 resolution;

const float waterLevel = 0.5; // 水面レベルの閾値
const float shininess = 32.0; // 光沢度

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    float height = texture2D(heightMap, uv).r;
    
    // 1. 法線マップの適用
    vec3 normal = texture2D(normalMap, uv).rgb;
    normal = normalize(normal * 2.0 - 1.0);
    
    vec3 iceColor = vec3(0.8, 0.9, 1.0);
    vec3 waterColor = vec3(0.0, 0.2, 0.5);
    
    // 高さに基づいて色を選択
    vec3 color = mix(waterColor, iceColor, smoothstep(waterLevel - 0.1, waterLevel + 0.1, height));
    
    // 水面下の氷山部分を少し暗くする
    if (height < waterLevel) {
        color *= 0.7;
    }
    
    // 2. スペキュラ反射の計算
    vec3 lightDir = normalize(lightPos - vec3(uv, height));
    vec3 viewDir = normalize(viewPos - vec3(uv, height));
    vec3 halfwayDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(normal, halfwayDir), 0.0), shininess);
    vec3 specular = vec3(0.3) * spec; // スペキュラ強度
    
    // 3. フレネル効果
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 5.0);
    vec3 fresnelColor = mix(color, vec3(1.0), fresnel * 0.5);
    
    // 最終的な色の計算
    vec3 finalColor = fresnelColor + specular;
    
    gl_FragColor = vec4(finalColor, 1.0);
}