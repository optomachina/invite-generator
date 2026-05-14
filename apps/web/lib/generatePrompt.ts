function describesUnder21AtBar(description: string): boolean {
  const normalized = description.toLowerCase();
  const hasUnder21Age = /\b(?:turning\s*)?(?:[1-9]|1\d|20)(?:st|nd|rd|th)?\b/.test(normalized);
  const hasBarVenue = /\b(?:bar|whiskey|whisky|saloon|pub|tavern|honky[- ]?tonk)\b/.test(normalized);
  return hasUnder21Age && hasBarVenue;
}

export function buildPromptFromDescription(description: string): string {
  const safetyContext = describesUnder21AtBar(description)
    ? `Safety context: this is an under-21 birthday invitation at an all-ages event venue; do not depict alcohol, drinking, intoxication, bartenders serving drinks, or nightclub behavior.`
    : null;
  return [
    `Create an editorial-quality custom invitation design from this host description: "${description}".`,
    safetyContext,
    `Composition: portrait 5x7, leave clean negative space where helpful for event text,`,
    `but include the important invitation details directly in the design when they are clear from the description.`,
    `Style references: boutique stationer, hand-illustrated, warm cream paper, restrained color palette,`,
    `subtle grain, generous whitespace, polished typography, not a generic template.`,
    `Avoid: stock-photo aesthetic, generic SaaS color palette, purple/indigo gradients, slate/zinc neutrals.`,
    `Make any rendered text crisp, legible, and spelled exactly as provided.`,
  ].filter(Boolean).join(" ");
}
