import { supabase } from './supabase'

export function slugify(title) {
  return (title || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

export async function fetchAllPosts() {
  if (!supabase) return []
  const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false })
  return data || []
}

export async function fetchPost(id) {
  if (!supabase || !id) return null
  const { data } = await supabase.from('posts').select('*').eq('id', id).maybeSingle()
  return data
}

const toRow = (fields) => ({
  title: fields.title,
  slug: fields.slug,
  excerpt: fields.excerpt || null,
  author: fields.author || null,
  cover_image: fields.cover_image || null,
  cover_image_path: fields.cover_image_path || null,
  tags: fields.tags || null,
  body: fields.body || null,
  meta_title: fields.meta_title || null,
  meta_description: fields.meta_description || null,
  og_image: fields.og_image || null,
  og_image_path: fields.og_image_path || null,
  published: fields.published ?? false,
})

export async function createPost(fields) {
  if (!supabase) return { error: 'Not connected' }
  const { data, error } = await supabase.from('posts').insert({
    ...toRow(fields),
    published_at: fields.published ? new Date().toISOString() : null,
  }).select().single()
  return { data, error: error?.message }
}

export async function updatePost(id, fields) {
  if (!supabase) return { error: 'Not connected' }
  const payload = { ...toRow(fields), updated_at: new Date().toISOString() }
  // Stamp published_at the moment a post first goes live; don't touch it on later edits.
  if (fields.published && !fields.published_at) payload.published_at = new Date().toISOString()
  const { error } = await supabase.from('posts').update(payload).eq('id', id)
  return { error: error?.message }
}

export async function deletePost(id) {
  if (!supabase) return false
  const { error } = await supabase.from('posts').delete().eq('id', id)
  return !error
}
