'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { cn } from '@/lib/utils';

interface Props {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className }: Props) {
  return (
    <div
      dir="rtl"
      className={cn(
        'prose-basic text-text-primary leading-relaxed text-[15px] break-words',
        '[&_p]:my-1.5 [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_h3]:text-[15px] [&_h3]:font-bold [&_ul]:list-disc [&_ul]:pr-5 [&_ol]:list-decimal [&_ol]:pr-5 [&_li]:my-0.5 [&_strong]:font-bold [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_code]:text-[13px]',
        'math-block',
        className
      )}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .math-block .katex-display {
          margin: 0.5rem 0;
          overflow-x: auto;
          overflow-y: hidden;
          padding: 0.25rem 0;
        }
        .math-block .katex {
          font-size: 1.05em;
        }
        .math-block pre {
          background: #f1f5f9;
          border-radius: 0.5rem;
          padding: 0.75rem 1rem;
          overflow-x: auto;
          direction: ltr;
          text-align: left;
          font-size: 13px;
          margin: 0.5rem 0;
        }
        .dark .math-block pre { background: #1e293b; }
        .math-block a {
          color: #2563eb;
          text-decoration: underline;
        }
        .dark .math-block a { color: #60a5fa; }
      ` }} />
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
