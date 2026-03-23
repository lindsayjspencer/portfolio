import {
	buildNarrationContextSection,
	buildPlannerContextSection,
	CHARACTER_GUIDELINES_SECTION,
	NARRATION_FORMATTING_RULES_SECTION,
	NARRATOR_MISSION_SECTION,
	NARRATOR_RESPONSE_RULES_SECTION,
	PLANNER_DECISION_RULES_SECTION,
	PLANNER_MISSION_SECTION,
	PLANNER_VIEW_TOOLS_SECTION,
	PROMPT_IDENTITY_SECTION,
	SPECIAL_RESPONSE_RULES_SECTION,
} from './sections';

export function createAskPlannerSystemPrompt() {
	return [
		PROMPT_IDENTITY_SECTION,
		PLANNER_MISSION_SECTION,
		PLANNER_VIEW_TOOLS_SECTION,
		PLANNER_DECISION_RULES_SECTION,
		CHARACTER_GUIDELINES_SECTION,
	].join('\n\n');
}

export function createAskNarrationSystemPrompt() {
	return [
		PROMPT_IDENTITY_SECTION,
		NARRATOR_MISSION_SECTION,
		NARRATOR_RESPONSE_RULES_SECTION,
		SPECIAL_RESPONSE_RULES_SECTION,
		NARRATION_FORMATTING_RULES_SECTION,
		CHARACTER_GUIDELINES_SECTION,
	].join('\n\n');
}

export function createAskPlannerContextPrompt({
	lindsayProfileContext,
	portfolioContext,
	caseStudiesContext,
}: {
	lindsayProfileContext: string;
	portfolioContext: string;
	caseStudiesContext: string;
}) {
	return buildPlannerContextSection({
		lindsayProfileContext,
		portfolioContext,
		caseStudiesContext,
	});
}

export function createAskNarrationContextPrompt({
	lindsayProfileContext,
	portfolioContext,
	caseStudiesContext,
}: {
	lindsayProfileContext: string;
	portfolioContext: string;
	caseStudiesContext: string;
}) {
	return buildNarrationContextSection({
		lindsayProfileContext,
		portfolioContext,
		caseStudiesContext,
	});
}
