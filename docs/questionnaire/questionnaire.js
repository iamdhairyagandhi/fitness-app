const SUPABASE_URL = 'https://fudqcomgwnjxcqgocfuw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1ZHFjb21nd25qeGNxZ29jZnV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4Nzk5MzIsImV4cCI6MjA5MjQ1NTkzMn0.60OIb8oL-9MY-2ttZjXYLN3hwkGms6XmnzXWa3gnMOE';

const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const questions = [
  { id: 'display_name', type: 'input', label: 'First name', title: 'What should BodyPilot call you?', subtitle: 'This will personalize the plan summary.', required: true },
  { id: 'email', type: 'input', inputType: 'email', label: 'Email', title: 'Where should we save your plan?', subtitle: 'Use this same email when you sign into the app.', required: true },
  { id: 'unit_system', type: 'choice', title: 'Which units do you use?', subtitle: 'We will ask height and weight in your usual format.', required: true, choices: [
    ['imperial', 'ft / lb', 'Most common in the US.'],
    ['metric', 'cm / kg', 'Metric measurements.'],
  ] },
  { id: 'gender', type: 'choice', title: 'What should we use for baseline calculations?', subtitle: 'This helps estimate BMR and calorie targets.', required: true, choices: [
    ['male', 'Male', 'Use male BMR assumptions.'],
    ['female', 'Female', 'Use female BMR assumptions.'],
    ['other', 'Other', 'Use a neutral starting point.'],
  ] },
  { id: 'age_years', type: 'input', inputType: 'number', label: 'Age', title: 'How old are you?', subtitle: 'Age helps personalize energy and recovery estimates.', required: true },
  { id: 'height', type: 'height', title: 'What is your height?', subtitle: 'We use this for calorie estimates and body composition context.', required: true },
  { id: 'weight', type: 'weight', label: 'Current weight', title: 'What is your current weight?', subtitle: 'This is your starting point. You can update it anytime.', required: true },
  { id: 'goal', type: 'choice', title: 'What are we building toward?', subtitle: 'This shapes calories, macros, training emphasis, and insights.', required: true, choices: [
    ['lose_fat', 'Lose fat', 'Lean down while preserving muscle and energy.'],
    ['build_muscle', 'Build muscle', 'Prioritize growth, strength, and enough food.'],
    ['recomp', 'Recomposition', 'Improve muscle and body composition together.'],
    ['strength', 'Get stronger', 'Focus on PRs, compounds, and recovery.'],
    ['endurance', 'Improve endurance', 'Build stamina and cardio capacity.'],
    ['maintain', 'Maintain', 'Keep healthy habits stable and measurable.'],
  ] },
  { id: 'target_weight', type: 'weight', label: 'Target weight', title: 'Do you have a target weight?', subtitle: 'Optional. Skip this if your goal is performance or consistency first.', required: false },
  { id: 'pace', type: 'choice', title: 'How hard should the first plan push?', subtitle: 'You can adjust this later after real logs come in.', required: true, choices: [
    ['steady', 'Steady', 'Conservative and easy to sustain.'],
    ['balanced', 'Balanced', 'A practical middle ground.'],
    ['aggressive', 'Focused', 'More ambitious targets.'],
  ] },
  { id: 'motivation', type: 'choice', title: 'What matters most right now?', subtitle: 'This helps BodyPilot choose the right reminders.', required: true, choices: [
    ['appearance', 'Look different', 'Body composition, confidence, and photos.'],
    ['performance', 'Perform better', 'Strength, stamina, sports, or gym progress.'],
    ['health', 'Feel healthier', 'Energy, habits, mobility, and longevity.'],
    ['confidence', 'Build confidence', 'Consistency and visible proof.'],
  ] },
  { id: 'experience_level', type: 'choice', title: 'What is your training experience?', subtitle: 'This changes progression speed and rest guidance.', required: true, choices: [
    ['beginner', 'Beginner', 'New or returning after a long break.'],
    ['intermediate', 'Intermediate', 'You know the basics and train consistently.'],
    ['advanced', 'Advanced', 'You track performance and manage fatigue.'],
    ['elite', 'Elite', 'Highly experienced or competitive.'],
  ] },
  { id: 'training_days', type: 'input', inputType: 'number', label: 'Training days per week', title: 'How many days per week can you train?', subtitle: 'Pick the number you can actually repeat.', required: true },
  { id: 'session_minutes', type: 'input', inputType: 'number', label: 'Minutes per session', title: 'How long is a normal workout?', subtitle: 'This keeps workouts realistic instead of bloated.', required: true },
  { id: 'equipment', type: 'choice', title: 'What equipment do you have?', subtitle: 'A good plan fits your real setup.', required: true, choices: [
    ['gym', 'Full gym', 'Barbells, machines, cables, cardio equipment.'],
    ['home', 'Home setup', 'Dumbbells, bands, bench, or a small setup.'],
    ['bodyweight', 'Bodyweight', 'Minimal equipment and movement-first plans.'],
    ['mixed', 'Mixed', 'Some gym days, some home or travel days.'],
  ] },
  { id: 'diet_style', type: 'choice', title: 'Which nutrition style fits you?', subtitle: 'This changes macro defaults and meal guidance.', required: true, choices: [
    ['balanced', 'Balanced', 'Flexible meals with protein, carbs, and fats.'],
    ['high_protein', 'High protein', 'More protein-forward targets and reminders.'],
    ['vegetarian', 'Vegetarian', 'Plant-forward meals with protein support.'],
    ['low_carb', 'Lower carb', 'Higher fat and protein, lower carbohydrates.'],
  ] },
  { id: 'meals_per_day', type: 'input', inputType: 'number', label: 'Meals per day', title: 'How many meals do you usually eat?', subtitle: 'This helps split targets into something usable.', required: true },
  { id: 'tracking_style', type: 'choice', title: 'How do you want to track food?', subtitle: 'BodyPilot can start simple and get more detailed later.', required: true, choices: [
    ['simple', 'Simple targets', 'Calories, protein, and water first.'],
    ['macro', 'Macro detail', 'Protein, carbs, fats, and daily totals.'],
    ['photo', 'Photo assisted', 'Use scans/photos when logging feels tedious.'],
  ] },
  { id: 'activity_level', type: 'choice', title: 'How active are you outside workouts?', subtitle: 'This helps estimate real daily calorie burn.', required: true, choices: [
    ['sedentary', 'Mostly seated', 'Desk job, low daily movement.'],
    ['light', 'Light movement', 'Some walking or errands most days.'],
    ['moderate', 'Moderate', 'Regular movement outside workouts.'],
    ['active', 'Active', 'Physical job or consistently high steps.'],
    ['very_active', 'Very active', 'Athletic schedule or highly physical work.'],
  ] },
  { id: 'sleep_hours', type: 'input', inputType: 'number', label: 'Average sleep hours', title: 'How much do you sleep?', subtitle: 'Recovery affects how aggressive the plan should be.', required: true },
  { id: 'stress_level', type: 'choice', title: 'What is your stress level?', subtitle: 'This helps avoid plans that collapse by Friday.', required: true, choices: [
    ['low', 'Low', 'Most days feel manageable.'],
    ['medium', 'Medium', 'Some pressure, but workable.'],
    ['high', 'High', 'Recovery needs extra respect.'],
  ] },
];

const answers = {
  unit_system: 'imperial',
  pace: 'balanced',
};

let index = 0;
const title = document.getElementById('question-title');
const subtitle = document.getElementById('question-subtitle');
const body = document.getElementById('question-body');
const backButton = document.getElementById('back-button');
const nextButton = document.getElementById('next-button');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const message = document.getElementById('quiz-message');

function numberFrom(value, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function lbsToKg(value) {
  return value / 2.20462;
}

function feetInchesToCm(feet, inches) {
  return Math.round((numberFrom(feet) * 12 + numberFrom(inches)) * 2.54);
}

function calculateBMR(weightKg, heightCm, ageYears, gender) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  if (gender === 'female') return Math.round(base - 161);
  if (gender === 'male') return Math.round(base + 5);
  return Math.round(base - 78);
}

function calculateTDEE(bmr, activity) {
  const multipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
  return Math.round(bmr * (multipliers[activity] || 1.55));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function roundToNearest(value, nearest) {
  return Math.round(value / nearest) * nearest;
}

function getGoalDailyEnergyDelta(weightKg, goal, pace) {
  const paceFactor = { steady: 0.75, balanced: 1, aggressive: 1.25 }[pace || 'balanced'];
  const lossRates = { lose_fat: 0.0075, recomp: 0.0035, maintain: 0, build_muscle: 0, strength: 0, endurance: 0 };
  const gainRates = { lose_fat: 0, recomp: 0, maintain: 0, build_muscle: 0.0025, strength: 0.0015, endurance: 0 };
  const lossRate = (lossRates[goal] || 0) * paceFactor;
  const gainRate = (gainRates[goal] || 0) * paceFactor;

  if (lossRate > 0) {
    const dailyDeficit = (weightKg * lossRate * 7700) / 7;
    return -Math.min(Math.max(dailyDeficit, 250), goal === 'lose_fat' ? 750 : 400);
  }

  if (gainRate > 0) {
    const dailySurplus = (weightKg * gainRate * 7700) / 7;
    return Math.min(Math.max(dailySurplus, 125), goal === 'build_muscle' ? 450 : 300);
  }

  return 0;
}

function getPlan() {
  const unit = answers.unit_system || 'imperial';
  const weightKg = unit === 'metric' ? numberFrom(answers.weight) : lbsToKg(numberFrom(answers.weight));
  const targetWeightKg = answers.target_weight
    ? unit === 'metric' ? numberFrom(answers.target_weight) : lbsToKg(numberFrom(answers.target_weight))
    : null;
  const heightCm = unit === 'metric' ? numberFrom(answers.height_cm) : feetInchesToCm(answers.height_ft, answers.height_in);
  const ageYears = numberFrom(answers.age_years, 25);
  const goal = answers.goal || 'maintain';
  const activity = answers.activity_level || 'moderate';
  const bmr = calculateBMR(weightKg, heightCm, ageYears, answers.gender || 'male');
  const tdee = calculateTDEE(bmr, activity);
  const calorieFloor = answers.gender === 'female' ? 1200 : 1500;
  const calorieDelta = getGoalDailyEnergyDelta(weightKg, goal, answers.pace);
  const calories = roundToNearest(clamp(tdee + calorieDelta, calorieFloor, Math.max(tdee + 650, calorieFloor + 300)), 25);
  const actualDelta = calories - tdee;
  const weeklyChangeKg = (actualDelta * 7) / 7700;
  const kgToTarget = targetWeightKg == null ? null : targetWeightKg - weightKg;
  const weeksToTarget = kgToTarget != null && Math.abs(weeklyChangeKg) > 0.05 && Math.sign(kgToTarget) === Math.sign(weeklyChangeKg)
    ? Math.max(1, Math.ceil(Math.abs(kgToTarget / weeklyChangeKg)))
    : null;

  let proteinPerKg = 1.8;
  let fatPct = 0.28;
  if (goal === 'lose_fat' || goal === 'recomp') proteinPerKg = 2.1;
  if (goal === 'build_muscle' || goal === 'strength') proteinPerKg = 1.9;
  if (goal === 'endurance') proteinPerKg = 1.6;
  if (answers.diet_style === 'high_protein') proteinPerKg = Math.max(proteinPerKg, 2.2);
  if (answers.diet_style === 'vegetarian') proteinPerKg = Math.max(proteinPerKg, 1.9);
  if (answers.diet_style === 'low_carb') fatPct = 0.4;
  const protein = Math.round(weightKg * proteinPerKg);
  const fat = Math.max(Math.round(weightKg * 0.6), Math.round((calories * fatPct) / 9));

  return {
    weightKg,
    targetWeightKg,
    heightCm,
    ageYears,
    bmr,
    tdee,
    calories,
    calorieDelta: actualDelta,
    weeklyChangeKg,
    weeksToTarget,
    protein,
    carbs: Math.max(50, Math.round((calories - protein * 4 - fat * 9) / 4)),
    fat,
    waterMl: Math.round(weightKg * (activity === 'very_active' ? 42 : 36)),
    restSeconds: answers.experience_level === 'beginner' ? 90 : goal === 'strength' ? 150 : 75,
  };
}

function render() {
  const question = questions[index];
  title.textContent = question.title;
  subtitle.textContent = question.subtitle;
  body.innerHTML = '';
  message.classList.remove('visible');
  progressFill.style.width = `${((index + 1) / questions.length) * 100}%`;
  progressText.textContent = `${index + 1}/${questions.length}`;
  backButton.style.display = index === 0 ? 'none' : 'inline-flex';
  nextButton.textContent = index === questions.length - 1 ? 'Save my plan' : 'Next';

  if (question.type === 'choice') {
    const grid = document.createElement('div');
    grid.className = 'choice-grid';
    question.choices.forEach(([value, label, detail]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'choice-button';
      button.setAttribute('aria-pressed', String(answers[question.id] === value));
      button.innerHTML = `<strong>${label}</strong><span>${detail}</span>`;
      button.addEventListener('click', () => {
        answers[question.id] = value;
        render();
      });
      grid.appendChild(button);
    });
    body.appendChild(grid);
    return;
  }

  if (question.type === 'height') {
    if ((answers.unit_system || 'imperial') === 'metric') {
      body.appendChild(inputField('height_cm', 'Height (cm)', '175', 'number'));
    } else {
      body.appendChild(inputField('height_ft', 'Feet', '5', 'number'));
      body.appendChild(inputField('height_in', 'Inches', '10', 'number'));
    }
    return;
  }

  if (question.type === 'weight') {
    const unit = (answers.unit_system || 'imperial') === 'metric' ? 'kg' : 'lb';
    body.appendChild(inputField(question.id, `${question.label} (${unit})`, question.required ? '165' : '158', 'number'));
    return;
  }

  body.appendChild(inputField(question.id, question.label, '', question.inputType || 'text'));
}

function inputField(id, label, placeholder, type) {
  const wrap = document.createElement('div');
  wrap.className = 'field';
  const input = document.createElement('input');
  input.id = id;
  input.type = type;
  input.placeholder = placeholder;
  input.value = answers[id] || '';
  input.addEventListener('input', (event) => {
    answers[id] = event.target.value;
  });
  wrap.innerHTML = `<label for="${id}">${label}</label>`;
  wrap.appendChild(input);
  window.setTimeout(() => input.focus(), 20);
  return wrap;
}

function isCurrentValid() {
  const question = questions[index];
  if (!question.required) return true;
  if (question.type === 'height') {
    return (answers.unit_system || 'imperial') === 'metric'
      ? Boolean(answers.height_cm)
      : Boolean(answers.height_ft);
  }
  return Boolean(answers[question.id]);
}

async function submit() {
  const plan = getPlan();
  const payload = {
    email: String(answers.email || '').trim().toLowerCase(),
    display_name: String(answers.display_name || '').trim(),
    unit_system: answers.unit_system || 'imperial',
    gender: answers.gender,
    age_years: Math.round(numberFrom(answers.age_years)),
    height_cm: plan.heightCm,
    weight_kg: plan.weightKg,
    target_weight_kg: plan.targetWeightKg,
    activity_level: answers.activity_level,
    goal: answers.goal,
    experience_level: answers.experience_level,
    training_days: Math.round(numberFrom(answers.training_days)),
    session_minutes: Math.round(numberFrom(answers.session_minutes)),
    equipment: answers.equipment,
    diet_style: answers.diet_style,
    meals_per_day: Math.round(numberFrom(answers.meals_per_day)),
    tracking_style: answers.tracking_style,
    sleep_hours: numberFrom(answers.sleep_hours),
    stress_level: answers.stress_level,
    motivation: answers.motivation,
    pace: answers.pace || 'balanced',
    daily_calorie_target: plan.calories,
    protein_target_g: plan.protein,
    carbs_target_g: plan.carbs,
    fat_target_g: plan.fat,
    water_goal_ml: plan.waterMl,
    preferred_rest_seconds: plan.restSeconds,
    raw_answers: answers,
  };

  nextButton.disabled = true;
  nextButton.textContent = 'Saving...';

  const { error } = await client.from('onboarding_leads').insert(payload);

  nextButton.disabled = false;
  nextButton.textContent = 'Save my plan';

  if (error) {
    message.textContent = `We could not save your plan yet: ${error.message}`;
    message.classList.add('visible');
    return;
  }

  title.textContent = 'Your BodyPilot plan is saved.';
  subtitle.textContent = 'Download BodyPilot and sign up with the same email. Your answers will be pulled into the app automatically.';
  const weeklyText = Math.abs(plan.weeklyChangeKg) < 0.05
    ? 'roughly stable weight'
    : `${Math.abs(plan.weeklyChangeKg).toFixed(2)} kg/week ${plan.weeklyChangeKg < 0 ? 'loss' : 'gain'}`;
  body.innerHTML = `
    <div class="metric">
      <strong>Starting target</strong>
      <span>${plan.calories}</span>
      <small>calories/day • ${plan.protein}g protein</small>
    </div>
    <div class="note">
      Math: your BMR is ${plan.bmr} kcal. After activity, estimated maintenance is ${plan.tdee} kcal/day.
      This plan sets calories ${Math.abs(plan.calorieDelta)} kcal/day ${plan.calorieDelta < 0 ? 'below' : plan.calorieDelta > 0 ? 'above' : 'at'} maintenance,
      which is ${Math.abs(plan.calorieDelta * 7)} kcal/week and estimates ${weeklyText}${plan.weeksToTarget ? `, about ${plan.weeksToTarget} weeks to your target weight.` : '.'}
    </div>
  `;
  document.querySelector('.quiz-actions').innerHTML = `
    <a class="button primary" href="https://apps.apple.com/app/id6770682935">Download BodyPilot</a>
    <a class="button" href="../">Back to site</a>
  `;
}

backButton.addEventListener('click', () => {
  index = Math.max(0, index - 1);
  render();
});

nextButton.addEventListener('click', () => {
  if (!isCurrentValid()) {
    message.textContent = 'Answer this one first, then we can keep moving.';
    message.classList.add('visible');
    return;
  }

  if (index < questions.length - 1) {
    index += 1;
    render();
  } else {
    submit();
  }
});

render();
