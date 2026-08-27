/**
 * A/B compare system instruction for persona vision turns.
 * Spec: specs/domain/chat-image-attachments.md
 */

export function abCompareSystemInstruction(): string {
  return (
    'A/B Compare Mode (2 images):\n' +
    '- You will receive two images.\n' +
    '- Treat the FIRST image as Image A and the SECOND image as Image B.\n' +
    '- Compare A vs B directly. Do not describe them independently without comparing.\n' +
    '- Reply in Markdown and use these headings exactly:\n' +
    '  ### A summary\n' +
    '  ### B summary\n' +
    '  ### Key differences\n' +
    '  ### Winner & why\n' +
    '  ### Recommendations\n' +
    '- You MUST pick a winner (A or B) and justify it against the user\'s goal.'
  )
}

/** True when the client asked for A/B and exactly two images are attached. */
export function shouldEnableAbCompare(
  abCompare: boolean | null | undefined,
  imageCount: number,
): boolean {
  return Boolean(abCompare) && imageCount === 2
}
