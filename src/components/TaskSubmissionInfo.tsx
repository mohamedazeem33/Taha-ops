import { ExternalLink, FileText, Link2 } from 'lucide-react';

/** Safely extracts domain name from a URL (e.g. "github.com", "figma.com", "docs.google.com"). */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./i, '');
  } catch {
    const match = url.match(/^https?:\/\/([^/?#]+)/i);
    return match ? match[1].replace(/^www\./i, '') : url;
  }
}

/** Returns true ONLY if string starts with http:// or https:// */
export function isValidHttpUrl(url?: string | null): boolean {
  if (!url) return false;
  return /^https?:\/\//i.test(url.trim());
}

interface TaskSubmissionInfoProps {
  link?: string | null;
  note?: string | null;
  className?: string;
}

export function TaskSubmissionInfo({ link, note, className = '' }: TaskSubmissionInfoProps) {
  const hasLink = Boolean(link && link.trim());
  const hasNote = Boolean(note && note.trim());

  if (!hasLink && !hasNote) return null;

  const validLink = hasLink && isValidHttpUrl(link);
  const domain = link ? extractDomain(link) : '';

  return (
    <div
      className={`rounded-xl border border-slate-200/90 bg-slate-50/80 p-3 text-sm dark:border-slate-800 dark:bg-slate-800/40 ${className}`}
    >
      {hasLink && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
          <Link2 className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
          <span className="text-slate-500 dark:text-slate-400">Submission link:</span>
          {validLink ? (
            <a
              href={link!}
              target="_blank"
              rel="noopener noreferrer"
              title={link!}
              className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:text-brand-700 hover:underline dark:text-brand-400"
            >
              <span>{domain}</span>
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          ) : (
            <span className="text-slate-700 dark:text-slate-300">{link}</span>
          )}
        </div>
      )}

      {hasNote && (
        <div className={hasLink ? 'mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60' : ''}>
          <div className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
            <span>Note:</span>
          </div>
          <p className="whitespace-pre-line pl-4 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            {note}
          </p>
        </div>
      )}
    </div>
  );
}

/** Small link pill for list rows (Today's plan, Overview drilldown). */
export function TaskSubmissionLinkIcon({
  link,
  className = '',
}: {
  link?: string | null;
  className?: string;
}) {
  if (!link || !isValidHttpUrl(link)) return null;
  const domain = extractDomain(link);

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      title={link}
      className={`inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-brand-600 shadow-2xs transition hover:border-brand-300 hover:bg-slate-50 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-800 dark:text-brand-400 dark:hover:bg-slate-700 ${className}`}
    >
      <Link2 className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="max-w-[120px] truncate">{domain}</span>
      <ExternalLink className="h-2.5 w-2.5 opacity-60" aria-hidden="true" />
    </a>
  );
}
