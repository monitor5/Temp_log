import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
const schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), 'video', 'source', 'iframe'],
  attributes: {...defaultSchema.attributes, video: ['src', 'controls', 'poster'], source: ['src', 'type'], iframe: ['src', 'title']},
};
function embedUrl(src?: string) {
  try {
    const url = new URL(src || '');
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    if (['www.youtube.com', 'www.youtube-nocookie.com'].includes(url.hostname) && /^\/embed\/[a-zA-Z0-9_-]+$/.test(url.pathname)) return 'https://www.youtube-nocookie.com' + url.pathname;
    if (url.hostname === 'player.vimeo.com' && /^\/video\/\d+$/.test(url.pathname)) return 'https://player.vimeo.com' + url.pathname;
  } catch { /* Invalid embeds are not rendered. */ }
  return null;
}
export function MarkdownContent({children}: {children: string}) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, [rehypeSanitize, schema]]} components={{
    pre: ({children: content}) => <pre tabIndex={0} aria-label="코드 블록">{content}</pre>,
    table: ({children: content}) => <table tabIndex={0} aria-label="본문 표">{content}</table>,
    video: ({src, poster}) => <video src={src} poster={poster} controls preload="metadata" className="w-full my-8" />,
    iframe: ({src, title}) => { const safe = embedUrl(src); return safe ? <div className="aspect-video my-8"><iframe src={safe} title={title || '영상'} loading="lazy" sandbox="allow-scripts allow-same-origin allow-presentation" referrerPolicy="no-referrer" allowFullScreen className="w-full h-full" /></div> : null; },
    img: ({alt, src}) => <img src={src} alt={alt || ''} loading="lazy" className="w-full my-8" />,
    a: ({href, children: text}) => <a href={href} rel="noopener noreferrer">{text}</a>,
  }}>{children}</ReactMarkdown>;
}
