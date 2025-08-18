import React, { useEffect, useRef, useState } from 'react'

const emptyDraft = {
  InitialIdea: '',
  Role: '',
  Task: '',
  Context: '',
  Reasoning: 'Show structured reasoning without revealing hidden chain-of-thought; explain key steps and assumptions succinctly.',
  OutputFormat: '',
  StopConditions: '',
  Audience: '',
  ToneStyle: 'Supportive, clear, and conversational (≈8th-grade reading level unless user asks otherwise).',
  Examples: '',
}

const STEPS = [
  { key: 'InitialIdea', label: 'Initial Idea', question: 'What’s your initial idea or high-level outcome you want the AI to achieve?', quick: ['Brainstorm topic ideas','Summarize a long document','Draft a professional email','Write code from a spec'] },
  { key: 'Role', label: 'Role', question: 'What persona should the AI adopt? (e.g., expert analyst, friendly coach, technical writer)', quick: ['Expert financial analyst','Senior software engineer','Marketing strategist','Recruiter & resume coach'] },
  { key: 'Task', label: 'Task', question: 'What specific action or goal should it accomplish?', quick: ['Produce a step-by-step plan','Generate a comparison table','Draft a cold outreach email','Refactor code for clarity'] },
  { key: 'Context', label: 'Context', question: 'Provide background, data, links, constraints, tools, or domain details that matter.', quick: ['Include URL(s) to source text','List constraints & requirements','Mention tools or environment'] },
  { key: 'Reasoning', label: 'Reasoning', question: 'How should the AI reason? (We recommend concise, structured rationale without hidden chain-of-thought.)', quick: ['Explain assumptions succinctly','List key decision steps','Justify choices briefly'] },
  { key: 'OutputFormat', label: 'Output Format', question: 'How should the output be structured? (length, bullets, JSON, sections, headings)', quick: ['Bulleted outline with headings','JSON object (schema included)','1-page brief (~400–600 words)','Markdown with sections'] },
  { key: 'StopConditions', label: 'Stop Conditions / Constraints', question: 'What must be avoided or limited? (e.g., don’t mention brands, stay under 700 words)', quick: ['Avoid brand names','No screenshots or images','Cite sources if used','<700 words total'] },
  { key: 'Audience', label: 'Audience', question: 'Who is the audience and what’s their expertise level?', quick: ['Executive team (non-technical)','Developers (intermediate)','New customers (novice)','Academic reviewers'] },
  { key: 'ToneStyle', label: 'Tone / Style', question: 'What tone should the AI use? (e.g., formal, friendly, persuasive, witty)', quick: ['Professional and direct','Friendly and encouraging','Persuasive and confident','Neutral and objective'] },
  { key: 'Examples', label: 'Examples', question: 'Any examples to emulate? Paste samples or describe desired qualities.', quick: ['Emulate Apple-style clarity','Use Amazon PR/FAQ format','Model after the sample below'] },
]

const INTRO_MSG = `Hi! I’m your Prompt Engineering Assistant.
We’ll build a strong prompt together in a few quick steps.

**Step 1 — Initial Idea**
What’s your initial idea or high-level outcome you want the AI to achieve?

(You can type /reset, /back, /skip, /compile, /show, or /import <text>.)`

function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : initialValue } catch { return initialValue }
  })
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)) } catch {} }, [key, value])
  return [value, setValue]
}

function markdownToHtml(md) {
  let html = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10">$1</code>')
  html = html.replace(/
/g, '<br/>');
  return html
}

function Message({ role, text }) {
  const isUser = role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (<div className='h-8 w-8 flex items-center justify-center rounded-full bg-zinc-800 shrink-0'>🤖</div>)}
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${isUser ? 'bg-blue-600 text-white' : 'bg-zinc-900'}`}>
        <div className='prose prose-sm dark:prose-invert whitespace-pre-wrap' dangerouslySetInnerHTML={{ __html: markdownToHtml(text) }} />
      </div>
      {isUser && (<div className='h-8 w-8 flex items-center justify-center rounded-full bg-blue-600 text-white shrink-0'>🧑</div>)}
    </div>
  )
}

function compilePrompt(d) {
  const lines = []
  lines.push(`# Role
${d.Role || '(not specified)'}`)
  lines.push(`
# Task
${d.Task || '(not specified)'}`)
  lines.push(`
# Context
${d.Context || '(none provided)'}`)
  lines.push(`
# Reasoning Instructions
${d.Reasoning || 'Show structured reasoning without revealing hidden chain-of-thought; explain key steps and assumptions succinctly.'}`)
  lines.push(`
# Output Format
${d.OutputFormat || '(not specified)'}`)
  lines.push(`
# Stop Conditions / Constraints
${d.StopConditions || '(none)'}`)
  lines.push(`
# Audience
${d.Audience || '(not specified)'}`)
  lines.push(`
# Tone/Style
${d.ToneStyle || 'Supportive, clear, and conversational (≈8th-grade reading level unless otherwise requested).'}`)
  lines.push(`
# Examples
${d.Examples || '(none)'}`)
  lines.push(`
If any critical info is missing, ask targeted follow-up questions before executing.`)
  return lines.join('
')
}

export default function App() {
  const [messages, setMessages] = useLocalStorage('pea_messages_v1', [{ role: 'bot', text: INTRO_MSG, ts: Date.now() }])
  const [draft, setDraft] = useLocalStorage('pea_draft_v1', emptyDraft)
  const [stepIndex, setStepIndex] = useLocalStorage('pea_step_v1', 0)
  const [compiledText, setCompiledText] = useState('')

  useEffect(() => {
    const s = STEPS[0]
    const tips = s.quick.map(q => `• ${q}`).join('\n')
    setMessages(m => [...m, { role: 'bot', text: `**Step 1 — ${s.label}**\n${s.question}\n\n*Quick choices (just type):*\n${tips}`, ts: Date.now() }])
  }, [])

  function addBot(text) { setMessages(m => [...m, { role: 'bot', text, ts: Date.now() }]) }

  function showDraftNow() {
    const quick = [
      draft.InitialIdea && `• Idea: ${draft.InitialIdea.slice(0,120)}${draft.InitialIdea.length>120?'…':''}`,
      draft.Role && `• Role: ${draft.Role}`,
      draft.Task && `• Task: ${draft.Task}`,
      draft.Audience && `• Audience: ${draft.Audience}`,
    ].filter(Boolean).join('\n') || '(Nothing captured yet.)'
    addBot(`Here’s what we’ve captured so far:\n\n${quick}\n\nEdit anything above or say ‘looks good’ to continue.`)
  }

  function acceptAnswerForCurrentStep(value) {
    const current = STEPS[stepIndex]
    const next = { ...draft, [current.key]: value }
    setDraft(next)
    const quick = [
      next.InitialIdea && `• Idea: ${next.InitialIdea.slice(0,120)}${next.InitialIdea.length>120?'…':''}`,
      next.Role && `• Role: ${next.Role}`,
      next.Task && `• Task: ${next.Task}`,
      next.Audience && `• Audience: ${next.Audience}`,
    ].filter(Boolean).join('\n') || '(Nothing captured yet.)'
    const nextLabel = STEPS[stepIndex + 1]?.label || 'Compile'
    addBot(`Got it for **${current.label}**.\n\n**Draft so far:**\n${quick}\n\nNext: **${nextLabel}**.`)
    if (stepIndex + 1 >= STEPS.length) {
      setStepIndex(STEPS.length)
      addBot('We’ve gathered all components. Type /compile to generate the final prompt.')
    } else {
      const s = STEPS[stepIndex + 1]
      const tips = s.quick.map(q => `• ${q}`).join('\n')
      setStepIndex(stepIndex + 1)
      addBot(`**Step ${stepIndex + 2} — ${s.label}**\n${s.question}\n\n*Quick choices (just type):*\n${tips}`)
    }
  }

  function handleSend(text) {
    if (!text) return
    setMessages(m => [...m, { role: 'user', text, ts: Date.now() }])
    if (text.startsWith('/')) {
      if (text === '/reset') { setMessages([{ role: 'bot', text: INTRO_MSG, ts: Date.now() }]); setDraft(emptyDraft); setStepIndex(0); return }
      if (text === '/show') return showDraftNow()
      if (text === '/compile') { setCompiledText(compilePrompt(draft)); return }
      if (text.startsWith('/import ')) {
        const blob = text.replace('/import ', '')
        // minimal parser omitted for brevity
        return addBot('Imported (mock). Use /show to review.')
      }
    }
    if (stepIndex >= STEPS.length) return addBot('Type /compile to generate the final prompt, or update any field (e.g., `set Tone/Style: professional`).')
    acceptAnswerForCurrentStep(text)
  }

  return (
    <div className='mx-auto max-w-5xl p-4 md:p-8 min-h-screen bg-zinc-950 text-zinc-100'>
      <div className='mb-4 flex items-center justify-between gap-2'>
        <div className='flex items-center gap-3'>
          <div className='h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center'>🦈</div>
          <div>
            <h1 className='text-xl font-semibold'>Bobert’s Prompt Engineering Assistant</h1>
            <p className='text-sm text-zinc-400'>Guided prompt builder — branded for Bobert, dark mode ready</p>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='lg:col-span-2 border border-white/10 rounded-2xl overflow-hidden'>
          <div className='border-b border-white/10 p-4'><div className='text-base font-medium'>Chat</div></div>
          <Chat messages={messages} onSend={handleSend} stepIndex={stepIndex} />
        </div>
        <div className='lg:col-span-1 border border-white/10 rounded-2xl p-4'>
          <div className='text-base font-medium mb-2'>Progress</div>
          <ul className='space-y-2'>
            {STEPS.map((s,i) => {
              const done = !!draft[s.key]; const active = i===stepIndex;
              return (
                <li key={s.key} className={`flex items-center justify-between rounded-xl border border-white/10 p-2 ${active ? 'border-white/30' : ''}`}>
                  <div className='flex items-center gap-2'>
                    <span className='px-2 py-0.5 text-xs border border-white/20 rounded-full'>{i+1}</span>
                    <span className='text-sm'>{s.label}</span>
                  </div>
                  <span className='text-xs text-zinc-400'>{done ? 'Captured' : active ? 'In progress' : 'Pending'}</span>
                </li>
              )
            })}
          </ul>
          <div className='mt-4 space-y-2'>
            <button className='px-3 py-2 border border-white/20 rounded-lg w-full' onClick={() => setCompiledText(compilePrompt(draft))}>Compile Now</button>
            <button className='px-3 py-2 border border-white/20 rounded-lg w-full' onClick={() => showDraftNow()}>Show Draft in Chat</button>
            <button className='px-3 py-2 border border-red-500 text-red-300 rounded-lg w-full' onClick={() => { localStorage.clear(); location.reload(); }}>Reset Session</button>
          </div>
        </div>
      </div>

      {compiledText && (
        <div className='fixed inset-0 bg-black/70 flex items-center justify-center p-4'>
          <div className='bg-zinc-900 border border-white/10 rounded-xl p-4 w-[min(900px,92vw)]'>
            <div className='text-lg font-semibold mb-1'>Final Compiled Prompt</div>
            <div className='text-xs text-zinc-400 mb-2'>Copy this into your LLM. Edit anything you like before saving.</div>
            <textarea className='w-full bg-transparent border border-white/10 rounded-lg p-2 font-mono text-xs' rows='16' value={compiledText} onChange={e => setCompiledText(e.target.value)} />
            <div className='mt-2 text-right'>
              <button className='px-3 py-2 border border-white/20 rounded-lg' onClick={() => setCompiledText('')}>Done</button>
            </div>
          </div>
        </div>
      )}

      <footer className='mt-6 text-center text-xs text-zinc-400'>Built with ❤️ — Bobert’s Prompt Engineering Assistant</footer>
    </div>
  )
}

function Chat({ messages, onSend, stepIndex }) {
  const [val, setVal] = useState('')
  return (
    <div className='p-4'>
      <div className='h-[56vh] overflow-auto space-y-4 mb-3'>
        {messages.map((m, idx) => <Message key={idx} role={m.role} text={m.text} />)}
      </div>
      <div className='flex items-center gap-2'>
        <textarea className='w-full bg-transparent border border-white/10 rounded-lg p-2' rows='2'
          placeholder={STEPS[stepIndex]?.question || 'Type a message or use /commands'}
          value={val} onChange={e => setVal(e.target.value)} />
        <button className='px-3 py-2 border border-white/20 rounded-lg' onClick={() => { onSend(val.trim()); setVal('') }}>Send</button>
      </div>
      <div className='text-xs text-zinc-400 mt-1'>Tip: Use <code class="px-1 py-0.5 rounded bg-white/10">/compile</code>, <code class="px-1 py-0.5 rounded bg-white/10">/reset</code>, <code class="px-1 py-0.5 rounded bg-white/10">/show</code>, or <code class="px-1 py-0.5 rounded bg-white/10">/import &lt;text&gt;</code>.</div>
    </div>
  )
}
