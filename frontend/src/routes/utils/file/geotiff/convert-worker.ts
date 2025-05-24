// convert-worker.ts

self.onmessage = (e) => {
	const { rasters, width, height } = e.data as {
		rasters: (Uint8Array | Uint16Array | Float32Array)[];
		width: number;
		height: number;
	};

	try {
		const depth = rasters.length;
		const layerSize = width * height;
		const output = new Float32Array(layerSize * depth);

		for (let z = 0; z < depth; ++z) {
			const band = rasters[z];
			if (band.length !== layerSize) {
				throw new Error(`Band ${z} has incorrect length: ${band.length}`);
			}

			for (let i = 0; i < layerSize; ++i) {
				output[z * layerSize + i] = band[i];
			}
		}

		// 転送（copyではなくmoveする）
		self.postMessage({ result: output }, [output.buffer]);
	} catch (err) {
		self.postMessage({ error: err.message });
	}
};
