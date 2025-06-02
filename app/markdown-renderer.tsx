'use client';

import { memo } from 'react';

interface MarkdownRendererProps {
  content: string;
  streaming?: boolean;
}

export const MarkdownRenderer = memo(function MarkdownRenderer({ 
  content, 
  streaming = false 
}: MarkdownRendererProps) {
  // Simple markdown parsing
  const parseMarkdown = (text: string) => {
    // Handle links [text](url) - must come before citations
    let parsed = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-orange-600 hover:text-orange-700 underline">$1</a>');
    
    // Handle citations [1], [2], etc.
    parsed = parsed.replace(/\[(\d+)\]/g, '<sup class="citation text-orange-600 cursor-pointer hover:text-orange-700">[$1]</sup>');
    
    // Bold text
    parsed = parsed.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
    
    // Italic text  
    parsed = parsed.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Headers (process in order from most specific to least)
    parsed = parsed.replace(/^#### (.+)$/gm, '<h4 class="text-sm font-semibold mt-3 mb-2">$1</h4>');
    parsed = parsed.replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>');
    parsed = parsed.replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-5 mb-2">$1</h2>');
    parsed = parsed.replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-6 mb-3">$1</h1>');
    
    // Handle list blocks with better multi-line support
    const listBlocks = parsed.split('\n');
    let inList = false;
    let listType = 'ul';
    const processedLines = [];
    
    for (let i = 0; i < listBlocks.length; i++) {
      const line = listBlocks[i];
      const bulletMatch = line.match(/^- (.+)$/);
      const numberMatch = line.match(/^(\d+)\. (.+)$/);
      const isListItem = bulletMatch || numberMatch;
      const isContinuation = inList && line.match(/^\s+/) && line.trim();
      
      if (isListItem && !inList) {
        listType = bulletMatch ? 'ul' : 'ol';
        processedLines.push(`<${listType} class="space-y-2 my-3 pl-0">`);
        inList = true;
      } else if (!isListItem && !isContinuation && inList && line.trim() === '') {
        // Empty line ends the list
        processedLines.push(`</${listType}>`);
        inList = false;
      }
      
      if (bulletMatch) {
        processedLines.push(`<li class="ml-5 list-disc">${bulletMatch[1]}</li>`);
      } else if (numberMatch) {
        processedLines.push(`<li class="ml-5 list-decimal">${numberMatch[2]}</li>`);
      } else if (isContinuation && inList) {
        // Append continuation to previous list item
        if (processedLines.length > 0 && processedLines[processedLines.length - 1].includes('<li')) {
          const lastLine = processedLines.pop();
          if (lastLine) {
            processedLines.push(lastLine.replace('</li>', ' ' + line.trim() + '</li>'));
          }
        }
      } else {
        processedLines.push(line);
      }
    }
    
    if (inList) {
      processedLines.push(`</${listType}>`);
    }
    
    parsed = processedLines.join('\n');
    
    // Code blocks
    parsed = parsed.replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto my-3"><code>$1</code></pre>');
    
    // Inline code
    parsed = parsed.replace(/`(.+?)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');
    
    // Paragraphs
    parsed = parsed.split('\n\n').map(para => {
      if (para.trim() && !para.includes('<h') && !para.includes('<ul') && !para.includes('<pre')) {
        return `<p class="mb-3">${para}</p>`;
      }
      return para;
    }).join('\n');
    
    // Clean up
    parsed = parsed.replace(/<p class="mb-3"><\/p>/g, '');
    parsed = parsed.replace(/\n/g, ' ');
    
    return parsed;
  };

  return (
    <div className="text-gray-700 dark:text-gray-300">
      <div 
        dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }} 
        className="markdown-content leading-relaxed [&>p]:text-sm [&>ul]:text-sm [&>ol]:text-sm [&_li]:text-sm [&>h1]:text-gray-900 [&>h1]:dark:text-gray-100 [&>h2]:text-gray-900 [&>h2]:dark:text-gray-100 [&>h3]:text-gray-900 [&>h3]:dark:text-gray-100 [&>h4]:text-gray-900 [&>h4]:dark:text-gray-100"
      />
      {streaming && <span className="animate-pulse text-orange-500">▊</span>}
    </div>
  );
});