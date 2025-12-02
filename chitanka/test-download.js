import fs from "fs";
import path from "path";
import axios from "axios";
import unzipper from "unzipper";
import { parseStringPromise } from "xml2js";
import pLimit from "p-limit";

const BASE_DIR = "texts";
const letters = "абвгдежзийклмнопрстуфхцчшщюя";

let totalLookups = 0;
let successfulLookups = 0;
const seenIds = new Set();
let savedResults = 0;

const authorCache = new Map();
const existingFiles = new Set();

// Scan existing files at startup
function scanExistingFiles(dir) {
  if (!fs.existsSync(dir)) return;
  for (const country of fs.readdirSync(dir)) {
    const countryPath = path.join(dir, country);
    if (!fs.statSync(countryPath).isDirectory()) continue;
    for (const f of fs.readdirSync(countryPath)) existingFiles.add(f);
  }
}
scanExistingFiles(BASE_DIR);

function safeName(str) {
  return str
    .replace(/[/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function* generateTriplets() {
  for (const a of letters)
    for (const b of letters) for (const c of letters) yield a + b + c;
}

async function fetchTexts(query) {
  totalLookups++;
  try {
    const res = await axios.get(
      `https://chitanka.info/texts/search.xml?q=${encodeURIComponent(query)}`
    );
    const json = await parseStringPromise(res.data);
    const texts = json.results?.texts?.[0]?.text || [];
    if (texts.length > 0) successfulLookups++;
    return texts.map((t) => ({
      textId: t.id[0],
      textTitle: t.title[0],
      textSubTitle: t.subtitle[0] || null,
      authorId: t.author?.[0].id?.[0] || null,
    }));
  } catch {
    return [];
  }
}

async function fetchAuthorByIdCached(authorId) {
  if (!authorId) return null;
  if (authorCache.has(authorId)) return authorCache.get(authorId);
  try {
    const res = await axios.get(
      `https://chitanka.info/persons/search.xml?q=${authorId}&by=id&match=exact`
    );
    const json = await parseStringPromise(res.data);
    const person = json.results?.persons?.[0]?.person?.[0];
    const author = {
      authorId,
      authorName: person?.name?.[0] || "Unknown",
      authorRealName: person?.["real-name"]?.[0] || "Unknown", // js does not allow '-'
      authorCountry: person?.country?.[0] || "Unknown",
    };
    authorCache.set(authorId, author);
    return author;
  } catch {
    return null;
  }
}

async function downloadAndExtract(text, limit, overrideExistingFiles = false) {
  if (savedResults >= limit || seenIds.has(text.textId)) return false;

  const author = await fetchAuthorByIdCached(text.authorId);
  const countryDir = path.join(
    BASE_DIR,
    safeName(author?.authorCountry || "Unknown")
  );
  if (!fs.existsSync(countryDir)) fs.mkdirSync(countryDir, { recursive: true });

  const fileName = `${safeName(text.textTitle)}!.txt`;
  if (existingFiles.has(fileName) && !overrideExistingFiles) return false;
  const outputPath = path.join(countryDir, fileName);

  try {
    const resp = await axios.get(
      `https://chitanka.info/text/${text.textId}.txt.zip`,
      {
        responseType: "stream",
      }
    );
    
    await resp.data
      .pipe(unzipper.Parse())
      .on("entry", (entry) => {
        if (entry.path.endsWith(".txt")) 
          entry.pipe(fs.createWriteStream(outputPath));
        else entry.autodrain();
      })
      .promise();

    if (savedResults < limit) {
      savedResults++;
      seenIds.add(text.textId);
      existingFiles.add(fileName);
    }

    return true;
  } catch {
    return false;
  }
}

// solution may include using a mutex for the limit
async function main(limit) {
  // allow only 20 concurrent fetch operations at a time.
  // It’s basically a semaphore for async functions.
  const fetchLimit = pLimit(20);
  const downloadLimit = pLimit(20);

  const triplets = [...generateTriplets()];

  const tasks = triplets.map((triplet) =>
    fetchLimit(async () => {
      if (savedResults >= limit) return;

      const texts = await fetchTexts(triplet);
      const downloadTasks = texts.map((t) =>
        downloadLimit(() => downloadAndExtract(t, limit))
      );

      await Promise.all(downloadTasks);
    })
  );

  await Promise.all(tasks);

  // real result should vary with max error of concurrensy
  console.log("Total lookups:", totalLookups);
  console.log("Successful lookups:", `${successfulLookups}/${totalLookups}`);
  console.log("Unique results:", seenIds.size);
  console.log("Saved results:", savedResults);
}

main(50);
