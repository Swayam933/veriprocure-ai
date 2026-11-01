import vm from "node:vm";

function runSandboxTest(userCode, testSuiteCode) {
  const codeToRun = `
    "use strict";
    ${userCode}

    let __testsPassed = 0;
    let __testsTotal = 0;
    const __errors = [];

    function assert(condition, message) {
      __testsTotal++;
      if (!condition) {
        __errors.push("Assertion failed: " + message);
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

    try {
      ${testSuiteCode}
    } catch (e) {
      __errors.push("Runtime error during test execution: " + e.message);
    }

    ({ passed: __errors.length === 0 && __testsTotal > 0, totalTests: __testsTotal, passedTests: __testsPassed, errors: __errors });
  `;

  const context = vm.createContext({
    console: { log: () => {} },
    setTimeout: undefined,
    setInterval: undefined,
    fetch: undefined
  });

  const startTime = Date.now();
  try {
    const result = vm.runInContext(codeToRun, context, { timeout: 1500 });
    return { ...result, executionMs: Date.now() - startTime };
  } catch (err) {
    return { passed: false, totalTests: 1, passedTests: 0, errors: [err.message], executionMs: Date.now() - startTime };
  }
}

// Test candidate code
const candidateCode = `
  function isValidEmail(email) {
    if (typeof email !== 'string') return false;
    const re = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    return re.test(email.trim());
  }
`;

const testSuite = `
  assert(isValidEmail("alice@example.com"), "standard email should pass");
  assert(isValidEmail("bob.smith+tag@domain.co.uk"), "tagged email should pass");
  assert(!isValidEmail("invalid-email"), "string without @ should fail");
  assert(!isValidEmail("test@"), "missing domain should fail");
  assert(!isValidEmail("@domain.com"), "missing local part should fail");
  assert(!isValidEmail(null), "null input should fail");
  assert(!isValidEmail(12345), "numeric input should fail");
`;

const outcome = runSandboxTest(candidateCode, testSuite);
console.log("Sandbox test outcome:", outcome);

