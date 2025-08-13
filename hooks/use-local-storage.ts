import { useEffect, useState } from "react";

const useLocalStorage = <T>(
  key: string,
  initialValue: T,
): [T, (value: T) => void] => {
  const [storedValue, setStoredValue] = useState(initialValue);

  useEffect(() => {
    // Retrieve from localStorage
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return;
      // Guard against strings like "undefined" or malformed JSON
      if (item === 'undefined' || item === 'null') {
        window.localStorage.removeItem(key);
        return;
      }
      const parsed = JSON.parse(item);
      if (parsed === undefined) {
        window.localStorage.removeItem(key);
        return;
      }
      setStoredValue(parsed);
    } catch (err) {
      // If parsing fails, remove the bad entry and keep initialValue
      try {
        window.localStorage.removeItem(key);
      } catch {}
    }
  }, [key]);

  const setValue = (value: T) => {
    // Save state
    setStoredValue(value);
    // Save to localStorage
    window.localStorage.setItem(key, JSON.stringify(value));
  };
  return [storedValue, setValue];
};

export default useLocalStorage;
