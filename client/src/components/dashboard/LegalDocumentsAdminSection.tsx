import { useEffect, useRef, useState, type ReactNode, type ClipboardEvent } from 'react';
import {
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Redo2,
  Underline,
  Undo2,
  Unlink,
} from 'lucide-react';
import { legalDocumentsApi } from '../../api/legalDocuments';
import type { LegalDocument, LegalDocumentType } from '../../types/api';

const DOCUMENT_OPTIONS: Array<{ type: LegalDocumentType; title: string }> = [
  { type: 'privacy-policy', title: 'Privacy Policy' },
  { type: 'terms-of-service', title: 'Terms of Service' },
  { type: 'return-policy', title: 'Return Policy' },
  { type: 'shipping-policy', title: 'Shipping Policy' },
];

export const LegalDocumentsAdminSection: React.FC = () => {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [selectedType, setSelectedType] = useState<LegalDocumentType>('privacy-policy');
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showSource, setShowSource] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const isProgrammaticUpdateRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { documents: docs } = await legalDocumentsApi.list();
        setDocuments(docs);

        // Load the selected document
        const selectedDoc = docs.find(d => d.type === selectedType);
        if (selectedDoc) {
          isProgrammaticUpdateRef.current = true;
          setContent(selectedDoc.content || '');
          setTitle(selectedDoc.title || '');
        } else {
          isProgrammaticUpdateRef.current = true;
          setContent('');
          setTitle(DOCUMENT_OPTIONS.find(opt => opt.type === selectedType)?.title || '');
        }
      } catch (error) {
        console.error('Failed to load legal documents', error);
        setMessage({ type: 'error', text: 'Failed to load documents' });
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [selectedType]);

  // Update editor content when content changes
  useEffect(() => {
    if (!editorRef.current || showSource) {
      return;
    }
    const isFocused = document.activeElement === editorRef.current;
    if (isFocused && !isProgrammaticUpdateRef.current) {
      return;
    }
    editorRef.current.innerHTML = content;
    isProgrammaticUpdateRef.current = false;
  }, [content, showSource]);

  const toolbarDisabled = loading || saving || showSource;

  const saveSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) {
      return;
    }
    const anchorNode = selection.anchorNode;
    if (!anchorNode || !editorRef.current.contains(anchorNode)) {
      return;
    }
    selectionRef.current = selection.getRangeAt(0);
  };

  const restoreSelection = () => {
    if (!selectionRef.current) return;
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(selectionRef.current);
  };

  useEffect(() => {
    const handleSelectionChange = () => {
      saveSelection();
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const handleSave = async () => {
    const resolvedContent = showSource
      ? content
      : editorRef.current?.innerHTML ?? content;
    if (!showSource) {
      setContent(resolvedContent);
    }
    setSaving(true);
    setMessage(null);
    try {
      const { document } = await legalDocumentsApi.update(selectedType, {
        type: selectedType,
        title,
        content: resolvedContent,
        lastUpdated: new Date().toISOString(),
      });

      // Update local state
      setDocuments(prev => {
        const exists = prev.find(d => d.type === selectedType);
        if (exists) {
          return prev.map(d => d.type === selectedType ? document : d);
        }
        return [...prev, document];
      });

      setMessage({ type: 'success', text: 'Document saved successfully' });
    } catch (error) {
      console.error('Failed to save document', error);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to save document' });
    } finally {
      setSaving(false);
    }
  };

  const updateContent = () => {
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  const focusEditor = () => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const execCommand = (command: string, value?: string) => {
    if (!editorRef.current) return;
    focusEditor();
    restoreSelection();
    document.execCommand(command, false, value);
    updateContent();
  };

  const insertList = (ordered: boolean) => {
    execCommand(ordered ? 'insertOrderedList' : 'insertUnorderedList');
  };

  const createLink = () => {
    const url = prompt('Enter URL:');
    if (!url) return;
    focusEditor();
    restoreSelection();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (range.collapsed) {
      const link = document.createElement('a');
      link.href = url;
      link.textContent = url;
      link.target = '_blank';
      link.rel = 'noreferrer';
      range.insertNode(link);
      range.setStartAfter(link);
      range.setEndAfter(link);
      selection.removeAllRanges();
      selection.addRange(range);
      updateContent();
      return;
    }
    document.execCommand('createLink', false, url);
    updateContent();
  };

  const removeLink = () => {
    execCommand('unlink');
  };

  const sanitizePastedHtml = (raw: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(raw, 'text/html');
    doc.querySelectorAll('script,style,meta,link,iframe,object,embed').forEach((node) => node.remove());
    doc.querySelectorAll('a').forEach((anchor) => {
      if (!anchor.getAttribute('target')) {
        anchor.setAttribute('target', '_blank');
      }
      anchor.setAttribute('rel', 'noreferrer');
    });
    return doc.body.innerHTML;
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    if (toolbarDisabled) return;
    const html = event.clipboardData.getData('text/html');
    if (!html) {
      return;
    }
    event.preventDefault();
    focusEditor();
    restoreSelection();
    const sanitized = sanitizePastedHtml(html);
    document.execCommand('insertHTML', false, sanitized);
    updateContent();
  };

  const setFontSize = (size: string) => {
    if (!editorRef.current) return;
    focusEditor();
    restoreSelection();
    document.execCommand('fontSize', false, '7');
    const fontElements = editorRef.current.getElementsByTagName('font');
    Array.from(fontElements).forEach((el) => {
      if (el.size === '7') {
        el.removeAttribute('size');
        el.style.fontSize = `${size}px`;
      }
    });
    updateContent();
  };

  const toolbarGroupClass =
    'flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white px-1.5 py-1 shadow-sm';
  const toolbarButtonClass =
    'inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:border-primary/40 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50';

  const ToolbarGroup = ({ children }: { children: ReactNode }) => (
    <div className={toolbarGroupClass}>{children}</div>
  );

  const ToolbarButton = ({
    label,
    onClick,
    icon,
    disabled,
  }: {
    label: string;
    onClick: () => void;
    icon: ReactNode;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      className={toolbarButtonClass}
    >
      {icon}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Legal Documents</h2>
          <p className="mt-1 text-sm text-slate-600">Manage your legal pages content</p>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-6">
          {/* Document Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Select Document
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as LegalDocumentType)}
              disabled={loading || saving}
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            >
              {DOCUMENT_OPTIONS.map(opt => (
                <option key={opt.type} value={opt.type}>
                  {opt.title}
                </option>
              ))}
            </select>
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Document Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading || saving}
              placeholder="Enter document title"
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            />
          </div>

          {/* Rich Text Editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">
                Content
              </label>
              <button
                type="button"
                onClick={() => {
                  if (showSource) {
                    isProgrammaticUpdateRef.current = true;
                  }
                  setShowSource(!showSource);
                }}
                className="text-xs text-primary hover:text-primary-dark"
              >
                {showSource ? 'Visual Editor' : 'HTML Source'}
              </button>
            </div>

            {!showSource ? (
              <>
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-2 rounded-t-lg border border-b-0 border-slate-300 bg-slate-50/80 p-2">
                  <ToolbarGroup>
                    <ToolbarButton
                      label="Undo"
                      onClick={() => execCommand('undo')}
                      disabled={toolbarDisabled}
                      icon={<Undo2 className="h-4 w-4" />}
                    />
                    <ToolbarButton
                      label="Redo"
                      onClick={() => execCommand('redo')}
                      disabled={toolbarDisabled}
                      icon={<Redo2 className="h-4 w-4" />}
                    />
                  </ToolbarGroup>

                  <ToolbarGroup>
                    <select
                      onMouseDown={saveSelection}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value) {
                          setFontSize(value);
                          e.target.value = '';
                        }
                      }}
                      className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-600 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      disabled={toolbarDisabled}
                      title="Font Size"
                    >
                      <option value="">Size</option>
                      <option value="10">10</option>
                      <option value="12">12</option>
                      <option value="14">14</option>
                      <option value="16">16</option>
                      <option value="18">18</option>
                      <option value="20">20</option>
                      <option value="24">24</option>
                      <option value="28">28</option>
                      <option value="36">36</option>
                      <option value="48">48</option>
                    </select>
                  </ToolbarGroup>

                  <ToolbarGroup>
                    <ToolbarButton
                      label="Bold"
                      onClick={() => execCommand('bold')}
                      disabled={toolbarDisabled}
                      icon={<Bold className="h-4 w-4" />}
                    />
                    <ToolbarButton
                      label="Italic"
                      onClick={() => execCommand('italic')}
                      disabled={toolbarDisabled}
                      icon={<Italic className="h-4 w-4" />}
                    />
                    <ToolbarButton
                      label="Underline"
                      onClick={() => execCommand('underline')}
                      disabled={toolbarDisabled}
                      icon={<Underline className="h-4 w-4" />}
                    />
                  </ToolbarGroup>

                  <ToolbarGroup>
                    <ToolbarButton
                      label="Bullet list"
                      onClick={() => insertList(false)}
                      disabled={toolbarDisabled}
                      icon={<List className="h-4 w-4" />}
                    />
                    <ToolbarButton
                      label="Numbered list"
                      onClick={() => insertList(true)}
                      disabled={toolbarDisabled}
                      icon={<ListOrdered className="h-4 w-4" />}
                    />
                  </ToolbarGroup>

                  <ToolbarGroup>
                    <ToolbarButton
                      label="Insert link"
                      onClick={createLink}
                      disabled={toolbarDisabled}
                      icon={<Link2 className="h-4 w-4" />}
                    />
                    <ToolbarButton
                      label="Remove link"
                      onClick={removeLink}
                      disabled={toolbarDisabled}
                      icon={<Unlink className="h-4 w-4" />}
                    />
                  </ToolbarGroup>
                </div>

                {/* Editor Area */}
                <div
                  ref={editorRef}
                  contentEditable={!loading && !saving}
                  onInput={updateContent}
                  onKeyUp={saveSelection}
                  onMouseUp={saveSelection}
                  onPaste={handlePaste}
                  className="min-h-[400px] w-full rounded-b-lg border border-slate-300 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                  style={{ outline: 'none' }}
                />
              </>
            ) : (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={loading || saving}
                placeholder="Enter document content (HTML)"
                rows={20}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 font-mono text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              />
            )}
          </div>

          {/* Preview */}
          {content && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Preview
              </label>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
                <div
                  className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-p:text-slate-700 prose-a:text-primary prose-strong:text-slate-900"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || saving || !title.trim() || !content.trim()}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Document'}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Tips */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Quick Tips</h3>
        <ul className="space-y-2 text-xs text-slate-600">
          <li>Use bold, italic, and underline for emphasis</li>
          <li>Use the list buttons to organize terms and clauses</li>
          <li>Select text, then insert a link to attach references</li>
          <li>Switch to "HTML Source" mode to view or edit the raw HTML</li>
        </ul>
      </div>
    </div>
  );
};

