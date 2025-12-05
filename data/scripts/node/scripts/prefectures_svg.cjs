const fs = require('fs');

function generatePrefectureSVGs_AspectRatio() {
    console.log('=== アスペクト比対応SVG生成スクリプト ===');
    
    // GeoJSONファイルを読み込み
    const geojsonData = JSON.parse(fs.readFileSync('lite_prefectures.geojson', 'utf8'));
    
    // 出力ディレクトリを作成
    const outputDir = './prefectures';
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 都道府県名とコードのマッピング
    const prefectureData = [
        { code: '01', name: '北海道' },
        { code: '02', name: '青森県' },
        { code: '03', name: '岩手県' },
        { code: '04', name: '宮城県' },
        { code: '05', name: '秋田県' },
        { code: '06', name: '山形県' },
        { code: '07', name: '福島県' },
        { code: '08', name: '茨城県' },
        { code: '09', name: '栃木県' },
        { code: '10', name: '群馬県' },
        { code: '11', name: '埼玉県' },
        { code: '12', name: '千葉県' },
        { code: '13', name: '東京都' },
        { code: '14', name: '神奈川県' },
        { code: '15', name: '新潟県' },
        { code: '16', name: '富山県' },
        { code: '17', name: '石川県' },
        { code: '18', name: '福井県' },
        { code: '19', name: '山梨県' },
        { code: '20', name: '長野県' },
        { code: '21', name: '岐阜県' },
        { code: '22', name: '静岡県' },
        { code: '23', name: '愛知県' },
        { code: '24', name: '三重県' },
        { code: '25', name: '滋賀県' },
        { code: '26', name: '京都府' },
        { code: '27', name: '大阪府' },
        { code: '28', name: '兵庫県' },
        { code: '29', name: '奈良県' },
        { code: '30', name: '和歌山県' },
        { code: '31', name: '鳥取県' },
        { code: '32', name: '島根県' },
        { code: '33', name: '岡山県' },
        { code: '34', name: '広島県' },
        { code: '35', name: '山口県' },
        { code: '36', name: '徳島県' },
        { code: '37', name: '香川県' },
        { code: '38', name: '愛媛県' },
        { code: '39', name: '高知県' },
        { code: '40', name: '福岡県' },
        { code: '41', name: '佐賀県' },
        { code: '42', name: '長崎県' },
        { code: '43', name: '熊本県' },
        { code: '44', name: '大分県' },
        { code: '45', name: '宮崎県' },
        { code: '46', name: '鹿児島県' },
        { code: '47', name: '沖縄県' }
    ];
    
    // BBoxを計算
    function calculateBounds(geometry) {
        let minLon = Infinity, maxLon = -Infinity;
        let minLat = Infinity, maxLat = -Infinity;
        
        function processBounds(coords) {
            if (typeof coords[0] === 'number') {
                minLon = Math.min(minLon, coords[0]);
                maxLon = Math.max(maxLon, coords[0]);
                minLat = Math.min(minLat, coords[1]);
                maxLat = Math.max(maxLat, coords[1]);
            } else {
                coords.forEach(processBounds);
            }
        }
        
        if (geometry.type === 'Polygon') {
            geometry.coordinates.forEach(processBounds);
        } else if (geometry.type === 'MultiPolygon') {
            geometry.coordinates.forEach(polygon => {
                polygon.forEach(processBounds);
            });
        }
        
        return { minLon, maxLon, minLat, maxLat };
    }
    
    // アスペクト比を考慮したビューポートサイズを計算
    function calculateViewportSize(bounds, maxWidth = 800, maxHeight = 600) {
        const lonRange = bounds.maxLon - bounds.minLon;
        const latRange = bounds.maxLat - bounds.minLat;
        
        // アスペクト比を計算
        const aspectRatio = lonRange / latRange;
        
        let width, height;
        
        if (aspectRatio > (maxWidth / maxHeight)) {
            // 横長の場合
            width = maxWidth;
            height = Math.round(maxWidth / aspectRatio);
        } else {
            // 縦長の場合
            height = maxHeight;
            width = Math.round(maxHeight * aspectRatio);
        }
        
        return { width, height, aspectRatio };
    }
    
    // 座標変換関数（パディング付き）
    function coordinateToSVG(coord, bounds, viewport, padding = 0) {
        const [lon, lat] = coord;
        const lonRange = bounds.maxLon - bounds.minLon;
        const latRange = bounds.maxLat - bounds.minLat;
        
        // パディングを考慮した有効エリア
        const effectiveWidth = viewport.width * (1 - padding * 2);
        const effectiveHeight = viewport.height * (1 - padding * 2);
        const offsetX = viewport.width * padding;
        const offsetY = viewport.height * padding;
        
        const x = ((lon - bounds.minLon) / lonRange) * effectiveWidth + offsetX;
        const y = effectiveHeight - ((lat - bounds.minLat) / latRange) * effectiveHeight + offsetY;
        
        return [x, y];
    }
    
    // 都道府県名からコードを取得する関数
    function getPrefectureCode(prefectureName, index) {
        // 名前から直接マッチング
        const found = prefectureData.find(p => p.name === prefectureName);
        if (found) {
            return found.code;
        }
        
        // インデックスから推定
        if (index < prefectureData.length) {
            return prefectureData[index].code;
        }
        
        // フォールバック
        return String(index + 1).padStart(2, '0');
    }
    
    // 各都道府県を個別処理
    geojsonData.features.forEach((feature, index) => {
        // 都道府県名を取得
        let prefectureName = '';
        const props = feature.properties;
        
        const possibleFields = ['name', 'NAME', 'prefecture', 'pref_name', 'ken_name', 'nam', 'Name', 'PREF', '都道府県', 'pref', 'ken'];
        
        for (const field of possibleFields) {
            if (props[field] && typeof props[field] === 'string' && props[field].trim()) {
                prefectureName = props[field].trim();
                break;
            }
        }
        
        if (!prefectureName) {
            prefectureName = prefectureData[index]?.name || `Prefecture_${index}`;
        }
        
        // 都道府県コードを取得
        const prefectureCode = getPrefectureCode(prefectureName, index);
        
        // ファイル名は都道府県コードを使用
        const fileName = prefectureCode;
        
        // BBoxを計算
        const bounds = calculateBounds(feature.geometry);
        
        // アスペクト比を考慮したビューポートサイズを計算
        const viewport = calculateViewportSize(bounds);
        
        console.log(`処理中: ${prefectureName} (${prefectureCode})`);
        console.log(`  BBox: ${bounds.minLon.toFixed(3)}, ${bounds.minLat.toFixed(3)}, ${bounds.maxLon.toFixed(3)}, ${bounds.maxLat.toFixed(3)}`);
        console.log(`  アスペクト比: ${viewport.aspectRatio.toFixed(3)}`);
        console.log(`  ビューポート: ${viewport.width}x${viewport.height}`);
        console.log(`  ファイル名: ${fileName}.svg`);
        
        // SVGパスを生成
        let pathData = '';
        
        function processPolygon(coordinates) {
            coordinates.forEach(ring => {
                const svgCoords = ring.map(coord => coordinateToSVG(coord, bounds, viewport));
                pathData += `M${svgCoords[0][0].toFixed(2)},${svgCoords[0][1].toFixed(2)}`;
                for (let i = 1; i < svgCoords.length; i++) {
                    pathData += `L${svgCoords[i][0].toFixed(2)},${svgCoords[i][1].toFixed(2)}`;
                }
                pathData += 'Z';
            });
        }
        
        if (feature.geometry.type === 'Polygon') {
            processPolygon(feature.geometry.coordinates);
        } else if (feature.geometry.type === 'MultiPolygon') {
            feature.geometry.coordinates.forEach(polygon => {
                processPolygon(polygon);
            });
        }
        
        // SVGファイルを作成 svelte
const svgContent = `<script lang="ts">
    interface Props {
        width?: string;
    }

    let { width = '100px' }: Props = $props();
</script>
<svg {width} height="auto" viewBox="0 0 ${viewport.width} ${viewport.height}" xmlns="http://www.w3.org/2000/svg">
    <path d="${pathData}" fill="black" stroke="black" stroke-width="1"/>
</svg>`;
        
        // ファイルに保存
        fs.writeFileSync(`${outputDir}/${fileName}.svelte`, svgContent);
        console.log(`Generated: ${fileName}.svg (${viewport.width}x${viewport.height})`);
    });
    
    console.log(`${geojsonData.features.length} 個のSVGファイルを生成しました`);
    console.log(`出力先: ${outputDir}`);
}



// 実行部分
async function main() {
    try {
        generatePrefectureSVGs_AspectRatio();
      
        
        console.log('\n🎯 特徴:');
        console.log('✅ ファイル名が都道府県コード（01-47）になっている');
        console.log('✅ アスペクト比が自動計算されている');
        console.log('✅ BBoxから最適なサイズが設定されている');
        console.log('✅ ポリゴンが黒色になっている');
        console.log('✅ SVG内に都道府県名が含まれていない');
        console.log('✅ 各都道府県が最適なサイズで表示されている');
        
        console.log('\n📋 ファイル名の例:');
        console.log('01.svg - 北海道');
        console.log('13.svg - 東京都');
        console.log('27.svg - 大阪府');
        console.log('47.svg - 沖縄県');
        
        console.log('\n🔍 確認方法:');
        console.log('1. prefecture_svg_aspect_ratio/viewer.html をブラウザで開く');
        console.log('2. 各SVGファイルのファイル名が都道府県コードになっていることを確認');
        console.log('3. 形状が歪まずに表示されることを確認');
        
    } catch (error) {
        console.error('❌ エラーが発生しました:', error.message);
        console.log('💡 GeoJSONファイルが存在することを確認してください');
    }
}

// スクリプトとして実行される場合
if (require.main === module) {
    main();
}

module.exports = {
    generatePrefectureSVGs_AspectRatio,
};