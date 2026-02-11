import fs from "fs";
import path from "path";
import { pool } from "../db.js";
import { textModel } from "../models/textModel.js";
import { authorModel } from "../models/authorModel.js";
import { safeName, log } from "../utils/file.js";

const LOG_FILE = "fileProcessor.log";
const BASE_DIR = "./data";
const UNKNOWN_DIR = path.join(BASE_DIR, "Unknown");
const WORD_REGEX = /\p{L}+/gu;

/**
 * Helper to build a safe file path.
 */
function getFilePath(country, textId, textTitle) {
    const fileName = `${textId}_${safeName(textTitle)}!.txt`;
    return path.join(BASE_DIR, safeName(country || "Unknown"), fileName);
}

/**
 * Extracts words and counts unique entries.
 */
export function analyzeText(content) {
    const matches = content.match(WORD_REGEX) || [];
    const uniqueWordsSet = new Set();
    matches.forEach(w => uniqueWordsSet.add(w.toLowerCase()));
    return { total: matches.length, uniqueSet: uniqueWordsSet };
}

/**
 * Calculates average words per sentence.
 */
export function avgWordsPerSentence(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    if (!sentences.length) return 0;

    const totalWords = sentences.reduce((sum, s) => {
        const match = s.match(WORD_REGEX);
        return sum + (match ? match.length : 0);
    }, 0);

    return totalWords / sentences.length;
}

/**
 * Finds the count of words in the longest sentence.
 */
export function lengthOfLongestSentenceInText(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    if (!sentences.length) return 0;

    const wordCounts = sentences.map(s => {
        const match = s.match(WORD_REGEX);
        return match ? match.length : 0;
    });

    return Math.max(...wordCounts);
}

/**
 * Safely reads file content from disk.
 */
function readFileSafe(filePath) {
    try {
        if (!fs.existsSync(filePath)) return null;
        return fs.readFileSync(filePath, "utf-8");
    } catch (err) {
        log(LOG_FILE, `Error reading file ${filePath}: ${err.message}`);
        return null;
    }
}

/**
 * Processes all texts for a single author.
 */
export async function processAuthor(client, author) {
    const texts = await textModel.getTextsByAuthorId(client, author.author_id);
    
    const avgWordsArr = [];
    const authorUniqueWords = new Set();
    let maxSentenceWords = 0;
    let processedAny = false;

    for (const text of texts) {
        // Skip if already processed to save I/O
        if (text.unique_words_count !== null) continue;

        const filePath = getFilePath(author.country_name, text.text_id, text.title);
        const content = readFileSafe(filePath);
        
        if (!content) continue;

        const { total, uniqueSet } = analyzeText(content);
        const avgWords = avgWordsPerSentence(content);
        const longestInText = lengthOfLongestSentenceInText(content);

        // Update individual text stats
        await textModel.updateTextStats(client, text.text_id, uniqueSet.size);

        if (avgWords > 0) avgWordsArr.push(avgWords);
        if (longestInText > maxSentenceWords) maxSentenceWords = longestInText;
        uniqueSet.forEach(word => authorUniqueWords.add(word));

        log(LOG_FILE, `Processed text "${text.title}" (${total} words)`);
        processedAny = true;
    }

    if (processedAny && (avgWordsArr.length > 0 || authorUniqueWords.size > 0)) {
        const avgWordsForAuthor = avgWordsArr.length > 0 
            ? avgWordsArr.reduce((a, b) => a + b, 0) / avgWordsArr.length 
            : null;

        await authorModel.updateAuthorStats(client, author.author_id, {
            avgWords: avgWordsForAuthor ? Math.round(avgWordsForAuthor) : null,
            uniqueWords: authorUniqueWords.size || null,
            maxSentence: maxSentenceWords || null
        });

        log(LOG_FILE, `Updated stats for author ID: ${author.author_id}`);
    }
}

/**
 * Processes files with missing author metadata.
 */
export async function processUnknownTexts(client) {
    if (!fs.existsSync(UNKNOWN_DIR)) return;
    
    const files = fs.readdirSync(UNKNOWN_DIR).filter(f => f.endsWith(".txt"));
    for (const file of files) {
        const filePath = path.join(UNKNOWN_DIR, file);
        const content = readFileSafe(filePath);
        if (!content) continue;
        
        const match = file.match(/^(\d+)_(.+)\.txt$/);
        if (!match) continue;

        const textId = Number(match[1]);
        const { uniqueSet } = analyzeText(content);
        
        await textModel.updateTextStats(client, textId, uniqueSet.size);
        log(LOG_FILE, `Processed unknown text ID: ${textId}`);
    }
}

/**
 * Main Service Entry Point.
 */
export async function runFileProcessor() {
    log(LOG_FILE, "--- Starting File Processor Service ---");
    const client = await pool.connect();
    
    try {
        const authors = await authorModel.getAuthorsForProcessing(client);
        log(LOG_FILE, `Found ${authors.length} authors to process.`);

        for (const author of authors) {
            await processAuthor(client, author);
        }

        await processUnknownTexts(client);
        
        log(LOG_FILE, "--- File Processing Finished Successfully ---");
    } catch (err) {
        log(LOG_FILE, `CRITICAL ERROR in Service: ${err.message}`);
        throw err;
    } finally {
        client.release();
    }
}