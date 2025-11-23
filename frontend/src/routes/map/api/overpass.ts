export const searchFacility = async (query: string, bbox?: [number, number, number, number]) => {
	const overpassQuery = `
		[out:json][timeout:25];
		(
			node["name"~"${query}"];
			way["name"~"${query}"];
			relation["name"~"${query}"];
		);
		out center;
	`;

	const response = await fetch('https://overpass-api.de/api/interpreter', {
		method: 'POST',
		body: overpassQuery
	});

	const data = await response.json();
	return data.elements;
};
