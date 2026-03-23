import {
	buildContextSection,
	CHARACTER_GUIDELINES_SECTION,
	DECISION_RULES_SECTION,
	FORMATTING_RULES_SECTION,
	MISSION_SECTION,
	PROMPT_IDENTITY_SECTION,
	SPECIAL_RESPONSE_RULES_SECTION,
	VIEW_SELECTION_SECTION,
	VIEW_TOOLS_SECTION,
} from './sections';

export function createAskSystemPrompt() {
	return [
		PROMPT_IDENTITY_SECTION,
		MISSION_SECTION,
		VIEW_TOOLS_SECTION,
		DECISION_RULES_SECTION,
		VIEW_SELECTION_SECTION,
		SPECIAL_RESPONSE_RULES_SECTION,
		FORMATTING_RULES_SECTION,
		CHARACTER_GUIDELINES_SECTION,
	].join('\n\n');
}

export function createAskContextPrompt({
	lindsayProfileContext,
	portfolioContext,
	caseStudiesContext,
}: {
	lindsayProfileContext: string;
	portfolioContext: string;
	caseStudiesContext: string;
}) {
	return buildContextSection({
		lindsayProfileContext,
		portfolioContext,
		caseStudiesContext,
	});
}
