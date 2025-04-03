"use client"

import { useState, useEffect } from "react"

interface User {
  username: string
  id: string
  // Add other user properties as needed
}

interface UseUserOptions {
  redirectTo?: string
  redirectIfFound?: boolean
}

export default function useUser({ redirectTo = "", redirectIfFound = false }: UseUserOptions = {}) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Fetch the user from your authentication API
    const fetchUser = async () => {
      try {
        setIsLoading(true)
        // Replace with your actual API endpoint
        const response = await fetch("/api/user")

        if (!response.ok) {
          throw new Error("Failed to fetch user")
        }

        const userData = await response.json()
        setUser(userData)

        // Handle redirect if user is found and redirectIfFound is true
        if (userData && redirectIfFound && redirectTo) {
          window.location.href = redirectTo
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error("An unknown error occurred"))
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [redirectIfFound, redirectTo])

  useEffect(() => {
    // If no redirect needed, return
    if (!redirectTo || isLoading) return

    // If user data not yet there (fetch in progress, logged in or not) then don't redirect yet
    if (!user && !redirectIfFound) {
      window.location.href = redirectTo
    }
  }, [user, redirectIfFound, redirectTo, isLoading])

  return { user, isLoading, error }
}

