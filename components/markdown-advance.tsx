// import "katex/dist/katex.min.css";

// import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
// import {
//   oneLight,
//   oneDark,
// } from "react-syntax-highlighter/dist/esm/styles/prism";
// import Image from "next/image";
// import Link from "next/link";
// import Latex from "react-latex-next";
// import Marked, { type ReactRenderer } from "marked-react";
// import React, { useCallback, useMemo, useState } from "react";

// import { Button } from "@/components/ui/button";
// // import {
// //   HoverCard,
// //   HoverCardContent,
// //   HoverCardTrigger,
// // } from "@/components/ui/hover-card";
// import { cn } from "@/lib/utils";
// import { Check, Copy, WrapText, ArrowLeftRight } from "lucide-react";
// import { toast } from "sonner";

// interface MarkdownRendererProps {
//   content: string;
// }

// interface CitationLink {
//   text: string;
//   link: string;
// }

// // Citation source configuration
// interface CitationSourceConfig {
//   name: string;
//   pattern: RegExp;
//   urlGenerator: (title: string, source: string) => string | null;
// }

// const citationSources: CitationSourceConfig[] = [
//   {
//     name: "Wikipedia",
//     pattern: /Wikipedia/i,
//     urlGenerator: (title: string, source: string) => {
//       const searchTerm =
//         `${title} ${source.replace(/\s+[-–—]\s+Wikipedia/i, "")}`.trim();
//       return `https://en.wikipedia.org/wiki/${encodeURIComponent(searchTerm.replace(/\s+/g, "_"))}`;
//     },
//   },
//   {
//     name: "arXiv",
//     pattern: /arXiv:(\d+\.\d+)/i,
//     urlGenerator: (title: string, source: string) => {
//       const match = source.match(/arXiv:(\d+\.\d+)/i);
//       return match ? `https://arxiv.org/abs/${match[1]}` : null;
//     },
//   },
//   {
//     name: "GitHub",
//     pattern: /github\.com\/[^\/]+\/[^\/\s]+/i,
//     urlGenerator: (title: string, source: string) => {
//       const match = source.match(/(https?:\/\/github\.com\/[^\/]+\/[^\/\s]+)/i);
//       return match ? match[1] : null;
//     },
//   },
//   {
//     name: "DOI",
//     pattern: /doi:(\S+)/i,
//     urlGenerator: (title: string, source: string) => {
//       const match = source.match(/doi:(\S+)/i);

//       return match ? `https://doi.org/${match[1]}` : null;
//     },
//   },
// ];

// // Helper function to process citations
// const processCitation = (
//   title: string,
//   source: string
// ): { text: string; url: string } | null => {
//   for (const citationSource of citationSources) {
//     if (citationSource.pattern.test(source)) {
//       const url = citationSource.urlGenerator(title, source);
//       if (url) {
//         return {
//           text: `${title} - ${source}`,
//           url,
//         };
//       }
//     }
//   }
//   return null;
// };

// const isValidUrl = (str: string) => {
//   try {
//     new URL(str);
//     return true;
//   } catch {
//     return false;
//   }
// };

// const preprocessLaTeX = (content: string) => {
//   // First, handle escaped delimiters to prevent double processing
//   let processedContent = content
//     .replace(/\\\[/g, "___BLOCK_OPEN___")
//     .replace(/\\\]/g, "___BLOCK_CLOSE___")
//     .replace(/\\\(/g, "___INLINE_OPEN___")
//     .replace(/\\\)/g, "___INLINE_CLOSE___");

//   // Find and preserve complete LaTeX blocks as-is
//   // For block equations ($$...$$)
//   const blockRegex = /(\$\$[\s\S]*?\$\$)/g;
//   const blocks: string[] = [];

//   processedContent = processedContent.replace(blockRegex, (match) => {
//     const id = blocks.length;
//     blocks.push(match);
//     return `___LATEX_BLOCK_${id}___`;
//   });

//   // For inline equations ($...$) - avoiding currency values
//   const inlineRegex = /(\$(?!\s*\d+[.,\s]*\d*\s*$)(?:[^\$]|\\.)*?\$)/g;
//   const inlines: string[] = [];

//   processedContent = processedContent.replace(inlineRegex, (match) => {
//     const id = inlines.length;
//     inlines.push(match);
//     return `___LATEX_INLINE_${id}___`;
//   });

//   // Handle any remaining escaped delimiters that weren't part of a complete pair
//   processedContent = processedContent
//     .replace(/___BLOCK_OPEN___/g, "\\[")
//     .replace(/___BLOCK_CLOSE___/g, "\\]")
//     .replace(/___INLINE_OPEN___/g, "\\(")
//     .replace(/___INLINE_CLOSE___/g, "\\)");

//   // Now restore the LaTeX blocks after other processing
//   processedContent = processedContent.replace(
//     /___LATEX_BLOCK_(\d+)___/g,
//     (_, id) => {
//       return blocks[parseInt(id)] ?? "";
//     }
//   );

//   processedContent = processedContent.replace(
//     /___LATEX_INLINE_(\d+)___/g,
//     (_, id) => {
//       return inlines[parseInt(id)] ?? "";
//     }
//   );

//   return processedContent;
// };

// const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
//   // Preprocess content to find and normalize citation links before passing to marked
//   const [processedContent, extractedCitations] = useMemo(() => {
//     const citations: CitationLink[] = [];
//     let modifiedContent = content;

//     // First, protect LaTeX content from citation processing
//     const latexBlocks: string[] = [];
//     const latexPlaceholder = "___LATEX_BLOCK_PLACEHOLDER___";

//     // Replace block and inline LaTeX with placeholders
//     modifiedContent = modifiedContent.replace(
//       /\$\$([\s\S]*?)\$\$/g,
//       (match) => {
//         latexBlocks.push(match);
//         return `${latexPlaceholder}${latexBlocks.length - 1}`;
//       }
//     );

//     modifiedContent = modifiedContent.replace(
//       /\$(?!\d)(?:\\.|[^$])*?\$(?!\d)/g,
//       (match) => {
//         latexBlocks.push(match);
//         return `${latexPlaceholder}${latexBlocks.length - 1}`;
//       }
//     );

//     // Process standard markdown links
//     const stdLinkRegex = /\[([^\]]+)\]\(((?:\([^()]*\)|[^()])*)\)/g;
//     modifiedContent = modifiedContent.replace(
//       stdLinkRegex,
//       (match, text, url) => {
//         // Skip if it's a LaTeX placeholder
//         if (match.includes(latexPlaceholder)) return match;

//         citations.push({ text, link: url });
//         return `[${text}](${url})`;
//       }
//     );

//     // Process references followed by URLs - handles both malformed markdown and natural text references
//     const refWithUrlRegex =
//       /(?:\[(?:(?:\[?(PDF|DOC|HTML)\]?\s+)?([^\]]+))\]|\b([^.!?\n]+?(?:\s+[-–—]\s+\w+|\s+\([^)]+\)))\b)(?:\s*(?:\(|\[\s*|\s+))(https?:\/\/[^\s)]+)(?:\s*[)\]]|\s|$)/g;
//     modifiedContent = modifiedContent.replace(
//       refWithUrlRegex,
//       (match, docType, bracketText, plainText, url) => {
//         // Skip if it contains a LaTeX placeholder
//         if (match.includes(latexPlaceholder)) return match;

//         // Get the reference text - either from brackets or plain text
//         const text = bracketText ?? plainText;
//         const fullText = (docType ? `[${docType}] ` : "") + text;

//         // Clean up the URL (remove trailing punctuation etc)
//         const cleanUrl = url.replace(/[.,;:]+$/, "");

//         citations.push({ text: fullText.trim(), link: cleanUrl });
//         return `[${fullText.trim()}](${cleanUrl})`;
//       }
//     );

//     // Process quoted paper titles followed by site references
//     const quotedTitleRegex =
//       /"([^"]+)"(?:\s+([^.!?\n]+?)(?:\s+[-–—]\s+(?:[A-Z][a-z]+(?:\.[a-z]+)?|\w+:\S+)))/g;
//     modifiedContent = modifiedContent.replace(
//       quotedTitleRegex,
//       (match, title, source) => {
//         // Skip if it contains a LaTeX placeholder
//         if (match.includes(latexPlaceholder)) return match;

//         const citation = processCitation(title, source);
//         if (citation) {
//           citations.push({ text: citation.text.trim(), link: citation.url });
//           return `[${citation.text.trim()}](${citation.url})`;
//         }

//         return match;
//       }
//     );

//     // Process raw URLs to documents
//     const rawUrlRegex =
//       /(https?:\/\/[^\s]+\.(?:pdf|doc|docx|ppt|pptx|xls|xlsx))\b/gi;
//     modifiedContent = modifiedContent.replace(rawUrlRegex, (match, url) => {
//       // Skip if it contains a LaTeX placeholder
//       if (match.includes(latexPlaceholder)) return match;

//       const filename = url.split("/").pop() ?? url;
//       const alreadyLinked = citations.some((citation) => citation.link === url);
//       if (!alreadyLinked) {
//         citations.push({ text: filename, link: url });
//       }
//       return match;
//     });

//     // Restore LaTeX blocks
//     modifiedContent = modifiedContent.replace(
//       new RegExp(`${latexPlaceholder}(\\d+)`, "g"),
//       (_, index) => {
//         return latexBlocks[parseInt(index)] ?? "";
//       }
//     );

//     return [modifiedContent, citations];
//   }, [content]);

//   const citationLinks = extractedCitations;

//   interface CodeBlockProps {
//     language: string | undefined;
//     children: string;
//   }

//   const CodeBlock: React.FC<CodeBlockProps> = ({ language, children }) => {
//     const [isCopied, setIsCopied] = useState(false);
//     const [isWrapped, setIsWrapped] = useState(false);
//     // const { theme } = useTheme();

//     const handleCopy = useCallback(async () => {
//       await navigator.clipboard.writeText(children);
//       setIsCopied(true);
//       setTimeout(() => setIsCopied(false), 2000);
//     }, [children]);

//     const toggleWrap = useCallback(() => {
//       setIsWrapped((prev) => !prev);
//     }, []);

//     return (
//       <div className="group relative my-5">
//         <div className="overflow-hidden rounded-md border border-neutral-200 shadow-xs dark:border-neutral-800">
//           <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-100 px-3 py-1.5 dark:border-neutral-700 dark:bg-neutral-800">
//             <div className="px-2 py-0.5 text-xs font-medium text-neutral-600 dark:text-neutral-400">
//               {language ?? "text"}
//             </div>
//             <div className="flex items-center gap-1.5">
//               <button
//                 onClick={toggleWrap}
//                 className={`rounded px-2 py-1 text-xs font-medium transition-all duration-200 ${isWrapped ? "text-primary" : "text-neutral-500 dark:text-neutral-400"} flex items-center gap-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-700`}
//                 aria-label="Toggle line wrapping"
//               >
//                 {isWrapped ? (
//                   <>
//                     <ArrowLeftRight className="h-3 w-3" />
//                     <span className="hidden sm:inline">Unwrap</span>
//                   </>
//                 ) : (
//                   <>
//                     <WrapText className="h-3 w-3" />
//                     <span className="hidden sm:inline">Wrap</span>
//                   </>
//                 )}
//               </button>
//               <button
//                 onClick={handleCopy}
//                 className={`rounded px-2 py-1 text-xs font-medium transition-all duration-200 ${isCopied ? "text-primary dark:text-primary" : "text-neutral-500 dark:text-neutral-400"} flex items-center gap-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-700`}
//                 aria-label="Copy code"
//               >
//                 {isCopied ? (
//                   <>
//                     <Check className="h-3 w-3" />
//                     <span className="hidden sm:inline">Copied!</span>
//                   </>
//                 ) : (
//                   <>
//                     <Copy className="h-3 w-3" />
//                     <span className="hidden sm:inline">Copy</span>
//                   </>
//                 )}
//               </button>
//             </div>
//           </div>
//           <SyntaxHighlighter
//             language={language ?? "text"}
//             style={"dark" === "dark" ? oneDark : oneLight}
//             customStyle={{
//               margin: 0,
//               padding: "0.75rem 0.25rem 0.75rem",
//               backgroundColor: "dark" === "dark" ? "#171717" : "transparent",
//               borderRadius: 0,
//               borderBottomLeftRadius: "0.375rem",
//               borderBottomRightRadius: "0.375rem",
//               // fontFamily: GeistMono.style.fontFamily,
//             }}
//             showLineNumbers={true}
//             lineNumberStyle={{
//               textAlign: "right",
//               color: "dark" === "dark" ? "#6b7280" : "#808080",
//               backgroundColor: "transparent",
//               fontStyle: "normal",
//               marginRight: "1em",
//               paddingRight: "0.5em",
//               // fontFamily: GeistMono.style.fontFamily,
//               minWidth: "2em",
//             }}
//             lineNumberContainerStyle={{
//               backgroundColor: "dark" === "dark" ? "#171717" : "#f5f5f5",
//               float: "left",
//             }}
//             wrapLongLines={isWrapped}
//             codeTagProps={{
//               style: {
//                 // fontFamily: GeistMono.style.fontFamily,
//                 fontSize: "0.85em",
//                 whiteSpace: isWrapped ? "pre-wrap" : "pre",
//                 overflowWrap: isWrapped ? "break-word" : "normal",
//                 wordBreak: isWrapped ? "break-word" : "keep-all",
//               },
//             }}
//           >
//             {children}
//           </SyntaxHighlighter>
//         </div>
//       </div>
//     );
//   };

//   CodeBlock.displayName = "CodeBlock";

//   const LinkPreview = ({ href, title }: { href: string; title?: string }) => {
//     const domain = new URL(href).hostname;

//     return (
//       <div className="m-0 flex flex-col bg-white text-xs dark:bg-neutral-800">
//         <div className="flex h-6 items-center space-x-1.5 px-2 pt-2 text-xs text-neutral-600 dark:text-neutral-300">
//           <Image
//             src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
//             alt=""
//             width={12}
//             height={12}
//             className="rounded-sm"
//           />
//           <span className="truncate font-medium">{domain}</span>
//         </div>
//         {title && (
//           <div className="px-2 pt-1 pb-2">
//             <h3 className="m-0 line-clamp-3 text-sm font-normal text-neutral-700 dark:text-neutral-200">
//               {title}
//             </h3>
//           </div>
//         )}
//       </div>
//     );
//   };

//   const renderHoverCard = (
//     href: string,
//     text: React.ReactNode,
//     isCitation = false,
//     citationText?: string
//   ) => {
//     const title = citationText ?? (typeof text === "string" ? text : "");

//     return (
//       <div>{title}</div>
//       // <HoverCard openDelay={10}>
//       //   <HoverCardTrigger asChild>
//       //     <Link
//       //       href={href}
//       //       target="_blank"
//       //       rel="noopener noreferrer"
//       //       className={
//       //         isCitation
//       //           ? "m-0! inline-flex -translate-y-[1px] cursor-pointer items-center rounded-sm bg-[#ff8c37]/10 px-1.25 py-0.5 align-baseline text-xs leading-none font-medium text-[#ff8c37] no-underline hover:bg-[#ff8c37]/20 focus:ring-1 focus:ring-[#ff8c37] focus:outline-none dark:bg-[#ff9f57]/10 dark:text-[#ff9f57] dark:hover:bg-[#ff9f57]/20"
//       //           : "text-primary dark:text-primary-light font-medium no-underline hover:underline"
//       //       }
//       //     >
//       //       {text}
//       //     </Link>
//       //   </HoverCardTrigger>
//       //   <HoverCardContent
//       //     side="top"
//       //     align="start"
//       //     sideOffset={5}
//       //     className="w-64 overflow-hidden rounded-md border border-[#ff8c37]/30 bg-white p-0 shadow-lg dark:border-[#ff9f57]/30 dark:bg-neutral-900"
//       //   >
//       //     <LinkPreview href={href} title={title} />
//       //   </HoverCardContent>
//       // </HoverCard>
//     );
//   };

//   const generateKey = () => {
//     return (
//       Math.random().toString(36).substring(2, 15) +
//       Math.random().toString(36).substring(2, 15)
//     );
//   };

//   const renderCitation = (
//     index: number,
//     citationText: string,
//     href: string
//   ) => {
//     return (
//       <span
//         className="relative inline-flex items-baseline whitespace-normal"
//         key={generateKey()}
//       >
//         {renderHoverCard(href, index + 1, true, citationText)}
//       </span>
//     );
//   };

//   const renderer: Partial<ReactRenderer> = {
//     text(text: string) {
//       // Simple check for any LaTeX content
//       if (!text.includes("$")) return text;

//       return (
//         <Latex
//           delimiters={[
//             { left: "$$", right: "$$", display: true },
//             { left: "$", right: "$", display: false },
//           ]}
//           strict={false}
//           key={generateKey()}
//         >
//           {text}
//         </Latex>
//       );
//     },
//     paragraph(children) {
//       if (typeof children === "string" && children.includes("$")) {
//         return (
//           <p className="my-5 leading-relaxed text-neutral-700 dark:text-neutral-300">
//             <Latex
//               delimiters={[
//                 { left: "$$", right: "$$", display: true },
//                 { left: "$", right: "$", display: false },
//               ]}
//               strict={false}
//               key={generateKey()}
//             >
//               {children}
//             </Latex>
//           </p>
//         );
//       }
//       return (
//         <p className="my-5 leading-relaxed text-neutral-700 dark:text-neutral-300">
//           {children}
//         </p>
//       );
//     },
//     code(children, language) {
//       return (
//         <CodeBlock language={language} key={generateKey()}>
//           {String(children)}
//         </CodeBlock>
//       );
//     },
//     link(href, text) {
//       const citationIndex = citationLinks.findIndex(
//         (link) => link.link === href
//       );
//       if (citationIndex !== -1) {
//         // For citations, show the citation text in the hover card
//         const citationText = citationLinks[citationIndex]?.text ?? "";
//         return renderCitation(citationIndex, citationText, href);
//       }
//       return isValidUrl(href) ? (
//         renderHoverCard(href, text)
//       ) : (
//         <a
//           href={href}
//           className="text-primary dark:text-primary-light font-medium hover:underline"
//         >
//           {text}
//         </a>
//       );
//     },
//     heading(children, level) {
//       const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
//       const sizeClasses =
//         {
//           1: "text-2xl md:text-3xl font-extrabold mt-8 mb-4",
//           2: "text-xl md:text-2xl font-bold mt-7 mb-3",
//           3: "text-lg md:text-xl font-semibold mt-6 mb-3",
//           4: "text-base md:text-lg font-medium mt-5 mb-2",
//           5: "text-sm md:text-base font-medium mt-4 mb-2",
//           6: "text-xs md:text-sm font-medium mt-4 mb-2",
//         }[level] || "";

//       return (
//         <HeadingTag
//           className={`${sizeClasses} tracking-tight text-neutral-900 dark:text-neutral-50`}
//         >
//           {children}
//         </HeadingTag>
//       );
//     },
//     list(children, ordered) {
//       const ListTag = ordered ? "ol" : "ul";
//       return (
//         <ListTag
//           className={`my-5 space-y-2 pl-6 text-neutral-700 dark:text-neutral-300 ${ordered ? "list-decimal" : "list-disc"}`}
//         >
//           {children}
//         </ListTag>
//       );
//     },
//     listItem(children) {
//       return <li className="pl-1 leading-relaxed">{children}</li>;
//     },
//     blockquote(children) {
//       return (
//         <blockquote className="border-primary/30 dark:border-primary/20 my-6 rounded-r-md border-l-4 bg-neutral-50 py-1 pl-4 text-neutral-700 italic dark:bg-neutral-900/50 dark:text-neutral-300">
//           {children}
//         </blockquote>
//       );
//     },
//     table(children) {
//       return (
//         <div className="my-6 w-full overflow-hidden">
//           <div className="w-full overflow-x-auto rounded-sm border border-neutral-200 shadow-sm dark:border-neutral-800">
//             <table className="m-0! table-auto border-collapse divide-y divide-neutral-200 dark:divide-neutral-800">
//               {children}
//             </table>
//           </div>
//         </div>
//       );
//     },
//     tableRow(children) {
//       return (
//         <tr className="border-b border-neutral-200 last:border-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/30">
//           {children}
//         </tr>
//       );
//     },
//     tableCell(children, flags) {
//       const alignClass = flags.align ? `text-${flags.align}` : "text-left";
//       const isHeader = flags.header;

//       return isHeader ? (
//         <th
//           className={cn(
//             "px-5 py-3 text-xs font-semibold text-neutral-900 dark:text-neutral-50",
//             "bg-neutral-100 dark:bg-neutral-800/90",
//             "border-b border-neutral-200 whitespace-nowrap dark:border-neutral-700",
//             alignClass
//           )}
//         >
//           {children}
//         </th>
//       ) : (
//         <td
//           className={cn(
//             "px-5 py-4 text-xs text-neutral-700 dark:text-neutral-300",
//             "border-r border-neutral-100 bg-white last:border-r-0 dark:border-neutral-800 dark:bg-neutral-900",
//             "leading-relaxed",
//             alignClass
//           )}
//         >
//           {children}
//         </td>
//       );
//     },
//     tableHeader(children) {
//       return (
//         <thead className="bg-neutral-100 dark:bg-neutral-800/90">
//           {children}
//         </thead>
//       );
//     },
//     tableBody(children) {
//       return (
//         <tbody className="divide-y divide-neutral-200 bg-white dark:divide-neutral-800 dark:bg-neutral-900">
//           {children}
//         </tbody>
//       );
//     },
//   };

//   return (
//     <div className="markdown-body prose prose-neutral dark:prose-invert max-w-none font-sans dark:text-neutral-200">
//       <Marked renderer={renderer}>{processedContent}</Marked>
//     </div>
//   );
// };

// export const CopyButton = ({ text }: { text: string }) => {
//   const [isCopied, setIsCopied] = useState(false);

//   return (
//     <Button
//       variant="ghost"
//       size="sm"
//       onClick={async () => {
//         if (!navigator.clipboard) {
//           return;
//         }
//         await navigator.clipboard.writeText(text);
//         setIsCopied(true);
//         setTimeout(() => setIsCopied(false), 2000);
//         toast.success("Copied to clipboard");
//       }}
//       className="h-8 rounded-full px-2 text-xs"
//     >
//       {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
//     </Button>
//   );
// };

// export { MarkdownRenderer, preprocessLaTeX };
