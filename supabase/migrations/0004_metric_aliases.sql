-- Search aliases for the metric catalog. Lets searching a synonym ("booze",
-- "gym", "soda", "nofap"...) surface the right metric, so users find existing
-- metrics instead of creating duplicates. Run AFTER 0002.
--
-- This is curated-synonym search (free, predictable). True embedding/vector
-- semantic search is a later, heavier upgrade.

alter table metric_defs add column if not exists aliases text[] not null default '{}';

update metric_defs set aliases = v.aliases from (values
  ('steps',            array['walking','walk','pedometer']),
  ('distance',         array['run','running','jog','jogging','walk','walking','miles']),
  ('active_calories',  array['calories burned','burn','energy']),
  ('exercise_minutes', array['workout','gym','training','exercise']),
  ('workout_done',     array['gym','exercise','training','lift']),
  ('strength_sessions',array['gym','lifting','weights','resistance']),
  ('yoga',             array['stretch','flexibility']),
  ('cycling_distance', array['bike','biking','cycle','ride']),
  ('swimming_distance',array['swim','pool','laps']),
  ('sleep_duration',   array['rest','bedtime','asleep']),
  ('water',            array['hydration','hydrate','h2o']),
  ('protein',          array['macros']),
  ('sugar',            array['sweets','sweet']),
  ('sugary_drinks',    array['soda','soft drink','cola','pop']),
  ('junk_food',        array['fast food','fastfood','takeout']),
  ('coffee',           array['caffeine','espresso','latte']),
  ('weight',           array['bodyweight','scale','mass']),
  ('resting_hr',       array['heart rate','pulse','rhr','bpm']),
  ('meditation',       array['meditate','mindfulness','calm','breathe']),
  ('journaling',       array['journal','diary','write']),
  ('reading_time',     array['read','books','book','novel']),
  ('reading_pages',    array['read','books','book','pages']),
  ('screen_time',      array['phone','mobile','device']),
  ('social_media_time',array['instagram','tiktok','scrolling','doomscroll']),
  ('cigarettes',       array['smoking','smoke','nicotine','ciggy','cig']),
  ('vaping',           array['vape','e-cig','juul','nicotine']),
  ('alcohol',          array['booze','beer','wine','drinking','drinks']),
  ('porn',             array['porn','pornography','nofap','fap','pmo','masturbate']),
  ('gambling',         array['bet','betting','casino']),
  ('late_night_snacking', array['snack','snacking','midnight']),
  ('money_saved',      array['savings','save']),
  ('money_spent',      array['spending','expense','budget']),
  ('no_spend_day',     array['budget','saving'])
) as v(slug, aliases)
where metric_defs.slug = v.slug and metric_defs.owner_id is null;
