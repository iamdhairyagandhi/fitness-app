export type HealthCitation = {
    label: string;
    organization: string;
    url: string;
};

export const HEALTH_CITATIONS: HealthCitation[] = [
    {
        label: 'Physical Activity Guidelines for Americans',
        organization: 'U.S. Department of Health and Human Services',
        url: 'https://health.gov/our-work/nutrition-physical-activity/physical-activity-guidelines',
    },
    {
        label: 'Adult physical activity basics',
        organization: 'Centers for Disease Control and Prevention',
        url: 'https://www.cdc.gov/physical-activity-basics/guidelines/adults.html',
    },
    {
        label: 'Dietary Guidelines for Americans',
        organization: 'U.S. Department of Agriculture and HHS',
        url: 'https://www.dietaryguidelines.gov/',
    },
    {
        label: 'Dietary supplement fact sheets',
        organization: 'NIH Office of Dietary Supplements',
        url: 'https://ods.od.nih.gov/factsheets/list-all/',
    },
    {
        label: 'Sports medicine position stands',
        organization: 'American College of Sports Medicine',
        url: 'https://www.acsm.org/education-resources/trending-topics-resources/position-stands',
    },
];

export const HEALTH_CITATION_PROMPT = `When giving health, nutrition, recovery, supplement, injury, or exercise recommendations, include a short "Sources" line using relevant source names from this list when applicable: HHS Physical Activity Guidelines, CDC Adult Physical Activity Guidelines, Dietary Guidelines for Americans, NIH Office of Dietary Supplements, ACSM position stands. Do not present the advice as medical diagnosis or treatment. Recommend consulting a qualified clinician for pain, injury, medical conditions, pregnancy, eating disorders, or medication/supplement questions.`;
