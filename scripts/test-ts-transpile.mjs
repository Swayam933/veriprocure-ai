import ts from "typescript";

const tsCode = `
  interface EmailResult {
    valid: boolean;
    reason?: string;
  }
  function isValidEmail(email: string | null | undefined): boolean {
    if (!email || typeof email !== 'string') return false;
    const re: RegExp = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    return re.test(email);
  }
`;

const jsCode = ts.transpileModule(tsCode, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 }
}).outputText;

console.log("Transpiled JS code:\n", jsCode);

