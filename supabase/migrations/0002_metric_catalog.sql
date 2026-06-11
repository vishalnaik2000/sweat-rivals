-- Sweat Rivals — metric catalog: extra columns on metric_defs + the seeded catalog.
-- Idempotent: re-running inserts nothing new (ON CONFLICT on the catalog slug index).
-- Run AFTER 0001_init.sql.

-- New columns (catalog UX) ---------------------------------------------------
alter table metric_defs add column if not exists category    text;
alter table metric_defs add column if not exists description  text;
alter table metric_defs add column if not exists is_default   boolean not null default false;
alter table metric_defs add column if not exists sort_order   int not null default 0;

create unique index if not exists metric_defs_catalog_slug
  on metric_defs (slug) where owner_id is null;

-- Catalog seed ---------------------------------------------------------------
-- owner_id stays NULL (global catalog). visibility = 'public'.
insert into metric_defs
  (slug, label, emoji, type, unit, direction, aggregation, category, is_default, sort_order, description, config, visibility)
values
-- A. Movement & cardio
('steps',              'Steps',              '👣', 'counter', 'steps',    'higher',  'sum',     'movement',  true,   1,  'Total steps taken today.', '{}', 'public'),
('distance',           'Distance',           '🏃', 'number',  'km',       'higher',  'sum',     'movement',  false,  2,  'Distance walked or run, in kilometres.', '{}', 'public'),
('active_calories',    'Active calories',    '🔥', 'number',  'kcal',     'higher',  'sum',     'movement',  false,  3,  'Calories burned through activity.', '{}', 'public'),
('exercise_minutes',   'Exercise',           '⏱️', 'number',  'min',      'higher',  'sum',     'movement',  true,   4,  'Minutes of intentional exercise.', '{}', 'public'),
('stand_hours',        'Stand hours',        '🧍', 'counter', 'hrs',      'higher',  'sum',     'movement',  false,  5,  'Hours in which you stood and moved.', '{}', 'public'),
('floors_climbed',     'Floors climbed',     '🪜', 'counter', 'floors',   'higher',  'sum',     'movement',  false,  6,  'Flights of stairs climbed.', '{}', 'public'),
('cycling_distance',   'Cycling',            '🚴', 'number',  'km',       'higher',  'sum',     'movement',  false,  7,  'Distance cycled, in kilometres.', '{}', 'public'),
('swimming_distance',  'Swimming',           '🏊', 'number',  'km',       'higher',  'sum',     'movement',  false,  8,  'Distance swum, in kilometres.', '{}', 'public'),
('workout_done',       'Workout done',       '🏋️', 'bool',    null,       'higher',  'count',   'movement',  true,   9,  'Did you complete a workout today?', '{}', 'public'),
('strength_sessions',  'Strength sessions',  '💪', 'counter', 'sessions', 'higher',  'sum',     'movement',  false,  10, 'Number of strength-training sessions.', '{}', 'public'),
('yoga',               'Yoga',               '🧘', 'number',  'min',      'higher',  'sum',     'movement',  false,  11, 'Minutes of yoga.', '{}', 'public'),
('stretching',         'Stretching',         '🤸', 'number',  'min',      'higher',  'sum',     'movement',  false,  12, 'Minutes of stretching or mobility work.', '{}', 'public'),
('sport_played',       'Sport',              '⚽', 'number',  'min',      'higher',  'sum',     'movement',  false,  13, 'Minutes spent playing a sport.', '{}', 'public'),

-- B. Strength / bodyweight reps
('pushups',            'Push-ups',           '💪', 'counter', 'reps',     'higher',  'sum',     'strength',  false,  20, 'Total push-up repetitions.', '{}', 'public'),
('pullups',            'Pull-ups',           '💪', 'counter', 'reps',     'higher',  'sum',     'strength',  false,  21, 'Total pull-up repetitions.', '{}', 'public'),
('squats',             'Squats',             '🦵', 'counter', 'reps',     'higher',  'sum',     'strength',  false,  22, 'Total squat repetitions.', '{}', 'public'),
('situps',             'Sit-ups',            '🧎', 'counter', 'reps',     'higher',  'sum',     'strength',  false,  23, 'Total sit-up or crunch repetitions.', '{}', 'public'),
('burpees',            'Burpees',            '🤾', 'counter', 'reps',     'higher',  'sum',     'strength',  false,  24, 'Total burpee repetitions.', '{}', 'public'),
('plank',              'Plank',              '🧘', 'number',  'sec',      'higher',  'sum',     'strength',  false,  25, 'Total plank hold time, in seconds.', '{}', 'public'),

-- C. Sleep & recovery
('sleep_duration',     'Sleep',              '😴', 'number',  'hrs',      'higher',  'average', 'sleep',     true,   30, 'Hours slept last night.', '{}', 'public'),
('sleep_quality',      'Sleep quality',      '⭐', 'scale',   '1–5',      'higher',  'average', 'sleep',     false,  31, 'How rested you feel, rated 1 to 5.', '{"max":5}', 'public'),
('naps',               'Naps',               '💤', 'number',  'min',      null,      'sum',     'sleep',     false,  32, 'Minutes napped during the day.', '{}', 'public'),
('time_in_bed',        'Time in bed',        '🛌', 'number',  'hrs',      null,      'average', 'sleep',     false,  33, 'Total hours spent in bed.', '{}', 'public'),
('in_bed_by_target',   'In bed on time',     '🌙', 'bool',    null,       'higher',  'count',   'sleep',     false,  34, 'Were you in bed by your target time?', '{}', 'public'),

-- D. Hydration & nutrition
('water',              'Water',              '💧', 'counter', 'glasses',  'higher',  'sum',     'nutrition', true,   40, 'Glasses of water drunk.', '{}', 'public'),
('calories_eaten',     'Calories eaten',     '🍽️', 'number',  'kcal',     null,      'sum',     'nutrition', false,  41, 'Total calories consumed.', '{}', 'public'),
('protein',            'Protein',            '🥩', 'number',  'g',        'higher',  'sum',     'nutrition', false,  42, 'Grams of protein eaten.', '{}', 'public'),
('carbs',              'Carbs',              '🍞', 'number',  'g',        null,      'sum',     'nutrition', false,  43, 'Grams of carbohydrates eaten.', '{}', 'public'),
('fat',                'Fat',                '🥑', 'number',  'g',        null,      'sum',     'nutrition', false,  44, 'Grams of fat eaten.', '{}', 'public'),
('fiber',              'Fiber',              '🌾', 'number',  'g',        'higher',  'sum',     'nutrition', false,  45, 'Grams of fibre eaten.', '{}', 'public'),
('sugar',              'Sugar',              '🍬', 'number',  'g',        'lower',   'sum',     'nutrition', false,  46, 'Grams of added sugar eaten.', '{}', 'public'),
('sodium',             'Sodium',             '🧂', 'number',  'mg',       'lower',   'sum',     'nutrition', false,  47, 'Milligrams of sodium eaten.', '{}', 'public'),
('fruit_servings',     'Fruit',              '🍎', 'counter', 'servings', 'higher',  'sum',     'nutrition', false,  48, 'Servings of fruit.', '{}', 'public'),
('vegetable_servings', 'Vegetables',         '🥦', 'counter', 'servings', 'higher',  'sum',     'nutrition', false,  49, 'Servings of vegetables.', '{}', 'public'),
('coffee',             'Coffee',             '☕', 'counter', 'cups',     null,      'sum',     'nutrition', false,  50, 'Cups of coffee.', '{}', 'public'),
('tea',                'Tea',                '🍵', 'counter', 'cups',     null,      'sum',     'nutrition', false,  51, 'Cups of tea.', '{}', 'public'),
('caffeine',           'Caffeine',           '⚡', 'number',  'mg',       null,      'sum',     'nutrition', false,  52, 'Milligrams of caffeine.', '{}', 'public'),
('sugary_drinks',      'Sugary drinks',      '🥤', 'counter', 'drinks',   'lower',   'sum',     'nutrition', false,  53, 'Number of sugary drinks.', '{}', 'public'),
('junk_food',          'Junk food',          '🍟', 'counter', 'meals',    'lower',   'sum',     'nutrition', false,  54, 'Junk or fast-food meals.', '{}', 'public'),
('home_cooked_meal',   'Home-cooked meal',   '🍳', 'bool',    null,       'higher',  'count',   'nutrition', false,  55, 'Did you cook a meal at home?', '{}', 'public'),
('ate_breakfast',      'Ate breakfast',      '🥗', 'bool',    null,       'higher',  'count',   'nutrition', false,  56, 'Did you eat breakfast?', '{}', 'public'),
('fasting_window',     'Fasting window',     '⏳', 'number',  'hrs',      'higher',  'average', 'nutrition', false,  57, 'Hours of intermittent fasting.', '{}', 'public'),
('supplements',        'Supplements',        '💊', 'bool',    null,       'higher',  'count',   'nutrition', false,  58, 'Did you take your supplements or vitamins?', '{}', 'public'),

-- E. Body & vitals (measurement — neutral direction)
('weight',             'Weight',             '⚖️', 'number',  'kg',       null,      'average', 'body',      true,   60, 'Body weight, in kilograms.', '{}', 'public'),
('body_fat',           'Body fat',           '📉', 'number',  '%',        null,      'average', 'body',      false,  61, 'Body-fat percentage.', '{}', 'public'),
('waist',              'Waist',              '📏', 'number',  'cm',       null,      'average', 'body',      false,  62, 'Waist circumference, in centimetres.', '{}', 'public'),
('resting_hr',         'Resting heart rate', '🫀', 'number',  'bpm',      'lower',   'average', 'body',      false,  63, 'Resting heart rate, in beats per minute.', '{}', 'public'),
('blood_glucose',      'Blood glucose',      '🩸', 'number',  'mg/dL',    null,      'average', 'body',      false,  64, 'Blood glucose, in mg/dL.', '{}', 'public'),
('bp_systolic',        'BP systolic',        '🩺', 'number',  'mmHg',     null,      'average', 'body',      false,  65, 'Systolic blood pressure, in mmHg.', '{}', 'public'),
('bp_diastolic',       'BP diastolic',       '🩺', 'number',  'mmHg',     null,      'average', 'body',      false,  66, 'Diastolic blood pressure, in mmHg.', '{}', 'public'),
('body_temperature',   'Body temperature',   '🌡️', 'number',  '°C',       null,      'average', 'body',      false,  67, 'Body temperature, in degrees Celsius.', '{}', 'public'),

-- F. Mind & mood
('mood',               'Mood',               '🙂', 'scale',   '1–5',      'higher',  'average', 'mind',      true,   70, 'Overall mood, rated 1 to 5.', '{"max":5}', 'public'),
('energy',             'Energy',             '⚡', 'scale',   '1–5',      'higher',  'average', 'mind',      false,  71, 'Energy level, rated 1 to 5.', '{"max":5}', 'public'),
('stress',             'Stress',             '😣', 'scale',   '1–5',      'lower',   'average', 'mind',      false,  72, 'Stress level, rated 1 to 5.', '{"max":5}', 'public'),
('anxiety',            'Anxiety',            '😰', 'scale',   '1–5',      'lower',   'average', 'mind',      false,  73, 'Anxiety level, rated 1 to 5.', '{"max":5}', 'public'),
('meditation',         'Meditation',         '🧘', 'number',  'min',      'higher',  'sum',     'mind',      true,   74, 'Minutes spent meditating.', '{}', 'public'),
('breathing',          'Breathing exercises','🌬️', 'number',  'min',      'higher',  'sum',     'mind',      false,  75, 'Minutes of breathing exercises.', '{}', 'public'),
('gratitude',          'Gratitude practice', '🙏', 'bool',    null,       'higher',  'count',   'mind',      false,  76, 'Did you note something you are grateful for?', '{}', 'public'),
('journaling',         'Journaling',         '📓', 'number',  'min',      'higher',  'sum',     'mind',      false,  77, 'Minutes spent journaling.', '{}', 'public'),
('time_outdoors',      'Time outdoors',      '🌳', 'number',  'min',      'higher',  'sum',     'mind',      false,  78, 'Minutes spent outdoors.', '{}', 'public'),
('sunlight',           'Sunlight',           '☀️', 'number',  'min',      'higher',  'sum',     'mind',      false,  79, 'Minutes of sunlight exposure.', '{}', 'public'),
('social_connection',  'Social connection',  '🤝', 'bool',    null,       'higher',  'count',   'mind',      false,  80, 'Did you meaningfully connect with someone?', '{}', 'public'),

-- G. Focus, learning & productivity
('reading_pages',      'Reading (pages)',    '📖', 'counter', 'pages',    'higher',  'sum',     'focus',     false,  90, 'Pages read.', '{}', 'public'),
('reading_time',       'Reading',            '📚', 'number',  'min',      'higher',  'sum',     'focus',     true,   91, 'Minutes spent reading.', '{}', 'public'),
('study',              'Study',              '🎓', 'number',  'min',      'higher',  'sum',     'focus',     false,  92, 'Minutes spent studying or learning.', '{}', 'public'),
('deep_work',          'Deep work',          '🧠', 'number',  'min',      'higher',  'sum',     'focus',     false,  93, 'Minutes of focused, distraction-free work.', '{}', 'public'),
('pomodoros',          'Pomodoros',          '🍅', 'counter', 'pomodoros','higher',  'sum',     'focus',     false,  94, 'Number of pomodoro focus blocks.', '{}', 'public'),
('tasks_completed',    'Tasks completed',    '✅', 'counter', 'tasks',    'higher',  'sum',     'focus',     false,  95, 'Number of tasks completed.', '{}', 'public'),
('writing',            'Writing',            '✍️', 'counter', 'words',    'higher',  'sum',     'focus',     false,  96, 'Words written.', '{}', 'public'),
('language_practice',  'Language practice',  '🗣️', 'number',  'min',      'higher',  'sum',     'focus',     false,  97, 'Minutes of language practice.', '{}', 'public'),
('coding',             'Coding',             '💻', 'number',  'min',      'higher',  'sum',     'focus',     false,  98, 'Minutes spent coding or on a side project.', '{}', 'public'),
('screen_time',        'Screen time',        '📱', 'number',  'hrs',      'lower',   'average', 'focus',     false,  99, 'Hours of screen time.', '{}', 'public'),
('social_media_time',  'Social media',       '📲', 'number',  'min',      'lower',   'average', 'focus',     false,  100,'Minutes spent on social media.', '{}', 'public'),
('phone_pickups',      'Phone pickups',      '🔔', 'counter', 'pickups',  'lower',   'average', 'focus',     false,  101,'Number of times you picked up your phone.', '{}', 'public'),

-- H. Daily routine & self-care
('made_bed',           'Made bed',           '🛏️', 'bool',    null,       'higher',  'count',   'routine',   false,  110,'Did you make your bed?', '{}', 'public'),
('brushed_teeth',      'Brushed teeth',      '🦷', 'bool',    null,       'higher',  'count',   'routine',   false,  111,'Did you brush your teeth?', '{}', 'public'),
('flossed',            'Flossed',            '🧵', 'bool',    null,       'higher',  'count',   'routine',   false,  112,'Did you floss?', '{}', 'public'),
('showered',           'Showered',           '🚿', 'bool',    null,       'higher',  'count',   'routine',   false,  113,'Did you shower?', '{}', 'public'),
('skincare',           'Skincare',           '🧴', 'bool',    null,       'higher',  'count',   'routine',   false,  114,'Did you do your skincare routine?', '{}', 'public'),
('cold_shower',        'Cold shower',        '🥶', 'bool',    null,       'higher',  'count',   'routine',   false,  115,'Did you take a cold shower?', '{}', 'public'),
('sauna',              'Sauna',              '🧖', 'number',  'min',      'higher',  'sum',     'routine',   false,  116,'Minutes in the sauna.', '{}', 'public'),
('woke_on_time',       'Woke up on time',    '🌅', 'bool',    null,       'higher',  'count',   'routine',   false,  117,'Did you wake up at your target time?', '{}', 'public'),
('tidied',             'Tidied up',          '🧹', 'bool',    null,       'higher',  'count',   'routine',   false,  118,'Did you tidy or clean your space?', '{}', 'public'),

-- I. Habits to quit (avoid — lower is better)
('cigarettes',         'Cigarettes',         '🚬', 'counter', 'cigarettes','lower',  'sum',     'quit',      false,  120,'Cigarettes smoked. Fewer is better.', '{}', 'public'),
('vaping',             'Vaping',             '💨', 'counter', 'hits',     'lower',   'sum',     'quit',      false,  121,'Vape hits. Fewer is better.', '{}', 'public'),
('alcohol',            'Alcohol',            '🍺', 'counter', 'drinks',   'lower',   'sum',     'quit',      false,  122,'Alcoholic drinks. Fewer is better.', '{}', 'public'),
('porn',               'Porn / masturbation','🔞', 'counter', 'times',    'lower',   'sum',     'quit',      false,  123,'Times. Fewer is better.', '{}', 'public'),
('gambling',           'Gambling',           '🎰', 'bool',    null,       'lower',   'count',   'quit',      false,  124,'Did you gamble today? A clean day is better.', '{}', 'public'),
('nail_biting',        'Nail biting',        '💅', 'bool',    null,       'lower',   'count',   'quit',      false,  125,'Did you bite your nails? A clean day is better.', '{}', 'public'),
('late_night_snacking','Late-night snacking','🌙', 'bool',    null,       'lower',   'count',   'quit',      false,  126,'Did you snack late at night? A clean day is better.', '{}', 'public'),

-- J. Social & relationships
('family_time',        'Family time',        '👨‍👩‍👧', 'number', 'min',    'higher',  'sum',     'social',    false,  130,'Minutes of quality time with family.', '{}', 'public'),
('called_loved_one',   'Called a loved one', '📞', 'bool',    null,       'higher',  'count',   'social',    false,  131,'Did you call a parent or friend?', '{}', 'public'),
('partner_time',       'Partner time',       '❤️', 'bool',    null,       'higher',  'count',   'social',    false,  132,'Did you spend quality time with your partner?', '{}', 'public'),
('act_of_kindness',    'Acts of kindness',   '🎁', 'counter', 'acts',     'higher',  'sum',     'social',    false,  133,'Number of kind things you did for others.', '{}', 'public'),

-- K. Finance
('money_spent',        'Money spent',        '💸', 'number',  '₹',        'lower',   'sum',     'finance',   false,  140,'Money spent today.', '{}', 'public'),
('money_saved',        'Money saved',        '🐖', 'number',  '₹',        'higher',  'sum',     'finance',   false,  141,'Money set aside or saved today.', '{}', 'public'),
('no_spend_day',       'No-spend day',       '🚫', 'bool',    null,       'higher',  'count',   'finance',   false,  142,'Did you get through the day without spending?', '{}', 'public')

on conflict (slug) where owner_id is null do nothing;
