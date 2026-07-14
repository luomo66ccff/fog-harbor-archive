"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="zh-CN"><body><main className="error-screen"><h1>终端短暂离线</h1><p>本地调查记录尚未清除。</p><button type="button" onClick={reset}>恢复连接</button></main></body></html>;
}

