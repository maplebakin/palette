import React, { useEffect, useRef, useState } from 'react';
import {
  buildKitSuggestionSnapshot,
  submitKitSuggestion,
} from '../lib/kitSuggestion.js';

const FOCUSABLE_SELECTOR = 'button:not([disabled]), input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

const SuggestKitDialog = ({ open, capture, onRequestClose }) => {
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [creditOptIn, setCreditOptIn] = useState(false);
  const [creditName, setCreditName] = useState('');
  const [attempt, setAttempt] = useState({ capture: null, status: 'idle', snapshotJson: '' });
  const dialogRef = useRef(null);
  const emailRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    emailRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [open]);

  if (!open || !capture) return null;

  const status = attempt.capture === capture ? attempt.status : 'idle';
  const snapshotJson = attempt.capture === capture ? attempt.snapshotJson : '';

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onRequestClose();
      return;
    }

    if (event.key !== 'Tab') return;
    const focusable = [...dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR)]
      .filter((element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true');
    if (focusable.length === 0) {
      event.preventDefault();
      dialogRef.current.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (status === 'submitting' || status === 'success') return;

    const form = event.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const submittedSnapshot = snapshotJson || JSON.stringify(buildKitSuggestionSnapshot(capture));
    setAttempt({ capture, status: 'submitting', snapshotJson: submittedSnapshot });

    try {
      await submitKitSuggestion({ email, note, creditOptIn, creditName, snapshot: submittedSnapshot });
      setAttempt((current) => (current.capture === capture ? { ...current, status: 'success' } : current));
    } catch {
      setAttempt((current) => (current.capture === capture ? { ...current, status: 'failure' } : current));
    }
  };

  return (
    <div className="suggest-kit-dialog-backdrop">
      <section
        ref={dialogRef}
        className="suggest-kit-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="suggest-kit-dialog-title"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <header className="suggest-kit-dialog-header">
          <div>
            <p className="tasting-eyebrow">A note for the maker</p>
            <h2 id="suggest-kit-dialog-title">Suggest this palette</h2>
          </div>
          <button
            type="button"
            className="suggest-kit-close"
            onClick={onRequestClose}
            aria-label="Close suggestion form"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="suggest-kit-dialog-content">
          <section className="suggest-kit-preview" aria-labelledby="suggest-kit-preview-title">
            <h3 id="suggest-kit-preview-title">Palette preview</h3>
            <ol>
              {capture.finalRenderedPalette.map(({ order, role, value, locked }) => (
                <li key={`${order}-${role}`}>
                  <span className="suggest-kit-preview-swatch" style={{ backgroundColor: value }} aria-hidden="true" />
                  <span className="suggest-kit-preview-role">{order}. {role}{locked ? ' · locked' : ''}</span>
                  <code>{value}</code>
                </li>
              ))}
            </ol>
          </section>

          {status === 'success' ? (
            <p className="suggest-kit-success" role="status" aria-live="polite">
              Suggestion sent. If I choose it for a finished kit, I&apos;ll email you. Your palette is still here to keep playing with.
            </p>
          ) : (
            <form className="suggest-kit-form" onSubmit={handleSubmit} noValidate>
              <input type="hidden" name="form-name" value="kit-suggestion" />
              <input type="hidden" name="snapshot" value={snapshotJson} readOnly />

              {status === 'failure' && (
                <p className="suggest-kit-failure" role="alert">
                  That didn&apos;t send. Your palette and form are still here — try again.
                </p>
              )}

              <label htmlFor="suggest-kit-email">
                Email <span>(required so I can contact you about this suggestion)</span>
              </label>
              <input
                ref={emailRef}
                id="suggest-kit-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />

              <label htmlFor="suggest-kit-note">Note <span>(optional)</span></label>
              <textarea
                id="suggest-kit-note"
                name="note"
                rows="3"
                maxLength="500"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />

              <label className="suggest-kit-credit-option" htmlFor="suggest-kit-credit-opt-in">
                <input
                  id="suggest-kit-credit-opt-in"
                  type="checkbox"
                  name="credit-opt-in"
                  checked={creditOptIn}
                  onChange={(event) => setCreditOptIn(event.target.checked)}
                />
                <span>Credit me if this becomes a kit.</span>
              </label>

              {creditOptIn && (
                <>
                  <label htmlFor="suggest-kit-credit-name">Name or handle for public credit</label>
                  <input
                    id="suggest-kit-credit-name"
                    name="credit-name"
                    type="text"
                    autoComplete="nickname"
                    maxLength="80"
                    required
                    value={creditName}
                    onChange={(event) => setCreditName(event.target.value)}
                  />
                </>
              )}

              <div className="suggest-kit-submit-row">
                <p>
                  This is a suggestion, not an order. If selected, the finished kit may be listed for sale. I&apos;ll use your email to contact you about this suggestion.
                </p>
                <button type="submit" className="suggest-kit-button" disabled={status === 'submitting'}>
                  {status === 'submitting' ? 'Sending…' : 'Send suggestion'}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  );
};

export default SuggestKitDialog;
