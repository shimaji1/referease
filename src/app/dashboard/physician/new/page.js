'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Doctors now use the same provider form as every other category.
export default function NewPhysicianRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard/provider/new') }, [router])
  return null
}
