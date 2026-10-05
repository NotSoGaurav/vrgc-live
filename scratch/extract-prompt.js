const fs = require('fs');
const readline = require('readline');

async function main() {
  const fileStream = fs.createReadStream('C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\f25949ef-ff15-4220-a1d6-e104f351d5bb\\.system_generated\\logs\\transcript_full.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.includes('Add the fixation deta')) {
      const obj = JSON.parse(line);
      console.log(obj.content);
    }
  }
}

main().catch(console.error);
