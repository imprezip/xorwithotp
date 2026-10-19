import { useEffect, useState } from 'react'

/**
 * A countdown in whole seconds.
 *
 * Used for the "OTP key visible for 10 seconds" demonstration. The countdown is
 * a teaching device only. The mathematical definition of a One-Time Pad says
 * nothing about time, only about secrecy and non-reuse.
 *
 * To restart the countdown, remount the component that calls this hook (React
 * `key`) or toggle `running` back to `true`.
 */
export function useCountdown(seconds: number, running: boolean) {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      setRemaining((value) => (value <= 1 ? 0 : value - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [running])

  return { remaining, done: remaining === 0 }
}
