import { describe, expect, test } from "bun:test";
import { buildPromptFromDescription } from "./generatePrompt";

describe("buildPromptFromDescription", () => {
  test("adds alcohol-safety guidance for teen events at bar venues", () => {
    const prompt = buildPromptFromDescription(
      "Xavier is turning 15th and having a party at Whiskey Roads, a country western bar in Tucson.",
    );

    expect(prompt).toContain("under-21 birthday invitation");
    expect(prompt).toContain("do not depict alcohol");
  });

  test("does not add teen venue guidance for ordinary prompts", () => {
    const prompt = buildPromptFromDescription("Maya is having a garden birthday brunch at home.");

    expect(prompt).not.toContain("do not depict alcohol");
  });
});
