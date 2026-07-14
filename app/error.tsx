"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="error-screen"><p className="eyebrow">ARCHIVE RECOVERY FAILURE</p><h1>档案页被潮气粘住了</h1><p>案件存档仍在本机。可以重新装载当前页面，不会删除调查进度。</p><button type="button" className="primary-action" onClick={reset}>重新装载</button></main>;
}

