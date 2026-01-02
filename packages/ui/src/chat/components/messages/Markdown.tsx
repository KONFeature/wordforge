import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from '../MessageList.module.css';

interface MarkdownProps {
  children: string;
}

export const Markdown = ({ children }: MarkdownProps) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      pre: ({ children }) => <pre className={styles.codeBlock}>{children}</pre>,
      code: ({ className, children, ...props }) => {
        const isInline = !className;
        return isInline ? (
          <code className={styles.inlineCode} {...props}>
            {children}
          </code>
        ) : (
          <code className={className} {...props}>
            {children}
          </code>
        );
      },
    }}
  >
    {children}
  </ReactMarkdown>
);
