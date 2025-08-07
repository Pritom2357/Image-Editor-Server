const { Rembg }  =  require("@xixiyahaha/rembg-node");
const  sharp = require("sharp");

// const { Rembg } = require("rembg-node");
// const sharp = require("sharp");

(async () => {
	const input = sharp("test-image.png");

	// optional arguments
	const rembg = new Rembg({
		logging: true,
	});

	const output = await rembg.remove(input);

	await output.webp().toFile("test-output.webp");

	// optionally you can use .trim() too!
	await output.trim().webp().toFile("test-output-trimmed.webp");
})();

