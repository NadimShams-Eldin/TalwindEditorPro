import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react';
import { createFallbackApi } from './fallback-api.ts';

type Api = ReturnType<typeof createFallbackApi>;

declare global {
  interface Window {
    tep?: Api;
  }
}

const SELECT_SCRIPT = `<script>
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const host = target.closest('[data-tep-id]');
    if (!host) return;
    event.preventDefault();
    event.stopPropagation();
    window.parent.postMessage({ type: 'picked', id: host.getAttribute('data-tep-id') }, '*');
  }, true);
</script>`;

export function App(): JSX.Element {
  const api = useMemo<Api>(() => window.tep ?? createFallbackApi(), []);
  const [path, setPath] = useState('index.html');
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');
  const [elementId, setElementId] = useState<string | null>(null);
  const [classToken, setClassToken] = useState('');
  const [dirty, setDirty] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      const data = event.data as { type?: unknown; id?: unknown };
      if (data?.type === 'picked' && typeof data.id === 'string') setElementId(data.id);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const openProject = useCallback(async () => {
    await api.pickProject();
    const opened = await api.open('index.html');
    setPath(opened.path);
    setText(opened.text);
    setStatus('تم الفتح');
  }, [api]);

  const applyClass = useCallback(async () => {
    const id = elementId ?? 'e1';
    const token = classToken.trim();
    if (!token) {
      setStatus('اكتب صنفًا أولًا');
      return;
    }
    try {
      const result = await api.applyClass({ path, elementId: id, add: [token], remove: [] });
      setText(result.text);
      setDirty(result.dirty);
      setStatus('تم');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'فشل التطبيق');
    }
  }, [api, classToken, elementId, path]);

  const save = useCallback(async () => {
    await api.save();
    setDirty(false);
    setStatus('حُفظ');
  }, [api]);

  const undo = useCallback(async () => {
    try {
      const result = await api.undo();
      setText(result.text);
      setDirty(result.dirty);
      setStatus('تراجع');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'فشل التراجع');
    }
  }, [api]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() === 'z') {
        event.preventDefault();
        void undo();
      }
      if (event.key.toLowerCase() === 's') {
        event.preventDefault();
        void save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save, undo]);

  const srcDoc = useMemo(() => text.replace('</body>', `${SELECT_SCRIPT}</body>`), [text]);

  const clickCanvas = () => {
    setElementId((current) => current ?? 'e1');
  };

  return (
    <main className="tep-shell" dir="rtl">
      <aside className="tep-sidebar">
        <button type="button" data-testid="open-project" onClick={() => void openProject()}>
          فتح مشروع
        </button>
        <nav data-testid="file-tree">{text ? path : ''}</nav>
        <p data-testid="dirty">{dirty ? 'تغييرات غير محفوظة' : ''}</p>
      </aside>
      <section className="tep-canvas">
        <iframe
          ref={frame}
          data-testid="canvas-frame"
          title="معاينة"
          srcDoc={srcDoc}
          onClick={clickCanvas}
          sandbox="allow-scripts"
        />
      </section>
      <aside className="tep-inspector">
        <p data-testid="selected-element">{elementId ?? ''}</p>
        <input
          data-testid="class-input"
          value={classToken}
          onChange={(event) => setClassToken(event.target.value)}
          placeholder="p-4"
        />
        <button type="button" data-testid="apply-class" onClick={() => void applyClass()}>
          تطبيق
        </button>
        <button type="button" data-testid="save" onClick={() => void save()}>
          حفظ
        </button>
        <output data-testid="status">{status}</output>
      </aside>
    </main>
  );
}
