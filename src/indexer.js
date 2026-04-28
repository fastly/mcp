import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";

// API docs are bundled in the docs/ directory at the package root.
const DOCS_DIR = join(import.meta.dirname ?? import.meta.dir, "../docs");

function cleanDocText(text) {
  return text
    .trim()
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\\/g, "")
    .trim();
}

/**
 * Parse a single *Api.md file into an array of method records.
 */
function parseApiDoc(content, apiClass) {
  const methods = [];

  // 1. Parse the summary table to get method -> httpMethod + httpPath + short description
  const summaryMap = new Map();
  const tableRegex =
    /\[?\*\*(\w+)\*\*\]?\([^)]*\)\s*\|\s*\*\*(\w+)\*\*\s+([^\s|]+)\s*\|\s*(.+)/g;
  let m = tableRegex.exec(content);
  while (m !== null) {
    summaryMap.set(m[1], {
      httpMethod: m[2],
      httpPath: m[3].trim(),
      shortDesc: m[4].trim(),
    });
    m = tableRegex.exec(content);
  }

  // 2. Parse per-method sections
  // Each method section starts with: ## `methodName`
  const sectionRegex = /^## `(\w+)`$/gm;
  const sectionStarts = [];
  m = sectionRegex.exec(content);
  while (m !== null) {
    sectionStarts.push({ name: m[1], index: m.index });
    m = sectionRegex.exec(content);
  }

  for (let i = 0; i < sectionStarts.length; i++) {
    const { name, index: startIdx } = sectionStarts[i];
    const endIdx =
      i + 1 < sectionStarts.length
        ? sectionStarts[i + 1].index
        : content.length;
    const section = content.slice(startIdx, endIdx);

    const summary = summaryMap.get(name);
    if (!summary) continue;

    // Extract description: text between the code block (```...```) and ### Example
    let description = summary.shortDesc;
    const codeBlockEnd = section.indexOf("```\n", section.indexOf("```\n") + 4);
    if (codeBlockEnd !== -1) {
      const afterCode = section.slice(codeBlockEnd + 4);
      const exampleIdx = afterCode.indexOf("### Example");
      if (exampleIdx !== -1) {
        const rawDesc = cleanDocText(afterCode.slice(0, exampleIdx));
        if (rawDesc) description = rawDesc;
      }
    }

    // Extract params from Options table
    const params = [];
    const optionsIdx = section.indexOf("### Options");
    const returnIdx = section.indexOf("### Return type");
    if (optionsIdx !== -1) {
      const optionsEnd = returnIdx !== -1 ? returnIdx : section.length;
      const optionsBlock = section.slice(optionsIdx, optionsEnd);
      // Parse table rows line-by-line: **name** | **Type** | Description | Notes
      const lines = optionsBlock.split("\n");
      for (const line of lines) {
        const pm = line.match(
          /^\*\*(\w+)\*\*\s*\|\s*(?:\[?\*\*([^*|[\]]+)\*\*\]?(?:\([^)]*\))?|)\s*\|\s*([^|]*)\|(.*)$/,
        );
        if (!pm) continue;
        const paramName = pm[1];
        const paramType = (pm[2] || "").trim();
        const paramDesc = cleanDocText(pm[3] || "");
        const notes = (pm[4] || "").trim();
        const required = !notes.includes("[optional]");
        params.push({
          name: paramName,
          type: paramType,
          required,
          description: paramDesc,
        });
      }
    }

    // Extract example code block
    let example = "";
    const exampleIdx = section.indexOf("### Example");
    if (exampleIdx !== -1) {
      const afterExample = section.slice(exampleIdx);
      const codeStart = afterExample.indexOf("```javascript\n");
      if (codeStart !== -1) {
        const codeBody = afterExample.slice(codeStart + 14);
        const codeEnd = codeBody.indexOf("```");
        if (codeEnd !== -1) {
          example = codeBody.slice(0, codeEnd).trim();
        }
      }
    }

    // Extract return type
    let returnType = "void";
    if (returnIdx !== -1) {
      const returnBlock = section.slice(returnIdx + 15).trim();
      const firstLine = returnBlock.split("\n")[0].trim();
      // Could be: **Type**, [**Type**](link), **{Type: Type}**
      const typeMatch = firstLine.match(/\[?\*\*([^*]+)\*\*\]?(?:\([^)]*\))?/);
      if (typeMatch) {
        returnType = typeMatch[1].trim();
      } else if (firstLine === "null (empty response body)") {
        returnType = "null";
      }
    }

    methods.push({
      apiClass,
      method: name,
      httpMethod: summary.httpMethod,
      httpPath: summary.httpPath,
      description,
      params,
      returnType,
      example,
    });
  }

  return methods;
}

/**
 * Build the full index from all docs/*Api.md files.
 * Returns the flat array of method records.
 */
export async function buildIndex(docsDir = DOCS_DIR) {
  const files = await readdir(docsDir);
  const apiFiles = files.filter(
    (f) => f.endsWith("Api.md") && !f.startsWith("."),
  );

  if (apiFiles.length === 0) {
    throw new Error(`No *Api.md files found in ${docsDir}`);
  }

  const index = [];
  let filesWithMethods = 0;
  const warnings = [];

  for (const file of apiFiles) {
    const apiClass = basename(file, ".md");
    const content = await readFile(join(docsDir, file), "utf-8");
    const methods = parseApiDoc(content, apiClass);

    if (methods.length > 0) {
      filesWithMethods++;
    } else {
      warnings.push(`${file} yielded no methods`);
    }

    for (const method of methods) {
      if (!method.httpMethod || !method.httpPath) {
        throw new Error(
          `${apiClass}.${method.method} missing httpMethod or httpPath`,
        );
      }
      if (!method.description) {
        warnings.push(`${apiClass}.${method.method} has empty description`);
      }
    }

    index.push(...methods);
  }

  // Required checks
  if (index.length === 0) {
    throw new Error("Index is empty — no methods were parsed from any file");
  }

  const ratio = filesWithMethods / apiFiles.length;
  if (ratio < 0.5) {
    throw new Error(
      `Only ${filesWithMethods}/${apiFiles.length} Api.md files yielded methods (< 50%)`,
    );
  }

  // Quality warnings
  if (apiFiles.length !== 133) {
    warnings.push(`Expected 133 Api.md files, found ${apiFiles.length}`);
  }

  if (warnings.length > 0) {
    console.error(`[indexer] ${warnings.length} warnings:`);
    for (const w of warnings) {
      console.error(`  - ${w}`);
    }
  }

  console.error(
    `[indexer] Built index: ${index.length} methods across ${filesWithMethods} API classes from ${apiFiles.length} files`,
  );

  return index;
}
