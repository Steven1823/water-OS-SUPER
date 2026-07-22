import fs from 'node:fs';

function readUtf16(path) {
  return fs.readFileSync(path, 'utf16le');
}

function printMatches(label, content, regex) {
  const lines = content.split(/\r?\n/).filter((line) => regex.test(line));
  console.log(`=== ${label} ===`);
  if (lines.length === 0) {
    console.log('NO_MATCH');
    return;
  }
  for (const line of lines.slice(0, 80)) {
    console.log(line);
  }
}

try {
  const build = readUtf16('water-management-system/tmp-build.txt');
  printMatches('BUILD', build, /TS\d+|error|failed|Cannot find|not assignable|does not exist/i);
} catch (error) {
  console.log('=== BUILD ===');
  console.log(`READ_FAIL: ${String(error)}`);
}

try {
  const supabaseStart = readUtf16('water-management-system/tmp-supabase-start.txt');
  printMatches('SUPABASE_START', supabaseStart, /failed|docker|cannot|error|connect|daemon|npipe/i);
} catch (error) {
  console.log('=== SUPABASE_START ===');
  console.log(`READ_FAIL: ${String(error)}`);
}
