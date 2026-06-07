/**
 * {@link image.ColorMapObject#colors}に指定する選択肢です。
 */
declare enum Colors {
    /**
     * 黒→白
     */
    GRAY = "gray",
    /**
     * 青→水色→緑→黄色→赤 (虹色)
     */
    JET = "jet",
    /**
     * 茶→緑
     */
    NDVI = "ndvi",
    /**
     * 赤→白→青
     */
    SMC = "smc",
    /**
     * 紺→白
     */
    IC = "ic"
}

/**
 * {@link ColorMap}の引数として使うオブジェクトです。
 */
interface ColorMapObject {
    /**
     * 数値範囲の下限を指定します。
     */
    min: number;
    /**
     * 数値範囲の上限を指定します。
     */
    max: number;
    /**
     * 色を指定します。{@link Colors}から選択するか、カラーコードの配列を指定します。カラーコードはRRGGBBまたはRRGGBBAAです。AAはアルファ成分で透明00～不透明FFを表します。
     * 指定しない場合は`colors: ["000000", "ffffff"]`の扱いになります。
     * @example
     * // Colorsから選択する場合
     * 	colors: je.Colors.JET,
     *
     * // カラーコードの配列を指定する場合
     * 	colors: ["ff0000", "ffffff", "0000ffcc"],	//赤→白→半透明な青
     */
    colors?: Colors | Array<string>;
    /**
     * 値の欠損などにより値が`NaN`になっているピクセルに塗る色をカラーコードで指定します。指定しない場合は透明`nanColor: "00000000"`の扱いになります。
     * @example
     * // NaNのピクセルを赤く塗る場合
     * 	nanColor: "ff0000",
     */
    nanColor?: string;
    /**
     * minに指定した値よりも小さな値のピクセルを透明にする場合にはtrueを指定します。falseの場合はminよりも小さな値のピクセルは全てminの色で塗ります。
     */
    deleteMin?: boolean;
    /**
     * maxに指定した値よりも大きな値のピクセルを透明にする場合にはtrueを指定します。falseの場合はmaxよりも大きな値のピクセルは全てmaxの色で塗ります。
     */
    deleteMax?: boolean;
    /**
     * 対数目盛にする場合にtrueを指定します。指定しない場合はfalseとして、等間隔の目盛りになります。
     */
    log?: boolean;
    /**
     * 対数目盛の原点を指定します。
     * @example
     * // -10～1000を対数目盛にする場合
     * 	min: -10,
     * 	max: 1000,
     * 	log: true,
     * 	logOrigin: -10,
     */
    logOrigin?: number;
    /**
     * グラデーションでは無く、離散的なカラーマップにする場合の分割数です。
     */
    step?: number;
}

/**
 * {@link data.DataObject | `DataObject`}を{@link ColorMap}の条件により可視化した画像の中間データです。RGBAの色成分を`Uint8ClampedArray`として格納しています。
 * ブラウザやDenoの環境で利用できる`ImageData`とほぼ同じものですが、`ImageData`が利用できないNode.jsやBunの環境でも統一的に使用できるように独自に定義しています。
 *
 * 実行環境に応じて、次の関数を用いて最終的な画像に変換します。
 * - {@link createCanvasByImageDataObject}（ブラウザのメインスレッド限定で、`HTMLCanvasElement`に変換する）
 * - {@link createOffscreenCanvasByImageDataObject}（ブラウザのメインスレッドまたはウェブワーカー限定で、`OffscreenCanvas`に変換する）
 * - {@link createPngUint8ArrayByImageDataObject}（ブラウザ、Node.js、Deno、BunでPNG画像の`Uint8Array`に変換する）
 *
 * ImageDataObjectが不要な場合は、次の関数を利用すると{@link data.DataObject | `DataObject`}と{@link ColorMap}から直接画像に変換可能です。
 * - {@link createCanvas}（ブラウザのメインスレッド限定で、`HTMLCanvasElement`に変換する）
 * - {@link createOffscreenCanvas}（ブラウザのメインスレッドまたはウェブワーカー限定で、`OffscreenCanvas`に変換する）
 * - {@link createPng}（ブラウザ、Node.js、Deno、BunでPNG画像の`Uint8Array`に変換する）
*/
interface ImageDataObject {
    /** 画像の幅(ピクセル数)です。 */
    width: number;
    /** 画像の高さ(ピクセル数)です。 */
    height: number;
    /** 各ピクセルの色をR(赤成分)→G(緑成分)→B(青成分)→A(アルファ成分)の順番で、画像の左上→右上、上→下へと順に格納した1次元配列(`Uint8ClampedArray`)です。配列の要素数は`width * height * 4`個です。 */
    data: Uint8ClampedArray;
}

/**
 * 可視化のためのカラーマップを作成します。
 * @example
 * import * as je from "./jaxa.earth.esm.js";
 *
 * // 0～6000を虹色に塗る場合
 * const cmap1 = new je.image.ColorMap({
 * 	min: 0,
 * 	max: 6000,
 * 	colors: je.Colors.JET,
 * });
 *
 * // 3000の値の色を取得
 * console.log(cmap1.getColor(3000)); //=> {r: 159, g: 246, b: 72, a: 255}
 * console.log(cmap1.getColorUint8ClampedArray(3000)); //=> Uint8ClampedArray(4) [159, 246, 72, 255]
 *
 * // 凡例をHTMLCanvasElement（幅500px、高さ50px）としてブラウザ上に表示
 * document.body.appendChild(cmap1.createColorBarCanvas(500, 50))
 *
 * // 0～3000を白→赤→青に塗り、3000～6000を青→黒に塗る場合
 * const cmap2 = new je.image.ColorMap([
 * 	{ min: 0, max: 3000, colors: ["ffffff", "ff0000", "0000ff"] },
 * 	{ min: 3000, max: 6000, colors: ["0000ff", "000000"] }
 * ]);
 */
declare class ColorMap {
    private cmap;
    /**
     * {@link ColorMapObject}を1個、または配列で複数個指定することでColorMapを作成します。
     * 省略した場合は`{min: 0, max: 255, colors: ["000000", "ffffff"]}`を指定したものとして動作します。
     */
    constructor(colorMapObject: ColorMapObject | ColorMapObject[]);
    /**
     * コンストラクターの引数として与えられた{@link ColorMapObject}を返します。
     */
    getColorMapObject(): ColorMapObject | ColorMapObject[];
    /**
     * xの値における色を`{r(赤成分), g(緑成分), b(青成分), a(アルファ成分)}`のオブジェクトとして返します。各成分は0～255の値を持ちます。
     */
    getColor(x: number): {
        r: number;
        g: number;
        b: number;
        a: number;
    };
    /**
     * xの値における色を`Uint8ClampedArray`として返します。`Uint8ClampedArray`は`[R(赤成分), G(緑成分), B(青成分), A(アルファ成分)]`の配列で、各成分は0～255の値を持ちます。
     */
    getColorUint8ClampedArray(x: number): Uint8ClampedArray;
    /**
     * このColorMapの凡例用画像を`HTMLCanvasElement`として返します。
     * @param width 画像の幅（ピクセル数）です。
     * @param height 画像の高さ（ピクセル数）です。
     * @remarks <span style="color: red; font-weight: bold;">ブラウザのメインスレッドでのみ利用可能です。</span>
     */
    createColorBarCanvas(width: number, height: number): HTMLCanvasElement;
    /**
     * このColorMapの凡例用画像をPNG画像の`Uint8Array`として返します。
     * @param width 画像の幅（ピクセル数）です。
     * @param height 画像の高さ（ピクセル数）です。
     */
    createColorBarPng(width: number, height: number): Promise<Uint8Array>;
    /**
     * このColorMapの凡例用画像を{@link ImageDataObject}として返します。
     * @param width 画像の幅（ピクセル数）です。
     * @param height 画像の高さ（ピクセル数）です。
     */
    createColorBarImageDataObject(width: number, height: number): ImageDataObject;
    /**
     * このColorMapの凡例用画像（目盛りの数値と単位の文字列併記）を`HTMLCanvasElement`として返します。
     * @param width 目盛りや単位も含めた画像全体の幅（ピクセル数）です。
     * @param height 目盛りや単位も含めた画像全体の高さ（ピクセル数）です。
     * @param size 文字のサイズです。
     * @param unit 凡例画像内に併記する単位の文字です。
     * @remarks <span style="color: red; font-weight: bold;">ブラウザのメインスレッドでのみ利用可能です。</span>
     */
    createLegendCanvas(width: number, height: number, size: number, unit: string): HTMLCanvasElement;
}

/**
 * 緯度経度範囲を表す数値配列です。
 * 数値配列は、等緯度経度(EPSG:4326)の場合にはWGS84における緯度[deg]と経度[deg]を用いて、[西の経度, 南の緯度, 東の経度, 北の緯度] のように反時計回りで指定します。<br><br>
 * 北極(EPSG:3995)の場合は、北極点を原点、経度180度の線に沿って+Y方向、経度0度の線に沿って-Y方向として、距離[m]を用いて[-X, -Y, X, Y]のように反時計回りで指定します。<br><br>
 * 南極(EPSG:3031)の場合には、南極点を原点、経度0度の線に沿って+Y方向、経度180度の線に沿って-Y方向として、距離[m]を用いて[-X, -Y, X, Y]のように反時計回りで指定します。
 *
 * @example
 * // 全球を指定する場合
 * const bbox = [-180, -90, 180, 90];
 *
 * // 日本周辺を指定する場合
 * const bbox = [120, 15, 160, 55];
 *
 * // 特定の緯度経度の点から半径dl[deg]の範囲を指定する場合
 * const lng = 138.73;
 * const lat = 35.36;
 * const dl = 0.2;
 * const bbox = [lng - dl, lat - dl, lng + dl, lat + dl];
 *
 * // 北極(EPSG:3995)または南極(EPSG:3031)の場合
 * const bbox = [-8388608, -8388608, 8388608, 8388608];
 *
 * // TypeScriptで書く場合（jaxa.earth.esm.jsとjaxa.earth.esm.d.tsをダウンロードして利用してください）
 * import type { Bbox } from "./jaxa.earth.esm.js";
 * const bbox: Bbox = [-180, -90, 180, 90];
 */
type Bbox = [number, number, number, number];

/**
 * 投影法を指定する場合の選択肢です。
 */
declare enum Projection {
    /**
     * 等緯度経度を指定する場合の選択肢です。
     */
    EPSG4326 = "EPSG:4326",
    /**
     * Webメルカトルを指定する場合の選択肢です。
     */
    EPSG3857 = "EPSG:3857",
    /**
     * 北極用のEPSG:3995を指定する場合の選択肢です。
     */
    EPSG3995 = "EPSG:3995",
    /**
     * 南極用のEPSG:3031を指定する場合の選択肢です。
     */
    EPSG3031 = "EPSG:3031"
}

/**
 * {@link getDataObject}、{@link Image#getDataObject}などにより取得できる、取得したデータを扱いやすいように格納したオブジェクトです。
 *
 * DataObjectは{@link image.ColorMap | `ColorMap`}の設定を利用して、{@link image.createCanvas | `createCanvas`}などを用いることで画像として可視化できます。
*/
interface DataObject {
    /** 画像の幅(ピクセル数)です。 */
    width: number;
    /** 画像の高さ(ピクセル数)です。 */
    height: number;
    /** 各ピクセルの値を画像の左上→右上、上→下へと順に格納した1次元配列(`Float32Array`または`Uint32Array`)です。
     * 配列の要素数は`width * height`個です。ピクセル`(i, j)`のデータは、1次元配列の`i + j * width`番目に格納されています。
     *
     * `photometricInterpretation = 1または3`の場合は`Float32Array`のデータ型を使用します。
     * 観測の範囲外や雲による欠損などで値が無いピクセルには`NaN`が格納されています。
     *
     * `photometricInterpretation = 2`の場合は`Uint32Array`のデータ型を使用します。
     * 観測の範囲外や品質を満たさない欠損などで値が無いピクセルには`0x00000000`(透明な色)が格納されています。
    */
    data: Float32Array | Uint32Array;
    /** 緯度経度範囲を表す{@link Bbox}です。 */
    bbox: Bbox;
    /** dataに格納されている値の単位です。単位が無い無次元量の場合は`""`が格納されます。 */
    unit: string;
    /** データの日時を示す`Date`です。 */
    date: Date;
    /** データの日時の文字列表現です。例えば月単位のデータセットの場合は"YYYY/MM"、日単位のデータセットの場合は"YYYY/MM/DD"、気候値(複数年のデータから得られる平均値等)の場合は"MM"のように、データセット固有の時間間隔を反映した文字列表現となっています。 */
    formattedDate: string;
    /** "EPSG:4326"などの投影法{@link Projection}です。 */
    projection: Projection;
    /**
     * 元のCOGファイルとSTACファイルへのURLです。
     */
    src: Array<{
        cog: string;
        stac: string;
    }>;
    /**
     * 元のGeoTIFFファイルで定義されている`photometricInterpretation`の値です。JAXA Earth APIでは次の値に対応しています。
     * - `photometricInterpretation = 1` (BlackIsZero)：各ピクセルに物理量の値が格納されているデータであることを示します。いわゆる尺度水準における「順序尺度（大きさの比較はできるが四則演算は意味を持たない：植生指数など）」か「間隔尺度（足し算引き算は可能であるが、掛け算割り算は意味を持たない：摂氏単位の温度など）」か「比率尺度（四則演算可能：降水量やケルビン単位の温度など）」と呼ばれるデータであることを示します。
     * - `photometricInterpretation = 2` (RGB)：各ピクセルにRRGGBBAAの色の値が格納されているカラー画像であることを示します。ニアレストネイバーリサンプリングは可能ですが、バイリニアリサンプリングは使用できません。本来はGeoTIFFの`samplesPerPixel = 4`、`planarConfiguration = 1`に従って[RR, GG, BB, AA]の4倍の要素数で処理する必要がありますが、便宜的に`Uint32Array`の各32ビット値にRRGGBBAAを格納することで、`data`の要素数（`width * height`）をBlackIsZeroの場合と同一にして処理します。
     * - `photometricInterpretation = 3` (Palette color)：各ピクセルにクラス分類を示す値が格納されているデータであることを示します。いわゆる尺度水準における「名義尺度」と呼ばれるデータ（土地被覆分類など）であり、値間の順位や大きさは意味を持たず、四則演算をしても意味のある値は出せません。ニアレストネイバーリサンプリングは可能ですが、バイリニアリサンプリングは使用できません。
     */
    photometricInterpretation: number;
    /**
     * `photometricInterpretation = 3` (Palette color)の場合に各値に塗る色を格納しています。
     * {@link image.ColorMap | `ColorMap`}よりも優先されます。
     * GeoTIFFファイル内のIFD (Image File Directory)の`ColorMap`で指定された情報から色のカラーコード文字列の配列を作成し、格納しています。
     */
    colors?: string[];
    /**
     * `photometricInterpretation = 3` (Palette color)の場合に各値の説明内容を格納しています。
     * STACのカタログファイル内の`classification:classes`で定義されているJSONを格納しています。
     */
    classes?: any;
    /**
     * @private
     */
    preload?: boolean;
}

/**
 * {@link DataObject}と{@link ColorMap}から{@link ImageDataObject}を作成します。
 *
 * @param dataObject 入力となる{@link DataObject}です。
 * @param colorMap 入力となる{@link ColorMap}です。
 */
declare const createImageDataObject: (dataObject: DataObject, colorMap: ColorMap) => ImageDataObject;

/**
 * {@link DataObject}と{@link ColorMap}から`HTMLCanvasElement`を作成します。{@link createCanvasByDataObject}を短く書くためのエイリアスです。
 * @remarks <span style="color: red; font-weight: bold;">ブラウザのメインスレッドでのみ利用可能です。</span>
 */
declare function createCanvas(dataObject: DataObject, colorMap: ColorMap): HTMLCanvasElement;

/**
 * {@link DataObject}と{@link ColorMap}から`HTMLCanvasElement`を作成します。短く書くためには{@link createCanvas}も利用できます。{@link createCanvasByImageDataObject}({@link createImageDataObject}(dataObject, colorMap))の処理と等価です。
 *
 * @param dataObject 入力となる{@link DataObject}です。
 * @param colorMap 入力となる{@link ColorMap}です。
 * @remarks <span style="color: red; font-weight: bold;">ブラウザのメインスレッドでのみ利用可能です。</span>
 */
declare const createCanvasByDataObject: (dataObject: DataObject, colorMap: ColorMap) => HTMLCanvasElement;

/**
 * {@link ImageDataObject}から`HTMLCanvasElement`を作成します。
 * @param imageDataObject 入力となる{@link ImageDataObject}です。
 * @remarks <span style="color: red; font-weight: bold;">ブラウザのメインスレッドでのみ利用可能です。</span>
 */
declare const createCanvasByImageDataObject: (imageDataObject: ImageDataObject) => HTMLCanvasElement;

/**
 * {@link DataObject}と{@link ColorMap}からPNG画像の`Uint8Array`を作成します。{@link createPngUint8ArrayByDataObject}を短く書くためのエイリアスです。
 */
declare function createPng(dataObject: DataObject, colorMap: ColorMap): Promise<Uint8Array>;

/**
 * {@link DataObject}と{@link ColorMap}からPNG画像の`Uint8Array`を作成します。短く書くためには{@link createPng}も利用できます。{@link createPngUint8ArrayByImageDataObject}({@link createImageDataObject}(dataObject, colorMap))の処理と等価です。
 *
 * @param dataObject 入力となる{@link DataObject}です。
 * @param colorMap 入力となる{@link ColorMap}です。
 */
declare const createPngUint8ArrayByDataObject: (dataObject: DataObject, colorMap: ColorMap) => Promise<Uint8Array>;

/**
 * {@link ImageDataObject}からPNG画像の`Uint8Array`を作成します。
 * @param imageDataObject 入力となる{@link ImageDataObject}です。
 */
declare const createPngUint8ArrayByImageDataObject: (imageDataObject: ImageDataObject) => Promise<Uint8Array>;

/**
 * {@link DataObject}と{@link ColorMap}から`OffscreenCanvas`を作成します。{@link createOffscreenCanvasByDataObject}を短く書くためのエイリアスです。
 * @remarks <span style="color: red; font-weight: bold;">ブラウザのメインスレッドまたはウェブワーカーでのみ利用可能です。</span>
 */
declare function createOffscreenCanvas(dataObject: DataObject, colorMap: ColorMap): OffscreenCanvas;

/**
 * {@link DataObject}と{@link ColorMap}から`OffscreenCanvas`を作成します。短く書くためには{@link createOffscreenCanvas}も利用できます。{@link createOffscreenCanvasByImageDataObject}({@link createImageDataObject}(dataObject, colorMap))の処理と等価です。
 *
 * @param dataObject 入力となる{@link DataObject}です。
 * @param colorMap 入力となる{@link ColorMap}です。
 * @remarks <span style="color: red; font-weight: bold;">ブラウザのメインスレッドまたはウェブワーカーでのみ利用可能です。</span>
 */
declare const createOffscreenCanvasByDataObject: (dataObject: DataObject, colorMap: ColorMap) => OffscreenCanvas;

/**
 * {@link ImageDataObject}から`OffscreenCanvas`を作成します。
 * @param imageDataObject 入力となる{@link ImageDataObject}です。
 * @remarks <span style="color: red; font-weight: bold;">ブラウザのメインスレッドまたはウェブワーカーでのみ利用可能です。</span>
 */
declare const createOffscreenCanvasByImageDataObject: (imageDataObject: ImageDataObject) => OffscreenCanvas;

/**
 * {@link data.DataObject | `DataObject`}から画像を作成するための機能をまとめたモジュールです。
 *
 * 実行環境に応じて、主に次の関数を利用して{@link data.DataObject | `DataObject`}と{@link ColorMap}から画像に変換します。
 * - {@link createCanvas}（ブラウザのメインスレッド限定で、`HTMLCanvasElement`に変換する）
 * - {@link createOffscreenCanvas}（ブラウザのメインスレッドまたはウェブワーカー限定で、`OffscreenCanvas`に変換する）
 * - {@link createPng}（ブラウザ、Node.js、Deno、BunでPNG画像の`Uint8Array`に変換する）
 *
 * また、{@link createImageDataObject}を使用することで、各ピクセルのRGBAの色成分を`Uint8ClampedArray`として格納した中間データ{@link ImageDataObject}も利用可能です。
 *
 * @module image
 */

type index_d$5_ColorMap = ColorMap;
declare const index_d$5_ColorMap: typeof ColorMap;
type index_d$5_ColorMapObject = ColorMapObject;
type index_d$5_ImageDataObject = ImageDataObject;
declare const index_d$5_createCanvas: typeof createCanvas;
declare const index_d$5_createCanvasByDataObject: typeof createCanvasByDataObject;
declare const index_d$5_createCanvasByImageDataObject: typeof createCanvasByImageDataObject;
declare const index_d$5_createImageDataObject: typeof createImageDataObject;
declare const index_d$5_createOffscreenCanvas: typeof createOffscreenCanvas;
declare const index_d$5_createOffscreenCanvasByDataObject: typeof createOffscreenCanvasByDataObject;
declare const index_d$5_createOffscreenCanvasByImageDataObject: typeof createOffscreenCanvasByImageDataObject;
declare const index_d$5_createPng: typeof createPng;
declare const index_d$5_createPngUint8ArrayByDataObject: typeof createPngUint8ArrayByDataObject;
declare const index_d$5_createPngUint8ArrayByImageDataObject: typeof createPngUint8ArrayByImageDataObject;
declare namespace index_d$5 {
  export { index_d$5_ColorMap as ColorMap, index_d$5_createCanvas as createCanvas, index_d$5_createCanvasByDataObject as createCanvasByDataObject, index_d$5_createCanvasByImageDataObject as createCanvasByImageDataObject, index_d$5_createImageDataObject as createImageDataObject, index_d$5_createOffscreenCanvas as createOffscreenCanvas, index_d$5_createOffscreenCanvasByDataObject as createOffscreenCanvasByDataObject, index_d$5_createOffscreenCanvasByImageDataObject as createOffscreenCanvasByImageDataObject, index_d$5_createPng as createPng, index_d$5_createPngUint8ArrayByDataObject as createPngUint8ArrayByDataObject, index_d$5_createPngUint8ArrayByImageDataObject as createPngUint8ArrayByImageDataObject };
  export type { index_d$5_ColorMapObject as ColorMapObject, index_d$5_ImageDataObject as ImageDataObject };
}

/**
 * データをCSV (Comma-Separated Values) 形式の文字列に変換します。テキストファイルとしてダウンロードする機能やファイル保存する機能を別途作成することで、CSVファイルを作ることが可能です。
*/
declare const createCsv: (dataObject: DataObject) => string;

/**
 * 複数の{@link DataObject}を利用して演算を行い、新しい{@link DataObject}を返します。
 *
 * @example
 * //ケルビン単位のデータを℃単位のデータに換算する
 * const dataObject2 = je.data.compute({
 * 	dataObjects: [dataObject],
 * 	operation: (value) => value - 273.15,
 * 	unit: "degC",
 * 	date: dataObject.data,
 * 	formattedDate: dataObject.formattedDate,
 * });
 *
 * //観測値dataObject1と平年値dataObject2から平年差anomalyを計算
 * const anomaly = je.data.compute({
 * 	dataObjects: [dataObject1, dataObject2],
 *
 * 	//ピクセル間の演算方法を定義（引数はdataObjectsの配列の順番と同一）
 * 	operation: (value_of_dataObject1, value_of_dataObject2) => value_of_dataObject1 - value_of_dataObject2,
 *
 * 	unit: "degC",
 * 	date: dataObject1.data,
 * 	formattedDate: dataObject1.formattedDate,
 * });
*/
declare const compute: ({ dataObjects, operation, unit, date, formattedDate, }: {
    /**
     * 演算に利用する{@link DataObject}を配列で指定します。
     */
    dataObjects: DataObject[];
    /**
     * ピクセルごとの演算方法を指定します。
     */
    operation: (...values: number[]) => number;
    /**
     * 演算後の値の単位を指定します。
     */
    unit: string;
    /**
     * 演算後の{@link DataObject}に日時の概念がある場合は、その日時を指定します。指定しない場合は`undefined`となります。
     */
    date?: Date;
    /**
     * 演算後の{@link DataObject}に日時の概念がある場合は、その日時の文字列表現を指定します。指定しない場合は`undefined`となります。
     */
    formattedDate?: string;
}) => DataObject;

/**
 * データの統計値を求めます。`NaN`のピクセルは統計には含めません。
 * なお、この計算では実際の地球表面上におけるピクセルごとの面積の違いは考慮していません。
 * 緯度経度範囲が十分に狭く、ピクセルごとの面積の違いを無視できる場合はこの簡易的な計算でも問題ありませんが、ピクセルごとの面積の違いがある広い緯度経度範囲のデータで厳密な評価を行なうためには、{@link globalStat}を利用してください。
 *
 * また、`dataObject.photometricInterpretation = 1`以外のデータについては平均値等の統計計算は意味を持たないため、`size`以外には有効な数値は取得できません。
*/
declare const stat: (dataObject: DataObject) => {
    /** NaNのピクセルを除くピクセル数です。 */
    size: number;
    /** 全ピクセルの値のうち、最も小さな値（最小値）です。 */
    min: number;
    /** 全ピクセルの値のうち、最も大きな値（最大値）です。 */
    max: number;
    /** 全ピクセルの値の合計値です。 */
    sum: number;
    /** 全ピクセルの値の平均値(sum / size)です。 */
    mean: number;
    /** 全ピクセルの値の標準偏差(√( Σ((x - mean)^2) / size ))です。 */
    stdev: number;
    /** 全ピクセルの値の中央値です。 */
    median: number;
};

/**
 * WGS84回転楕円体に基づいて計算されるピクセルごとの面積の違いを考慮して、データの統計値を求めます。`NaN`のピクセルは統計には含めません。
 * `dataObject.photometricInterpretation = 1`以外のデータについては平均値等の統計計算は意味を持たないため、`size`以外には有効な数値は取得できません。
 * @remarks <span style="color:red;font-weight:bold;">等緯度経度(EPSG:4326)のみに対応しており、北極(EPSG:3995)及び南極(EPSG:3031)等には対応していません。</span>
*/
declare const globalStat: (dataObject: DataObject) => {
    /** NaNのピクセルを除くピクセル数です。 */
    size: number;
    /** 全ピクセルの値のうち、最も小さな値（最小値）です。 */
    min: number;
    /** 全ピクセルの値のうち、最も大きな値（最大値）です。 */
    max: number;
    /** 全ピクセルの値の平均値です。計算においてはピクセルごとの面積の違いをピクセルごとの重みとして考慮しています。 */
    mean: number;
};

/**
 * {@link DataObject}上における特定の位置のデータの値や座標を取得するためのクラスです。
 * @example
 *
 * // 値を調べるためのInspectorを作成します。
 * const isp = new je.data.Inspector(dataObject);
 *
 * // 緯度経度で(135.0, 35.0)の場所のピクセル位置を取得します。
 * console.log(isp.getPixelByCoordinateXY(135.0, 35.0));
 *
 * // ピクセル位置で(275, 225)の場所の緯度経度を取得します。
 * console.log(isp.getCoordinateByPixelXY(275, 225));
 *
 * // 緯度経度で(135.0, 35.0)の場所の値を取得します。
 * console.log(isp.getValueByCoordinateXY(135.0, 35.0));
 *
 * // ピクセル位置で(275, 225)の場所の値を取得します。
 * console.log(isp.getValueByPixelXY(275, 225));
 */
declare class Inspector {
    private dataObject;
    constructor(dataObject: DataObject);
    /**
     * 座標(投影法がEPSG:4326の場合は緯度経度、EPSG:3857の場合はm単位など)で位置指定して、その場所のピクセル座標を取得します。
     *
     * データの範囲外の場合は`null`を返します。
     *
     * @param x 座標を取得したい場所のX座標です。
     * @param y 座標を取得したい場所のY座標です。
     */
    getPixelByCoordinateXY(x: number, y: number): {
        x: number;
        y: number;
    };
    /**
     * ピクセル座標で位置指定して、その場所の座標(投影法がEPSG:4326の場合は緯度経度、EPSG:3857の場合はm単位など)を取得します。
     *
     * データの範囲外の場合は`null`を返します。
     *
     * @param x 座標を取得したい場所のピクセル位置のX座標です。
     * @param y 座標を取得したい場所のピクセル位置のY座標です。
     */
    getCoordinateByPixelXY(x: number, y: number): {
        x: number;
        y: number;
        projection: Projection;
    };
    /**
     * 緯度経度を指定して、その場所の値を取得します。コンストラクターに与えたdataObjectにおいて、画像の左上は`(dataObject.bbox[0], dataObject.bbox[3])`、画像の右下は`(dataObject.bbox[2], dataObject.bbox[1])`となります。
     * dataObject.projectionがEPSG:4326の場合は緯度経度、EPSG:3857の場合はm単位で指定します。
     *
     * データの範囲外の場合は`null`を返します。
     *
     * @param x 値を取得したい場所のX座標です。
     * @param y 値を取得したい場所のY座標です。
     */
    getValueByCoordinateXY(x: number, y: number): number;
    /**
     * ピクセル座標で位置指定して、その場所の値を取得します。画像の左上のピクセルは`(0, 0)`、画像の右下のピクセルは`(width - 1, height - 1)`です。
     *
     * データの範囲外の場合は`null`を返します。
     *
     * @param x 値を取得したい場所のピクセル位置のX座標です。
     * @param y 値を取得したい場所のピクセル位置のY座標です。
     */
    getValueByPixelXY(x: number, y: number): number;
    /**
     * 緯度経度を指定して、その場所の値の説明を取得します。コンストラクターに与えたdataObjectにおいて、画像の左上は`(dataObject.bbox[0], dataObject.bbox[3])`、画像の右下は`(dataObject.bbox[2], dataObject.bbox[1])`となります。
     * dataObject.projectionがEPSG:4326の場合は緯度経度、EPSG:3857の場合はm単位で指定します。
     *
     * データの範囲外の場合は`null`を返します。
     *
     * @param x 値の説明を取得したい場所のX座標です。
     * @param y 値の説明を取得したい場所のY座標です。
     * @param digits 値の小数点の桁数です。`dataObject.photometricInterpretation = 1`の場合で、値が小数となる場合にのみ有効となります。
     */
    getDescriptionByCoordinateXY(x: number, y: number, digits: number): string;
    /**
     * ピクセル座標で位置指定して、その場所の値の説明を取得します。画像の左上のピクセルは`(0, 0)`、画像の右下のピクセルは`(width - 1, height - 1)`です。
     *
     * データの範囲外の場合は`null`を返します。
     *
     * @param x 値の説明を取得したい場所のピクセル位置のX座標です。
     * @param y 値の説明を取得したい場所のピクセル位置のY座標です。
     * @param digits 値の小数点の桁数です。`dataObject.photometricInterpretation = 1`の場合で、値が小数となる場合にのみ有効となります。
     */
    getDescriptionByPixelXY(x: number, y: number, digits?: number): string;
}

/**
 * リサンプリング方法を指定する場合の選択肢です。
 */
declare enum Resampling {
    /**
     * ニアレストネイバーを指定する場合の選択肢です。バイリニアの1/6程度の処理時間で高速に処理できます。
     */
    NEAREST = "NEAREST",
    /**
     * バイリニアを指定する場合の選択肢です。ニアレストネイバーよりも時間がかかりますが、地形データの傾斜を求めるような場合には必須です。
     */
    BILINEAR = "BILINEAR"
}

type index_d$4_Resampling = Resampling;
declare const index_d$4_Resampling: typeof Resampling;
declare namespace index_d$4 {
  export {
    index_d$4_Resampling as Resampling,
  };
}

/**
 * 投影変換を行います。現状はEPSG:4326からEPSG:3857への変換にのみ対応しています。
 */
declare const transform: (dataObject: DataObject, projection: Projection) => DataObject;

type index_d$3_Projection = Projection;
declare const index_d$3_Projection: typeof Projection;
declare const index_d$3_transform: typeof transform;
declare namespace index_d$3 {
  export {
    index_d$3_Projection as Projection,
    index_d$3_transform as transform,
  };
}

/**
 * {@link DataObject}に関連する機能をまとめたモジュールです。
 * 投影変換やリサンプリング、統計値計算、CSV出力などが可能です。
 *
 * @module data
 */

type index_d$2_DataObject = DataObject;
type index_d$2_Inspector = Inspector;
declare const index_d$2_Inspector: typeof Inspector;
declare const index_d$2_compute: typeof compute;
declare const index_d$2_createCsv: typeof createCsv;
declare const index_d$2_globalStat: typeof globalStat;
declare const index_d$2_stat: typeof stat;
declare namespace index_d$2 {
  export { index_d$2_Inspector as Inspector, index_d$2_compute as compute, index_d$2_createCsv as createCsv, index_d$2_globalStat as globalStat, index_d$3 as projection, index_d$4 as resample, index_d$2_stat as stat };
  export type { index_d$2_DataObject as DataObject };
}

declare class COG {
    constructor(args: any);
    url: any;
    offset: any;
    slope: any;
    unit: any;
    errorValue: any[];
    littleEndian: boolean;
    classes: any;
    getURL(): any;
    init(): Promise<void>;
    ifd: any;
    colors: string[];
    isLittleEndian(): boolean;
    getIFDs(): any;
    getImageSize(): any;
    getImageWidth(id: any): any;
    getImageHeight(id: any): any;
    getTileWidth(id: any): any;
    getTileHeight(id: any): any;
    getTileSize(id: any): any;
    getTileSizeI(id: any): number;
    getTileSizeJ(id: any): number;
    getPhotometricInterpretation(id: any): any;
    getSamplesPerPixel(id: any): any;
    getProjection(): string;
    getPixelScale(): any[];
    getTiepoint(): any[];
    getLongitude(i: any): any;
    getLatitude(j: any): number;
    getTileBbox(id: any, ti: any, tj: any): any[];
    getBbox(id: any, valid?: boolean): any[];
    getTileIJ(id: any, lng: any, lat: any): {
        i: number;
        j: number;
    };
    checkTileIJ(id: any, is: any, ie: any, js: any, je: any): void;
    getTiles(id: any, is: any, ie: any, js: any, je: any, onloading?: () => void): Promise<any[]>;
    getDataObjectByTileIJ(id: any, is: any, ie: any, js: any, je: any, onloading?: () => void): Promise<{
        width: any;
        height: any;
        data: Uint32Array<ArrayBuffer> | Float32Array<ArrayBuffer>;
        bbox: any;
        projection: any;
        photometricInterpretation: any;
        colors: any;
        classes: any;
        unit: any;
    }>;
    getDataObjectByBbox(id: any, bbox: any, onloading: any): Promise<{
        width: any;
        height: any;
        data: Uint32Array<ArrayBuffer> | Float32Array<ArrayBuffer>;
        bbox: any;
        projection: any;
        photometricInterpretation: any;
        colors: any;
        classes: any;
        unit: any;
    }>;
    prefetchByTileIJ(id: any, is: any, ie: any, js: any, je: any): Promise<boolean>;
    prefetchByBbox(id: any, bbox: any): Promise<boolean>;
}

/**
 * v.2.1でTS対応後に公開予定
 */

type index_d$1_COG = COG;
declare const index_d$1_COG: typeof COG;
declare namespace index_d$1 {
  export {
    index_d$1_COG as COG,
  };
}

declare class STAC {
    constructor(url: any);
    url: any;
    id: any;
    getURL(): any;
    getUrl(): any;
    getId(): any;
    init(): Promise<void>;
    json: any;
    checkReady(): void;
    getJson(): any;
    getType(): any;
    getStacVersion(): any;
    getStacExtensions(): any;
    getLinks(): any;
    getRootUrl(): string;
    getCollectionUrl(): string;
    getParentUrl(): string;
    getChildUrlAll(): any;
    getItemUrlAll(): any;
}

declare class Catalog extends STAC {
}

declare class Collection extends STAC {
    getTitle(): any;
    getDescription(): any;
    getBbox(): any;
    getBandAll(): any;
    getBandIdAll(): string[];
    getBand(band: any): any;
    getSummariesParam(key: any): any;
    getProjection(): string;
    getPpuMax(): any;
    getLevelMax(): any;
    getDateFormat(): any;
    getTemporalCatalogAll(): any;
}

declare class Item extends STAC {
    getBandAll(): any;
    getBandIdAll(): string[];
    getBand(band: any): any;
    getCogParams(band: any): {
        url: string;
        offset: any;
        slope: any;
        errorValue: any[];
        unit: any;
        type: any;
        interp: any;
    };
}

declare const parse: (url: string) => Promise<{
    /**
     * 引数として与えられたURLです。
     */
    url: string;
    /**
     * STACの全ての内容です。
     */
    json: any;
    /**
     * 各データセットの最上位階層に位置するCollectionのSTACであるかを判定した結果です。
     */
    isCollection: boolean;
    /**
     * 時刻ごとのデータを格納したCatalogであるかを判定した結果です。
     */
    isTemporalCatalog: boolean;
    /**
     * 最も末端に位置するItemのSTACであるかを判定した結果です。
     */
    isItem: boolean;
    /**
     * このデータセットのCollectionのSTACへのURLです。
     */
    collectionUrl: string;
    /**
     * 上層のSTACへのURLです。
     */
    parentUrl: string;
    /**
     * 下層のSTAC（child）へのURLです。
     */
    childUrls: string[];
    /**
     * 下層のSTAC（item）へのURLです。
     */
    itemUrls: string[];
    /**
     * このSTACが示すデータの時刻です。
     */
    date: Date;
}>;

/**
 * v.2.1でTS対応後に公開予定
 */

type index_d_Catalog = Catalog;
declare const index_d_Catalog: typeof Catalog;
type index_d_Collection = Collection;
declare const index_d_Collection: typeof Collection;
type index_d_Item = Item;
declare const index_d_Item: typeof Item;
declare const index_d_parse: typeof parse;
declare namespace index_d {
  export {
    index_d_Catalog as Catalog,
    index_d_Collection as Collection,
    index_d_Item as Item,
    index_d_parse as parse,
  };
}

/**
 * スレッド内の全ての読み込み処理を中断します。ウェブワーカーの処理を中断する時などに利用します。
 *
 * メモリー領域はウェブワーカーごとに異なるため、中断できる範囲は実行したウェブワーカー内のみです。
 * 他のウェブワーカーで実行されている処理への影響はありません。
 * そのため、複数の地図画面を表示するウェブアプリを作る場合には、地図画面ごとにウェブワーカーをそれぞれ用意することで、地図画面ごとの中断処理が可能になります。
 */
declare const abort: () => void;

/**
 * {@link Image}は{@link ImageCollection}で日時とバンド名を指定して得ることが可能です。コンストラクターから直接作ることはできません。
 *
 * {@link Image#getDataObject}に緯度経度、画像サイズ、リサンプリング方法を指定することで、{@link DataObject}を取得することが可能です。
 *
 * @example
 * import * as je from "./jaxa.earth.esm.js";
 *
 * // 利用したいデータセットを特定するためのcollection.jsonを指定します。
 * const collectionUrl = "https://s3.ap-northeast-1.wasabisys.com/je-pds/cog/v1/JAXA.G-Portal_GCOM-W.AMSR2_standard.L3-SMC.daytime.v3_global_monthly/collection.json";
 *
 * // ImageCollectionを作って初期化します。初期化するとcollection.jsonから必要な情報を読み込みます。
 * const ic = new je.ImageCollection({ collectionUrl });
 * await ic.init();
 *
 * // ImageCollectionからje.Imageを取得します。
 * const im = await ic.getImage({
 * 	// 日時を指定します。指定した日時のデータを取得します。指定しない場合は現在の日時が指定されることで最新のデータを取得できます。
 * 	// この例では2021/6のデータが取得されます。
 * 	date: new Date(Date.UTC(2021, 6 - 1)),
 *
 * 	// バンド名を指定します。省略した場合は１つ目のバンド名を自動で選択します。
 * 	band: "SMC",
 * });
 *
 * // DataObjectを取得します。
 * const dataObject = await im.getDataObject({
 *
 * 	// Bboxを指定します。省略した場合は[-180,-90,180,90]が指定されたものとして動作します。
 * 	bbox: [110, 30, 150, 50],
 *
 * 	// サイズを指定します。省略した場合は幅1000px高さ500pxが指定されたものとして動作します。
 * 	width: 800,
 * 	height: 400,
 *
 * 	// リサンプリング方法を指定します。省略した場合はje.Resampling.NEARESTが指定されたものとして動作します。
 * 	// resampling: je.Resampling.BILINEAR,
 * });
 *
 * console.log(dataObject);
 */
declare class Image {
    private collectionUrl;
    private temporalCatalogUrl;
    private band;
    private date;
    private formattedDate;
    private sd;
    private dataObject;
    /**
     * @private
     */
    constructor(collectionUrl: string, temporalCatalogUrl: string, band: string, date: Date, formattedDate: string);
    /**
     * {@link DataObject}を取得します。
     */
    getDataObject(options: {
        /** {@link Bbox}を指定します。省略した場合は、`[-180, -90, 180, 90]`を指定したものとして動作します。 */
        bbox?: Bbox;
        /** 画像の幅[px]を指定します。省略した場合は`1000`を指定したものとして動作します。 */
        width?: number;
        /** 画像の高さ[px]を指定します。省略した場合は`500`を指定したものとして動作します。 */
        height?: number;
        /** リサンプリング方法を指定します。実行を省略した場合は`je.Resampling.NEAREST`が指定されたものとしてニアレストネイバーで処理されます。 */
        resampling?: Resampling;
        /** ファイルを読み込むたびに実行されるコールバック関数です。コールバック関数には引数としてprogress(0～100の進捗率)と各時点での{@link DataObject}が渡されます。 */
        onloading?: (progress: number, dataObject: DataObject) => void;
    }): Promise<DataObject>;
    /**
     * すでに{@link Image#getDataObject}が実行されている場合に、再度{@link DataObject}を取得します。再度通信は行わずキャッシュを返します。
     * @returns 前回の{@link Image#getDataObject}の実行で取得された{@link DataObject}
     */
    getCachedDataObject(): DataObject;
    /**
     * 複数枚のWMTSタイル画像用にまとめてアクセスし、COGタイルをキャッシュに保存することだけを実施する
     * @private
     */
    prefetch({ bbox, width, height, }: {
        /** {@link Bbox}を指定します。省略した場合は、`[-180, -90, 180, 90]`を指定したものとして動作します。 */
        bbox?: Bbox;
        /** 画像の幅[px]を指定します。省略した場合は`1000`を指定したものとして動作します。 */
        width?: number;
        /** 画像の高さ[px]を指定します。省略した場合は`500`を指定したものとして動作します。 */
        height?: number;
    }): Promise<boolean>;
    /**
     * この{@link Image}のcollectionUrlを返します。
     */
    getCollectionUrl(): string;
    /**
     * この{@link Image}の日時を返します。
     */
    getDate(): Date;
    /**
     * この{@link Image}の日時を、データセットが持つ時刻間隔を踏まえた文字列表現で返します。
     */
    getFormattedDate(): string;
    /**
     * この{@link Image}のバンド名を返します。
     */
    getBand(): string;
    /**
     * @private
     */
    getTemporalCatalogUrl(): string;
}

/**
 * データセットに関する情報を格納した{@link ImageCollection}のクラスです。主に日時とバンドの情報を扱います。
 *
 * データセットのcollection.jsonのURLを指定してインスタンスを作成し、{@link ImageCollection#init | init}を実行することで準備を完了します。
 *
 * その後、{@link ImageCollection#first | first}、{@link ImageCollection#last | last}、{@link ImageCollection#prev | prev}、{@link ImageCollection#next | next}などを用いてこのデータセットで利用できる日時を探し、
 * 日時とバンド名を指定した上で{@link ImageCollection#getImage | getImage}を実行することで{@link Image}を取得できます。
 *
 * @example
 * import * as je from "./jaxa.earth.esm.js";
 *
 * // 利用したいデータセットを特定するためのcollection.jsonを指定します。
 * const collectionUrl = "https://s3.ap-northeast-1.wasabisys.com/je-pds/cog/v1/JAXA.G-Portal_GCOM-W.AMSR2_standard.L3-SMC.daytime.v3_global_monthly/collection.json";
 *
 * // ImageCollectionを作って初期化します。初期化するとcollection.jsonから必要な情報を読み込みます。
 * const ic = new je.ImageCollection({ collectionUrl });
 * await ic.init();
 *
 * // 最初の日時を取得します。
 * console.log(ic.first());
 * console.log(ic.formatDate(ic.first()));
 *
 * // 最後の日時を取得します。
 * console.log(ic.last());
 * console.log(ic.formatDate(ic.last()));
 *
 * // 指定した日時の前の日時を取得します。カタログファイル内を通信しながら探索するため、awaitの指定が必要です。
 * console.log(await ic.prev(new Date(Date.UTC(2023, 2 - 1))));
 *
 * // 指定した日時の次の日時を取得します。カタログファイル内を通信しながら探索するため、awaitの指定が必要です。
 * console.log(await ic.next(new Date(Date.UTC(2023, 2 - 1))));
 *
 * // 指定した日時範囲のうち、データが存在する日時を取得します。
 * console.log(await ic.getDateAll(
 * 	new Date(Date.UTC(2020, 1 - 1, 1)),	//開始(この値を含む)
 * 	new Date(Date.UTC(2022, 1 - 1, 1)),	//終了(この値は含まない)
 * ));
 *
 * // 利用できるバンド名を取得します。
 * console.log(ic.getBandIdAll());
 *
 * // ImageCollectionからje.Imageを取得します。
 * const im = await ic.getImage({
 * 	// 日時を指定します。指定した日時のデータを取得します。指定しない場合は現在の日時が指定されることで最新のデータを取得できます。
 * 	// この例では2021/6のデータが取得されます。
 * 	date: new Date(Date.UTC(2021, 6 - 1)),
 *
 * 	// バンド名を指定します。省略した場合は１つ目のバンド名を自動で選択します。
 * 	band: "SMC",
 * });
 */
declare class ImageCollection {
    private collectionUrl;
    private dateWarned;
    /** 特定の日時のデータセットを取り出すために現在設定している日付です。
     * {@link ImageCollection#setDate}、{@link ImageCollection#first}、{@link ImageCollection#prev}、{@link ImageCollection#next}、{@link ImageCollection#last}を用いて変更できます。
     */
    private td;
    private ready;
    constructor(options: {
        /** データセットのcollection.jsonのURLです。 */
        collectionUrl: string;
    });
    /**
     * `collectionUrl`で指定されたcollection.jsonを読み込んで、このインスタンスを利用できるように準備します。
     */
    init(): Promise<void>;
    /** {@link ImageCollection#init}の実行状態を確認します。
     * @private
     */
    checkReady(): void;
    /**
     * @private
     */
    getCollection(): any;
    /**
     * 日時の文字列表現を返します。例えば月単位のデータセットの場合は"YYYY/MM"、日単位のデータセットの場合は"YYYY/MM/DD"、気候値(複数年のデータから得られる平均値等)の場合は"MM"のように、データセット固有の時間間隔を反映した文字列表現に変換します。
     */
    formatDate(date: Date): string;
    /**
     * 利用可能な最初の日時を返します。
     */
    first(): Date;
    /**
     * 利用可能な最後の日時を返します。
     */
    last(): Date;
    /**
     * 引数に指定された日時よりも前のデータが存在する日時を返します。カタログファイル内を通信しながら探索するため、`Promise`を返します。
     */
    prev(date: Date): Promise<Date>;
    /**
     * 引数に指定された日時よりも後のデータが存在する日時を返します。カタログファイル内を通信しながら探索するため、`Promise`を返します。
     */
    next(date: Date): Promise<Date>;
    /**
     * 指定した日時範囲(start <= Date < end)に含まれるデータの日時を全て返します。
     * @param start 日時を探索する開始日時です。
     * @param end 日時を探索する終了日時です。（この日時は含みません）
     */
    getDateAll(start: Date, end: Date): Promise<Date[]>;
    /**
     * 指定した日時範囲(start <= Date < end)に含まれるデータの日時を全て文字列表現で返します。
     * @param start 日時を探索する開始日時です。
     * @param end 日時を探索する終了日時です。（この日時は含みません）
     */
    getFormattedDateAll(start: Date, end: Date): Promise<string[]>;
    /**
     * この{@link ImageCollection}で利用できるバンド名を全て返します。collection.jsonの中で定義されるバンド名の順番を維持した文字列の配列として取得できます。
     * @returns 利用できるバンド名の配列
     */
    getBandIdAll(): Array<string>;
    /**
     * 指定された日時、バンド名の{@link Image}を取得します。
     *
     * 日時の指定に関しては次の通りです。
     * - 指定した日時にデータが存在する場合は、そのデータを返します。
     * - 指定した日時に端数があり、ピンポイントのデータが存在しない場合には、その直前のデータを指すように丸められます。例えば月別のデータに対して、2025/02/05 12:00を指定した場合は2025/02が選択されます。
     * - 指定を省略した場合は、現在日時`new Date()`が指定されることで最も最新のデータを取得できます。
     *
     * バンド名の指定に関しては次の通りです。
     * - 指定した場合はそのバンド名のデータを返します。
     * - 指定を省略した場合は、collection.json上で定義されている1個目のバンド名を自動で選択します。
     */
    getImage(options: {
        /** 日時を指定します。 */
        date?: Date;
        /** バンド名を指定します。 */
        band?: string;
    }): Promise<Image>;
}

/**
 * {@link ImageCollection}と{@link Image}の操作を意識することなく、指定した条件で{@link DataObject}を簡易的に取得するためのメソッドです。
 *
 * 次の処理と等価です。
 * ```js
 * const ic = new ImageCollection({
 * 	collectionUrl,
 * });
 *
 * await ic.init();
 *
 * const image = await ic.getImage({
 * 	date,
 * 	band,
 * });
 *
 * const dataObject = await image.getDataObject({
 * 	bbox,
 * 	width,
 * 	height,
 * 	resampling,
 * 	onloading,
 * });
 * ```
 *
 * @example
 * import * as je from "./jaxa.earth.esm.js";
 *
 * const dataObject = await je.getDataObject({
 * 	//利用するデータセットのcollection.jsonのURLを記載します。
 * 	collectionUrl: "https://s3.ap-northeast-1.wasabisys.com/je-pds/cog/v1/JAXA.EORC_ALOS.PRISM_AW3D30.v3.2_global/collection.json",
 *
 * 	//利用するデータセットのバンド名を指定します。
 * 	band: "DSM",
 *
 * 	//データを取得する緯度経度範囲を記載します。
 * 	//[最小経度(西), 最小緯度(南), 最大経度(東), 最大緯度(北)]
 * 	bbox: [-180, -90, 180, 90],
 *
 * 	//データを取得する画像のサイズをピクセル数で記載します。
 * 	width: 1000,
 * 	height: 500,
 *
 * 	//データが読み込まれるたびに実行されるコールバック関数
 * 	onloading: (progress, dataObject) => {
 * 		console.log(progress, dataObject);
 * 		// 読み込みの進捗状況表示や途中状況の可視化を行います。
 * 	}
 * });
 */
declare const getDataObject: (options: {
    /** 利用するデータセットのcollection.jsonのURL */
    collectionUrl: string;
    /** 取得するデータの日時。省略した場合は現在の日時（`new Date()`）が指定されたものとして動作し、利用可能な最新のデータを返します。 */
    date?: Date;
    /** 利用するデータセットのバンド名。省略した場合はそのデータセットに含まれる1件目（collection.json内で定義される順番で1件目）のバンド名を利用します。 */
    band?: string;
    /** 緯度経度範囲を示す{@link Bbox}。省略した場合は`[-180, -90, 180, 90]`が指定されたものとして動作します。 */
    bbox?: Bbox;
    /** 取得する画像の幅[px]。省略した場合は`1000`が指定されたものとして動作します。 */
    width?: number;
    /** 取得する画像の高さ[px]。省略した場合は`500`が指定されたものとして動作します。 */
    height?: number;
    /** リサンプリング方法。省略した場合はニアレストネイバー(`je.Resampling.NEAREST`)が指定されたものとして動作します。 */
    resampling?: Resampling;
    /** ファイルを読み込むたびに実行されるコールバック関数です。コールバック関数には引数としてprogress(0～100の進捗率)と各時点での{@link DataObject}が渡されます。省略した場合は何も実行しない関数`() => { }`が指定されたものとして動作します。 */
    onloading?: (progress: number, dataObject: DataObject) => void;
}) => Promise<DataObject>;

/**
 * WMS (Web Map Service) 方式のパラメータを使用して画像を作成します。
 * [OpenLayers](https://openlayers.org/)の[ImageCanvas](https://openlayers.org/en/latest/apidoc/module-ol_source_ImageCanvas.html)などを使用して地図APIと連携する場合に使用します。
 */
declare class ImageGenerator {
    private dataObject;
    private colorMap;
    private colorChanged;
    private ic;
    private band;
    private date;
    private resampling;
    private im;
    private timestamp;
    constructor({ collectionUrl, band, date, colorMapObject, resampling, }: {
        /**
         * データセットのcollection.jsonのURLです。
         */
        collectionUrl: string;
        /**
         * 取得するデータの日時です。省略した場合は現在の日時`new Date()`が指定されたものとして動作します。
         */
        date?: Date;
        /**
         * 利用するデータセットのバンドです。省略した場合はそのデータセットに含まれる1件目（collection.json内で定義される順番で1件目）のバンドを利用します。
         */
        band?: string;
        /**
         * 使用するリサンプリング方法です。省略した場合はニアレストネイバー(`je.Resampling.NEAREST`)が指定されたものとして動作します。
         */
        resampling?: Resampling;
        /**
         * 可視化するためのカラーマップの条件です。省略した場合は`{min: 0, max: 255, colors: ["000000", "ffffff"]}`を指定したものとして動作します。
         * カラー画像やクラス分類型のデータ（`photometricInterpretation == 1`ではないデータ）の場合は無視され、各データで元から指定されている色が優先されます。
         * ウェブワーカーなど、スレッド間で描画条件を送受信する際に支障が無いように、{@link ColorMap}ではなく{@link ColorMapObject}としています。
         */
        colorMapObject?: ColorMapObject;
    });
    /**
     * 初期化します。実行必須です。
     */
    init(): Promise<void>;
    /**
     * @private
     */
    fetchDataObject(width: number, height: number, extent: Bbox, projection: Projection, callback: (progress: number, dataObject: DataObject) => void, abortSignal?: AbortSignal): Promise<DataObject>;
    /**
     * `HTMLCanvasElement`として画像を取得します。
     * @param width 画像の幅（ピクセル数）です。
     * @param height 画像の高さ（ピクセル数）です。
     * @param extent 表示する地理範囲を示す{@link Bbox}です。投影法`projection`がEPSG:4326の場合は緯度経度で指定されますが、EPSG:3857の場合はm単位で指定されるものとなります。WMSのパラメータのルールに依存することに注意が必要です。
     * @param projection 使用する投影法です。
     * @param callback データが読み込まれるたびに実行されるコールバック関数です。進捗率（0～100）や読み込み途中の画像を取得できます。
     * @remarks <span style="color: red; font-weight: bold;">ブラウザのメインスレッドでのみ利用可能です。</span>
     */
    getCanvas(width: number, height: number, extent: Bbox, projection: Projection, callback: (progress: number, canvas: HTMLCanvasElement, dataObject: DataObject) => void, abortSignal: AbortSignal): Promise<HTMLCanvasElement>;
    /**
     * `OffscreenCanvas`として画像を取得します。
     * @param width 画像の幅（ピクセル数）です。
     * @param height 画像の高さ（ピクセル数）です。
     * @param extent 表示する地理範囲を示す{@link Bbox}です。投影法`projection`がEPSG:4326の場合は緯度経度で指定されますが、EPSG:3857の場合はm単位で指定されるものとなります。WMSのパラメータのルールに依存することに注意が必要です。
     * @param projection 使用する投影法です。
     * @param callback データが読み込まれるたびに実行されるコールバック関数です。進捗率（0～100）や読み込み途中の画像を取得できます。
     * @remarks <span style="color: red; font-weight: bold;">ブラウザのメインスレッドまたはウェブワーカーでのみ利用可能です。</span>
     */
    getOffscreenCanvas(width: number, height: number, extent: Bbox, projection: Projection, callback: (progress: number, offscreenCanvas: OffscreenCanvas, dataObject: DataObject) => void, abortSignal: AbortSignal): Promise<OffscreenCanvas>;
    /**
     * PNG画像の`Uint8Array`として画像を取得します。
     * @param width 画像の幅（ピクセル数）です。
     * @param height 画像の高さ（ピクセル数）です。
     * @param extent 表示する地理範囲を示す{@link Bbox}です。投影法`projection`がEPSG:4326の場合は緯度経度で指定されますが、EPSG:3857の場合はm単位で指定されるものとなります。WMSのパラメータのルールに依存することに注意が必要です。
     * @param projection 使用する投影法です。
     * @param callback データが読み込まれるたびに実行されるコールバック関数です。進捗率（0～100）や読み込み途中の画像を取得できます。
     */
    getPng(width: number, height: number, extent: Bbox, projection: Projection, callback: (progress: number, pngUint8Array: Uint8Array, dataObject: DataObject) => void, abortSignal: AbortSignal): Promise<Uint8Array>;
    /**
     * カラーマップを途中で変更する場合に使用します。
     */
    setColorMapObject(colorMapObject: ColorMapObject): void;
    /**
     * すでに読み込まれている{@link DataObject}をキャッシュから再度取得します。再度通信は行われません。
     */
    getDataObject(): DataObject;
}

/**
 * WMTS (Web Map Tile Service) 方式のパラメータを使用してタイル画像を作成します。
 * [OpenLayers](https://openlayers.org/)の[ImageTile](https://openlayers.org/en/latest/apidoc/module-ol_source_ImageTile.html)などを使用して地図APIと連携する場合に使用します。
 */
declare class TileGenerator {
    private ic;
    private date;
    private tileSize;
    private band;
    private resampling;
    private colorMap;
    private im;
    private cache;
    private aborted;
    private tq;
    private temporalCatalogUrl;
    constructor({ collectionUrl, date, band, resampling, colorMapObject, tileSize, delay, }: {
        /**
         * データセットのcollection.jsonのURLです。
         */
        collectionUrl: string;
        /**
         * 取得するデータの日時です。省略した場合は現在の日時`new Date()`が指定されたものとして動作します。
         */
        date?: Date;
        /**
         * 利用するデータセットのバンドです。省略した場合はそのデータセットに含まれる1件目（collection.json内で定義される順番で1件目）のバンドを利用します。
         */
        band?: string;
        /**
         * 使用するリサンプリング方法です。省略した場合はニアレストネイバー(`je.Resampling.NEAREST`)が指定されたものとして動作します。
         */
        resampling?: Resampling;
        /**
         * 可視化するためのカラーマップの条件です。省略した場合は`{min: 0, max: 255, colors: ["000000", "ffffff"]}`を指定したものとして動作します。
         * カラー画像やクラス分類型のデータ（`photometricInterpretation == 1`ではないデータ）の場合は無視され、各データで元から指定されている色が優先されます。
         * ウェブワーカーなど、スレッド間で描画条件を送受信する際に支障が無いように、{@link ColorMap}ではなく{@link ColorMapObject}としています。
         */
        colorMapObject?: ColorMapObject;
        /**
         * 作成するタイルのサイズ（幅・高さのピクセル数）です。256か512で動作確認済みです。指定しない場合は256が指定されたものとして動作します。
         */
        tileSize?: number;
        /**
         * この時間[ミリ秒]ごとにまとめてタイルを取得します。指定しない場合は500が指定されたものとして動作します。
         * この値を大きくすると、この時間内に届く複数のタイル描画指示を集約してデータをまとめて取得するため通信を効率化できますが、結果が返るまでの時間が長くなります。
         */
        delay?: number;
    });
    /**
     * 初期化します。実行必須です。
     */
    init(): Promise<void>;
    /**
     * @private
     */
    abort(): void;
    /**
     * {@link DataObject}としてタイルのデータを取得します。
     * @param x タイル座標Xです。
     * @param y タイル座標Yです。
     * @param z タイル座標Zです。
     * @param abortSignal 中断処理するための`AbortSignal`を渡します。
     */
    getDataObject(x: number, y: number, z: number, abortSignal?: AbortSignal): Promise<DataObject>;
    /**
     * @private
     */
    getImageDataObject(x: number, y: number, z: number, abortSignal?: AbortSignal): Promise<ImageDataObject>;
    /**
     * `HTMLCanvasElement`としてタイル画像を取得します。
     * @param x タイル座標Xです。
     * @param y タイル座標Yです。
     * @param z タイル座標Zです。
     * @param abortSignal 中断処理するための`AbortSignal`を渡します。
     * @remarks <span style="color: red; font-weight: bold;">ブラウザのメインスレッドでのみ利用可能です。</span>
     */
    getCanvas(x: number, y: number, z: number, abortSignal?: AbortSignal): Promise<HTMLCanvasElement>;
    /**
     * `OffscreenCanvas`としてタイル画像を取得します。
     * @param x タイル座標Xです。
     * @param y タイル座標Yです。
     * @param z タイル座標Zです。
     * @param abortSignal 中断処理するための`AbortSignal`を渡します。
     * @remarks <span style="color: red; font-weight: bold;">ブラウザのメインスレッドまたはウェブワーカーでのみ利用可能です。</span>
     */
    getOffscreenCanvas(x: number, y: number, z: number, abortSignal?: AbortSignal): Promise<OffscreenCanvas>;
    /**
     * PNG画像の`Uint8Array`としてタイル画像を取得します。
     * @param x タイル座標Xです。
     * @param y タイル座標Yです。
     * @param z タイル座標Zです。
     * @param abortSignal 中断処理するための`AbortSignal`を渡します。
     */
    getPng(x: number, y: number, z: number, abortSignal?: AbortSignal): Promise<Uint8Array>;
    setColorMapObject(colorMapObject: ColorMapObject): void;
}

export { Colors, Image, ImageCollection, ImageGenerator, Projection, Resampling, TileGenerator, abort, index_d$1 as cog, index_d$2 as data, getDataObject, index_d$5 as image, index_d as stac };
export type { Bbox };
