export default function PwaInstallGuide({ className = '', compact = false }) {
  const rootClass = ['pwa-install-guide', compact ? 'pwa-install-guide--compact' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClass}>
      <h3>Phone-এ app install করুন</h3>
      <ol>
        <li>
          Chrome browser-এর উপরে <strong>⋮</strong> (3 dots) tap করুন
        </li>
        <li>
          <strong>Add to Home screen</strong> বা <strong>Install app</strong> tap করুন
        </li>
        <li>
          <strong>Add</strong> / <strong>Install</strong> confirm করুন
        </li>
      </ol>
      <p>Home screen-এ Jowabuzz logo সহ icon add হবে।</p>
    </div>
  );
}
