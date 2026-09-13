'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { transliterateBengaliPhonetic, transliterateWord } from '@/lib/banglaPhonetic';

interface BanglaInputContextType {
  isBanglaEnabled: boolean;
  toggleBangla: () => void;
  setBanglaEnabled: (enabled: boolean) => void;
}

const BanglaInputContext = createContext<BanglaInputContextType>({
  isBanglaEnabled: false,
  toggleBangla: () => {},
  setBanglaEnabled: () => {},
});

export const useBanglaInput = () => useContext(BanglaInputContext);

export function BanglaInputProvider({ children }: { children: React.ReactNode }) {
  const [isBanglaEnabled, setIsBanglaEnabledState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('dokan_bangla_keyboard') === 'true';
      } catch {}
    }
    return false;
  });

  const setBanglaEnabled = useCallback((enabled: boolean) => {
    setIsBanglaEnabledState(enabled);
    try {
      localStorage.setItem('dokan_bangla_keyboard', String(enabled));
    } catch {}
    if (enabled) {
      toast.success('বাংলা কিবোর্ড চালু হয়েছে (Ctrl+M বা F9 চেপে পরিবর্তন করুন)');
    } else {
      toast.info('ইংরেজি কিবোর্ড সক্রিয় হয়েছে');
    }
  }, []);

  const toggleBangla = useCallback(() => {
    setIsBanglaEnabledState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('dokan_bangla_keyboard', String(next));
      } catch {}
      if (next) {
        toast.success('বাংলা কিবোর্ড চালু হয়েছে (Ctrl+M বা F9 চেপে পরিবর্তন করুন)');
      } else {
        toast.info('ইংরেজি কিবোর্ড সক্রিয় হয়েছে');
      }
      return next;
    });
  }, []);

  // Global hotkey: Ctrl+M or F9 to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && (e.key === 'm' || e.key === 'M')) || e.key === 'F9') {
        e.preventDefault();
        toggleBangla();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleBangla]);

  // Transliteration interceptor for text inputs & textareas
  useEffect(() => {
    if (!isBanglaEnabled) return;

    const handleBeforeInput = (e: InputEvent) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      if (!target || !(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;

      // Skip non-text fields
      const inputType = target.getAttribute('type') || 'text';
      if (['password', 'email', 'file', 'checkbox', 'radio', 'range', 'color', 'date', 'time', 'datetime-local'].includes(inputType)) {
        return;
      }
      if (target.dataset.noBangla === 'true') {
        return;
      }

      // Handle character insertions (only ASCII characters)
      const data = e.data;
      if (!data || data.length !== 1 || !/^[a-zA-Z0-9`^:]$/.test(data)) {
        return;
      }

      // Transliterate phonetically
      const selectionStart = target.selectionStart ?? target.value.length;
      const selectionEnd = target.selectionEnd ?? target.value.length;
      const val = target.value;

      // Find the start of the current word being typed
      let wordStart = selectionStart;
      while (wordStart > 0 && /^[a-zA-Z0-9`^:]$/.test(val[wordStart - 1])) {
        wordStart--;
      }

      const currentWordPrefix = val.substring(wordStart, selectionStart);
      const newWordRaw = currentWordPrefix + data;
      const transliteratedWord = transliterateWord(newWordRaw);

      e.preventDefault();

      // Replace current word in input
      const before = val.substring(0, wordStart);
      const after = val.substring(selectionEnd);
      const nextValue = before + transliteratedWord + after;
      const newCursorPos = before.length + transliteratedWord.length;

      // Update value via React-friendly setter
      const nativeSetter = Object.getOwnPropertyDescriptor(
        target instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
        'value'
      )?.set;

      if (nativeSetter) {
        nativeSetter.call(target, nextValue);
      } else {
        target.value = nextValue;
      }

      target.setSelectionRange(newCursorPos, newCursorPos);
      target.dispatchEvent(new Event('input', { bubbles: true }));
    };

    document.addEventListener('beforeinput', handleBeforeInput as any);
    return () => document.removeEventListener('beforeinput', handleBeforeInput as any);
  }, [isBanglaEnabled]);

  return (
    <BanglaInputContext.Provider value={{ isBanglaEnabled, toggleBangla, setBanglaEnabled }}>
      {children}
    </BanglaInputContext.Provider>
  );
}

/**
 * Reusable header / toolbar toggle button for Bangla keyboard
 */
export function BanglaKeyboardToggle({ className }: { className?: string }) {
  const { isBanglaEnabled, toggleBangla } = useBanglaInput();

  return (
    <button
      type="button"
      onClick={toggleBangla}
      title="বাংলা টাইপিং মোড পরিবর্তন (শর্টকাট: Ctrl+M বা F9)"
      className={`relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs cursor-pointer ${
        isBanglaEnabled
          ? 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-700 ring-2 ring-emerald-400/40'
          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
      } ${className || ''}`}
    >
      <span className="text-sm">⌨️</span>
      <span className="font-bengali">
        {isBanglaEnabled ? 'বাংলা মোড' : 'English'}
      </span>
      <span
        className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold ${
          isBanglaEnabled ? 'bg-emerald-800/80 text-emerald-100' : 'bg-slate-100 text-slate-500'
        }`}
      >
        Ctrl+M
      </span>
    </button>
  );
}
