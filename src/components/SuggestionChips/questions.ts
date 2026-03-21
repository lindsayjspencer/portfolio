export const LANDING_ROTATING_SUGGESTION_CHIP_QUESTIONS = [
	"What's your experience with modern web frameworks?",
	'Why should we hire you over an AI?',
	'Why should we hire you in this economy',
	'What makes you unique?',
	'What are you most proud of in your career?',
	'Do you have experience in Typescript?',
	'Are you just another programmer?',
	'How does this portfolio work?',
	'Show me your React projects',
] as const;

export const LANDING_FIXED_SUGGESTION_CHIP_QUESTION = 'Just put the resume in the bag' as const;

export const LANDING_SUGGESTION_CHIP_QUESTIONS = [
	...LANDING_ROTATING_SUGGESTION_CHIP_QUESTIONS,
	LANDING_FIXED_SUGGESTION_CHIP_QUESTION,
] as const;

export type LandingSuggestionChipQuestion = (typeof LANDING_SUGGESTION_CHIP_QUESTIONS)[number];
