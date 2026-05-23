"use client"

interface SteamLoginButtonProps {
  onClick: () => void
  className?: string
  label?: string
}

export function SteamLoginButton({
  onClick,
  className = "",
  label = "Войти через Steam",
}: SteamLoginButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg bg-[#171a21] px-4 py-2 text-sm font-semibold text-white ring-1 ring-[#2a475e] transition-all hover:bg-[#1b2838] hover:ring-[#66c0f4] active:scale-[0.98] ${className}`}
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.5l.5-1.85c-1.54-.65-2.62-2.17-2.62-3.95 0-2.37 1.92-4.29 4.29-4.29 1.02 0 1.96.36 2.69.96l2.07-1.5V9.5c0-2.76 2.24-5 5-5s5 2.24 5 5-2.24 5-5 5c-.34 0-.67-.03-1-.09l-1.45 2.18C15.97 17.76 14.06 19 12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7c0 .69-.1 1.36-.29 2H12c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4c0 .74-.2 1.43-.55 2.03l1.73 1.27C18.09 14.95 19 13.58 19 12c0-3.86-3.14-7-7-7z" />
      </svg>
      {label}
    </button>
  )
}
