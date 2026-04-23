export default function MessageLog({ messages }) {
  return (
    <div className="connection-log">
      {messages.slice(-3).map((msg, i) => (
        <div key={i} className="log-entry">{msg}</div>
      ))}
    </div>
  );
}
