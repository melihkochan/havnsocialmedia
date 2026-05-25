export interface ParsedCommunityData {
  description: string
  rules: string[]
  announcement: string | null
}

/**
 * Parses the raw community description field.
 * Extracts rules from the ===RULES=== block (formatted as JSON) and
 * announcement from the ===ANNOUNCEMENT=== block.
 * Returns clean description text, rules array, and pinned announcement.
 */
export function parseCommunityDescription(rawDesc: string | null): ParsedCommunityData {
  if (!rawDesc) {
    return { description: '', rules: [], announcement: null }
  }

  let description = rawDesc
  let rules: string[] = []
  let announcement: string | null = null

  // Extract rules
  if (description.includes('===RULES===')) {
    const parts = description.split('===RULES===')
    description = parts[0]
    const rulesPart = parts[1].split('===')[0].trim()
    try {
      rules = JSON.parse(rulesPart)
    } catch (e) {
      // Fallback in case it's stored raw or fails
      rules = rulesPart.split('\n').map(r => r.trim()).filter(Boolean)
    }
  }

  // Extract announcement
  if (rawDesc.includes('===ANNOUNCEMENT===')) {
    const parts = rawDesc.split('===ANNOUNCEMENT===')
    const annPart = parts[1].split('===')[0].trim()
    announcement = annPart || null
  }

  // Clean description of any remaining === block markers just in case
  description = description.split('===')[0].trim()

  return { description, rules, announcement }
}

/**
 * Serializes core description, rules array, and pinned announcement into
 * a single string for storage in the database's `description` column.
 */
export function serializeCommunityDescription(
  description: string,
  rules: string[],
  announcement: string | null = null
): string {
  let res = description.trim()
  
  if (rules && rules.length > 0) {
    res += `\n\n===RULES===\n${JSON.stringify(rules)}`
  }
  
  if (announcement && announcement.trim()) {
    res += `\n\n===ANNOUNCEMENT===\n${announcement.trim()}`
  }
  
  return res
}
