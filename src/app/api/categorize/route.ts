import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/categorize
 * Body: { descriptions: string[] }
 * Returns: { categories: (string | null)[] }
 *
 * Uses OpenAI to batch-categorize merchant descriptions that the pattern-based
 * lookup couldn't handle. Requires OPENAI_API_KEY environment variable.
 */

const SYSTEM_PROMPT = `You are a financial transaction categorizer. Given a list of merchant descriptions from credit card statements, return a JSON array of category strings. Use EXACTLY one of these categories for each:

- "Food & Drink" (restaurants, cafes, bars, fast food, coffee shops, food delivery)
- "Groceries" (supermarkets, grocery stores, wholesale clubs like Costco)
- "Gas" (gas stations, fuel)
- "Travel" (airlines, hotels, car rentals, rideshare, trains, tolls, parking, travel agencies)
- "Entertainment" (streaming, movies, concerts, events, subscriptions, games)
- "Shopping" (retail, clothing, electronics, department stores, online shopping)
- "Health & Wellness" (pharmacies, gyms, doctors, dentists, medical)
- "Bills & Utilities" (phone, internet, electricity, water, insurance)
- "Home" (home improvement, furniture, home services)
- "Automotive" (auto repair, auto parts, car wash)
- "Education" (tuition, books, online courses)
- null (if truly unrecognizable or ambiguous)

Return ONLY a JSON array of strings/nulls, nothing else. The array must have the same length as the input.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured" },
      { status: 501 }
    );
  }

  const body = await req.json();
  const descriptions: string[] = body.descriptions;
  if (!Array.isArray(descriptions) || descriptions.length === 0) {
    return NextResponse.json(
      { error: "descriptions must be a non-empty array" },
      { status: 400 }
    );
  }

  // Process in batches of 100 to stay within token limits
  const BATCH_SIZE = 100;
  const allCategories: (string | null)[] = [];

  for (let i = 0; i < descriptions.length; i += BATCH_SIZE) {
    const batch = descriptions.slice(i, i + BATCH_SIZE);
    const userMsg = JSON.stringify(batch);

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `OpenAI API error: ${res.status}`, detail: text },
        { status: 502 }
      );
    }

    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content ?? "[]";

    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        allCategories.push(...parsed);
      } else {
        allCategories.push(...batch.map(() => null));
      }
    } catch {
      allCategories.push(...batch.map(() => null));
    }
  }

  return NextResponse.json({ categories: allCategories });
}
