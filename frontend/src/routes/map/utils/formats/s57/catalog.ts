import Papa from 'papaparse';
import attributesCsv from './catalog/s57attributes.csv?raw';
import objectsCsv from './catalog/s57objectclasses.csv?raw';

const rows = (csv: string) =>
	Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true }).data;
const objects = new Map(
	rows(objectsCsv).map(row => [Number(row.Code), {
		acronym: row.Acronym,
		name: row.ObjectClass
	}])
);
export const objectClass = (code: number) =>
	objects.get(code) ?? {
		acronym: `OBJL_${code}`,
		name: `Object class ${code}`
	};

const attributes = new Map(rows(attributesCsv).map(row => [Number(row.Code), row]));
export const attribute = (code: number, value: string): [string, string | number] => {
	const definition = attributes.get(code);
	const number = Number(value);
	return [
		definition?.Acronym ?? `ATTR_${code}`,
		definition && ['I', 'F', 'E'].includes(definition.Attributetype)
			&& value.trim() !== '' && Number.isFinite(number)
			? number
			: value
	];
};
