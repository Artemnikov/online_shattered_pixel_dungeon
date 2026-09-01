import { useTranslation } from 'react-i18next';
import Panel from './Panel';
import CHANGELOG from './content/changelog';

function pickLang(obj, lang) {
  if (!obj) return '';
  const base = lang?.split('-')[0];
  return obj[lang] ?? obj[base] ?? obj.en ?? '';
}

export default function ChangesPanel({ onClose }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage || i18n.language;

  return (
    <Panel title={t('panel.changes')} icon="CHANGES" onClose={onClose} wide>
      {CHANGELOG.map((entry) => (
        <div key={entry.version} className="opd-changelog-entry">
          <h3 className="opd-section-title">
            {entry.version}{' '}
            {entry.title ? <span className="opd-changelog-name">{pickLang(entry.title, lang)}</span> : null}
          </h3>
          <ul>
            {entry.changes.map((c, i) =>
              c.category ? (
                <li key={i}>
                  <strong>{pickLang(c.category, lang)}:</strong> {pickLang(c.description, lang)}
                </li>
              ) : (
                <li key={i}>{pickLang(c.description, lang)}</li>
              ),
            )}
          </ul>
        </div>
      ))}
    </Panel>
  );
}
