import { supabase } from './supabase'

// Favourite lists — signed-in users only. Anonymous visitors keep the old
// flat localStorage favourites (re-favs / re-favs-docs), untouched by this.

export async function fetchLists(userId) {
  if (!supabase || !userId) return []
  const { data } = await supabase.from('favourite_lists').select('*').eq('owner_id', userId).order('created_at')
  return data || []
}

export async function fetchListItems(listId) {
  if (!supabase || !listId) return []
  const { data } = await supabase.from('favourite_list_items').select('provider_id, providers(*)').eq('list_id', listId)
  return (data || []).map(r => r.providers).filter(Boolean)
}

// Every provider id (across all of a user's lists) — used to render a filled star.
export async function fetchSavedProviderIds(userId) {
  if (!supabase || !userId) return new Set()
  const { data: lists } = await supabase.from('favourite_lists').select('id').eq('owner_id', userId)
  const listIds = (lists || []).map(l => l.id)
  if (!listIds.length) return new Set()
  const { data: items } = await supabase.from('favourite_list_items').select('provider_id').in('list_id', listIds)
  return new Set((items || []).map(i => i.provider_id))
}

export async function createList(userId, name) {
  if (!supabase || !userId) return null
  const { data, error } = await supabase.from('favourite_lists').insert({ owner_id: userId, name: name.trim() }).select().single()
  if (error) return null
  return data
}

async function getOrCreateDefaultList(userId) {
  const { data: existing } = await supabase.from('favourite_lists').select('*').eq('owner_id', userId).eq('is_default', true).maybeSingle()
  if (existing) return existing
  const { data, error } = await supabase.from('favourite_lists').insert({ owner_id: userId, name: 'Favourites', is_default: true }).select().single()
  if (error) return null
  return data
}

// Add a provider to a list. If listId is omitted, adds to (creating if needed) the default list.
export async function addToList(userId, providerId, listId = null) {
  if (!supabase || !userId) return false
  let targetId = listId
  if (!targetId) {
    const list = await getOrCreateDefaultList(userId)
    if (!list) return false
    targetId = list.id
  }
  const { error } = await supabase.from('favourite_list_items').upsert({ list_id: targetId, provider_id: providerId }, { onConflict: 'list_id,provider_id' })
  return !error
}

// Remove a provider from every list it's saved under (used by the star's "unsave" click).
export async function removeFromAllLists(userId, providerId) {
  if (!supabase || !userId) return false
  const { data: lists } = await supabase.from('favourite_lists').select('id').eq('owner_id', userId)
  const listIds = (lists || []).map(l => l.id)
  if (!listIds.length) return true
  const { error } = await supabase.from('favourite_list_items').delete().eq('provider_id', providerId).in('list_id', listIds)
  return !error
}

export async function removeFromList(listId, providerId) {
  if (!supabase) return false
  const { error } = await supabase.from('favourite_list_items').delete().eq('list_id', listId).eq('provider_id', providerId)
  return !error
}

export async function deleteList(listId) {
  if (!supabase) return false
  const { error } = await supabase.from('favourite_lists').delete().eq('id', listId)
  return !error
}
