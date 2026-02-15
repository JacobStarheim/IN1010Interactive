import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";

const PDF_DIR = "/Users/jacob/Downloads/IN1010-midtveis";

const EXPECTED = {
  "fasit-midtveis-v24.pdf": "2370bec0cc932248313e13dd5ecd54be7e1913a7a40aaba48cd788ffc224e010",
  "in1010-v25-midt-konte-med-svar.pdf": "20a5ab8b2de9873306a8bc417f4687cf72c736c725e8405adb54be0fa36b3f1f",
  "in1010-v25-midt-konte-uten-svar.pdf": "bbf5c9094ce86f80b90f173c9385b4160282b255217515ca5ca24a432d0691c1",
  "in1010-v25-midtveis-fasit.pdf": "1ba79901d00e6baeb0c119fdddb69b832b301fde9801304e7ab85448949341dd",
  "in1010-v25-midtveis.pdf": "dca0f916dc92cf29671693960d47ce16db186dc97e6046d80d131d048c19dc78",
  "midtveis-v24-konte-fasit.pdf": "da052bdf92f5b0a214b40d666509d90d930421f01d12a6dba95265f09e76390a",
  "midtveis-v24-konte.pdf": "897e325ddbb84c9e964f68f79939b30e20a1d71968226038e5e709dbb0a59a2c",
  "midtveis-v24-prove-fasit.pdf": "f25dcae3e0a5600961bf682e0488c7ed7467cef1f4adb669af0373f7b7d4940c",
  "midtveis-v24-prove.pdf": "bc6012935ba8c9e5bf0dd98d9c14349af2c30d8f4ff14a385be3a35c2742355d",
  "midtveis-v24.pdf": "63bb429ac8fc243d58ae540bf2abee7f9063879671675da7b0110c0000d18a27",
};

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

async function main() {
  for (const fileName of Object.keys(EXPECTED)) {
    const filePath = path.join(PDF_DIR, fileName);
    try {
      await access(filePath);
    } catch {
      console.error(`Missing file: ${filePath}`);
      process.exit(1);
    }

    const actual = await sha256File(filePath);
    const expected = EXPECTED[fileName];
    if (actual !== expected) {
      console.error(`Checksum mismatch for ${fileName}`);
      console.error(`Expected: ${expected}`);
      console.error(`Actual:   ${actual}`);
      process.exit(1);
    }

    console.log(`OK ${fileName}`);
  }

  console.log("All PDF checksums match expected values.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
