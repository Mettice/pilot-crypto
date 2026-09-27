import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Leo's replies are Markdown; style it to match the dashboard
export default function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: (p) => <h3 className="font-heading font-semibold text-white text-base mt-4 mb-2 first:mt-0" {...p} />,
        h2: (p) => <h3 className="font-heading font-semibold text-white text-base mt-4 mb-2 first:mt-0" {...p} />,
        h3: (p) => <h4 className="font-semibold text-white text-sm mt-3 mb-1.5 first:mt-0" {...p} />,
        p: (p) => <p className="mb-3 last:mb-0 leading-relaxed" {...p} />,
        ul: (p) => <ul className="list-disc pl-5 mb-3 space-y-1" {...p} />,
        ol: (p) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...p} />,
        strong: (p) => <strong className="text-white font-semibold" {...p} />,
        a: (p) => <a className="text-[#00AEEF] underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...p} />,
        code: (p) => <code className="px-1 py-0.5 rounded bg-white/10 text-[0.85em]" {...p} />,
        table: (p) => (
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-xs border-collapse" {...p} />
          </div>
        ),
        th: (p) => <th className="text-left font-semibold text-white border-b border-white/10 py-1.5 pr-3" {...p} />,
        td: (p) => <td className="border-b border-white/5 py-1.5 pr-3 tabular-nums" {...p} />,
      }}
    >
      {children}
    </ReactMarkdown>
  )
}
