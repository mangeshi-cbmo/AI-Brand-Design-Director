import sharp from "sharp";

/*
 * Background removal for generated logo marks.
 *
 * Google image models return opaque images (no alpha channel support like
 * gpt-image-1's transparent background). The generation prompt asks for one
 * flat, uniform, contrasting background color; this util samples the corner
 * colors and flood-fills from the image borders, clearing only the connected
 * outer background region — interior elements that happen to share the
 * background color are preserved.
 */

const TOLERANCE = 32; // max per-channel distance to count as background

export async function stripBackground(dataUrl: string): Promise<string> {
  try {
    const match = dataUrl.match(/^data:image\/[a-z+.-]+;base64,(.+)$/i);
    if (!match) return dataUrl;

    const input = Buffer.from(match[1], "base64");
    const { data, info } = await sharp(input)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const { width, height } = info;

    // Already meaningfully transparent? Keep the original.
    let transparentCount = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 128) transparentCount++;
    }
    if (transparentCount > width * height * 0.02) return dataUrl;

    // Reference background colors: the four corner pixels
    const idx = (x: number, y: number) => (y * width + x) * 4;
    const corners = [
      idx(0, 0),
      idx(width - 1, 0),
      idx(0, height - 1),
      idx(width - 1, height - 1),
    ].map((i) => [data[i], data[i + 1], data[i + 2]]);

    const isBackground = (i: number) =>
      corners.some(
        ([r, g, b]) =>
          Math.abs(data[i] - r) <= TOLERANCE &&
          Math.abs(data[i + 1] - g) <= TOLERANCE &&
          Math.abs(data[i + 2] - b) <= TOLERANCE
      );

    // BFS flood fill from every border pixel that matches a corner color
    const visited = new Uint8Array(width * height);
    const queue: number[] = [];
    const seed = (x: number, y: number) => {
      const p = y * width + x;
      if (!visited[p] && isBackground(p * 4)) {
        visited[p] = 1;
        queue.push(p);
      }
    };
    for (let x = 0; x < width; x++) {
      seed(x, 0);
      seed(x, height - 1);
    }
    for (let y = 0; y < height; y++) {
      seed(0, y);
      seed(width - 1, y);
    }

    let cleared = 0;
    while (queue.length > 0) {
      const p = queue.pop()!;
      data[p * 4 + 3] = 0;
      cleared++;
      const x = p % width;
      const y = (p / width) | 0;
      const neighbors = [
        x > 0 ? p - 1 : -1,
        x < width - 1 ? p + 1 : -1,
        y > 0 ? p - width : -1,
        y < height - 1 ? p + width : -1,
      ];
      for (const n of neighbors) {
        if (n >= 0 && !visited[n] && isBackground(n * 4)) {
          visited[n] = 1;
          queue.push(n);
        }
      }
    }

    // A flat-background icon should clear a substantial outer region; if
    // almost nothing matched, the image likely has a complex background —
    // return it untouched rather than producing a ragged cutout.
    if (cleared < width * height * 0.05) return dataUrl;

    const output = await sharp(data, { raw: { width, height, channels: 4 } })
      .png()
      .toBuffer();
    return `data:image/png;base64,${output.toString("base64")}`;
  } catch (err) {
    console.error("Background removal failed, keeping original image:", err);
    return dataUrl;
  }
}
