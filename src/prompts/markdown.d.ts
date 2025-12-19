/**
 * TypeScript declaration for importing markdown files as raw strings using Vite's ?raw suffix
 * This enables build-time bundling of prompt files instead of runtime file system access
 */
declare module '*.md?raw' {
  const content: string;
  export default content;
}
