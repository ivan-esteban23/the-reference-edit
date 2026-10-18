// The directory script (src/ts/directory.ts) owns these bindings at global scope, exactly as the
// classic <script> tags did. tsconfig.legacy.json checks directory.ts and collection.ts together,
// so they need no declarations here; the strict program lists only the standalone scripts and
// relies on this file. Delete an entry once its consumer imports it instead.
declare function t(value: string): string;
