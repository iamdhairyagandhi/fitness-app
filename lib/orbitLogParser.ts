import { getLocalDateKey } from '@/lib/date';
import { generateId } from '@/lib/utils';
import type { MealType, MuscleGroup, RecoveryLog } from '@/types';

type Rating = 1 | 2 | 3 | 4 | 5;
type SorenessRating = 0 | 1 | 2 | 3 | 4 | 5;

export type OrbitRecoveryDraft = Omit<RecoveryLog, 'id' | 'user_id' | 'recovery_score'>;

export type OrbitLogAction =
    | {
        id: string;
        kind: 'water';
        amountMl: number;
        label: string;
        detail: string;
        icon: 'water';
    }
    | {
        id: string;
        kind: 'recovery';
        log: OrbitRecoveryDraft;
        label: string;
        detail: string;
        icon: 'moon';
    }
    | {
        id: string;
        kind: 'workout_start';
        name: string;
        label: string;
        detail: string;
        icon: 'play';
    }
    | {
        id: string;
        kind: 'workout_complete';
        name: string;
        durationMinutes: number | null;
        notes: string | null;
        label: string;
        detail: string;
        icon: 'barbell';
    };

const NUMBER_WORDS: Record<string, number> = {
    a: 1,
    an: 1,
    zero: 0,
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    half: 0.5,
};

const MEAL_KEYWORDS: Record<MealType, RegExp> = {
    breakfast: /\b(breakfast|morning meal)\b/i,
    lunch: /\b(lunch|midday meal)\b/i,
    dinner: /\b(dinner|supper|evening meal)\b/i,
    snack: /\b(snack|snacks|late night|dessert)\b/i,
};

const FOOD_HINT = /\b(ate|eaten|had|meal|breakfast|lunch|dinner|snack|food|calories|protein|carbs|fat|serving|grams|g\b|bowl|plate|sandwich|salad|rice|chicken|egg|eggs|toast|oats|yogurt|yoghurt|banana|apple|berries|protein shake|coffee|milk|bread|pasta|pizza|burger|wrap|taco|soup|steak|fish|salmon|potato|avocado|cereal)\b/i;
const NON_FOOD_ONLY_HINT = /\b(water|slept|sleep|stress|stressed|energy|mood|sore|soreness|recovery|hrv|heart rate|workout|training|lift|run|cardio|walk|steps)\b/i;

const BODY_PART_ALIASES: { regex: RegExp; group: MuscleGroup }[] = [
    { regex: /\b(chest|pecs?)\b/i, group: 'chest' },
    { regex: /\b(back|upper back)\b/i, group: 'back' },
    { regex: /\b(lats?|latissimus)\b/i, group: 'lats' },
    { regex: /\b(shoulders?|delts?)\b/i, group: 'shoulders' },
    { regex: /\b(biceps?)\b/i, group: 'biceps' },
    { regex: /\b(triceps?)\b/i, group: 'triceps' },
    { regex: /\b(forearms?)\b/i, group: 'forearms' },
    { regex: /\b(quads?|thighs?)\b/i, group: 'quads' },
    { regex: /\b(hamstrings?|hams?)\b/i, group: 'hamstrings' },
    { regex: /\b(glutes?|butt)\b/i, group: 'glutes' },
    { regex: /\b(calves|calf)\b/i, group: 'calves' },
    { regex: /\b(abs|core)\b/i, group: 'abs' },
    { regex: /\b(obliques?)\b/i, group: 'obliques' },
    { regex: /\b(traps?)\b/i, group: 'traps' },
    { regex: /\b(lower back|lumbar)\b/i, group: 'lower_back' },
    { regex: /\b(full body|whole body|everywhere)\b/i, group: 'full_body' },
];

function parseNumeric(raw: string | undefined): number | null {
    if (!raw) return null;
    const normalized = raw.trim().toLowerCase();
    const direct = Number(normalized);
    if (Number.isFinite(direct)) return direct;
    return NUMBER_WORDS[normalized] ?? null;
}

function clampRating(value: number | null): Rating | null {
    if (value === null || Number.isNaN(value)) return null;
    return Math.min(5, Math.max(1, Math.round(value))) as Rating;
}

function clampSoreness(value: number | null): SorenessRating {
    if (value === null || Number.isNaN(value)) return 0;
    return Math.min(5, Math.max(0, Math.round(value))) as SorenessRating;
}

function wordRating(text: string, positiveWords: string[], negativeWords: string[]): Rating | null {
    if (positiveWords.some((word) => text.includes(word))) return 4;
    if (negativeWords.some((word) => text.includes(word))) return 2;
    if (/\b(okay|ok|average|fine|mid|normal)\b/i.test(text)) return 3;
    return null;
}

export function guessMealFromText(text: string, now: Date = new Date()): MealType {
    for (const [meal, regex] of Object.entries(MEAL_KEYWORDS) as [MealType, RegExp][]) {
        if (regex.test(text)) return meal;
    }

    const hour = now.getHours();
    if (hour < 11) return 'breakfast';
    if (hour < 16) return 'lunch';
    if (hour < 21) return 'dinner';
    return 'snack';
}

export function shouldParseFood(text: string): boolean {
    if (!FOOD_HINT.test(text)) return false;
    const hasFoodWord = /\b(chicken|rice|egg|eggs|toast|oats|yogurt|yoghurt|banana|apple|berries|protein shake|coffee|milk|bread|pasta|pizza|burger|wrap|taco|soup|steak|fish|salmon|potato|avocado|cereal|salad|sandwich)\b/i.test(text);
    const hasFoodContext = /\b(ate|eaten|meal|breakfast|lunch|dinner|snack|food|calories|protein|carbs|fat|serving|grams|g\b|bowl|plate)\b/i.test(text);
    const onlyWater = /\b(water|ml|milliliters?|liters?|litres?|ounces?|oz|glass|cup|bottle)\b/i.test(text) && !hasFoodWord;
    return !onlyWater && (hasFoodWord || hasFoodContext) && (!NON_FOOD_ONLY_HINT.test(text) || hasFoodWord || /\b(breakfast|lunch|dinner|snack|meal|ate|eaten)\b/i.test(text));
}

export function parseWaterActions(text: string): OrbitLogAction[] {
    const actions: OrbitLogAction[] = [];
    const seen = new Set<string>();

    const addAmount = (amountMl: number, source: string) => {
        const rounded = Math.max(1, Math.round(amountMl));
        const key = `${rounded}-${source.toLowerCase()}`;
        if (seen.has(key)) return;
        seen.add(key);
        actions.push({
            id: generateId(),
            kind: 'water',
            amountMl: rounded,
            label: `${rounded} ml water`,
            detail: `Hydration log from "${source.trim()}"`,
            icon: 'water',
        });
    };

    const unitRegex = /(\d+(?:\.\d+)?|a|an|one|two|three|four|five|six|seven|eight|nine|ten|half)\s*(ml|milliliters?|millilitres?|l|liters?|litres?|oz|ounces?|fl oz)\b(?:\s+of)?\s*(?:water)?/gi;
    let unitMatch: RegExpExecArray | null;
    while ((unitMatch = unitRegex.exec(text))) {
        const amount = parseNumeric(unitMatch[1]);
        if (amount === null) continue;
        const unit = unitMatch[2].toLowerCase();
        if (unit === 'ml' || unit.startsWith('millil')) addAmount(amount, unitMatch[0]);
        else if (unit === 'l' || unit.startsWith('liter') || unit.startsWith('litre')) addAmount(amount * 1000, unitMatch[0]);
        else addAmount(amount * 29.5735, unitMatch[0]);
    }

    const containerRegex = /(\d+(?:\.\d+)?|a|an|one|two|three|four|five|six|seven|eight|nine|ten|half)\s*(glasses?|cups?|bottles?)\b(?:\s+of)?\s*water/gi;
    let containerMatch: RegExpExecArray | null;
    while ((containerMatch = containerRegex.exec(text))) {
        const amount = parseNumeric(containerMatch[1]);
        if (amount === null) continue;
        const container = containerMatch[2].toLowerCase();
        const ml = container.startsWith('bottle') ? 500 : 250;
        addAmount(amount * ml, containerMatch[0]);
    }

    if (actions.length === 0 && /\b(drank|had|logged?)\s+(some\s+)?water\b/i.test(text)) {
        addAmount(250, 'some water');
    }

    return actions;
}

export function parseRecoveryAction(text: string): OrbitLogAction | null {
    const lower = text.toLowerCase();
    const hasRecoveryHint = /\b(slept|sleep|recovery|stress|stressed|energy|mood|sore|soreness|hrv|resting heart|resting hr|heart rate|tired|fatigued)\b/i.test(text);
    if (!hasRecoveryHint) return null;

    const sleepHours = parseNumeric(text.match(/\b(?:slept|sleep|got)\s*(?:for\s*)?(\d+(?:\.\d+)?|a|an|one|two|three|four|five|six|seven|eight|nine|ten|half)\s*(?:hours?|hrs?|h)\b/i)?.[1]);
    const qualityMatch = parseNumeric(text.match(/\b(?:sleep quality|quality)\s*(?:was|is|at|:)?\s*(\d|one|two|three|four|five)\b/i)?.[1]);
    const energyMatch = parseNumeric(text.match(/\benergy\s*(?:was|is|at|:)?\s*(\d|one|two|three|four|five)\b/i)?.[1]);
    const stressMatch = parseNumeric(text.match(/\bstress(?:ed)?\s*(?:was|is|at|:)?\s*(\d|one|two|three|four|five)\b/i)?.[1]);
    const moodMatch = parseNumeric(text.match(/\bmood\s*(?:was|is|at|:)?\s*(\d|one|two|three|four|five)\b/i)?.[1]);
    const sorenessMatch = parseNumeric(text.match(/\bsoreness\s*(?:was|is|at|:)?\s*(\d|one|two|three|four|five)\b/i)?.[1]);
    const restingHr = parseNumeric(text.match(/\b(?:resting hr|resting heart rate|heart rate)\s*(?:was|is|at|:)?\s*(\d{2,3})\b/i)?.[1]);
    const hrv = parseNumeric(text.match(/\bhrv\s*(?:was|is|at|:)?\s*(\d{1,3})\b/i)?.[1]);

    const soreBodyParts = BODY_PART_ALIASES
        .filter(({ regex }) => regex.test(text))
        .map(({ group }) => group);

    const sleepQuality = clampRating(
        qualityMatch ?? wordRating(lower, ['slept great', 'slept well', 'good sleep', 'great sleep'], ['slept bad', 'slept poorly', 'bad sleep', 'poor sleep'])
    );
    const energyLevel = clampRating(
        energyMatch ?? wordRating(lower, ['high energy', 'energetic', 'fresh'], ['low energy', 'tired', 'fatigued', 'exhausted'])
    );
    const stressLevel = clampRating(
        stressMatch ?? (/\b(stress low|low stress|calm|relaxed)\b/i.test(text) ? 1 : /\b(stress high|high stress|stressed)\b/i.test(text) ? 4 : null)
    );
    const mood = clampRating(
        moodMatch ?? wordRating(lower, ['good mood', 'great mood', 'happy'], ['bad mood', 'down', 'sad'])
    );
    const sorenessLevel = clampSoreness(
        sorenessMatch ?? (/\bsore\b/i.test(text) ? 3 : null)
    );

    const summaryBits = [
        sleepHours ? `${sleepHours}h sleep` : null,
        sleepQuality ? `sleep quality ${sleepQuality}/5` : null,
        energyLevel ? `energy ${energyLevel}/5` : null,
        stressLevel ? `stress ${stressLevel}/5` : null,
        sorenessLevel ? `soreness ${sorenessLevel}/5` : null,
    ].filter(Boolean);

    return {
        id: generateId(),
        kind: 'recovery',
        icon: 'moon',
        label: summaryBits.length ? summaryBits.join(' · ') : 'Recovery note',
        detail: soreBodyParts.length
            ? `Sore areas: ${soreBodyParts.map((part) => part.replace('_', ' ')).join(', ')}`
            : 'Sleep and recovery details',
        log: {
            date: getLocalDateKey(),
            sleep_hours: sleepHours,
            sleep_quality: sleepQuality,
            soreness_level: sorenessLevel,
            sore_body_parts: soreBodyParts,
            stress_level: stressLevel,
            energy_level: energyLevel,
            mood,
            resting_hr: restingHr,
            hrv,
            notes: text,
        },
    };
}

function deriveWorkoutName(text: string): string {
    const lower = text.toLowerCase();
    if (/\bpush\b/.test(lower)) return 'Push Workout';
    if (/\bpull\b/.test(lower)) return 'Pull Workout';
    if (/\bleg|legs\b/.test(lower)) return 'Leg Day';
    if (/\bupper\b/.test(lower)) return 'Upper Body';
    if (/\blower\b/.test(lower)) return 'Lower Body';
    if (/\bcardio|run|running|bike|cycling|walk\b/.test(lower)) return 'Cardio';
    if (/\bfull body|whole body\b/.test(lower)) return 'Full Body';

    const named = text.match(/\b(?:start|begin|finished|completed|did|logged?)\s+(?:a\s+|an\s+)?(.+?)\s+(?:workout|training|session)\b/i)?.[1];
    if (named && named.length < 32) {
        return named
            .split(/\s+/)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    return 'Workout';
}

export function parseWorkoutAction(text: string): OrbitLogAction | null {
    if (!/\b(workout|training|session|lift|run|cardio|push|pull|leg day|upper body|lower body|full body)\b/i.test(text)) {
        return null;
    }

    const name = deriveWorkoutName(text);
    const durationMatch = text.match(/\b(\d+(?:\.\d+)?|a|an|one|two|three|four|five|six|seven|eight|nine|ten|half)\s*(minutes?|mins?|min|hours?|hrs?|h)\b/i);
    const durationValue = parseNumeric(durationMatch?.[1]);
    const durationMinutes = durationValue === null
        ? null
        : /h|hour|hr/i.test(durationMatch?.[2] ?? '')
            ? Math.round(durationValue * 60)
            : Math.round(durationValue);

    if (/\b(start|begin|open)\b/i.test(text) && !/\b(finished|completed|done|did|logged?)\b/i.test(text)) {
        return {
            id: generateId(),
            kind: 'workout_start',
            name,
            label: `Start ${name}`,
            detail: 'Opens the active workout timer',
            icon: 'play',
        };
    }

    if (/\b(finished|completed|done|did|logged?)\b/i.test(text)) {
        return {
            id: generateId(),
            kind: 'workout_complete',
            name,
            durationMinutes,
            notes: text,
            label: `Completed ${name}`,
            detail: durationMinutes ? `${durationMinutes} min session` : 'Completed workout note',
            icon: 'barbell',
        };
    }

    return null;
}

export function parseOrbitActions(text: string): OrbitLogAction[] {
    const actions: OrbitLogAction[] = [
        ...parseWaterActions(text),
    ];

    const recovery = parseRecoveryAction(text);
    if (recovery) actions.push(recovery);

    const workout = parseWorkoutAction(text);
    if (workout) actions.push(workout);

    return actions;
}
