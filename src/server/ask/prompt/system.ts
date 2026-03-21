import {
	buildContextSection,
	CHARACTER_GUIDELINES_SECTION,
	FORMATTING_RULES_SECTION,
	PROMPT_IDENTITY_SECTION,
	RESPONSE_CONTRACT_SECTION,
	ROUTING_GUIDELINES_SECTION,
	SPECIAL_RESPONSE_RULES_SECTION,
	TOOLS_SECTION,
} from './sections';

export function createAskSystemPrompt() {
	return [
		PROMPT_IDENTITY_SECTION,
		RESPONSE_CONTRACT_SECTION,
		TOOLS_SECTION,
		ROUTING_GUIDELINES_SECTION,
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
