// LLM-based award generation
// For now, uses a mock that generates fun awards without an API call
// Replace with real Claude API call when ready

const AWARD_POOL = [
  { name: "🏆 The Etymologist", trigger: "perfect use of all words" },
  { name: "🚿 Mind In The Gutter", trigger: "too dirty" },
  { name: "🚀 Houston, We've Lost Contact", trigger: "lost track of the name" },
  { name: "📖 The Textbook", trigger: "overly literal" },
  { name: "🌈 The Hallmark Channel", trigger: "unexpectedly wholesome" },
  { name: "🤢 The Bile File", trigger: "gross-out humor" },
  { name: "📜 The Novelist", trigger: "way too long" },
  { name: "👀 Sounds Like a Confession", trigger: "suspiciously specific" },
  { name: "😂 Spit-Take Award", trigger: "genuinely funny" },
  { name: "🎭 The Drama Queen", trigger: "overly dramatic" },
  { name: "🧠 Galaxy Brain", trigger: "overthought it" },
  { name: "🪞 The Mirror", trigger: "clearly autobiographical" },
  { name: "🎪 The Ringmaster", trigger: "chaotic energy" },
  { name: "🧊 The Ice Cold Take", trigger: "deadpan delivery" },
  { name: "🌶️ Too Spicy", trigger: "pushed boundaries" },
  { name: "🐇 Down The Rabbit Hole", trigger: "went on a tangent" },
  { name: "🎯 Bullseye", trigger: "nailed it perfectly" },
  { name: "🦆 The Non Sequitur", trigger: "made no sense but was funny" },
];

// Mock award generator - assigns random awards with custom roasts
function mockGenerateAwards(cocktailName, definitions) {
  return definitions.map((d) => {
    const award = AWARD_POOL[Math.floor(Math.random() * AWARD_POOL.length)];
    const roasts = [
      `"${cocktailName}" clearly awakened something in ${d.playerName}.`,
      `${d.playerName} took "${cocktailName}" and ran with it. Off a cliff.`,
      `We're not sure ${d.playerName} read the same drink name as everyone else.`,
      `${d.playerName} understood the assignment. Maybe too well.`,
      `This is exactly what "${cocktailName}" means and nobody can tell us otherwise.`,
    ];
    return {
      playerName: d.playerName,
      definition: d.definition,
      awardName: award.name,
      awardDescription: roasts[Math.floor(Math.random() * roasts.length)],
    };
  });
}

// Real Claude API integration
async function claudeGenerateAwards(cocktailName, definitions) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return mockGenerateAwards(cocktailName, definitions);

  const prompt = `You are the judge for a party game called "Drinktionary". Players are given a cocktail name from a restaurant menu and must write a fake Urban Dictionary definition for it (completely ignoring that it's a drink).

The cocktail name is: "${cocktailName}"

Here are the player submissions:
${definitions.map((d) => `- ${d.playerName}: "${d.definition}"`).join("\n")}

For EACH player, give them a funny, custom award. Do NOT rank them or score them. The award should roast/celebrate their specific definition. Consider:
- Did they use all elements of the drink name cleverly?
- Was it funny, gross, wholesome, too dirty, too literal, too long, off-topic, etc.?

Respond in JSON format:
[
  {
    "playerName": "name",
    "awardName": "emoji + short award title",
    "awardDescription": "one-liner roast/compliment explaining why they got this award"
  }
]

Be creative with award names. Make them funny. Every player gets a unique award.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    const text = data.content[0].text;
    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const awards = JSON.parse(jsonMatch[0]);
      return definitions.map((d) => {
        const award = awards.find((a) => a.playerName === d.playerName) || {
          awardName: "🎲 The Wild Card",
          awardDescription: "Defied categorization entirely.",
        };
        return { playerName: d.playerName, definition: d.definition, ...award };
      });
    }
  } catch (e) {
    console.error("Claude API error, falling back to mock:", e.message);
  }
  return mockGenerateAwards(cocktailName, definitions);
}

export async function generateAwards(cocktailName, definitions) {
  return claudeGenerateAwards(cocktailName, definitions);
}
