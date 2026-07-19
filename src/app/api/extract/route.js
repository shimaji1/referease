import { NextResponse } from 'next/server'

// POST /api/extract — Extract provider info from a website URL
export async function POST(request) {
  const { url } = await request.json()
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

  // Step 1: Fetch the website content
  let pageText = ''
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ReferEasy/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    const html = await res.text()
    
    // Strip HTML tags, scripts, styles to get clean text
    pageText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 8000) // Limit to ~8000 chars for API
  } catch (err) {
    return NextResponse.json({ error: 'Could not fetch website: ' + err.message }, { status: 400 })
  }

  if (!pageText || pageText.length < 50) {
    return NextResponse.json({ error: 'Could not extract text from website' }, { status: 400 })
  }

  // Step 2: Send to Claude API to extract structured data
  try {
    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `Extract healthcare provider information from this website text. Return ONLY valid JSON, no markdown, no backticks, no explanation.

Website URL: ${url}

Website text:
${pageText}

Return this exact JSON structure (use null for unknown fields):
{
  "name": "Full clinic/practice name",
  "type": "Medical specialty (e.g. Dermatology, Family Medicine, Diagnostic Imaging)",
  "category": "One of: Family Medicine, Clinic, Specialist, Hospital, Imaging, Lab, Physiotherapy, Rehab",
  "address": "Full address with postal code",
  "phone": "Main phone number",
  "fax": "Fax number",
  "email": "Email address",
  "website": "${url}",
  "services": ["List", "of", "services", "offered"],
  "doctors": ["Dr. First Last", "Dr. First Last"],
  "languages": ["English", "other languages"],
  "hours": {
    "mon": "9:00-17:00 or null if unknown",
    "tue": "9:00-17:00 or null",
    "wed": "9:00-17:00 or null",
    "thu": "9:00-17:00 or null",
    "fri": "9:00-17:00 or null",
    "sat": "9:00-17:00 or null",
    "sun": "null if closed"
  },
  "requirements": "Referral requirements if mentioned",
  "accepting_referrals": true
}`
        }]
      })
    })

    const data = await apiRes.json()
    
    if (!data.content || !data.content[0]) {
      return NextResponse.json({ error: 'AI extraction failed' }, { status: 500 })
    }

    const text = data.content[0].text.trim()
    
    // Parse the JSON response
    try {
      const extracted = JSON.parse(text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim())
      return NextResponse.json({ success: true, data: extracted })
    } catch {
      return NextResponse.json({ error: 'Could not parse extracted data', raw: text }, { status: 500 })
    }
  } catch (err) {
    return NextResponse.json({ error: 'AI extraction error: ' + err.message }, { status: 500 })
  }
}
