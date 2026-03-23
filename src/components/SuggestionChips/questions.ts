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
	'How did you become self-taught?',
	'How do you work with designers and product managers?',
	'Show me a project that had real business impact',
	'What would I be hiring you to solve?',
	'Do you have backend experience too?',
	'What’s your strongest technical skill?',
] as const;

export const LANDING_FIXED_SUGGESTION_CHIP_QUESTION = 'Just let me see the resume' as const;

export const LANDING_SUGGESTION_CHIP_QUESTIONS = [
	...LANDING_ROTATING_SUGGESTION_CHIP_QUESTIONS,
	LANDING_FIXED_SUGGESTION_CHIP_QUESTION,
] as const;

export type LandingSuggestionChipQuestion = (typeof LANDING_SUGGESTION_CHIP_QUESTIONS)[number];
