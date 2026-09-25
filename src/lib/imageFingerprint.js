import { pipeline } from "@huggingface/transformers";

let extractor = null;

async function getExtractor() {
  if (!extractor) {
    console.log("Loading DINOv2 AI model...");

    extractor = await pipeline(
      "image-feature-extraction",
      "Xenova/dinov2-small"
    );

    console.log("DINOv2 model loaded.");
  }

  return extractor;
}

export async function generateImageFingerprint(imageSource) {
  if (!imageSource) {
    throw new Error("No image provided.");
  }

  const imageFeatureExtractor = await getExtractor();

  console.log("Generating image features...");

  const output = await imageFeatureExtractor(imageSource);

  const data = output.data;
  const dims = output.dims;

  console.log("Raw AI output shape:", dims);

  // DINOv2 output is normally:
  // [1, 257, 384]
  //
  // 1   = batch size
  // 257 = visual tokens
  // 384 = features per token

  if (!dims || dims.length < 3) {
    throw new Error("Unexpected DINOv2 output shape.");
  }

  const numberOfTokens = dims[dims.length - 2];
  const embeddingSize = dims[dims.length - 1];

  if (!data || data.length !== numberOfTokens * embeddingSize) {
    throw new Error("Unexpected DINOv2 feature data.");
  }

  // Mean-pool all tokens into one 384-value vector.
  const fingerprint = new Array(embeddingSize).fill(0);

  for (let token = 0; token < numberOfTokens; token++) {
    for (let feature = 0; feature < embeddingSize; feature++) {
      fingerprint[feature] +=
        data[token * embeddingSize + feature];
    }
  }

  for (let feature = 0; feature < embeddingSize; feature++) {
    fingerprint[feature] /= numberOfTokens;
  }

  // Normalize the fingerprint.
  let magnitude = 0;

  for (const value of fingerprint) {
    magnitude += value * value;
  }

  magnitude = Math.sqrt(magnitude);

  if (magnitude === 0) {
    throw new Error("Image fingerprint has zero magnitude.");
  }

  for (let i = 0; i < fingerprint.length; i++) {
    fingerprint[i] /= magnitude;
  }

  console.log(
    "Final image fingerprint length:",
    fingerprint.length
  );

  return fingerprint;
}