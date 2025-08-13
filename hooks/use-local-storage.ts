import { useEffect, useRef, useState } from "react";

const useLocalStorage = <T>(
  key: string,
  initialValue: T,
): [T, (value: T) => void] => {
  const isBrowser = typeof window !== 'undefined'

  const readStored = (): T => {
    if (!isBrowser) return initialValue
    try {
      const item = window.localStorage.getItem(key)
      if (!item || item === 'undefined' || item === 'null') {
        return initialValue
      }
      const parsed = JSON.parse(item)
      return parsed ?? initialValue
    } catch {
      return initialValue
    }
  }

  // Synchronous hydration from localStorage to avoid overwriting saved data
  const [storedValue, setStoredValue] = useState<T>(readStored)
  const prevKeyRef = useRef(key)

  // If the key changes, re-read from storage
  useEffect(() => {
    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key
      setStoredValue(readStored())
    }
  }, [key])

  // Sync updates to localStorage
  const setValue = (value: T) => {
    setStoredValue(value)
    if (!isBrowser) return
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {}
  }

  // Keep state in sync when the value changes in other tabs
  useEffect(() => {
    if (!isBrowser) return
    const onStorage = (e: StorageEvent) => {
      if (e.storageArea !== window.localStorage || e.key !== key) return
      try {
        if (e.newValue === null) {
          setStoredValue(initialValue)
          return
        }
        const parsed = JSON.parse(e.newValue)
        setStoredValue(parsed ?? initialValue)
      } catch {}
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key, initialValue])

  return [storedValue, setValue]
}

export default useLocalStorage;
