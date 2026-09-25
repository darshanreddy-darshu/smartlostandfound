export function calculateCosineSimilarity(
  fingerprintA,
  fingerprintB
) {
  if (!fingerprintA || !fingerprintB) {
    throw new Error("Both fingerprints are required.");
  }

  if (fingerprintA.length !== fingerprintB.length) {
    throw new Error(
      `Fingerprint size mismatch: ${fingerprintA.length} vs ${fingerprintB.length}`
    );
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < fingerprintA.length; i++) {
    const a = fingerprintA[i];
    const b = fingerprintB[i];

    dotProduct += a * b;
    magnitudeA += a * a;
    magnitudeB += b * b;
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  const similarity =
    dotProduct / (magnitudeA * magnitudeB);

  return similarity;
}


export function similarityToPercentage(similarity) {
  const percentage = similarity * 100;

  return Math.max(
    0,
    Math.min(100, percentage)
  );
}