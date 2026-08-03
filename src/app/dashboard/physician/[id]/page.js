'use client'
import { useEffect, use } from 'react'
import { useRouter } from 'next/navigation'

// Doctors now use the same provider edit page as every other category — same row, same id.
export default function EditPhysicianRedirect({ params }) {
  const { id } = use(params)
  const router = useRouter()
  useEffect(() => { router.replace(`/dashboard/provider/${id}`) }, [router, id])
  return null
}
