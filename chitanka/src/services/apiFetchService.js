import fs from "fs";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { Sema } from "async-sema";
import { Open } from "unzipper";
import xml2js from "xml2js";
import { pool } from "../db.js";
import { authorModel } from "../models/authorModel.js";
import { textModel } from "../models/textModel.js";
import {
  safeName,
  log as originalLog,
  scanExistingFiles,
} from "../utils/file.js";

const LOG_FILE = "apiFetch.log";
const BASE_DIR = "./data";
const LETTERS = "абвгдежзийклмнопрстуфхцчшщюя";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function enhancedLog(file, message, level = "INFO") {
  const timestamp = new Date().toISOString();
  const formattedMsg = `[${timestamp}] [${level}] ${message}`;
  originalLog(file, formattedMsg);
}

export async function browserFetch(url, options = {}, retryCount = 0) {
  const MAX_RETRIES = 5;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "*/*",
        ...options.headers,
      },
    });

    if (res.status === 429) {
      const waitTime = Math.pow(2, retryCount) * 5000;
      enhancedLog(
        LOG_FILE,
        `RATE LIMIT (429) на ${url}. Изчакване ${waitTime}ms...`,
        "WARN"
      );
      await sleep(waitTime);
      if (retryCount < MAX_RETRIES)
        return browserFetch(url, options, retryCount + 1);
    }
    return res;
  } catch (err) {
    if (retryCount < MAX_RETRIES) {
      await sleep(3000);
      return browserFetch(url, options, retryCount + 1);
    }
    throw err;
  }
}

export function* generateTriplets() {
  for (const a of LETTERS)
    for (const b of LETTERS) for (const c of LETTERS) yield a + b + c;
}

export async function fetchTexts(query) {
  try {
    const res = await browserFetch(
      `https://chitanka.info/texts/search.xml?q=${encodeURIComponent(query)}`
    );
    if (!res || !res.ok) return [];
    const xml = await res.text();
    const data = await xml2js.parseStringPromise(xml).catch(() => null);
    if (!data?.results?.texts?.[0]?.text) return [];

    return data.results.texts[0].text.map((t) => ({
      textId: t.id[0],
      textTitle: t.title?.[0] || "",
      textSubtitle: t.subtitle?.[0] || "",
      authorId: t.author?.[0]?.id?.[0] || null,
      year: t.year?.[0]?._
        ? parseInt(t.year[0]._, 10)
        : t.year?.[0]
        ? parseInt(t.year[0], 10)
        : null,
    }));
  } catch (err) {
    return [];
  }
}

export async function fetchAuthorByIdCached(client, authorId, authorCache, authorSem) {
  if (!authorId) return null;
  if (authorCache.has(authorId)) return authorCache.get(authorId);

  await authorSem.acquire();
  try {
    const res = await browserFetch(
      `https://chitanka.info/persons/search.xml?q=${authorId}&by=id&match=exact`
    );
    if (!res || !res.ok) return null;

    const xml = await res.text();
    const data = await xml2js.parseStringPromise(xml).catch(() => null);
    const p = data?.results?.persons?.[0]?.person?.[0];
    
    if (!p || !p.name || !p.name[0]) {
      enhancedLog(LOG_FILE, `Author XML for ID ${authorId} is empty or invalid`, "WARN");
      return null;
    }

    const countryName = p?.country?.[0] || "Unknown";

    const countryId = await authorModel.ensureCountry(client, countryName);

    const author = {
      authorId,
      authorCountry: countryName,
      authorName: p?.name?.[0] || "Unknown",
      authorOriginalName: p?.["real-name"]?.[0] || p?.name?.[0] || "Unknown",
      countryId: countryId,
    };

    await authorModel.ensureAuthor(client, {
      id: author.authorId,
      name: author.authorName,
      originalName: author.authorOriginalName,
      countryId: author.countryId,
    });

    authorCache.set(authorId, author);
    return author;
  } finally {
    authorSem.release();
    await sleep(500);
  }
}

export async function downloadTextZip(textId) {
  try {
    const res = await browserFetch(
      `https://m3.chitanka.info/text/${textId}.txt.zip`
    );
    if (!res || !res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export async function extractTxtFromZip(zipBuffer) {
  try {
    const directory = await Open.buffer(zipBuffer);
    const entry = directory.files.find(
      (f) => f.type === "File" && f.path.endsWith(".txt")
    );
    if (!entry) return null;
    return (await entry.buffer()).toString("utf8");
  } catch {
    return null;
  }
}

export async function processText(
  client,
  currentIdx,
  maxNewFiles,
  t,
  seenIds,
  existingFiles,
  authorCache,
  authorSem
) {
  const fileName = `${t.textId}_${safeName(t.textTitle)}!.txt`;

  if (existingFiles.has(fileName)) return false;
  if (seenIds.has(t.textId.toString())) return false;

  const author = await fetchAuthorByIdCached(
    client,
    t.authorId,
    authorCache,
    authorSem
  );

  enhancedLog(
    LOG_FILE,
    `[${currentIdx + 1}/${maxNewFiles}] Downloading: ${t.textTitle}`
  );
  const zipBuffer = await downloadTextZip(t.textId);
  if (!zipBuffer) return false;

  const extracted = await extractTxtFromZip(zipBuffer);
  if (!extracted) return false;

  await textModel.ensureText(client, {
    id: t.textId,
    title: t.textTitle,
    authorId: t.authorId,
  });

  seenIds.add(t.textId.toString());

  const countryFolder = safeName(author?.authorCountry || "Unknown");
  const countryPath = path.join(BASE_DIR, countryFolder);
  await mkdir(countryPath, { recursive: true });
  await writeFile(path.join(countryPath, fileName), extracted, "utf8");

  existingFiles.add(fileName);
  enhancedLog(
    LOG_FILE,
    `[${currentIdx + 1}/${maxNewFiles}] Saved: ${fileName}`
  );
  return true;
}

export async function runApiFetch(maxNewFiles = 100) {
  enhancedLog(LOG_FILE, "Starting apiFetchService...", "INFO");
  await mkdir(BASE_DIR, { recursive: true });

  const client = await pool.connect();

  try {
    const seenIdsRows = await client.query("SELECT TEXT_ID FROM TEXT");
    const seenIds = new Set(seenIdsRows.rows.map((r) => r.text_id.toString()));

    const authorCache = new Map();
    const existingFiles = scanExistingFiles(BASE_DIR);

    const authorSem = new Sema(1);
    let filesSaved = 0;

    for (const trip of generateTriplets()) {
      if (filesSaved >= maxNewFiles) break;

      enhancedLog(LOG_FILE, `Searching triplet: ${trip}`, "INFO");
      const texts = await fetchTexts(trip);

      for (const t of texts) {
        if (filesSaved >= maxNewFiles) break;

        const success = await processText(
          client,
          filesSaved,
          maxNewFiles,
          t,
          seenIds,
          existingFiles,
          authorCache,
          authorSem
        );

        if (success) {
          filesSaved++;
          await sleep(1500);
        }
      }
      await sleep(1000);
    }

    enhancedLog(
      LOG_FILE,
      `apiFetchService finished. New files: ${filesSaved}`,
      "INFO"
    );
  } catch (err) {
    enhancedLog(LOG_FILE, `CRITICAL ERROR: ${err.message}`, "ERROR");
    throw err;
  } finally {
    client.release();
  }
}
