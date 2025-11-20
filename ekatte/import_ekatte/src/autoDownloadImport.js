// FROM CHATGPT

// Download and extract the JSON archive
async function downloadAndExtractJson(url, outputDir) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
  await res.body.pipe(unzipper.Extract({ path: outputDir })).promise();
  console.log('JSON archive downloaded and extracted to', outputDir);
}

// add default code for json
// TO DO 

// Usage
const jsonUrl = 'https://www.nsi.bg/nrnm/ekatte/zip/download?files_type=json'; 
importEKATTEJson(jsonUrl).catch(console.error);
