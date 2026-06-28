import Anthropic from "@anthropic-ai/sdk";
import type { Decision } from "../types";
import { fallbackPhrasing } from "./fallback";

const SYSTEM = `You are a pricing copywriter for an ecommerce tool.
You will be given a structured pricing decision with an action and a list of
plain-language reasons. Write 1-2 friendly, plain-English sentences advising the
merchant. RULES: Do not introduce any numbers, prices, or percentages that are not
already present in the reasons. Do not contradict the action. Do not invent facts.`;

export async function phraseRecommendation(decision: Decision): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return fallbackPhrasing(decision);

  try {
    const client = new Anthropic({ apiKey: key });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 200,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Action: ${decision.action}\nReasons:\n- ${decision.reasons.join(
            "\n- ",
          )}`,
        },
      ],
    });
    const block = msg.content.find((b) => b.type === "text");
    return block && "text" in block ? block.text.trim() : fallbackPhrasing(decision);
  } catch {
    return fallbackPhrasing(decision);
  }
}
