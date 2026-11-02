type ComponentInitializer = () => void | Promise<void>;

/** Keep one failed enhancement from interrupting the rest of the page. */
export function runInitializers(initializers: Record<string, ComponentInitializer>): void {
  for (const [name, initialize] of Object.entries(initializers)) {
    const reportError = (error: unknown) => console.error(`[Clarity] ${name} 初始化失败`, error);
    try {
      const pending = initialize();
      if (pending) void pending.catch(reportError);
    } catch (error) {
      reportError(error);
    }
  }
}
