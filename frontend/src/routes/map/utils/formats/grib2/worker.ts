import { PureGrib2Parser } from '.';

export interface Grib2ParsedMessage {
	index: number;
	label: string;
	parameterNumber: number;
	levelType: number;
	levelValue: number;
	referenceTime: Date;
	forecastTime: number;
	timeRangeUnit: number;
	validTime: Date;
	nx: number;
	ny: number;
	la1: number;
	lo1: number;
	la2: number;
	lo2: number;
	values: Float32Array;
}

interface Grib2WorkerRequest {
	arrayBuffer: ArrayBuffer;
}

interface Grib2WorkerSuccessResponse {
	messages: Grib2ParsedMessage[];
}

interface Grib2WorkerErrorResponse {
	error: string;
}

const pad2 = (value: number) => value.toString().padStart(2, '0');

const addForecastOffset = (referenceTime: Date, forecastTime: number, timeRangeUnit: number) => {
	const validTime = new Date(referenceTime.getTime());
	switch (timeRangeUnit) {
		case 0:
			validTime.setMinutes(validTime.getMinutes() + forecastTime);
			break;
		case 1:
			validTime.setHours(validTime.getHours() + forecastTime);
			break;
		case 2:
			validTime.setDate(validTime.getDate() + forecastTime);
			break;
		case 10:
			validTime.setHours(validTime.getHours() + forecastTime * 3);
			break;
		case 11:
			validTime.setHours(validTime.getHours() + forecastTime * 6);
			break;
		case 12:
			validTime.setHours(validTime.getHours() + forecastTime * 12);
			break;
		case 13:
			validTime.setSeconds(validTime.getSeconds() + forecastTime);
			break;
		default:
			validTime.setHours(validTime.getHours() + forecastTime);
			break;
	}
	return validTime;
};

const formatTemporalLabel = (date: Date) => {
	return `${date.getFullYear()}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())} ${pad2(
		date.getHours()
	)}:${pad2(date.getMinutes())}`;
};

const parseGrib2Messages = (arrayBuffer: ArrayBuffer): Grib2ParsedMessage[] => {
	const parser = new PureGrib2Parser(arrayBuffer);
	const records = parser.parse();

	return records.map((record, index) => {
		const meta = record.metadata;
		const paramName = meta.parameterName ?? `Param ${meta.parameterNumber}`;
		const validTime = addForecastOffset(meta.referenceTime, meta.forecastTime, meta.timeRangeUnit);

		return {
			index,
			label: `${formatTemporalLabel(validTime)} ${paramName} (${meta.nx}x${meta.ny}) Level:${meta.levelType}=${meta.levelValue}`,
			parameterNumber: meta.parameterNumber,
			levelType: meta.levelType,
			levelValue: meta.levelValue,
			referenceTime: meta.referenceTime,
			forecastTime: meta.forecastTime,
			timeRangeUnit: meta.timeRangeUnit,
			validTime,
			nx: meta.nx,
			ny: meta.ny,
			la1: meta.la1,
			lo1: meta.lo1,
			la2: meta.la2,
			lo2: meta.lo2,
			values: record.values
		};
	});
};

self.onmessage = async (event: MessageEvent<Grib2WorkerRequest>) => {
	try {
		const messages = parseGrib2Messages(event.data.arrayBuffer);
		const response: Grib2WorkerSuccessResponse = { messages };
		postMessage(response, {
			transfer: messages.map((message) => message.values.buffer)
		});
	} catch (error) {
		postMessage({
			error: error instanceof Error ? error.message : String(error)
		} satisfies Grib2WorkerErrorResponse);
	}
};

export type Grib2WorkerResponse = Grib2WorkerSuccessResponse | Grib2WorkerErrorResponse;
