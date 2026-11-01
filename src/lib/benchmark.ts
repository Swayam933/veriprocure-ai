import vm from "node:vm";

export type BenchmarkTask = {
  id: string;
  name: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  category: "validation" | "algorithms" | "data-structures" | "async";
  prompt: string;
  entryFunctionName: string;
  testSuiteCode: string;
};

export type ExecutionResult = {
  passed: boolean;
  totalTests: number;
  passedTests: number;
  errors: string[];
  executionMs: number;
  extractedCode?: string;
};

export const BENCHMARK_TASKS: BenchmarkTask[] = [
  {
    id: "email-validator",
    name: "Robust Email Validator",
    difficulty: "intermediate",
    category: "validation",
    entryFunctionName: "isValidEmail",
    prompt: "Write a TypeScript function named isValidEmail(email: unknown): boolean that validates an email address. It must accept string inputs with standard local-part@domain.tld, reject non-strings, null, undefined, empty strings, strings without @, multiple @ signs, missing domain, missing top-level domain, or spaces. Return true for valid emails, false otherwise.",
    testSuiteCode: `
      assert(isValidEmail("alice@example.com") === true, "Standard email should return true");
      assert(isValidEmail("user.name+tag@domain.co.uk") === true, "Tagged email with subdomains should return true");
      assert(isValidEmail("customer123@sub.domain.org") === true, "Alphanumeric email should return true");
      assert(isValidEmail("plainaddress") === false, "Missing @ should return false");
      assert(isValidEmail("@missing-local.com") === false, "Missing local part should return false");
      assert(isValidEmail("user@.com") === false, "Missing domain name before TLD should return false");
      assert(isValidEmail("user@domain") === false, "Missing TLD should return false");
      assert(isValidEmail("user@domain..com") === false, "Consecutive dots in domain should return false");
      assert(isValidEmail("user with spaces@domain.com") === false, "Spaces in local part should return false");
      assert(isValidEmail("user@domain .com") === false, "Spaces in domain should return false");
      assert(isValidEmail(null) === false, "Null should return false");
      assert(isValidEmail(undefined) === false, "Undefined should return false");
      assert(isValidEmail(12345) === false, "Number input should return false");
      assert(isValidEmail({}) === false, "Object input should return false");
      assert(isValidEmail("") === false, "Empty string should return false");
    `
  },
  {
    id: "fibonacci-memo",
    name: "Fibonacci with Memoization",
    difficulty: "beginner",
    category: "algorithms",
    entryFunctionName: "fibonacci",
    prompt: "Write a TypeScript/JavaScript function named fibonacci(n: number): number that calculates the nth Fibonacci number (0-indexed: fibonacci(0) = 0, fibonacci(1) = 1, fibonacci(2) = 1, etc.). It must handle negative numbers by throwing an Error or returning NaN, and compute values up to n=45 efficiently.",
    testSuiteCode: `
      assertEqual(fibonacci(0), 0, "fibonacci(0) should be 0");
      assertEqual(fibonacci(1), 1, "fibonacci(1) should be 1");
      assertEqual(fibonacci(2), 1, "fibonacci(2) should be 1");
      assertEqual(fibonacci(3), 2, "fibonacci(3) should be 2");
      assertEqual(fibonacci(7), 13, "fibonacci(7) should be 13");
      assertEqual(fibonacci(10), 55, "fibonacci(10) should be 55");
      assertEqual(fibonacci(20), 6765, "fibonacci(20) should be 6765");
      assertEqual(fibonacci(35), 9227465, "fibonacci(35) should be 9227465");
      let threw = false;
      try {
        const val = fibonacci(-5);
        if (Number.isNaN(val)) threw = true;
      } catch {
        threw = true;
      }
      assert(threw, "Negative inputs must reject with Error or NaN");
    `
  },
  {
    id: "lru-cache",
    name: "Least Recently Used (LRU) Cache",
    difficulty: "advanced",
    category: "data-structures",
    entryFunctionName: "LRUCache",
    prompt: "Implement a TypeScript/JavaScript class named LRUCache with constructor(capacity: number), get(key: any): any (returns value or undefined/-1 if not present), and put(key: any, value: any): void. When the cache exceeds capacity, evict the least recently accessed item. Both get and put mark an item as recently used.",
    testSuiteCode: `
      const cache = new LRUCache(2);
      cache.put(1, "one");
      cache.put(2, "two");
      assertEqual(cache.get(1), "one", "get(1) should return 'one'");
      cache.put(3, "three"); // evicts key 2
      const key2Val = cache.get(2);
      assert(key2Val === undefined || key2Val === -1 || key2Val === null, "Key 2 should be evicted");
      assertEqual(cache.get(3), "three", "get(3) should return 'three'");
      assertEqual(cache.get(1), "one", "get(1) should return 'one'");
      cache.put(4, "four"); // evicts key 3 because 1 was accessed
      const key3Val = cache.get(3);
      assert(key3Val === undefined || key3Val === -1 || key3Val === null, "Key 3 should be evicted");
      assertEqual(cache.get(4), "four", "get(4) should return 'four'");
      assertEqual(cache.get(1), "one", "get(1) should still be in cache");
    `
  },
  {
    id: "deep-clone",
    name: "Deep Object Cloner with Circular Ref Handling",
    difficulty: "intermediate",
    category: "algorithms",
    entryFunctionName: "deepClone",
    prompt: "Write a JavaScript/TypeScript function named deepClone(obj: any): any that creates a deep clone of a nested object or array. It must copy primitive values, arrays, nested objects, Dates, and handle circular references without causing infinite loops.",
    testSuiteCode: `
      const original = { a: 1, b: [2, 3], c: { d: "hello", e: new Date(1700000000000) } };
      const cloned = deepClone(original);
      assertEqual(cloned.a, 1, "Primitive value cloned");
      assert(cloned !== original, "Root reference must differ");
      assert(cloned.b !== original.b, "Array reference must differ");
      assertEqual(cloned.b[0], 2, "Array contents copied");
      assert(cloned.c !== original.c, "Nested object reference must differ");
      assertEqual(cloned.c.d, "hello", "Nested properties copied");
      if (cloned.c.e instanceof Date) {
        assertEqual(cloned.c.e.getTime(), original.c.e.getTime(), "Date value copied");
      }
      // Circular reference test
      const circ = { name: "loop" };
      circ.self = circ;
      let circClone;
      try {
        circClone = deepClone(circ);
        assert(circClone !== circ, "Circular clone root must differ");
        assert(circClone.self === circClone, "Circular reference must point to clone self");
      } catch (e) {
        assert(false, "Circular clone threw: " + e.message);
      }
    `
  }
];

export function findMatchingBenchmark(text: string): BenchmarkTask | undefined {
  const lower = text.toLowerCase();
  for (const b of BENCHMARK_TASKS) {
    if (lower.includes(b.id) || lower.includes(b.entryFunctionName.toLowerCase())) return b;
  }
  // Keyword heuristic matching
  if (lower.includes("email") && (lower.includes("valid") || lower.includes("check"))) {
    return BENCHMARK_TASKS.find(b => b.id === "email-validator");
  }
  if (lower.includes("fibonacci")) {
    return BENCHMARK_TASKS.find(b => b.id === "fibonacci-memo");
  }
  if (lower.includes("lru") || (lower.includes("cache") && lower.includes("evict"))) {
    return BENCHMARK_TASKS.find(b => b.id === "lru-cache");
  }
  if (lower.includes("deep clone") || lower.includes("deepclone") || (lower.includes("clone") && lower.includes("circular"))) {
    return BENCHMARK_TASKS.find(b => b.id === "deep-clone");
  }
  return undefined;
}

export function extractCodeBlock(markdownOrCode: string): string {
  if (!markdownOrCode) return "";
  // Look for fenced code blocks with ts, tsx, js, javascript
  const fenceRegex = /```(?:typescript|ts|javascript|js)?\s*\n([\s\S]*?)```/gi;
  const matches = [...markdownOrCode.matchAll(fenceRegex)];
  if (matches.length > 0) {
    // Return all code blocks concatenated or the largest one
    return matches.map(m => m[1].trim()).join("\n\n");
  }
  // If no fences, return raw text trimmed
  return markdownOrCode.trim();
}

export function stripTypescript(code: string): string {
  try {
    // Attempt dynamic require of typescript if available
    const ts = require("typescript");
    return ts.transpileModule(code, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS
      }
    }).outputText;
  } catch {
    // Fallback: clean regex-based type annotation stripping
    return code
      .replace(/:\s*(?:string|number|boolean|any|unknown|void|never|null|undefined|RegExp|object|Date)(?:\[\])?/g, "")
      .replace(/interface\s+\w+\s*\{[\s\S]*?\}/g, "")
      .replace(/type\s+\w+\s*=\s*[\s\S]*?;/g, "")
      .replace(/as\s+(?:string|number|boolean|any|unknown)/g, "");
  }
}

export function runDeterministicVerification(code: string, testSuiteCode: string): ExecutionResult {
  const rawCode = extractCodeBlock(code);
  const transpiled = stripTypescript(rawCode);

  const codeToRun = `
    "use strict";
    let __testsPassed = 0;
    let __testsTotal = 0;
    const __errors = [];

    function assert(condition, message) {
      __testsTotal++;
      if (!condition) {
        __errors.push("Assertion failed: " + (message || "condition was falsy"));
      } else {
        __testsPassed++;
      }
    }

    function assertEqual(actual, expected, message) {
      __testsTotal++;
      const actualStr = JSON.stringify(actual);
      const expectedStr = JSON.stringify(expected);
      if (actualStr !== expectedStr) {
        __errors.push((message || "assertEqual failed") + ": expected " + expectedStr + ", got " + actualStr);
      } else {
        __testsPassed++;
      }
    }

    // User code execution
    ${transpiled}

    // Test assertions execution
    try {
      ${testSuiteCode}
    } catch (err) {
      __errors.push("Runtime exception during test assertions: " + (err && err.message ? err.message : String(err)));
    }

    ({
      passed: __errors.length === 0 && __testsTotal > 0,
      totalTests: __testsTotal,
      passedTests: __testsPassed,
      errors: __errors
    });
  `;

  const context = vm.createContext({
    console: { log: () => {}, error: () => {}, warn: () => {} },
    Date: Date,
    Math: Math,
    JSON: JSON,
    RegExp: RegExp,
    Array: Array,
    Object: Object,
    String: String,
    Number: Number,
    Boolean: Boolean,
    Error: Error,
    Map: Map,
    Set: Set
  });

  const startTime = Date.now();
  try {
    const result = vm.runInContext(codeToRun, context, { timeout: 2500 });
    return {
      passed: Boolean(result?.passed),
      totalTests: Number(result?.totalTests ?? 0),
      passedTests: Number(result?.passedTests ?? 0),
      errors: Array.isArray(result?.errors) ? result.errors : [],
      executionMs: Date.now() - startTime,
      extractedCode: transpiled.slice(0, 2000)
    };
  } catch (err: any) {
    return {
      passed: false,
      totalTests: 1,
      passedTests: 0,
      errors: ["Execution error: " + (err.message || String(err))],
      executionMs: Date.now() - startTime,
      extractedCode: transpiled.slice(0, 2000)
    };
  }
}

