import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:5000/api';

export default function PolicyChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi! I\'m your Plum policy assistant. Ask me anything about your OPD coverage — limits, exclusions, waiting periods, and more!',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const history = messages.slice(-6); // Keep last 6 messages for context
      const res = await axios.post(`${API}/policy/chat`, {
        message: userMessage,
        history,
      });

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.reply || 'Sorry, I couldn\'t process that.',
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Make sure the server is running and GEMINI_API_KEY is configured.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const suggestedQuestions = [
    'Is root canal covered?',
    'What\'s my annual limit?',
    'Is Ayurveda covered?',
    'What documents do I need?',
  ];

  return (
    <>
      {/* Floating Button */}
      <button
        id="chatbot-toggle"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(20, 184, 166, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 1000,
          transform: isOpen ? 'rotate(45deg)' : 'none',
        }}
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          id="chatbot-window"
          style={{
            position: 'fixed',
            bottom: '5rem',
            right: '1.5rem',
            width: '380px',
            maxHeight: '520px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 12px 48px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 999,
            animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '1rem 1.25rem',
            background: 'linear-gradient(135deg, rgba(20,184,166,0.15), rgba(13,148,136,0.1))',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--gradient-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.9rem',
            }}>
              🤖
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Policy Assistant</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--accent-teal)', fontWeight: 500 }}>
                Powered by Gemini AI
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            maxHeight: '340px',
          }}>
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  padding: '0.65rem 0.9rem',
                  borderRadius: msg.role === 'user'
                    ? '12px 12px 4px 12px'
                    : '12px 12px 12px 4px',
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, #14b8a6, #0d9488)'
                    : 'var(--bg-tertiary)',
                  color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                  fontSize: '0.85rem',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {msg.content}
              </div>
            ))}

            {loading && (
              <div style={{
                alignSelf: 'flex-start',
                padding: '0.65rem 0.9rem',
                borderRadius: '12px 12px 12px 4px',
                background: 'var(--bg-tertiary)',
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
              }}>
                <span style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>Thinking...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions (only show initially) */}
          {messages.length <= 1 && (
            <div style={{
              padding: '0 1rem 0.5rem',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.35rem',
            }}>
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(q); setTimeout(sendMessage, 50); }}
                  style={{
                    padding: '0.3rem 0.6rem',
                    borderRadius: '999px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = 'var(--accent-teal)';
                    e.target.style.color = 'var(--accent-teal)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = 'var(--border-color)';
                    e.target.style.color = 'var(--text-secondary)';
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{
            padding: '0.75rem 1rem',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            gap: '0.5rem',
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your policy..."
              disabled={loading}
              style={{
                flex: 1,
                padding: '0.55rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                fontFamily: 'var(--font-family)',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-teal)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              style={{
                padding: '0.55rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: input.trim() ? 'var(--gradient-primary)' : 'var(--bg-tertiary)',
                color: 'white',
                border: 'none',
                cursor: input.trim() ? 'pointer' : 'not-allowed',
                fontSize: '0.85rem',
                fontWeight: 600,
                transition: 'all 0.2s',
              }}
            >
              ↑
            </button>
          </div>
        </div>
      )}
    </>
  );
}
