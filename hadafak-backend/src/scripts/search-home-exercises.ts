const apiKey = 'e7c4742267msh95e71b2c3d6e8d4p1a44e8jsn8be36bf2b571';

const exercisesToSearch = [
  { term: "squat", display: "Standard Bodyweight Squats" },
  { term: "push-up", display: "Standard Push-ups (or Incline)" },
  { term: "inverted row", display: "Doorframe or Sturdy Table Rows" },
  { term: "glute bridge", display: "Glute Bridges" },
  { term: "plank", display: "Forearm Plank Hold" },
  { term: "romanian deadlift", display: "Bodyweight Romanian Deadlifts (Single-Leg)" },
  { term: "pike push-up", display: "Pike Push-ups (Shoulder Focus)" },
  { term: "towel lat", display: "Towel Lat Pulldowns (Isometric Floor Pull)" },
  { term: "single leg calf raise", display: "Single-Leg Calf Raises" },
  { term: "bicycle crunch", display: "Bicycle Crunches" },
  { term: "walking lunge", display: "Walking Lunges" },
  { term: "diamond push-up", display: "Diamond Push-ups (Tricep Focus) or Bench Dips" },
  { term: "back extension", display: "Prone 'YWT' Hyper-Extensions (Posterior Chain)" },
  { term: "mountain climber", display: "Mountain Climbers" },
  { term: "side plank", display: "Side Planks" },
  { term: "dumbbell floor press", display: "Dumbbell Floor Press" },
  { term: "dumbbell overhead press", display: "Dumbbell Overhead Press" },
  { term: "dumbbell lateral raise", display: "Dumbbell Lateral Raises" },
  { term: "dumbbell overhead triceps", display: "Overhead Dumbbell Tricep Extension" },
  { term: "dumbbell fly", display: "Dumbbell Floor Flyes" },
  { term: "dumbbell row", display: "Two-Arm Dumbbell Row (Bent Over)" },
  { term: "dumbbell pullover", display: "Dumbbell Pullovers (Floor/Bench)" },
  { term: "dumbbell curl", display: "Dumbbell Bicep Curls" },
  { term: "dumbbell rear delt fly", display: "Dumbbell Rear Delt Flyes (Bent Over)" },
  { term: "dumbbell shrug", display: "Dumbbell Shrugs" },
  { term: "dumbbell goblet squat", display: "Dumbbell Goblet Squats" },
  { term: "dumbbell romanian deadlift", display: "Dumbbell Romanian Deadlifts" },
  { term: "dumbbell bulgarian split squat", display: "Dumbbell Bulgarian Split Squats" },
  { term: "dumbbell calf raise", display: "Dumbbell Standing Calf Raises" },
  { term: "deficit push-up", display: "Dumbbell Deficit Push-Ups (Hands on DB handles)" },
  { term: "arnold press", display: "Dumbbell Arnold Press" },
  { term: "dumbbell front raise", display: "Dumbbell Front Raises" },
  { term: "dumbbell kickback", display: "Dumbbell Kickbacks" },
  { term: "close grip dumbbell press", display: "Close-Grip Dumbbell Floor Press" },
  { term: "dumbbell row", display: "Single-Arm Dumbbell Rows" },
  { term: "hammer curl", display: "Dumbbell Hammer Curls" },
  { term: "face pull", display: "Dumbbell Inverted Face-Pulls (Lying on floor pull)" },
  { term: "concentration curl", display: "Concentration Curls" },
  { term: "farmer", display: "Dumbbell Farmer's Walks" },
  { term: "dumbbell lunge", display: "Dumbbell Dumbbell Lunges (Reverse)" },
  { term: "dumbbell sumo squat", display: "Dumbbell Sumo Squats" },
  { term: "dumbbell bridge", display: "Single-Leg Dumbbell Glute Bridges" },
  { term: "weighted russian twist", display: "Dumbbell Weighted Russian Twists" },
  { term: "hanging leg raise", display: "Hanging Leg Raises (If home bar available) or Reverse Crunches" },
  { term: "burpee", display: "Burpees" },
  { term: "jump squat", display: "Jump Squats" },
  { term: "high knees", display: "High Knees" },
  { term: "plank jack", display: "Plank Jacks" },
  { term: "sumo squat", display: "Bodyweight Sumo Squats" },
  { term: "flutter kicks", display: "Flutter Kicks" },
  { term: "reverse lunge", display: "Reverse Lunges" },
  { term: "russian twist", display: "Russian Twists" },
  { term: "bridge", display: "Glute Bridge Marches" },
  { term: "plyometric push-up", display: "Plyometric Push-ups (or explosive push-ups)" },
  { term: "bear crawl", display: "Bear Crawls" },
  { term: "pike push-up", display: "Pike Push-ups" },
  { term: "triceps dip", display: "Tricep Dips on Chair" },
  { term: "plank up-down", display: "Commando Planks (Plank up-downs)" },
  { term: "skater", display: "Skaters (Lateral Jumps)" },
  { term: "inchworm", display: "Inchworms with Push-up" },
  { term: "tuck jump", display: "Tuck Jumps or Power Jacks" },
  { term: "band chest press", display: "Banded Anchored Chest Press" },
  { term: "band row", display: "Banded Seated Rows (Feet braced)" },
  { term: "band standing shoulder press", display: "Banded Overhead Shoulder Press" },
  { term: "band face pull", display: "Banded Face Pulls" },
  { term: "band curl", display: "Banded Bicep Curls (Standing on band)" },
  { term: "band squat", display: "Banded Front Squats (Band looped under feet and over shoulders)" },
  { term: "band pull through", display: "Banded Pull-Throughs (Anchored low posterior pull)" },
  { term: "band walk", display: "Banded Lateral Crab Walks" },
  { term: "band calf raise", display: "Standing Banded Calf Raises" },
  { term: "band pallof", display: "Banded Pallof Press (Anti-rotation core hold)" },
  { term: "band lat pulldown", display: "Banded Lat Pulldowns (High anchor setup)" },
  { term: "band chest fly", display: "Banded Upward Chest Flyes" },
  { term: "band pull-apart", display: "Banded Pull-Aparts (Rear delt focus)" },
  { term: "band triceps extension", display: "Banded Tricep Overhead Extensions" },
  { term: "band push up", display: "Banded Push-ups (Band slung across back)" },
  { term: "band romanian deadlift", display: "Banded Romanian Deadlifts" },
  { term: "band leg curl", display: "Banded Lying Leg Curls (Anchored to heavy door/post)" },
  { term: "band donkey kick", display: "Banded Donkey Kicks" },
  { term: "band bridge", display: "Banded Glute Bridges (Band across hips)" },
  { term: "band crunch", display: "Banded Kneeling Ab Crunches" }
];

async function run() {
  console.log("Searching ExerciseDB for home exercises...");
  for (const item of exercisesToSearch) {
    const url = `https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(item.term)}?limit=5`;
    try {
      const res = await fetch(url, {
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
        },
      });
      if (res.ok) {
        const data: any = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          console.log(`"${item.display}": "${data[0].id}", // ${data[0].name} (${data[0].equipment})`);
        } else {
          // Try alternative query
          console.log(`"${item.display}": "", // NOT FOUND for query: "${item.term}"`);
        }
      } else {
        console.warn(`Query failed for "${item.term}": ${res.status}`);
      }
      await new Promise(resolve => setTimeout(resolve, 800)); // Rate limit safety
    } catch (err: any) {
      console.error(`Error for "${item.term}":`, err.message);
    }
  }
}

run();
