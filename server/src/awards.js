// LLM-based award generation using Claude

async function claudeGenerateAwards(cocktailName, definitions) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fallbackAwards(cocktailName, definitions);

  const prompt = `You are the unhinged, irreverent award-show host for a party game called "Drinktionary." Think of yourself as a cross between the narrator from Dungeon Crawler Carl (sarcastic, absurd, darkly funny achievement names) and the energy of Cards Against Humanity (edgy, surprising, occasionally filthy but always clever).

THE GAME: Players are given a real cocktail name from a restaurant menu. They must write a fake "Urban Dictionary" definition for that name — completely ignoring that it has anything to do with alcohol or drinks. The funnier, grosser, more creative, or more unhinged the definition, the better.

THE COCKTAIL NAME THIS ROUND: "${cocktailName}"

PLAYER SUBMISSIONS:
${definitions.map((d) => `- ${d.playerName}: "${d.definition}"`).join("\n")}

YOUR JOB: Give each player a unique, NAMED achievement/award. These are NOT scores. They are comedic commentary on what each player wrote.

RULES FOR AWARDS:
1. Each award MUST have a memorable, specific name — like an Xbox achievement or a Dungeon Crawler Carl floor notification. Examples of the TONE (don't reuse these):
   - "🏆 Achievement Unlocked: Grandma Would Be Disappointed"
   - "🚨 You Have Been Reported to HR (Hypothetically)"
   - "🎪 The 'Sir, This Is a Wendy's' Award"
   - "🧠 Achievement Unlocked: Thought About This Way Too Hard"
   - "💀 The 'I Can Never Unread This' Trophy"
   - "🌶️ Awarded: Technically Not Bannable"
   - "🐐 The GOAT (Grossest Of All Time)"
   - "📖 Achievement Unlocked: Webster's Is Calling Their Lawyers"
   - "🎭 The 'Oddly Specific and We're Concerned' Medal"

2. The award name should be REACTIVE to what the player actually wrote. Don't just pick from a list — craft it based on their specific definition.

3. The description should be a short, punchy roast or celebration (1-2 sentences max) that explains WHY they earned this achievement. Be specific about their definition.

4. Consider these dimensions when crafting awards:
   - Did they cleverly use ALL words in the cocktail name? (reward this)
   - Did they go too dirty? (roast them lovingly)
   - Did they lose track of the name entirely? (mock them for wandering off)
   - Was it suspiciously specific / autobiographical? (call them out)
   - Was it unexpectedly wholesome? (act surprised)
   - Was it genuinely creative/funny? (acknowledge it but still roast)
   - Was it too long / too short? (comment on it)
   - Was it gross? (award them for it)
   - Was it boring/safe? (gently shame them)

5. Be FUNNY. Be SURPRISING. Channel the energy of a game that makes people laugh so hard they snort their drinks.

Respond ONLY with a JSON array, no other text:
[
  {
    "playerName": "exact player name",
    "awardName": "emoji + Achievement/Award name",
    "awardDescription": "1-2 sentence roast/celebration"
  }
]`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    const text = data.content[0].text;
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const awards = JSON.parse(jsonMatch[0]);
      return definitions.map((d) => {
        const award = awards.find((a) => a.playerName === d.playerName) || {
          awardName: "🎲 Achievement Unlocked: Defied Classification",
          awardDescription: "The AI judge stared at this one for a while and then just shrugged.",
        };
        return { playerName: d.playerName, definition: d.definition, ...award };
      });
    }
  } catch (e) {
    console.error("Claude API error, falling back:", e.message);
  }
  return fallbackAwards(cocktailName, definitions);
}

function fallbackAwards(cocktailName, definitions) {
  const awards = [
    "🏆 Achievement Unlocked: Grandma Would Be Disappointed",
    "🚨 The 'Sir, This Is a Wendy's' Award",
    "🧠 Achievement Unlocked: Overthinking Champion",
    "💀 The 'I Can Never Unread This' Trophy",
    "🎪 Awarded: Chaotic Neutral Energy",
    "📖 Achievement Unlocked: Webster's Called, They're Concerned",
    "🌶️ The 'Technically Not Bannable' Medal",
    "🐇 Achievement Unlocked: Lost in the Sauce",
  ];
  return definitions.map((d, i) => ({
    playerName: d.playerName,
    definition: d.definition,
    awardName: awards[i % awards.length],
    awardDescription: `${d.playerName} took "${cocktailName}" and made it their own. We're not sure that's a good thing.`,
  }));
}

export async function generateAwards(cocktailName, definitions) {
  return claudeGenerateAwards(cocktailName, definitions);
}
