// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 ArtemNikov
//
// Adapted from Shattered Pixel Dungeon (C) 2014-2024 Evan Debenham
//
// GameLog — combined bottom log: SPD-style game messages plus player chat
// (global / direct channels). Press Enter anywhere to open the chat input.
import { useEffect, useRef, useState } from 'react';

const MAX_LINES = 6;
const MAX_HISTORY = 80;

const COLORS = {
  default: '#ffffff',
  positive: '#00ff00',
  negative: '#ff4444',
  warning: '#ffcc00',
  highlight: '#ff8800',
};

// Channel colors for chat name + text (own messages get the brighter tint).
const CHAT_COLORS = {
  global: '#7fbfff',
  direct: '#7fff7f',
};
const CHAT_COLORS_SELF = {
  global: '#b8d8ff',
  direct: '#b8ffb8',
};

export default function GameLog({ send, onLogClick }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [channel, setChannel] = useState('global');
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    const append = (msg) => {
      setMessages(prev => {
        const next = [...prev, { ...msg, id: Date.now() + Math.random() }];
        if (next.length > MAX_HISTORY) next.splice(0, next.length - MAX_HISTORY);
        return next;
      });
    };

    const onLog = (e) => {
      const { text, color } = e.detail || {};
      if (!text) return;
      const c = COLORS[color] || color || '#ffffff';
      append({ kind: 'event', text, color: c });
    };

    const onChat = (e) => {
      const { channel: ch, name, text, self } = e.detail || {};
      if (!text) return;
      append({ kind: 'chat', channel: ch, name, text, self });
    };

    const onKeyDown = (e) => {
      if (e.code !== 'Enter') return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      setOpen(true);
      // Defer focus until the input row is rendered.
      requestAnimationFrame(() => inputRef.current?.focus());
    };

    window.addEventListener('game-log', onLog);
    window.addEventListener('chat-message', onChat);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('game-log', onLog);
      window.removeEventListener('chat-message', onChat);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  // Keep the newest lines in view.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const sendChat = () => {
    const text = input.trim();
    if (!text || !send) return;
    send({ type: 'SEND_CHAT', channel, text });
    setInput('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const visible = messages.slice(-MAX_LINES);

  return (
    <div className={`game-log${open ? ' game-log--chat' : ''}`} onClick={(e) => {
      if (!open && onLogClick) onLogClick(e.clientX, e.clientY);
    }}>
      <div className="game-log__list" ref={listRef}>
        {visible.map(m => m.kind === 'chat' ? (
          <div key={m.id} className="game-log__line game-log__chat">
            <span className="game-log__name" style={{ color: m.self ? CHAT_COLORS_SELF[m.channel] : CHAT_COLORS[m.channel] }}>
              {m.self ? 'You' : m.name}:
            </span>{' '}
            <span style={{ color: CHAT_COLORS[m.channel] }}>{m.text}</span>
          </div>
        ) : (
          <div key={m.id} className="game-log__line" style={{ color: m.color }}>{m.text}</div>
        ))}
      </div>

      <div className="game-log__input">
        <div className="game-log__channels">
          <button
            type="button"
            className={`game-log__chan${channel === 'global' ? ' active' : ''}`}
            title="Global chat — all floors"
            onMouseDown={e => e.preventDefault()}
            onClick={() => setChannel('global')}
          >
            G
          </button>
          <button
            type="button"
            className={`game-log__chan${channel === 'direct' ? ' active' : ''}`}
            title="Direct chat — players in line of sight"
            onMouseDown={e => e.preventDefault()}
            onClick={() => setChannel('direct')}
          >
            D
          </button>
        </div>
        <input
          ref={inputRef}
          value={input}
          maxLength={200}
          placeholder={channel === 'global' ? 'Global…' : 'Direct…'}
          onChange={e => setInput(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => { if (!input) setOpen(false); }}
          onKeyDown={e => {
            e.stopPropagation();
            if (e.key === 'Enter') sendChat();
            if (e.key === 'Escape') e.currentTarget.blur();
          }}
        />
        <button
          type="button"
          className="game-log__send"
          onMouseDown={e => e.preventDefault()}
          onClick={sendChat}
        >
          Send
        </button>
      </div>
    </div>
  );
}
