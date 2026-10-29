import sharp from "sharp";
import fs from "fs";

/**
 * scripts/generate-icons.mjs
 * One-off / CI script to generate square app icons (icon.png, apple-icon.png, favicon.ico)
 * from the calendar-G mark of the Gatherly brand logo, and generate lightweight 2x/3x
 * optimized header logos.
 */
async function generate() {
  const markWidth = 814 - 31;
  const markHeight = 656 - 81;
  const size = Math.max(markWidth, markHeight);

  const markBuffer = await sharp("public/logo.png")
    .extract({ left: 31, top: 81, width: markWidth, height: markHeight })
    .toBuffer();

  const paddedSize = Math.round(size * 1.15);
  const leftPad = Math.round((paddedSize - markWidth) / 2);
  const topPad = Math.round((paddedSize - markHeight) / 2);

  const squareMark = await sharp({
    create: {
      width: paddedSize,
      height: paddedSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: markBuffer, left: leftPad, top: topPad }])
    .png()
    .toBuffer();

  // Save icon.png (512x512)
  await sharp(squareMark).resize(512, 512).png().toFile("src/app/icon.png");

  // Save apple-icon.png (180x180)
  await sharp(squareMark).resize(180, 180).png().toFile("src/app/apple-icon.png");

  // Save 32x32 and 16x16 PNGs
  await sharp(squareMark).resize(32, 32).png().toFile("public/icon-32.png");
  await sharp(squareMark).resize(16, 16).png().toFile("public/icon-16.png");

  // Build multi-res ICO (16, 32, 48)
  const b16 = await sharp(squareMark).resize(16, 16).png().toBuffer();
  const b32 = await sharp(squareMark).resize(32, 32).png().toBuffer();
  const b48 = await sharp(squareMark).resize(48, 48).png().toBuffer();

  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // reserved
  icoHeader.writeUInt16LE(1, 2); // ICO type
  icoHeader.writeUInt16LE(3, 4); // 3 images

  const entries = [
    { w: 16, h: 16, buf: b16 },
    { w: 32, h: 32, buf: b32 },
    { w: 48, h: 48, buf: b48 },
  ];

  let offset = 6 + 16 * entries.length;
  const dirBuffers = [];
  for (const e of entries) {
    const dir = Buffer.alloc(16);
    dir.writeUInt8(e.w, 0);
    dir.writeUInt8(e.h, 1);
    dir.writeUInt8(0, 2); // color count
    dir.writeUInt8(0, 3); // reserved
    dir.writeUInt16LE(1, 4); // color planes
    dir.writeUInt16LE(32, 6); // bpp
    dir.writeUInt32LE(e.buf.length, 8); // size
    dir.writeUInt32LE(offset, 12); // offset
    dirBuffers.push(dir);
    offset += e.buf.length;
  }

  const icoBuffer = Buffer.concat([icoHeader, ...dirBuffers, b16, b32, b48]);
  fs.writeFileSync("src/app/favicon.ico", icoBuffer);
  fs.writeFileSync("public/favicon.ico", icoBuffer);

  // Optimized header logos: 360px wide (retina for 120px display width, 36-40px height)
  await sharp("public/logo.png")
    .resize(360, null)
    .png({ quality: 90, compressionLevel: 9 })
    .toFile("public/logo-opt.png");

  await sharp("public/logo-dark.png")
    .resize(360, null)
    .png({ quality: 90, compressionLevel: 9 })
    .toFile("public/logo-dark-opt.png");

  console.log("All icons and optimized logos generated successfully.");
}

generate().catch(console.error);

