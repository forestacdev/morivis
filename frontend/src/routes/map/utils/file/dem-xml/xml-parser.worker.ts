import { XMLParser } from 'fast-xml-parser';

export interface ParseXmlTask {
    id: number;
    xmlText: string;
    seaAtZero: boolean;
}

export interface ParseXmlResult {
    id: number;
    content: any;
    error?: string;
}

self.onmessage = function (e) {
    const task: ParseXmlTask = e.data;

    try {
        const content = parseXmlContent(task.xmlText, task.seaAtZero);

        const result: ParseXmlResult = {
            id: task.id,
            content: content,
        };

        self.postMessage(result);
    } catch (error) {
        const result: ParseXmlResult = {
            id: task.id,
            content: null,
            error: error instanceof Error ? error.message : 'Unknown error',
        };

        self.postMessage(result);
    }
};

function parseXmlContent(xmlText: string, seaAtZero: boolean): any {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
        processEntities: true,
        trimValues: true,
        removeNSPrefix: false,
        parseAttributeValue: false,
    });

    const jsonObj = parser.parse(xmlText);

    // ルート要素の取得
    const dataset = jsonObj['dataset:Dataset'] ?? jsonObj['Dataset'];
    if (!dataset) {
        throw new Error('Dataset root not found');
    }

    const dem = dataset['dataset:DEM'] ?? dataset['DEM'];
    if (!dem) {
        throw new Error('DEM root not found');
    }

    // メッシュコード
    const meshCode = Number(dem['dataset:mesh'] ?? dem['mesh']);

    // メタデータ取得
    const coverage = dem['dataset:coverage'] ?? dem['coverage'];
    if (!coverage) {
        throw new Error('coverage not found');
    }

    const boundedBy = coverage['gml:boundedBy'] ?? coverage['boundedBy'];
    const envelope = boundedBy['gml:Envelope'] ?? boundedBy['Envelope'];
    const lowerCorner = envelope['gml:lowerCorner'] ?? envelope['lowerCorner'];
    const upperCorner = envelope['gml:upperCorner'] ?? envelope['upperCorner'];

    const gridDomain = coverage['gml:gridDomain'] ?? coverage['gridDomain'];
    const grid = gridDomain['gml:Grid'] ?? gridDomain['Grid'];
    const gridLimits = grid['gml:limits'] ?? grid['limits'];
    const gridEnvelope = gridLimits['gml:GridEnvelope'] ?? gridLimits['GridEnvelope'];
    const gridLength = gridEnvelope['gml:high'] ?? gridEnvelope['high'];

    const coverageFunction = coverage['gml:coverageFunction'] ?? coverage['coverageFunction'];
    const gridFunction = coverageFunction['gml:GridFunction'] ?? coverageFunction['GridFunction'];
    const startPoint = gridFunction['gml:startPoint'] ?? gridFunction['startPoint'];

    // 標高値
    const rangeSet = coverage['gml:rangeSet'] ?? coverage['rangeSet'];
    const dataBlock = rangeSet['gml:DataBlock'] ?? rangeSet['DataBlock'];
    const tupleList = dataBlock['gml:tupleList'] ?? dataBlock['tupleList'];

    // 必須フィールドの存在チェック
    if (!gridLength || !lowerCorner || !upperCorner || !startPoint || !tupleList) {
        throw new Error('Required XML elements not found');
    }

    // メタデータの整形
    const lowers = lowerCorner.split(' ');
    const uppers = upperCorner.split(' ');
    const grids = gridLength.split(' ');
    const startPoints = startPoint.split(' ');

    const metaData = {
        mesh_code: meshCode,
        lower_corner: {
            lat: parseFloat(lowers[0]),
            lon: parseFloat(lowers[1]),
        },
        upper_corner: {
            lat: parseFloat(uppers[0]),
            lon: parseFloat(uppers[1]),
        },
        grid_length: {
            x: parseInt(grids[0]) + 1,
            y: parseInt(grids[1]) + 1,
        },
        start_point: {
            x: parseInt(startPoints[0]),
            y: parseInt(startPoints[1]),
        },
        pixel_size: {
            x: (parseFloat(uppers[1]) - parseFloat(lowers[1])) / (parseInt(grids[0]) + 1),
            y: (parseFloat(lowers[0]) - parseFloat(uppers[0])) / (parseInt(grids[1]) + 1),
        },
    };

    // 標高値リストの処理
    const cleanTupleList = tupleList.trim();
    let items: string[];

    if (seaAtZero) {
        items = cleanTupleList.split('\n').map((line: string) => {
            const parts = line.split(',');
            if ((parts[0] === '海水面' || parts[0] === '海水底面') && parts[1] === '-9999.') {
                return '0.0';
            }
            return parts[1];
        });
    } else {
        items = cleanTupleList.split('\n').map((line: string) => line.split(',')[1]);
    }

    const elevation = {
        mesh_code: meshCode,
        items,
    };

    return {
        mesh_code: meshCode,
        meta_data: metaData,
        elevation,
    };
}
