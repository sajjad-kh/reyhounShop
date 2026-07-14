import { useEffect, useRef, useState } from 'react';

const getSelector = (elm: Element): string => {
    if (elm.id) return '#' + elm.id;
    const dt = elm.getAttribute('data-tour');
    if (dt) return `[data-tour="${dt}"]`;

    const parts: string[] = [];
    let node: Element | null = elm;

    while (node && node.nodeType === 1 && node.tagName.toLowerCase() !== 'html') {
        // Anchor on the nearest stable element (id or data-tour) so the
        // selector stays short and resilient to class/structure changes.
        if (node.id) {
            parts.unshift('#' + node.id);
            break;
        }
        const nodeDt = node.getAttribute('data-tour');
        if (nodeDt) {
            parts.unshift(`[data-tour="${nodeDt}"]`);
            break;
        }

        let sel = node.tagName.toLowerCase();
        if (node.classList && node.classList.length) {
            // Only keep class names that are valid CSS class tokens. Tailwind
            // utilities like `backdrop-blur-[12px]` or `hover:scale-[1.02]` contain
            // `[`, `]` and `:` which are illegal inside a CSS selector and would make
            // `querySelector` throw.
            const safeClasses = Array.from(node.classList).filter((c) =>
                /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(c)
            );
            if (safeClasses.length) {
                sel += '.' + safeClasses.join('.');
            }
        }
        const parent = node.parentElement;
        if (parent) {
            const tagName = node.tagName;
            const siblings = Array.from(parent.children).filter(
                (c) => c.tagName === tagName
            );
            if (siblings.length > 1) {
                sel += `:nth-of-type(${siblings.indexOf(node) + 1})`;
            }
        }
        parts.unshift(sel);
        node = parent;
    }

    return parts.join(' > ');
};

// Picker mode: when the app is opened with ?tourPicker=1 (inside the admin
// iframe), let the admin toggle "pick mode". While OFF, clicks behave normally
// so the admin can navigate and see real page content (e.g. product details).
// While ON, a click is captured as a selector and sent to the parent window.
const PickerUI: React.FC = () => {
    const [active, setActive] = useState(false);
    const activeRef = useRef(false);
    activeRef.current = active;

    useEffect(() => {
        const view = window as Window & { __tourOutline?: HTMLElement };

        const handler = (e: MouseEvent) => {
            if (!activeRef.current) return; // browsing allowed

            const t = e.target as Element | null;
            if (!t || !t.tagName) return;
            // Ignore clicks on our own picker UI so the toggle keeps working.
            if (t.closest('[data-tour-picker-ui]')) return;

            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            const sel = getSelector(t);

            if (view.__tourOutline) view.__tourOutline.remove();

            const r = t.getBoundingClientRect();
            const box = document.createElement('div');
            box.setAttribute('data-tour-picker-ui', '');
            box.style.cssText =
                'position:fixed;z-index:99999;pointer-events:none;border:2px solid #ec4899;border-radius:8px;box-shadow:0 0 0 9999px rgba(0,0,0,0.45);';
            box.style.top = `${r.top - 4}px`;
            box.style.left = `${r.left - 4}px`;
            box.style.width = `${r.width + 8}px`;
            box.style.height = `${r.height + 8}px`;
            document.body.appendChild(box);
            view.__tourOutline = box;

            window.parent.postMessage({ type: 'tour-pick', selector: sel }, '*');
        };

        document.addEventListener('click', handler, true);
        return () => document.removeEventListener('click', handler, true);
    }, []);

    return (
        <div
            data-tour-picker-ui="true"
            style={{
                position: 'fixed',
                top: '8px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 99998,
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                padding: '6px 12px',
                borderRadius: '9999px',
                background: 'rgba(17,12,28,0.92)',
                color: '#fff',
                fontFamily: 'inherit',
                fontSize: '11px',
                boxShadow: '0 4px 18px rgba(0,0,0,0.4)',
                border: '1px solid rgba(236,72,153,0.5)',
                direction: 'rtl',
            }}
        >
            <span>
                {active
                    ? 'حالت انتخاب روشن است — روی المنت کلیک کنید'
                    : 'حالت انتخاب خاموش است — برای دیدن جزئیات بگردید'}
            </span>
            <button
                type="button"
                onClick={() => setActive((v) => !v)}
                style={{
                    cursor: 'pointer',
                    border: 'none',
                    borderRadius: '9999px',
                    padding: '4px 10px',
                background: active ? '#ec4899' : 'rgba(255,255,255,0.15)',
                color: '#fff',
                fontSize: '11px',
                fontFamily: 'inherit',
                }}
            >
                {active ? 'خاموش کردن انتخاب' : 'روشن کردن انتخاب'}
            </button>
        </div>
    );
};

// Picker mode: when the app is opened with ?tourPicker=1 (used inside the admin
// iframe), render the picker UI. This runs as part of the trusted bundle (no
// injected inline script, no CSP issues) and reliably prevents any navigation
// while a pick is in progress.
export const TourPicker: React.FC = () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tourPicker') !== '1') return null;
    return <PickerUI />;
};

export default TourPicker;
