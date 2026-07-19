import { NextResponse } from 'next/server'

// POST /api/extract — Extract provider info from a website URL (supports multi-location)
export async function POST(request) {
  const { url } = await request.json()
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

  // Step 1: Fetch the website content
  let pageText = ''
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ReferEasy/1.0)' },
      signal: AbortSignal.timeout(15000),
    })
    const html = await res.text()
    
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
      .slice(0, 12000)
  } catch (err) {
    return NextResponse.json({ error: 'Could not fetch website: ' + err.message }, { status: 400 })
  }

  if (!pageText || pageText.length < 50) {
    return NextResponse.json({ error: 'Could not extract text from website' }, { status: 400 })
  }

  // Step 2: Send to Claude API
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
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: `Extract healthcare provider information from this website. IMPORTANT: If the clinic/provider has MULTIPLE LOCATIONS, create a separate entry for EACH location.

Return ONLY valid JSON array, no markdown, no backticks, no explanation. Even for a single location, return an array with one object.

Website URL: ${url}

Website text:
${pageText}

Return this exact JSON array structure:
[
  {
    "name": "Clinic Name - Location Name (e.g. 1to1 Rehab - Thornhill)",
    "type": "Medical specialty (e.g. Rehabilitation Services, Diagnostic Imaging, Family Medicine)",
    "category": "One of: Family Medicine, Clinic, Specialist, Hospital, Imaging, Lab, Physiotherapy, Rehab",
    "address": "Full address with city and postal code",
    "phone": "Phone for this specific location",
    "fax": "Fax for this specific location",
    "email": "Email address",
    "website": "${url}",
    "services": ["List", "of", "all", "services", "offered"],
    "doctors": ["Dr. First Last", "Dr. First Last"],
    "languages": ["English", "other languages mentioned"],
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
  }
]

Rules:
- If multiple locations found, create one object per location with location-specific address, phone, fax
- Include the location name in the "name" field (e.g. "LifeLabs - Thornhill", "LifeLabs - Richmond Hill")
- Services and doctors can be shared across locations unless the website specifies different services per location
- If hours differ by location, use location-specific hours
- Extract ALL doctors/physicians mentioned anywhere on the site
- Extract ALL services mentioned anywhere on the site`
        }]
      })
    })

    const data = await apiRes.json()
    
    if (!data.content || !data.content[0]) {
      return NextResponse.json({ error: 'AI extraction failed' }, { status: 500 })
    }

    const text = data.content[0].text.trim()
    
    try {
      const extracted = JSON.parse(text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim())
      const locations = Array.isArray(extracted) ? extracted : [extracted]
      return NextResponse.json({ 
        success: true, 
        count: locations.length,
        data: locations[0],
        all_locations: locations
      })
    } catch {
      return NextResponse.json({ error: 'Could not parse extracted data', raw: text }, { status: 500 })
    }
  } catch (err) {
    return NextResponse.json({ error: 'AI extraction error: ' + err.message }, { status: 500 })
  }
}
