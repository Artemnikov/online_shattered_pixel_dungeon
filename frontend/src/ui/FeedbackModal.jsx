import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Panel from '../menu/Panel';
import { getApiBaseUrl } from '../config/urls';

export default function FeedbackModal({ onClose, defaultContext = null }) {
  const { t } = useTranslation();
  const [feedbackType, setFeedbackType] = useState('good');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // { error: boolean, text: string }

  // Auto capture screen if canvas exists
  useEffect(() => {
    try {
      const canvas = document.querySelector('canvas.game-canvas') || document.querySelector('canvas');
      if (canvas) {
        const dataUrl = canvas.toDataURL('image/png');
        if (dataUrl && dataUrl.length > 100) {
          setScreenshot(dataUrl);
        }
      }
    } catch {
      // Ignore canvas cross-origin or capture errors
    }
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setStatus({ error: true, text: t('feedback.invalidImage', 'Please select an image file.') });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setScreenshot(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      setStatus({ error: true, text: t('feedback.emptyMessage', 'Please enter a message.') });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const apiHost = getApiBaseUrl();
      const res = await fetch(`${apiHost}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedback_type: feedbackType,
          message: message.trim(),
          contact: contact.trim() || null,
          context: defaultContext,
          screenshot: screenshot || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setStatus({ error: false, text: t('feedback.success', 'Thank you! Your feedback has been sent.') });
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setStatus({
          error: true,
          text: data.detail || t('feedback.error', 'Failed to send feedback. Please try again later.'),
        });
      }
    } catch {
      setStatus({ error: true, text: t('feedback.error', 'Failed to send feedback. Please try again later.') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel title={t('feedback.title', 'Send Feedback')} icon="JOURNAL" onClose={onClose}>
      <form onSubmit={handleSubmit} className="opd-feedback-form">
        <div className="opd-feedback-types">
          <button
            type="button"
            className={`opd-feedback-type-btn ${feedbackType === 'good' ? 'active good' : ''}`}
            onClick={() => setFeedbackType('good')}
          >
            🟢 {t('feedback.good', 'Good')}
          </button>
          <button
            type="button"
            className={`opd-feedback-type-btn ${feedbackType === 'bad' ? 'active bad' : ''}`}
            onClick={() => setFeedbackType('bad')}
          >
            🔴 {t('feedback.bad', 'Bad')}
          </button>
          <button
            type="button"
            className={`opd-feedback-type-btn ${feedbackType === 'general' ? 'active general' : ''}`}
            onClick={() => setFeedbackType('general')}
          >
            💬 {t('feedback.general', 'General')}
          </button>
        </div>

        <div className="opd-feedback-field">
          <label>{t('feedback.messageLabel', 'Your Message')}</label>
          <textarea
            className="opd-feedback-textarea"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('feedback.messagePlaceholder', 'Describe what happened or share your ideas...')}
            maxLength={2000}
            required
          />
        </div>

        <div className="opd-feedback-field">
          <label>{t('feedback.contactLabel', 'Contact Info (optional)')}</label>
          <input
            type="text"
            className="opd-feedback-input"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder={t('feedback.contactPlaceholder', '@username or email')}
          />
        </div>

        <div className="opd-feedback-field">
          <label>{t('feedback.screenshotLabel', 'Screenshot (optional)')}</label>
          {screenshot ? (
            <div className="opd-feedback-preview">
              <img src={screenshot} alt="Screenshot preview" />
              <button
                type="button"
                className="opd-feedback-remove-img"
                onClick={() => setScreenshot(null)}
              >
                ✕ {t('feedback.removeScreenshot', 'Remove')}
              </button>
            </div>
          ) : (
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="opd-feedback-file-input"
            />
          )}
        </div>

        {status && (
          <div className={`opd-feedback-status ${status.error ? 'error' : 'success'}`}>
            {status.text}
          </div>
        )}

        <div className="opd-feedback-actions">
          <button
            type="button"
            className="opd-menu-btn"
            onClick={onClose}
            disabled={loading}
          >
            {t('ui.cancel', 'Cancel')}
          </button>
          <button
            type="submit"
            className="opd-menu-btn accent"
            disabled={loading}
          >
            {loading ? t('feedback.sending', 'Sending...') : t('feedback.send', 'Send')}
          </button>
        </div>
      </form>
    </Panel>
  );
}
